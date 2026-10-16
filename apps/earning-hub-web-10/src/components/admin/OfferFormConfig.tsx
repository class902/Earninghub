import { useEffect, useState } from 'react';
import { adminGetOffers, adminSaveOffer } from 'zitejs/api';
import FormBuilder from './FormBuilder';
import { toast } from 'sonner';
import type { FormConfig, Offer } from '@/types';
import { DEFAULT_FORM_CONFIG } from '@/types';

interface Props { password: string }

function parseConfig(offer: Offer): FormConfig {
  try { const c = JSON.parse(offer.formConfig); if (c?.fields) return c; } catch {}
  return { ...DEFAULT_FORM_CONFIG };
}

export default function OfferFormConfig({ password }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [formCfg, setFormCfg] = useState<FormConfig>({ ...DEFAULT_FORM_CONFIG });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetOffers({ password }).then(res => { setOffers(res.offers); setLoading(false); });
  }, [password]);

  const selectedOffer = offers.find(o => o.id === selectedId);

  useEffect(() => {
    if (selectedOffer) setFormCfg(parseConfig(selectedOffer));
  }, [selectedId]);

  async function handleSave() {
    if (!selectedOffer) return;
    setSaving(true);
    try {
      await adminSaveOffer({
        password, id: selectedOffer.id,
        name: selectedOffer.name, emoji: selectedOffer.emoji,
        description: selectedOffer.description, steps: selectedOffer.steps,
        payout: selectedOffer.payout, category: selectedOffer.category,
        tags: selectedOffer.tags, redirectLink: selectedOffer.redirectLink,
        status: selectedOffer.status, fieldsConfig: selectedOffer.fieldsConfig || '[]',
        formEnabled: formCfg.enabled, formConfig: JSON.stringify(formCfg),
        rank: selectedOffer.rank || 0,
        isPrivate: selectedOffer.isPrivate ?? false,
        privateSlug: selectedOffer.privateSlug || '',
      });
      toast.success('Form configuration saved! ✓');
      setOffers(prev => prev.map(o => o.id === selectedOffer.id
        ? { ...o, formConfig: JSON.stringify(formCfg), formEnabled: formCfg.enabled } : o));
    } catch { toast.error('Save failed. Try again.'); }
    finally { setSaving(false); }
  }

  const lbl = 'text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block';

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="font-syne font-black text-2xl text-foreground mb-1">📝 Cashback Form Builder</h2>
      <p className="text-muted-foreground text-sm mb-6">Configure the lead collection form separately for each offer. Select an offer below to edit its form fields, poster, and settings.</p>

      {/* Offer selector */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className={lbl}>Select Offer to Configure</label>
        {loading ? (
          <div className="h-12 bg-background border border-border rounded-xl animate-pulse" />
        ) : (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl text-sm focus:outline-none focus:border-gold transition-colors font-satoshi">
            <option value="">— Choose an offer to configure —</option>
            {offers.map(o => (
              <option key={o.id} value={o.id}>
                {o.emoji} {o.name} — ₹{o.payout} [{o.status?.toUpperCase()}] {o.formEnabled ? '✅ Form ON' : ''}
              </option>
            ))}
          </select>
        )}

        {selectedOffer && (
          <div className="mt-4 flex items-center gap-3 p-4 bg-gold/5 border border-gold/20 rounded-xl">
            <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center text-2xl flex-shrink-0">
              {selectedOffer.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-syne font-black text-foreground">{selectedOffer.name}</p>
              <p className="text-xs text-muted-foreground">{selectedOffer.category} · ₹{selectedOffer.payout}</p>
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-full border flex-shrink-0 ${
              formCfg.enabled
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-border/30 text-muted-foreground border-border'
            }`}>
              {formCfg.enabled ? '✅ Form Enabled' : '○ Form Disabled'}
            </span>
          </div>
        )}
      </div>

      {/* Form Builder */}
      {selectedOffer ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <FormBuilder value={formCfg} onChange={setFormCfg} />
          <button onClick={handleSave} disabled={saving}
            className="w-full mt-6 py-4 font-syne font-black text-base text-black bg-gradient-to-r from-gold to-fire rounded-xl transition-all hover:opacity-90 disabled:opacity-60 shadow-lg">
            {saving ? '💾 Saving...' : '💾 Save Form Configuration'}
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <div className="text-5xl mb-4">📝</div>
          <p className="font-syne font-black text-xl text-foreground mb-2">Select an Offer Above</p>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
            Choose an offer from the dropdown to configure its cashback form, fields, poster image, and submission conditions.
          </p>
        </div>
      )}
    </div>
  );
}
