import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search, Filter, ChevronDown, RefreshCw, Eye, Plus,
  Copy, Pause, Play, XCircle, Ban, Clock, Link2, Users, BarChart2,
} from 'lucide-react';
import { Skeleton } from '@project/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import {
  adminGetLinksV2, adminUpdateLinkStatus,
  adminExtendLinkExpiry, adminCreateReferralLink, adminGetOffers,
  adminGetReferrerPerformance, adminGetOfferReferralPerformance,
  adminUpdateReferralLink,
  type AdminGetLinksV2OutputType,
  type AdminGetReferrerPerformanceOutputType,
  type AdminGetOfferReferralPerformanceOutputType,
} from '@/lib/api';
import LinkDetailDashboard from './LinkDetailDashboard';

type LinkRecord = AdminGetLinksV2OutputType['links'][0];
type LinkStats = AdminGetLinksV2OutputType['stats'];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: typeof Play }> = {
  Draft: { bg: 'bg-gray-500/10 border-gray-500/20', text: 'text-gray-400', icon: Clock },
  Active: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: Play },
  Paused: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', icon: Pause },
  Expired: { bg: 'bg-gray-500/10 border-gray-500/20', text: 'text-gray-400', icon: Clock },
  Terminated: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: XCircle },
  Revoked: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: Ban },
  Disabled: { bg: 'bg-gray-500/10 border-gray-500/20', text: 'text-gray-400', icon: XCircle },
};

function LinkStatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Active;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black ${s.bg} ${s.text}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

function fmtDate(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
}
function fmtCurrency(n: number) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
function maskUpi(upi: string): string {
  if (!upi) return '—';
  const at = upi.indexOf('@');
  if (at < 0) return upi.length <= 4 ? upi : upi.slice(0, 4) + '••••' + upi.slice(-3);
  const p = upi.slice(0, at), s = upi.slice(at);
  return (p.length <= 4 ? p : p.slice(0, 4) + '••••' + p.slice(-3)) + s;
}

interface Props { password: string; onNavigate?: (page: string) => void }

