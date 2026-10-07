from .schemas import State, Settings, Employee, Portfolio, DIMENSIONS


def demo_state():
    settings = Settings(
        coefficients=dict(
            zip(
                [
                    "doors",
                    "maintenance",
                    "emergencies",
                    "new_leases",
                    "renewals",
                    "turnovers",
                    "inspections",
                    "arrears",
                    "owner_contacts",
                    "escalations",
                    "reports",
                    "travel",
                    "vendor_contacts",
                ],
                [7, 35, 90, 150, 40, 120, 45, 35, 12, 50, 45, 35, 15],
            )
        ),
        complexity_weights={k: 1 for k in DIMENSIONS},
    )
    settings.coefficients = {
        k: round(v * 0.6, 2) for k, v in settings.coefficients.items()
    }
    settings.reference_hours = 0.3
    names = [
        "Sarah Chen",
        "Marcus Reid",
        "Amara Okafor",
        "James Wilson",
        "Priya Shah",
        "Daniel Park",
    ]
    employees = [
        Employee(
            id=f"pm-{i + 1}",
            name=n,
            regions=["Toronto", "Mississauga", "Hamilton"],
            skills=["Multifamily", "Condo", "Single family"],
            hourly_cost=42 + i * 2,
        )
        for i, n in enumerate(names)
    ]
    employees += [
        Employee(
            id="as-1",
            name="Olivia Martin",
            role="Assistant",
            regions=["Toronto"],
            skills=["Support"],
        ),
        Employee(
            id="as-2",
            name="Noah Campbell",
            role="Assistant",
            regions=["Hamilton"],
            skills=["Support"],
        ),
        Employee(
            id="co-1",
            name="Alex Morgan",
            role="Coordinator",
            regions=["Toronto"],
            skills=["Maintenance"],
        ),
    ]
    titles = [
        "Harbour Heights",
        "King West Collection",
        "Cedar Grove",
        "Lakeshore Residences",
        "The Junction",
        "Maple Court",
        "Port Credit",
        "Parkside Living",
        "Bloor Village",
        "Wellington Place",
        "Oakwood Estates",
        "Bayview Gardens",
    ]
    doors = [210, 180, 160, 145, 175, 120, 180, 135, 165, 110, 140, 130]
    assignments = [1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6]
    portfolios = []
    for i, (name, d) in enumerate(zip(titles, doors)):
        factor = [1.5, 1.3, 1.2, 1, 0.8, 0.9, 1.2, 0.7, 0.8, 0.65, 0.8, 0.7][i]
        portfolios.append(
            Portfolio(
                id=f"pf-{i + 1}",
                name=name,
                region=["Toronto", "Mississauga", "Hamilton"][i % 3],
                property_type=["Multifamily", "Condo", "Single family"][i % 3],
                doors=d,
                properties=4 + (i % 2),
                clients=2 + (i == 0),
                assigned_to=f"pm-{assignments[i]}",
                monthly_revenue=d * 105,
                activities={
                    k: round(d * r * factor)
                    for k, r in {
                        "maintenance": 0.13,
                        "emergencies": 0.012,
                        "new_leases": 0.015,
                        "renewals": 0.04,
                        "turnovers": 0.015,
                        "inspections": 0.055,
                        "arrears": 0.025,
                        "owner_contacts": 0.2,
                        "escalations": 0.02,
                        "reports": 0.02,
                        "travel": 0.035,
                        "vendor_contacts": 0.13,
                    }.items()
                },
                complexity={
                    k: min(100, round(20 + factor * 25 + (i * 7 + j * 3) % 25))
                    for j, k in enumerate(DIMENSIONS)
                },
            )
        )
    return State(employees=employees, portfolios=portfolios, settings=settings)
