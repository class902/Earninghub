import { appPath } from '@/lib/appUrl';
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFile } from '@/lib/upload';
import { submitCashbackForm } from '@/lib/api';
import { toast } from 'sonner';
import RecaptchaWidget from '@/components/RecaptchaWidget';
import type { CashbackForm, CashbackFormField } from '@/types';
import { DEFAULT_UI_BUTTONS } from '@/types';
import { Upload, CheckCircle, AlertCircle, ChevronRight, ChevronUp } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import DynamicButton from '@/components/DynamicButton';

interface Props { forms: CashbackForm[] }

type Step = 'fill' | 'success';

// ── Field helpers ─────────────────────────────────────────────────────────────
function isUpiField(f: CashbackFormField) { return f.label.toLowerCase().includes('upi') || f.id.includes('upi'); }
function isNameField(f: CashbackFormField) { return f.label.toLowerCase().includes('name') && !f.label.toLowerCase().includes('offer'); }
function isMobileField(f: CashbackFormField) { return f.type === 'tel' || f.label.toLowerCase().includes('mobile') || f.label.toLowerCase().includes('phone') || f.id.includes('phone'); }
function isEmailField(f: CashbackFormField) { return f.type === 'email' || f.label.toLowerCase().includes('email'); }
function isFileField(f: CashbackFormField) { return f.type === 'file'; }
function isUserDetailsField(f: CashbackFormField) { return isNameField(f) || isMobileField(f) || isEmailField(f); }
function toTitleCase(s: string) { return s.replace(/\b[a-z]/g, c => c.toUpperCase()); }

function getFieldValidationError(f: CashbackFormField, val: string): string | null {
  const v = val.trim();
  if (f.required && !v) return 'This field is required';
  if (!v) return null;
  if (isUpiField(f) && !v.includes('@')) return 'UPI ID must contain "@" (e.g. name@upi)';
  if (isEmailField(f) && !v.includes('@')) return 'Email must contain "@"';
  if (isMobileField(f) && !/^\d{10}$/.test(v)) return 'Mobile must be exactly 10 digits';
  if (isNameField(f) && !/^[a-zA-Z\s]+$/.test(v)) return 'Name must contain letters only';
  return null;
}

