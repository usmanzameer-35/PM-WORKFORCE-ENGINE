import pytest
from pydantic import ValidationError
from app.demo import demo_state
from app.schemas import Employee, Portfolio, State, ScenarioInput
from app.engine import workload, capacity, analyze, scenario, recommendations
from app.optimizer import PulpAllocator, validate_allocation


@pytest.fixture
def state():
    return demo_state()


def test_formula_hand_calculated(state):
    s = state.settings
    s.coefficients = {k: 0 for k in s.coefficients}
    s.coefficients["doors"] = 30
    s.coefficients["maintenance"] = 60
    s.reference_hours = 0.5
    s.complexity_uplift = 0.4
    p = Portfolio(
        id="p",
        name="Test",
        region="Toronto",
        doors=100,
        assigned_to="pm-1",
        activities={"maintenance": 10},
        complexity={k: 50 for k in s.complexity_weights},
    )
    m = workload(p, s)
    assert m["base_hours"] == 60
    assert m["complexity_score"] == 50
    assert m["hours"] == 72
    assert m["equivalent_doors"] == 144
    assert sum(m["breakdown"].values()) == 72


def test_capacity_and_utilization(state):
    e = Employee(
        id="e",
        name="Test",
        regions=["Toronto"],
        skills=["Multifamily"],
        contracted=160,
        leave=16,
        meetings=10,
        admin=10,
        training=4,
        company_work=0,
    )
    assert capacity(e) == 120
    m = analyze(state)
    assert m["totals"]["hours"] == pytest.approx(sum(e["hours"] for e in m["team"]))
    assert m["totals"]["capacity"] == pytest.approx(
        sum(e["capacity"] for e in m["team"] if e["role"] == "PM")
    )
    assert m["totals"]["utilization"] == pytest.approx(
        m["totals"]["hours"] / m["totals"]["capacity"]
    )


def test_zero_capacity_no_nonfinite_json(state):
    for e in state.employees:
        e.leave = e.contracted - e.meetings - e.admin - e.training - e.company_work
    m = analyze(state)
    assert m["totals"]["utilization"] is None
    assert all(e["utilization"] is None for e in m["team"])
    assert PulpAllocator().solve(state)["status"] == "infeasible"


@pytest.mark.parametrize(
    "change",
    [
        lambda s: s.settings.coefficients.update(doors=-1),
        lambda s: s.settings.complexity_weights.update(
            {k: 0 for k in s.settings.complexity_weights}
        ),
        lambda s: setattr(s.employees[0], "leave", 1000),
        lambda s: s.portfolios[0].complexity.update(owner=101),
        lambda s: s.portfolios[0].activities.update(maintenance=float("nan")),
        lambda s: setattr(s.portfolios[0], "assigned_to", "missing"),
    ],
)
def test_reject_invalid_models(state, change):
    change(state)
    with pytest.raises(ValidationError):
        State.model_validate(state.model_dump())


def test_optimizer_covers_all_and_respects_limits(state):
    result = PulpAllocator().solve(state)
    assert result["status"] == "optimal", result
    assert set(result["assignments"]) == {p.id for p in state.portfolios}
    validate_allocation(state, result["assignments"])
    assert result["after"]["totals"]["overloaded"] == 0
    assert result["after"]["totals"]["hours"] == pytest.approx(
        result["before"]["totals"]["hours"]
    )


def test_locks_and_eligibility(state):
    state.portfolios = state.portfolios[:2]
    state.portfolios[0].locked = True
    state.employees[1].regions = ["Nowhere"]
    state.employees[2].skills = ["Other"]
    result = PulpAllocator().solve(state)
    assert result["status"] == "optimal"
    assert result["assignments"][state.portfolios[0].id] == "pm-1"
    assert "pm-2" not in result["assignments"].values()
    assert "pm-3" not in result["assignments"].values()


def test_infeasible_demand_is_not_silently_relaxed(state):
    for e in state.employees:
        e.contracted = 50
        e.leave = 10
        e.meetings = 10
        e.admin = 10
        e.training = 5
        e.company_work = 5
    result = PulpAllocator().solve(state)
    assert result["status"] == "infeasible"
    assert result["assignments"] == {}


def test_no_eligible_manager(state):
    state.portfolios[0].region = "Vancouver"
    result = PulpAllocator().solve(state)
    assert result["status"] == "infeasible"
    assert "Harbour Heights" in result["reason"]


def test_tampered_plan_rejected(state):
    with pytest.raises(ValueError):
        validate_allocation(state, {})
    with pytest.raises(ValueError):
        validate_allocation(state, {p.id: "pm-1" for p in state.portfolios})


def test_growth_math_and_ceil(state):
    r = scenario(
        state, ScenarioInput(doors=1000, hours_per_door=1, new_pm_capacity=100)
    )
    assert r["added_hours"] == 1000
    assert r["added_equivalent_doors"] == pytest.approx(
        1000 / state.settings.reference_hours
    )
    assert r["options"][1]["hires"] * 90 >= r["gap_hours"]
    assert (r["options"][1]["hires"] - 1) * 90 < r["gap_hours"]
    assert (
        r["recommended"]
        == min((o for o in r["options"] if o["feasible"]), key=lambda o: o["cost"])[
            "name"
        ]
    )


def test_zero_growth_and_delegation_limits(state):
    r = scenario(state, ScenarioInput(doors=0))
    assert r["added_hours"] == r["delegated_hours"] == 0
    assert r["options"][2]["support"] == 0
    assert r["options"][0]["feasible"]


def test_rules_are_evidence_backed(state):
    m = analyze(state)
    rs = recommendations(state, m)
    assert any(r["rule"].startswith("R01") for r in rs)
    assert (
        len([r for r in rs if r["rule"].startswith("R01")]) == m["totals"]["overloaded"]
    )


def test_optimizer_matches_exhaustive_small_problem(state):
    from itertools import product

    state.employees = state.employees[:2]
    state.portfolios = state.portfolios[:3]
    for p in state.portfolios:
        p.assigned_to = "pm-1"
    state.settings.coefficients = {
        k: v * 0.6 for k, v in state.settings.coefficients.items()
    }
    state.settings.reassignment_penalty = 2
    result = PulpAllocator().solve(state)
    assert result["status"] == "optimal"
    objectives = []
    for ids in product([e.id for e in state.employees], repeat=3):
        plan = dict(zip([p.id for p in state.portfolios], ids))
        try:
            validate_allocation(state, plan)
        except ValueError:
            continue
        m = analyze(state, plan)
        peak = max(e["utilization"] for e in m["team"])
        moves = sum(plan[p.id] != p.assigned_to for p in state.portfolios)
        cost = sum(e["hours"] * e["hourly_cost"] for e in m["team"])
        objectives.append(100 * peak + 2 * moves + state.settings.cost_weight * cost)
    assert result["objective"] == pytest.approx(min(objectives), abs=1e-5)


def test_timeout_incumbent_not_claimed_optimal(state, monkeypatch):
    import pulp

    def timed_out(model, *args, **kwargs):
        model.status = pulp.LpStatusOptimal
        model.sol_status = pulp.LpSolutionIntegerFeasible

    monkeypatch.setattr(pulp.LpProblem, "solve", timed_out)
    assert PulpAllocator().solve(state)["status"] == "not_optimal"
