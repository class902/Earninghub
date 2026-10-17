import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { OfferStats } from '../OfferReportPage';


interface Props { stat: OfferStats }

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b', Approved: '#3b82f6', Paid: '#10b981', Missing: '#f43f5e',
};

export default function CampaignDeepDive({ stat }: Props) {
  const { offer } = stat;

  return (
    <div className="space-y-5">
      {/* Campaign Header */}
      <CampaignHeader stat={stat} />
      {/* Hero Stats */}
      <HeroStats stat={stat} />
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StatusDonut stat={stat} />
        <DailyTrend stat={stat} />
      </div>
      {/* Revenue + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueBreakdown stat={stat} />
        <ConversionFunnel stat={stat} />
      </div>
      {/* Quality + Top Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LeadQuality stat={stat} />
        <TopUpiUsers stat={stat} />
      </div>
      {/* Campaign Meta */}
      <CampaignMeta stat={stat} />
    </div>
  );
}

function CampaignHeader({ stat }: Props) {
  const { offer } = stat;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        {offer.logoUrl ? <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover rounded-2xl" />
          : <span className="text-lg font-black text-primary">{offer.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-syne font-black text-xl text-foreground">{offer.name}</h2>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">{offer.category}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${offer.status?.toLowerCase() === 'active' ? 'text-green-400 bg-green-500/10 border-green-500/25' : 'text-muted-foreground bg-muted/10 border-border'}`}>
            {offer.status}
          </span>
          <span className="font-syne font-black text-emerald-400">{(offer as any).payoutDisplay || `₹${offer.payout}`}</span>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-center gap-1">
        <ScoreRing score={stat.performanceScore} />
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f43f5e';
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-14 h-14">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
        <circle cx="25" cy="25" r="22" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-syne font-black text-sm text-foreground">{score}</span>
    </div>
  );
}

function HeroStats({ stat }: Props) {
  const items = [
    { icon: '👥', label: 'Total Leads', value: stat.totalLeads.toString(), color: 'text-foreground' },
    { icon: '📈', label: 'Conversion', value: `${stat.conversionRate.toFixed(1)}%`, color: stat.conversionRate >= 50 ? 'text-emerald-400' : 'text-amber-400' },
    { icon: '💰', label: 'Revenue', value: `₹${stat.totalRevenue.toLocaleString('en-IN')}`, color: 'text-emerald-400' },
    { icon: '✂️', label: 'Admin Profit', value: `₹${stat.adminCut.toLocaleString('en-IN')}`, color: 'text-violet-400' },
    { icon: '💵', label: 'Avg Payout', value: stat.totalLeads > 0 ? `₹${Math.round(stat.totalRevenue / stat.totalLeads)}` : '₹0', color: 'text-primary' },
    { icon: '❓', label: 'Missing', value: stat.missingLeads.toString(), color: stat.missingLeads > 0 ? 'text-rose-400' : 'text-muted-foreground/40' },
  ];

  if (stat.totalLeads === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">📭</div>
        <p className="font-syne font-black text-lg text-foreground mb-2">No Leads Yet</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">This campaign hasn't received any leads. Share the offer link to start collecting data. The report will populate automatically as leads come in.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(s => (
        <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
          <p className={`font-syne font-black text-xl ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusDonut({ stat }: Props) {
  const data = [
    { name: 'Pending', value: stat.pendingLeads, color: STATUS_COLORS.Pending },
    { name: 'Approved', value: stat.approvedLeads, color: STATUS_COLORS.Approved },
    { name: 'Paid', value: stat.paidLeads, color: STATUS_COLORS.Paid },
    { name: 'Missing', value: stat.missingLeads, color: STATUS_COLORS.Missing },
    { name: 'Missing', value: stat.missingLeads + stat.rejectedLeads, color: STATUS_COLORS.Missing },
  ].filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">📊 Lead Status Distribution</p>
      <div className="flex items-center gap-6">
        <div className="w-44 h-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs font-bold text-muted-foreground">{d.name}</span>
              </div>
              <span className="text-xs font-black text-foreground">{d.value} <span className="text-muted-foreground/60 font-normal">({((d.value / stat.totalLeads) * 100).toFixed(0)}%)</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyTrend({ stat }: Props) {
  const data = useMemo(() =>
    Object.entries(stat.leadsByDay).map(([date, count]) => ({
      date: date.slice(5), count,
    })), [stat.leadsByDay]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">📈 Daily Leads (Last 30 Days)</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} width={30} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="count" name="Leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RevenueBreakdown({ stat }: Props) {
  const total = stat.totalRevenue || 1;
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">💰 Revenue Breakdown</p>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <p className="font-syne font-black text-2xl text-emerald-400">₹{stat.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <span className="text-3xl">💰</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">✂️ Admin Cut</p>
            <p className="font-syne font-black text-lg text-violet-400">₹{stat.adminCut.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-muted-foreground">{((stat.adminCut / total) * 100).toFixed(0)}% of revenue</p>
          </div>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">💸 User Paid</p>
            <p className="font-syne font-black text-lg text-primary">₹{stat.userPaid.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-muted-foreground">{((stat.userPaid / total) * 100).toFixed(0)}% of revenue</p>
          </div>
        </div>
        {/* Revenue bar */}
        <div className="h-3 rounded-full overflow-hidden bg-border/30 flex">
          <div className="h-full bg-violet-500 transition-all" style={{ width: `${(stat.adminCut / total) * 100}%` }} />
          <div className="h-full bg-primary transition-all" style={{ width: `${(stat.userPaid / total) * 100}%` }} />
        </div>
        <div className="flex items-center gap-4 justify-center text-[10px] font-bold">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Admin</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> User</span>
        </div>
      </div>
    </div>
  );
}

function ConversionFunnel({ stat }: Props) {
  const stages = [
    { label: 'Total Leads', value: stat.totalLeads, color: 'bg-primary' },
    { label: 'Approved', value: stat.approvedLeads + stat.paidLeads, color: 'bg-blue-500' },
    { label: 'Paid', value: stat.paidLeads, color: 'bg-emerald-500' },
  ];
  const maxVal = stat.totalLeads || 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">🔻 Conversion Funnel</p>
      <div className="space-y-3">
        {stages.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground">{s.label}</span>
              <span className="text-xs font-black text-foreground">{s.value} <span className="text-muted-foreground/60 font-normal">({((s.value / maxVal) * 100).toFixed(0)}%)</span></span>
            </div>
            <div className="h-8 rounded-xl overflow-hidden bg-border/20 relative">
              <div className={`h-full ${s.color} rounded-xl transition-all duration-700 flex items-center justify-center`}
                style={{ width: `${Math.max((s.value / maxVal) * 100, 3)}%` }}>
                {s.value > 0 && <span className="text-[10px] font-black text-white">{s.value}</span>}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex justify-center my-1">
                <span className="text-muted-foreground/30 text-xs">▼</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl text-center">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Drop-Off Rate</p>
        <p className="font-syne font-black text-lg text-foreground">
          {stat.totalLeads > 0 ? `${(100 - (stat.paidLeads / stat.totalLeads) * 100).toFixed(1)}%` : '—'}
        </p>
      </div>
    </div>
  );
}

function LeadQuality({ stat }: Props) {
  const qualityLeads = stat.totalLeads - stat.missingLeads;
  const qualityPct = stat.totalLeads > 0 ? (qualityLeads / stat.totalLeads) * 100 : 0;
  const color = qualityPct >= 80 ? 'text-emerald-400' : qualityPct >= 60 ? 'text-amber-400' : 'text-rose-400';
  const barColor = qualityPct >= 80 ? 'bg-emerald-500' : qualityPct >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">🛡️ Lead Quality Score</p>
      <div className="text-center mb-4">
        <p className={`font-syne font-black text-4xl ${color}`}>{qualityPct.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground mt-1">Non-missing leads</p>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-border/30 mb-4">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${qualityPct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-background rounded-xl">
          <p className="text-emerald-400 font-black text-sm">{qualityLeads}</p>
          <p className="text-[9px] text-muted-foreground font-bold">Good</p>
        </div>
        <div className="p-2 bg-background rounded-xl">
          <p className="text-rose-400 font-black text-sm">{stat.missingLeads}</p>
          <p className="text-[9px] text-muted-foreground font-bold">Missing</p>
        </div>
        <div className="p-2 bg-background rounded-xl">
          <p className="text-red-400 font-black text-sm">{stat.missingLeads + stat.rejectedLeads}</p>
          <p className="text-[9px] text-muted-foreground font-bold">Missing</p>
        </div>
      </div>
    </div>
  );
}

function TopUpiUsers({ stat }: Props) {
  const upiCounts = useMemo(() => {
    const map: Record<string, number> = {};
    stat.leads.forEach(l => {
      try {
        const data = JSON.parse(l.leadData || '{}');
        const upi = data['UPI ID'] || '';
        if (upi) map[upi] = (map[upi] || 0) + 1;
      } catch {}
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [stat.leads]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">👤 Top UPI Submitters</p>
      {upiCounts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No UPI data available</p>
      ) : (
        <div className="space-y-2">
          {upiCounts.map(([upi, count], i) => (
            <div key={upi} className="flex items-center justify-between px-3 py-2 bg-background rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-black text-muted-foreground w-4 flex-shrink-0">#{i + 1}</span>
                <span className="text-xs font-mono text-foreground truncate">{upi}</span>
              </div>
              <span className={`text-xs font-black flex-shrink-0 ${count > 1 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                {count}x {count > 2 && '⚠️'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignMeta({ stat }: Props) {
  const { offer } = stat;
  const hasSlots = (offer.totalSlots || 0) > 0;
  const remaining = hasSlots ? Math.max(0, offer.totalSlots - (offer.filledSlots || 0)) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="font-syne font-black text-sm text-foreground mb-4">📋 Campaign Metadata</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Payout', value: `₹${offer.payout}` },
          { label: 'Category', value: offer.category },
          { label: 'Lead Form', value: offer.leadConfigEnabled !== false ? '✅ Enabled' : '❌ Off' },
          { label: 'Private', value: offer.isPrivate ? '🔒 Yes' : '🌐 No' },
          { label: 'Referral', value: offer.referralEnabled ? '🔗 Yes' : '❌ No' },
          { label: 'Slots', value: hasSlots ? `${remaining}/${offer.totalSlots} left` : 'Unlimited' },
          { label: 'Expires', value: offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString() : 'Never' },
          { label: 'Rank', value: offer.rank > 0 ? `#${offer.rank}` : '—' },
        ].map(m => (
          <div key={m.label} className="p-3 bg-background rounded-xl">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-xs font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
