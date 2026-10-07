import io
import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from app import main
from app.db import Repository


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "repo", Repository(f"sqlite:///{tmp_path}/test.db"))
    with TestClient(main.app) as c:
        yield c


def test_read_save_and_stale_write(client):
    original = client.get("/api/state").json()
    s = original["state"]
    s["settings"]["coefficients"]["maintenance"] *= 2
    updated = client.put("/api/state", json=s)
    assert updated.status_code == 200
    assert (
        updated.json()["metrics"]["totals"]["hours"]
        > original["metrics"]["totals"]["hours"]
    )
    assert client.put("/api/state", json=s).status_code == 409
    assert client.get("/api/state").json()["state"]["version"] == 2


def test_optimizer_apply_and_stale(client):
    result = client.post("/api/optimize").json()
    assert result["status"] == "optimal"
    request = {"version": result["version"], "assignments": result["assignments"]}
    assert client.post("/api/allocation/apply", json=request).status_code == 200
    assert client.post("/api/allocation/apply", json=request).status_code == 409
    assert client.get("/api/state").json()["metrics"]["totals"]["overloaded"] == 0


def test_atomic_import_duplicate_and_bad_rows(client):
    csv = "id,name,doors,region,assigned_to\nnew,New,100,Toronto,pm-1\nbad,Invalid,-1,Toronto,pm-1\n"
    result = client.post("/api/imports/preview", files={"file": ("a.csv", csv)}).json()
    assert not result["can_commit"] and len(result["errors"]) == 1
    assert len(client.get("/api/state").json()["state"]["portfolios"]) == 12
    result = client.post(
        "/api/imports/preview", files={"file": ("a.csv", csv.split("bad,")[0])}
    ).json()
    assert result["can_commit"]
    request = {"version": result["version"], "rows": result["rows"]}
    assert client.post("/api/imports/commit", json=request).status_code == 200
    assert client.post("/api/imports/commit", json=request).status_code == 409
    result = client.post(
        "/api/imports/preview", files={"file": ("a.csv", csv.split("bad,")[0])}
    ).json()
    assert not result["can_commit"]


def test_xlsx_mapping(client):
    wb = Workbook()
    ws = wb.active
    ws.append(["Code", "Building", "Units", "City", "Manager"])
    ws.append(["new-x", "Excel example", 80, "Toronto", "pm-1"])
    f = io.BytesIO()
    wb.save(f)
    r = client.post(
        "/api/imports/preview",
        files={"file": ("a.xlsx", f.getvalue())},
        data={
            "mapping": '{"Code":"id","Building":"name","Units":"doors","City":"region","Manager":"assigned_to"}'
        },
    )
    assert r.status_code == 200
    assert r.json()["can_commit"] and r.json()["rows"][0]["doors"] == 80


def test_invalid_commit_is_atomic(client):
    s = client.get("/api/state").json()["state"]
    row = s["portfolios"][0]
    r = client.post(
        "/api/imports/commit", json={"version": s["version"], "rows": [row]}
    )
    assert r.status_code == 422
    assert client.get("/api/state").json()["state"]["version"] == s["version"]


def test_scenario_persistence(client):
    r = client.post("/api/scenarios", json={"name": "Test growth", "doors": 250})
    assert r.status_code == 200
    assert client.get("/api/runs").json()[0]["data"]["input"]["name"] == "Test growth"


def test_state_persists_across_repository_instances(client):
    s = client.get("/api/state").json()["state"]
    s["settings"]["company"] = "Changed"
    assert client.put("/api/state", json=s).status_code == 200
    another = Repository(str(main.repo.engine.url))
    assert another.load().settings.company == "Changed"


def test_malformed_mapping_and_extension(client):
    assert (
        client.post(
            "/api/imports/preview",
            files={"file": ("a.csv", "a,b")},
            data={"mapping": "[]"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/imports/preview", files={"file": ("a.exe", b"abc")}
        ).status_code
        == 422
    )


def test_postgresql_schema_compiles():
    from sqlalchemy.schema import CreateTable
    from sqlalchemy.dialects import postgresql
    from app.db import Base

    for table in Base.metadata.sorted_tables:
        sql = str(CreateTable(table).compile(dialect=postgresql.dialect()))
        assert "CREATE TABLE" in sql


def test_forged_allocation_rejected(client):
    s = client.get("/api/state").json()["state"]
    r = client.post(
        "/api/allocation/apply",
        json={
            "version": s["version"],
            "assignments": {p["id"]: "pm-1" for p in s["portfolios"]},
        },
    )
    assert r.status_code == 422
    assert client.get("/api/state").json()["state"]["version"] == s["version"]
