# Calculation methodology — v1

All quantities refer to one planning month. Values are calculated without intermediate rounding; UI rounding is presentation only. Synthetic defaults are demonstrable assumptions, not researched industry benchmarks.

## Workload and complexity

For portfolio p and activity a:

- `raw_hours[a] = monthly_count[a] × coefficient_minutes[a] / 60`.
- Base management uses active doors as its monthly count.
- `complexity_score = Σ(score[d] × weight[d]) / Σ(weight[d])`.
- Inputs are 0–100; missing dimensions are explicitly treated as zero; all weights must be present, nonnegative and have a positive sum.
- `multiplier = 1 + complexity_uplift × complexity_score / 100`.
- `weighted_hours = Σ(raw_hours) × multiplier`.
- Each activity's displayed hours includes the same multiplier, so the breakdown reconciles to total workload.
- `equivalent_doors = weighted_hours / reference_hours_per_door`.

Example: 100 doors × 30 minutes plus 10 maintenance events × 60 minutes = 60 raw hours. A score of 50 and uplift of 0.4 produces 72 weighted hours. At 0.5 reference hours per door, that is 144 Equivalent Doors. This is tested independently of the demo constants.

Complexity is a residual coordination/friction allowance. Activity-driven maintenance and turnover already appear in raw hours. Calibrate the uplift carefully to avoid counting the same friction twice. Ten scores cover maintenance, turnover, vacancy, arrears, owner communication, reporting, geography, property type, escalation and vendor coordination.

## Capacity

`productive_hours = contracted − leave − meetings − internal_admin − training − company_work`.

Negative productive hours are rejected. Zero productive hours is allowed, but utilization is JSON null (rendered as “No capacity”); a zero-capacity manager cannot receive a portfolio from the solver.

`PM utilization = assigned weighted hours / productive PM hours`.

`team utilization = sum(PM workload) / sum(PM productive capacity)`; it is not an unweighted average of percentages. Support staff hours are separate and not added to this denominator.

`spare_hours_at_target = total PM capacity × target_utilization − workload`.

`spare_ED = spare_hours_at_target / reference_hours_per_door`.

Spare capacity can be negative. Aggregate spare hours do not establish feasibility for indivisible portfolios or restricted eligibility.

`stress_utilization = expected hours × stress_multiplier / productive capacity` is a sensitivity case, not a statistical percentile or calibrated forecast.

## Allocation optimization

Binary `x[p,e]` assigns an entire portfolio to a PM. Only eligible PMs get variables:

- role is PM with positive productive capacity;
- region is in their declared region coverage;
- property type is in their skills;
- a locked portfolio remains with its existing PM.

Every portfolio has exactly one assignment. Each PM's load must be at or below `productive_capacity × max_utilization`. A peak variable bounds all PM utilization ratios.

Minimize:

`100 × peak_utilization + reassignment_penalty × transfer_count + cost_weight × total_direct_PM_cost`.

`direct_PM_cost = assigned workload hours × hourly_cost`.

Defaults prefer balance while discouraging unnecessary moves. The 90% target is a planning threshold, not the hard maximum. Adjust objective weights and the maximum in Settings.

CBC runs through PuLP with zero requested relative gap and a 20-second time limit. A plan is exposed only if both solver status and solution status report a proven optimum. Infeasible, unavailable and unproven results provide a reason, not fabricated assignments. Apply validates all constraints again and requires the same data version. The interface `AllocationSolver` is the OR-Tools migration boundary.

## Growth / hiring scenarios

Additional weighted demand = new doors × assumed weighted hours per new door. These hours already incorporate the expected property mix and complexity; no second complexity uplift is applied.

`gap = max(0, existing_demand + added_demand − existing_PM_capacity × target)`.

`PM_FTE = gap / (new_PM_productive_hours × target)`.

Hires are rounded up to whole people. Four options compare:

1. Reallocation alone: aggregate capacity is sufficient only when gap is zero.
2. PM hiring: `ceil(gap / effective_PM_capacity)`.
3. Assistant + PM: delegate at most `min(new_demand × support_share, gap)`; round assistants up based on effective support capacity and hire PMs for the remaining gap.
4. Outsourced support + PM: the same bounded delegated hours at the hourly outsourcing rate, plus PMs for the remaining gap.

All costs are incremental per month, CAD. The lowest-cost option among aggregate-capacity-sufficient plans is identified. No claim is made about task suitability, hiring lead time, ramp-up, skill availability or feasible whole-portfolio placement. Support share is capped at 60%. Existing support is not double-counted.

## Recommendation rules

- R01: assigned hours > productive capacity → review reallocation; the solver decides whether a legal transfer exists.
- R02: team demand > capacity × target → review hiring, since reallocation cannot change aggregate demand.
- R03: direct modeled PM cost / monthly revenue > 40% → review servicing economics. This is not full profitability.
- R04: assigned PM lacks region or type eligibility → review assignment/coverage.
- R00: no active rule → calibration reminder.

No language model determines the mathematics. Recommendations are reproducible from state.
