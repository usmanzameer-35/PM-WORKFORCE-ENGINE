# Validation record

Verified locally on 2026-10-07 using Python 3.12, PuLP 3.3.0/CBC and the committed frontend dependency lock.

## Automated

- **29 pytest tests passed**: formulas, validation, optimizer feasibility and completeness, skill/region/continuity constraints, exhaustive objective comparison on a small problem, solver timeout/incumbent handling, scenarios, rules, persistence, optimistic concurrency, allocation tampering, CSV/XLSX imports, atomicity, PostgreSQL DDL compilation.
- **Next.js production build passed**, including TypeScript checks.
- Python source formatted with Ruff; TypeScript, JSX and CSS formatted with Prettier.
- One upstream Starlette TestClient deprecation warning about httpx is emitted; it does not affect test outcomes. No tests are skipped.

## Browser walkthrough

- Rendered the live Next.js/FastAPI app at desktop width (1440px) and mobile width (390px).
- Mobile document width and scroll width both 390px: no horizontal page overflow.
- Ran optimizer, reviewed three transfers, applied them, and observed overload recommendations fall from two to zero.
- Submitted the 250-door acquisition scenario and observed 125 added hours, a 69-hour gap at target, four costed options, and a saved scenario.
- Changed the maintenance coefficient and saved; observed recalculated portfolio hours/Equivalent Doors.
- Searched for Harbour Heights, edited its door count in the dialog and saved successfully.
- Verified mobile navigation and overview rendering; no browser console errors were captured.
- Restored the original synthetic inputs and assignments after the walkthrough, leaving the demo ready to show the overloaded-to-balanced journey again. Saved walkthrough scenarios remain in this local runtime's history; a fresh repository database seeds cleanly.

## Explicitly not verified

- A live PostgreSQL connection and Docker Compose startup: no Docker/PostgreSQL runtime was available here. Portable SQLAlchemy DDL is compiled in tests; Compose configuration and Dockerfiles are supplied.
- Customer deployment, authentication, multi-tenant isolation, load testing, or empirical coefficient accuracy. These are outside this local demonstrator's implementation.
