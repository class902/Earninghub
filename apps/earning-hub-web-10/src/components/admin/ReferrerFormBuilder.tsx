import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReferrerFormField, ReferrerFieldType } from '@/types';

interface Props {
  fields: ReferrerFormField[];
  onChange: (fields: ReferrerFormField[]) => void;
}

const FIELD_TYPES: { value: ReferrerFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'tel', label: 'Phone Number', icon: '📱' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'dropdown', label: 'Dropdown', icon: '📋' },
];

const PRESETS: ReferrerFormField[] = [
  { id: '', label: 'Mobile Number', type: 'tel', required: true, placeholder: '10-digit mobile number', validationRegex: '^[0-9]{10}$', validationMessage: 'Must be exactly 10 digits' },
  { id: '', label: 'UPI ID', type: 'text', required: true, placeholder: 'yourname@upi', validationRegex: '^.+@.+$', validationMessage: 'Must be a valid UPI ID (name@bank)' },
  { id: '', label: 'Telegram Username', type: 'text', required: false, placeholder: '@username or https://t.me/username' },
  { id: '', label: 'Email Address', type: 'email', required: false, placeholder: 'you@email.com' },
  { id: '', label: 'Full Name', type: 'text', required: true, placeholder: 'Your full name' },
];

function uid() {
  return `rf_${Math.random().toString(36).slice(2, 9)}`;
}

function FieldRow({ field, index, total, onChange, onDelete, onMove }: {
  field: ReferrerFormField;
  index: number;
  total: number;
  onChange: (f: ReferrerFormField) => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inp = 'bg-background border-border text-foreground text-xs';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-background border border-border rounded-xl overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
          <input
            value={field.label}
            onChange={e => onChange({ ...field, label: e.target.value })}
            placeholder="Field Label *"
            className={`px-2.5 py-1.5 rounded-lg border focus:outline-none focus:border-primary transition-colors ${inp}`}
          />
          <select
            value={field.type}
            onChange={e => onChange({ ...field, type: e.target.value as ReferrerFieldType })}
            className={`px-2.5 py-1.5 rounded-lg border focus:outline-none focus:border-primary transition-colors ${inp}`}
          >
            {FIELD_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onChange({ ...field, required: !field.required })}
            className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
              field.required ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground'
            }`}
          >
            {field.required ? 'REQ' : 'OPT'}
          </button>

          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <div className="flex flex-col gap-0.5">
            <button onClick={() => onMove('up')} disabled={index === 0}
              className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronUp size={10} />
            </button>
            <button onClick={() => onMove('down')} disabled={index === total - 1}
              className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronDown size={10} />
            </button>
          </div>

          <button onClick={onDelete}
            className="p-1.5 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-all">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expanded options */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/50 grid grid-cols-1 gap-2">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Placeholder Text</label>
                <input
                  value={field.placeholder || ''}
                  onChange={e => onChange({ ...field, placeholder: e.target.value })}
                  placeholder="e.g. Enter your 10-digit number"
                  className={`w-full px-2.5 py-1.5 rounded-lg border focus:outline-none focus:border-primary transition-colors ${inp}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">
                    Validation Regex <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    value={field.validationRegex || ''}
                    onChange={e => onChange({ ...field, validationRegex: e.target.value })}
                    placeholder="e.g. ^[0-9]{10}$"
                    className={`w-full px-2.5 py-1.5 rounded-lg border focus:outline-none focus:border-primary transition-colors font-mono ${inp}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Error Message</label>
                  <input
                    value={field.validationMessage || ''}
                    onChange={e => onChange({ ...field, validationMessage: e.target.value })}
                    placeholder="e.g. Must be 10 digits"
                    className={`w-full px-2.5 py-1.5 rounded-lg border focus:outline-none focus:border-primary transition-colors ${inp}`}
                  />
                </div>
              </div>

              {field.type === 'dropdown' && (
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">
                    Dropdown Options <span className="text-muted-foreground/50 normal-case font-normal">(one per line)</span>
                  </label>
                  <textarea
                    value={(field.options || []).join('\n')}
                    onChange={e => onChange({ ...field, options: e.target.value.split('\n').filter(Boolean) })}
                    rows={3}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    className={`w-full px-2.5 py-1.5 rounded-lg border focus:outline-none focus:border-primary transition-colors resize-none ${inp}`}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReferrerFormBuilder({ fields, onChange }: Props) {
  const [showPresets, setShowPresets] = useState(false);

  function addField() {
    onChange([...fields, { id: uid(), label: '', type: 'text', required: false, placeholder: '' }]);
  }

  function addPreset(preset: ReferrerFormField) {
    onChange([...fields, { ...preset, id: uid() }]);
    setShowPresets(false);
  }

  function updateField(index: number, updated: ReferrerFormField) {
    const next = [...fields];
    next[index] = updated;
    onChange(next);
  }

  function deleteField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function moveField(index: number, dir: 'up' | 'down') {
    const next = [...fields];
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-foreground">Form Fields</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {fields.length === 0 ? 'No fields — users will see a default form' : `${fields.length} field${fields.length !== 1 ? 's' : ''} configured`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border text-xs font-bold rounded-lg hover:border-primary hover:text-primary transition-all"
            >
              ⚡ Presets
            </button>
            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px]"
                >
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => addPreset(p)}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-primary/10 transition-colors border-b border-border/40 last:border-0"
                    >
                      <span className="font-bold text-foreground">{p.label}</span>
                      <span className="text-muted-foreground ml-1.5">({p.type}{p.required ? ', required' : ''})</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={addField}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/30 text-primary text-xs font-black rounded-lg hover:bg-primary/25 transition-all"
          >
            <Plus size={12} /> Add Field
          </button>
        </div>
      </div>

      {/* Field list */}
      {fields.length === 0 ? (
        <div className="p-6 bg-background border border-dashed border-border rounded-xl text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-xs font-bold text-muted-foreground">No custom fields yet</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Add fields above or use Presets to quickly add common fields like Mobile, UPI, Telegram</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {fields.map((field, index) => (
              <FieldRow
                key={field.id}
                field={field}
                index={index}
                total={fields.length}
                onChange={updated => updateField(index, updated)}
                onDelete={() => deleteField(index)}
                onMove={dir => moveField(index, dir)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Quick regex hints */}
      {fields.some(f => f.type === 'tel') && (
        <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-[10px] font-bold text-primary">💡 Regex Quick Reference:</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            10-digit mobile: <code className="text-primary/80">^[0-9]{'{10}'}$</code> &nbsp;|&nbsp;
            UPI ID: <code className="text-primary/80">^.+@.+$</code> &nbsp;|&nbsp;
            Pincode: <code className="text-primary/80">^[0-9]{'{6}'}$</code>
          </p>
        </div>
      )}
    </div>
  );
}