// ── Drag-and-Drop File Upload ─────────────────────────────────────────────────
function DragDropFileUpload({ field, value, onChange }: {
  field: CashbackFormField; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function processFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 MB allowed'); return; }
    setUploading(true);
    const localUrl = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) setPreviewUrl(localUrl);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      onChange(fileUrl); setFileName(file.name);
    } catch { toast.error('Upload failed. Try again.'); setPreviewUrl(null); }
    finally { setUploading(false); }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (file) await processFile(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0]; if (file) processFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <motion.div
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={onDrop}
        onClick={() => !value && ref.current?.click()}
        animate={{ scale: dragging ? 1.02 : 1 }}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden ${
          dragging ? 'border-primary/70 bg-primary/8' :
          value ? 'border-green-500/50 bg-green-500/5 cursor-default' :
          'border-border hover:border-primary/40 hover:bg-card/60 cursor-pointer'
        }`}
      >
        {value && (previewUrl || value.match(/\.(jpg|jpeg|png|webp)$/i)) && (
          <div className="relative">
            <img src={previewUrl || value} alt="Upload preview" className="w-full max-h-48 object-cover" onError={() => setPreviewUrl(null)} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-xs font-black text-green-400 truncate max-w-[200px]">{fileName || 'Uploaded'}</span>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setPreviewUrl(null); setFileName(''); if (ref.current) ref.current.value = ''; }}
                className="text-xs font-black px-2 py-1 rounded-lg bg-destructive/80 text-white hover:bg-destructive transition-all">Replace</button>
            </div>
          </div>
        )}
        {value && !previewUrl && !value.match(/\.(jpg|jpeg|png|webp)$/i) && (
          <div className="p-6 flex flex-col items-center gap-2">
            <CheckCircle size={28} className="text-green-400" />
            <p className="text-sm font-black text-green-400">File Uploaded Successfully</p>
            <p className="text-xs text-muted-foreground truncate max-w-full">{fileName || 'File ready'}</p>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setFileName(''); }}
              className="text-xs font-black px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">Replace File</button>
          </div>
        )}
        {!value && (
          <div className="p-8 flex flex-col items-center gap-3">
            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm font-black text-primary">Uploading…</p>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                  <motion.div animate={dragging ? { scale: 1.2, y: -5 } : { scale: [1, 1.06, 1], y: [0, -4, 0] }}
                    transition={dragging ? {} : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Upload size={22} className="text-primary" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-black text-foreground">{dragging ? '📂 Drop here to upload' : 'Drag & drop or click to upload'}</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG · PNG · PDF · Max 10 MB</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} />
      </motion.div>
    </div>
  );
}

// ── Floating Label Input ──────────────────────────────────────────────────────
function FloatingInput({ f, value, error, onChange }: {
  f: CashbackFormField; value: string; error: string | null; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const isUpi = isUpiField(f);
  const isMobile = isMobileField(f);
  const isEmail = isEmailField(f);
  const hasValue = value.length > 0;
  const labelRaised = focused || hasValue;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    let v = e.target.value;
    if (isNameField(f)) { v = v.replace(/[^a-zA-Z\s]/g, ''); v = toTitleCase(v); }
    if (isMobile) { v = v.replace(/\D/g, '').slice(0, 10); }
    onChange(v);
  }

  if (f.type === 'file') return null;

  if (f.type === 'select') {
    return (
      <div className="relative">
        <select value={value} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className={`w-full px-4 py-4 pt-6 bg-card/50 border rounded-xl text-foreground text-sm focus:outline-none transition-all appearance-none font-satoshi ${error ? 'border-destructive' : focused ? 'border-primary' : 'border-border'} ${isUpi ? 'border-amber-500/50 focus:border-amber-500 bg-amber-500/5' : ''}`}>
          <option value="">— Select —</option>
          {(f.options || '').split(',').map(o => o.trim()).filter(Boolean).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <label className={`absolute left-4 transition-all duration-200 pointer-events-none font-semibold ${labelRaised ? 'top-1.5 text-[10px] text-primary' : 'top-4 text-sm text-muted-foreground'}`}>
          {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      </div>
    );
  }

  if (f.type === 'textarea') {
    return (
      <div className="relative">
        <textarea rows={3} value={value} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className={`w-full px-4 pt-7 pb-3 bg-card/50 border rounded-xl text-foreground text-sm focus:outline-none transition-all resize-none font-satoshi ${error ? 'border-destructive' : focused ? 'border-primary' : 'border-border'}`} />
        <label className={`absolute left-4 transition-all duration-200 pointer-events-none font-semibold ${labelRaised ? 'top-1.5 text-[10px] text-primary' : 'top-4 text-sm text-muted-foreground'}`}>
          {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${isUpi ? 'ring-2 ring-amber-500/20' : ''}`}>
      {isUpi && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/8 to-amber-600/4 pointer-events-none" />}
      <input
        type={isMobile ? 'tel' : f.type}
        inputMode={isMobile ? 'numeric' : isEmail ? 'email' : isUpi ? 'email' : undefined}
        value={value} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        maxLength={isMobile ? 10 : undefined} placeholder={labelRaised ? (f.placeholder || '') : ''}
        className={`w-full px-4 pt-6 pb-3 bg-transparent border rounded-xl text-foreground text-sm focus:outline-none transition-all font-satoshi relative ${
          error ? 'border-destructive' : isUpi ? (focused ? 'border-amber-500' : 'border-amber-500/40') : focused ? 'border-primary' : 'border-border'
        }`}
      />
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none font-semibold ${labelRaised ? `top-1.5 text-[10px] ${isUpi ? 'text-amber-500' : 'text-primary'}` : 'top-4 text-sm text-muted-foreground'}`}>
        {isUpi && <span className="mr-1">💳</span>}
        {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {isUpi && focused && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute right-3 top-1/2 -translate-y-1/2">
          {value.includes('@') ? <CheckCircle size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-amber-400" />}
        </motion.div>
      )}
    </div>
  );
}

// ── Wizard Step Badge ─────────────────────────────────────────────────────────
function WizardSteps({ step }: { step: Step }) {
  if (step === 'success') return null;
  return (
    <motion.div animate={{ scale: 1.1 }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-primary/15 border border-primary/40 text-primary">
      <span>📋</span><span className="hidden sm:inline">Submit Proof</span>
    </motion.div>
  );
}

// ── Form Section Card ─────────────────────────────────────────────────────────
function FormSection({ stepNum, title, subtitle, icon, children, accent = 'primary' }: {
  stepNum: number; title: string; subtitle: string; icon: string;
  children: React.ReactNode; accent?: 'primary' | 'amber' | 'emerald';
}) {
  const accentClasses = { primary: 'border-primary/20 bg-primary/4', amber: 'border-amber-500/30 bg-amber-500/6', emerald: 'border-emerald-500/20 bg-emerald-500/4' };
  const numClasses = { primary: 'bg-primary/15 border-primary/30 text-primary', amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400', emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className={`rounded-2xl border p-5 ${accentClasses[accent]}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border flex-shrink-0 ${numClasses[accent]}`}>{stepNum}</div>
        <div>
          <div className="flex items-center gap-1.5"><span className="text-sm">{icon}</span><p className="font-syne font-black text-sm text-foreground">{title}</p></div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ── Collapsed Preview Card ────────────────────────────────────────────────────
function CollapsedPreview({ form, enabledFieldCount, onExpand }: {
  form: { title: string; description: string; logoUrl?: string; bannerUrl?: string };
  enabledFieldCount: number;
  onExpand: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }} className="max-w-2xl mx-auto"
    >
      <div
        onClick={onExpand}
        className="relative rounded-3xl overflow-hidden border border-white/[0.06] cursor-pointer group"
        style={{ background: 'rgba(8,15,36,0.72)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', boxShadow: '0 0 60px rgba(240,180,41,0.06), 0 24px 56px rgba(0,0,0,0.38)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] animate-gradient-border" style={{ backgroundSize: '400% 400%' }} />

        {form.bannerUrl && (
          <div className="h-20 overflow-hidden relative">
            <img src={form.bannerUrl} alt={form.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
          </div>
        )}

        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl border border-gold/25 overflow-hidden flex items-center justify-center text-2xl bg-gold/10 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
            {form.logoUrl ? <img src={form.logoUrl} alt={form.title} className="w-full h-full object-cover" /> : '📝'}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-syne font-black text-foreground text-base leading-tight">{form.title}</p>
            {form.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold">{enabledFieldCount} field{enabledFieldCount !== 1 ? 's' : ''}</span>
              <span className="text-[10px] text-muted-foreground">~2 min</span>
              <span className="text-[10px] text-green-400 font-bold">💸 Cashback in 24 hrs</span>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="px-4 py-2.5 rounded-xl font-syne font-black text-xs text-black whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>
              📝 Open Form
            </div>
            <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} className="text-muted-foreground/50 text-xs">▼</motion.div>
          </motion.div>
        </div>

        <div className="px-6 pb-3 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground/50">Click anywhere to expand and fill the form</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UnifiedCashbackForm({ forms }: Props) {
  const { settings } = useAppContext();
  const form = forms.find(f => f.isActive);

  const cashbackCta = settings?.uiButtons?.find(b => b.id === 'cashback-form-cta')
    ?? DEFAULT_UI_BUTTONS.find(b => b.id === 'cashback-form-cta')!;

  const [formExpanded, setFormExpanded] = useState(false); // starts COLLAPSED
  const [step, setStep] = useState<Step>('fill');
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  if (!form) return null;

  const sortedFields = [...form.fields].filter(f => f.enabled !== false).sort((a, b) => a.order - b.order);
  const enabledFieldCount = sortedFields.length;
  const upiFields        = sortedFields.filter(isUpiField);
  const userDetailFields = sortedFields.filter(f => isUserDetailsField(f) && !isUpiField(f));
  const fileFields       = sortedFields.filter(isFileField);
  const otherFields      = sortedFields.filter(f => !isUpiField(f) && !isUserDetailsField(f) && !isFileField(f));

  function setVal(id: string, v: string) { setValues(p => ({ ...p, [id]: v })); setErrors(e => ({ ...e, [id]: '' })); }

  async function handleSubmit() {
    if (!form) return;
    if (!captchaVerified) { toast.error("Please verify you're not a robot"); return; }
    const errs: Record<string, string> = {};
    sortedFields.forEach(f => {
      if (f.type === 'file') { if (f.required && !values[f.id]) errs[f.id] = 'Please upload a file'; return; }
      const err = getFieldValidationError(f, values[f.id] || '');
      if (err) errs[f.id] = err;
    });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please fix the highlighted fields'); return; }
    setLoading(true);
    try {
      const labeled: Record<string, string> = {};
      sortedFields.forEach(f => { labeled[f.label] = values[f.id] || ''; });
      await submitCashbackForm({ formId: form.id, formTitle: form.title, submissionData: JSON.stringify(labeled) });
      setStep('success');
    } catch { toast.error('Submission failed. Please try again.'); }
    finally { setLoading(false); }
  }

  function resetForm() { setStep('fill'); setValues({}); setErrors({}); setCaptchaVerified(false); }

  function collapseForm() { setFormExpanded(false); setStep('fill'); setValues({}); setErrors({}); setCaptchaVerified(false); }

  function handleExpand() {
    setFormExpanded(true);
    setTimeout(() => document.getElementById('cashback-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <section id="cashback-forms" className="relative z-10 px-5 md:px-[5%] py-16 overflow-hidden">
      {/* Ambient blobs */}
      <div className="blob absolute w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] top-[-5%] right-[-15%] pointer-events-none z-0 opacity-[0.04]" style={{ background: '#f0b429' }} />
      <div className="blob absolute w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bottom-[-5%] left-[-12%] pointer-events-none z-0 opacity-[0.04]" style={{ background: '#ff5722' }} />

      {/* Section heading */}
      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-10">
        <motion.span initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1, type: 'spring' }}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-5 py-2 rounded-full">
          <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }}>💰</motion.span>
          Claim Your Cashback
        </motion.span>
        <motion.h2 initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.18 }}
          className="font-syne font-black text-3xl md:text-4xl text-foreground mt-4 mb-2 leading-tight">
          Submit Proof & <span className="gradient-text-gold">Get Paid</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.28 }}
          className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Already completed an offer? Submit your proof and receive cashback directly to your UPI within 24 hours.
        </motion.p>
      </motion.div>

      {/* ── Collapsible Form Area ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ── COLLAPSED STATE: CTA button + preview card ── */}
        {!formExpanded && (
          <motion.div key="collapsed-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            {/* God-Mode CTA */}
            {cashbackCta.enabled && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex justify-center mb-6">
                <DynamicButton config={cashbackCta} noAlign className="inline-flex items-center justify-center gap-2.5 rounded-full" onClick={handleExpand} />
              </motion.div>
            )}
            {/* Collapsed preview */}
            <CollapsedPreview form={form} enabledFieldCount={enabledFieldCount} onExpand={handleExpand} />
          </motion.div>
        )}

        {/* ── EXPANDED STATE: Collapse toggle + full form card ── */}
        {formExpanded && (
          <motion.div key="expanded-state" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            {/* Collapse button */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center mb-5">
              <button
                onClick={collapseForm}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-black text-muted-foreground border border-border/60 hover:border-border hover:text-foreground transition-all"
              >
                <ChevronUp size={13} /> Collapse Form
              </button>
            </motion.div>

            {/* Main form card */}
            <motion.div id="cashback-form-card" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="max-w-2xl mx-auto relative">
              <div className="absolute -inset-[1px] rounded-[26px] pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(240,180,41,0.3) 0%, rgba(255,87,34,0.15) 50%, rgba(59,130,246,0.1) 100%)', zIndex: -1 }} />

              <div className="relative rounded-3xl overflow-hidden border border-white/[0.06]"
                style={{ background: 'rgba(8, 15, 36, 0.72)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', boxShadow: '0 0 80px rgba(240,180,41,0.07), 0 32px 72px rgba(0,0,0,0.45)' }}>
                <div className="absolute top-0 left-0 right-0 h-[2px] animate-gradient-border" style={{ backgroundSize: '400% 400%' }} />

                {form.bannerUrl && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="relative h-32 overflow-hidden">
                    <motion.img src={form.bannerUrl} alt={form.title} className="w-full h-full object-cover" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background/90" />
                  </motion.div>
                )}

                <div className="px-6 md:px-8 pb-8 pt-0">
                  {/* Header */}
                  <div className="flex items-center gap-4 py-5 border-b border-white/[0.07] mb-6">
                    <div className="w-12 h-12 rounded-2xl border border-gold/25 overflow-hidden flex items-center justify-center text-2xl bg-gold/10 flex-shrink-0">
                      {form.logoUrl ? <img src={form.logoUrl} alt={form.title} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-black text-foreground text-lg leading-tight">{form.title}</p>
                      {form.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>}
                    </div>
                    <WizardSteps step={step} />
                  </div>

                  <AnimatePresence mode="wait">
                    {/* ── Fill Form ── */}
                    {step === 'fill' && (
                      <motion.div key="step-fill" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.32 }} className="space-y-4">
                        {upiFields.length > 0 && (
                          <FormSection stepNum={1} icon="💳" title="Payment Details" subtitle="Enter the UPI ID where you want to receive cashback" accent="amber">
                            <div className="space-y-3">
                              {upiFields.map((f, i) => (
                                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                  <FloatingInput f={f} value={values[f.id] || ''} error={errors[f.id] || null} onChange={v => setVal(f.id, v)} />
                                  {errors[f.id] && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors[f.id]}</motion.p>}
                                </motion.div>
                              ))}
                              <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5"><span>⚠️</span> Must include @ symbol (e.g. yourname@paytm). Cashback sent here.</p>
                            </div>
                          </FormSection>
                        )}

                        {userDetailFields.length > 0 && (
                          <FormSection stepNum={2} icon="🧑" title="Your Identity" subtitle="Details used during the offer — must match exactly" accent="primary">
                            <div className="space-y-3">
                              {userDetailFields.map((f, i) => (
                                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                  <FloatingInput f={f} value={values[f.id] || ''} error={errors[f.id] || null} onChange={v => setVal(f.id, v)} />
                                  {errors[f.id] && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors[f.id]}</motion.p>}
                                </motion.div>
                              ))}
                            </div>
                          </FormSection>
                        )}

                        {otherFields.length > 0 && (
                          <FormSection stepNum={upiFields.length > 0 && userDetailFields.length > 0 ? 3 : 2} icon="📝" title="Additional Info" subtitle="Fill in any remaining required details" accent="primary">
                            <div className="space-y-3">
                              {otherFields.map((f, i) => (
                                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                  <FloatingInput f={f} value={values[f.id] || ''} error={errors[f.id] || null} onChange={v => setVal(f.id, v)} />
                                  {errors[f.id] && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors[f.id]}</motion.p>}
                                </motion.div>
                              ))}
                            </div>
                          </FormSection>
                        )}

                        {fileFields.length > 0 && (
                          <FormSection stepNum={[upiFields, userDetailFields, otherFields].filter(g => g.length > 0).length + 1} icon="📸" title="Upload Proof" subtitle="Screenshot clearly showing your completed offer" accent="emerald">
                            <div className="space-y-4">
                              {form.sampleScreenshotUrl && (
                                <div className="rounded-xl border border-amber-500/30 overflow-hidden bg-amber-500/5">
                                  <div className="px-4 py-2 border-b border-amber-500/20 flex items-center gap-2">
                                    <span className="text-sm">📸</span>
                                    <p className="text-[11px] font-black text-amber-400 uppercase tracking-wider">Sample — How Your Screenshot Should Look</p>
                                  </div>
                                  <div className="p-3">
                                    <img src={form.sampleScreenshotUrl} alt="Sample" className="w-full max-h-40 object-contain rounded-lg border border-border/30"
                                      onError={e => ((e.currentTarget.closest('div.rounded-xl') as HTMLElement).style.display = 'none')} />
                                  </div>
                                </div>
                              )}
                              {fileFields.map(f => (
                                <div key={f.id}>
                                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">{f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}</p>
                                  <DragDropFileUpload field={f} value={values[f.id] || ''} onChange={v => setVal(f.id, v)} />
                                  {errors[f.id] && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors[f.id]}</motion.p>}
                                </div>
                              ))}
                            </div>
                          </FormSection>
                        )}

                        {hasErrors && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/8">
                            <AlertCircle size={14} className="text-destructive flex-shrink-0" />
                            <p className="text-xs font-bold text-destructive">Please fix the highlighted fields above before submitting.</p>
                          </motion.div>
                        )}

                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5">
                          <span className="text-primary flex-shrink-0 text-xs mt-0.5">🛡️</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong className="text-primary">Zero-Fraud Policy:</strong> UPI & Email must contain <strong>@</strong>. Name uses letters only. Mobile = 10 digits.
                          </p>
                        </div>

                        <RecaptchaWidget verified={captchaVerified} onVerify={() => setCaptchaVerified(true)} />

                        <motion.button onClick={handleSubmit} disabled={loading || !captchaVerified}
                          whileHover={!loading && captchaVerified ? { y: -2, scale: 1.01 } : {}}
                          whileTap={!loading && captchaVerified ? { scale: 0.97 } : {}}
                          className="relative w-full py-4 rounded-2xl font-syne font-black text-sm text-black disabled:opacity-60 transition-all overflow-hidden flex items-center justify-center gap-2"
                          style={!loading ? { background: 'linear-gradient(135deg, #f0b429 0%, #ff5722 100%)', boxShadow: '0 8px 32px rgba(240,180,41,0.38)' } : { background: 'rgba(240,180,41,0.4)' }}>
                          {!loading && <div className="card-shine" />}
                          {loading ? '⏳ Submitting…' : !captchaVerified ? '☐ Verify above to submit' : <><span>✓ Submit Cashback Proof</span><ChevronRight size={16} /></>}
                        </motion.button>

                        <p className="text-xs text-muted-foreground text-center mt-1">🔒 Data used only for cashback verification</p>
                      </motion.div>
                    )}

                    {/* ── SUCCESS ── */}
                    {step === 'success' && (
                      <motion.div key="step-success" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-center py-6">
                        <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, delay: 0.1 }}
                          className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-4xl mx-auto mb-5"
                          style={{ boxShadow: '0 0 40px rgba(240,180,41,0.2)' }}>🎉</motion.div>
                        <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-syne font-black text-2xl text-foreground mb-2">
                          Proof Submitted!
                        </motion.h3>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto">
                          Our team will verify and send your cashback within 24 hours.
                        </motion.p>
                        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                          <motion.button onClick={resetForm} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                            className="py-3.5 rounded-xl font-syne font-black text-sm border border-border text-foreground hover:border-gold transition-all">
                            Submit Another
                          </motion.button>
                          <motion.button onClick={() => window.location.href = appPath('/')} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                            className="py-3.5 rounded-xl font-syne font-black text-sm text-black"
                            style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>
                            Home 🏠
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Trust signals */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="flex items-center justify-center gap-6 mt-5 flex-wrap">
                {['🔒 Secure & Private', '⚡ Verified in 24 hrs', '💸 UPI Direct Transfer'].map((t, i) => (
                  <motion.span key={t} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.08 }} className="text-xs text-muted-foreground font-semibold">{t}</motion.span>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
