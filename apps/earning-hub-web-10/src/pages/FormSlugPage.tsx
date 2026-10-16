import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getFormBySlug, submitCashbackForm } from 'zitejs/api';
import { uploadFile } from 'zitejs/upload';
import { toast } from 'sonner';
import { Home, Upload, CheckCircle, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import RecaptchaWidget from '@/components/RecaptchaWidget';
import type { CashbackFormField, CashbackFieldType } from '@/types';

type GetFormBySlugOutputType = {
  found: boolean;
  form: {
    id: string; title: string; description: string; fields: string;
    logoUrl: string; bannerUrl: string; sampleScreenshotUrl: string;
    slug: string; isPublic: boolean; partnerLink: string; isEmbed: boolean;
  } | null;
};

function slugifyTitle(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
}

function isUpiField(f: CashbackFormField) { return f.label.toLowerCase().includes('upi') || f.id.includes('upi'); }
function isNameField(f: CashbackFormField) { return f.label.toLowerCase().includes('name') && !f.label.toLowerCase().includes('offer'); }
function isMobileField(f: CashbackFormField) { return f.type === 'tel' || f.label.toLowerCase().includes('mobile') || f.label.toLowerCase().includes('phone'); }
function isEmailField(f: CashbackFormField) { return f.type === 'email' || f.label.toLowerCase().includes('email'); }
function isFileField(f: CashbackFormField) { return f.type === 'file'; }
function toTitleCase(s: string) { return s.replace(/\b[a-z]/g, c => c.toUpperCase()); }

function getFieldError(f: CashbackFormField, val: string): string | null {
  const v = val.trim();
  if (f.required && !v) return 'Required';
  if (!v) return null;
  if (isUpiField(f) && !v.includes('@')) return 'Must contain @';
  if (isEmailField(f) && !v.includes('@')) return 'Must contain @';
  if (isMobileField(f) && !/^\d{10}$/.test(v)) return '10 digits required';
  return null;
}

// ── Drag-and-Drop File Upload ─────────────────────────────────────────────────
function FileUpload({ field, value, onChange }: { field: CashbackFormField; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function processFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 MB'); return; }
    setUploading(true);
    if (file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file));
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      onChange(fileUrl); setFileName(file.name);
    } catch { toast.error('Upload failed'); setPreviewUrl(null); }
    finally { setUploading(false); }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []); // eslint-disable-line

  return (
    <motion.div
      onDragEnter={e => { e.preventDefault(); setDragging(true); }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { e.preventDefault(); setDragging(false); }}
      onDrop={onDrop}
      onClick={() => !value && ref.current?.click()}
      animate={{ scale: dragging ? 1.02 : 1 }}
      className={`border-2 border-dashed rounded-2xl transition-all cursor-pointer ${dragging ? 'border-primary/70 bg-primary/8' : value ? 'border-green-500/50 bg-green-500/5 cursor-default' : 'border-border hover:border-primary/40'}`}
    >
      {value ? (
        <div className="p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
          <span className="text-sm font-black text-green-400 truncate flex-1">{fileName || 'Uploaded'}</span>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setPreviewUrl(null); setFileName(''); }}
            className="text-xs font-black px-2 py-1 bg-destructive/80 text-white rounded-lg">Replace</button>
        </div>
      ) : (
        <div className="p-6 flex flex-col items-center gap-2">
          {uploading ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <Upload size={22} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{dragging ? 'Drop to upload' : 'Click or drag file'}</p>
              <p className="text-xs text-muted-foreground/60">JPG · PNG · PDF · Max 10 MB</p>
            </>
          )}
        </div>
      )}
      {previewUrl && <img src={previewUrl} alt="preview" className="w-full max-h-32 object-cover rounded-b-xl" />}
      <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
    </motion.div>
  );
}

