from typing import Protocol
import pulp
from .schemas import State
from .engine import analyze, capacity, workload


class AllocationSolver(Protocol):
    def solve(self, state: State) -> dict: ...


class PulpAllocator:
    """Adapter boundary: OR-Tools can implement AllocationSolver without changing API."""

    def solve(self, state: State) -> dict:
        employees = [e for e in state.employees if e.role == "PM" and capacity(e) > 0]
        portfolios = state.portfolios
        s = state.settings
        hours = {p.id: workload(p, s)["hours"] for p in portfolios}
        eligible = {
            p.id: [
                e
                for e in employees
                if p.region in e.regions
                and p.property_type in e.skills
                and (not p.locked or e.id == p.assigned_to)
            ]
            for p in portfolios
        }
        missing = [p.name for p in portfolios if not eligible[p.id]]
        if missing:
            return {
                "status": "infeasible",
                "reason": "No eligible PM for: " + ", ".join(missing),
                "assignments": {},
            }
        if not portfolios:
            return {
                "status": "optimal",
                "assignments": {},
                "before": analyze(state),
                "after": analyze(state),
                "moves": [],
                "version": state.version,
            }
        model = pulp.LpProblem("portfolio_allocation", pulp.LpMinimize)
        x = {
            (p.id, e.id): pulp.LpVariable(f"x_{i}_{j}", cat="Binary")
            for i, p in enumerate(portfolios)
            for j, e in enumerate(eligible[p.id])
        }
        peak = pulp.LpVariable("peak_utilization", lowBound=0)
        for p in portfolios:
            model += pulp.lpSum(x[p.id, e.id] for e in eligible[p.id]) == 1
        for e in employees:
            load = pulp.lpSum(
                hours[p.id] * x[p.id, e.id] for p in portfolios if (p.id, e.id) in x
            )
            model += load <= capacity(e) * s.max_utilization
            model += load <= capacity(e) * peak
        model += 100 * peak + pulp.lpSum(
            (
                s.reassignment_penalty * (p.assigned_to != e.id)
                + s.cost_weight * hours[p.id] * e.hourly_cost
            )
            * x[p.id, e.id]
            for p in portfolios
            for e in eligible[p.id]
        )
        try:
            model.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=20, gapRel=0))
        except pulp.PulpSolverError:
            return {
                "status": "unavailable",
                "reason": "CBC solver is not available on this system. Install CBC or use the supported Docker image.",
                "assignments": {},
            }
        # A time-limited incumbent is not represented as a proven optimal plan.
        if (
            model.status != pulp.LpStatusOptimal
            or model.sol_status != pulp.LpSolutionOptimal
        ):
            return {
                "status": "infeasible"
                if model.status == pulp.LpStatusInfeasible
                else "not_optimal",
                "reason": "No proven optimal allocation within the hard capacity, eligibility and continuity constraints. Review locked portfolios, coverage and staffing.",
                "assignments": {},
            }
        assignments = {
            p.id: next(e.id for e in eligible[p.id] if pulp.value(x[p.id, e.id]) > 0.5)
            for p in portfolios
        }
        return {
            "status": "optimal",
            "version": state.version,
            "assignments": assignments,
            "before": analyze(state),
            "after": analyze(state, assignments),
            "moves": [
                {"portfolio": p.name, "from": p.assigned_to, "to": assignments[p.id]}
                for p in portfolios
                if assignments[p.id] != p.assigned_to
            ],
            "objective": pulp.value(model.objective),
        }


solver: AllocationSolver = PulpAllocator()


def validate_allocation(state: State, assignments: dict):
    if set(assignments) != {p.id for p in state.portfolios}:
        raise ValueError("Allocation must include every portfolio exactly once")
    employees = {e.id: e for e in state.employees if e.role == "PM"}
    for p in state.portfolios:
        e = employees.get(assignments[p.id])
        if not e or p.region not in e.regions or p.property_type not in e.skills:
            raise ValueError("Allocation violates region or skill eligibility")
        if p.locked and p.assigned_to != e.id:
            raise ValueError("Allocation violates a continuity lock")
    metrics = analyze(state, assignments)
    if any(
        e["hours"] > e["capacity"] * state.settings.max_utilization + 1e-6
        for e in metrics["team"]
        if e["role"] == "PM"
    ):
        raise ValueError("Allocation exceeds hard capacity limits")
