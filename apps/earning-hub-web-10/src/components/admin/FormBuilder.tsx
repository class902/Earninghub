import { useRef, useState } from 'react';
import { uploadFile } from 'zitejs/upload';
import { toast } from 'sonner';
import type { FormConfig, FormField } from '@/types';
import { DEFAULT_FORM_CONFIG } from '@/types';

interface Props { value: FormConfig; onChange: (cfg: FormConfig) => void }

const FIELD_TYPES = [
  { value: 'text', label: 'Text' }, { value: 'tel', label: 'Mobile' },
  { value: 'email', label: 'Email' }, { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' }, { value: 'textarea', label: 'Paragraph' },
  { value: 'file', label: 'File Upload' },
];
const inp = 'px-3 py-2 bg-background border border-border text-foreground text-sm rounded-lg focus:outline-none focus:border-gold transition-colors w-full font-satoshi';

function newField(): FormField {
  return { id: `f${Date.now()}`, label: 'New Field', type: 'text', required: false, visible: true, placeholder: '' };
}

export default function FormBuilder({ value, onChange }: Props) {
  const cfg = value.fields ? value : DEFAULT_FORM_CONFIG;
  const imgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);

  function upd(patch: Partial<FormConfig>) { onChange({ ...cfg, ...patch }); }
  function updField(id: string, patch: Partial<FormField>) { upd({ fields: cfg.fields.map(f => f.id === id ? { ...f, ...patch } : f) }); }
  function removeField(id: string) { upd({ fields: cfg.fields.filter(f => f.id !== id) }); }
  function addField() { upd({ fields: [...cfg.fields, newField()] }); }
  function updCond(i: number, v: string) { const c = [...cfg.submitConditions]; c[i] = v; upd({ submitConditions: c }); }
  function removeCond(i: number) { upd({ submitConditions: cfg.submitConditions.filter((_, idx) => idx !== i) }); }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Max file size is 10MB'); return; }
    setUploading(true);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      upd({ posterUrl: fileUrl });
      toast.success('Poster uploaded! ✓');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
        <div>
          <p className="font-syne font-black text-foreground text-sm">Enable Cashback Form</p>
          <p className="text-muted-foreground text-xs mt-0.5">Show a lead-collection form for this offer</p>
        </div>
        <button onClick={() => upd({ enabled: !cfg.enabled })}
          className={`w-12 h-6 rounded-full transition-all relative ${cfg.enabled ? 'bg-gold' : 'bg-border'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${cfg.enabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {cfg.enabled && (
        <>
          {/* Form title + button text */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Form Title</label>
              <input className={inp} value={cfg.title} onChange={e => upd({ title: e.target.value })} placeholder="Cashback Form" />
            </div>
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Submit Button Text</label>
              <input className={inp} value={cfg.submitButtonText} onChange={e => upd({ submitButtonText: e.target.value })} placeholder="Submit Application" />
            </div>
          </div>

          {/* Poster section — collapsible */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button onClick={() => setPosterOpen(s => !s)}
              className="w-full flex items-center justify-between px-4 py-3 bg-background/50 hover:bg-background/80 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-base">🖼</span>
                <span className="font-syne font-black text-sm text-foreground">Offer Poster Image (Full-Page Hero)</span>
                {cfg.posterUrl && <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">✓ Set</span>}
              </div>
              <span className="text-muted-foreground text-sm">{posterOpen ? '▲' : '▼'}</span>
            </button>
            {posterOpen && (
              <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
                <p className="text-xs text-muted-foreground">This image appears as a full-width hero banner when users open the offer form. Use a high-quality JPG/PNG (recommended: 1200×600px).</p>
                <div className="flex gap-3">
                  <input className={`${inp} flex-1`} value={cfg.posterUrl || ''} onChange={e => upd({ posterUrl: e.target.value })} placeholder="https://... or upload →" />
                  <button onClick={() => imgRef.current?.click()} disabled={uploading}
                    className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-gold to-fire text-black font-syne font-black text-xs rounded-lg hover:opacity-90 whitespace-nowrap">
                    {uploading ? '⏳' : '⬆ Upload JPG'}
                  </button>
                  <input ref={imgRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handlePosterUpload} />
                </div>
                {cfg.posterUrl && (
                  <div className="relative">
                    <img src={cfg.posterUrl} alt="poster" className="w-full h-36 rounded-xl object-cover border border-border"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-xs text-white px-2 py-1 rounded-lg font-bold">Preview</div>
                    <button onClick={() => upd({ posterUrl: '' })}
                      className="absolute top-2 right-2 w-7 h-7 bg-destructive/80 text-white rounded-full text-xs flex items-center justify-center hover:bg-destructive transition-all">✕</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fields table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">Form Fields</label>
              <button onClick={addField} className="text-xs font-bold px-3 py-1.5 bg-background border border-border rounded-lg hover:border-gold hover:text-gold transition-all">+ Add Field</button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-[32px_32px_1fr_auto_28px] bg-background/50 px-3 py-2 text-xs font-black text-muted-foreground uppercase tracking-wider gap-2">
                <span title="Visible">👁</span><span title="Required">★</span><span>Label · Type</span><span>Placeholder</span><span></span>
              </div>
              {cfg.fields.map((f) => (
                <div key={f.id} className="grid grid-cols-[32px_32px_1fr_auto_28px] items-center px-3 py-2.5 border-t border-border gap-2 hover:bg-background/30 transition-colors">
                  <button onClick={() => updField(f.id, { visible: !f.visible })}
                    className={`w-8 h-8 rounded-lg border text-xs font-black transition-all ${f.visible ? 'bg-gold/10 border-gold text-gold' : 'border-border text-muted-foreground'}`}>👁</button>
                  <button onClick={() => updField(f.id, { required: !f.required })}
                    className={`w-8 h-8 rounded-lg border text-xs font-black transition-all ${f.required ? 'bg-destructive/10 border-destructive text-destructive' : 'border-border text-muted-foreground'}`}>★</button>
                  <div className="flex gap-2 min-w-0">
                    <input value={f.label} onChange={e => updField(f.id, { label: e.target.value })}
                      className="flex-1 px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-gold min-w-0" />
                    <select value={f.type} onChange={e => updField(f.id, { type: e.target.value as FormField['type'] })}
                      className="px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none w-24 flex-shrink-0">
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <input value={f.placeholder || ''} onChange={e => updField(f.id, { placeholder: e.target.value })}
                    placeholder="Placeholder..." className="px-2 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-gold w-28" />
                  <button onClick={() => removeField(f.id)}
                    className="w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs hover:bg-destructive/20 transition-all flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">Submit Conditions</label>
              <button onClick={() => upd({ submitConditions: [...cfg.submitConditions, ''] })}
                className="text-xs font-bold px-3 py-1.5 bg-background border border-border rounded-lg hover:border-gold hover:text-gold transition-all">+ Add</button>
            </div>
            <div className="space-y-2">
              {cfg.submitConditions.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-muted-foreground text-sm">✓</span>
                  <input value={c} onChange={e => updCond(i, e.target.value)} placeholder="Condition..." className={`${inp} flex-1`} />
                  <button onClick={() => removeCond(i)} className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs hover:bg-destructive/20 transition-all flex-shrink-0 flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
