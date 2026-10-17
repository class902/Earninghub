import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search, Filter, ChevronDown, ChevronUp, Download, RefreshCw, Eye,
  TrendingUp, AlertTriangle, ChevronRight, X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@project/components/ui/sheet';
import { Skeleton } from '@project/components/ui/skeleton';
import {
  adminGetReferralDashboard, adminGetReferralRecords, adminGetReferralDetail,
  adminUpdateReferralStatus, adminAddReferralRemark, adminExportReferrals,
  type AdminGetReferralDashboardOutputType,
  type AdminGetReferralRecordsOutputType,
  type AdminGetReferralDetailOutputType,
} from '@/lib/api';
import ReferralDetailDrawer from './referral/ReferralDetailDrawer';
import ReferralFunnel from './referral/ReferralFunnel';

type DashboardData = AdminGetReferralDashboardOutputType;
type ReferralRecord = AdminGetReferralRecordsOutputType['records'][0];

interface Props { password: string; onNavigate?: (page: string) => void }

const STATUS_COLORS: Record<string, string> = {
  Clicked: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Offer Opened': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Registered: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Under Review': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Action Required': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Qualified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Not Qualified': 'bg-red-500/10 text-red-400 border-red-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  Cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  Reversed: 'bg-red-500/10 text-red-400 border-red-500/20',
  Eligible: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Ineligible: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const cls = STATUS_COLORS[status] || 'bg-muted/20 text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-black ${small ? 'text-[9px]' : 'text-[10px]'} ${cls}`}>
      {status}
    </span>
  );
}

function maskUpi(upi: string): string {
  if (!upi) return '—';
  const atIdx = upi.indexOf('@');
  if (atIdx < 0) return upi.length <= 4 ? upi : upi.slice(0, 4) + '••••' + upi.slice(-3);
  const prefix = upi.slice(0, atIdx);
  const suffix = upi.slice(atIdx);
  if (prefix.length <= 4) return prefix + '••••' + suffix;
  return prefix.slice(0, 4) + '••••' + prefix.slice(-3) + suffix;
}

