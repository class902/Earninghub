import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from 'zitejs/upload';
import { submitLead, trackEvent } from 'zitejs/api';
import { toast } from 'sonner';
import LiveOfferTab from '@/components/offer/LiveOfferTab';
import TrackLeadPanel from '@/components/TrackLeadPanel';
import WiFiWarning from '@/components/WiFiWarning';
import PosterLightbox from '@/components/PosterLightbox';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer, FormConfig, FormField } from '@/types';
import { DEFAULT_FORM_CONFIG } from '@/types';

interface Props { offer: Offer; onClose: () => void }
type Tab = 'offer' | 'form' | 'track';

// ── Field-type classification helpers ────────────────────────────────────────
function isUpiField(f: FormField) { return f.label.toLowerCase().includes('upi') || f.id.includes('upi'); }
function isNameField(f: FormField) { return (f.label.toLowerCase().includes('name') && !f.label.toLowerCase().includes('offer')) || f.id.includes('name'); }
function isMobileField(f: FormField) { return f.type === 'tel' || f.label.toLowerCase().includes('mobile') || f.label.toLowerCase().includes('phone'); }
function isEmailField(f: FormField) { return f.type === 'email' || f.label.toLowerCase().includes('email'); }

// ── Title Case converter ──────────────────────────────────────────────────────
function toTitleCase(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function parseConfig(offer: Offer): FormConfig {
  try {
    const c = JSON.parse(offer.formConfig);
    if (c?.fields && Array.isArray(c.fields) && c.fields.length > 0) return c;
  } catch {}
  try {
    const f = JSON.parse(offer.fieldsConfig);
    if (Array.isArray(f) && f.length > 0) {
      return {
        ...DEFAULT_FORM_CONFIG, enabled: true,
        fields: f.map((x: { label: string; type: string }, i: number) => ({
          id: `f${i}`, label: x.label, type: x.type as FormField['type'], required: true, visible: true,
        })),
      };
    }
  } catch {}
  return { ...DEFAULT_FORM_CONFIG, enabled: true };
}

function FileUploadField({ value, label, onChange }: { value: string; label: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB allowed'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Only JPG, PNG, WebP, PDF allowed'); return;
    }
    setUploading(true);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      onChange(fileUrl); setFileName(file.name);
    } catch { toast.error('Upload failed. Try again.'); }
    finally { setUploading(false); }
  }
  return (
    <div onClick={() => ref.current?.click()} className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:border-gold transition-all group">
      {value ? (
        <div>
          <div className="text-green-400 text-xl font-black mb-1">✓ Uploaded</div>
          <p className="text-sm text-muted-foreground truncate">{fileName}</p>
          <a href={value} target="_blank" onClick={e => e.stopPropagation()} rel="noreferrer"
            className="text-xs text-gold underline mt-1 block">View file →</a>
          {value.match(/\.(jpg|jpeg|png|webp)$/i) && (
            <img src={value} alt={label} className="mt-3 h-24 rounded-lg object-cover w-full border border-border" onError={() => {}} />
          )}
        </div>
      ) : uploading ? (
        <div><div className="text-2xl mb-1">⏳</div><p className="text-sm text-gold font-semibold">Uploading...</p></div>
      ) : (
        <div>
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📤</div>
          <p className="font-semibold text-sm text-foreground">Click to upload screenshot</p>
          <p className="text-xs text-muted-foreground mt-1">JPG · PNG · PDF · Max 5MB</p>
        </div>
      )}
      <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFile} />
    </div>
  );
}

// ── Smart input rendering with validations ────────────────────────────────────
function SmartField({ f, value, error, onChange }: {
  f: FormField; value: string; error: boolean;
  onChange: (v: string) => void;
}) {
  const cls = `w-full px-4 py-3 bg-card border rounded-xl text-foreground text-sm focus:outline-none focus:border-gold transition-colors font-satoshi ${error ? 'border-destructive' : 'border-border'}`;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let v = e.target.value;
    if (isNameField(f)) {
      v = v.replace(/[^a-zA-Z\s]/g, ''); // only alpha + space
      v = toTitleCase(v);
    }
    if (isMobileField(f)) {
      v = v.replace(/\D/g, '').slice(0, 10); // digits only, max 10
    }
    onChange(v);
  }, [f, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isMobileField(f)) {
      // Allow: backspace, delete, tab, escape, enter, arrows
      if ([8, 9, 13, 27, 37, 38, 39, 40, 46].includes(e.keyCode)) return;
      if (!/\d/.test(e.key)) { e.preventDefault(); return; }
      if (value.length >= 10 && e.key !== 'Backspace') e.preventDefault();
    }
  }, [f, value]);

  if (f.type === 'file') {
    return <FileUploadField value={value} label={f.label} onChange={onChange} />;
  }
  if (f.type === 'textarea') {
    return (
      <textarea rows={3} value={value} onChange={handleChange} placeholder={f.placeholder}
        className={cls + ' resize-none'} />
    );
  }

  return (
    <input
      type={isMobileField(f) ? 'tel' : f.type}
      inputMode={isMobileField(f) ? 'numeric' : f.type === 'email' ? 'email' : undefined}
      value={value}
      onChange={handleChange}
      onKeyDown={isMobileField(f) ? handleKeyDown : undefined}
      maxLength={isMobileField(f) ? 10 : undefined}
      placeholder={f.placeholder}
      autoComplete={isUpiField(f) ? 'off' : undefined}
      className={cls}
    />
  );
}

