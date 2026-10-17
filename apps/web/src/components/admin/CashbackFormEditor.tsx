import { useState } from 'react';
import { toast } from 'sonner';
import type { CashbackForm, CashbackFormField, CashbackFieldType } from '@/types';
import { DEFAULT_CASHBACK_FORM_FIELDS } from '@/types';
import ImageUploadField from './ImageUploadField';

const FIELD_TYPES: { value: CashbackFieldType; label: string; icon: string }[] = [
  { value: 'text',     label: 'Short Text',   icon: '📝' },
  { value: 'number',   label: 'Number',       icon: '🔢' },
  { value: 'email',    label: 'Email',        icon: '📧' },
  { value: 'tel',      label: 'Phone',        icon: '📱' },
  { value: 'date',     label: 'Date',         icon: '📅' },
  { value: 'file',     label: 'File Upload',  icon: '📎' },
  { value: 'textarea', label: 'Long Text',    icon: '📄' },
  { value: 'select',   label: 'Dropdown',     icon: '🔽' },
];

function newField(order: number): CashbackFormField {
  return {
    id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: 'New Field',
    type: 'text',
    required: false,
    placeholder: '',
    options: '',
    order,
    isDefault: false,
    enabled: true,
  };
}

interface EditorProps {
  form: CashbackForm | null;
  saving: boolean;
  onSave: (data: Omit<CashbackForm, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onCancel: () => void;
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────
function FieldRow({
  field, isFirst, isLast, isEditing,
  onToggleEdit, onChange, onDelete, onMove,
}: {
  field: CashbackFormField;
  isFirst: boolean; isLast: boolean; isEditing: boolean;
  onToggleEdit: () => void;
  onChange: (p: Partial<CashbackFormField>) => void;
  onDelete: () => void;
  onMove: (d: 'up' | 'down') => void;
}) {
  const inp = 'w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-gold transition-colors font-satoshi';
  const ft = FIELD_TYPES.find(t => t.value === field.type);
  const isEnabled = field.enabled !== false;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isEditing ? 'border-gold/50 bg-gold/3' : isEnabled ? 'border-border hover:border-border/80' : 'border-border/40 opacity-60'}`}>
      <div className="flex items-center gap-2 px-3.5 py-2.5">

        {/* Type icon */}
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs flex-shrink-0">{ft?.icon || '📝'}</div>

        {/* Label + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-foreground truncate">{field.label}</p>
            {field.isDefault && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">DEFAULT</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{ft?.label}</span>
            {field.required && <span className="text-[10px] text-destructive font-bold">required</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Move — only for non-default custom fields */}
          {!field.isDefault && (
            <>
              <button onClick={() => onMove('up')} disabled={isFirst}
                className="w-6 h-6 rounded-md border border-border text-muted-foreground text-xs hover:border-primary hover:text-primary transition-all disabled:opacity-30">↑</button>
              <button onClick={() => onMove('down')} disabled={isLast}
                className="w-6 h-6 rounded-md border border-border text-muted-foreground text-xs hover:border-primary hover:text-primary transition-all disabled:opacity-30">↓</button>
            </>
          )}

          {/* Edit — only custom fields */}
          {!field.isDefault && (
            <button onClick={onToggleEdit}
              className={`w-6 h-6 rounded-md border text-xs transition-all ${isEditing ? 'bg-gold/10 border-gold text-gold' : 'border-border text-muted-foreground hover:border-gold hover:text-gold'}`}>
              ✎
            </button>
          )}

          {/* Delete — only custom fields */}
          {!field.isDefault && (
            <button onClick={onDelete}
              className="w-6 h-6 rounded-md border border-destructive/25 text-destructive text-xs hover:bg-destructive/10 transition-all">
              ✕
            </button>
          )}

          {/* Enabled toggle — ALL fields (default can only be toggled, not deleted) */}
          <button
            onClick={() => onChange({ enabled: !isEnabled })}
            title={isEnabled ? 'Disable this field' : 'Enable this field'}
            className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${isEnabled ? 'bg-green-500' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isEnabled ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Edit panel (custom fields only) */}
      {isEditing && !field.isDefault && (
        <div className="border-t border-border/50 px-4 py-4 space-y-3 bg-background/50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Field Label</label>
              <input className={inp} value={field.label} onChange={e => onChange({ label: e.target.value })} placeholder="e.g. Investment Amount" />
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Field Type</label>
              <select className={inp} value={field.type} onChange={e => onChange({ type: e.target.value as CashbackFieldType })}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
          </div>
          {field.type !== 'file' && field.type !== 'date' && (
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Placeholder Hint</label>
              <input className={inp} value={field.placeholder || ''} onChange={e => onChange({ placeholder: e.target.value })} placeholder="Hint text shown inside the field..." />
            </div>
          )}
          {field.type === 'select' && (
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Options (comma separated)</label>
              <input className={inp} value={field.options || ''} onChange={e => onChange({ options: e.target.value })} placeholder="Option A, Option B, Option C" />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => onChange({ required: !field.required })}
              className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${field.required ? 'bg-destructive' : 'bg-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${field.required ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-xs text-foreground font-semibold">Mark as Required</span>
          </div>
        </div>
      )}

      {/* Default field note */}
      {field.isDefault && (
        <div className="border-t border-border/30 px-4 py-2 bg-background/30">
          <p className="text-[10px] text-muted-foreground">
            🔒 Default field — use the toggle above to show/hide from users
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function CashbackFormEditor({ form, saving, onSave, onCancel }: EditorProps) {
  const [title, setTitle] = useState(form?.title || '');
  const [description, setDescription] = useState(form?.description || '');
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(form?.isPublic ?? true);
  const [partnerLink, setPartnerLink] = useState(form?.partnerLink || '');
  const [isEmbed, setIsEmbed] = useState(form?.isEmbed ?? false);
  const [logoUrl, setLogoUrl] = useState(form?.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(form?.bannerUrl || '');
  const [sampleScreenshotUrl, setSampleScreenshotUrl] = useState(form?.sampleScreenshotUrl || '');
  const [fields, setFields] = useState<CashbackFormField[]>(
    form?.fields?.length ? form.fields : DEFAULT_CASHBACK_FORM_FIELDS,
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const inp = 'w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-gold transition-colors font-satoshi';

  const defaultFields = fields.filter(f => f.isDefault);
  const customFields = fields.filter(f => !f.isDefault);

  function addField() {
    const f = newField(fields.length);
    setFields(prev => [...prev, f]);
    setEditingId(f.id);
  }
  function updateField(id: string, p: Partial<CashbackFormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...p } : f));
  }
  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id));
    if (editingId === id) setEditingId(null);
  }
  function moveField(id: string, dir: 'up' | 'down') {
    const idx = fields.findIndex(f => f.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === fields.length - 1) return;
    const arr = [...fields];
    [arr[idx], arr[dir === 'up' ? idx - 1 : idx + 1]] = [arr[dir === 'up' ? idx - 1 : idx + 1], arr[idx]];
    setFields(arr);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Form title is required'); return; }
    const enabledFields = fields.filter(f => f.enabled !== false);
    if (enabledFields.length === 0) { toast.error('At least one field must be enabled'); return; }
    await onSave({ id: form?.id, title, description, isActive, isPublic, partnerLink, isEmbed, fields, logoUrl, bannerUrl, sampleScreenshotUrl });
  }

  return (
    <div className="space-y-5">
      {/* Back button + title */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onCancel}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
          ←
        </button>
        <div>
          <h2 className="font-syne font-black text-xl text-foreground">{form ? 'Edit Form' : 'Create Cashback Form'}</h2>
          <p className="text-xs text-muted-foreground">Build a custom proof submission form for users</p>
        </div>
      </div>

      {/* Form metadata */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Form Title *</label>
          <input className={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bajaj Broking Investment Proof" />
        </div>
        <div>
          <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Description (optional)</label>
          <textarea className={`${inp} resize-none`} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief note on what this form is for..." />
        </div>

        <ImageUploadField label="Form Logo" value={logoUrl} onChange={setLogoUrl} hint="Small square logo shown on form card and modal header" aspectHint="1:1 square" />
        <ImageUploadField label="Form Banner" value={bannerUrl} onChange={setBannerUrl} hint="Wide banner shown at top when user opens form" aspectHint="16:9 wide" />

        {/* Sample Screenshot for User Instruction */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-3">
          <div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-wider mb-0.5">📸 Sample Offer Screenshot</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Upload a sample showing how a completed offer looks. Users see this on the tracker page as a reference guide.</p>
          </div>
          <ImageUploadField label="Upload Sample Screenshot" value={sampleScreenshotUrl} onChange={setSampleScreenshotUrl} hint="Example: a completed app screen, payment confirmation, or account creation proof" aspectHint="Portrait/screenshot recommended" />
          {sampleScreenshotUrl && (
            <div className="mt-2">
              <p className="text-[10px] font-black text-amber-400 mb-2">Preview — Users See This As Reference:</p>
              <img src={sampleScreenshotUrl} alt="Sample" className="w-full max-h-52 object-contain rounded-xl border border-amber-500/20" onError={e => ((e.currentTarget.closest('div') as HTMLElement).style.display = 'none')} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
          <div>
            <p className="text-sm font-bold text-foreground">Show on Homepage</p>
            <p className="text-xs text-muted-foreground">Users can see and submit this form</p>
          </div>
          <button onClick={() => setIsActive(v => !v)}
            className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-border'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isActive ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Visibility: General / Private */}
        <div className="flex items-center justify-between p-3 bg-background rounded-xl border border-border">
          <div>
            <p className="text-sm font-bold text-foreground">{isPublic ? '🌐 General (Public Listing)' : '🔒 Private (Link Only)'}</p>
            <p className="text-xs text-muted-foreground">{isPublic ? 'Appears in /forms public listing' : 'Only accessible via direct link'}</p>
          </div>
          <button onClick={() => setIsPublic(v => !v)}
            className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${isPublic ? 'bg-blue-500' : 'bg-border'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Partner Link (Embed) */}
        <div className="p-4 bg-purple-500/5 border border-purple-500/25 rounded-xl space-y-3">
          <div>
            <p className="text-xs font-black text-purple-400 uppercase tracking-wider mb-0.5">📎 Partner Embed (Optional)</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Paste an external form URL (e.g. Google Form). Users won't leave Earning Hub — the form loads inside an iframe.</p>
          </div>
          <input className={inp} value={partnerLink} onChange={e => setPartnerLink(e.target.value)} placeholder="https://docs.google.com/forms/d/…" />
          {partnerLink && (
            <div className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">Render as iFrame</p>
                <p className="text-[10px] text-muted-foreground">Embed the partner URL inside Earning Hub shell</p>
              </div>
              <button onClick={() => setIsEmbed(v => !v)}
                className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${isEmbed ? 'bg-purple-500' : 'bg-border'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${isEmbed ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Default fields */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="mb-4">
          <p className="font-syne font-black text-foreground">Default Fields</p>
          <p className="text-xs text-muted-foreground">Built-in fields — toggle to show/hide from users</p>
        </div>
        <div className="space-y-2">
          {defaultFields.map((field, idx) => (
            <FieldRow
              key={field.id}
              field={field}
              isFirst={idx === 0}
              isLast={idx === defaultFields.length - 1}
              isEditing={false}
              onToggleEdit={() => {}}
              onChange={p => updateField(field.id, p)}
              onDelete={() => {}}
              onMove={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Custom fields */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-syne font-black text-foreground">Custom Fields</p>
            <p className="text-xs text-muted-foreground">{customFields.length} extra field{customFields.length !== 1 ? 's' : ''} added</p>
          </div>
          <button onClick={addField}
            className="px-4 py-2 bg-gold/10 border border-gold/20 text-gold text-xs font-black rounded-xl hover:bg-gold/20 transition-all">
            + Add Field
          </button>
        </div>

        {customFields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <div className="text-2xl mb-2">➕</div>
            <p className="text-xs font-semibold">No custom fields yet</p>
            <p className="text-xs mt-1 text-muted-foreground/70">Click "Add Field" above to collect extra data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFields.map((field, idx) => (
              <FieldRow
                key={field.id}
                field={field}
                isFirst={idx === 0}
                isLast={idx === customFields.length - 1}
                isEditing={editingId === field.id}
                onToggleEdit={() => setEditingId(editingId === field.id ? null : field.id)}
                onChange={p => updateField(field.id, p)}
                onDelete={() => removeField(field.id)}
                onMove={dir => moveField(field.id, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-4 font-syne font-black text-sm text-black bg-gradient-to-r from-gold to-fire rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-sm">
          {saving ? '💾 Saving…' : `💾 ${form ? 'Update' : 'Create'} Form`}
        </button>
        <button onClick={onCancel}
          className="px-6 py-4 font-syne font-black text-sm border border-border text-foreground rounded-xl hover:border-primary transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}
