import { useEffect, useState, useMemo } from 'react';
import { adminGetLeads, adminGetOffers } from 'zitejs/api';
import { toast } from 'sonner';
import { Search, X, Download, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Offer, Lead } from '@/types';
import CampaignDeepDive from './report/CampaignDeepDive';
import CampaignCompare from './report/CampaignCompare';

interface Props { password: string; initialCampaign?: string }

export interface OfferStats {
  offer: Offer;
  totalLeads: number;
  pendingLeads: number;
  approvedLeads: number;
  paidLeads: number;
  missingLeads: number;
  rejectedLeads: number; // always 0, kept for interface compat
  totalRevenue: number;
  adminCut: number;
  userPaid: number;
  conversionRate: number;
  missingRate: number;
  rejectionRate: number;
  performanceScore: number;
  leadsByDay: Record<string, number>;
  leads: Lead[];
}

const STATUS_MAP: Record<string, string> = {
  Pending: 'pending', 'In Review': 'pending', 'Under Review': 'pending',
  Approved: 'approved', Hold: 'pending', 'On Hold': 'pending',
  Paid: 'paid', 'Cashback Sent': 'paid',
  Missing: 'missing', Duplicate: 'missing',
};

export function computeStats(offers: Offer[], leads: Lead[]): OfferStats[] {
  const leadsByOffer: Record<string, Lead[]> = {};
  leads.forEach(l => {
    if (!leadsByOffer[l.offerName]) leadsByOffer[l.offerName] = [];
    leadsByOffer[l.offerName].push(l);
  });

  return offers.map(offer => {
    const offerLeads = leadsByOffer[offer.name] || [];
    const counts = { pending: 0, approved: 0, paid: 0, missing: 0 };
    offerLeads.forEach(l => {
      const mapped = STATUS_MAP[l.status] || 'pending';
      counts[mapped as keyof typeof counts]++;
    });

    const total = offerLeads.length || 1;
    const conversionRate = offerLeads.length > 0 ? ((counts.paid + counts.approved) / total) * 100 : 0;
    const missingRate = offerLeads.length > 0 ? (counts.missing / total) * 100 : 0;
    const rejectionRate = 0; // rejected merged into missing

    const paidAndApproved = offerLeads.filter(l => ['Paid', 'Cashback Sent', 'Approved'].includes(l.status));
    const totalRevenue = paidAndApproved.reduce((s, l) => s + (l.offerPayout || 0), 0);

    const hasAdminCut = (offer as any).referralAdminCut && (offer as any).referralAdminCut > 0;
    const adminCutPerLead = hasAdminCut ? (offer as any).referralAdminCut : Math.round(offer.payout * 0.2);
    const adminCut = paidAndApproved.length * adminCutPerLead;
    const userPaid = totalRevenue - adminCut;

    // Performance Score: weighted formula (0-100)
    const convWeight = 0.5, missWeight = 0.3, rejWeight = 0.2;
    const convScore = Math.min(conversionRate * 2, 100);
    const missScore = Math.max(100 - missingRate * 5, 0);
    const rejScore = Math.max(100 - rejectionRate * 5, 0);
    const performanceScore = offerLeads.length > 0
      ? Math.round(convScore * convWeight + missScore * missWeight + rejScore * rejWeight)
      : 0;

    // Leads by day (last 30 days)
    const leadsByDay: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      leadsByDay[d.toISOString().slice(0, 10)] = 0;
    }
    offerLeads.forEach(l => {
      const day = l.createdAt?.slice(0, 10);
      if (day && day in leadsByDay) leadsByDay[day]++;
    });

    return {
      offer, totalLeads: offerLeads.length, ...counts,
      pendingLeads: counts.pending, approvedLeads: counts.approved,
      paidLeads: counts.paid, missingLeads: counts.missing, rejectedLeads: 0,
      totalRevenue, adminCut, userPaid,
      conversionRate, missingRate, rejectionRate, performanceScore,
      leadsByDay, leads: offerLeads,
    };
  });
}

