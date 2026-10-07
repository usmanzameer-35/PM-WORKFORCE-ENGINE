"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Layers3,
  Gauge,
  GitBranch,
  TrendingUp,
  Lightbulb,
  Upload,
  Settings2,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Download,
  Search,
  Check,
  X,
  SlidersHorizontal,
  Sparkles,
  CircleHelp,
  Menu,
  Plus,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import type {
  Payload,
  State,
  Employee,
  Portfolio,
  TeamMetric,
  Metrics,
  Allocation,
  Scenario,
  ScenarioInput,
  Run,
  Preview,
} from "./types";
import { activities } from "./types";

const modules = [
  "Overview",
  "Portfolio",
  "Team",
  "Workload",
  "Capacity",
  "Allocation Optimizer",
  "Growth / Scenario Lab",
  "Recommendations",
  "Imports",
  "Settings",
];
const icons = [
  LayoutDashboard,
  Building2,
  Users,
  Layers3,
  Gauge,
  GitBranch,
  TrendingUp,
  Lightbulb,
  Upload,
  Settings2,
];
const descriptions = [
  "A clearer view of your people, portfolios, and potential.",
  "Understand the effort behind every door.",
  "The people powering your portfolio.",
  "Turn operational activity into explainable workload.",
  "Plan around productive time, not contracted hours.",
  "Find a better fit for every portfolio.",
  "See the workforce impact before your next move.",
  "Clear signals. Transparent rules. Practical next steps.",
  "Bring your portfolio data into focus.",
  "Calibrate the model to the way your business works.",
];
const colors = [
  "#236c59",
  "#76a98b",
  "#acc5ae",
  "#d7bd7d",
  "#7e8cb2",
  "#d7937e",
  "#9daea7",
];
const fmt = (n: number | null, d = 0) =>
  n == null ? "—" : n.toLocaleString("en-CA", { maximumFractionDigits: d });
const pct = (n: number | null) =>
  n == null ? "No capacity" : `${fmt(n * 100)}%`;
