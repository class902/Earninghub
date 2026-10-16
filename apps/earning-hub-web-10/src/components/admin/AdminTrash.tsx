import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGetTrash, adminRestoreItem, adminPermanentDelete, AdminGetTrashOutputType } from 'zitejs/api';
import { Trash2, RotateCcw, AlertTriangle, CheckSquare, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';

interface Props { password: string }

type TrashedLead = AdminGetTrashOutputType['trashedLeads'][0];
type TrashedOffer = AdminGetTrashOutputType['trashedOffers'][0];

export default function AdminTrash({ password }: Props) {
  const [data, setData] = useState<AdminGetTrashOutputType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'leads' | 'offers'>('leads');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const [confirmPerm, setConfirmPerm] = useState<string | null>(null); // id to confirm perm delete
  const [bulkConfirm, setBulkConfirm] = useState(false);

  function load() {
    setLoading(true);
    adminGetTrash({ password })
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load trash'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [password]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeItems = useMemo(() => {
    if (!data) return [];
    if (tab === 'leads') return data.trashedLeads;
    return data.trashedOffers;
  }, [data, tab]);

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === activeItems.length) setSelected(new Set());
    else setSelected(new Set(activeItems.map(i => i.id)));
  }

  async function restoreItem(id: string, type: 'lead' | 'offer', previousStatus?: string) {
    setWorking(true);
    try {
      await adminRestoreItem({ password, id, type, previousStatus });
      toast.success(`${type === 'lead' ? 'Lead' : 'Offer'} restored ✓`);
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      load();
    } catch {
      toast.error('Restore failed');
    } finally { setWorking(false); }
  }

  async function permanentDeleteItem(id: string, type: 'lead' | 'offer') {
    setWorking(true);
    try {
      await adminPermanentDelete({ password, id, type });
      toast.success('Permanently deleted');
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      setConfirmPerm(null);
      load();
    } catch {
      toast.error('Delete failed');
    } finally { setWorking(false); }
  }

  async function bulkRestore() {
    setWorking(true);
    const type = tab === 'leads' ? 'lead' : 'offer';
    try {
      await Promise.all([...selected].map(id => adminRestoreItem({ password, id, type })));
      toast.success(`${selected.size} item${selected.size !== 1 ? 's' : ''} restored ✓`);
      setSelected(new Set());
      load();
    } catch {
      toast.error('Bulk restore failed');
    } finally { setWorking(false); }
  }

  async function bulkPermanentDelete() {
    setWorking(true);
    const type = tab === 'leads' ? 'lead' : 'offer';
    try {
      await Promise.all([...selected].map(id => adminPermanentDelete({ password, id, type })));
      toast.success(`${selected.size} item${selected.size !== 1 ? 's' : ''} permanently deleted`);
      setSelected(new Set());
      setBulkConfirm(false);
      load();
    } catch {
      toast.error('Bulk delete failed');
    } finally { setWorking(false); }
  }

  if (loading) return (
    <div className="p-6 space-y-3">
      {[...Array(5)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl h-16 animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Header banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <Trash2 size={18} className="text-amber-400" />
        </div>
        <div>
          <p className="font-syne font-black text-sm text-amber-400">Global Recycle Bin</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Items here are soft-deleted — they can be restored or permanently removed.
            <strong className="text-destructive ml-1">Permanent deletion cannot be undone.</strong>
          </p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className="font-syne font-black text-2xl text-amber-400">{data?.total ?? 0}</span>
          <p className="text-[10px] text-muted-foreground text-center">Total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'leads' as const, label: 'Trashed Leads', count: data?.trashedLeads.length ?? 0, icon: '👥' },
          { id: 'offers' as const, label: 'Trashed Offers', count: data?.trashedOffers.length ?? 0, icon: '🎯' },
        ]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black border transition-all ${
              tab === t.id ? 'bg-primary border-primary text-white' : 'bg-card border-border text-muted-foreground hover:border-primary/40'
            }`}>
            <span>{t.icon}</span>{t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <span className="font-syne font-black text-sm text-primary">{selected.size} selected</span>
            <button onClick={bulkRestore} disabled={working}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-black rounded-xl hover:bg-green-500/25 disabled:opacity-60 transition-all">
              <RotateCcw size={13} /> Restore All
            </button>
            <button onClick={() => setBulkConfirm(true)} disabled={working}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-destructive/10 border border-destructive/30 text-destructive text-xs font-black rounded-xl hover:bg-destructive/20 disabled:opacity-60 transition-all">
              <Trash2 size={13} /> Delete Permanently
            </button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {activeItems.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="font-syne font-black text-foreground text-lg mb-2">Trash is Empty</p>
          <p className="text-muted-foreground text-sm">No trashed {tab} found. Items you delete will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={toggleAll} className="text-muted-foreground hover:text-primary transition-colors">
                {selected.size === activeItems.length ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
              </button>
              <span className="font-syne font-black text-sm text-foreground">
                {activeItems.length} trashed {tab} {selected.size > 0 && <span className="text-primary">({selected.size} selected)</span>}
              </span>
            </div>
            <AlertTriangle size={14} className="text-amber-400" />
          </div>

          <div className="divide-y divide-border/40">
            {tab === 'leads' && (data?.trashedLeads ?? []).map((item: TrashedLead, idx: number) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className={`px-5 py-4 flex items-center gap-3 hover:bg-background/40 transition-colors ${selected.has(item.id) ? 'bg-primary/5' : ''}`}>
                <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                  {selected.has(item.id) ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-syne font-black text-sm text-foreground truncate">{item.name || item.leadId}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{item.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.offerName} · ₹{item.offerPayout}</p>
                  {item.trashedAt && (
                    <p className="text-[10px] text-rose-400 mt-0.5">🗑️ Trashed: {new Date(item.trashedAt).toLocaleString('en-IN')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => restoreItem(item.id, 'lead')} disabled={working}
                    title="Restore"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-black hover:bg-green-500/20 disabled:opacity-50 transition-all">
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button onClick={() => setConfirmPerm(item.id)} disabled={working} title="Permanently Delete"
                    className="p-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}

            {tab === 'offers' && (data?.trashedOffers ?? []).map((item: TrashedOffer, idx: number) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className={`px-5 py-4 flex items-center gap-3 hover:bg-background/40 transition-colors ${selected.has(item.id) ? 'bg-primary/5' : ''}`}>
                <button onClick={() => toggleSelect(item.id)} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                  {selected.has(item.id) ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-syne font-black text-sm text-foreground truncate">{item.name}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">{item.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">₹{item.payout} payout</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => restoreItem(item.id, 'offer', 'Inactive')} disabled={working}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-black hover:bg-green-500/20 disabled:opacity-50 transition-all">
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button onClick={() => setConfirmPerm(item.id)} disabled={working}
                    className="p-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Permanent delete confirm */}
      <AlertDialog open={!!confirmPerm} onOpenChange={open => !open && setConfirmPerm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" /> Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will <strong className="text-destructive">permanently remove</strong> this item from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setConfirmPerm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmPerm) permanentDeleteItem(confirmPerm, tab === 'leads' ? 'lead' : 'offer'); }}
              disabled={working}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black">
              {working ? '⏳ Deleting…' : '🗑️ Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk permanent delete confirm */}
      <AlertDialog open={bulkConfirm} onOpenChange={open => !open && setBulkConfirm(false)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" /> Delete {selected.size} item{selected.size !== 1 ? 's' : ''} forever?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove {selected.size} item{selected.size !== 1 ? 's' : ''} from the database. <strong className="text-destructive">This cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setBulkConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkPermanentDelete} disabled={working}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black">
              {working ? '⏳ Deleting…' : `🗑️ Delete ${selected.size} Forever`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
