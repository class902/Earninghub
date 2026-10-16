import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect, useRef, useMemo } from 'react';
import { adminGetCashbackForms, adminSaveCashbackForm, adminDeleteCashbackForm } from 'zitejs/api';
import { toast } from 'sonner';
import {
  Link2, Globe, Lock, Copy, ExternalLink, Check,
  Search, X, RefreshCw, Plus, ToggleLeft, ToggleRight,
  Eye, EyeOff, MoreVertical, Pencil, Trash2, Files,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@project/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import CashbackFormEditor from './CashbackFormEditor';
import type { CashbackForm, CashbackFormField } from '@/types';

interface Props { password: string }

type AdminForm = {
  id: string; title: string; description: string; isActive: boolean;
  fieldsConfig: string; logoUrl: string; bannerUrl: string; sampleScreenshotUrl: string;
  createdAt: string; slug: string; isPublic: boolean; partnerLink: string; isEmbed: boolean;
};

function parseForm(r: AdminForm): CashbackForm {
  let fields: CashbackFormField[] = [];
  try { fields = JSON.parse(r.fieldsConfig); } catch {}
  return {
    id: r.id, title: r.title, description: r.description, isActive: r.isActive,
    fields, logoUrl: r.logoUrl, bannerUrl: r.bannerUrl, sampleScreenshotUrl: r.sampleScreenshotUrl,
    createdAt: r.createdAt, slug: r.slug, isPublic: r.isPublic,
    partnerLink: r.partnerLink, isEmbed: r.isEmbed,
  };
}

function getFormUrl(slug: string) {
  return `${appOrigin()}/form/${slug || 'no-slug-yet'}`;
}

// ── 🔗 Form Link Popup Modal ───────────────────────────────────────────────────
function FormLinkModal({ form, open, onClose }: {
  form: AdminForm | null; open: boolean; onClose: () => void;
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  if (!form) return null;
  const safeForm = form;
  const url = getFormUrl(safeForm.slug);
  const isPublic = safeForm.isPublic;

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true); toast.success('URL copied!');
      setTimeout(() => setCopiedUrl(false), 2000);
    }).catch(() => toast.error('Copy failed'));
  }

  function copyFull() {
    const text = `📝 ${safeForm.title}\n🔗 ${url}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFull(true); toast.success(`🔗 Copied: "${safeForm.title}" link!`);
      setTimeout(() => setCopiedFull(false), 2000);
    }).catch(() => toast.error('Copy failed'));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 border-b border-border/50 ${isPublic ? 'bg-gradient-to-br from-blue-500/8 to-green-500/4' : 'bg-gradient-to-br from-amber-500/8 to-orange-500/4'}`}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-xl flex-shrink-0 overflow-hidden shadow-sm">
                {safeForm.logoUrl ? <img src={safeForm.logoUrl} alt={safeForm.title} className="w-full h-full object-cover" /> : '📝'}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="font-syne font-black text-foreground text-base leading-tight truncate">{safeForm.title}</DialogTitle>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${isPublic ? 'bg-green-500/10 text-green-400 border-green-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}`}>
                    {isPublic ? <Globe size={8} /> : <Lock size={8} />}
                    {isPublic ? 'General Mode 🌐' : 'Private Mode 🔒'}
                  </span>
                  {safeForm.isActive
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">● Active</span>
                    : <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-border/50 text-muted-foreground border-border">○ Inactive</span>
                  }
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className={`text-xs rounded-xl px-4 py-3 border ${isPublic ? 'bg-blue-500/5 border-blue-500/15 text-blue-300' : 'bg-amber-500/5 border-amber-500/15 text-amber-300'}`}>
            {isPublic ? '🌐 Publicly accessible — anyone with the link can submit their proof.' : '🔒 Private mode — only share this link with intended recipients.'}
          </div>

          {/* URL field */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5"><Link2 size={9} /> Form Link</p>
            <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
              <span className="flex-1 text-xs font-mono text-primary/80 truncate select-all" title={url}>{url}</span>
              <button onClick={copyUrl} title="Copy URL"
                className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${copiedUrl ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}>
                {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={copyFull}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-syne font-black text-xs transition-all ${copiedFull ? 'bg-green-500/10 border-green-500/25 text-green-400' : 'bg-muted/30 border-border hover:border-primary/40 hover:bg-primary/5 text-foreground'}`}>
              {copiedFull ? <Check size={13} /> : <Copy size={13} />}
              {copiedFull ? 'Copied!' : 'Copy Title + Link'}
            </button>
            <button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-syne font-black text-xs text-black transition-all hover:opacity-90 active:scale-95 shadow-sm"
              style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>
              <ExternalLink size={13} /> Open Form ↗
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            Slug: <code className="bg-muted px-1 rounded font-mono">{safeForm.slug || 'not-set'}</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ⋮ Context Menu Dropdown ────────────────────────────────────────────────────
function FormContextMenu({ form, onTogglePublic, onToggleActive, onDuplicate, onEdit, onDelete }: {
  form: AdminForm;
  onTogglePublic: () => void;
  onToggleActive: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [open]);

  const items = [
    {
      icon: form.isActive ? <EyeOff size={13} className="text-muted-foreground" /> : <Eye size={13} className="text-green-400" />,
      label: form.isActive ? 'Deactivate Form' : 'Activate Form',
      desc: form.isActive ? 'Hide from homepage' : 'Show on homepage',
      action: onToggleActive,
      className: '',
    },
    {
      icon: form.isPublic ? <Lock size={13} className="text-amber-400" /> : <Globe size={13} className="text-blue-400" />,
      label: form.isPublic ? 'Switch to Private 🔒' : 'Switch to General 🌐',
      desc: form.isPublic ? 'Link-only access' : 'Show in /forms listing',
      action: onTogglePublic,
      className: '',
    },
    {
      icon: <Files size={13} className="text-primary" />,
      label: 'Duplicate Form',
      desc: 'Create an inactive copy',
      action: onDuplicate,
      className: '',
    },
    {
      icon: <Pencil size={13} className="text-primary" />,
      label: 'Edit Form',
      desc: 'Edit fields & settings',
      action: onEdit,
      className: '',
    },
    {
      icon: <Trash2 size={13} className="text-destructive" />,
      label: 'Delete Form',
      desc: 'Permanently remove',
      action: onDelete,
      className: 'hover:bg-destructive/10',
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-xl border transition-all ${open ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {items.map((item, i) => (
            <button key={i}
              onClick={() => { item.action(); setOpen(false); }}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-all text-left ${i < items.length - 1 ? 'border-b border-border/40' : ''} ${item.className}`}>
              <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="font-syne font-black text-xl text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminCashbackForms({ password }: Props) {
  const [forms, setForms] = useState<AdminForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editForm, setEditForm] = useState<CashbackForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkModalForm, setLinkModalForm] = useState<AdminForm | null>(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadForms(silent = false) {
    if (!silent) setLoading(true); else setRefreshing(true);
    try { const r = await adminGetCashbackForms({ password }); setForms(r.forms as AdminForm[]); }
    catch { toast.error('Failed to load forms'); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { loadForms(); }, [password]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = forms;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q));
    }
    if (filterActive !== 'all') list = list.filter(f => filterActive === 'active' ? f.isActive : !f.isActive);
    if (filterVisibility !== 'all') list = list.filter(f => filterVisibility === 'public' ? f.isPublic : !f.isPublic);
    return list;
  }, [forms, search, filterActive, filterVisibility]);

  // Stats
  const stats = useMemo(() => ({
    total: forms.length,
    active: forms.filter(f => f.isActive).length,
    general: forms.filter(f => f.isPublic).length,
    private: forms.filter(f => !f.isPublic).length,
  }), [forms]);

  async function handleSave(data: Omit<CashbackForm, 'id' | 'createdAt'> & { id?: string }) {
    setSaving(true);
    try {
      await adminSaveCashbackForm({
        password, id: data.id, title: data.title,
        description: data.description, isActive: data.isActive,
        fieldsConfig: JSON.stringify(data.fields),
        logoUrl: data.logoUrl || '', bannerUrl: data.bannerUrl || '',
        sampleScreenshotUrl: data.sampleScreenshotUrl || '',
        isPublic: data.isPublic ?? true,
        partnerLink: data.partnerLink || '',
        isEmbed: data.isEmbed ?? false,
      });
      toast.success(data.id ? 'Form updated! ✓' : 'Form created! ✓');
      await loadForms();
      setView('list');
    } catch { toast.error('Save failed. Try again.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try { await adminDeleteCashbackForm({ password, id }); toast.success('Form deleted'); setForms(p => p.filter(f => f.id !== id)); }
    catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  }

  async function toggleField(form: AdminForm, field: 'isPublic' | 'isActive') {
    setTogglingId(form.id + field);
    try {
      const updated = { ...form, [field]: !form[field] };
      await adminSaveCashbackForm({
        password, id: form.id, title: form.title, description: form.description,
        isActive: updated.isActive, fieldsConfig: form.fieldsConfig,
        logoUrl: form.logoUrl, bannerUrl: form.bannerUrl, sampleScreenshotUrl: form.sampleScreenshotUrl,
        isPublic: updated.isPublic, partnerLink: form.partnerLink, isEmbed: form.isEmbed,
      });
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, [field]: !f[field] } : f));
      if (field === 'isPublic') toast.success(`Form set to ${!form.isPublic ? 'General 🌐' : 'Private 🔒'}`);
      else toast.success(`Form ${!form.isActive ? 'activated ✅' : 'deactivated ○'}`);
    } catch { toast.error('Update failed'); }
    finally { setTogglingId(null); }
  }

  async function handleDuplicate(form: AdminForm) {
    try {
      await adminSaveCashbackForm({
        password, title: `${form.title} (Copy)`, description: form.description,
        isActive: false, fieldsConfig: form.fieldsConfig,
        logoUrl: form.logoUrl, bannerUrl: form.bannerUrl, sampleScreenshotUrl: form.sampleScreenshotUrl,
        isPublic: form.isPublic, partnerLink: form.partnerLink, isEmbed: form.isEmbed,
      });
      toast.success(`"${form.title}" duplicated as inactive copy ✓`);
      await loadForms(true);
    } catch { toast.error('Duplicate failed'); }
  }

  if (view === 'editor') {
    return (
      <div className="p-6 max-w-3xl">
        <CashbackFormEditor form={editForm} saving={saving} onSave={handleSave} onCancel={() => setView('list')} />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 space-y-5">
      {/* Form Link Modal */}
      <FormLinkModal form={linkModalForm} open={!!linkModalForm} onClose={() => setLinkModalForm(null)} />

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{forms.find(f => f.id === deletingId)?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the form. Existing submissions are unaffected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) handleDelete(deletingId); }} className="bg-destructive text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{forms.find(f => f.id === deletingId)?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the form. Existing submissions are unaffected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deletingId) handleDelete(deletingId); }} className="bg-destructive text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-syne font-black text-2xl text-foreground">📝 Cashback Forms</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Proof submission forms — shareable at <code className="text-xs bg-muted px-1 rounded">/form/[slug]</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadForms(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground text-xs font-bold rounded-xl hover:border-primary hover:text-primary transition-all disabled:opacity-60">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={() => { setEditForm(null); setView('editor'); }}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-gold to-fire text-black font-syne font-black text-sm rounded-xl hover:opacity-90 transition-all shadow-sm">
            <Plus size={14} /> Create Form
          </button>
        </div>
      </div>

      {/* Stats */}
      {forms.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Forms" value={stats.total} icon="📋" color="bg-primary/10" />
          <StatCard label="Active" value={stats.active} icon="✅" color="bg-green-500/10" />
          <StatCard label="General (Public)" value={stats.general} icon="🌐" color="bg-blue-500/10" />
          <StatCard label="Private" value={stats.private} icon="🔒" color="bg-amber-500/10" />
        </div>
      )}

      {/* Toolbar */}
      {forms.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search forms by title, slug..."
              className="w-full pl-9 pr-8 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
          </div>

          {/* Active filter */}
          <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
            {(['all', 'active', 'inactive'] as const).map(v => (
              <button key={v} onClick={() => setFilterActive(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${filterActive === v ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {v === 'all' ? 'All' : v === 'active' ? '✅ Active' : '○ Inactive'}
              </button>
            ))}
          </div>

          {/* Visibility filter */}
          <div className="flex items-center gap-1 p-1 bg-background border border-border rounded-xl">
            {(['all', 'public', 'private'] as const).map(v => (
              <button key={v} onClick={() => setFilterVisibility(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition-all ${filterVisibility === v ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {v === 'all' ? 'All' : v === 'public' ? '🌐 General' : '🔒 Private'}
              </button>
            ))}
          </div>

          {filtered.length !== forms.length && (
            <span className="text-xs text-muted-foreground">{filtered.length} of {forms.length} shown</span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-24 bg-card border-2 border-dashed border-border rounded-2xl">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-syne font-black text-xl text-foreground mb-2">No Cashback Forms Yet</p>
          <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">Create custom forms for users to submit proof after completing an offer.</p>
          <button onClick={() => { setEditForm(null); setView('editor'); }}
            className="px-6 py-3 bg-gradient-to-r from-gold to-fire text-black font-syne font-black text-sm rounded-xl hover:opacity-90">
            Create First Form
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-syne font-black text-foreground mb-1">No forms match your filters</p>
          <button onClick={() => { setSearch(''); setFilterActive('all'); setFilterVisibility('all'); }}
            className="text-xs text-primary hover:underline mt-2 font-bold">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const form = parseForm(r);
            const url = getFormUrl(r.slug);
            const isTogglingActive = togglingId === r.id + 'isActive';
            const isTogglingPublic = togglingId === r.id + 'isPublic';

            return (
              <div key={r.id}
                className={`bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-md group ${r.isActive ? 'border-border hover:border-primary/30' : 'border-border/50 opacity-75'}`}>
                {/* Active status bar at top */}
                <div className={`h-0.5 ${r.isActive ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-border'}`} />

                {r.bannerUrl && (
                  <div className="h-16 overflow-hidden relative">
                    <img src={r.bannerUrl} alt={r.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity group-hover:scale-105 duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                      {r.logoUrl ? <img src={r.logoUrl} alt={r.title} className="w-full h-full object-cover" /> : '📝'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-syne font-black text-foreground">{r.title}</p>
                        {/* Active badge */}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 transition-all ${r.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-border/50 text-muted-foreground border-border'}`}>
                          {r.isActive ? '● ACTIVE' : '○ INACTIVE'}
                        </span>
                        {/* Visibility badge */}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${r.isPublic ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {r.isPublic ? '🌐 General' : '🔒 Private'}
                        </span>
                        {r.isEmbed && r.partnerLink && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 bg-purple-500/10 text-purple-400 border-purple-500/20">📎 Embed</span>
                        )}
                      </div>

                      {r.description && <p className="text-xs text-muted-foreground truncate mb-1">{r.description}</p>}
                      <p className="text-[10px] text-muted-foreground/50 truncate max-w-xs font-mono">{url}</p>
                      <p className="text-xs text-muted-foreground mt-1">{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Active Toggle */}
                      <button
                        onClick={() => toggleField(r, 'isActive')}
                        disabled={isTogglingActive}
                        title={r.isActive ? 'Deactivate form' : 'Activate form'}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black transition-all disabled:opacity-60 ${r.isActive ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'border-border text-muted-foreground hover:border-green-500/30 hover:text-green-400'}`}>
                        {isTogglingActive ? '⏳' : r.isActive ? <><ToggleRight size={13} /> On</> : <><ToggleLeft size={13} /> Off</>}
                      </button>

                      {/* 🔗 Link Button */}
                      <button
                        onClick={() => setLinkModalForm(r)}
                        title="Show Form Link"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-xs font-black">
                        <Link2 size={13} />
                        <span className="hidden sm:inline">Link</span>
                      </button>

                      {/* Edit */}
                      <button onClick={() => { setEditForm(form); setView('editor'); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-black rounded-xl hover:bg-primary/20 transition-all">
                        <Pencil size={12} />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* ⋮ Context menu */}
                      <FormContextMenu
                        form={r}
                        onTogglePublic={() => toggleField(r, 'isPublic')}
                        onToggleActive={() => toggleField(r, 'isActive')}
                        onDuplicate={() => handleDuplicate(r)}
                        onEdit={() => { setEditForm(form); setView('editor'); }}
                        onDelete={() => setDeletingId(r.id)}
                      />
                    </div>
                  </div>

                  {/* Bottom quick-action row */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
                    {/* Visibility quick toggle */}
                    <button
                      onClick={() => toggleField(r, 'isPublic')}
                      disabled={isTogglingPublic}
                      className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-60 ${r.isPublic ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}>
                      {isTogglingPublic ? '⏳' : r.isPublic ? <><Globe size={10} /> Switch Private</> : <><Lock size={10} /> Switch General</>}
                    </button>

                    {/* Copy URL */}
                    <button
                      onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('URL copied!')).catch(() => toast.error('Copy failed'))}
                      className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                      <Copy size={10} /> Copy URL
                    </button>

                    {/* Open form */}
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                      <ExternalLink size={10} /> Open Form
                    </a>

                    <span className="ml-auto text-[10px] text-muted-foreground/40">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