const money = (n: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
const pretty = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch(
    `/api/${path}`,
    body === undefined
      ? {}
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail),
    );
  return data;
}
function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Stat({
  label,
  value,
  foot,
  icon: Icon,
  tone = "",
}: {
  label: string;
  value: string;
  foot: string;
  icon: typeof Building2;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        {label}
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <span>{foot}</span>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  help?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        required
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {help && <small>{help}</small>}
    </label>
  );
}
function UtilBar({ value }: { value: number | null }) {
  return (
    <div className="util-wrap">
      <div className="util-track">
        <div
          style={{
            width: `${Math.min(100, (value ?? 0) * 100)}%`,
            background: value != null && value > 1 ? "#c46d51" : "#347e65",
          }}
        />
      </div>
      <b className={value != null && value > 1 ? "danger" : ""}>{pct(value)}</b>
    </div>
  );
}
function TeamChart({
  team,
  target,
  stress = false,
}: {
  team: TeamMetric[];
  target: number;
  stress?: boolean;
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={team
            .filter((e) => e.role === "PM")
            .map((e) => ({
              name: e.name.split(" ")[0],
              utilization:
                e.utilization === null
                  ? null
                  : (stress ? e.stress_utilization! : e.utilization) * 100,
            }))}
          barSize={34}
          margin={{ left: -20, right: 12, top: 10 }}
        >
          <CartesianGrid vertical={false} stroke="#edf0ec" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#78827b", fontSize: 12 }}
          />
          <YAxis
            unit="%"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#78827b", fontSize: 11 }}
          />
          <Tooltip
            formatter={(v) => `${Number(v).toFixed(1)}%`}
            cursor={{ fill: "#f3f5f1" }}
          />
          <ReferenceLine
            y={target * 100}
            stroke="#99a69c"
            strokeDasharray="4 4"
          />
          <Bar dataKey="utilization" radius={[5, 5, 0, 0]}>
            {team
              .filter((e) => e.role === "PM")
              .map((e) => (
                <Cell
                  key={e.id}
                  fill={
                    (stress ? e.stress_utilization : e.utilization)! > 1
                      ? "#d69374"
                      : "#377f65"
                  }
                />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<Payload | null>(null),
    [page, setPage] = useState("Overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [region, setRegion] = useState("All regions"),
    [stress, setStress] = useState(false);
  const [draft, setDraft] = useState<State | null>(null),
    [editing, setEditing] = useState<{
      kind: "portfolio" | "employee";
      id: string;
    } | null>(null),
    [allocation, setAllocation] = useState<Allocation | null>(null),
    [scenarioResult, setScenarioResult] = useState<Scenario | null>(null),
    [runs, setRuns] = useState<Run[]>([]),
    [file, setFile] = useState<File | null>(null),
    [mapping, setMapping] = useState("{}"),
    [preview, setPreview] = useState<Preview | null>(null);
  const [scenarioInput, setScenarioInput] = useState<ScenarioInput>({
    name: "Toronto acquisition",
    doors: 250,
    hours_per_door: 0.5,
    monthly_pm_cost: 7800,
    new_pm_capacity: 128,
    support_share: 0.25,
    support_capacity: 120,
    assistant_cost: 4800,
    outsourcing_rate: 55,
  });
  async function reload() {
    const d = await api<Payload>("state");
    setData(d);
    setDraft(structuredClone(d.state));
  }
  useEffect(() => {
    reload().catch((e) => setError(e.message));
    const sync = () => {
      try {
        const h = decodeURIComponent(window.location.hash.slice(1));
        if (modules.includes(h)) setPage(h);
      } catch {
        setPage("Overview");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!editing) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".modal");
    const selector = "button:not(:disabled),input,select,textarea";
    modal?.querySelector<HTMLElement>(selector)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditing(null);
      if (event.key === "Tab") {
        const items = Array.from(
          modal?.querySelectorAll<HTMLElement>(selector) ?? [],
        );
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [editing]);
  function navigate(next: string) {
    setPage(next);
    setSearch("");
    setMobile(false);
    window.location.hash = encodeURIComponent(next);
    if (data) setDraft(structuredClone(data.state));
  }
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  async function save(next: State) {
    const d = await api<Payload>("state", next, "PUT");
    setData(d);
    setDraft(structuredClone(d.state));
    setEditing(null);
    setAllocation(null);
    setNotice("Changes saved. All metrics have been recalculated.");
  }
  function exportCsv() {
    if (!data) return;
    const headers = [
      "Portfolio",
      "Region",
      "Doors",
      "Equivalent doors",
      "Workload hours",
      "Complexity",
    ];
    const rows = data.metrics.portfolios.map((p) => [
      p.name,
      p.region,
      p.doors,
      p.equivalent_doors.toFixed(1),
      p.hours.toFixed(1),
      p.complexity_score.toFixed(1),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "workforce-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  const m = data?.metrics,
    s = data?.state.settings,
    idx = modules.indexOf(page);
  function edit(kind: "portfolio" | "employee", id: string) {
    setDraft(structuredClone(data!.state));
    setEditing({ kind, id });
  }
  function updateEmployee(id: string, key: keyof Employee, value: unknown) {
    setDraft((d) =>
      d
        ? {
            ...d,
            employees: d.employees.map((e) =>
              e.id === id ? { ...e, [key]: value } : e,
            ),
          }
        : d,
    );
  }
  function updatePortfolio(id: string, key: keyof Portfolio, value: unknown) {
    setDraft((d) =>
      d
        ? {
            ...d,
            portfolios: d.portfolios.map((p) =>
              p.id === id ? { ...p, [key]: value } : p,
            ),
          }
        : d,
    );
  }
  function setting(key: string, value: unknown) {
    setDraft((d) =>
      d ? { ...d, settings: { ...d.settings, [key]: value } } : d,
    );
  }
  const team = m?.team.filter((e) => e.role === "PM") ?? [];
  const portfolios =
    m?.portfolios.filter(
      (p) =>
        (region === "All regions" || p.region === region) &&
        (p.name + " " + p.region).toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  function recommendations(limit?: number) {
    return data!.recommendations.slice(0, limit).map((r) => (
      <div className="recommendation" key={r.id}>
        <div className={`signal ${r.severity}`}>
          <Lightbulb size={17} />
        </div>
        <div>
          <div className="rec-title">
            <h3>{r.title}</h3>
            <Badge tone={r.severity === "high" ? "amber" : "green"}>
              {r.severity === "high"
                ? "Needs attention"
                : r.severity === "medium"
                  ? "Review"
                  : "Healthy"}
            </Badge>
          </div>
          <p>{r.body}</p>
          <small>{r.rule}</small>
          <button className="text-btn" onClick={() => navigate(r.action)}>
            Explore recommendation <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    ));
  }
  return (
    <div className="app-shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#Overview"
          onClick={() => navigate("Overview")}
        >
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          northline<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">N</span>
          <div>
            <b>{s?.company || "Northline Property Group"}</b>
            <small>Workforce intelligence</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {modules.map((name, i) => {
            const Icon = icons[i];
            return (
              <button
                key={name}
                className={page === name ? "nav-item active" : "nav-item"}
                onClick={() => navigate(name)}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === "Recommendations" && data && (
                  <em>
                    {
                      data.recommendations.filter((r) => r.severity !== "low")
                        .length
                    }
                  </em>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-indicator">
            <i /> Synthetic demo workspace
          </div>
          <p>
            Assumptions you can inspect.
            <br />
            Decisions you can explain.
          </p>
          <div className="profile">
            <span>NP</span>
            <div>
              <b>Northline Planning</b>
              <small>Local workspace</small>
            </div>
            <CircleHelp size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-toggle icon-btn"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{page}</b>
          </div>
          <div className="top-right">
            <Badge>Demo data</Badge>
            <span className="top-separator" />
            <span>Monthly planning</span>
            <span className="avatar">NP</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">PROPERTY MANAGEMENT INTELLIGENCE</div>
              <h1>{page === "Overview" ? "Workforce overview" : page}</h1>
              <p>{descriptions[idx]}</p>
            </div>
            <div className="heading-actions">
              <span className="period">
                {s?.period || "Loading…"} <span>· monthly</span>
              </span>
              <button className="btn" onClick={exportCsv} disabled={!data}>
                <Download size={15} /> Export report
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button className="text-btn" onClick={() => act(reload)}>
                Refresh data
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <Check size={17} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {!data || !m || !s || !draft ? (
            <div className="panel empty">
              <RefreshCw className="spin" /> Connecting to the analytics engine…
              {error && (
                <p>Start the FastAPI backend on port 8000, then refresh.</p>
              )}
            </div>
          ) : (
            <>
              {page === "Overview" && (
                <>
                  <div className="insight-banner">
                    <span className="insight-icon">
                      <Sparkles size={19} />
                    </span>
                    <div>
                      <b>
                        {m.totals.overloaded
                          ? m.totals.spare_hours >= 0
                            ? "Your team has capacity. The distribution needs attention."
                            : "Demand is above target. Review allocation and staffing."
                          : "Your next growth decision starts here."}
                      </b>
                      <p>
                        {m.totals.overloaded} PMs exceed productive capacity ·{" "}
                        {fmt(Math.abs(m.totals.spare_hours))} hours{" "}
                        {m.totals.spare_hours >= 0
                          ? "available below"
                          : "above"}{" "}
                        the {pct(s.target_utilization)} planning target.
                      </p>
                    </div>
                    <button onClick={() => navigate("Allocation Optimizer")}>
                      Explore allocation <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="stats-grid">
                    <Stat
                      label="Actual doors"
                      value={fmt(m.totals.doors)}
                      foot={`${m.totals.properties} properties · ${m.portfolios.length} portfolios`}
                      icon={Building2}
                    />
                    <Stat
                      label="Equivalent doors"
                      value={fmt(m.totals.equivalent_doors)}
                      foot={`${fmt(m.totals.hours)} modeled hours / month`}
                      icon={Layers3}
                    />
                    <Stat
                      label="Team utilization"
                      value={pct(m.totals.utilization)}
                      foot={`${pct(s.target_utilization)} planning target`}
                      icon={Gauge}
                    />
                    <Stat
                      label="PMs over capacity"
                      value={String(m.totals.overloaded).padStart(2, "0")}
                      foot={`Across ${team.length} property managers`}
                      icon={Users}
                      tone="attention"
                    />
                  </div>
                  <div className="overview-grid">
                    <Panel
                      title="Capacity, person by person"
                      subtitle="Assigned workload as a share of productive PM hours"
                      action={
                        <div className="segmented">
                          <button
                            className={!stress ? "selected" : ""}
                            onClick={() => setStress(false)}
                          >
                            Expected
                          </button>
                          <button
                            className={stress ? "selected" : ""}
                            onClick={() => setStress(true)}
                          >
                            Stress
                          </button>
                        </div>
                      }
                    >
                      <TeamChart
                        team={team}
                        target={s.target_utilization}
                        stress={stress}
                      />
                      <div className="chart-footer">
                        <span>
                          <i className="legend-dot" /> Within capacity
                        </span>
                        <span>
                          <i className="legend-dot amber-dot" /> Over capacity
                        </span>
                        <span>– – {pct(s.target_utilization)} target</span>
                      </div>
                      {stress && (
                        <p className="chart-note">
                          Sensitivity at {s.stress_multiplier}× workload; not a
                          statistical P90 forecast.
                        </p>
                      )}
                    </Panel>
                    <Panel
                      title="Where the work happens"
                      subtitle="Modeled effort by activity"
                    >
                      <div className="donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={m.breakdown}
                              dataKey="hours"
                              nameKey="key"
                              innerRadius={66}
                              outerRadius={92}
                              paddingAngle={2}
                              stroke="none"
                            >
                              {m.breakdown.map((b, i) => (
                                <Cell
                                  key={b.key}
                                  fill={colors[i % colors.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v, n) => [
                                `${fmt(Number(v), 1)} hours`,
                                activities[String(n)] || n,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="donut-center">
                          <strong>{fmt(m.totals.hours)}</strong>
                          <span>hours / month</span>
                        </div>
                      </div>
                      <div className="activity-legend">
                        {[...m.breakdown]
                          .sort((a, b) => b.hours - a.hours)
                          .slice(0, 4)
                          .map((b) => (
                            <div key={b.key}>
                              <span>
                                <i
                                  style={{
                                    background:
                                      colors[
                                        m.breakdown.indexOf(b) % colors.length
                                      ],
                                  }}
                                />
                                {activities[b.key]}
                              </span>
                              <b>
                                {pct(
                                  m.totals.hours ? b.hours / m.totals.hours : 0,
                                )}
                              </b>
                            </div>
                          ))}
                      </div>
                    </Panel>
                  </div>
                  <div className="lower-grid">
                    <Panel
                      title="Team at a glance"
                      subtitle="A balanced portfolio is more than a door count"
                      action={
                        <button
                          className="text-btn"
                          onClick={() => navigate("Team")}
                        >
                          View team <ArrowUpRight size={14} />
                        </button>
                      }
                    >
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Property manager</th>
                              <th>Doors</th>
                              <th>Equiv. doors</th>
                              <th>Utilization</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.map((e) => (
                              <tr key={e.id}>
                                <td>
                                  <div className="person">
                                    <span className="person-avatar">
                                      {e.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </span>
                                    <div>
                                      <b>{e.name}</b>
                                      <small>
                                        {e.portfolio_count} portfolios
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td>{fmt(e.doors)}</td>
                                <td>{fmt(e.equivalent_doors)}</td>
                                <td>
                                  <UtilBar value={e.utilization} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                    <Panel
                      title="Your next best moves"
                      subtitle="Driven by rules, backed by the numbers"
                      action={
                        <Badge tone="neutral">
                          {data.recommendations.length}
                        </Badge>
                      }
                    >
                      {recommendations(2)}
                      <button
                        className="all-link"
                        onClick={() => navigate("Recommendations")}
                      >
                        View all recommendations <ArrowRight size={15} />
                      </button>
                    </Panel>
                  </div>
                </>
              )}
              {page === "Portfolio" && (
                <>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        aria-label="Search portfolios"
                        placeholder="Search portfolios or regions…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      {[
                        "All regions",
                        ...new Set(m.portfolios.map((p) => p.region)),
                      ].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      className="btn primary"
                      onClick={() => {
                        const id = `pf-${Date.now()}`;
                        setDraft({
                          ...structuredClone(data.state),
                          portfolios: [
                            ...data.state.portfolios,
                            {
                              id,
                              name: "New portfolio",
                              region: "Toronto",
                              property_type: "Multifamily",
                              doors: 100,
                              properties: 1,
                              clients: 1,
                              assigned_to: team[0]?.id || "",
                              locked: false,
                              monthly_revenue: 0,
                              activities: {},
                              complexity: {},
                            },
                          ],
                        });
                        setEditing({ kind: "portfolio", id });
                      }}
                    >
                      <Plus size={16} /> Add portfolio
                    </button>
                  </div>
                  <Panel>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Portfolio / region</th>
                            <th>Assigned PM</th>
                            <th>Doors</th>
                            <th>Equivalent doors</th>
                            <th>Hours</th>
                            <th>Complexity</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {portfolios.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <b>
                                  {p.name}{" "}
                                  {p.locked && <LockKeyhole size={12} />}
                                </b>
                                <small>
                                  {p.region} · {p.property_type}
                                </small>
                              </td>
                              <td>
                                {team.find((e) => e.id === p.assigned_to)?.name}
                              </td>
                              <td>{fmt(p.doors)}</td>
                              <td>{fmt(p.equivalent_doors, 1)}</td>
                              <td>{fmt(p.hours, 1)}</td>
                              <td>
                                <Badge
                                  tone={
                                    p.complexity_score > 70
                                      ? "amber"
                                      : "neutral"
                                  }
                                >
                                  {fmt(p.complexity_score)} / 100
                                </Badge>
                              </td>
                              <td>
                                <button
                                  className="text-btn"
                                  onClick={() => edit("portfolio", p.id)}
                                >
                                  Inspect <ArrowUpRight size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!portfolios.length && (
                        <div className="empty">
                          No portfolios match your filters.
                        </div>
                      )}
                    </div>
                  </Panel>
                  <p className="footnote">
                    Equivalent Doors = weighted workload hours ÷{" "}
                    {s.reference_hours} reference hours per door. Portfolio
                    client counts are aggregated; owners shared across
                    portfolios may be counted more than once.
                  </p>
                </>
              )}
              {page === "Team" && (
                <>
                  <div className="toolbar">
                    <button
                      className="btn primary"
                      onClick={() => {
                        const id = `pm-${Date.now()}`;
                        setDraft({
                          ...structuredClone(data.state),
                          employees: [
                            ...data.state.employees,
                            {
                              id,
                              name: "New team member",
                              role: "PM",
                              regions: ["Toronto"],
                              skills: ["Multifamily"],
                              contracted: 173.3,
                              leave: 13.3,
                              meetings: 12,
                              admin: 12,
                              training: 4,
                              company_work: 4,
                              hourly_cost: 45,
                            },
                          ],
                        });
                        setEditing({ kind: "employee", id });
                      }}
                    >
                      <Plus size={16} /> Add team member
                    </button>
                  </div>
                  <div className="stats-grid">
                    <Stat
                      label="Property managers"
                      value={String(team.length)}
                      foot="Accountable portfolio owners"
                      icon={Users}
                    />
                    <Stat
                      label="Support team"
                      value={String(m.team.length - team.length)}
                      foot="Assistants and coordinators"
                      icon={Users}
                    />
                    <Stat
                      label="Productive PM capacity"
                      value={`${fmt(m.totals.capacity)} h`}
                      foot="After non-client allowances"
                      icon={Gauge}
                    />
                    <Stat
                      label="Assigned demand"
                      value={`${fmt(m.totals.hours)} h`}
                      foot="Expected monthly workload"
                      icon={Layers3}
                    />
                  </div>
                  <div className="team-grid">
                    {m.team.map((e) => (
                      <Panel key={e.id} className="employee-card">
                        <div className="employee-top">
                          <span className="person-avatar large">
                            {e.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <Badge tone={e.role === "PM" ? "green" : "neutral"}>
                            {e.role}
                          </Badge>
                        </div>
                        <h2>{e.name}</h2>
                        <p>{e.regions.join(" · ")}</p>
                        <div className="employee-numbers">
                          <div>
                            <small>Productive hours</small>
                            <b>{fmt(e.capacity, 1)}</b>
                          </div>
                          <div>
                            <small>Assigned hours</small>
                            <b>
                              {e.role === "PM"
                                ? fmt(e.hours, 1)
                                : "Not allocated"}
                            </b>
                          </div>
                        </div>
                        {e.role === "PM" ? (
                          <UtilBar value={e.utilization} />
                        ) : (
                          <p className="footnote">
                            Support capacity is modeled separately in scenarios.
                          </p>
                        )}
                        <div className="skills">
                          {e.skills.map((k) => (
                            <Badge key={k} tone="neutral">
                              {k}
                            </Badge>
                          ))}
                        </div>
                        <button
                          className="btn full"
                          onClick={() => edit("employee", e.id)}
                        >
                          <SlidersHorizontal size={14} /> Edit capacity &
                          eligibility
                        </button>
                      </Panel>
                    ))}
                  </div>
                </>
              )}
              {page === "Workload" && (
                <>
                  <div className="two-col">
                    <Panel
                      title="The workload bridge"
                      subtitle="Monthly activity × minutes per event × complexity adjustment"
                    >
                      <div className="horizontal-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={m.breakdown.map((b) => ({
                              ...b,
                              name: activities[b.key],
                            }))}
                            layout="vertical"
                            margin={{ left: 0, right: 25 }}
                          >
                            <CartesianGrid
                              horizontal={false}
                              stroke="#edf0ec"
                            />
                            <XAxis
                              type="number"
                              unit=" h"
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={145}
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(v) => `${fmt(Number(v), 1)} h`}
                            />
                            <Bar
                              dataKey="hours"
                              fill="#377f65"
                              radius={[0, 4, 4, 0]}
                              barSize={16}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>
                    <Panel
                      title="Transparent by design"
                      subtitle="One calculation engine, from activity to decision"
                    >
                      <div className="formula-steps">
                        {[
                          [
                            "01",
                            "Raw effort",
                            "Σ (monthly event count × minutes per event) ÷ 60",
                          ],
                          [
                            "02",
                            "Complexity score",
                            "Weighted mean of ten 0–100 dimensions",
                          ],
                          [
                            "03",
                            "Adjusted workload",
                            `Raw hours × (1 + ${s.complexity_uplift} × score / 100)`,
                          ],
                          [
                            "04",
                            "Equivalent Doors",
                            `Adjusted hours ÷ ${s.reference_hours} reference hours per door`,
                          ],
                        ].map(([n, t, b]) => (
                          <div key={n}>
                            <span>{n}</span>
                            <div>
                              <h3>{t}</h3>
                              <p>{b}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="note">
                        All coefficients are synthetic assumptions. The
                        complexity uplift represents residual friction;
                        calibrate it to avoid counting activity effort twice.
                      </div>
                    </Panel>
                  </div>
                  <Panel
                    title="Workload coefficient library"
                    subtitle="Editable minutes per event · applies to all portfolios"
                    action={
                      <button
                        disabled={busy}
                        className="btn primary"
                        onClick={() => act(() => save(draft))}
                      >
                        Save coefficients
                      </button>
                    }
                  >
                    <div className="fields-grid">
                      {Object.entries(draft.settings.coefficients).map(
                        ([k, v]) => (
                          <Field
                            key={k}
                            label={activities[k]}
                            value={v}
                            step={0.1}
                            onChange={(n) =>
                              setting("coefficients", {
                                ...draft.settings.coefficients,
                                [k]: n,
                              })
                            }
                            help={
                              k === "doors"
                                ? "Minutes per active door / month"
                                : "Minutes per event"
                            }
                          />
                        ),
                      )}
                    </div>
                  </Panel>
                </>
              )}
              {page === "Capacity" && (
                <>
                  <div className="two-col">
                    <Panel
                      title="Productive capacity bridge"
                      subtitle="Monthly hours across property managers"
                    >
                      <div className="capacity-bridge">
                        {[
                          [
                            "Contracted",
                            team.reduce((a, e) => a + e.contracted, 0),
                          ],
                          ...[
                            "leave",
                            "meetings",
                            "admin",
                            "training",
                            "company_work",
                          ].map((k) => [
                            pretty(k),
                            -team.reduce(
                              (a, e) => a + (e[k as keyof Employee] as number),
                              0,
                            ),
                          ]),
                          ["Productive PM capacity", m.totals.capacity],
                        ].map(([k, v], i) => (
                          <div
                            className={i === 6 ? "total" : ""}
                            key={String(k)}
                          >
                            <span>{k}</span>
                            <b>{fmt(Number(v), 1)} h</b>
                          </div>
                        ))}
                      </div>
                    </Panel>
                    <Panel
                      title="Capacity guardrails"
                      subtitle="Usable room at your planning target"
                    >
                      <div className="capacity-number">
                        {fmt(Math.abs(m.totals.spare_equivalent_doors))}
                        <span>
                          Equivalent Doors{" "}
                          {m.totals.spare_hours >= 0
                            ? "available"
                            : "above target"}
                        </span>
                      </div>
                      <p className="padded">
                        {fmt(m.totals.spare_hours, 1)} hours to the{" "}
                        {pct(s.target_utilization)} target. Aggregate spare
                        capacity does not guarantee a feasible portfolio
                        assignment.
                      </p>
                      <button
                        className="btn primary margin"
                        onClick={() => navigate("Allocation Optimizer")}
                      >
                        Test an allocation <ArrowRight size={15} />
                      </button>
                    </Panel>
                  </div>
                  <Panel
                    title="Capacity detail"
                    subtitle="Edit employee allowances in Team"
                  >
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>PM</th>
                            <th>Contracted</th>
                            <th>Non-client</th>
                            <th>Productive</th>
                            <th>Assigned</th>
                            <th>Expected</th>
                            <th>Stress ({s.stress_multiplier}×)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {team.map((e) => (
                            <tr key={e.id}>
                              <td>
                                <button
                                  className="text-btn"
                                  onClick={() => edit("employee", e.id)}
                                >
                                  {e.name}
                                </button>
                              </td>
                              <td>{fmt(e.contracted, 1)} h</td>
                              <td>{fmt(e.contracted - e.capacity, 1)} h</td>
                              <td>{fmt(e.capacity, 1)} h</td>
                              <td>{fmt(e.hours, 1)} h</td>
                              <td>{pct(e.utilization)}</td>
                              <td
                                className={
                                  e.stress_utilization! > 1 ? "danger" : ""
                                }
                              >
                                {pct(e.stress_utilization)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </>
              )}
              {page === "Allocation Optimizer" && (
                <>
                  <div className="insight-banner">
                    <span className="insight-icon">
                      <GitBranch size={20} />
                    </span>
                    <div>
                      <b>A better distribution, with real constraints.</b>
                      <p>
                        Whole portfolios · Skills and regions · Continuity locks
                        · {pct(s.max_utilization)} maximum utilization
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(async () =>
                          setAllocation(await api<Allocation>("optimize", {})),
                        )
                      }
                    >
                      {busy ? "Solving…" : "Run optimizer"}{" "}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="two-col">
                    <Panel
                      title="Current allocation"
                      subtitle="Monthly expected utilization"
                    >
                      <TeamChart team={team} target={s.target_utilization} />
                    </Panel>
                    <Panel
                      title="Proposed allocation"
                      subtitle={
                        allocation?.status === "optimal"
                          ? `${allocation.moves.length} portfolio transfers · model version ${allocation.version}`
                          : "A plan is only shown when a proven optimal solution exists"
                      }
                    >
                      {allocation?.status === "optimal" ? (
                        <TeamChart
                          team={allocation.after.team}
                          target={s.target_utilization}
                        />
                      ) : (
                        <div className="empty">
                          <GitBranch size={36} />
                          <h3>
                            {allocation
                              ? pretty(allocation.status)
                              : "Ready to find a better balance"}
                          </h3>
                          <p>
                            {allocation?.reason ||
                              "Run the optimizer to compare a constrained allocation with your current plan."}
                          </p>
                        </div>
                      )}
                    </Panel>
                  </div>
                  {allocation?.status === "optimal" && (
                    <Panel
                      title="Review proposed transfers"
                      subtitle="Applying this plan updates assignments and recalculates all metrics"
                      action={
                        <button
                          disabled={
                            busy ||
                            allocation.version !== data.state.version ||
                            !allocation.moves.length
                          }
                          className="btn primary"
                          onClick={() =>
                            act(async () => {
                              await api("allocation/apply", {
                                version: allocation.version,
                                assignments: allocation.assignments,
                              });
                              await reload();
                              setAllocation(null);
                              setNotice("Allocation applied successfully.");
                            })
                          }
                        >
                          Apply {allocation.moves.length} transfers
                        </button>
                      }
                    >
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Portfolio</th>
                              <th>Current PM</th>
                              <th>Proposed PM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allocation.moves.map((move) => (
                              <tr key={move.portfolio}>
                                <td>{move.portfolio}</td>
                                <td>
                                  {team.find((e) => e.id === move.from)?.name}
                                </td>
                                <td>
                                  {team.find((e) => e.id === move.to)?.name}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!allocation.moves.length && (
                          <div className="empty">
                            Current assignments are already preferred under
                            these constraints and objective weights.
                          </div>
                        )}
                      </div>
                    </Panel>
                  )}
                  <Panel title="What the solver is optimizing">
                    <div className="padded">
                      <p>
                        Minimize 100 × highest utilization +{" "}
                        {s.reassignment_penalty} per transfer + {s.cost_weight}{" "}
                        × modeled PM labor cost. Assign each portfolio to
                        exactly one eligible PM. Locked portfolios stay with
                        their current PM.
                      </p>
                      <p className="footnote">
                        PuLP / CBC · Hard limits are never silently relaxed. The
                        target is a planning guardrail; the maximum is a hard
                        assignment constraint. Settings exposes both.
                      </p>
                    </div>
                  </Panel>
                </>
              )}
              {page === "Growth / Scenario Lab" && (
                <>
                  <div className="scenario-layout">
                    <Panel
                      title="Model your next move"
                      subtitle="Monthly planning assumptions · CAD"
                    >
                      <form
                        className="scenario-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          act(async () => {
                            setScenarioResult(
                              await api<Scenario>("scenarios", scenarioInput),
                            );
                            setRuns(await api<Run[]>("runs"));
                          });
                        }}
                      >
                        <label className="field">
                          <span>Scenario name</span>
                          <input
                            required
                            maxLength={120}
                            value={scenarioInput.name}
                            onChange={(e) =>
                              setScenarioInput({
                                ...scenarioInput,
                                name: e.target.value,
                              })
                            }
                          />
                        </label>
                        {Object.entries(scenarioInput)
                          .filter(([k]) => k !== "name")
                          .map(([k, v]) => (
                            <Field
                              key={k}
                              label={
                                (
                                  {
                                    doors: "Additional doors",
                                    hours_per_door:
                                      "Weighted hours per new door",
                                    monthly_pm_cost:
                                      "Monthly cost per new PM (CAD)",
                                    new_pm_capacity:
                                      "Productive hours per new PM",
                                    support_share:
                                      "Delegable share of new workload",
                                    support_capacity:
                                      "Productive hours per assistant",
                                    assistant_cost:
                                      "Monthly assistant cost (CAD)",
                                    outsourcing_rate:
                                      "Outsource cost per hour (CAD)",
                                  } as Record<string, string>
                                )[k]
                              }
                              value={v as number}
                              step={
                                k === "support_share" || k === "hours_per_door"
                                  ? 0.01
                                  : 1
                              }
                              min={
                                k === "doors" || k === "support_share"
                                  ? 0
                                  : k === "hours_per_door"
                                    ? 0.01
                                    : 1
                              }
                              max={k === "support_share" ? 0.6 : undefined}
                              onChange={(n) =>
                                setScenarioInput({ ...scenarioInput, [k]: n })
                              }
                            />
                          ))}
                        <button disabled={busy} className="btn primary full">
                          {busy ? "Calculating…" : "Calculate scenario"}{" "}
                          <ArrowRight size={16} />
                        </button>
                      </form>
                    </Panel>
                    <div>
                      {scenarioResult ? (
                        <>
                          <div className="stats-grid scenario-stats">
                            <Stat
                              label="Additional workload"
                              value={`${fmt(scenarioResult.added_hours)} h`}
                              foot={`${fmt(scenarioResult.added_equivalent_doors)} Equivalent Doors`}
                              icon={Layers3}
                            />
                            <Stat
                              label="Projected utilization"
                              value={pct(scenarioResult.projected_utilization)}
                              foot={`${fmt(scenarioResult.gap_hours)} hours above target`}
                              icon={Gauge}
                            />
                          </div>
                          <Panel
                            title={scenarioResult.input.name}
                            subtitle={`Saved against model version ${scenarioResult.version} · ${scenarioResult.input.doors} additional doors`}
                          >
                            <div className="note">
                              Lowest modeled cost with sufficient aggregate
                              capacity: <b>{scenarioResult.recommended}</b>
                            </div>
                            <div className="option-list">
                              {scenarioResult.options.map((o) => (
                                <div
                                  className={
                                    o.name === scenarioResult.recommended
                                      ? "option recommended"
                                      : "option"
                                  }
                                  key={o.name}
                                >
                                  <div>
                                    <h3>{o.name}</h3>
                                    <p>
                                      {o.hires} new PMs · {o.support} assistants
                                    </p>
                                    <Badge
                                      tone={o.feasible ? "green" : "amber"}
                                    >
                                      {o.feasible
                                        ? "Aggregate capacity sufficient"
                                        : `${fmt(o.remaining_gap)} h capacity gap`}
                                    </Badge>
                                  </div>
                                  <div>
                                    <strong>{money(o.cost)}</strong>
                                    <small>/ month incremental</small>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="padded footnote">
                              {scenarioResult.caveat} Support can cover at most{" "}
                              {pct(scenarioResult.input.support_share)} of
                              incremental hours. Existing support capacity is
                              excluded.
                            </p>
                          </Panel>
                        </>
                      ) : (
                        <Panel>
                          <div className="empty tall">
                            <TrendingUp size={44} />
                            <h2>Grow with a clearer picture.</h2>
                            <p>
                              Compare reallocation, hiring, assistants, and
                              outsourcing using one set of transparent
                              assumptions.
                            </p>
                          </div>
                        </Panel>
                      )}
                      <Panel
                        title="Saved scenarios"
                        action={
                          <button
                            className="text-btn"
                            onClick={() =>
                              act(async () => setRuns(await api<Run[]>("runs")))
                            }
                          >
                            Load history <RefreshCw size={14} />
                          </button>
                        }
                      >
                        {runs
                          .filter((r) => r.kind === "scenario")
                          .map((r) => (
                            <button
                              className="history-row"
                              key={r.id}
                              onClick={() => {
                                setScenarioResult(r.data as Scenario);
                                setScenarioInput((r.data as Scenario).input);
                              }}
                            >
                              <div>
                                <b>{(r.data as Scenario).input.name}</b>
                                <small>
                                  {new Date(r.created_at).toLocaleString()} ·
                                  version {(r.data as Scenario).version}
                                </small>
                              </div>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                        {!runs.some((r) => r.kind === "scenario") && (
                          <p className="padded muted">
                            Calculate a scenario or load saved history.
                          </p>
                        )}
                      </Panel>
                    </div>
                  </div>
                </>
              )}
              {page === "Recommendations" && (
                <Panel
                  title="Recommendation centre"
                  subtitle="Every recommendation shows its trigger and the evidence behind it"
                >
                  {recommendations()}
                </Panel>
              )}
              {page === "Imports" && (
                <>
                  <div className="two-col">
                    <Panel
                      title="Import portfolio demand"
                      subtitle="CSV and XLSX · 2 MB maximum · 1,000 rows"
                    >
                      <div className="import-body">
                        <a
                          href="/api/imports/template"
                          download
                          className="btn"
                        >
                          <Download size={15} /> Download CSV template
                        </a>
                        <label className="upload-zone">
                          <Upload size={30} />
                          <b>
                            {file?.name || "Choose a CSV or Excel workbook"}
                          </b>
                          <span>
                            Portfolio attributes and monthly activity counts
                          </span>
                          <input
                            aria-label="Upload portfolio file"
                            type="file"
                            accept=".csv,.xlsx"
                            onChange={(e) => {
                              setFile(e.target.files?.[0] ?? null);
                              setPreview(null);
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>Column mapping (optional JSON)</span>
                          <textarea
                            value={mapping}
                            onChange={(e) => {
                              setMapping(e.target.value);
                              setPreview(null);
                            }}
                            placeholder={
                              '{"Building name":"name","Units":"doors"}'
                            }
                          />
                          <small>
                            Map source headers to template fields. Leave {"{}"}{" "}
                            for exact headers. Unmapped columns are ignored when
                            a mapping is provided.
                          </small>
                        </label>
                        <button
                          className="btn primary full"
                          disabled={!file || busy}
                          onClick={() =>
                            act(async () => {
                              setPreview(null);
                              const form = new FormData();
                              form.append("file", file!);
                              form.append("mapping", mapping);
                              const res = await fetch("/api/imports/preview", {
                                method: "POST",
                                body: form,
                              });
                              const result = await res.json();
                              if (!res.ok) throw new Error(result.detail);
                              setPreview(result);
                            })
                          }
                        >
                          Validate & preview <ArrowRight size={16} />
                        </button>
                      </div>
                    </Panel>
                    <Panel
                      title="A clean import, before anything changes"
                      subtitle="New portfolios only · atomic commit"
                    >
                      <div className="formula-steps">
                        {[
                          [
                            "01",
                            "Map your export",
                            "Use canonical columns or provide a source-to-field mapping.",
                          ],
                          [
                            "02",
                            "Review every row",
                            "Invalid values, duplicate IDs, and missing PMs block the entire import.",
                          ],
                          [
                            "03",
                            "Commit reviewed data",
                            "Explicitly apply the validated rows. Stale previews are rejected.",
                          ],
                        ].map(([n, t, b]) => (
                          <div key={n}>
                            <span>{n}</span>
                            <div>
                              <h3>{t}</h3>
                              <p>{b}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="note">
                        This release imports portfolio-level activity
                        aggregates. Export transaction counts from your PMS;
                        leases, work orders and payments remain in that system.
                      </div>
                    </Panel>
                  </div>
                  {preview && (
                    <Panel
                      title={`${preview.rows.length} valid rows · ${preview.errors.length} errors`}
                      subtitle={preview.note}
                      action={
                        <button
                          className="btn primary"
                          disabled={!preview.can_commit || busy}
                          onClick={() =>
                            act(async () => {
                              await api("imports/commit", {
                                version: preview.version,
                                rows: preview.rows,
                              });
                              await reload();
                              setPreview(null);
                              setFile(null);
                              setNotice(
                                "Import committed. Your portfolio analytics are up to date.",
                              );
                            })
                          }
                        >
                          Commit import
                        </button>
                      }
                    >
                      {preview.errors.map((e, i) => (
                        <div className="alert error" key={i}>
                          Row {e.row}: {e.message}
                        </div>
                      ))}
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Doors</th>
                              <th>Region</th>
                              <th>Assigned PM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.map((p) => (
                              <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{p.doors}</td>
                                <td>{p.region}</td>
                                <td>{p.assigned_to}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  )}
                </>
              )}
              {page === "Settings" && (
                <>
                  <Panel
                    title="Workspace & model settings"
                    subtitle="All values are editable planning assumptions, not validated industry benchmarks"
                    action={
                      <button
                        className="btn primary"
                        disabled={busy}
                        onClick={() => act(() => save(draft))}
                      >
                        Save settings
                      </button>
                    }
                  >
                    <div className="fields-grid">
                      <label className="field">
                        <span>Company name</span>
                        <input
                          value={draft.settings.company}
                          onChange={(e) => setting("company", e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Planning period</span>
                        <input
                          type="month"
                          value={draft.settings.period}
                          onChange={(e) => setting("period", e.target.value)}
                        />
                        <small>
                          A label for this snapshot; changing it does not create
                          historical data.
                        </small>
                      </label>
                      {(
                        [
                          "reference_hours",
                          "complexity_uplift",
                          "target_utilization",
                          "max_utilization",
                          "reassignment_penalty",
                          "cost_weight",
                          "stress_multiplier",
                        ] as const
                      ).map((k) => (
                        <Field
                          key={k}
                          label={pretty(k)}
                          value={draft.settings[k]}
                          step={0.001}
                          onChange={(n) => setting(k, n)}
                          help={
                            k === "reference_hours"
                              ? "Hours / reference door / month"
                              : k.includes("utilization")
                                ? "Ratio: 0.90 = 90%"
                                : k === "stress_multiplier"
                                  ? "Sensitivity factor; not a probabilistic forecast"
                                  : undefined
                          }
                        />
                      ))}
                    </div>
                  </Panel>
                  <Panel
                    title="Complexity weights"
                    subtitle="Weighted mean of 0–100 portfolio scores; weights are normalized automatically"
                  >
                    <div className="fields-grid">
                      {Object.entries(draft.settings.complexity_weights).map(
                        ([k, v]) => (
                          <Field
                            key={k}
                            label={pretty(k)}
                            value={v}
                            step={0.1}
                            onChange={(n) =>
                              setting("complexity_weights", {
                                ...draft.settings.complexity_weights,
                                [k]: n,
                              })
                            }
                          />
                        ),
                      )}
                    </div>
                  </Panel>
                  <div className="note">
                    Local demonstration workspace · SQLite by default,
                    PostgreSQL supported · No authentication or tenant isolation
                    is enabled. Use synthetic data until deployment access
                    controls are added.
                  </div>
                </>
              )}
              <footer>
                <span>
                  <i /> Analytics engine connected · Model v{data.state.version}
                </span>
                <span>Synthetic data · Monthly assumptions · CAD</span>
              </footer>
              {editing && (
                <div className="modal-backdrop">
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-label={
                      editing.kind === "portfolio"
                        ? "Edit portfolio"
                        : "Edit employee"
                    }
                    className="modal"
                  >
                    <div className="panel-head">
                      <div>
                        <h2>
                          {editing.kind === "portfolio"
                            ? "Portfolio inputs"
                            : "Capacity & eligibility"}
                        </h2>
                        <p>Changes recalculate the entire model when saved.</p>
                      </div>
                      <button
                        className="icon-btn"
                        aria-label="Close editor"
                        onClick={() => setEditing(null)}
                      >
                        <X />
                      </button>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(() => save(draft));
                      }}
                    >
                      <div className="modal-content">
                        {editing.kind === "employee"
                          ? (() => {
                              const e = draft.employees.find(
                                (e) => e.id === editing.id,
                              )!;
                              return (
                                <>
                                  <label className="field">
                                    <span>Name</span>
                                    <input
                                      required
                                      value={e.name}
                                      onChange={(v) =>
                                        updateEmployee(
                                          e.id,
                                          "name",
                                          v.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                  <label className="field">
                                    <span>Role</span>
                                    <select
                                      value={e.role}
                                      onChange={(v) =>
                                        updateEmployee(
                                          e.id,
                                          "role",
                                          v.target.value,
                                        )
                                      }
                                    >
                                      {["PM", "Assistant", "Coordinator"].map(
                                        (r) => (
                                          <option key={r}>{r}</option>
                                        ),
                                      )}
                                    </select>
                                  </label>
                                  <div className="fields-grid compact">
                                    {(
                                      [
                                        "contracted",
                                        "leave",
                                        "meetings",
                                        "admin",
                                        "training",
                                        "company_work",
                                        "hourly_cost",
                                      ] as const
                                    ).map((k) => (
                                      <Field
                                        key={k}
                                        label={
                                          pretty(k) +
                                          (k === "hourly_cost"
                                            ? " (CAD)"
                                            : " hours / month")
                                        }
                                        value={e[k]}
                                        step={0.1}
                                        onChange={(v) =>
                                          updateEmployee(e.id, k, v)
                                        }
                                      />
                                    ))}
                                  </div>
                                  {(["regions", "skills"] as const).map((k) => (
                                    <label className="field" key={k}>
                                      <span>{pretty(k)} (comma separated)</span>
                                      <input
                                        required
                                        value={e[k].join(", ")}
                                        onChange={(v) =>
                                          updateEmployee(
                                            e.id,
                                            k,
                                            v.target.value
                                              .split(",")
                                              .map((v) => v.trim()),
                                          )
                                        }
                                      />
                                    </label>
                                  ))}
                                </>
                              );
                            })()
                          : (() => {
                              const p = draft.portfolios.find(
                                (p) => p.id === editing.id,
                              )!;
                              return (
                                <>
                                  <label className="field">
                                    <span>Portfolio name</span>
                                    <input
                                      required
                                      value={p.name}
                                      onChange={(e) =>
                                        updatePortfolio(
                                          p.id,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                  <div className="fields-grid compact">
                                    <label className="field">
                                      <span>Region</span>
                                      <input
                                        required
                                        value={p.region}
                                        onChange={(e) =>
                                          updatePortfolio(
                                            p.id,
                                            "region",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="field">
                                      <span>Property type</span>
                                      <select
                                        value={p.property_type}
                                        onChange={(e) =>
                                          updatePortfolio(
                                            p.id,
                                            "property_type",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        {[
                                          "Multifamily",
                                          "Condo",
                                          "Single family",
                                        ].map((k) => (
                                          <option key={k}>{k}</option>
                                        ))}
                                      </select>
                                    </label>
                                    {(
                                      [
                                        "doors",
                                        "properties",
                                        "clients",
                                        "monthly_revenue",
                                      ] as const
                                    ).map((k) => (
                                      <Field
                                        key={k}
                                        label={pretty(k)}
                                        value={p[k]}
                                        min={k === "monthly_revenue" ? 0 : 1}
                                        onChange={(v) =>
                                          updatePortfolio(p.id, k, v)
                                        }
                                      />
                                    ))}
                                    <label className="field">
                                      <span>Assigned PM</span>
                                      <select
                                        value={p.assigned_to}
                                        onChange={(e) =>
                                          updatePortfolio(
                                            p.id,
                                            "assigned_to",
                                            e.target.value,
                                          )
                                        }
                                      >
                                        {team.map((e) => (
                                          <option key={e.id} value={e.id}>
                                            {e.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="check-field">
                                      <input
                                        type="checkbox"
                                        checked={p.locked}
                                        onChange={(e) =>
                                          updatePortfolio(
                                            p.id,
                                            "locked",
                                            e.target.checked,
                                          )
                                        }
                                      />{" "}
                                      Lock assignment for continuity
                                    </label>
                                  </div>
                                  <h3>Monthly activity counts</h3>
                                  <div className="fields-grid compact">
                                    {Object.keys(s.coefficients)
                                      .filter((k) => k !== "doors")
                                      .map((k) => (
                                        <Field
                                          key={k}
                                          label={activities[k]}
                                          value={p.activities[k] || 0}
                                          onChange={(v) =>
                                            updatePortfolio(
                                              p.id,
                                              "activities",
                                              { ...p.activities, [k]: v },
                                            )
                                          }
                                        />
                                      ))}
                                  </div>
                                  <h3>Complexity dimensions (0–100)</h3>
                                  <div className="fields-grid compact">
                                    {Object.keys(s.complexity_weights).map(
                                      (k) => (
                                        <Field
                                          key={k}
                                          label={pretty(k)}
                                          value={p.complexity[k] || 0}
                                          max={100}
                                          onChange={(v) =>
                                            updatePortfolio(
                                              p.id,
                                              "complexity",
                                              { ...p.complexity, [k]: v },
                                            )
                                          }
                                        />
                                      ),
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                        {error && (
                          <div role="alert" className="alert error">
                            {error}
                          </div>
                        )}
                      </div>
                      <div className="modal-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                        <button
                          disabled={busy}
                          type="submit"
                          className="btn primary"
                        >
                          {busy ? "Saving…" : "Save & recalculate"}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