function getValidationError(f: FormField, val: string): string | null {
  const v = val.trim();
  if (f.required && !v) return 'This field is required';
  if (!v) return null;
  if (isUpiField(f) && !v.includes('@')) return 'UPI ID must contain "@" (e.g. name@upi)';
  if (isEmailField(f) && !v.includes('@')) return 'Email must contain "@"';
  if (isMobileField(f) && !/^\d{10}$/.test(v)) return 'Mobile must be exactly 10 digits';
  if (isNameField(f) && !/^[a-zA-Z\s]+$/.test(v)) return 'Name must contain only letters';
  return null;
}

function getSocialBg(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return 'linear-gradient(135deg, #0088cc, #006699)';
  if (n.includes('whatsapp')) return 'linear-gradient(135deg, #25d366, #128c7e)';
  if (n.includes('instagram')) return 'linear-gradient(135deg, #f77737, #e1306c, #405de6)';
  if (n.includes('youtube')) return 'linear-gradient(135deg, #ff0000, #cc0000)';
  if (n.includes('support') || n.includes('help')) return 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
  return 'linear-gradient(135deg, hsl(var(--primary)), #f0b429)';
}
function getSocialIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return '✈';
  if (n.includes('whatsapp')) return '💬';
  if (n.includes('instagram')) return '📷';
  if (n.includes('youtube')) return '▶';
  if (n.includes('support')) return '🎧';
  return '🔗';
}

