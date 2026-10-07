from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

ACTIVITIES = {
    "doors": "Base management",
    "maintenance": "Maintenance",
    "emergencies": "Emergency response",
    "new_leases": "New leasing",
    "renewals": "Renewals",
    "turnovers": "Turnovers",
    "inspections": "Inspections",
    "arrears": "Arrears cases",
    "owner_contacts": "Owner communication",
    "escalations": "Tenant escalations",
    "reports": "Client reporting",
    "travel": "Travel visits",
    "vendor_contacts": "Vendor coordination",
}
DIMENSIONS = [
    "maintenance",
    "turnover",
    "vacancy",
    "arrears",
    "owner",
    "reporting",
    "geography",
    "property_type",
    "escalation",
    "vendor",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Employee(Strict):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=100)
    role: Literal["PM", "Assistant", "Coordinator"] = "PM"
    regions: list[str] = Field(min_length=1)
    skills: list[str] = Field(min_length=1)
    contracted: float = Field(default=173.3, gt=0, le=400)
    leave: float = Field(default=13.3, ge=0)
    meetings: float = Field(default=12, ge=0)
    admin: float = Field(default=12, ge=0)
    training: float = Field(default=4, ge=0)
    company_work: float = Field(default=4, ge=0)
    hourly_cost: float = Field(default=45, ge=0)

    @model_validator(mode="after")
    def capacity_valid(self):
        if (
            sum(
                getattr(self, k)
                for k in ["leave", "meetings", "admin", "training", "company_work"]
            )
            > self.contracted
        ):
            raise ValueError("Non-client hours cannot exceed contracted hours")
        return self


class Portfolio(Strict):
    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=120)
    region: str = Field(min_length=1, max_length=80)
    property_type: Literal["Multifamily", "Condo", "Single family"] = "Multifamily"
    doors: int = Field(gt=0, le=1000000)
    properties: int = Field(default=1, gt=0)
    clients: int = Field(default=1, gt=0)
    assigned_to: str
    locked: bool = False
    monthly_revenue: float = Field(default=0, ge=0)
    activities: dict[str, float] = Field(default_factory=dict)
    complexity: dict[str, float] = Field(default_factory=dict)

    @model_validator(mode="after")
    def valid_drivers(self):
        if set(self.activities) - (set(ACTIVITIES) - {"doors"}):
            raise ValueError("Unknown activity driver")
        if set(self.complexity) - set(DIMENSIONS):
            raise ValueError("Unknown complexity dimension")
        if any(not 0 <= v <= 1e7 for v in self.activities.values()):
            raise ValueError("Activity counts must be finite and nonnegative")
        if any(not 0 <= v <= 100 for v in self.complexity.values()):
            raise ValueError("Complexity inputs must be 0–100")
        return self


class Settings(Strict):
    company: str = Field(
        default="Northline Property Group", min_length=1, max_length=120
    )
    period: str = Field(default="2026-10", pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    reference_hours: float = Field(default=0.5, gt=0, le=100)
    complexity_uplift: float = Field(default=0.3, ge=0, le=2)
    target_utilization: float = Field(default=0.9, gt=0, le=1)
    max_utilization: float = Field(default=1, gt=0, le=1.5)
    reassignment_penalty: float = Field(default=3, ge=0, le=1000)
    cost_weight: float = Field(default=0.001, ge=0, le=1)
    stress_multiplier: float = Field(default=1.2, ge=1, le=3)
    coefficients: dict[str, float]
    complexity_weights: dict[str, float]

    @model_validator(mode="after")
    def valid_settings(self):
        if set(self.coefficients) != set(ACTIVITIES):
            raise ValueError("All 13 coefficients are required")
        if any(not 0 <= v <= 10000 for v in self.coefficients.values()):
            raise ValueError("Coefficients must be nonnegative minutes per event")
        if set(self.complexity_weights) != set(DIMENSIONS):
            raise ValueError("All complexity weights are required")
        if (
            any(not 0 <= v <= 100 for v in self.complexity_weights.values())
            or sum(self.complexity_weights.values()) == 0
        ):
            raise ValueError("Complexity weights require a positive total")
        if self.target_utilization > self.max_utilization:
            raise ValueError("Target cannot exceed maximum utilization")
        return self


class State(Strict):
    version: int = Field(default=1, ge=1)
    employees: list[Employee] = Field(min_length=1, max_length=200)
    portfolios: list[Portfolio] = Field(max_length=1000)
    settings: Settings

    @model_validator(mode="after")
    def integrity(self):
        employees = {e.id: e for e in self.employees}
        if len(employees) != len(self.employees) or len(
            {p.id for p in self.portfolios}
        ) != len(self.portfolios):
            raise ValueError("Duplicate IDs")
        for p in self.portfolios:
            if p.assigned_to not in employees or employees[p.assigned_to].role != "PM":
                raise ValueError("Every portfolio needs a valid PM assignment")
        return self


class ScenarioInput(Strict):
    name: str = Field(default="Growth plan", min_length=1, max_length=120)
    doors: int = Field(default=250, ge=0, le=100000)
    hours_per_door: float = Field(default=0.5, gt=0, le=10)
    monthly_pm_cost: float = Field(default=7800, gt=0)
    new_pm_capacity: float = Field(default=128, gt=0, le=300)
    support_share: float = Field(default=0.25, ge=0, le=0.6)
    support_capacity: float = Field(default=120, gt=0, le=300)
    assistant_cost: float = Field(default=4800, gt=0)
    outsourcing_rate: float = Field(default=55, gt=0)


class ApplyAllocation(Strict):
    version: int
    assignments: dict[str, str]
