import { useEffect, useState, useMemo } from 'react';
import { adminGetOffers, adminGetLeads } from 'zitejs/api';
import { toast } from 'sonner';
import {
  Download, TrendingUp, Clock, Zap, DollarSign,
  TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardCharts from './DashboardCharts';
import type { Lead } from '@/types';

interface Props { password: string; onNavigate?: (page: string) => void }

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  Missing: 'bg-red-500/10 text-red-400 border-red-500/30',
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'Under Review': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'In Review': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Cashback Sent': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  Hold: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

const QUICK_ACTIONS = [
  { label: 'Add Offer', icon: '➕', page: 'add-offer', color: 'from-primary to-blue-400', desc: 'Create cashback offer' },
  { label: 'Pending Leads', icon: '👥', page: 'leads:Pending', color: 'from-amber-500 to-orange-400', desc: 'Review submissions' },
  { label: 'Analytics', icon: '📈', page: 'analytics', color: 'from-violet-500 to-purple-400', desc: 'Charts & trends' },
  { label: 'Missing Analysis', icon: '🔴', page: 'missing', color: 'from-rose-500 to-red-400', desc: 'Revenue gaps' },
  { label: 'Backup', icon: '🛡️', page: 'backup', color: 'from-blue-600 to-cyan-400', desc: 'Save or restore' },
  { label: 'Settings', icon: '⚙️', page: 'settings', color: 'from-slate-600 to-slate-400', desc: 'Config & branding' },
];

function parsePayouts(ac: string | undefined) {
  if (!ac) return { myEarning: 0, userPayout: 0, sendUserAmount: 0 };
  try {
    const p = JSON.parse(ac);
    return {
      myEarning: typeof p.myEarning === 'number' ? p.myEarning : 0,
      userPayout: typeof p.userPayout === 'number' ? p.userPayout : 0,
      sendUserAmount: typeof p.sendUserAmount === 'number' ? p.sendUserAmount : 0,
    };
  } catch { return { myEarning: 0, userPayout: 0, sendUserAmount: 0 }; }
}

interface KpiConfig {
  icon: string; label: string; value: string | number; desc?: string;
  gradient: string; textColor: string; navigateTo?: string; alert?: boolean;
}

function KpiCard({ icon, label, value, desc, gradient, textColor, navigateTo, alert, onNavigate }: KpiConfig & { onNavigate?: (p: string) => void }) {
  const clickable = !!navigateTo;
  return (
    <div
      onClick={() => clickable && onNavigate?.(navigateTo!)}
      className={`relative bg-card rounded-2xl p-5 overflow-hidden transition-all duration-200 group border ${
        alert ? 'border-rose-500/35 shadow-sm shadow-rose-500/10' : 'border-border'
      } ${clickable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 active:scale-[0.98]' : ''}`}
    >
      <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b ${gradient}`} />
      <div className="flex items-start justify-between mb-3 pl-1">
        <span className="text-xl">{icon}</span>
        <div className="flex items-center gap-1.5">
          {desc && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-background border border-border rounded-full text-muted-foreground">{desc}</span>
          )}
          {clickable && (
            <span className="text-[10px] text-muted-foreground/30 group-hover:text-primary/60 transition-colors font-bold">↗</span>
          )}
        </div>
      </div>
      <div className={`font-syne font-black text-2xl mb-1 pl-1 ${textColor}`}>{value}</div>
      <div className="text-muted-foreground font-semibold text-xs pl-1 leading-tight">{label}</div>
    </div>
  );
}

export default function AdminDashboard({ password, onNavigate }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({
    leads: 0, active: 0, total: 0, pending: 0, approved: 0,
    rejected: 0, paid: 0, inReview: 0, missing: 0, today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [revenueExpanded, setRevenueExpanded] = useState(true);

  useEffect(() => {
    Promise.all([adminGetOffers({ password }), adminGetLeads({ password })])
      .then(([o, l]) => {
        const all = l.leads;
        const today = new Date().toDateString();
        setLeads(all);
        setStats({
          leads: all.length,
          active: o.offers.filter(x => x.status?.toLowerCase() === 'active').length,
          total: o.offers.length,
          pending: all.filter(x => x.status === 'Pending').length,
          approved: all.filter(x => ['Approved', 'Cashback Sent', 'Paid'].includes(x.status)).length,
          rejected: all.filter(x => x.status === 'Rejected').length,
          paid: all.filter(x => ['Paid', 'Cashback Sent'].includes(x.status)).length,
          inReview: all.filter(x => ['In Review', 'Under Review', 'Hold'].includes(x.status)).length,
          missing: all.filter(x => x.status === 'Missing').length,
          today: all.filter(x => x.createdAt && new Date(x.createdAt).toDateString() === today).length,
        });
      }).finally(() => setLoading(false));
  }, [password]);

  const earnings = useMemo(() => {
    // Phase 2: Strict Calculation Rules
    // Admin Profit = ONLY paid/cashback-sent leads' admin cut
    // Pending Liabilities = ONLY pending/in-review leads' user estimate
    const PAID_STATUSES = new Set(['Cashback Sent', 'Paid']);
    const PENDING_STATUSES = new Set(['Pending', 'Under Review', 'In Review', 'Hold']);

    let adminProfit = 0;        // Real profit: admin cut on PAID leads only
    let pendingLiabilities = 0; // Money owed: user estimate on PENDING leads
    let totalSendUser = 0;      // Total actually sent to users

    leads.forEach(l => {
      const p = parsePayouts(l.actionConfig);
      if (PAID_STATUSES.has(l.status)) {
        adminProfit += p.myEarning;
      }
      if (PENDING_STATUSES.has(l.status)) {
        pendingLiabilities += p.userPayout;
      }
      totalSendUser += p.sendUserAmount;
    });

    return { adminProfit, pendingLiabilities, totalSendUser };
  }, [leads]);

  // Missing analysis summary
  const missingWidget = useMemo(() => {
    let totalUserEstimate = 0, totalUserGot = 0;
    leads.forEach(l => {
      const p = parsePayouts(l.actionConfig);
      totalUserEstimate += p.userPayout;
      totalUserGot += p.sendUserAmount;
    });
    const userLoss = Math.max(0, totalUserEstimate - totalUserGot);
    return { missingCount: stats.missing, userLoss, hasIssues: stats.missing > 0 || userLoss > 0 };
  }, [leads, stats.missing]);

  async function exportCSV() {
    setExporting(true);
    try {
      const headers = ['Lead ID', 'Offer', 'Status', 'Summary', 'Date'];
      const rows = leads.map(l => [
        l.leadId, l.offerName, l.status, l.summary,
        l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `earninghub-leads-${Date.now()}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      toast.success('CSV exported! 📥');
    } catch { toast.error('Export failed.'); } finally { setExporting(false); }
  }

  const conversionRate = stats.leads > 0 ? Math.round(stats.approved / stats.leads * 100) : 0;

  const kpiCards: KpiConfig[] = [
    {
      icon: '📋', label: 'Total Leads', value: stats.leads,
      gradient: 'from-primary to-blue-400', textColor: 'text-foreground', navigateTo: 'leads',
    },
    {
      icon: '📅', label: "Today's Leads", value: stats.today,
      desc: stats.today > 0 ? `+${stats.today} new` : undefined,
      gradient: 'from-pink-500 to-rose-400', textColor: 'text-pink-400', navigateTo: 'leads',
    },
    {
      icon: '⏳', label: 'Pending Review', value: stats.pending,
      desc: stats.pending > 0 ? 'Action needed' : undefined,
      gradient: 'from-amber-500 to-orange-400', textColor: 'text-amber-400',
      navigateTo: 'leads:Pending', alert: stats.pending > 0,
    },
    {
      icon: '🔵', label: 'In Review / Hold', value: stats.inReview,
      gradient: 'from-blue-500 to-cyan-400', textColor: 'text-blue-400', navigateTo: 'leads:In Review',
    },
    {
      icon: '✅', label: 'Approved + Paid', value: stats.approved,
      gradient: 'from-green-500 to-emerald-400', textColor: 'text-green-400', navigateTo: 'leads:Approved',
    },
    {
      icon: '💰', label: 'Cashback Sent', value: stats.paid,
      gradient: 'from-teal-500 to-emerald-400', textColor: 'text-teal-400', navigateTo: 'leads:Cashback Sent',
    },
    {
      icon: '🔴', label: 'Missing/Rejected', value: stats.rejected + stats.missing,
      gradient: 'from-red-500 to-rose-400', textColor: 'text-red-400', navigateTo: 'leads:Missing',
    },
    {
      icon: '🔴', label: 'Open Disputes', value: stats.missing,
      desc: stats.missing > 0 ? 'Click to filter' : undefined,
      gradient: 'from-rose-600 to-red-500', textColor: 'text-rose-400',
      navigateTo: 'leads:Missing', alert: stats.missing > 0,
    },
    {
      icon: '📊', label: 'Conversion Rate', value: `${conversionRate}%`,
      gradient: 'from-primary to-blue-400', textColor: 'text-primary', navigateTo: 'analytics',
    },
    {
      icon: '🎯', label: 'Active Offers', value: stats.active,
      desc: `of ${stats.total}`,
      gradient: 'from-sky-500 to-blue-400', textColor: 'text-sky-400', navigateTo: 'offers',
    },
  ];

  if (loading) return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl h-28 animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="p-5 md:p-6 space-y-6">

      {/* ── Operational KPI Grid ── */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          📊 Operations Overview —{' '}
          <span className="text-primary normal-case font-semibold">click any card to drill down</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map(c => <KpiCard key={c.label} {...c} onNavigate={onNavigate} />)}
        </div>
      </div>

      {/* ── Missing Analysis Widget ── */}
      {missingWidget.hasIssues && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => onNavigate?.('missing')}
          className="cursor-pointer rounded-2xl border border-rose-500/35 p-5 hover:border-rose-500/60 hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.06) 0%, hsl(var(--card)) 100%)' }}
        >
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={16} className="text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="font-syne font-black text-sm text-rose-400">⚠️ Missing Analysis — Action Required</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Revenue gaps detected. Click to view the full report.</p>
              </div>
            </div>
            <span className="text-xs text-rose-400 font-bold flex-shrink-0">Full Report →</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Missing Status</p>
              <p className="font-syne font-black text-2xl text-rose-400">{missingWidget.missingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">leads marked as Missing</p>
            </div>
            <div className="p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">User Payout Gap</p>
              <p className="font-syne font-black text-2xl text-orange-400">₹{missingWidget.userLoss.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Estimate vs actually paid out</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Revenue Intelligence (Admin Private — collapsed by default) ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setRevenueExpanded(v => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-background/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <DollarSign size={15} className="text-primary" />
            <span className="font-syne font-black text-foreground text-sm">Revenue Intelligence</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full">🔒 Admin Private</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{revenueExpanded ? 'Collapse' : 'Expand to view'}</span>
            {revenueExpanded
              ? <ChevronUp size={14} className="text-muted-foreground" />
              : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>
        <AnimatePresence>
          {revenueExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
            >
              <div className="px-5 pb-5 border-t border-border space-y-4">
                <div className="mt-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <p className="text-[10px] font-black text-blue-400 mb-1">📌 Strict Financial Rules Applied</p>
                  <p className="text-[10px] text-muted-foreground">
                    Admin Profit = only <strong className="text-violet-400">Admin Cut from PAID leads</strong> •
                    Pending Liabilities = <strong className="text-amber-400">User Estimate on PENDING/IN-REVIEW</strong>
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { icon: '🏦', label: 'Confirmed Admin Profit', value: earnings.adminProfit, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', desc: 'Cut from PAID leads only' },
                    { icon: '⏳', label: 'Pending User Liabilities', value: earnings.pendingLiabilities, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'Owed to pending/review users' },
                    { icon: '✅', label: 'Total Sent to Users', value: earnings.totalSendUser, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Actually disbursed' },
                  ].map(item => (
                    <div key={item.label}
                      onClick={() => onNavigate?.('analytics')}
                      className={`p-4 rounded-xl border ${item.bg} cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all group/rev`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider leading-tight flex-1">{item.label}</span>
                        <span className="text-[9px] font-black text-muted-foreground/0 group-hover/rev:text-primary/60 transition-all">↗</span>
                      </div>
                      <p className={`font-syne font-black text-xl ${item.color}`}>
                        {item.value > 0 ? `₹${item.value.toLocaleString('en-IN')}` : <span className="text-muted-foreground/40 text-sm font-normal">No data</span>}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
                {earnings.pendingLiabilities > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <TrendingDown size={16} className="text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-black text-amber-400">⚠️ Pending User Liabilities</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">₹{earnings.pendingLiabilities.toLocaleString('en-IN')} in estimated payouts still owed to pending/review users</p>
                    </div>
                    <span className="font-syne font-black text-amber-400 flex-shrink-0">₹{earnings.pendingLiabilities.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick Actions ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Zap size={15} className="text-primary" />
          <span className="font-syne font-black text-foreground text-sm">Quick Actions</span>
          <span className="text-xs text-muted-foreground ml-1">— click to navigate instantly</span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map(a => (
            <button key={a.page} onClick={() => onNavigate?.(a.page)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-all group text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform`}>
                {a.icon}
              </div>
              <div>
                <p className="font-syne font-black text-xs text-foreground leading-tight">{a.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <DashboardCharts leads={leads} />

      {/* ── Recent Submissions ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" />
            <span className="font-syne font-black text-foreground text-sm">Recent Submissions</span>
            <span className="text-xs text-muted-foreground">({Math.min(leads.length, 10)} of {leads.length})</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onNavigate?.('leads')}
              className="px-3 py-1.5 bg-background border border-border text-xs font-bold rounded-xl hover:border-primary hover:text-primary transition-all">
              View All →
            </button>
            <button onClick={exportCSV} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-xl hover:bg-primary/20 transition-all disabled:opacity-60">
              <Download size={12} />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
        {leads.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-syne font-black text-foreground text-base mb-1">No leads yet</p>
            <p className="text-sm text-muted-foreground">Share your offers to start collecting leads</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  {['Lead ID', 'Offer', 'User', 'Status', 'Submitted'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map(l => (
                  <tr key={l.id} onClick={() => onNavigate?.('leads')}
                    className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer group">
                    <td className="px-4 py-3.5 font-syne font-black text-xs text-primary group-hover:underline">{l.leadId}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-bold max-w-[120px] truncate block">{l.offerName}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-foreground max-w-[140px] truncate font-medium">{l.summary}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[l.status] || 'border-border text-muted-foreground'}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        {l.createdAt ? formatDistanceToNow(new Date(l.createdAt), { addSuffix: true }) : '–'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Summary Row — all clickable ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Users size={14} />, label: 'Unique Offers', value: new Set(leads.map(l => l.offerName)).size, color: 'text-primary', nav: 'offers' },
          { icon: <TrendingUp size={14} />, label: 'Approved + Paid', value: stats.approved, color: 'text-green-400', nav: 'leads:Approved' },
          { icon: <TrendingDown size={14} />, label: 'Missing', value: stats.rejected + stats.missing, color: 'text-red-400', nav: 'leads:Missing' },
          { icon: <AlertTriangle size={14} />, label: 'Missing Leads', value: stats.missing, color: 'text-rose-400', nav: 'missing' },
        ].map(item => (
          <button key={item.label} onClick={() => item.nav && onNavigate?.(item.nav)}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
            <div className={`${item.color} opacity-70 group-hover:opacity-100 transition-opacity`}>{item.icon}</div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className={`font-syne font-black text-lg ${item.color}`}>{item.value}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
