import { useEffect, useState, useMemo } from 'react';
import { adminGetLeads, adminGetOffers, adminGetAffiliateMetrics, AdminGetAffiliateMetricsOutputType } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import { Calendar, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, DollarSign, X, Filter } from 'lucide-react';
import type { Lead } from '@/types';

interface Props { password: string }

const CHART_STYLE = {
  contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, color: 'hsl(var(--foreground))' },
};
const STATUS_COLORS: Record<string, string> = {
  Pending: '#f0b429', 'Under Review': '#3b82f6', 'In Review': '#3b82f6',
  Approved: '#22c55e', Missing: '#ef4444', Paid: '#10b981',
  'Cashback Sent': '#14b8a6', 'On Hold': '#f97316', Hold: '#f97316',
  Duplicate: '#a855f7',
};
const DEVICE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

type AffMetrics = AdminGetAffiliateMetricsOutputType;
type AnalyticsFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

function extractTelemetry(leadData: string) {
  try {
    const d = JSON.parse(leadData);
    if (d._telemetry) return typeof d._telemetry === 'string' ? JSON.parse(d._telemetry) : d._telemetry;
  } catch {}
  return null;
}

function parseActionConfig(ac: string) {
  try {
    const p = JSON.parse(ac || '{}');
    return {
      earningPayout: Number(p.myEarning) || 0,
      userPayout: Number(p.userPayout) || 0,
      sendUserAmount: Number(p.sendUserAmount) || 0,
      adminRecoveredAmount: Number(p.adminRecoveredAmount) || 0,
      userMissingIncentive: Number(p.userMissingIncentive) || 0,
    };
  } catch { return { earningPayout: 0, userPayout: 0, sendUserAmount: 0, adminRecoveredAmount: 0, userMissingIncentive: 0 }; }
}

