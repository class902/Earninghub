import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { OfferStats } from '../OfferReportPage';

const COLORS = ['hsl(213,94%,52%)', '#f59e0b', '#10b981'];

interface Props { stats: OfferStats[] }

export default function CampaignCompare({ stats }: Props) {
  const metricsData = [
    { metric: 'Leads', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.totalLeads])) },
    { metric: 'Paid', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.paidLeads])) },
    { metric: 'Missing', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.missingLeads])) },
  ];

  const revenueData = [
    { metric: 'Revenue', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.totalRevenue])) },
    { metric: 'Admin Cut', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.adminCut])) },
    { metric: 'User Paid', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.userPaid])) },
  ];

  const rateData = [
    { metric: 'Conv %', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, Math.round(s.conversionRate)])) },
    { metric: 'Miss %', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, Math.round(s.missingRate)])) },
    { metric: 'Score', ...Object.fromEntries(stats.map((s, i) => [`c${i}`, s.performanceScore])) },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-syne font-black text-lg text-foreground mb-1">⚔️ Campaign Comparison</h2>
        <p className="text-xs text-muted-foreground">Side-by-side analysis of {stats.length} campaigns</p>
      </div>

      {/* Campaign Names Legend */}
      <div className="flex flex-wrap gap-3">
        {stats.map((s, i) => (
          <div key={s.offer.id} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
            <span className="text-xs font-black text-foreground">{s.offer.name}</span>
            <span className="text-[10px] text-muted-foreground">Score: {s.performanceScore}</span>
          </div>
        ))}
      </div>

      {/* Leads Comparison */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-syne font-black text-sm text-foreground mb-4">👥 Lead Metrics</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricsData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} width={35} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              {stats.map((s, i) => (
                <Bar key={s.offer.id} dataKey={`c${i}`} name={s.offer.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Comparison */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-syne font-black text-sm text-foreground mb-4">💰 Revenue Comparison (₹)</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={45} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              {stats.map((s, i) => (
                <Bar key={s.offer.id} dataKey={`c${i}`} name={s.offer.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rates Comparison */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-syne font-black text-sm text-foreground mb-4">📊 Performance Rates</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rateData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} width={35} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              {stats.map((s, i) => (
                <Bar key={s.offer.id} dataKey={`c${i}`} name={s.offer.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="font-syne font-black text-sm text-foreground">📋 Quick Comparison Table</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">Metric</th>
                {stats.map((s, i) => (
                  <th key={s.offer.id} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider" style={{ color: COLORS[i] }}>
                    {s.offer.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Total Leads', key: 'totalLeads' },
                { label: 'Paid', key: 'paidLeads' },
                { label: 'Missing', key: 'missingLeads' },
                { label: 'Conversion %', key: 'conversionRate', fmt: (v: number) => `${v.toFixed(1)}%` },
                { label: 'Revenue (₹)', key: 'totalRevenue', fmt: (v: number) => `₹${v.toLocaleString('en-IN')}` },
                { label: 'Admin Cut (₹)', key: 'adminCut', fmt: (v: number) => `₹${v.toLocaleString('en-IN')}` },
                { label: 'Score', key: 'performanceScore' },
              ].map(row => (
                <tr key={row.label} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 text-xs font-bold text-muted-foreground">{row.label}</td>
                  {stats.map(s => {
                    const val = (s as any)[row.key];
                    return (
                      <td key={s.offer.id} className="px-4 py-2.5 text-xs font-black text-foreground">
                        {row.fmt ? row.fmt(val) : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
