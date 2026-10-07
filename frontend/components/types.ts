export type Employee = {
  id: string;
  name: string;
  role: "PM" | "Assistant" | "Coordinator";
  regions: string[];
  skills: string[];
  contracted: number;
  leave: number;
  meetings: number;
  admin: number;
  training: number;
  company_work: number;
  hourly_cost: number;
};
export type Portfolio = {
  id: string;
  name: string;
  region: string;
  property_type: string;
  doors: number;
  properties: number;
  clients: number;
  assigned_to: string;
  locked: boolean;
  monthly_revenue: number;
  activities: Record<string, number>;
  complexity: Record<string, number>;
};
export type Settings = {
  company: string;
  period: string;
  reference_hours: number;
  complexity_uplift: number;
  target_utilization: number;
  max_utilization: number;
  reassignment_penalty: number;
  cost_weight: number;
  stress_multiplier: number;
  coefficients: Record<string, number>;
  complexity_weights: Record<string, number>;
};
export type State = {
  version: number;
  employees: Employee[];
  portfolios: Portfolio[];
  settings: Settings;
};
export type PortfolioMetric = Portfolio & {
  complexity_score: number;
  multiplier: number;
  base_hours: number;
  hours: number;
  equivalent_doors: number;
  breakdown: Record<string, number>;
};
export type TeamMetric = Employee & {
  capacity: number;
  hours: number;
  doors: number;
  equivalent_doors: number;
  utilization: number | null;
  overloaded: boolean;
  stress_utilization: number | null;
  portfolio_count: number;
};
export type Metrics = {
  portfolios: PortfolioMetric[];
  team: TeamMetric[];
  totals: {
    doors: number;
    properties: number;
    clients: number;
    hours: number;
    capacity: number;
    equivalent_doors: number;
    utilization: number | null;
    overloaded: number;
    spare_hours: number;
    spare_equivalent_doors: number;
  };
  breakdown: { key: string; hours: number }[];
};
export type Recommendation = {
  id: string;
  severity: string;
  title: string;
  body: string;
  rule: string;
  action: string;
};
export type Payload = {
  state: State;
  metrics: Metrics;
  recommendations: Recommendation[];
};
export type Allocation = {
  status: string;
  reason?: string;
  version: number;
  assignments: Record<string, string>;
  before: Metrics;
  after: Metrics;
  moves: { portfolio: string; from: string; to: string }[];
};
export type ScenarioInput = {
  name: string;
  doors: number;
  hours_per_door: number;
  monthly_pm_cost: number;
  new_pm_capacity: number;
  support_share: number;
  support_capacity: number;
  assistant_cost: number;
  outsourcing_rate: number;
};
export type Scenario = {
  input: ScenarioInput;
  version: number;
  added_hours: number;
  added_equivalent_doors: number;
  projected_utilization: number | null;
  gap_hours: number;
  pm_fte: number;
  delegated_hours: number;
  recommended: string;
  caveat: string;
  options: {
    name: string;
    cost: number;
    hires: number;
    support: number;
    feasible: boolean;
    remaining_gap: number;
  }[];
};
export type Run = {
  id: string;
  kind: string;
  created_at: string;
  data: Scenario | { count: number; ids: string[]; version: number };
};
export type Preview = {
  headers: string[];
  rows: Portfolio[];
  errors: { row: number; message: string }[];
  count: number;
  version: number;
  can_commit: boolean;
  note: string;
};
export const activities: Record<string, string> = {
  doors: "Base management",
  maintenance: "Maintenance",
  emergencies: "Emergency response",
  new_leases: "New leasing",
  renewals: "Renewals",
  turnovers: "Turnovers",
  inspections: "Inspections",
  arrears: "Arrears cases",
  owner_contacts: "Owner communication",
  escalations: "Tenant escalations",
  reports: "Client reporting",
  travel: "Travel visits",
  vendor_contacts: "Vendor coordination",
};