export default function OfferReportPage({ password, initialCampaign }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'leads' | 'revenue' | 'name' | 'missing' | 'score'>('score');
  const [selectedCampaign, setSelectedCampaign] = useState<string>(initialCampaign || '');
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    if (initialCampaign) setSelectedCampaign(initialCampaign);
  }, [initialCampaign]);

  useEffect(() => {
    Promise.all([
      adminGetOffers({ password }),
      adminGetLeads({ password }),
    ]).then(([o, l]) => { setOffers(o.offers); setLeads(l.leads); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [password]);

  const stats = useMemo(() => computeStats(offers, leads), [offers, leads]);

  const filtered = useMemo(() => {
    let result = stats;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.offer.name.toLowerCase().includes(q) || s.offer.category.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === 'leads') return b.totalLeads - a.totalLeads;
      if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'missing') return b.missingLeads - a.missingLeads;
      if (sortBy === 'score') return b.performanceScore - a.performanceScore;
      return a.offer.name.localeCompare(b.offer.name);
    });
    return result;
  }, [stats, search, sortBy]);

  const totals = useMemo(() => ({
    leads: stats.reduce((s, o) => s + o.totalLeads, 0),
    revenue: stats.reduce((s, o) => s + o.totalRevenue, 0),
    missing: stats.reduce((s, o) => s + o.missingLeads, 0),
    paid: stats.reduce((s, o) => s + o.paidLeads, 0),
    adminCut: stats.reduce((s, o) => s + o.adminCut, 0),
    avgScore: stats.length > 0 ? Math.round(stats.reduce((s, o) => s + o.performanceScore, 0) / stats.length) : 0,
  }), [stats]);

  function exportCSV() {
    const headers = ['Offer', 'Status', 'Category', 'Score', 'Total Leads', 'Pending', 'Approved', 'Paid', 'Missing', 'Conv%', 'Revenue (₹)', 'Admin Cut (₹)', 'User Paid (₹)'];
    const rows = filtered.map(s => [
      s.offer.name, s.offer.status, s.offer.category, s.performanceScore,
      s.totalLeads, s.pendingLeads, s.approvedLeads, s.paidLeads, s.missingLeads,
      s.conversionRate.toFixed(1), s.totalRevenue, s.adminCut, s.userPaid,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `campaign-report-${Date.now()}.csv`; document.body.appendChild(a); a.click();
    document.body.removeChild(a); toast.success('Report exported! 📥');
  }

  const selectedStat = selectedCampaign ? stats.find(s => s.offer.name === selectedCampaign) : null;

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl h-24 animate-pulse" />)}
      </div>
      <div className="bg-card border border-border rounded-2xl h-96 animate-pulse" />
    </div>
  );

  // ── Compare Mode ──
  if (compareMode && compareList.length >= 2) {
    const compareStats = compareList.map(name => stats.find(s => s.offer.name === name)).filter(Boolean) as OfferStats[];
    return (
      <div className="p-5 md:p-6 space-y-5">
        <button onClick={() => setCompareMode(false)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-bold transition-colors">
          <ArrowLeft size={14} /> ← Back to Overview
        </button>
        <CampaignCompare stats={compareStats} />
      </div>
    );
  }

  // ── Single Campaign Deep Dive ──
  if (selectedStat) {
    return (
      <div className="p-5 md:p-6 space-y-5">
        <button onClick={() => setSelectedCampaign('')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-bold transition-colors">
          <ArrowLeft size={14} /> ← All Campaigns
        </button>
        <CampaignDeepDive stat={selectedStat} />
      </div>
    );
  }

  // ── All Campaigns Overview ──
  return (
    <div className="p-5 md:p-6 space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: '📊', label: 'Campaigns', value: offers.length, color: 'text-primary' },
          { icon: '👥', label: 'Total Leads', value: totals.leads.toLocaleString('en-IN'), color: 'text-foreground' },
          { icon: '💰', label: 'Revenue', value: `₹${totals.revenue.toLocaleString('en-IN')}`, color: 'text-emerald-400' },
          { icon: '✂️', label: 'Admin Cut', value: `₹${totals.adminCut.toLocaleString('en-IN')}`, color: 'text-violet-400' },
          { icon: '❓', label: 'Missing', value: totals.missing, color: 'text-rose-400' },
          { icon: '⚡', label: 'Avg Score', value: `${totals.avgScore}/100`, color: totals.avgScore >= 60 ? 'text-emerald-400' : 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
            <p className={`font-syne font-black text-xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..."
            className="w-full pl-9 pr-9 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-background border border-border text-foreground text-xs font-bold rounded-xl focus:outline-none focus:border-primary">
            <option value="score">Sort by Score</option>
            <option value="leads">Sort by Leads</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="missing">Sort by Missing</option>
            <option value="name">Sort by Name</option>
          </select>
          {compareList.length >= 2 && (
            <button onClick={() => setCompareMode(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl text-white bg-gradient-to-r from-violet-500 to-purple-500 hover:opacity-90 transition-all shadow-md">
              ⚔️ Compare ({compareList.length})
            </button>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Campaign Table with Health Badges */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-syne font-black text-foreground text-sm">📊 Campaign Performance</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">{filtered.length}</span>
          </div>
          <p className="text-[10px] text-muted-foreground hidden sm:block">Click row to deep-dive · ☐ to compare</p>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="font-syne font-black text-foreground text-base mb-2">No campaigns found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  {['☐', 'Campaign', 'Score', 'Leads', 'Funnel', 'Health', 'Revenue', 'Admin Cut', 'Trend (30d)'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const isCompared = compareList.includes(s.offer.name);
                  return (
                    <tr key={s.offer.id}
                      onClick={() => setSelectedCampaign(s.offer.name)}
                      className="border-b border-border/50 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer group">
                      {/* Compare checkbox */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isCompared}
                          onChange={() => setCompareList(prev => isCompared ? prev.filter(n => n !== s.offer.name) : prev.length < 3 ? [...prev, s.offer.name] : prev)}
                          className="w-4 h-4 rounded border-border accent-primary cursor-pointer" />
                      </td>
                      {/* Campaign Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {s.offer.logoUrl ? (
                              <img src={s.offer.logoUrl} alt={s.offer.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <span className="text-[8px] font-black text-primary">{s.offer.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate max-w-[140px]">{s.offer.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{s.offer.category}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${s.offer.status?.toLowerCase() === 'active' ? 'text-green-400 bg-green-500/10 border-green-500/25' : 'text-muted-foreground bg-muted/10 border-border'}`}>
                                {s.offer.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Score */}
                      <td className="px-3 py-3">
                        <ScoreBadge score={s.performanceScore} />
                      </td>
                      {/* Leads */}
                      <td className="px-3 py-3"><span className="font-syne font-black text-sm text-foreground">{s.totalLeads}</span></td>
                      {/* Funnel */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <span className="text-amber-400">{s.pendingLeads}P</span>
                          <span className="text-muted-foreground/30">→</span>
                          <span className="text-blue-400">{s.approvedLeads}A</span>
                          <span className="text-muted-foreground/30">→</span>
                          <span className="text-emerald-400">{s.paidLeads}✓</span>
                        </div>
                      </td>
                      {/* Health */}
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <HealthBadge label="Conv" value={s.conversionRate} good={50} bad={20} suffix="%" />
                          <HealthBadge label="Miss" value={s.missingRate} good={5} bad={20} suffix="%" invert />
                        </div>
                      </td>
                      {/* Revenue */}
                      <td className="px-3 py-3"><span className="font-syne font-black text-sm text-emerald-400">₹{s.totalRevenue.toLocaleString('en-IN')}</span></td>
                      {/* Admin Cut */}
                      <td className="px-3 py-3"><span className="text-xs font-bold text-violet-400">₹{s.adminCut.toLocaleString('en-IN')}</span></td>
                      {/* Mini Trend */}
                      <td className="px-3 py-3">
                        <MiniTrend data={s.leadsByDay} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-background/60">
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 font-syne font-black text-xs text-foreground">TOTAL</td>
                  <td className="px-3 py-3"><ScoreBadge score={totals.avgScore} /></td>
                  <td className="px-3 py-3"><span className="font-syne font-black text-sm text-foreground">{totals.leads}</span></td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3"><span className="font-syne font-black text-sm text-emerald-400">₹{totals.revenue.toLocaleString('en-IN')}</span></td>
                  <td className="px-3 py-3"><span className="text-xs font-bold text-violet-400">₹{totals.adminCut.toLocaleString('en-IN')}</span></td>
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
    : score >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
    : 'text-rose-400 bg-rose-500/10 border-rose-500/25';
  const icon = score >= 70 ? <CheckCircle2 size={10} /> : score >= 40 ? <TrendingUp size={10} /> : <AlertTriangle size={10} />;
  return (
    <div className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${color}`}>
      {icon} {score}
    </div>
  );
}

function HealthBadge({ label, value, good, bad, suffix = '', invert }: { label: string; value: number; good: number; bad: number; suffix?: string; invert?: boolean }) {
  const isGood = invert ? value <= good : value >= good;
  const isBad = invert ? value >= bad : value <= bad;
  const color = isGood ? 'text-emerald-400' : isBad ? 'text-rose-400' : 'text-amber-400';
  return <span className={`text-[9px] font-black ${color}`}>{label}:{value.toFixed(0)}{suffix}</span>;
}

function MiniTrend({ data }: { data: Record<string, number> }) {
  const values = Object.values(data);
  const max = Math.max(...values, 1);
  const last7 = values.slice(-7);
  return (
    <div className="flex items-end gap-px h-5 w-16">
      {last7.map((v, i) => (
        <div key={i} className="flex-1 bg-primary/60 rounded-t-sm transition-all"
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, minHeight: 2 }} />
      ))}
    </div>
  );
}
