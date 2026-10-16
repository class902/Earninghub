import { appOrigin } from '@/lib/appUrl';
import { useEffect, useState, useMemo } from 'react';
import { adminGetOffers, adminDeleteOffer, adminSaveOffer, adminReorderOffer, adminGetLeads } from 'zitejs/api';
import { toast } from 'sonner';
import { RefreshCw, Pencil, Trash2, Clock, Hash, Plus, Search, X, Link2, Copy, ExternalLink, Users, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { slugify } from '@/utils/slugify';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@project/components/ui/dialog';
import type { Offer } from '@/types';

interface Props { password: string; onEdit: (offer: Offer | null) => void; onViewReport?: (offerName: string) => void }

function Toggle({ checked, onChange, loading }: { checked: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <button onClick={onChange} disabled={loading}
      className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${checked ? 'bg-green-500' : 'bg-border'} ${loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null;
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86400000);
  if (daysLeft < 0) return <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><Clock size={9} />EXPIRED</span>;
  if (daysLeft <= 3) return <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"><Clock size={9} />{daysLeft}d left</span>;
  return <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Clock size={9} />{daysLeft}d left</span>;
}

// Lead metrics per offer
interface LeadMetrics { total: number; pending: number; confirmed: number; missing: number; paidCount: number; totalRevenue: number; totalUserPaid: number; totalAdminCut: number }

export default function ManageOffers({ password, onEdit, onViewReport }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [linkModalOffer, setLinkModalOffer] = useState<Offer | null>(null);
  const [editSlugId, setEditSlugId] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [togglingReferral, setTogglingReferral] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [leadMetrics, setLeadMetrics] = useState<Record<string, LeadMetrics>>({});

  function loadOffers(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    Promise.all([
      adminGetOffers({ password }),
      adminGetLeads({ password }).catch(() => ({ leads: [] })),
    ]).then(([res, leadsRes]) => {
      setOffers(res.offers);
      // Compute lead metrics per offer
      const metrics: Record<string, LeadMetrics> = {};
      const leads = (leadsRes as any).leads || [];
      // Build offer lookup for payout info
      const offerMap = new Map(res.offers.map(o => [o.name, o]));
      for (const l of leads) {
        const name = l.offerName || '';
        if (!metrics[name]) metrics[name] = { total: 0, pending: 0, confirmed: 0, missing: 0, paidCount: 0, totalRevenue: 0, totalUserPaid: 0, totalAdminCut: 0 };
        metrics[name].total++;
        const st = (l.status || '').toLowerCase();
        if (st === 'pending' || st === 'under review' || st === 'in review') metrics[name].pending++;
        else if (st === 'approved' || st === 'cashback sent' || st === 'paid') {
          metrics[name].confirmed++;
          // Financial accumulation for confirmed/paid leads
          const ofr = offerMap.get(name);
          if (ofr) {
            const uPay = (ofr as any).userPayout || 0;
            const aPay = (ofr as any).adminPayout || 0;
            const revenue = ofr.payout || (uPay + aPay);
            metrics[name].totalRevenue += revenue;
            metrics[name].totalUserPaid += uPay;
            metrics[name].totalAdminCut += aPay;
          }
          if (st === 'cashback sent' || st === 'paid') metrics[name].paidCount++;
        }
        else if (st === 'missing' || st === 'rejected') metrics[name].missing++;
        else metrics[name].pending++;
      }
      setLeadMetrics(metrics);
    }).catch(() => toast.error('Failed to load offers.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadOffers(); }, [password]);

  const filtered = useMemo(() => {
    if (!search.trim()) return offers;
    const q = search.toLowerCase();
    return offers.filter(o => (o.name || '').toLowerCase().includes(q) || (o.category || '').toLowerCase().includes(q) || (o.tags || '').toLowerCase().includes(q));
  }, [offers, search]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminDeleteOffer({ password, id: pendingDelete.id });
      toast.success(`"${pendingDelete.name}" deleted.`);
      setPendingDelete(null); loadOffers();
    } catch { toast.error('Failed to delete.'); }
    finally { setDeleting(false); }
  }

  function buildOfferPayload(offer: Offer, overrides: Partial<Parameters<typeof adminSaveOffer>[0]> = {}) {
    return {
      password, id: offer.id, name: offer.name, emoji: offer.emoji || '🎯',
      description: offer.description || '', steps: offer.steps || '', payout: offer.payout,
      category: offer.category || '', tags: offer.tags || '', redirectLink: offer.redirectLink || '',
      status: offer.status || 'Active', fieldsConfig: offer.fieldsConfig || '[]',
      formEnabled: offer.formEnabled ?? false, formConfig: offer.formConfig || '{}',
      logoUrl: offer.logoUrl || '', bannerUrl: offer.bannerUrl || '',
      warningPopupImage: offer.warningPopupImage || '', warningPopupActive: offer.warningPopupActive ?? false,
      leadConfigEnabled: offer.leadConfigEnabled ?? true, termsAndConditions: offer.termsAndConditions || '',
      rank: offer.rank ?? 0, expiresAt: offer.expiresAt || '', totalSlots: offer.totalSlots ?? 0,
      filledSlots: offer.filledSlots ?? 0, sampleScreenshotUrl: offer.sampleScreenshotUrl || '',
      isPrivate: offer.isPrivate ?? false, privateSlug: offer.privateSlug || '',
      referralEnabled: offer.referralEnabled ?? false,
      referrerFormConfig: offer.referrerFormConfig || '[]',
      referralAdminCut: (offer as any).referralAdminCut ?? 0,
      referralDefaultReferrerCut: (offer as any).referralDefaultReferrerCut ?? 0,
      referralDefaultUserEstimate: (offer as any).referralDefaultUserEstimate ?? 0,
      payoutDisplay: (offer as any).payoutDisplay || '',
      userPayout: (offer as any).userPayout ?? 0,
      adminPayout: (offer as any).adminPayout ?? 0,
      ...overrides,
    } as any;
  }

  async function handleToggleStatus(offer: Offer) {
    const newStatus = offer.status?.toLowerCase() === 'active' ? 'Inactive' : 'Active';
    setTogglingId(offer.id);
    try {
      await adminSaveOffer(buildOfferPayload(offer, { status: newStatus }));
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: newStatus } : o));
      toast.success(`"${offer.name}" → ${newStatus}`);
    } catch { toast.error('Toggle failed.'); }
    finally { setTogglingId(null); }
  }

  function getOfferPublicUrl(offer: Offer): string {
    const origin = appOrigin();
    if (offer.isPrivate && offer.privateSlug) return `${origin}/exclusive/${offer.privateSlug}`;
    return `${origin}/${slugify(offer.name)}`;
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied! 📋`))
      .catch(() => toast.error('Copy failed'));
  }

  async function handleDuplicate(offer: Offer) {
    setDuplicatingId(offer.id);
    try {
      const newName = `${offer.name} (Copy)`;
      const newSlug = offer.isPrivate ? `${offer.name.replace(/\s+/g, '_')}_Special_Copy` : '';
      const payload = buildOfferPayload(offer, {
        name: newName, status: 'Inactive',
        rank: 0, totalSlots: 0, filledSlots: 0,
        privateSlug: newSlug,
      });
      const { id: _omit, ...duplicatePayload } = payload;
      await adminSaveOffer(duplicatePayload as Parameters<typeof adminSaveOffer>[0]);
      toast.success(`"${offer.name}" duplicated as "${newName}" (Inactive)`);
      loadOffers();
    } catch { toast.error('Duplicate failed.'); }
    finally { setDuplicatingId(null); setLinkModalOffer(null); }
  }

  async function handleToggleReferral(offer: Offer) {
    const newVal = !offer.referralEnabled;
    setTogglingReferral(true);
    try {
      await adminSaveOffer(buildOfferPayload(offer, { referralEnabled: newVal }));
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, referralEnabled: newVal } : o));
      setLinkModalOffer(prev => prev && prev.id === offer.id ? { ...prev, referralEnabled: newVal } : prev);
      toast.success(`Referral ${newVal ? 'enabled' : 'disabled'} for "${offer.name}"`);
    } catch { toast.error('Failed to update referral status.'); }
    finally { setTogglingReferral(false); }
  }

  async function handleReorder(offer: Offer, direction: 'up' | 'down') {
    setReorderingId(offer.id);
    try {
      await adminReorderOffer({ password, offerId: offer.id, direction });
      setOffers(prev => {
        const list = [...prev];
        const idx = list.findIndex(o => o.id === offer.id);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return prev;
        [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
        return list;
      });
    } catch { toast.error('Reorder failed.'); }
    finally { setReorderingId(null); }
  }

  async function handleSaveSlug(offer: Offer) {
    if (!slugInput.trim()) { toast.error('Slug cannot be empty'); return; }
    setSavingSlug(true);
    try {
      await adminSaveOffer(buildOfferPayload(offer, { privateSlug: slugInput.trim() }));
      toast.success('Private slug updated! 🔗');
      setEditSlugId(null);
      setLinkModalOffer(null);
      loadOffers();
    } catch { toast.error('Failed to save slug.'); }
    finally { setSavingSlug(false); }
  }

  const activeCount = offers.filter(o => o.status?.toLowerCase() === 'active').length;
  const privateCount = offers.filter(o => o.isPrivate).length;

  if (loading) return (
    <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl h-16 animate-pulse" />)}</div>
  );

  return (
    <div className="p-5 md:p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '📋', label: 'Total Offers', value: offers.length, color: 'text-foreground' },
          { icon: '🟢', label: 'Active', value: activeCount, color: 'text-green-400' },
          { icon: '🔴', label: 'Inactive', value: offers.length - activeCount, color: 'text-muted-foreground' },
          { icon: '🔒', label: 'Private', value: privateCount, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{s.icon} {s.label}</p>
            <p className={`font-syne font-black text-2xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search offers..."
            className="w-full pl-9 pr-9 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadOffers(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-background border border-border text-xs font-bold rounded-xl hover:border-primary hover:text-primary transition-all disabled:opacity-60">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={() => onEdit(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl text-white bg-gradient-to-r from-primary to-blue-400 hover:opacity-90 transition-all shadow-md">
            <Plus size={13} /> Add New Offer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-syne font-black text-foreground text-sm">All Offers</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">{filtered.length}</span>
            {search && <span className="text-xs text-muted-foreground">filtered from {offers.length}</span>}
          </div>
          <span className="text-[10px] text-muted-foreground hidden sm:block">Toggle switch = Active/Inactive instantly</span>
        </div>

        {/* Reorder Toggle */}
        <div className="px-5 py-2.5 border-b border-border flex items-center gap-3 bg-background/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">↕ Reorder Offers</span>
            <button onClick={() => setReorderMode(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${reorderMode ? 'bg-primary' : 'bg-border'} cursor-pointer`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${reorderMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-[10px] font-black ${reorderMode ? 'text-primary' : 'text-muted-foreground'}`}>
              {reorderMode ? '🟢 ON' : '🔘 OFF'}
            </span>
          </div>
          {reorderMode && !search && <span className="text-[10px] text-muted-foreground">Use ↑ ↓ buttons to reorder offers.</span>}
          {reorderMode && search && <span className="text-[10px] text-amber-400">⚠ Clear search to reorder.</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <p className="font-syne font-black text-foreground text-base mb-2">{search ? `No offers match "${search}"` : 'No offers yet'}</p>
            <p className="text-sm text-muted-foreground">{search ? 'Try a different search term' : 'Create your first offer using the "Add New Offer" button above.'}</p>
          </div>
        ) : (
          /* Card-based layout for mobile compatibility */
          <div className="divide-y divide-border/50">
            {filtered.map((o, idx) => {
              const m = leadMetrics[o.name] || { total: 0, pending: 0, confirmed: 0, missing: 0, paidCount: 0, totalRevenue: 0, totalUserPaid: 0, totalAdminCut: 0 };
              const userPay = (o as any).userPayout || 0;
              const adminPay = (o as any).adminPayout || 0;
              const perTxnRevenue = o.payout || (userPay + adminPay);
              const netProfit = m.totalRevenue - m.totalUserPaid - m.totalAdminCut;
              // Distribution percentages
              const userPct = perTxnRevenue > 0 ? ((userPay / perTxnRevenue) * 100) : 0;
              const adminPct = perTxnRevenue > 0 ? ((adminPay / perTxnRevenue) * 100) : 0;
              const remainPct = 100 - userPct - adminPct;
              // Mismatch check
              const hasMismatch = perTxnRevenue > 0 && Math.abs((userPay + adminPay) - perTxnRevenue) > 1 && adminPay > 0;

              return (
                <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                  className="px-4 py-4 hover:bg-primary/5 transition-colors">
                  {/* Row 1: Identity + Status Toggle */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {o.logoUrl ? (
                        <img src={o.logoUrl} alt={o.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-[10px] font-black text-primary leading-none select-none">
                          {o.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground text-sm leading-tight truncate">{o.name}</span>
                        {o.isPrivate && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/25 flex-shrink-0">🔒</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{o.category}</span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <Toggle checked={o.status?.toLowerCase() === 'active'} onChange={() => handleToggleStatus(o)} loading={togglingId === o.id} />
                      <span className={`text-[10px] font-black min-w-[42px] text-right px-2 py-0.5 rounded-full border ${o.status?.toLowerCase() === 'active' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-muted-foreground bg-muted/30 border-border'}`}>
                        {togglingId === o.id ? '…' : o.status?.toLowerCase() === 'active' ? 'Active' : 'Off'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Per-Transaction Payout */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-background border border-border rounded-xl p-2.5">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Revenue / Txn</p>
                      <p className="font-syne font-black text-foreground text-sm">₹{perTxnRevenue}</p>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-2.5">
                      <p className="text-[9px] font-black text-emerald-400/80 uppercase tracking-wider mb-0.5">User Cashback</p>
                      <p className="font-syne font-black text-emerald-400 text-sm">₹{userPay}</p>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-2.5">
                      <p className="text-[9px] font-black text-violet-400/80 uppercase tracking-wider mb-0.5">Admin Cut</p>
                      <p className="font-syne font-black text-violet-400 text-sm">₹{adminPay}</p>
                    </div>
                  </div>

                  {/* Row 3: Distribution Bar */}
                  {perTxnRevenue > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Distribution</span>
                        {hasMismatch && <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">⚠ Mismatch</span>}
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-border overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${userPct}%` }} />
                        <div className="h-full bg-violet-500 transition-all" style={{ width: `${adminPct}%` }} />
                        <div className="h-full bg-blue-500/40 transition-all" style={{ width: `${Math.max(0, remainPct)}%` }} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] text-emerald-400 font-bold">User {userPct.toFixed(0)}%</span>
                        <span className="text-[9px] text-violet-400 font-bold">Admin {adminPct.toFixed(0)}%</span>
                        {remainPct > 0.5 && <span className="text-[9px] text-blue-400/70 font-bold">Net {remainPct.toFixed(0)}%</span>}
                      </div>
                    </div>
                  )}

                  {/* Row 4: Financial Totals (only when there are leads) */}
                  {m.total > 0 && (
                    <div className="mb-3 p-3 bg-background/60 border border-border rounded-xl">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-2">💰 Financial Totals</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-bold">Total Revenue</p>
                          <p className="font-syne font-black text-foreground text-sm">₹{m.totalRevenue}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-emerald-400/80 font-bold">Total User Paid</p>
                          <p className="font-syne font-black text-emerald-400 text-sm">₹{m.totalUserPaid}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-violet-400/80 font-bold">Total Admin Cut</p>
                          <p className="font-syne font-black text-violet-400 text-sm">₹{m.totalAdminCut}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-blue-400/80 font-bold">Net Profit</p>
                          <p className={`font-syne font-black text-sm ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>₹{netProfit}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 5: Transaction Status */}
                  {m.total > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Transactions</span>
                      <span className="text-[9px] font-black text-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border">{m.total} Total</span>
                      <span className="text-[9px] font-bold text-amber-400" title="Pending / Under Review">🟡 {m.pending} Pending</span>
                      <span className="text-[9px] font-bold text-green-400" title="Approved / Cashback Sent">🟢 {m.confirmed} Completed</span>
                      <span className="text-[9px] font-bold text-red-400" title="Missing / Rejected">🔴 {m.missing} Missing</span>
                    </div>
                  )}

                  {/* Row 6: Slots & Expiry */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {(o as any).payoutDisplay && (
                      <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{(o as any).payoutDisplay}</span>
                    )}
                    {o.totalSlots > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <Hash size={8} />{Math.max(0, o.totalSlots - (o.filledSlots || 0))} left
                      </span>
                    )}
                    <ExpiryBadge expiresAt={o.expiresAt} />
                  </div>

                  {/* Row 7: Actions + Reorder */}
                  <div className="flex items-center gap-2 flex-wrap">{/* same actions */}
                    <button onClick={() => onEdit(o)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-background border border-border text-xs font-bold rounded-lg hover:border-primary hover:text-primary transition-all">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => onViewReport?.(o.name)} title="Campaign Report"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all">
                      <BarChart3 size={11} />
                    </button>
                    <button onClick={() => setPendingDelete(o)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold rounded-lg hover:bg-destructive/20 transition-all">
                      <Trash2 size={11} />
                    </button>
                    <button
                      onClick={() => { setLinkModalOffer(o); setEditSlugId(null); setSlugInput(o.privateSlug || ''); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                      title="Links"
                    >
                      <Link2 size={11} />
                    </button>

                    {reorderMode && !search && (
                      <div className="flex items-center gap-1 ml-auto">
                        {idx > 0 && (
                          <button onClick={() => handleReorder(o, 'up')} disabled={reorderingId !== null}
                            className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-black rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all disabled:opacity-40">
                            <ArrowUp size={10} /> Up
                          </button>
                        )}
                        {idx < filtered.length - 1 && (
                          <button onClick={() => handleReorder(o, 'down')} disabled={reorderingId !== null}
                            className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-black rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all disabled:opacity-40">
                            <ArrowDown size={10} /> Down
                          </button>
                        )}
                        {reorderingId === o.id && <span className="text-[10px] text-primary animate-pulse ml-1">↕</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link Actions Modal */}
      <Dialog open={!!linkModalOffer} onOpenChange={open => { if (!open) { setLinkModalOffer(null); setEditSlugId(null); } }}>
        <DialogContent className="max-w-sm bg-card border-border p-0">
          {linkModalOffer && (
            <>
              <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {linkModalOffer.logoUrl ? (
                      <img src={linkModalOffer.logoUrl} alt={linkModalOffer.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-sm font-black text-primary leading-none select-none">
                        {linkModalOffer.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-syne font-black text-sm text-foreground truncate max-w-[180px]">{linkModalOffer.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Link & sharing actions</p>
                  </div>
                </div>
                {linkModalOffer.isPrivate && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">🔒</span>
                )}
              </div>

              <div className="p-4 space-y-2">
                {/* Copy Offer Link */}
                <button
                  onClick={() => copyText(getOfferPublicUrl(linkModalOffer), 'Offer link')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-all">
                    <ExternalLink size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-foreground">Copy Offer Link</p>
                    <p className="text-[10px] text-muted-foreground truncate">{getOfferPublicUrl(linkModalOffer)}</p>
                  </div>
                  <Copy size={12} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </button>

                {/* Copy Lead Tracker */}
                <button
                  onClick={() => copyText(`${appOrigin()}/user-lead-track`, 'Lead tracker link')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">🔍</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-foreground">Copy Lead Tracker Link</p>
                    <p className="text-[10px] text-muted-foreground truncate">{appOrigin()}/user-lead-track</p>
                  </div>
                  <Copy size={12} className="text-muted-foreground flex-shrink-0" />
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => handleDuplicate(linkModalOffer)}
                  disabled={duplicatingId === linkModalOffer.id}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-left group disabled:opacity-60"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Copy size={15} className="text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-foreground">
                      {duplicatingId === linkModalOffer.id ? '⏳ Duplicating...' : 'Duplicate Offer'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Creates an inactive copy</p>
                  </div>
                </button>

                {/* Referral Toggle */}
                <div className="border-t border-border/60 my-1" />
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${linkModalOffer.referralEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-background border-border'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${linkModalOffer.referralEnabled ? 'bg-emerald-500/15' : 'bg-muted/20'}`}>
                    <Users size={15} className={linkModalOffer.referralEnabled ? 'text-emerald-400' : 'text-muted-foreground'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black ${linkModalOffer.referralEnabled ? 'text-emerald-400' : 'text-foreground'}`}>
                      Referral Program
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {linkModalOffer.referralEnabled ? '🟢 Enabled' : 'Off'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleReferral(linkModalOffer)}
                    disabled={togglingReferral}
                    className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${linkModalOffer.referralEnabled ? 'bg-emerald-500' : 'bg-border'} ${togglingReferral ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${linkModalOffer.referralEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {linkModalOffer.referralEnabled && (
                  <div className="px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">🔗 Master Referral Link</p>
                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                      <span className="flex-1 text-[10px] font-mono text-foreground truncate">{appOrigin()}/{slugify(linkModalOffer.name)}</span>
                      <button onClick={() => copyText(`${appOrigin()}/${slugify(linkModalOffer.name)}`, 'Offer link')}
                        className="p-1 text-muted-foreground hover:text-emerald-400 transition-colors flex-shrink-0"><Copy size={11} /></button>
                    </div>
                  </div>
                )}

                {/* Private Campaign */}
                {linkModalOffer.isPrivate && (
                  <>
                    <div className="border-t border-border/60 my-1" />
                    <button
                      onClick={() => copyText(`${appOrigin()}/exclusive/${linkModalOffer.privateSlug}`, 'Private campaign link')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-border hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-base">🔒</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-purple-400">Copy Private Link</p>
                        <p className="text-[10px] text-muted-foreground truncate">/exclusive/{linkModalOffer.privateSlug}</p>
                      </div>
                      <Copy size={12} className="text-muted-foreground flex-shrink-0" />
                    </button>
                    <div className="px-4 py-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider mb-2.5">✏️ Edit Private Slug</p>
                      <div className="flex gap-2">
                        <input
                          value={editSlugId === linkModalOffer.id ? slugInput : (linkModalOffer.privateSlug || '')}
                          onFocus={() => { setEditSlugId(linkModalOffer.id); setSlugInput(linkModalOffer.privateSlug || ''); }}
                          onChange={e => setSlugInput(e.target.value.replace(/\s+/g, '_'))}
                          placeholder="e.g. AngelOne_Special"
                          className="flex-1 px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-purple-400 font-mono transition-colors"
                        />
                        {editSlugId === linkModalOffer.id && (
                          <button
                            onClick={() => handleSaveSlug(linkModalOffer)}
                            disabled={savingSlug}
                            className="px-3 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 text-[10px] font-black rounded-xl hover:bg-purple-500/25 transition-all disabled:opacity-60 flex-shrink-0"
                          >
                            {savingSlug ? '…' : '✓ Save'}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-4 pb-4">
                <a
                  href={getOfferPublicUrl(linkModalOffer)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-all"
                >
                  <ExternalLink size={12} /> Open Offer Page ↗
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground flex items-center gap-2">
              🗑️ Delete &quot;{pendingDelete?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the offer. This action <strong className="text-destructive">cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black">
              {deleting ? '⏳ Deleting...' : '🗑️ Delete Offer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
