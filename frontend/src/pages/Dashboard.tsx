import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardApi } from "../api/endpoints";
import { PageHeader, StatCard, Card, Badge, LoadingRow } from "../components/ui";
import { formatMoney, formatDate, formatQty, formatDateTime } from "../utils/format";

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: dashboardApi.summary });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Today's snapshot of your meat shop" />
        <LoadingRow />
      </>
    );
  }

  const trendData = data.revenueTrend.map((t) => ({
    ...t,
    label: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Today's snapshot of your meat shop" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Revenue" value={formatMoney(data.todayRevenue)} hint={`${data.todayOrders} orders today`} />
        <StatCard label="This Month's Revenue" value={formatMoney(data.monthRevenue)} hint={`${data.monthOrders} orders`} />
        <StatCard
          label="This Month's Profit"
          value={formatMoney(data.monthProfit)}
          hint={`Expenses: ${formatMoney(data.monthExpenseTotal)}`}
          tone={data.monthProfit >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Low Stock Alerts"
          value={String(data.lowStockCount)}
          hint={`of ${data.totalProducts} active products`}
          tone={data.lowStockCount > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Revenue Trend (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d9503d" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d9503d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#d9503d" strokeWidth={2} fill="url(#revenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Low Stock Products</h3>
          {data.lowStockProducts.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">All stock levels healthy 🎉</div>
          ) : (
            <ul className="space-y-2.5">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{p.name}</span>
                  <Badge tone={p.stockQty <= 0 ? "danger" : "warning"}>{formatQty(p.stockQty, p.unit)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent Sales</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentSales.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 font-medium text-slate-700">{s.reference}</td>
                    <td className="py-2 text-slate-500">{s.customer?.name || "Walk-in"}</td>
                    <td className="py-2 text-slate-500">{formatDateTime(s.saleDate)}</td>
                    <td className="py-2 text-right font-medium text-slate-700">{formatMoney(s.total)}</td>
                  </tr>
                ))}
                {data.recentSales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No sales yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Top Products (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.topProducts} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="revenue" fill="#d9503d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
