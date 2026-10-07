from math import ceil
from .schemas import State, Employee, Portfolio, Settings, ScenarioInput


def capacity(e: Employee) -> float:
    return max(
        0, e.contracted - e.leave - e.meetings - e.admin - e.training - e.company_work
    )


def workload(p: Portfolio, s: Settings) -> dict:
    score = sum(
        p.complexity.get(k, 0) * w for k, w in s.complexity_weights.items()
    ) / sum(s.complexity_weights.values())
    multiplier = 1 + s.complexity_uplift * score / 100
    raw = {
        k: (p.doors if k == "doors" else p.activities.get(k, 0)) * v / 60
        for k, v in s.coefficients.items()
    }
    hours = sum(raw.values()) * multiplier
    return {
        **p.model_dump(),
        "complexity_score": score,
        "multiplier": multiplier,
        "base_hours": sum(raw.values()),
        "hours": hours,
        "equivalent_doors": hours / s.reference_hours,
        "breakdown": {k: v * multiplier for k, v in raw.items()},
    }


def analyze(state: State, assignments: dict | None = None) -> dict:
    portfolios = [workload(p, state.settings) for p in state.portfolios]
    for p in portfolios:
        p["assigned_to"] = (assignments or {}).get(p["id"], p["assigned_to"])
    team = []
    for e in state.employees:
        ps = [p for p in portfolios if p["assigned_to"] == e.id]
        hours = sum(p["hours"] for p in ps)
        available = capacity(e)
        team.append(
            {
                **e.model_dump(),
                "capacity": available,
                "hours": hours,
                "doors": sum(p["doors"] for p in ps),
                "equivalent_doors": sum(p["equivalent_doors"] for p in ps),
                "utilization": hours / available if available else None,
                "overloaded": hours > available,
                "stress_utilization": hours
                * state.settings.stress_multiplier
                / available
                if available
                else None,
                "portfolio_count": len(ps),
            }
        )
    pms = [e for e in team if e["role"] == "PM"]
    total = sum(p["hours"] for p in portfolios)
    available = sum(e["capacity"] for e in pms)
    return {
        "portfolios": portfolios,
        "team": team,
        "totals": {
            "doors": sum(p["doors"] for p in portfolios),
            "properties": sum(p["properties"] for p in portfolios),
            "clients": sum(p["clients"] for p in portfolios),
            "hours": total,
            "capacity": available,
            "equivalent_doors": total / state.settings.reference_hours,
            "utilization": total / available if available else None,
            "overloaded": sum(e["overloaded"] for e in pms),
            "spare_hours": available * state.settings.target_utilization - total,
            "spare_equivalent_doors": (
                available * state.settings.target_utilization - total
            )
            / state.settings.reference_hours,
        },
        "breakdown": [
            {"key": k, "hours": sum(p["breakdown"][k] for p in portfolios)}
            for k in state.settings.coefficients
        ],
    }


