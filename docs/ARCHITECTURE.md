# Architecture

```text
Next.js / React / TypeScript / Tailwind / Recharts
                      │ same-origin /api proxy
                      ▼
FastAPI + Pydantic request validation
     │               │                    │
 deterministic    AllocationSolver     CSV/XLSX
 analytics        protocol             preview
     │               │                    │
     │            PuLP / CBC             │
     └───────────────┬────────────────────┘
                     ▼
SQLAlchemy repository + optimistic version check
             SQLite / PostgreSQL
```

## Separation

- `schemas.py`: typed domain state, finite/nonnegative validation, referential integrity.
- `engine.py`: pure workload, capacity, scenario and recommendation functions.
- `optimizer.py`: solver protocol, CBC implementation, independent apply validation.
- `db.py`: persistent company settings/version, employee records, portfolio assignments and saved runs.
- `imports.py`: capped UTF-8 CSV / first-sheet XLSX parsing and explicit field mapping.
- `main.py`: HTTP boundary, lifecycle, conflict/error handling.
- Frontend: typed contracts; the backend is the source of all analytical values. No duplicate JavaScript workload formula.

The storage layer uses portable SQLAlchemy JSON payload columns for validated employee and portfolio attributes, with relational company and employee assignment keys. It does not pretend to implement unit-level leases or PMS transactions. Company settings contain coefficients and weights; scenario/import histories live in `analysis_runs`. `schema.sql` contains the compiled initial PostgreSQL schema. Production evolution should normalize high-query attributes and add Alembic migrations as query requirements emerge.

## API

| Method / path | Purpose |
|---|---|
| GET `/health` | Liveness |
| GET `/api/state` | Current state, metrics, recommendations |
| PUT `/api/state` | Validated state update with expected version |
| POST `/api/optimize` | Solve current state without mutation |
| POST `/api/allocation/apply` | Revalidate and commit proposed assignments |
| POST `/api/scenarios` | Calculate and persist scenario |
| GET `/api/runs` | Most recent 30 scenario/import runs |
| GET `/api/imports/template` | Download portfolio CSV template |
| POST `/api/imports/preview` | Parse/validate multipart file and mapping JSON |
| POST `/api/imports/commit` | Add reviewed portfolio rows atomically |

The OpenAPI page at `/docs` exposes routes and typed request schemas; response contracts are also represented in `frontend/components/types.ts`. State writes atomically compare-and-increment `companies.version`; stale writes receive HTTP 409. Optimizer apply cannot bypass the capacity or eligibility checks. Portfolio/employee deletion is intentionally not exposed.

## Imports

Required columns: `id`, `name`, `region`, `doors`, `assigned_to`. Defaults: Multifamily type, one property/client, zero revenue, unlocked. Optional columns: `property_type`, `properties`, `clients`, `monthly_revenue`, `locked`, and any activity key except `doors` (which is already the base driver). `activities` and `complexity` can be JSON object strings. Missing activity/complexity values are zero and disclosed in preview.

Imports add records; duplicate IDs never overwrite data. Employee IDs must refer to PMs. A custom mapping is `{source_header: canonical_field}`; without a mapping, headers must be canonical. With a mapping, unmapped columns are ignored. CSV uses UTF-8/BOM support. XLSX uses the first sheet and cached formula values; it does not execute spreadsheet formulas. Limits: 2 MB compressed input, 20 MB expanded workbook, 1,000 rows/import and 1,000 portfolios/workspace. Numerical/state validation runs again at commit.

## Extension seams

- OR-Tools: implement `AllocationSolver.solve` and retain the independent assignment validator.
- PMS adapters: convert exports to validated portfolio activity aggregates.
- Historical analytics: add dated snapshots; do not derive trends from the single current snapshot.
- Production: OIDC/session authentication, request authorization, enforced company scoping, tenant-keyed identifiers, audit/outbox, rate limits, migrations, monitoring, backups and recovery tests.

This release is deliberately single-company. The company foreign keys are a schema starting point, not tenant isolation or an access-control promise.
