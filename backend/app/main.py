from contextlib import asynccontextmanager
from uuid import uuid4
import json, os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from .db import Repository, Conflict
from .schemas import State, ScenarioInput, ApplyAllocation, Portfolio, Strict
from .engine import analyze, recommendations, scenario
from .optimizer import solver, validate_allocation
from .imports import preview, TEMPLATE

repo = Repository()


@asynccontextmanager
async def lifespan(app):
    repo.initialize()
    yield


app = FastAPI(
    title="Northline · PM Workforce Intelligence", version="1.0.0", lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(","),
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(Conflict)
async def conflict_handler(request, error):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=409, content={"detail": str(error)})


@app.exception_handler(ValueError)
async def value_handler(request, error):
    from fastapi.responses import JSONResponse

    return JSONResponse(status_code=422, content={"detail": str(error)})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/state")
def get_state():
    state = repo.load()
    m = analyze(state)
    return {"state": state, "metrics": m, "recommendations": recommendations(state, m)}


@app.put("/api/state")
def update_state(state: State):
    saved = repo.save(state)
    m = analyze(saved)
    return {"state": saved, "metrics": m, "recommendations": recommendations(saved, m)}


@app.post("/api/optimize")
def optimize():
    return solver.solve(repo.load())


@app.post("/api/allocation/apply")
def apply_allocation(request: ApplyAllocation):
    s = repo.load()
    if s.version != request.version:
        raise Conflict("This allocation is stale. Run the optimizer again.")
    validate_allocation(s, request.assignments)
    for p in s.portfolios:
        p.assigned_to = request.assignments[p.id]
    return repo.save(s)


@app.post("/api/scenarios")
def create_scenario(request: ScenarioInput):
    state = repo.load()
    result = scenario(state, request)
    result["version"] = state.version
    repo.record(str(uuid4()), "scenario", result)
    return result


@app.get("/api/runs")
def runs():
    return repo.runs()


@app.get("/api/imports/template", response_class=PlainTextResponse)
def template():
    return PlainTextResponse(
        TEMPLATE,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=portfolios.csv"},
    )


@app.post("/api/imports/preview")
async def import_preview(file: UploadFile = File(...), mapping: str = Form("{}")):
    try:
        mapping_dict = json.loads(mapping)
        if not isinstance(mapping_dict, dict):
            raise ValueError("Mapping must be a JSON object")
        return preview(
            await file.read(2_000_001), file.filename or "", repo.load(), mapping_dict
        )
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(
            422, "Unreadable workbook or CSV. Check file format and encoding."
        ) from e


class ImportCommit(Strict):
    version: int
    rows: list[Portfolio]


@app.post("/api/imports/commit")
def import_commit(request: ImportCommit):
    state = repo.load()
    if state.version != request.version:
        raise Conflict("Data changed. Preview the import again.")
    if not request.rows or len(request.rows) > 1000:
        raise ValueError("Import requires 1–1,000 rows")
    merged = State(
        **{**state.model_dump(), "portfolios": state.portfolios + request.rows}
    )
    saved = repo.save(merged)
    repo.record(
        str(uuid4()),
        "import",
        {
            "count": len(request.rows),
            "ids": [p.id for p in request.rows],
            "version": saved.version,
        },
    )
    return {"imported": len(request.rows), "version": saved.version}
