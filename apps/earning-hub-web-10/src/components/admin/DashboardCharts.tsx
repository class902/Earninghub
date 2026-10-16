import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import type { Lead } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f0b429', 'Under Review': '#3b82f6', Approved: '#22c55e',
  Missing: '#ef4444', Paid: '#10b981', 'Cashback Sent': '#14b8a6',
  'On Hold': '#f97316', Duplicate: '#a855f7',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TooltipStyle: any = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 10,
    fontSize: 12,
    color: 'hsl(var(--foreground))',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  itemStyle: { color: 'hsl(var(--muted-foreground))' },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 700 },
};

function getLast14Days(leads: Lead[]) {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: i % 2 === 0 ? key : '',
      fullDate: key,
      leads: leads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === d.toDateString()).length,
      paid: leads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === d.toDateString() && ['Paid', 'Cashback Sent'].includes(l.status)).length,
    };
  });
}

function getStatusBreakdown(leads: Lead[]) {
  const counts: Record<string, number> = {};
  leads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function getTopOffers(leads: Lead[]) {
  const counts: Record<string, { count: number; paid: number }> = {};
  leads.forEach(l => {
    const k = l.offerName?.slice(0, 16) || 'Unknown';
    if (!counts[k]) counts[k] = { count: 0, paid: 0 };
    counts[k].count++;
    if (['Paid', 'Cashback Sent'].includes(l.status)) counts[k].paid++;
  });
  return Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 6)
    .map(([name, { count, paid }]) => ({ name, count, paid }));
}

interface Props { leads: Lead[] }

export default function DashboardCharts({ leads }: Props) {
  const lineData = getLast14Days(leads);
  const statusData = getStatusBreakdown(leads);
  const offerData = getTopOffers(leads);
  const totalToday = lineData[13]?.leads ?? 0;
  const totalYesterday = lineData[12]?.leads ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Lead trend — spans 2 cols */}
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-syne font-black text-foreground text-sm">📈 Lead Trend — Last 14 Days</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Daily submission volume · blue = total · green = paid</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">{leads.length} total</span>
            {totalToday > 0 && <div className="text-[10px] text-green-400 font-bold mt-1">+{totalToday} today{totalYesterday > 0 ? ` · ${totalYesterday} yesterday` : ''}</div>}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={lineData}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <Tooltip {...TooltipStyle} />
            <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="url(#blueGrad)" strokeWidth={2} name="Total Leads" dot={false} />
            <Area type="monotone" dataKey="paid" stroke="#10b981" fill="url(#greenGrad)" strokeWidth={2} name="Paid" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Status donut */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-syne font-black text-foreground text-sm mb-1">🍩 Status Breakdown</h3>
        <p className="text-xs text-muted-foreground mb-4">Lead distribution by current status</p>
        {statusData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <span className="text-3xl">📭</span>
            <span className="text-sm">No data yet</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip {...TooltipStyle} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top offers */}
      <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-syne font-black text-foreground text-sm">🏆 Top Offers by Leads</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Most submitted campaigns — blue = total · green = paid</p>
          </div>
        </div>
        {offerData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
            <span className="text-2xl">🎯</span>
            <span className="text-sm">No submissions yet</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(offerData.length * 36, 120)}>
            <BarChart data={offerData} layout="vertical" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip {...TooltipStyle} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Total Leads" maxBarSize={18} />
              <Bar dataKey="paid" fill="#10b981" radius={[0, 6, 6, 0]} name="Paid" maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