export default function OfferFormModal({ offer, onClose }: Props) {
  const navigate = useNavigate();
  const { getTelemetry, incrementCta } = useTelemetry();
  const { settings } = useAppContext();
  const cfg = parseConfig(offer);
  const visibleFields = cfg.fields.filter(f => f.visible !== false);
  const [posterLightboxOpen, setPosterLightboxOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent({ event: 'offer_click', offerName: offer.name }).catch(() => {});
  }, [offer.name]);

  const [activeTab, setActiveTab] = useState<Tab>('offer');
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [prefilledUpi, setPrefilledUpi] = useState('');
  const [showWifi, setShowWifi] = useState(false);

  function setVal(id: string, v: string) {
    setValues(p => ({ ...p, [id]: v }));
    setFieldErrors(p => ({ ...p, [id]: '' }));
  }
  function switchTab(t: Tab) { setActiveTab(t); contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }

  async function handleSubmit() {
    // Validate all fields
    const newErrors: Record<string, string> = {};
    visibleFields.forEach(f => {
      const err = getValidationError(f, values[f.id] || '');
      if (err) newErrors[f.id] = err;
    });
    setFieldErrors(newErrors);
    if (Object.keys(newErrors).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    incrementCta();
    setLoading(true);
    try {
      const labeled: Record<string, string> = {};
      visibleFields.forEach(f => { labeled[f.label] = values[f.id] || ''; });
      const upiField = visibleFields.find(isUpiField);
      const upiValue = upiField ? (values[upiField.id] || '').trim() : '';
      const summary = upiValue || values[visibleFields[0]?.id] || 'User';
      const referredBy = sessionStorage.getItem('eh_referrer') || undefined;
      const referralCode = sessionStorage.getItem('eh_ref_code') || undefined;

      // Capture telemetry at submit time
      const telemetry = getTelemetry();

      const res = await submitLead({
        offerName: offer.name, offerPayout: offer.payout, summary,
        leadData: JSON.stringify(labeled), upiId: upiValue, referredBy,
        referralCode: referralCode || undefined,
        telemetryJson: JSON.stringify(telemetry),
      });

      if (res.isDuplicate) {
        onClose();
        navigate(`/user-lead-track?upi=${encodeURIComponent(upiValue)}`);
        return;
      }

      trackEvent({ event: 'offer_apply', offerName: offer.name }).catch(() => {});
      setLeadId(res.refId);
      setPrefilledUpi(upiValue);
      setSuccess(true);
    } catch { toast.error('Submission failed. Please try again.'); }
    finally { setLoading(false); }
  }

  async function copyLeadId() {
    try { await navigator.clipboard.writeText(leadId); toast.success('Lead ID copied! 📋'); }
    catch { toast.error('Copy failed'); }
  }

  const TABS = [
    { id: 'offer' as Tab, label: '🔥 Live Offer' },
    { id: 'form' as Tab, label: '📝 Cash Form' },
    { id: 'track' as Tab, label: '🔍 Track' },
  ];

  return (
    <>
    {showWifi && (
      <WiFiWarning
        onConfirm={() => { setShowWifi(false); window.open(offer.redirectLink, '_blank'); }}
        onClose={() => setShowWifi(false)}
      />
    )}
    {activeTab !== 'track' && !success && (
      <button
        onClick={() => switchTab('track')}
        className="fixed z-[60] bottom-24 md:bottom-8 right-4 font-syne font-black text-sm text-black bg-gradient-to-r from-gold to-fire px-5 py-2.5 rounded-full shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
        🔍 Track Lead
      </button>
    )}
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-lg border-b border-border sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:border-gold hover:text-gold transition-all flex-shrink-0">
            ←
          </button>
          {/* Offer logo */}
          {offer.logoUrl ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-border flex-shrink-0">
              <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base flex-shrink-0">
              {offer.emoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-syne font-black text-sm text-foreground truncate">{offer.name}</p>
            <p className="text-xs text-muted-foreground">{offer.category}</p>
          </div>
          <span className="font-syne font-black text-gold text-lg flex-shrink-0">₹{offer.payout}</span>
        </div>
        <div className="flex border-t border-border/40">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => switchTab(tab.id)}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wide transition-all border-b-2 ${
                activeTab === tab.id ? 'border-gold text-gold bg-gold/5' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {activeTab !== 'track' && (
          <div className="relative w-full flex-shrink-0 overflow-hidden cursor-pointer" style={{ height: 260 }}
            onClick={() => cfg.posterUrl && setPosterLightboxOpen(true)}>
            {cfg.posterUrl ? (
              <img src={cfg.posterUrl} alt={offer.name} className="w-full h-full object-cover object-center" />
            ) : (
              <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(240,180,41,0.25) 0%, rgba(255,87,34,0.25) 100%)' }}>
                <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full opacity-50" style={{ background: '#f0b429', filter: 'blur(80px)' }} />
                <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-40" style={{ background: '#ff5722', filter: 'blur(80px)' }} />
                <div className="text-center relative z-10">
                  <div className="text-7xl mb-3">{offer.emoji}</div>
                  <p className="font-syne font-black text-lg text-foreground">{offer.name}</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.2) 60%, transparent 100%)' }} />
            <div className="absolute bottom-4 left-5">
              <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-0.5">Total Cashback</p>
              <p className="font-syne font-black text-4xl leading-none text-gold">₹{offer.payout}</p>
            </div>
            <div className="absolute top-4 right-4">
              <div className="px-3 py-1.5 rounded-full text-[11px] font-black border"
                style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', color: '#4ade80' }}>
                ✓ VERIFIED
              </div>
            </div>
          </div>
        )}

        <div className="max-w-lg mx-auto w-full px-4">
          {activeTab === 'offer' && (
            <LiveOfferTab offer={offer} tags={offer.tags ? offer.tags.split(',').map(t => t.trim()).filter(Boolean) : []} onApply={() => switchTab('form')} />
          )}

          {activeTab === 'form' && !success && (
            <div className="py-6 space-y-5 pb-24 md:pb-8">
              <div>
                <p className="font-syne font-black text-xl text-foreground">{cfg.title || 'Your Details'}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Fill in accurately to claim your ₹{offer.payout} cashback</p>
              </div>

              {/* Validation hint */}
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
                <span className="text-primary flex-shrink-0">🛡️</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-primary">Zero-Fraud Policy:</strong> UPI & Email must contain <strong>@</strong>. Name auto-formats to Title Case. Mobile must be exactly 10 digits.
                </p>
              </div>

              <div className="space-y-4">
                {visibleFields.map(f => (
                  <div key={f.id}>
                    <label className="block text-sm font-bold text-foreground mb-1.5">
                      {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                      {isUpiField(f) && <span className="ml-2 text-[10px] text-muted-foreground font-normal">must contain @</span>}
                      {isMobileField(f) && <span className="ml-2 text-[10px] text-muted-foreground font-normal">10 digits only</span>}
                    </label>
                    <SmartField f={f} value={values[f.id] || ''} error={!!fieldErrors[f.id]} onChange={v => setVal(f.id, v)} />
                    {fieldErrors[f.id] && (
                      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                        <span>⚠</span> {fieldErrors[f.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {cfg.submitConditions.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2.5">📌 SUBMIT ONLY IF:</p>
                  {cfg.submitConditions.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-foreground mb-2 last:mb-0">
                      <span className="text-green-400 font-black mt-0.5 flex-shrink-0">✓</span> {c}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-4 rounded-2xl font-syne font-black text-base text-black transition-all hover:opacity-90 disabled:opacity-60 active:scale-[0.98] shadow-lg bg-gradient-to-r from-gold to-fire relative overflow-hidden">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin flex-shrink-0" />
                    Submitting…
                  </span>
                ) : (cfg.submitButtonText || 'Submit & Claim Cashback')}
              </button>
            </div>
          )}

          {activeTab === 'form' && success && (
            <div className="py-10 text-center pb-24 md:pb-10">
              <div className="text-6xl mb-5 animate-bounce-in">🎉</div>
              <h2 className="font-syne font-black text-2xl text-foreground mb-2">Submitted Successfully!</h2>
              <p className="text-muted-foreground text-sm mb-6">Your application for <strong className="text-foreground">{offer.name}</strong> has been recorded.</p>
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 mb-6">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Your Lead ID</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-syne font-black text-2xl text-green-400">{leadId}</span>
                  <button onClick={copyLeadId} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold rounded-full hover:bg-green-500/20 transition-all">
                    📋 Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Save this ID to track your payment status</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => { switchTab('track'); }}
                  className="w-full py-3.5 bg-card border border-border text-foreground font-syne font-black rounded-xl hover:border-gold hover:text-gold transition-all">
                  🔍 Track My Status
                </button>
                <button onClick={() => setShowWifi(true)}
                  className="w-full py-3.5 rounded-xl font-syne font-black text-black bg-gradient-to-r from-gold to-fire transition-all hover:opacity-90">
                  Continue to Offer →
                </button>
                <button onClick={onClose} className="w-full py-3 text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors">
                  Back to Offers
                </button>
              </div>

              {/* Social Links */}
              {(settings?.telegramLink || settings?.supportEmail || (settings?.socialLinks || []).length > 0) && (
                <div className="mt-5 pt-5 border-t border-border/50">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center mb-3">Stay Connected</p>
                  <div className={`grid gap-2.5 ${((settings?.telegramLink ? 1 : 0) + (settings?.supportEmail ? 1 : 0) + (settings?.socialLinks?.length || 0)) > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {settings?.telegramLink && (
                      <a href={settings.telegramLink} target="_blank" rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 transition-all">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base"
                          style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>✈</div>
                        <span className="text-[10px] font-black text-foreground">Telegram</span>
                      </a>
                    )}
                    {settings?.supportEmail && (
                      <a href={settings.supportEmail.includes('@') ? `mailto:${settings.supportEmail}` : settings.supportEmail}
                        target="_blank" rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 transition-all">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>🎧</div>
                        <span className="text-[10px] font-black text-foreground">Support</span>
                      </a>
                    )}
                    {(settings?.socialLinks || []).slice(0, 4).map(sl => (
                      <a key={sl.id} href={sl.url} target="_blank" rel="noreferrer"
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 transition-all">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base overflow-hidden"
                          style={{ background: sl.iconUrl ? undefined : getSocialBg(sl.name) }}>
                          {sl.iconUrl
                            ? <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" />
                            : getSocialIcon(sl.name)}
                        </div>
                        <span className="text-[10px] font-black text-foreground truncate w-full text-center">{sl.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'track' && (
            <TrackLeadPanel prefilledUpi={prefilledUpi} />
          )}
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="md:hidden flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-lg px-4 py-3 flex gap-2">
        {activeTab !== 'form' && (
          <button onClick={() => switchTab('form')}
            className="flex-1 py-3 rounded-xl font-syne font-black text-sm text-black bg-gradient-to-r from-gold to-fire transition-all hover:opacity-90">
            📝 Apply Now
          </button>
        )}
        {activeTab !== 'track' && (
          <button onClick={() => switchTab('track')}
            className="flex-1 py-3 rounded-xl font-syne font-black text-sm bg-card border border-border text-foreground hover:border-gold hover:text-gold transition-all">
            🔍 Track
          </button>
        )}
        <button onClick={onClose}
          className="px-5 py-3 rounded-xl font-syne font-black text-sm bg-card border border-border text-foreground hover:border-gold transition-all">
          ←
        </button>
      </div>
    </div>
    {cfg.posterUrl && (
      <PosterLightbox src={cfg.posterUrl} alt={offer.name} open={posterLightboxOpen} onClose={() => setPosterLightboxOpen(false)} />
    )}
    </>
  );
}