// ── Floating Label Input ──────────────────────────────────────────────────────
function FloatInput({ f, value, error, onChange }: { f: CashbackFormField; value: string; error: string | null; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value.length > 0;
  if (f.type === 'file') return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let v = e.target.value;
    if (isNameField(f)) { v = v.replace(/[^a-zA-Z\s]/g, ''); v = toTitleCase(v); }
    if (isMobileField(f)) v = v.replace(/\D/g, '').slice(0, 10);
    onChange(v);
  };

  const cls = `w-full px-4 pt-6 pb-3 bg-card/50 border rounded-xl text-foreground text-sm focus:outline-none transition-all font-satoshi ${error ? 'border-destructive' : focused ? 'border-primary' : 'border-border'}`;

  if (f.type === 'select') return (
    <div className="relative">
      <select value={value} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className={cls + ' appearance-none'}>
        <option value="">— Select —</option>
        {(f.options || '').split(',').map(o => o.trim()).filter(Boolean).map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none font-semibold ${raised ? 'top-1.5 text-[10px] text-primary' : 'top-4 text-sm text-muted-foreground'}`}>{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</label>
    </div>
  );

  if (f.type === 'textarea') return (
    <div className="relative">
      <textarea rows={3} value={value} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className={`w-full px-4 pt-7 pb-3 bg-card/50 border rounded-xl text-foreground text-sm focus:outline-none transition-all resize-none font-satoshi ${error ? 'border-destructive' : focused ? 'border-primary' : 'border-border'}`} />
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none font-semibold ${raised ? 'top-1.5 text-[10px] text-primary' : 'top-4 text-sm text-muted-foreground'}`}>{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</label>
    </div>
  );

  return (
    <div className="relative">
      <input type={isMobileField(f) ? 'tel' : f.type} inputMode={isMobileField(f) ? 'numeric' : undefined}
        value={value} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        maxLength={isMobileField(f) ? 10 : undefined} placeholder={raised ? (f.placeholder || '') : ''}
        className={cls} />
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none font-semibold ${raised ? 'top-1.5 text-[10px] text-primary' : 'top-4 text-sm text-muted-foreground'}`}>
        {isUpiField(f) && <span className="mr-1">💳</span>}{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
    </div>
  );
}

// ── Mini Navbar ───────────────────────────────────────────────────────────────
function MiniNav({ logoUrl, siteName }: { logoUrl?: string; siteName?: string }) {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
      <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
        {logoUrl ? <img src={logoUrl} alt={siteName} className="h-8 w-auto" /> :
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-sm">💰</div>}
        <span className="font-syne font-black text-foreground text-sm hidden sm:block">{siteName || 'EarningHub'}</span>
      </button>
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all text-sm font-semibold">
        <Home size={14} /> Home
      </button>
    </nav>
  );
}

// ── iFrame Embed Shell ────────────────────────────────────────────────────────
function EmbedShell({ form, siteName, logoUrl }: { form: NonNullable<GetFormBySlugOutputType['form']>; siteName?: string; logoUrl?: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MiniNav logoUrl={logoUrl} siteName={siteName} />
      {/* Form header */}
      {form.bannerUrl && <div className="h-28 overflow-hidden"><img src={form.bannerUrl} alt={form.title} className="w-full h-full object-cover" /></div>}
      <div className="px-4 py-4 border-b border-border flex items-center gap-3 bg-card/50">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {form.logoUrl ? <img src={form.logoUrl} alt={form.title} className="w-full h-full object-cover" /> : <span className="text-lg">📝</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-syne font-black text-foreground">{form.title}</p>
          {form.description && <p className="text-xs text-muted-foreground truncate">{form.description}</p>}
        </div>
        <a href={form.partnerLink} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all">
          <ExternalLink size={12} /> Open Direct
        </a>
      </div>
      {/* Partner Form iFrame */}
      <div className="flex-1 flex flex-col">
        <iframe
          src={form.partnerLink}
          className="w-full flex-1 border-0"
          style={{ minHeight: 'calc(100vh - 180px)' }}
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen; clipboard-read; clipboard-write"
          title={form.title}
        />
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-background">
        <p className="text-xs text-muted-foreground">🔒 Securely embedded by {siteName || 'EarningHub'}</p>
        <button onClick={() => navigate('/')} className="text-xs font-black text-primary hover:underline">← Back to Home</button>
      </div>
    </div>
  );
}

// ── Standalone Form ───────────────────────────────────────────────────────────
function StandaloneForm({ form, siteName, logoUrl }: { form: NonNullable<GetFormBySlugOutputType['form']>; siteName?: string; logoUrl?: string }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  let fields: CashbackFormField[] = [];
  try { fields = JSON.parse(form.fields); } catch {}
  const sortedFields = [...fields].filter(f => f.enabled !== false).sort((a, b) => a.order - b.order);

  function setVal(id: string, v: string) {
    setValues(p => ({ ...p, [id]: v }));
    setErrors(e => ({ ...e, [id]: '' }));
  }

  async function handleSubmit() {
    if (!captchaVerified) { toast.error("Please verify you're not a robot"); return; }
    const errs: Record<string, string> = {};
    sortedFields.forEach(f => {
      if (f.type === 'file') { if (f.required && !values[f.id]) errs[f.id] = 'Please upload a file'; return; }
      const err = getFieldError(f, values[f.id] || '');
      if (err) errs[f.id] = err;
    });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Fix highlighted fields'); return; }

    setLoading(true);
    try {
      const labeled: Record<string, string> = {};
      sortedFields.forEach(f => { labeled[f.label] = values[f.id] || ''; });
      await submitCashbackForm({ formId: form.id, formTitle: form.title, submissionData: JSON.stringify(labeled) });
      setDone(true);
    } catch { toast.error('Submission failed. Please try again.'); }
    finally { setLoading(false); }
  }

  function resetForm() {
    setValues({}); setErrors({}); setDone(false); setCaptchaVerified(false);
  }

  const fileFields = sortedFields.filter(isFileField);
  const nonFileFields = sortedFields.filter(f => !isFileField(f));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MiniNav logoUrl={logoUrl} siteName={siteName} />

      {form.bannerUrl && (
        <div className="h-40 overflow-hidden relative">
          <img src={form.bannerUrl} alt={form.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        </div>
      )}

      <div className="flex-1 px-4 py-8 max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="success" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320 }}
                className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-4xl mx-auto mb-6"
                style={{ boxShadow: '0 0 40px rgba(240,180,41,0.2)' }}>🎉</motion.div>
              <h2 className="font-syne font-black text-2xl text-foreground mb-2">Proof Submitted!</h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto">Our team will verify and send your cashback within 24 hours.</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <motion.button onClick={resetForm} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  className="py-3.5 rounded-xl font-syne font-black text-sm border border-border text-foreground hover:border-primary transition-all">
                  Submit Another
                </motion.button>
                <motion.button onClick={() => navigate('/')} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  className="py-3.5 rounded-xl font-syne font-black text-sm flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)', color: '#000' }}>
                  Home 🏠
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logoUrl ? <img src={form.logoUrl} alt={form.title} className="w-full h-full object-cover" /> : <span className="text-xl">📝</span>}
                </div>
                <div>
                  <h1 className="font-syne font-black text-xl text-foreground">{form.title}</h1>
                  {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
                </div>
              </div>

              <div className="space-y-4">
                {nonFileFields.map(f => (
                  <div key={f.id}>
                    <FloatInput f={f} value={values[f.id] || ''} error={errors[f.id] || null} onChange={v => setVal(f.id, v)} />
                    {errors[f.id] && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {errors[f.id]}
                      </motion.p>
                    )}
                  </div>
                ))}

                {fileFields.length > 0 && (
                  <div className="space-y-3">
                    {form.sampleScreenshotUrl && (
                      <div className="rounded-xl border border-amber-500/30 overflow-hidden bg-amber-500/5 p-3">
                        <p className="text-[11px] font-black text-amber-400 mb-2">📸 Sample — How Your Screenshot Should Look</p>
                        <img src={form.sampleScreenshotUrl} alt="Sample" className="w-full max-h-32 object-contain rounded-lg border border-border/30" />
                      </div>
                    )}
                    {fileFields.map(f => (
                      <div key={f.id}>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">
                          {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                        </p>
                        <FileUpload field={f} value={values[f.id] || ''} onChange={v => setVal(f.id, v)} />
                        {errors[f.id] && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1 flex items-center gap-1">
                            <AlertCircle size={11} /> {errors[f.id]}
                          </motion.p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1">
                  <RecaptchaWidget verified={captchaVerified} onVerify={() => setCaptchaVerified(true)} />
                </div>

                <motion.button onClick={handleSubmit} disabled={loading || !captchaVerified}
                  whileHover={!loading && captchaVerified ? { y: -2 } : {}} whileTap={!loading && captchaVerified ? { scale: 0.97 } : {}}
                  className="w-full py-4 rounded-2xl font-syne font-black text-sm text-black disabled:opacity-60 transition-all"
                  style={!loading ? { background: 'linear-gradient(135deg,#f0b429,#ff5722)', boxShadow: '0 8px 32px rgba(240,180,41,0.38)' } : { background: 'rgba(240,180,41,0.4)' }}>
                  {loading ? '⏳ Submitting…' : !captchaVerified ? '☐ Verify above to submit' : '✓ Submit Cashback Proof'}
                </motion.button>

                <p className="text-xs text-muted-foreground text-center">🔒 Data used only for cashback verification</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FormSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { settings } = useAppContext();
  const [formData, setFormData] = useState<GetFormBySlugOutputType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getFormBySlug({ slug })
      .then(data => setFormData(data))
      .catch(() => setFormData({ found: false, form: null }))
      .finally(() => setLoading(false));
  }, [slug]);

  const logoUrl = settings?.webLogoUrl || '';
  const siteName = settings?.siteName || 'EarningHub';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading form…</p>
        </div>
      </div>
    );
  }

  if (!formData?.found || !formData.form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniNav logoUrl={logoUrl} siteName={siteName} />
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="font-syne font-black text-2xl text-foreground mb-2">Form Not Found</h2>
          <p className="text-muted-foreground text-sm mb-6">This form doesn't exist or is no longer active.</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl font-syne font-black text-sm text-black"
            style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>
            <ArrowLeft size={14} className="inline mr-2" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  const form = formData.form;

  // If embed mode + partner link → render iframe
  if (form.isEmbed && form.partnerLink) {
    return <EmbedShell form={form} siteName={siteName} logoUrl={logoUrl} />;
  }

  // Otherwise render native form
  return <StandaloneForm form={form} siteName={siteName} logoUrl={logoUrl} />;
}