/* ── METRIC CARD ── */
function MetricCard({ label, value, icon, color = 'text-foreground' }: { label: string; value: string | number; icon: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-syne font-black text-xl ${color}`}>{value}</p>
    </div>
  );
}

/* ── LEAD STATUS BADGE ── */
function LeadBadge({ status, type = 'lead' }: { status: string; type?: 'lead' | 'cashback' | 'reward' | 'payout' }) {
  const colorMap: Record<string, string> = {
    Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Qualified: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Approved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Paid: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    Pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    Processing: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Eligible: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    'Under Review': 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Submitted: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    Rejected: 'bg-red-500/10 border-red-500/20 text-red-400',
    'Not Qualified': 'bg-red-500/10 border-red-500/20 text-red-400',
    Failed: 'bg-red-500/10 border-red-500/20 text-red-400',
    Missing: 'bg-red-500/10 border-red-500/20 text-red-400',
    Reversed: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    'Cashback Sent': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };
  const icons: Record<string, string> = { lead: '📋', cashback: '💰', reward: '🎁', payout: '💸' };
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-black ${colorMap[status] || 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
      {icons[type]} {status}
    </span>
  );
}

export default function AdminReferralLinks({ password, onNavigate }: Props) {
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [linkStatus, setLinkStatus] = useState('');
  const [offerFilter, setOfferFilter] = useState('');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mostClicks' | 'mostReferrals' | 'highestConversion'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Detail drawer
  const [detailLinkId, setDetailLinkId] = useState<string | null>(null);

  // Actions
  const [actionLink, setActionLink] = useState<LinkRecord | null>(null);
  const [actionType, setActionType] = useState<'pause' | 'terminate' | 'revoke' | 'extend' | ''>('');
  const [actionReason, setActionReason] = useState('');
  const [actionExpiry, setActionExpiry] = useState('');
  const [acting, setActing] = useState(false);

  // Create link
  const [showCreate, setShowCreate] = useState(false);
  const [createOffers, setCreateOffers] = useState<{ id: string; name: string; slug: string; payout: number; referralAdminCut: number; referralDefaultReferrerCut: number; referralDefaultUserEstimate: number }[]>([]);
  const [createOffer, setCreateOffer] = useState('');
  const [createReferrer, setCreateReferrer] = useState('');
  const [createUpi, setCreateUpi] = useState('');
  const [createExpiry, setCreateExpiry] = useState('');
  const [createLimit, setCreateLimit] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [createReferrerCut, setCreateReferrerCut] = useState('');
  const [createUserCut, setCreateUserCut] = useState('');
  const [creating, setCreating] = useState(false);

  // Referrer/offer tabs
  const [referrers, setReferrers] = useState<AdminGetReferrerPerformanceOutputType['referrers']>([]);
  const [offerPerf, setOfferPerf] = useState<AdminGetOfferReferralPerformanceOutputType['offers']>([]);

  const appUrl = typeof window !== 'undefined' ? appOrigin() : '';

  useEffect(() => { const t = setTimeout(() => setDSearch(search), 400); return () => clearTimeout(t); }, [search]);

  const loadLinks = useCallback((pg = 1, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    adminGetLinksV2({
      password, page: pg, pageSize: 25,
      search: dSearch || undefined,
      linkStatus: linkStatus || undefined,
      offerName: offerFilter || undefined,
      dateRange, sortBy,
    })
      .then(r => { setLinks(r.links); setStats(r.stats); setTotal(r.total); setPage(r.page); setHasMore(r.hasMore); })
      .catch(() => toast.error('Failed to load links'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [password, dSearch, linkStatus, offerFilter, dateRange, sortBy]);

  useEffect(() => { loadLinks(1); }, [loadLinks]);

  function openDetail(id: string) {
    setDetailLinkId(id);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied! 📋')).catch(() => toast.error('Copy failed'));
  }

  // Actions
  async function handleAction() {
    if (!actionLink || !actionType) return;
    setActing(true);
    try {
      if (actionType === 'extend') {
        if (!actionExpiry) { toast.error('Select new expiry date'); setActing(false); return; }
        await adminExtendLinkExpiry({ password, linkId: actionLink.id, newExpiryDate: actionExpiry, reason: actionReason || undefined });
        toast.success('Expiry extended');
      } else {
        const statusMap = { pause: 'Paused', terminate: 'Terminated', revoke: 'Revoked' } as const;
        await adminUpdateLinkStatus({ password, linkId: actionLink.id, targetStatus: statusMap[actionType], reason: actionReason || undefined });
        toast.success(`Link ${actionType}d successfully`);
      }
      setActionLink(null); setActionType(''); setActionReason(''); setActionExpiry('');
      loadLinks(page, true);
    } catch (e: unknown) {
      toast.error(String((e as { message?: string })?.message || 'Action failed'));
    } finally { setActing(false); }
  }

  async function handleResume(linkId: string) {
    try {
      await adminUpdateLinkStatus({ password, linkId, targetStatus: 'Active' });
      toast.success('Link resumed ✅');
      loadLinks(page, true);
    } catch (e: unknown) { toast.error(String((e as { message?: string })?.message || 'Resume failed')); }
  }

  async function handleQuickStatus(linkId: string, status: 'Active' | 'Paused' | 'Disabled') {
    try {
      await adminUpdateReferralLink({ password, id: linkId, linkStatus: status });
      toast.success(`Status → ${status} ✅`);
      loadLinks(page, true);
    } catch (e: unknown) { toast.error(String((e as { message?: string })?.message || 'Failed')); }
  }

  // Create
  async function loadCreateOffers() {
    try {
      const res = await adminGetOffers({ password });
      setCreateOffers(res.offers.filter((o: { status?: string }) => o.status === 'Active').map((o: { id: string; name?: string; payout?: number; referralAdminCut?: number; referralDefaultReferrerCut?: number; referralDefaultUserEstimate?: number }) => ({
        id: o.id, name: o.name || '',
        slug: (o.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        payout: o.payout || 0, referralAdminCut: o.referralAdminCut || 0,
        referralDefaultReferrerCut: o.referralDefaultReferrerCut || 0,
        referralDefaultUserEstimate: o.referralDefaultUserEstimate || 0,
      })));
    } catch { toast.error('Failed to load offers'); }
  }

  async function handleCreate() {
    if (!createOffer || !createReferrer) { toast.error('Select offer and enter referrer name'); return; }
    setCreating(true);
    const offer = createOffers.find(o => o.id === createOffer);
    try {
      const res = await adminCreateReferralLink({
        password, offerName: offer?.name || '', offerId: createOffer,
        offerSlug: offer?.slug || undefined, referrerName: createReferrer,
        referrerUpi: createUpi || undefined,
        referrerCut: createReferrerCut ? parseFloat(createReferrerCut) : undefined,
        userCut: createUserCut ? parseFloat(createUserCut) : undefined,
        expiryDate: createExpiry || undefined,
        referralLimit: createLimit ? parseInt(createLimit) : undefined,
        internalNote: createNote || undefined,
      });
      toast.success(`Link created! Code: ${res.referralCode}`);
      setShowCreate(false);
      setCreateOffer(''); setCreateReferrer(''); setCreateUpi(''); setCreateExpiry(''); setCreateLimit(''); setCreateNote(''); setCreateReferrerCut(''); setCreateUserCut('');
      loadLinks(1, true);
    } catch (e: unknown) { toast.error(String((e as { message?: string })?.message || 'Create failed')); }
    finally { setCreating(false); }
  }

  function loadReferrerPerf() { adminGetReferrerPerformance({ password }).then(r => setReferrers(r.referrers)).catch(() => {}); }
  function loadOfferPerf() { adminGetOfferReferralPerformance({ password }).then(r => setOfferPerf(r.offers)).catch(() => {}); }

  const activeFilters = [linkStatus, offerFilter, dateRange !== 'all' ? dateRange : ''].filter(Boolean).length;

  function getContextActions(link: LinkRecord) {
    const actions: { label: string; icon: typeof Play; onClick: () => void; destructive?: boolean }[] = [
      { label: 'View', icon: Eye, onClick: () => openDetail(link.id) },
      { label: 'Copy Link', icon: Copy, onClick: () => copyText(`${appUrl}/refer/${link.referralCode}`) },
    ];
    if (link.linkStatus === 'Active') {
      actions.push({ label: 'Pause', icon: Pause, onClick: () => { setActionLink(link); setActionType('pause'); } });
      actions.push({ label: 'Terminate', icon: XCircle, onClick: () => { setActionLink(link); setActionType('terminate'); }, destructive: true });
    }
    if (link.linkStatus === 'Paused') {
      actions.push({ label: 'Resume', icon: Play, onClick: () => handleResume(link.id) });
      actions.push({ label: 'Terminate', icon: XCircle, onClick: () => { setActionLink(link); setActionType('terminate'); }, destructive: true });
    }
    if (link.linkStatus === 'Expired') {
      actions.push({ label: 'Extend', icon: Clock, onClick: () => { setActionLink(link); setActionType('extend'); } });
    }
    return actions;
  }

  // ────────────────────────── RENDER ──────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Stats */}
      {!stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Links', value: stats.total, icon: '🔗', color: 'text-foreground' },
            { label: 'Active', value: stats.active, icon: '✅', color: 'text-emerald-400' },
            { label: 'Paused', value: stats.paused, icon: '⏸️', color: 'text-amber-400' },
            { label: 'Expired', value: stats.expired, icon: '⏰', color: 'text-gray-400' },
            { label: 'Terminated', value: stats.terminated, icon: '🛑', color: 'text-red-400' },
            { label: 'Revoked', value: stats.revoked, icon: '🚫', color: 'text-red-400' },
            { label: 'Total Clicks', value: stats.totalClicks, icon: '👆', color: 'text-primary' },
            { label: 'Unique Clicks', value: stats.uniqueClicks, icon: '🎯', color: 'text-blue-400' },
            { label: 'Total Leads', value: stats.totalLeads, icon: '👥', color: 'text-foreground' },
            { label: 'Referrers', value: stats.uniqueReferrers, icon: '🪙', color: 'text-violet-400' },
            { label: 'Offers', value: stats.uniqueOffers, icon: '🎯', color: 'text-amber-400' },
            { label: 'Expiring', value: stats.expiringSoon, icon: '⏰', color: stats.expiringSoon > 0 ? 'text-orange-400' : 'text-gray-400' },
            { label: 'Conversion', value: stats.totalClicks > 0 ? `${Math.round((stats.totalLeads / stats.totalClicks) * 100)}%` : '0%', icon: '📈', color: 'text-primary' },
          ].map(card => <MetricCard key={card.label} {...card} />)}
        </div>
      )}

      <Tabs defaultValue="links" onValueChange={v => { if (v === 'referrers') loadReferrerPerf(); if (v === 'offers') loadOfferPerf(); }}>
        {stats && stats.expiringSoon > 0 && (
          <button onClick={() => setLinkStatus('ExpiringSoon')}
            className="w-full flex items-center gap-3 p-4 mb-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl hover:border-orange-500/40 transition-all">
            <Clock size={16} className="text-orange-400 flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-foreground">Expiring Soon</p>
              <p className="text-xs text-muted-foreground">{stats.expiringSoon} active link{stats.expiringSoon > 1 ? 's' : ''} expiring within 7 days</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground -rotate-90" />
          </button>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-card border border-border p-1 h-auto gap-0.5 rounded-2xl">
            <TabsTrigger value="links" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black data-[state=active]:bg-primary data-[state=active]:text-white">
              <Link2 size={12} /> All Links
            </TabsTrigger>
            <TabsTrigger value="referrers" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users size={12} /> Referrers
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black data-[state=active]:bg-primary data-[state=active]:text-white">
              <BarChart2 size={12} /> By Offer
            </TabsTrigger>
          </TabsList>
          <button onClick={() => { setShowCreate(true); loadCreateOffers(); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary/90 transition-all">
            <Plus size={13} /> Generate Link
          </button>
        </div>

        {/* ── All Links ── */}
        <TabsContent value="links" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, offer, code, UPI…"
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${showFilters || activeFilters > 0 ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground'}`}>
                  <Filter size={12} /> Filters
                  {activeFilters > 0 && <span className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">{activeFilters}</span>}
                </button>
                <button onClick={() => loadLinks(page, true)} disabled={refreshing}
                  className="flex items-center gap-1 px-3 py-1.5 bg-background border border-border text-xs rounded-xl hover:border-primary disabled:opacity-60">
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {['', 'Active', 'Paused', 'Expired', 'ExpiringSoon', 'Terminated', 'Revoked'].map(s => (
                <button key={s} onClick={() => setLinkStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${linkStatus === s ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
                  {s === 'ExpiringSoon' ? '⏰ Expiring Soon' : s || 'All'}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="pt-3 border-t border-border grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Date Range</label>
                  <select value={dateRange} onChange={e => setDateRange(e.target.value as typeof dateRange)}
                    className="w-full px-3 py-2 bg-background border border-border text-xs rounded-xl">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Sort</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="w-full px-3 py-2 bg-background border border-border text-xs rounded-xl">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="mostClicks">Most Clicks</option>
                    <option value="mostReferrals">Most Referrals</option>
                    <option value="highestConversion">Highest Conversion</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Offer</label>
                  <input value={offerFilter} onChange={e => setOfferFilter(e.target.value)} placeholder="Filter by offer…"
                    className="w-full px-3 py-2 bg-background border border-border text-xs rounded-xl" />
                </div>
              </div>
            )}
          </div>

          {/* Links table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={14} className="text-primary" />
                <span className="font-syne font-black text-sm text-foreground">Generated Links</span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">{total}</span>
              </div>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : links.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🔗</div>
                <p className="font-syne font-black text-foreground mb-1">No Links Found</p>
                <p className="text-sm text-muted-foreground">Generate your first referral link using the button above.</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-background/30">
                        {['Referrer', 'Offer', 'Code', 'Status', 'Payout', 'Clicks', 'Leads', 'Conv.', 'Created', 'Actions'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {links.map(link => {
                        const conv = link.clickCount > 0 ? Math.round((link.leadCount / link.clickCount) * 100) : 0;
                        const actions = getContextActions(link);
                        return (
                          <tr key={link.id} className="border-b border-border/30 hover:bg-background/40 transition-colors">
                            <td className="px-3 py-3">
                              <p className="text-sm font-black text-primary truncate max-w-[100px]">{link.referrerName || '—'}</p>
                              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{maskUpi(link.referrerUpi)}</p>
                            </td>
                            <td className="px-3 py-3">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-[100px] block">{link.offerName}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono text-muted-foreground">{link.referralCode}</span>
                                <button onClick={() => copyText(`${appUrl}/refer/${link.referralCode}`)} className="p-0.5 text-muted-foreground hover:text-primary"><Copy size={10} /></button>
                              </div>
                            </td>
                            <td className="px-3 py-3"><LinkStatusBadge status={link.linkStatus} /></td>
                            <td className="px-3 py-3">
                              <div className="text-[10px] leading-relaxed">
                                {(link.referrerCut > 0 || link.userCut > 0) ? (
                                  <>
                                    <span className="font-bold text-primary">₹{link.referrerCut}</span>
                                    <span className="text-muted-foreground"> / </span>
                                    <span className="font-bold text-amber-400">₹{link.userCut}</span>
                                  </>
                                ) : <span className="text-muted-foreground">—</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3"><span className="text-sm font-bold text-foreground">{link.clickCount}</span></td>
                            <td className="px-3 py-3"><span className="text-sm font-bold text-foreground">{link.leadCount}</span></td>
                            <td className="px-3 py-3"><span className="text-sm font-bold text-primary">{conv}%</span></td>
                            <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">{fmtDate(link.createdAt)}</td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1">
                                {actions.slice(0, 3).map(a => (
                                  <button key={a.label} onClick={a.onClick} title={a.label}
                                    className={`p-1.5 rounded-lg border transition-all ${a.destructive ? 'border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                                    <a.icon size={11} />
                                  </button>
                                ))}
                                {actions.length > 3 && (
                                  <button onClick={() => openDetail(link.id)} title="More"
                                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                                    <ChevronDown size={11} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-border/30">
                  {links.map(link => {
                    const conv = link.clickCount > 0 ? Math.round((link.leadCount / link.clickCount) * 100) : 0;
                    return (
                      <button key={link.id} onClick={() => openDetail(link.id)} className="w-full text-left p-4 hover:bg-background/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-black text-primary">{link.referrerName || '—'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{maskUpi(link.referrerUpi)}</p>
                          </div>
                          <LinkStatusBadge status={link.linkStatus} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">{link.offerName}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">/{link.referralCode}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px]">
                          <span className="text-foreground font-bold">{link.clickCount} clicks</span>
                          <span className="text-foreground font-bold">{link.leadCount} leads</span>
                          <span className="text-primary font-bold">{conv}% conv</span>
                          {(link.referrerCut > 0 || link.userCut > 0) && (
                            <span className="font-bold">
                              <span className="text-primary">₹{link.referrerCut}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-amber-400">₹{link.userCut}</span>
                            </span>
                          )}
                          <span className="text-muted-foreground ml-auto">{fmtDate(link.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <button disabled={page <= 1} onClick={() => loadLinks(page - 1)}
                    className="px-3 py-1.5 text-xs font-black border border-border rounded-xl disabled:opacity-40">← Prev</button>
                  <span className="text-[10px] text-muted-foreground">{((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total}</span>
                  <button disabled={!hasMore} onClick={() => loadLinks(page + 1)}
                    className="px-3 py-1.5 text-xs font-black border border-border rounded-xl disabled:opacity-40">Next →</button>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Referrers ── */}
        <TabsContent value="referrers" className="mt-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Users size={14} className="text-violet-400" />
              <span className="font-syne font-black text-sm text-foreground">Referrer Performance</span>
            </div>
            {referrers.length === 0 ? (
              <div className="p-12 text-center"><p className="text-muted-foreground">No referrer data yet</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-background/30">
                      {['Referrer', 'Links', 'Clicks', 'Referrals', 'Qualified', 'Completed', 'Conv%', 'Earned', 'Pending'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map(r => (
                      <tr key={r.referrerUpi || r.referrerName} className="border-b border-border/30 hover:bg-background/40">
                        <td className="px-3 py-3">
                          <p className="text-sm font-black text-primary truncate max-w-[120px]">{r.referrerName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{maskUpi(r.referrerUpi)}</p>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-foreground">{r.totalLinks} <span className="text-emerald-400 text-[10px]">({r.activeLinks} active)</span></td>
                        <td className="px-3 py-3 text-sm font-bold text-primary">{r.totalClicks}</td>
                        <td className="px-3 py-3 text-sm font-bold text-foreground">{r.totalReferrals}</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{r.qualified}</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{r.completed}</td>
                        <td className="px-3 py-3 text-sm font-bold text-primary">{r.conversionRate}%</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{fmtCurrency(r.totalEarnings)}</td>
                        <td className="px-3 py-3 text-sm font-bold text-amber-400">{fmtCurrency(r.rewardPending)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── By Offer ── */}
        <TabsContent value="offers" className="mt-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <BarChart2 size={14} className="text-amber-400" />
              <span className="font-syne font-black text-sm text-foreground">Offer Referral Performance</span>
            </div>
            {offerPerf.length === 0 ? (
              <div className="p-12 text-center"><p className="text-muted-foreground">No offer data yet</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-background/30">
                      {['Offer', 'Links', 'Clicks', 'Leads', 'Qualified', 'Completed', 'Conv%', 'CB Paid', 'Reward Paid', 'Pending'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {offerPerf.map(o => (
                      <tr key={o.offerName} className="border-b border-border/30 hover:bg-background/40">
                        <td className="px-3 py-3"><span className="text-sm font-black text-foreground">{o.offerName}</span></td>
                        <td className="px-3 py-3 text-sm font-bold">{o.generatedLinks}</td>
                        <td className="px-3 py-3 text-sm font-bold text-primary">{o.clicks}</td>
                        <td className="px-3 py-3 text-sm font-bold">{o.leads}</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{o.qualified}</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{o.completed}</td>
                        <td className="px-3 py-3 text-sm font-bold text-primary">{o.conversionRate}%</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{fmtCurrency(o.cashbackPaid)}</td>
                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{fmtCurrency(o.rewardPaid)}</td>
                        <td className="px-3 py-3 text-sm font-bold text-amber-400">{fmtCurrency(o.rewardPending)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Link Detail Dashboard ── */}
      <LinkDetailDashboard
        linkId={detailLinkId}
        password={password}
        onClose={() => setDetailLinkId(null)}
        onRefresh={() => loadLinks(page, true)}
        onNavigate={onNavigate}
      />


      {/* ── Action Dialog ── */}
      <AlertDialog open={!!actionType && !!actionLink} onOpenChange={open => { if (!open) { setActionType(''); setActionLink(null); } }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground capitalize">
              {actionType === 'extend' ? '⏰ Extend Expiry' : actionType === 'pause' ? '⏸️ Pause Link' : actionType === 'terminate' ? '🛑 Terminate Link' : '🚫 Revoke Link'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {actionType === 'terminate' && 'This link will permanently stop accepting new referrals. Existing leads remain.'}
              {actionType === 'revoke' && 'This link will be invalidated. Use for fraud or policy violations.'}
              {actionType === 'pause' && 'This link will temporarily stop new referral attribution. You can resume later.'}
              {actionType === 'extend' && 'Set a new expiry date for this link.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            {actionType === 'extend' && (
              <input type="datetime-local" value={actionExpiry} onChange={e => setActionExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
            )}
            <input value={actionReason} onChange={e => setActionReason(e.target.value)}
              placeholder={['terminate', 'revoke'].includes(actionType) ? 'Reason (required for audit)' : 'Reason (optional)'}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={acting || (['terminate', 'revoke'].includes(actionType) && !actionReason)}
              className={`font-black disabled:opacity-60 ${['terminate', 'revoke'].includes(actionType) ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-white'}`}>
              {acting ? 'Processing…' : actionType === 'extend' ? 'Extend' : `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Link`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Link Dialog ── */}
      <AlertDialog open={showCreate} onOpenChange={setShowCreate}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground">🔗 Generate Referral Link</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">Create a new referral link for a selected offer and referrer.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Offer *</label>
              <select value={createOffer} onChange={e => {
                setCreateOffer(e.target.value);
                const sel = createOffers.find(o => o.id === e.target.value);
                if (sel) {
                  const ac = sel.referralAdminCut || 0;
                  const dist = (sel.payout || 0) - ac;
                  const rc = sel.referralDefaultReferrerCut || Math.round(dist / 2);
                  const uc = sel.referralDefaultUserEstimate || (dist - rc);
                  setCreateReferrerCut(String(rc));
                  setCreateUserCut(String(uc));
                }
              }}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl">
                <option value="">Select Offer</option>
                {createOffers.map(o => <option key={o.id} value={o.id}>{o.name} (₹{o.payout})</option>)}
              </select>
            </div>
            {createOffer && (() => {
              const sel = createOffers.find(o => o.id === createOffer);
              if (!sel) return null;
              const ac = sel.referralAdminCut || 0;
              const dist = (sel.payout || 0) - ac;
              return (
                <div className="bg-background border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">Total Payout</span>
                    <span className="font-black text-foreground">₹{sel.payout}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">Admin Cut</span>
                    <span className="font-black text-violet-400">₹{ac}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-bold">Distributable</span>
                    <span className="font-black text-emerald-400">₹{dist}</span>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Referrer Payout ₹</label>
                <input type="number" value={createReferrerCut} onChange={e => setCreateReferrerCut(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl" />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">User Payout ₹</label>
                <input type="number" value={createUserCut} onChange={e => setCreateUserCut(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Referrer Name *</label>
              <input value={createReferrer} onChange={e => setCreateReferrer(e.target.value)} placeholder="Enter referrer name"
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Referrer UPI</label>
              <input value={createUpi} onChange={e => setCreateUpi(e.target.value)} placeholder="e.g. name@upi"
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Expiry Date</label>
                <input type="datetime-local" value={createExpiry} onChange={e => setCreateExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl" />
              </div>
              <div>
                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Referral Limit</label>
                <input type="number" value={createLimit} onChange={e => setCreateLimit(e.target.value)} placeholder="Unlimited"
                  className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Internal Note</label>
              <input value={createNote} onChange={e => setCreateNote(e.target.value)} placeholder="Optional note…"
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate} disabled={creating || !createOffer || !createReferrer}
              className="bg-primary text-white font-black disabled:opacity-60">
              {creating ? 'Generating…' : '🔗 Generate Link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
