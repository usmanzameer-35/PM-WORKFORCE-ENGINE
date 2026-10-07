# Northline — PM Workforce Intelligence Engine

A runnable, original implementation of Product 1: a property-management workforce planning application with a Next.js dashboard, FastAPI calculation engine, PuLP allocation solver, and persistent data. All ten modules are functional. No PMS transactional workflows are included.

## Run with Docker

Requires Docker Engine / Desktop with Compose. From this repository:

```bash
docker compose up --build
```

Open **http://localhost:3000**. API documentation: **http://localhost:8000/docs**.

Compose runs PostgreSQL, the API and frontend, binds exposed ports to localhost, and persists data in the `pgdata` volume. The embedded database password is only a local demo credential. First startup seeds the synthetic company automatically; later starts retain edits.

## Run locally without Docker

Requires Python **3.12**, Node.js **22+** (24 recommended), and pnpm **11.19.0**. The frontend has a committed pnpm lockfile; the backend has a tested full dependency lock.

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-lock.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
# Install pnpm if not already available: npm install -g pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. SQLite creates `backend/workforce.db` when the backend is launched from that directory. To use a production frontend build:

```bash
cd frontend
pnpm build
pnpm start
```

After dependency setup, `./scripts/run.sh` starts both services and builds the frontend; Ctrl+C stops both. If a local development server hits OS watcher limits, use the production build instead.

### PostgreSQL

Set the backend environment before startup:

```bash
export DATABASE_URL='postgresql+psycopg://USER:PASSWORD@localhost:5432/workforce'
```

`API_URL` is a frontend **build-time** rewrite target and defaults to `http://127.0.0.1:8000`. Rebuild if it changes. The browser makes same-origin `/api` requests; the Next server proxies them to FastAPI. Do not put database credentials in frontend variables.

SQLAlchemy creates the initial schema on first startup. `docs/schema.sql` is the PostgreSQL DDL for inspection. Future schema upgrades need versioned migrations; `create_all` is not a migration system.

## Five-minute demo

1. **Overview:** inspect 1,850 doors across 12 portfolios, 54 properties and six PMs. The two assistants and coordinator are visible in Team, with capacity kept separate from accountable PM capacity.
2. **Portfolio:** inspect Harbour Heights. Change activity counts, complexity inputs, its PM assignment or continuity lock. Saving recalculates the complete model.
3. **Workload:** inspect the effort breakdown and edit minutes per event. Defaults are synthetic assumptions, not Canadian benchmarks.
4. **Capacity / Team:** inspect contracted hours minus leave, meetings, admin, training and company work. Edit allowances, coverage and skills; add a new team member if needed.
5. **Allocation Optimizer:** run PuLP, compare current and proposed utilization, review transfers and apply the plan. Default data supports a feasible rebalance that removes both overloads. Current solver/tie-breaking can choose among equivalent plans.
6. **Growth / Scenario Lab:** model 250 new doors. Compare reallocation, PM hiring, assistant support and outsourcing; save scenarios and reload prior runs.
7. **Imports:** download the template, choose CSV/XLSX, optionally map headers, review validation, then commit. Unique portfolio IDs are required. Invalid rows block the UI commit; changes are atomic.
8. **Settings:** edit the reference hours per door, complexity weights/uplift, target/maximum utilization, stress multiplier and optimization weights.

## What is implemented

| Module | Working behavior |
|---|---|
| Overview | Live metrics, PM utilization chart, activity mix, rule-driven actions, CSV export |
| Portfolio | Search/filter, manual creation, activity and complexity editing, continuity locks |
| Team | PM/support cards, employee creation, role, eligibility and cost editing |
| Workload | Activity breakdown, formula explanation, editable coefficient library |
| Capacity | Capacity deductions, spare capacity, expected and stress utilization |
| Allocation Optimizer | Whole-portfolio MILP, eligibility/continuity/capacity constraints, review/apply |
| Growth / Scenario Lab | Four costed alternatives, hire rounding, explicit delegation limits, saved runs |
| Recommendations | Deterministic rules with triggers and numerical evidence |
| Imports | CSV/XLSX, column mapping, row errors, duplicate/foreign-key validation, atomic commit |
| Settings | Company/period label, model calibration and solver objective weights |

See [the methodology](docs/METHODOLOGY.md) for equations, units, objective and limitations, and [architecture](docs/ARCHITECTURE.md) for boundaries and API design.

## Verify

```bash
cd backend
source .venv/bin/activate
pytest -q

cd ../frontend
pnpm build
pnpm typecheck
```

Tests cover hand-calculated workload, normalized complexity, Equivalent Doors, utilization, zero capacity, invalid/non-finite inputs, infeasibility, skill/region/continuity constraints, allocation completeness, exhaustive small-problem objective comparison, time-limited solver behavior, hiring math, support limits, persisted edits, stale writes, forged allocations, CSV/XLSX parsing, invalid import atomicity and PostgreSQL DDL compilation. CI runs backend tests and the frontend production build.

Local verification: **29 tests passed**, Next.js production build and TypeScript passed. Browser verification includes desktop rendering, optimizer run/apply, and scenario submission; see `docs/VALIDATION.md` for the final checklist. PostgreSQL DDL is compiled in tests; a live PostgreSQL/Compose runtime was not available in the build environment.

## Boundaries of this release

- This is a local, single-company demonstrator with commercial-style UX. It has **no authentication, role permissions or enforced tenant isolation**. Add access control, TLS, audit policy, backups and operational monitoring before customer deployment.
- Activity counts and scores are monthly portfolio aggregates. Imports currently accept portfolio demand only; raw PMS leases, work orders, employee exports, time logs and vendor-specific mapping libraries are future adapters. Employee entry is available in the UI and state API.
- Capacity scenarios are **aggregate estimates**, not geographically constrained acquisition allocations. They model incremental delegable work, new assistants/PMs, and outsourced hours. Existing assistant capacity is deliberately not credited to PM assignments.
- Scenario history stores inputs/results and a model version. The workspace itself is a single current snapshot, not a historical monthly warehouse. Changing the period only relabels that snapshot.
- Complexity dimensions are editable scores, not empirically estimated rates. Stress is a multiplier, **not P90**. Fee reviews use direct PM cost, not full profitability.
- The solver has a 20-second limit. It returns a plan only for a proven optimum; it does not quietly relax hard constraints. OR-Tools is an adapter extension point, not an installed or implemented solver.
- No upstream reference repository code, UI assets or data were copied. See [reference provenance](docs/REFERENCES.md). No original-code license is granted by this repository; choose your commercial licensing policy before distribution.

## Repository layout

```text
backend/app/       Pydantic models, deterministic engine, solver, imports, persistence, API
backend/tests/     Formula, solver and API integration tests
frontend/app/      Next.js entry points and responsive design system
frontend/components/  Dashboard and typed API contracts
docs/              Methodology, architecture, PostgreSQL schema, provenance, validation
scripts/run.sh     Local launcher
compose.yaml       Local PostgreSQL + API + web stack
```
