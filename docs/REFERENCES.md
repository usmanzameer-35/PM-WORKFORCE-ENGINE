# Reference provenance and reuse policy

The prior Product Factory Strategy provided the conceptual map below. The delivered source, demo data, formulas and interface were written originally for this product. **No code, assets, data, notebooks or templates were copied from these repositories.** Their current licenses are not relied upon and have not been certified in this build. Any future copying must first inspect the exact revision's license and retain the required notices; an absent or unclear license is not permission.

| Reference | Concept carried into the original design | Reuse decision |
|---|---|---|
| [OpenProperty](https://github.com/clawnify/OpenProperty) | Property/portfolio/PM relationships and operational navigation | Concept reference only; no PMS code imported |
| [Samir Saci workforce-planning](https://github.com/samirsaci/workforce-planning) | Demand, capacity, decision variables, constraints and objective | Original PM-specific mathematical formulation |
| [Work scheduling and optimization](https://github.com/phillotunru/work-scheduling-and-optimization) | Resource allocation with constraints | Original solver adapter and implementation |
| [StaffScheduler](https://github.com/lucaosti/StaffScheduler) | Eligibility, availability and balanced allocation | Original region/type/capacity constraints |
| [wfmPlan](https://github.com/LaddhaRishi/wfmPlan) | Demand-to-required-staff reasoning | Original monthly growth scenarios |
| [Property Management Analytics](https://github.com/amjadpbi/Property-Management-Analytics) | Executive KPIs, filters and drill-downs | Original interface, no dashboard assets copied |

Implementation API references consulted: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), bundled Next.js client-component/rewrites documentation, [FastAPI](https://fastapi.tiangolo.com/) and [PuLP](https://coin-or.github.io/pulp/). The runtime uses pinned PuLP 3.3.0 with its packaged CBC solver rather than relying on unverified claims in the prior conversation about PuLP 4.0 integrations.

Direct dependencies are listed in `frontend/package.json` and `backend/requirements.txt`; exact installed versions are in `frontend/pnpm-lock.yaml` and `backend/requirements-lock.txt`. Their own licenses and packaged notices continue to apply, including CBC's solver license. Dependency package installation is distinct from copying reference-repository source. Review the complete transitive dependency license inventory before commercial distribution.