def recommendations(state: State, metrics: dict) -> list[dict]:
    result = []
    s = state.settings
    for e in metrics["team"]:
        if e["role"] != "PM":
            continue
        if e["overloaded"]:
            result.append(
                {
                    "id": f"load-{e['id']}",
                    "severity": "high",
                    "title": f"Rebalance {e['name'].split()[0]}’s portfolio",
                    "body": f"{e['hours']:.1f} workload hours exceed {e['capacity']:.1f} productive hours. Run the optimizer to test eligible transfers.",
                    "rule": "R01 · assigned hours > productive capacity",
                    "action": "Allocation Optimizer",
                }
            )
    if metrics["totals"]["spare_hours"] < 0:
        result.append(
            {
                "id": "hire",
                "severity": "high",
                "title": "Review the hiring threshold",
                "body": f"The team is {-metrics['totals']['spare_hours']:.1f} hours above the {s.target_utilization:.0%} target. Reallocation cannot remove aggregate demand.",
                "rule": "R02 · workload > PM capacity × target",
                "action": "Growth / Scenario Lab",
            }
        )
    for p in metrics["portfolios"]:
        employee = next(e for e in state.employees if e.id == p["assigned_to"])
        cost = p["hours"] * employee.hourly_cost
        if p["monthly_revenue"] and cost / p["monthly_revenue"] > 0.4:
            result.append(
                {
                    "id": f"price-{p['id']}",
                    "severity": "medium",
                    "title": f"Review {p['name']} servicing economics",
                    "body": f"Direct modeled PM labor is {cost / p['monthly_revenue']:.0%} of revenue. Excludes overhead and support; this is a review signal, not a profit estimate.",
                    "rule": "R03 · modeled PM cost / revenue > 40%",
                    "action": "Portfolio",
                }
            )
        if (
            p["region"] not in employee.regions
            or p["property_type"] not in employee.skills
        ):
            result.append(
                {
                    "id": f"match-{p['id']}",
                    "severity": "high",
                    "title": f"Eligibility mismatch: {p['name']}",
                    "body": "Current PM does not cover this region or property type. Review eligibility or reallocate.",
                    "rule": "R04 · region or skill not covered",
                    "action": "Allocation Optimizer",
                }
            )
    if not result:
        result.append(
            {
                "id": "steady",
                "severity": "low",
                "title": "Capacity is within the current guardrails",
                "body": "Keep assumptions calibrated against observed activity and time data.",
                "rule": "R00 · no active threshold breaches",
                "action": "Workload",
            }
        )
    return result


def scenario(state: State, request: ScenarioInput) -> dict:
    m = analyze(state)
    target = state.settings.target_utilization
    added = request.doors * request.hours_per_door
    demand = m["totals"]["hours"] + added
    base = m["totals"]["capacity"] * target
    deficit = max(0, demand - base)
    pm_effective = request.new_pm_capacity * target
    hires = ceil(max(0, deficit - 1e-9) / pm_effective)
    # Only incremental, delegable demand can move to support. Existing support is not double-counted.
    delegated = min(added * request.support_share, deficit)
    assistants = ceil(max(0, delegated - 1e-9) / (request.support_capacity * target))
    residual = max(0, deficit - delegated)
    remaining_hires = ceil(max(0, residual - 1e-9) / pm_effective)
    options = [
        {
            "name": "Reallocate existing team",
            "cost": 0,
            "hires": 0,
            "support": 0,
            "feasible": deficit <= 1e-9,
            "remaining_gap": deficit,
        },
        {
            "name": "Hire property managers",
            "cost": hires * request.monthly_pm_cost,
            "hires": hires,
            "support": 0,
            "feasible": True,
            "remaining_gap": 0,
        },
        {
            "name": "Assistant + PM capacity",
            "cost": assistants * request.assistant_cost
            + remaining_hires * request.monthly_pm_cost,
            "hires": remaining_hires,
            "support": assistants,
            "feasible": True,
            "remaining_gap": 0,
        },
        {
            "name": "Outsource support + PM",
            "cost": delegated * request.outsourcing_rate
            + remaining_hires * request.monthly_pm_cost,
            "hires": remaining_hires,
            "support": 0,
            "feasible": True,
            "remaining_gap": 0,
        },
    ]
    best = min((o for o in options if o["feasible"]), key=lambda o: o["cost"])["name"]
    return {
        "input": request.model_dump(),
        "added_hours": added,
        "added_equivalent_doors": added / state.settings.reference_hours,
        "projected_utilization": demand / m["totals"]["capacity"]
        if m["totals"]["capacity"]
        else None,
        "gap_hours": deficit,
        "pm_fte": deficit / pm_effective,
        "delegated_hours": delegated,
        "options": options,
        "recommended": best,
        "caveat": "Aggregate monthly capacity estimate. New hire eligibility, portfolio indivisibility, and support task suitability must be validated before implementation.",
    }