function formatDate(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const QUICK_FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Pending', value: 'pending' },
  { label: 'Qualified', value: 'Qualified' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Reward Paid', value: 'reward_paid' },
] as const;

export default function AdminReferrals({ password, onNavigate }: Props) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<ReferralRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [leadStatus, setLeadStatus] = useState('');
  const [cashbackStatus, setCashbackStatus] = useState('');
  const [rewardStatus, setRewardStatus] = useState('');
  const [offerFilter, setOfferFilter] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highestReward' | 'lowestReward' | 'lastUpdated'>('newest');

  // Detail drawer
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminGetReferralDetailOutputType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Search debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(t); }, [search]);

  // Compute effective filters from quick filter
  const effectiveLeadStatus = useMemo(() => {
    if (quickFilter === 'pending') return 'Under Review';
    if (['Qualified', 'Completed', 'Rejected'].includes(quickFilter)) return quickFilter;
    return leadStatus;
  }, [quickFilter, leadStatus]);

  const effectiveRewardStatus = useMemo(() => {
    if (quickFilter === 'reward_paid') return 'Paid';
    return rewardStatus;
  }, [quickFilter, rewardStatus]);

  const effectiveDateRange = useMemo((): 'today' | 'yesterday' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'all' => {
    if (quickFilter === 'new') return 'today';
    return dateRange;
  }, [quickFilter, dateRange]);

  // Load dashboard
  const loadDashboard = useCallback(() => {
    adminGetReferralDashboard({ password })
      .then(setDashboard)
      .catch(() => toast.error('Failed to load dashboard'));
  }, [password]);

  // Load records
  const loadRecords = useCallback((pg = 1, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    adminGetReferralRecords({
      password, page: pg, pageSize: 25,
      search: debouncedSearch || undefined,
      leadStatus: effectiveLeadStatus || undefined,
      cashbackStatus: cashbackStatus || undefined,
      rewardStatus: effectiveRewardStatus || undefined,
      offerName: offerFilter || undefined,
      dateRange: (['today', '7d', '30d', 'all'].includes(effectiveDateRange) ? effectiveDateRange : 'all') as 'today' | '7d' | '30d' | 'all',
      sortBy,
    })
      .then(r => { setRecords(r.records); setTotal(r.total); setPage(r.page); setHasMore(r.hasMore); })
      .catch(() => toast.error('Failed to load referral records'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [password, debouncedSearch, effectiveLeadStatus, cashbackStatus, effectiveRewardStatus, offerFilter, effectiveDateRange, sortBy]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadRecords(1); }, [loadRecords]);

  // Open detail
  function openDetail(id: string) {
    setDetailId(id);
    setDetailLoading(true);
    adminGetReferralDetail({ password, referralLeadId: id })
      .then(setDetail)
      .catch(() => toast.error('Failed to load detail'))
      .finally(() => setDetailLoading(false));
  }

  function handleCloseDetail() { setDetailId(null); setDetail(null); }

  function handleRefreshAll() {
    loadDashboard();
    loadRecords(page, true);
  }

  // Export
  async function handleExport() {
    try {
      const data = await adminExportReferrals({
        password,
        leadStatus: effectiveLeadStatus || undefined,
        cashbackStatus: cashbackStatus || undefined,
        rewardStatus: effectiveRewardStatus || undefined,
        offerName: offerFilter || undefined,
        dateRange: (['today', '7d', '30d', 'all'].includes(effectiveDateRange) ? effectiveDateRange : 'all') as 'today' | '7d' | '30d' | 'all',
      });
      if (!data.rows.length) { toast.error('No data to export'); return; }
      const headers = Object.keys(data.rows[0]);
      const csv = [headers.join(','), ...data.rows.map(r => headers.map(h => `"${String((r as Record<string, unknown>)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success(`Exported ${data.count} records`);
    } catch { toast.error('Export failed'); }
  }

  const m = dashboard?.metrics;
  const fin = dashboard?.financials;

  const activeFilters = [effectiveLeadStatus, cashbackStatus, effectiveRewardStatus, offerFilter, effectiveDateRange !== 'all' ? effectiveDateRange : ''].filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── Metrics Cards ── */}
      {!dashboard ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Referrals', value: m!.totalReferrals, color: 'text-foreground', icon: '🤝', click: '' },
            { label: 'New (24h)', value: m!.newReferrals, color: 'text-blue-400', icon: '🆕', click: 'new' },
            { label: 'Pending', value: m!.pending, color: 'text-amber-400', icon: '⏳', click: 'pending' },
            { label: 'Qualified', value: m!.qualified, color: 'text-emerald-400', icon: '✅', click: 'Qualified' },
            { label: 'Completed', value: m!.completed, color: 'text-emerald-500', icon: '🏁', click: 'Completed' },
            { label: 'Rejected', value: m!.rejected, color: 'text-red-400', icon: '❌', click: 'Rejected' },
            { label: 'Reward Pending', value: m!.rewardPending, color: 'text-amber-400', icon: '💰', sub: fin ? formatCurrency(fin.rewardPending) : undefined, click: 'reward_paid' },
            { label: 'Reward Paid', value: m!.rewardPaid, color: 'text-emerald-400', icon: '💸', sub: fin ? formatCurrency(fin.rewardPaid) : undefined, click: 'reward_paid' },
            { label: 'Total Earnings', value: formatCurrency(m!.totalEarnings), color: 'text-emerald-400', icon: '📊' },
            { label: 'Conversion', value: `${m!.conversionRate}%`, color: 'text-primary', icon: '📈' },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => card.click !== undefined && setQuickFilter(card.click)}
              className="bg-card border border-border rounded-2xl p-3.5 text-left hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-sm">{card.icon}</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{card.label}</span>
              </div>
              <p className={`font-syne font-black text-xl ${card.color} group-hover:scale-105 transition-transform origin-left`}>
                {card.value}
              </p>
              {card.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>}
            </button>
          ))}
        </div>
      )}

      {/* ── Financial Summary ── */}
      {fin && (fin.totalCashback > 0 || fin.totalReward > 0) && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-primary" />
            <span className="font-syne font-black text-sm text-foreground">Financial Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Cashback', value: formatCurrency(fin.totalCashback), color: 'text-foreground' },
              { label: 'Cashback Paid', value: formatCurrency(fin.cashbackPaid), color: 'text-emerald-400' },
              { label: 'Cashback Pending', value: formatCurrency(fin.cashbackPending), color: 'text-amber-400' },
              { label: 'Total Reward', value: formatCurrency(fin.totalReward), color: 'text-foreground' },
              { label: 'Reward Paid', value: formatCurrency(fin.rewardPaid), color: 'text-emerald-400' },
              { label: 'Reward Pending', value: formatCurrency(fin.rewardPending), color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="bg-background border border-border rounded-xl p-3 text-center">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`font-syne font-black text-base ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Funnel ── */}
      {dashboard?.funnel && dashboard.funnel.some(f => f.count > 0) && (
        <ReferralFunnel funnel={dashboard.funnel} />
      )}

      {/* ── Needs Attention ── */}
      {dashboard && dashboard.needsAttention > 0 && (
        <button
          onClick={() => { setQuickFilter('pending'); }}
          className="w-full flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl hover:border-orange-500/40 transition-all"
        >
          <AlertTriangle size={16} className="text-orange-400 flex-shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-black text-foreground">Needs Attention</p>
            <p className="text-xs text-muted-foreground">{dashboard.needsAttention} referrals require review or action</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
      )}

      {/* ── Toolbar ── */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search referrer, user, offer, code…"
              className="w-full pl-9 pr-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${showAdvanced || activeFilters > 0 ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
              <Filter size={12} /> Filters
              {activeFilters > 0 && <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{activeFilters}</span>}
              {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black rounded-xl hover:bg-emerald-500/20 transition-all">
              <Download size={12} /> Export
            </button>
            <button onClick={handleRefreshAll} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border text-xs font-bold rounded-xl hover:border-primary transition-all disabled:opacity-60">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_FILTERS.map(f => (
            <button key={f.value} onClick={() => setQuickFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${quickFilter === f.value ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Lead Status</label>
              <select value={leadStatus} onChange={e => { setLeadStatus(e.target.value); setQuickFilter(''); }}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl">
                <option value="">All</option>
                {['Clicked', 'Offer Opened', 'Registered', 'Submitted', 'Under Review', 'Action Required', 'Qualified', 'Not Qualified', 'Rejected', 'Cancelled', 'Completed'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Cashback Status</label>
              <select value={cashbackStatus} onChange={e => setCashbackStatus(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl">
                <option value="">All</option>
                {['Pending', 'Processing', 'Approved', 'Paid', 'Failed', 'Reversed'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Reward Status</label>
              <select value={rewardStatus} onChange={e => { setRewardStatus(e.target.value); setQuickFilter(''); }}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl">
                <option value="">All</option>
                {['Pending', 'Eligible', 'Approved', 'Processing', 'Paid', 'Failed', 'Reversed', 'Ineligible'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Date Range</label>
              <select value={dateRange} onChange={e => { setDateRange(e.target.value as typeof dateRange); setQuickFilter(''); }}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl">
                {[['all', 'All Time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['thisMonth', 'This Month'], ['lastMonth', 'Last Month']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Sort By</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl">
                {[['newest', 'Newest'], ['oldest', 'Oldest'], ['highestReward', 'Highest Reward'], ['lowestReward', 'Lowest Reward'], ['lastUpdated', 'Last Updated']].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Offer</label>
              <input value={offerFilter} onChange={e => setOfferFilter(e.target.value)} placeholder="Filter by offer…"
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl" />
            </div>
            {activeFilters > 0 && (
              <div className="col-span-2 md:col-span-4">
                <button onClick={() => { setLeadStatus(''); setCashbackStatus(''); setRewardStatus(''); setOfferFilter(''); setDateRange('all'); setQuickFilter(''); }}
                  className="text-[10px] text-destructive font-black hover:underline flex items-center gap-1">
                  <X size={10} /> Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Records List ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-syne font-black text-sm text-foreground">Referral Records</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">{total}</span>
          </div>
          {total > 0 && (
            <span className="text-[10px] text-muted-foreground">Page {page}</span>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4">🤝</div>
            <p className="font-syne font-black text-foreground mb-1">No Referrals Found</p>
            <p className="text-sm text-muted-foreground">
              {activeFilters > 0 ? 'Try adjusting your filters to see more results.' : 'Referral records will appear here when users are referred through links.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background/30">
                    {['Referrer', 'Referred User', 'Offer', 'Lead', 'Cashback', 'Reward', 'Payment', 'Date', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-background/40 transition-colors cursor-pointer" onClick={() => openDetail(r.id)}>
                      <td className="px-3 py-3">
                        <p className="text-sm font-black text-primary truncate max-w-[120px]">{r.referrerName || '—'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{maskUpi(r.referrerUpi)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-bold text-foreground truncate max-w-[100px]">{r.referredUserName || '—'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-[100px] block">{r.offerName || '—'}</span>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={r.leadStatus} small /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={r.cashbackStatus} small />
                          {r.cashbackAmount > 0 && <span className="text-[10px] font-bold text-foreground">{formatCurrency(r.cashbackAmount)}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={r.rewardStatus} small />
                          {r.rewardAmount > 0 && <span className="text-[10px] font-bold text-foreground">{formatCurrency(r.rewardAmount)}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={r.paymentStatus} small /></td>
                      <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-3 py-3">
                        <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/30">
              {records.map(r => (
                <button key={r.id} onClick={() => openDetail(r.id)} className="w-full text-left p-4 hover:bg-background/40 transition-colors">
                  {/* Referral header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs">🔗</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">Referral</span>
                    {r.flaggedForReview && <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">⚠ Review</span>}
                  </div>
                  <p className="text-sm font-black text-primary">{r.referrerName || '—'} <span className="font-mono text-muted-foreground text-[10px]">• {maskUpi(r.referrerUpi)}</span></p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <span className="text-xs font-bold text-foreground">{r.referredUserName || '—'}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">{r.offerName}</span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <StatusBadge status={r.leadStatus} small />
                    <StatusBadge status={r.cashbackStatus} small />
                    <StatusBadge status={r.rewardStatus} small />
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-3">
                      {r.cashbackAmount > 0 && <span className="text-[10px] font-bold text-foreground">CB {formatCurrency(r.cashbackAmount)}</span>}
                      {r.rewardAmount > 0 && <span className="text-[10px] font-bold text-emerald-400">Reward {formatCurrency(r.rewardAmount)}</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button disabled={page <= 1} onClick={() => loadRecords(page - 1)}
                className="px-3 py-1.5 text-xs font-black border border-border rounded-xl hover:border-primary disabled:opacity-40 transition-all">
                ← Previous
              </button>
              <span className="text-[10px] text-muted-foreground">
                {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}
              </span>
              <button disabled={!hasMore} onClick={() => loadRecords(page + 1)}
                className="px-3 py-1.5 text-xs font-black border border-border rounded-xl hover:border-primary disabled:opacity-40 transition-all">
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <Sheet open={!!detailId} onOpenChange={open => !open && handleCloseDetail()}>
        <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="font-syne font-black text-foreground flex items-center gap-2">
              🔗 Referral Detail
            </SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : detail ? (
            <ReferralDetailDrawer
              detail={detail}
              password={password}
              onClose={handleCloseDetail}
              onRefresh={() => { handleRefreshAll(); if (detailId) openDetail(detailId); }}
              onNavigateToLink={(linkId) => { handleCloseDetail(); onNavigate?.('referral-links'); }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
