import { useEffect, useRef, useState } from 'react';
import { adminGetPosters, adminSavePoster, adminDeletePoster } from 'zitejs/api';
import { uploadFile } from 'zitejs/upload';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import type { Poster } from '@/types';

interface Props { password: string }

const inp = 'px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-gold transition-colors w-full font-satoshi';

export default function PosterManager({ password }: Props) {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', imageUrl: '', isActive: true, displayOrder: 1 });
  const [editId, setEditId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  function loadPosters() {
    adminGetPosters({ password }).then(r => { setPosters(r.posters); setLoading(false); });
  }
  useEffect(() => { loadPosters(); }, []);

  async function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const { fileUrl } = await uploadFile({ data: file, filename: file.name }); setForm(f => ({ ...f, imageUrl: fileUrl })); toast.success('Image uploaded!'); }
    catch { toast.error('Upload failed.'); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (!form.title || !form.imageUrl) { toast.error('Title and image are required.'); return; }
    try {
      await adminSavePoster({ password, id: editId || undefined, ...form });
      toast.success(editId ? 'Poster updated!' : 'Poster added!');
      setForm({ title: '', imageUrl: '', isActive: true, displayOrder: posters.length + 1 });
      setEditId(null); loadPosters();
    } catch { toast.error('Save failed.'); }
  }

  function handleEdit(p: Poster) {
    setEditId(p.id); setForm({ title: p.title, imageUrl: p.imageUrl, isActive: p.isActive, displayOrder: p.displayOrder });
  }

  async function handleDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await adminDeletePoster({ password, id: pendingDeleteId });
      toast.success('Poster deleted.');
      setPendingDeleteId(null);
      loadPosters();
    } catch { toast.error('Delete failed.'); }
    finally { setDeleting(false); }
  }

  async function toggleActive(p: Poster) {
    try { await adminSavePoster({ password, id: p.id, title: p.title, imageUrl: p.imageUrl, isActive: !p.isActive, displayOrder: p.displayOrder }); loadPosters(); }
    catch { toast.error('Update failed.'); }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="font-syne font-black text-2xl text-foreground mb-6">📢 News Posters / Homepage Banner</h2>

      {/* Upload form */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <h3 className="font-syne font-black text-foreground mb-4">{editId ? '✏️ Edit Poster' : '+ Add New Poster'}</h3>
        <div className="space-y-4">
          <div><label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Title</label>
            <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Diwali Special Offers" /></div>
          <div>
            <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Poster Image</label>
            <div className="flex gap-3">
              <input className={inp} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="Paste image URL or upload →" />
              <button onClick={() => imgRef.current?.click()} disabled={uploading} className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-gold to-fire text-black font-syne font-black text-sm rounded-xl hover:opacity-90 whitespace-nowrap">
                {uploading ? '⏳' : '⬆ Upload JPG'}
              </button>
              <input ref={imgRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleImgUpload} />
            </div>
            {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-3 h-28 rounded-xl object-cover border border-border" onError={e => (e.currentTarget.style.display = 'none')} />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Display Order</label>
              <input type="number" className={inp} value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: +e.target.value }))} /></div>
            <div className="flex items-end pb-0.5">
              <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`w-full py-2.5 rounded-xl border font-syne font-black text-sm transition-all ${form.isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-border text-muted-foreground'}`}>
                {form.isActive ? '✓ Active' : '○ Inactive'}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex-1 py-3 bg-gradient-to-r from-gold to-fire text-black font-syne font-black rounded-xl hover:opacity-90">{editId ? '💾 Update Poster' : '+ Save Poster'}</button>
            {editId && <button onClick={() => { setEditId(null); setForm({ title: '', imageUrl: '', isActive: true, displayOrder: 1 }); }} className="px-5 py-3 bg-card border border-border rounded-xl font-bold text-sm hover:border-gold hover:text-gold transition-all">Cancel</button>}
          </div>
        </div>
      </div>

      {/* Posters list */}
      {loading ? <div className="animate-pulse bg-card border border-border rounded-2xl h-32" /> : posters.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground font-semibold">No posters yet. Upload one above.</div>
      ) : (
        <div className="space-y-3">
          {posters.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="text-lg font-bold text-muted-foreground w-6 text-center">{p.displayOrder}</div>
              {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-20 h-14 rounded-lg object-cover border border-border flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />}
              <div className="flex-1 min-w-0">
                <p className="font-syne font-bold text-foreground truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</p>
              </div>
              <button onClick={() => toggleActive(p)} className={`px-3 py-1 rounded-full text-xs font-black border transition-all ${p.isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-border text-muted-foreground'}`}>
                {p.isActive ? 'LIVE' : 'OFF'}
              </button>
              <button onClick={() => handleEdit(p)} className="px-3 py-1.5 bg-background border border-border text-xs font-bold rounded-lg hover:border-gold hover:text-gold transition-all">Edit</button>
              <button onClick={() => setPendingDeleteId(p.id)} className="px-3 py-1.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold rounded-lg hover:bg-destructive/20 transition-all">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={open => !open && setPendingDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground">Delete this poster?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove the poster from the homepage banner. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black"
            >
              {deleting ? '⏳ Deleting...' : '🗑️ Delete Poster'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
