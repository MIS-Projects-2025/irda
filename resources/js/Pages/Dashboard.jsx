import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, ArcElement,
    Title, Tooltip, Legend, defaults,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
    FileWarning, Clock, Activity, CheckCircle2,
    XCircle, BarChart3, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);
defaults.font.family = "inherit";

// ── Colour palette ────────────────────────────────────────────────────────────
const COLORS = {
    blue:   "#3b82f6",
    amber:  "#f59e0b",
    green:  "#22c55e",
    red:    "#ef4444",
    violet: "#8b5cf6",
    slate:  "#64748b",
    cyan:   "#06b6d4",
    orange: "#f97316",
};

const STATUS_COLORS = [
    COLORS.amber,   // Pending
    COLORS.blue,    // In Progress
    COLORS.green,   // Approved
    COLORS.red,     // Invalid
    COLORS.slate,   // Cancelled
];

const DA_COLORS = [
    COLORS.green,
    COLORS.blue,
    COLORS.amber,
    COLORS.orange,
    COLORS.red,
];

const VIOLATION_TYPE_COLORS = [COLORS.violet, COLORS.cyan];

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = "text-primary" }) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{label}</p>
                        <p className="text-3xl font-bold tracking-tight">{value ?? "—"}</p>
                        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-muted/60 ${color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Shared chart options helpers ──────────────────────────────────────────────
function doughnutOpts(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                        return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                    },
                },
            },
        },
    };
}

function barOpts(title, horizontal = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? "y" : "x",
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} IR${ctx.raw !== 1 ? "s" : ""}` } },
        },
        scales: {
            x: {
                grid: { color: "hsl(215 16% 93%)" },
                ticks: { font: { size: 11 } },
                ...(horizontal ? {} : { beginAtZero: true }),
            },
            y: {
                grid: horizontal ? { display: false } : { color: "hsl(215 16% 93%)" },
                ticks: { font: { size: 11 } },
                ...(horizontal ? {} : { beginAtZero: true }),
            },
        },
    };
}

const SCOPE_LABEL = {
    all:   "Showing all incident reports",
    staff: "Showing your team's incident reports",
    own:   "Showing your own incident reports",
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard({ stats }) {
    const s = stats ?? {};

    const closed = (s.invalid ?? 0) + (s.cancelled ?? 0) + (s.acknowledged ?? 0);

    // Monthly bar
    const monthlyChart = {
        labels:   (s.monthly ?? []).map((m) => m.month),
        datasets: [{
            label:           "IRs Filed",
            data:            (s.monthly ?? []).map((m) => m.count),
            backgroundColor: COLORS.blue + "cc",
            borderColor:     COLORS.blue,
            borderWidth:     1.5,
            borderRadius:    4,
        }],
    };

    // Status donut
    const statusChart = {
        labels:   ["Pending", "In Progress", "Approved", "Invalid", "Cancelled"],
        datasets: [{
            data:            [s.pending, s.inProgress, s.approved, s.invalid, s.cancelled],
            backgroundColor: STATUS_COLORS.map((c) => c + "cc"),
            borderColor:     STATUS_COLORS,
            borderWidth:     2,
        }],
    };

    // Top violations horizontal bar
    const topViolData = {
        labels:   (s.topViolations ?? []).map((v) => v.violation),
        datasets: [{
            label:           "Count",
            data:            (s.topViolations ?? []).map((v) => v.count),
            backgroundColor: COLORS.violet + "cc",
            borderColor:     COLORS.violet,
            borderWidth:     1.5,
            borderRadius:    4,
        }],
    };

    // DA type donut
    const daChart = {
        labels:   (s.daTypes ?? []).map((d) => d.label),
        datasets: [{
            data:            (s.daTypes ?? []).map((d) => d.count),
            backgroundColor: DA_COLORS.map((c) => c + "cc"),
            borderColor:     DA_COLORS,
            borderWidth:     2,
        }],
    };

    // Violation type donut
    const violTypeChart = {
        labels:   (s.violationType ?? []).map((v) => v.label),
        datasets: [{
            data:            (s.violationType ?? []).map((v) => v.count),
            backgroundColor: VIOLATION_TYPE_COLORS.map((c) => c + "cc"),
            borderColor:     VIOLATION_TYPE_COLORS,
            borderWidth:     2,
        }],
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* Page heading */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                    <BarChart3 className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">{SCOPE_LABEL[s.scope] ?? "Incident Report system overview"}</p>
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                <KpiCard icon={FileWarning}   label="Total IRs"    value={s.total}      color="text-primary" />
                <KpiCard icon={Clock}         label="Pending"      value={s.pending}    color="text-amber-500" />
                <KpiCard icon={Activity}      label="In Progress"  value={s.inProgress} color="text-blue-500" />
                <KpiCard icon={CheckCircle2}  label="Acknowledged" value={s.acknowledged} sub="fully closed" color="text-green-500" />
                <KpiCard icon={XCircle}       label="Closed"       value={closed}       sub="invalid + cancelled + ack." color="text-muted-foreground" />
            </div>

            {/* Row 1: Monthly trend (wide) + Status donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Monthly IRs filed */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-semibold">IRs Filed — Last 12 Months</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div style={{ height: 240 }}>
                            <Bar data={monthlyChart} options={barOpts("Monthly")} />
                        </div>
                    </CardContent>
                </Card>

                {/* IR Status breakdown */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ height: 240 }}>
                            <Doughnut data={statusChart} options={doughnutOpts("Status")} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Top violations (wide) + DA Types + Violation type */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top violation codes */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Top 10 Violation Codes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ height: 300 }}>
                            <Bar
                                data={topViolData}
                                options={{
                                    ...barOpts("Violations", true),
                                    plugins: {
                                        ...barOpts("Violations", true).plugins,
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => ` ${ctx.raw} case${ctx.raw !== 1 ? "s" : ""}`,
                                                title: (items) => {
                                                    const idx = items[0].dataIndex;
                                                    return s.topViolations?.[idx]?.code ?? items[0].label;
                                                },
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Right column: DA types + Violation type stacked */}
                <div className="flex flex-col gap-4">
                    <Card className="flex-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">DA Sanction Types</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div style={{ height: 175 }}>
                                <Doughnut data={daChart} options={doughnutOpts("DA Types")} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Violation Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div style={{ height: 175 }}>
                                <Doughnut data={violTypeChart} options={doughnutOpts("Type")} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