function fmt(n: number) { return n.toLocaleString('en-IN'); }
function pct(part: number, total: number) { return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0'; }

function getDateRangeLabel(filter: AnalyticsFilter, start: string, end: string): string {
  if (filter === 'all') return 'All Time';
  if (filter === 'today') return `Today — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  if (filter === '7d') { const s = new Date(); s.setDate(s.getDate() - 6); return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — Today`; }
  if (filter === '30d') { const s = new Date(); s.setDate(s.getDate() - 29); return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — Today`; }
  if (filter === 'custom' && start && end) {
    return `${new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — ${new Date(end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return 'All Leads';
}

function SectionHeader({ icon, title, subtitle, badge }: { icon: string; title: string; subtitle: string; badge?: string }) {
  return (
    <div className="px-5 py-4 border-b border-border flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-syne font-black text-foreground text-sm">{title}</h3>
          {badge && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function FinanceCard({
  icon, label, subtitle, amount, pctValue, pctColor, color, gradient, border, badge, math,
}: {
  icon: string; label: string; subtitle: string;
  amount: number; pctValue: string; pctColor: string;
  color: string; gradient: string; border: string;
  badge?: string; math?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 relative overflow-hidden ${border}`} style={{ background: gradient }}>
      <div className="absolute top-3 right-3 text-2xl opacity-15">{icon}</div>
      {badge && (
        <span className={`inline-flex text-[9px] font-black px-2 py-0.5 rounded-full border mb-2 ${pctColor.replace('text-', 'bg-').replace('400', '500/10')} border-current/20 ${pctColor}`}>
          {badge}
        </span>
      )}
      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${pctColor}`}>{label}</p>
      <p className="text-[10px] text-muted-foreground mb-3 leading-tight">{subtitle}</p>
      <p className={`font-syne font-black text-2xl leading-none ${color}`}>
        {amount > 0 ? `₹${fmt(amount)}` : <span className="text-muted-foreground/40 text-base font-normal">—</span>}
      </p>
      <ProgressBar value={Number(pctValue)} color={pctColor.includes('violet') ? '#8b5cf6' : pctColor.includes('emerald') ? '#10b981' : pctColor.includes('rose') ? '#f43f5e' : pctColor.includes('amber') ? '#f59e0b' : pctColor.includes('sky') ? '#38bdf8' : '#3b82f6'} />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">of total revenue</span>
        <span className={`text-sm font-black ${pctColor}`}>{pctValue}%</span>
      </div>
      {math && (
        <div className="mt-3 p-2 rounded-lg bg-background/40 border border-border/40">
          <p className="text-[9px] text-muted-foreground/80 leading-relaxed font-mono">{math}</p>
        </div>
      )}
    </div>
  );
}

// ── Section 2: Status Card — now clickable ────────────────────────────────────
function StatusVolumeCard({ icon, label, count, pctVal, bg, color, isActive, onClick, hint }: {
  icon: string; label: string; count: number; pctVal: string; bg: string; color: string;
  isActive?: boolean; onClick?: () => void; hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={hint || `Click to drill into ${label} leads`}
      className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md group relative ${bg} ${onClick ? 'cursor-pointer' : 'cursor-default'} ${isActive ? 'ring-2 ring-primary/60 shadow-md shadow-primary/10' : ''}`}>
      {onClick && (
        <span className={`absolute top-2 right-2 text-[8px] font-black transition-all ${isActive ? 'text-primary opacity-100' : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'}`}>
          {isActive ? '✕ clear' : '↗ drill'}
        </span>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-[10px] font-black ${color} opacity-70`}>{pctVal}%</span>
      </div>
      <p className={`font-syne font-black text-3xl leading-none ${color}`}>{count}</p>
      <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">{label}</p>
    </button>
  );
}

function extractUPIFromLead(leadData: string): string {
  try {
    const d = JSON.parse(leadData);
    const entry = Object.entries(d).find(([k]) => k.toLowerCase().includes('upi'));
    return entry ? String(entry[1]) : '—';
  } catch { return '—'; }
}
function extractNameFromLead(leadData: string): string {
  try {
    const d = JSON.parse(leadData);
    const entry = Object.entries(d).find(([k]) => k.toLowerCase().includes('name'));
    return entry ? String(entry[1]) : '';
  } catch { return ''; }
}

export default function AnalyticsPage({ password }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [offerCount, setOfferCount] = useState(0);
  const [affiliateMetrics, setAffiliateMetrics] = useState<AffMetrics | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(true);
  const [analyticsFilter, setAnalyticsFilter] = useState<AnalyticsFilter>('all');
  const [analyticsStart, setAnalyticsStart] = useState('');
  const [analyticsEnd, setAnalyticsEnd] = useState('');
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [affiliateOpen, setAffiliateOpen] = useState(true);
  const [lossOpen, setLossOpen] = useState(true);
  // ── Drill states ────────────────────────────────────────────────────────────
  const [statusDrill, setStatusDrill] = useState<string | null>(null);
  const [offerDrill, setOfferDrill] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminGetLeads({ password }), adminGetOffers({ password })])
      .then(([l, o]) => { setLeads(l.leads); setOfferCount(o.offers.length); })
      .finally(() => setLoading(false));
    adminGetAffiliateMetrics({ password }).then(m => setAffiliateMetrics(m)).catch(() => {}).finally(() => setLoadingAffiliate(false));
  }, [password]);

  // ── Filtered leads (by date range) ─────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    if (analyticsFilter === 'all') return leads;
    const now = Date.now();
    if (analyticsFilter === 'today') {
      const todayStr = new Date().toDateString();
      return leads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === todayStr);
    }
    if (analyticsFilter === '7d') {
      const limit = 7 * 24 * 60 * 60 * 1000;
      return leads.filter(l => l.createdAt && (now - new Date(l.createdAt).getTime()) <= limit);
    }
    if (analyticsFilter === '30d') {
      const limit = 30 * 24 * 60 * 60 * 1000;
      return leads.filter(l => l.createdAt && (now - new Date(l.createdAt).getTime()) <= limit);
    }
    if (analyticsFilter === 'custom' && analyticsStart && analyticsEnd) {
      const sTs = new Date(analyticsStart).getTime();
      const eD = new Date(analyticsEnd); eD.setHours(23, 59, 59, 999);
      return leads.filter(l => {
        const ts = l.createdAt ? new Date(l.createdAt).getTime() : 0;
        return ts >= sTs && ts <= eD.getTime();
      });
    }
    return leads;
  }, [leads, analyticsFilter, analyticsStart, analyticsEnd]);

  // ── Drilled leads (extra layer on top of filteredLeads) ────────────────────
  const drilledLeads = useMemo(() => {
    let base = filteredLeads;
    if (offerDrill) base = base.filter(l => l.offerName === offerDrill);
    if (statusDrill) {
      if (statusDrill === '__all__') { /* no filter — show all leads */ }
      else if (statusDrill === '__paid__') base = base.filter(l => l.status === 'Paid' || l.status === 'Cashback Sent');
      else if (statusDrill === '__review__') base = base.filter(l => l.status === 'Under Review' || l.status === 'In Review');
      else if (statusDrill === '__hold__') base = base.filter(l => l.status === 'On Hold' || l.status === 'Hold' || l.status === 'Duplicate');
      else base = base.filter(l => l.status === statusDrill);
    }
    return base;
  }, [filteredLeads, statusDrill, offerDrill]);

  const activeLeads = (statusDrill || offerDrill) ? drilledLeads : filteredLeads;

  // ── Section 1: Base Financial Metrics ─────────────────────────────────────
  const financial = useMemo(() => {
    let totalRevenue = 0, adminCutTotal = 0, sentToUserTotal = 0;
    activeLeads.forEach(l => {
      const offerRev = l.offerPayout || 0;
      totalRevenue += offerRev;
      const { earningPayout, sendUserAmount } = parseActionConfig(l.actionConfig);
      adminCutTotal += earningPayout;
      sentToUserTotal += sendUserAmount;
    });
    return {
      totalRevenue, adminCutTotal, sentToUserTotal,
      adminPct: pct(adminCutTotal, totalRevenue),
      sentPct: pct(sentToUserTotal, totalRevenue),
    };
  }, [activeLeads]);

  // ── Section 1: 3-Section Missing Loss Analysis ─────────────────────────────
  const missingLoss = useMemo(() => {
    const missingLeads = activeLeads.filter(l => l.status.toLowerCase() === 'missing');
    let totalRevenueLoss = 0;
    let expectedAdminCut = 0;
    let totalAdminCutReceived = 0;
    let totalUserEstimate = 0;
    let totalUserGotMissing = 0;
    missingLeads.forEach(l => {
      const payout = (l.offerPayout || 0);
      const { earningPayout, userPayout, sendUserAmount } = parseActionConfig(l.actionConfig);
      totalRevenueLoss += payout;
      expectedAdminCut += Math.max(0, payout - (userPayout || 0));
      totalAdminCutReceived += (earningPayout || 0);
      totalUserEstimate += (userPayout || 0);
      totalUserGotMissing += (sendUserAmount || 0);
    });
    const adminNetLoss = Math.max(0, expectedAdminCut - totalAdminCutReceived);
    const userNetLoss = Math.max(0, totalUserEstimate - totalUserGotMissing);
    return {
      totalRevenueLoss, expectedAdminCut, totalAdminCutReceived, adminNetLoss,
      totalUserEstimate, totalUserGotMissing, userNetLoss,
      missingCount: missingLeads.length,
      totalRevenueLossPct: pct(totalRevenueLoss, financial.totalRevenue || 1),
      adminNetLossPct: pct(adminNetLoss, financial.totalRevenue || 1),
      userNetLossPct: pct(userNetLoss, financial.totalRevenue || 1),
    };
  }, [activeLeads, financial.totalRevenue]);

  // ── Section 2: Status breakdown ────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }, [filteredLeads]);

  function getStatusCount(key: string): number {
    if (key === '__all__') return filteredLeads.length;
    if (key === '__paid__') return (statusBreakdown['Paid'] || 0) + (statusBreakdown['Cashback Sent'] || 0);
    if (key === '__review__') return (statusBreakdown['Under Review'] || 0) + (statusBreakdown['In Review'] || 0);
    if (key === '__hold__') return (statusBreakdown['On Hold'] || 0) + (statusBreakdown['Hold'] || 0) + (statusBreakdown['Duplicate'] || 0);
    return statusBreakdown[key] || 0;
  }

  const STATUS_VOLUME_ITEMS = [
    { label: 'All Leads', key: '__all__', icon: '📦', color: 'text-foreground', hex: '#64748b', bg: 'bg-card border-border', hint: 'Total leads submitted in this period' },
    { label: 'Approved', key: 'Approved', icon: '✅', color: 'text-green-400', hex: '#22c55e', bg: 'bg-green-500/5 border-green-500/25', hint: 'Click to drill into Approved leads' },
    { label: 'Paid / Sent', key: '__paid__', icon: '💰', color: 'text-emerald-400', hex: '#10b981', bg: 'bg-emerald-500/5 border-emerald-500/25', hint: 'Paid + Cashback Sent leads' },
    { label: 'Pending', key: 'Pending', icon: '⏳', color: 'text-amber-400', hex: '#f0b429', bg: 'bg-amber-500/5 border-amber-500/25', hint: 'Awaiting review' },
    { label: 'Under Review', key: '__review__', icon: '🔍', color: 'text-cyan-400', hex: '#22d3ee', bg: 'bg-cyan-500/5 border-cyan-500/25', hint: 'Under Review + In Review combined' },
    { label: 'Missing', key: 'Missing', icon: '🔴', color: 'text-red-400', hex: '#ef4444', bg: 'bg-red-500/5 border-red-500/25', hint: 'Missing / rejected leads' },
    { label: 'On Hold', key: '__hold__', icon: '⚠️', color: 'text-orange-400', hex: '#f97316', bg: 'bg-orange-500/5 border-orange-500/25', hint: 'On Hold + Duplicate combined' },
  ];

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const buildDays = (n: number, start?: Date) =>
      Array.from({ length: n }, (_, i) => {
        const d = start ? new Date(start) : new Date();
        if (start) d.setDate(d.getDate() + i);
        else d.setDate(d.getDate() - (n - 1 - i));
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { date: key, leads: activeLeads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === d.toDateString()).length };
      });
    if (analyticsFilter === 'today') return buildDays(1);
    if (analyticsFilter === '7d') return buildDays(7);
    if (analyticsFilter === '30d') return buildDays(30);
    if (analyticsFilter === 'custom' && analyticsStart && analyticsEnd) {
      const start = new Date(analyticsStart);
      const days = Math.min(Math.ceil((new Date(analyticsEnd).getTime() - start.getTime()) / 86400000) + 1, 90);
      return buildDays(days, start);
    }
    if (analyticsFilter === 'all') return buildDays(60);
    return buildDays(30);
  }, [activeLeads, analyticsFilter, analyticsStart, analyticsEnd]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeLeads]);

  const offerLeadsData = useMemo(() => {
    const counts: Record<string, { leads: number; revenue: number }> = {};
    activeLeads.forEach(l => {
      const k = l.offerName?.slice(0, 18) || 'Unknown';
      if (!counts[k]) counts[k] = { leads: 0, revenue: 0 };
      counts[k].leads++;
      counts[k].revenue += l.offerPayout || 0;
    });
    return Object.entries(counts).sort((a, b) => b[1].leads - a[1].leads).slice(0, 6).map(([name, d]) => ({ name, ...d }));
  }, [activeLeads]);

  // Full offer data for table
  const offerTableData = useMemo(() => {
    const counts: Record<string, { leads: number; revenue: number; fullName: string }> = {};
    activeLeads.forEach(l => {
      const k = l.offerName || 'Unknown';
      if (!counts[k]) counts[k] = { leads: 0, revenue: 0, fullName: k };
      counts[k].leads++;
      counts[k].revenue += l.offerPayout || 0;
    });
    return Object.entries(counts).sort((a, b) => b[1].leads - a[1].leads).map(([name, d]) => ({ name, ...d }));
  }, [activeLeads]);

  // Telemetry
  const telemetryLeads = useMemo(() => leads.map(l => ({ lead: l, tel: extractTelemetry(l.leadData) })).filter(x => x.tel), [leads]);
  const deviceBreakdown = useMemo(() => { const c: Record<string, number> = {}; telemetryLeads.forEach(({ tel }) => { const d = tel.deviceType || 'Unknown'; c[d] = (c[d] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })); }, [telemetryLeads]);
  const osBreakdown = useMemo(() => { const c: Record<string, number> = {}; telemetryLeads.forEach(({ tel }) => { const d = tel.os || 'Unknown'; c[d] = (c[d] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value })); }, [telemetryLeads]);
  const networkBreakdown = useMemo(() => { const c: Record<string, number> = {}; telemetryLeads.forEach(({ tel }) => { const d = tel.networkType || 'Unknown'; c[d] = (c[d] || 0) + 1; }); return Object.entries(c).map(([name, value]) => ({ name, value })); }, [telemetryLeads]);
  const geoBreakdown = useMemo(() => { const c: Record<string, number> = {}; telemetryLeads.forEach(({ tel }) => { const d = [tel.city, tel.country].filter(Boolean).join(', ') || 'Unknown'; c[d] = (c[d] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8); }, [telemetryLeads]);
  const avgTimeSpent = useMemo(() => { const t = telemetryLeads.map(({ tel }) => tel.timeSpentSeconds).filter((t: number) => t > 0); return t.length ? Math.round(t.reduce((a: number, b: number) => a + b, 0) / t.length) : 0; }, [telemetryLeads]);
  const avgScrollDepth = useMemo(() => { const d = telemetryLeads.map(({ tel }) => tel.scrollDepth).filter((d: number) => d >= 0); return d.length ? Math.round(d.reduce((a: number, b: number) => a + b, 0) / d.length) : 0; }, [telemetryLeads]);

  const convRate = activeLeads.length > 0 ? Math.round((activeLeads.filter(l => l.status === 'Approved' || l.status === 'Paid').length / activeLeads.length) * 100) : 0;
  const avgPayout = activeLeads.length > 0 ? Math.round(activeLeads.reduce((s, l) => s + (l.offerPayout || 0), 0) / activeLeads.length) : 0;
  const todayLeads = leads.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === new Date().toDateString()).length;
  const cpv = affiliateMetrics?.global.totalCompletionClicks ? Math.round((financial.totalRevenue / Math.max(1, affiliateMetrics.global.totalCompletionClicks)) * 100) / 100 : 0;

  const totalLossSum = missingLoss.adminNetLoss + missingLoss.userNetLoss;
  const hasDrill = statusDrill || offerDrill;

  if (loading) return (
    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl h-28 animate-pulse" />)}</div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ══ DATE FILTER BAR ══════════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar size={14} className="text-primary" />
            <span className="font-syne font-black text-sm text-foreground">Analyse Period</span>
          </div>
          <div className="flex gap-2 flex-wrap flex-1">
            {([
              { id: 'all' as const, label: 'All', icon: '📊' },
              { id: 'today' as const, label: 'Today', icon: '⚡' },
              { id: '7d' as const, label: '7 Days', icon: '📅' },
              { id: '30d' as const, label: '30 Days', icon: '🗓️' },
              { id: 'custom' as const, label: 'Custom Range', icon: '📆' },
            ]).map(f => (
              <button key={f.id} onClick={() => setAnalyticsFilter(f.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border transition-all ${analyticsFilter === f.id ? 'bg-primary border-primary text-white shadow-md' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
                <span>{f.icon}</span>{f.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full flex-shrink-0">
            {getDateRangeLabel(analyticsFilter, analyticsStart, analyticsEnd)}
            {' '}·{' '}<span className="text-primary font-black">{filteredLeads.length} leads</span>
          </div>
        </div>
        {analyticsFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">From Date</label>
              <input type="date" value={analyticsStart} onChange={e => setAnalyticsStart(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">To Date</label>
              <input type="date" value={analyticsEnd} onChange={e => setAnalyticsEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>
        )}
      </div>

      {/* ══ ACTIVE DRILL BANNER ══════════════════════════════════════════════ */}
      {hasDrill && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/40 bg-primary/8 flex-wrap">
          <Filter size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs font-black text-primary">🔍 Analytics Drill-Down Active</span>
          <div className="flex items-center gap-2 flex-wrap">
            {offerDrill && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30">
                <span className="text-[10px] font-black text-primary">📦 {offerDrill}</span>
                <button onClick={() => setOfferDrill(null)} className="text-primary/60 hover:text-primary text-xs">✕</button>
              </div>
            )}
            {statusDrill && (() => {
              const item = STATUS_VOLUME_ITEMS.find(i => i.key === statusDrill);
              return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30">
                  <span className="text-[10px] font-black text-primary">{item?.icon} {item?.label || statusDrill}</span>
                  <button onClick={() => setStatusDrill(null)} className="text-primary/60 hover:text-primary text-xs">✕</button>
                </div>
              );
            })()}
          </div>
          <span className="text-[10px] text-muted-foreground">Showing <strong className="text-foreground">{drilledLeads.length}</strong> of {filteredLeads.length} leads</span>
          <button onClick={() => { setStatusDrill(null); setOfferDrill(null); }}
            className="ml-auto flex items-center gap-1 text-[10px] font-black text-destructive hover:underline flex-shrink-0">
            <X size={10} /> Clear All Drills
          </button>
        </div>
      )}

      {/* ══ SECTION 1: DEEP FINANCIAL DATA ══════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <SectionHeader
          icon="💹"
          title="Section 1 — Deep Financial Data"
          subtitle={`Revenue, splits & 3-section missing loss analysis · ${getDateRangeLabel(analyticsFilter, analyticsStart, analyticsEnd)}${hasDrill ? ' (drilled)' : ''}`}
          badge="🔒 Admin Only"
        />
        <div className="p-5 space-y-5">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign size={11} className="text-primary" /> Base Revenue Metrics
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:row-span-1 rounded-2xl border-2 border-primary/40 p-5 relative overflow-hidden cursor-pointer hover:border-primary/60 hover:-translate-y-0.5 transition-all group/fin"
                onClick={() => setStatusDrill(statusDrill === '__all__' ? null : '__all__')}
                style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.06) 100%)' }}>
                <div className="absolute top-3 right-3 text-2xl opacity-20">💰</div>
                <span className="absolute top-3 right-10 text-[9px] font-black text-muted-foreground/0 group-hover/fin:text-primary/60 transition-all">↗ drill</span>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Total Revenue (100%)</p>
                <p className="font-syne font-black text-4xl text-foreground leading-none">₹{fmt(financial.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-2">{activeLeads.length} leads · full offer payouts sum</p>
                <div className="mt-3 h-1.5 bg-border/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 transition-all group/fin"
                onClick={() => setStatusDrill(statusDrill === '__paid__' ? null : '__paid__')}>
                <FinanceCard
                  icon="✂️" label="✂️ Admin Cut" subtitle="Your earnings from all lead splits"
                  amount={financial.adminCutTotal} pctValue={financial.adminPct}
                  color="text-violet-400" pctColor="text-violet-400"
                  gradient="linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(109,40,217,0.04) 100%)"
                  border="border-violet-500/30"
                />
              </div>
              <div className="cursor-pointer hover:border-primary/40 hover:-translate-y-0.5 transition-all group/fin"
                onClick={() => setStatusDrill(statusDrill === '__paid__' ? null : '__paid__')}>
                <FinanceCard
                  icon="📤" label="📤 Sent to Users" subtitle="Actual cashback disbursed to users"
                  amount={financial.sentToUserTotal} pctValue={financial.sentPct}
                  color="text-emerald-400" pctColor="text-emerald-400"
                  gradient="linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)"
                  border="border-emerald-500/30"
                />
              </div>
            </div>
            {financial.totalRevenue > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-background/50">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">Revenue Allocation Breakdown</p>
                <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
                  {[
                    { pct: Number(financial.adminPct), color: '#8b5cf6', label: 'Admin Cut' },
                    { pct: Number(financial.sentPct), color: '#10b981', label: 'Sent to Users' },
                    { pct: Math.max(0, 100 - Number(financial.adminPct) - Number(financial.sentPct)), color: '#334155', label: 'Unallocated' },
                  ].map((seg, i) => seg.pct > 0 && (
                    <div key={i} className="h-full rounded-sm" style={{ width: `${Math.min(seg.pct, 100)}%`, backgroundColor: seg.color }} title={`${seg.label}: ${seg.pct}%`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { label: 'Admin Cut', color: '#8b5cf6', val: `₹${fmt(financial.adminCutTotal)} (${financial.adminPct}%)` },
                    { label: 'Sent to Users', color: '#10b981', val: `₹${fmt(financial.sentToUserTotal)} (${financial.sentPct}%)` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-muted-foreground">{item.label}: <strong style={{ color: item.color }}>{item.val}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 3-Section Missing Loss Analysis ── */}
          <div>
            <button onClick={() => setLossOpen(v => !v)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/5 transition-colors"
              style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.06) 0%, rgba(251,113,133,0.03) 100%)' }}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-syne font-black text-sm text-rose-400">
                    3-Section Missing Loss Analysis
                    {missingLoss.missingCount > 0 && (
                      <span className="ml-2 text-[10px] bg-rose-500/15 border border-rose-500/25 text-rose-400 px-2 py-0.5 rounded-full">
                        {missingLoss.missingCount} Missing Lead{missingLoss.missingCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Total Revenue Loss · Admin Net Loss · User Net Loss</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {totalLossSum > 0 && (
                  <span className="font-syne font-black text-rose-400 text-sm">₹{fmt(totalLossSum)} total at risk</span>
                )}
                {lossOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </div>
            </button>
            {lossOpen && (
              <div className="mt-3 space-y-3">
                {missingLoss.missingCount === 0 ? (
                  <div className="text-center p-8 border border-dashed border-border/50 rounded-xl">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="font-syne font-black text-foreground text-sm">No Missing Leads</p>
                    <p className="text-xs text-muted-foreground mt-1">Zero missing leads in this period — great work!</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-rose-500/35 p-5 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(225,29,72,0.05) 100%)' }}>
                        <div className="absolute top-3 right-3 text-2xl opacity-15">💸</div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xs font-black text-rose-400 flex-shrink-0">1</span>
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Total Revenue Loss</p>
                        </div>
                        <p className="font-syne font-black text-3xl text-rose-400">₹{fmt(missingLoss.totalRevenueLoss)}</p>
                        <ProgressBar value={Number(missingLoss.totalRevenueLossPct)} color="#f43f5e" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-muted-foreground">{missingLoss.missingCount} missing lead{missingLoss.missingCount !== 1 ? 's' : ''}</span>
                          <span className="font-black text-rose-400 text-sm">{missingLoss.totalRevenueLossPct}%</span>
                        </div>
                        <div className="mt-3 p-2 rounded-lg bg-background/40 border border-rose-500/20">
                          <p className="text-[9px] text-muted-foreground/80 font-mono leading-relaxed">= Sum(offerPayout) for all "Missing" leads</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-amber-500/35 p-5 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(234,88,12,0.05) 100%)' }}>
                        <div className="absolute top-3 right-3 text-2xl opacity-15">📉</div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-black text-amber-400 flex-shrink-0">2</span>
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Admin Net Loss</p>
                        </div>
                        <p className="font-syne font-black text-3xl text-amber-400">₹{fmt(missingLoss.adminNetLoss)}</p>
                        <ProgressBar value={Number(missingLoss.adminNetLossPct)} color="#f59e0b" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-muted-foreground">expected admin cut vs received</span>
                          <span className="font-black text-amber-400 text-sm">{missingLoss.adminNetLossPct}%</span>
                        </div>
                        <div className="mt-3 p-2 rounded-lg bg-background/40 border border-amber-500/20 space-y-1">
                          <p className="text-[9px] text-muted-foreground/60 font-mono">Step 1: Total Payout − User Estimate</p>
                          <p className="text-[9px] text-muted-foreground/80 font-mono">= ₹{fmt(missingLoss.totalRevenueLoss)} − ₹{fmt(missingLoss.totalUserEstimate)} = ₹{fmt(missingLoss.expectedAdminCut)}</p>
                          <p className="text-[9px] text-muted-foreground/60 font-mono mt-1">Step 2: Expected − Admin Cut Received</p>
                          <p className="text-[9px] text-amber-400 font-mono font-black">= ₹{fmt(missingLoss.expectedAdminCut)} − ₹{fmt(missingLoss.totalAdminCutReceived)} = ₹{fmt(missingLoss.adminNetLoss)}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-orange-500/35 p-5 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(234,88,12,0.05) 100%)' }}>
                        <div className="absolute top-3 right-3 text-2xl opacity-15">👤</div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-black text-orange-400 flex-shrink-0">3</span>
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider">User Net Loss</p>
                        </div>
                        <p className="font-syne font-black text-3xl text-orange-400">₹{fmt(missingLoss.userNetLoss)}</p>
                        <ProgressBar value={Number(missingLoss.userNetLossPct)} color="#f97316" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-muted-foreground">estimate vs user got</span>
                          <span className="font-black text-orange-400 text-sm">{missingLoss.userNetLossPct}%</span>
                        </div>
                        <div className="mt-3 p-2 rounded-lg bg-background/40 border border-orange-500/20 space-y-1">
                          <p className="text-[9px] text-muted-foreground/80 font-mono">Estimate (Expected): ₹{fmt(missingLoss.totalUserEstimate)}</p>
                          <p className="text-[9px] text-muted-foreground/80 font-mono">User Got (Received): ₹{fmt(missingLoss.totalUserGotMissing)}</p>
                          <p className="text-[9px] text-orange-400 font-mono font-black">Net = ₹{fmt(missingLoss.totalUserEstimate)} − ₹{fmt(missingLoss.totalUserGotMissing)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                      <span className="text-blue-400 flex-shrink-0 text-sm mt-0.5">ℹ️</span>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        <strong className="text-amber-400">Admin Net Loss</strong> = <em>(Total Payout − User Estimate)</em> − Admin Cut Received. e.g. (₹1000−₹400)−₹60 = ₹540.{' '}
                        <strong className="text-orange-400">User Net Loss</strong> = User Estimate − User Got. e.g. ₹400−₹200 = ₹200.
                        Edit missing leads in Lead Collection to set Admin Cut &amp; User Got values.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ SECTION 2: LEAD VOLUME METRICS ══════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <SectionHeader
          icon="📊"
          title="Section 2 — Lead Volume Metrics"
          subtitle={`${filteredLeads.length} total leads · Click any card to drill down · ${getDateRangeLabel(analyticsFilter, analyticsStart, analyticsEnd)}`}
        />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATUS_VOLUME_ITEMS.map(item => {
              const count = getStatusCount(item.key);
              const p = filteredLeads.length > 0 ? ((count / filteredLeads.length) * 100).toFixed(0) : '0';
              const isActive = statusDrill === item.key;
              const isClickable = item.key !== '__all__';
              return (
                <StatusVolumeCard key={item.key}
                  icon={item.icon} label={item.label} count={count}
                  pctVal={p} bg={item.bg} color={item.color}
                  isActive={isActive}
                  hint={item.hint}
                  onClick={isClickable ? () => setStatusDrill(isActive ? null : item.key) : undefined}
                />
              );
            })}
          </div>

          {/* Status progress bar */}
          {filteredLeads.length > 0 && (
            <div>
              <div className="h-3 rounded-full overflow-hidden flex gap-px">
                {STATUS_VOLUME_ITEMS.slice(1).map(item => {
                  const count = getStatusCount(item.key);
                  if (count === 0) return null;
                  const w = (count / filteredLeads.length) * 100;
                  return (
                    <button key={item.key}
                      onClick={() => setStatusDrill(statusDrill === item.key ? null : item.key)}
                      title={`${item.label}: ${count} — click to drill`}
                      className={`h-full transition-all hover:opacity-80 ${statusDrill === item.key ? 'ring-1 ring-white/50' : ''}`}
                      style={{ width: `${w}%`, backgroundColor: item.hex }}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {STATUS_VOLUME_ITEMS.slice(1).map(item => {
                  const count = getStatusCount(item.key);
                  if (count === 0) return null;
                  return (
                    <button key={item.key} onClick={() => setStatusDrill(statusDrill === item.key ? null : item.key)}
                      className={`flex items-center gap-1.5 hover:opacity-80 transition-all ${statusDrill === item.key ? 'opacity-100' : 'opacity-70'}`}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.hex }} />
                      <span className="text-[10px] text-muted-foreground">{item.label}: <strong style={{ color: item.hex }}>{count}</strong></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Drill-down leads table ── */}
          {statusDrill && drilledLeads.length > 0 && (
            <div className="mt-2 rounded-xl border border-primary/20 overflow-hidden">
              <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
                <span className="text-xs font-black text-primary">
                  {STATUS_VOLUME_ITEMS.find(i => i.key === statusDrill)?.icon}{' '}
                  Drill: {STATUS_VOLUME_ITEMS.find(i => i.key === statusDrill)?.label} — {drilledLeads.length} leads
                </span>
                <button onClick={() => setStatusDrill(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><X size={11} /> Clear</button>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      {['UPI / Name', 'Offer', 'Payout', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drilledLeads.slice(0, 30).map(l => (
                      <tr key={l.id} className="border-b border-border/30 last:border-0 hover:bg-primary/5 transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-black text-primary text-xs">{extractUPIFromLead(l.leadData)}</p>
                          {extractNameFromLead(l.leadData) && <p className="text-[9px] text-muted-foreground">{extractNameFromLead(l.leadData)}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => setOfferDrill(offerDrill === l.offerName ? null : l.offerName)}
                            title={`Drill into ${l.offerName}`}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${offerDrill === l.offerName ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                            {l.offerName}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-amber-400 font-black text-xs">₹{l.offerPayout}</td>
                        <td className="px-3 py-2">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded border"
                            style={{ backgroundColor: `${STATUS_COLORS[l.status] || '#64748b'}20`, color: STATUS_COLORS[l.status] || '#94a3b8', borderColor: `${STATUS_COLORS[l.status] || '#64748b'}40` }}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-[9px]">
                          {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                    {drilledLeads.length > 30 && (
                      <tr><td colSpan={5} className="px-3 py-2 text-center text-[9px] text-muted-foreground">… and {drilledLeads.length - 30} more leads</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ QUICK KPIs ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '📊', label: 'Conversion Rate', value: `${convRate}%`, color: 'text-primary', tip: 'Approved + Paid ÷ Total leads' },
          { icon: '📦', label: 'Avg. Payout / Lead', value: `₹${avgPayout}`, color: 'text-green-400', tip: 'Average offer payout per lead' },
          { icon: '📅', label: "Today's Leads", value: todayLeads, color: 'text-amber-400', tip: 'Leads submitted today (all time)' },
          { icon: '🏷️', label: 'Active Offers', value: offerCount, color: 'text-violet-400', tip: 'Total offers in the system' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between">
              <span className="text-xl">{k.icon}</span>
              <span className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all font-semibold text-right max-w-[80px] leading-tight">{k.tip}</span>
            </div>
            <div className={`font-syne font-black text-2xl mt-2 ${k.color}`}>{k.value}</div>
            <div className="text-muted-foreground font-semibold text-xs mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ══ AFFILIATE METRICS (collapsible) ═════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button onClick={() => setAffiliateOpen(v => !v)}
          className="w-full px-5 py-4 border-b border-border flex items-center justify-between hover:bg-primary/5 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📡</span>
            <div className="text-left">
              <h3 className="font-syne font-black text-foreground text-sm">Affiliate Marketing Metrics</h3>
              <p className="text-xs text-muted-foreground mt-0.5">CPL, CPV, CTR, conversion funnel — click to expand/collapse</p>
            </div>
          </div>
          {affiliateOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {affiliateOpen && (
          loadingAffiliate ? (
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-muted/20 rounded-xl animate-pulse" />)}</div>
          ) : affiliateMetrics ? (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'CPL', value: `₹${affiliateMetrics.global.cpl}`, icon: '🎯', color: 'text-primary', tip: 'Cost per submitted lead = Revenue ÷ Leads' },
                  { label: 'CPV', value: `₹${cpv}`, icon: '👁️', color: 'text-violet-400', tip: 'Revenue ÷ completion clicks' },
                  { label: 'Conv. Rate', value: `${affiliateMetrics.global.conversionRate}%`, icon: '📈', color: 'text-green-400', tip: 'Approved + Paid ÷ Total leads' },
                  { label: 'Completions', value: affiliateMetrics.global.totalCompletionClicks, icon: '✅', color: 'text-emerald-400', tip: 'Total "Completed offer" button clicks' },
                  { label: 'Action CTR', value: `${affiliateMetrics.global.completionToLeadRate}%`, icon: '🖱️', color: 'text-amber-400', tip: 'Completion clicks ÷ total leads submitted' },
                ].map(m => (
                  <div key={m.label} className="bg-background border border-border rounded-xl p-4 hover:border-primary/30 transition-all group" title={m.tip}>
                    <div className="flex items-center gap-1.5 mb-2"><span className="text-base">{m.icon}</span><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{m.label}</p></div>
                    <p className={`font-syne font-black text-2xl ${m.color}`}>{m.value}</p>
                    <p className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all mt-1 leading-tight">{m.tip}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Today', value: affiliateMetrics.global.todayLeads, icon: '📅', tip: 'Leads submitted today' },
                  { label: 'This Week', value: affiliateMetrics.global.thisWeekLeads, icon: '📆', tip: 'Leads this calendar week' },
                  { label: 'This Month', value: affiliateMetrics.global.thisMonthLeads, icon: '🗓️', tip: 'Leads this calendar month' },
                ].map(m => (
                  <div key={m.label} className="bg-background border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-all" title={m.tip}>
                    <span className="text-xl">{m.icon}</span>
                    <p className="font-syne font-black text-xl text-foreground mt-1">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-syne font-black text-xs text-foreground mb-3 uppercase tracking-wider">14-Day Lead vs Conversion Trend</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={affiliateMetrics.timeBreakdown} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...CHART_STYLE} />
                    <Bar dataKey="leads" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Leads" />
                    <Bar dataKey="conversions" fill="#10b981" radius={[3, 3, 0, 0]} name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {affiliateMetrics.byOffer.length > 0 && (
                <div>
                  <p className="font-syne font-black text-xs text-foreground mb-3 uppercase tracking-wider">Per-Offer Affiliate Metrics — click row to drill</p>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full">
                      <thead><tr className="border-b border-border bg-background/30">{['Offer', 'Leads', 'Conv.', 'Revenue', 'CPL', 'Conv%', 'Clicks'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}</tr></thead>
                      <tbody>{affiliateMetrics.byOffer.slice(0, 10).map(o => (
                        <tr key={o.offerName}
                          onClick={() => setOfferDrill(offerDrill === o.offerName ? null : o.offerName)}
                          title={`Click to filter all analytics to "${o.offerName}"`}
                          className={`border-b border-border/40 last:border-0 transition-colors cursor-pointer ${offerDrill === o.offerName ? 'bg-primary/10 border-primary/20' : 'hover:bg-primary/5'}`}>
                          <td className="px-3 py-2.5 font-bold text-xs text-foreground max-w-[120px] truncate capitalize">
                            <div className="flex items-center gap-1.5">
                              {offerDrill === o.offerName && <span className="text-[9px] text-primary font-black">●</span>}
                              {o.offerName}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-primary font-syne font-black text-xs">{o.leads}</td>
                          <td className="px-3 py-2.5 text-green-400 font-bold text-xs">{o.conversions}</td>
                          <td className="px-3 py-2.5 text-yellow-400 font-bold text-xs">₹{o.revenue.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2.5 text-foreground text-xs">₹{o.cpl}</td>
                          <td className="px-3 py-2.5"><span className={`text-xs font-black px-2 py-0.5 rounded-full ${o.convRate >= 50 ? 'text-green-400 bg-green-500/10' : o.convRate >= 25 ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground bg-muted'}`}>{o.convRate}%</span></td>
                          <td className="px-3 py-2.5 text-emerald-400 font-bold text-xs">{o.completionClicks}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : <div className="p-8 text-center text-muted-foreground text-sm">Failed to load affiliate metrics.</div>
        )}
      </div>

      {/* ══ TELEMETRY (collapsible) ══════════════════════════════════════════ */}
      {telemetryLeads.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setTelemetryOpen(v => !v)}
            className="w-full px-5 py-4 border-b border-border flex items-center justify-between hover:bg-primary/5 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🛰️</span>
              <div className="text-left">
                <h3 className="font-syne font-black text-foreground text-sm">Telemetry Control Room</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Deep user profiling from {telemetryLeads.length} tracked submissions — click to expand</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary">LIVE</span>
              </div>
            </div>
            {telemetryOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>
          {telemetryOpen && (
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '⏱️', label: 'Avg Time on Page', value: `${avgTimeSpent}s`, color: 'text-primary', tip: 'Average seconds spent on offer page' },
                  { icon: '📜', label: 'Avg Scroll Depth', value: `${avgScrollDepth}%`, color: 'text-blue-400', tip: 'How far down the page users scrolled' },
                  { icon: '📱', label: 'Tracked Sessions', value: telemetryLeads.length, color: 'text-emerald-400', tip: 'Total leads with telemetry data' },
                  { icon: '🌍', label: 'Unique Locations', value: new Set(telemetryLeads.map(({ tel }) => tel.city)).size, color: 'text-amber-400', tip: 'Unique cities tracked' },
                ].map(m => (
                  <div key={m.label} className="bg-background border border-border rounded-xl p-4 hover:border-primary/30 transition-all group" title={m.tip}>
                    <span className="text-base">{m.icon}</span>
                    <p className={`font-syne font-black text-2xl mt-1 ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</p>
                    <p className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all mt-0.5">{m.tip}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-background border border-border rounded-xl p-4">
                  <p className="font-syne font-black text-xs text-foreground mb-4 uppercase tracking-wider">📱 Device Type</p>
                  {deviceBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart><Pie data={deviceBreakdown} cx="50%" cy="45%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                        {deviceBreakdown.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                      </Pie><Tooltip {...CHART_STYLE} /><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} /></PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>}
                </div>
                <div className="bg-background border border-border rounded-xl p-4">
                  <p className="font-syne font-black text-xs text-foreground mb-4 uppercase tracking-wider">💻 OS Breakdown</p>
                  {osBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={osBreakdown} layout="vertical" barSize={12}>
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} width={55} />
                        <Tooltip {...CHART_STYLE} /><Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Users" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>}
                </div>
                <div className="bg-background border border-border rounded-xl p-4">
                  <p className="font-syne font-black text-xs text-foreground mb-4 uppercase tracking-wider">📶 Network Type</p>
                  {networkBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart><Pie data={networkBreakdown} cx="50%" cy="45%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                        {networkBreakdown.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][i % 4]} />)}
                      </Pie><Tooltip {...CHART_STYLE} /><Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} /></PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-muted-foreground text-center py-8">No data yet</p>}
                </div>
              </div>
              {geoBreakdown.length > 0 && (
                <div>
                  <p className="font-syne font-black text-xs text-foreground mb-3 uppercase tracking-wider">🌍 Geographic Distribution (Top Locations)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {geoBreakdown.map(([loc, count]) => (
                      <div key={loc} className="bg-background border border-border rounded-xl px-3 py-2.5 flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground truncate flex-1 mr-2">📍 {loc}</p>
                        <span className="font-syne font-black text-primary text-sm flex-shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ LEAD GROWTH CHART ═══════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-syne font-black text-foreground text-sm mb-1">
          📈 Lead Growth — {analyticsFilter === 'all' ? 'All Time' : analyticsFilter === 'today' ? 'Today' : analyticsFilter === '7d' ? 'Last 7 Days' : analyticsFilter === '30d' ? 'Last 30 Days' : 'Custom Period'}
          {hasDrill && <span className="text-primary text-xs ml-2">(Drilled)</span>}
        </h3>
        <p className="text-xs text-muted-foreground mb-5">Daily submission volume · {activeLeads.length} total leads</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 7)} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...CHART_STYLE} />
            <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="url(#areaBlue)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ══ CHARTS GRID ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-syne font-black text-foreground text-sm mb-1">🍩 Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Leads by current status in period</p>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data in selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={88} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#64748b'} />)}
                </Pie>
                <Tooltip {...CHART_STYLE} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-syne font-black text-foreground text-sm mb-1">🏆 Top Offers by Leads</h3>
          <p className="text-xs text-muted-foreground mb-4">Click a bar to drill into that offer</p>
          {offerLeadsData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data in selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={offerLeadsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip {...CHART_STYLE} />
                <Bar dataKey="leads" radius={[0, 5, 5, 0]} name="Leads"
                  onClick={(data) => setOfferDrill(offerDrill === data.name ? null : data.name)}
                  cursor="pointer">
                  {offerLeadsData.map((entry, i) => (
                    <Cell key={i} fill={offerDrill === entry.name ? 'hsl(var(--primary))' : '#3b82f6'} opacity={offerDrill && offerDrill !== entry.name ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ══ OFFER SUMMARY TABLE ═════════════════════════════════════════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-syne font-black text-foreground text-sm">📋 Offer Performance Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{offerCount} total offers · {activeLeads.length} leads in period · <span className="text-primary font-black">click row to drill</span></p>
          </div>
          {offerDrill && (
            <button onClick={() => setOfferDrill(null)}
              className="flex items-center gap-1.5 text-xs font-black text-destructive border border-destructive/30 px-3 py-1.5 rounded-xl hover:bg-destructive/10 transition-all">
              <X size={11} /> Clear Offer Filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-background/30">{['Offer', 'Leads', 'Share', 'Revenue', 'Avg Payout'].map(h => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
            ))}</tr></thead>
            <tbody>
              {offerTableData.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">No offer data in selected period.</td></tr>
              )}
              {offerTableData.map(o => (
                <tr key={o.name}
                  onClick={() => setOfferDrill(offerDrill === o.fullName ? null : o.fullName)}
                  title={`Click to filter analytics to "${o.fullName}" only`}
                  className={`border-b border-border/40 last:border-0 transition-colors cursor-pointer ${offerDrill === o.fullName ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-primary/5'}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {offerDrill === o.fullName && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      <span className="font-bold text-sm text-foreground">{o.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-primary font-syne font-black">{o.leads}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-border/30 rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${activeLeads.length > 0 ? Math.min(100, (o.leads / activeLeads.length) * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground font-bold">
                        {activeLeads.length > 0 ? ((o.leads / activeLeads.length) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-yellow-400 font-bold text-sm">₹{o.revenue.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-violet-400 font-bold text-sm">₹{Math.round(o.revenue / o.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
