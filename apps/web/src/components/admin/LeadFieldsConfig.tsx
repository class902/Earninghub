import { useState } from 'react';
import { Dialog, DialogContent } from '@project/components/ui/dialog';
import type { LeadFieldDef } from '@/types';

interface Props {
  fields: LeadFieldDef[];
  onChange: (fields: LeadFieldDef[]) => void;
}

const FIELD_TYPES: { value: LeadFieldDef['type']; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'tel', label: 'Phone Number' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
];

function genId() { return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`; }

export default function LeadFieldsConfig({ fields, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<LeadFieldDef['type']>('text');
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  function toggleEnabled(id: string) {
    onChange(fields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  }
  function toggleRequired(id: string) {
    onChange(fields.map(f => f.id === id ? { ...f, required: !f.required } : f));
  }
  function toggleSearchable(id: string) {
    onChange(fields.map(f => f.id === id ? { ...f, searchable: !f.searchable } : f));
  }
  function updateLabel(id: string, label: string) {
    onChange(fields.map(f => f.id === id ? { ...f, label } : f));
  }
  function updatePlaceholder(id: string, placeholder: string) {
    onChange(fields.map(f => f.id === id ? { ...f, placeholder } : f));
  }
  function deleteField(id: string) {
    onChange(fields.filter(f => f.id !== id));
  }
  function moveField(id: string, dir: 'up' | 'down') {
    const idx = fields.findIndex(f => f.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === fields.length - 1) return;
    const arr = [...fields];
    [arr[idx], arr[dir === 'up' ? idx - 1 : idx + 1]] = [arr[dir === 'up' ? idx - 1 : idx + 1], arr[idx]];
    onChange(arr);
  }
  function addCustomField() {
    if (!newLabel.trim()) return;
    const f: LeadFieldDef = { id: genId(), label: newLabel, placeholder: newPlaceholder, type: newType, required: newRequired, enabled: true, isDefault: false, searchable: true };
    onChange([...fields, f]);
    setNewLabel(''); setNewPlaceholder(''); setNewType('text'); setNewRequired(false); setShowAdd(false);
  }

  const searchableCount = fields.filter(f => f.enabled && f.searchable).length;
  const inp = 'w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-primary transition-colors';

  return (
    <div className="space-y-3">
      {/* 🔎 Search Status Banner */}
      <div className={`p-3 rounded-xl border-2 transition-all ${searchableCount > 0 ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs font-black flex items-center gap-1.5 ${searchableCount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            🔎 Tracker Search Fields
          </p>
          {searchableCount > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              {searchableCount} active
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {searchableCount > 0
            ? <>Users can search by <strong className="text-emerald-400">{fields.filter(f => f.enabled && f.searchable).map(f => f.label).join(', ')}</strong> to track their leads. Exact match only — secure by default.</>
            : <>⚠️ No fields are marked searchable. Users won't be able to find their leads. Toggle 🔎 on at least one field.</>
          }
        </p>
      </div>

      {fields.map((f, idx) => (
        <div key={f.id} className={`border rounded-xl transition-all ${f.enabled ? 'border-border' : 'border-border/40 opacity-60'}`}>
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            {/* Move buttons */}
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveField(f.id, 'up')} disabled={idx === 0} className="w-5 h-5 rounded text-muted-foreground text-[10px] hover:text-foreground disabled:opacity-20 transition-all">↑</button>
              <button onClick={() => moveField(f.id, 'down')} disabled={idx === fields.length - 1} className="w-5 h-5 rounded text-muted-foreground text-[10px] hover:text-foreground disabled:opacity-20 transition-all">↓</button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground truncate">{f.label}</span>
                {f.isDefault && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">DEFAULT</span>}
                <span className="text-[9px] text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded">{FIELD_TYPES.find(t => t.value === f.type)?.label || f.type}</span>
                {f.searchable && f.enabled && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                    🔍 SEARCHABLE
                  </span>
                )}
              </div>
              {f.placeholder && <p className="text-xs text-muted-foreground truncate mt-0.5">{f.placeholder}</p>}
            </div>

            {/* 🔎 Searchable toggle */}
            {f.enabled && (
              <button
                onClick={() => toggleSearchable(f.id)}
                title={f.searchable ? `Users can search by ${f.label}` : `Enable search by ${f.label}`}
                className={`p-1.5 rounded-lg border-2 transition-all flex-shrink-0 ${
                  f.searchable
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/15 ring-1 ring-emerald-400/20'
                    : 'border-border/40 text-muted-foreground/30 hover:border-emerald-500/40 hover:text-emerald-400/60'
                }`}
              >
                <span className="text-sm leading-none">{f.searchable ? '🔍' : '🔎'}</span>
              </button>
            )}

            {/* Required toggle */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-muted-foreground font-semibold">Req</span>
              <button onClick={() => toggleRequired(f.id)}
                className={`w-8 h-4 rounded-full transition-all relative ${f.required ? 'bg-destructive/70' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${f.required ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Edit button (custom only) */}
            {!f.isDefault && (
              <button onClick={() => setEditingId(editingId === f.id ? null : f.id)}
                className={`w-6 h-6 rounded-md border text-xs transition-all flex-shrink-0 ${editingId === f.id ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>
                ✎
              </button>
            )}

            {/* Delete (custom only) */}
            {!f.isDefault && (
              <button onClick={() => deleteField(f.id)} className="w-6 h-6 rounded-md border border-destructive/25 text-destructive text-xs hover:bg-destructive/10 transition-all flex-shrink-0">✕</button>
            )}

            {/* Enable/Disable toggle */}
            <button onClick={() => toggleEnabled(f.id)}
              className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${f.enabled ? 'bg-green-500' : 'bg-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${f.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Edit panel for custom fields */}
          {editingId === f.id && !f.isDefault && (
            <div className="border-t border-border/50 px-4 py-3 space-y-2.5 bg-background/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Label</label>
                  <input className={inp} value={f.label} onChange={e => updateLabel(f.id, e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Placeholder</label>
                  <input className={inp} value={f.placeholder || ''} onChange={e => updatePlaceholder(f.id, e.target.value)} placeholder="Hint text..." />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add custom field — popup dialog */}
      <button onClick={() => setShowAdd(true)}
        className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-xs font-black text-muted-foreground hover:border-primary hover:text-primary transition-all">
        + Add Custom Field
      </button>

      <Dialog open={showAdd} onOpenChange={o => { if (!o) setShowAdd(false); }}>
        <DialogContent className="max-w-sm bg-card border-border p-0">
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h3 className="font-syne font-black text-sm text-foreground">➕ New Custom Field</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Define a new field for the lead collection form</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Label *</label>
                <input className={inp} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Bank Account" autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Type</label>
                <select className={inp} value={newType} onChange={e => setNewType(e.target.value as LeadFieldDef['type'])}>
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 block">Placeholder</label>
              <input className={inp} value={newPlaceholder} onChange={e => setNewPlaceholder(e.target.value)} placeholder="Hint shown in the field..." />
            </div>
            <div className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
              <button onClick={() => setNewRequired(v => !v)}
                className={`w-9 h-5 rounded-full transition-all relative flex-shrink-0 ${newRequired ? 'bg-destructive/70' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${newRequired ? 'left-4' : 'left-0.5'}`} />
              </button>
              <div>
                <span className="text-xs font-bold text-foreground">Required Field</span>
                <p className="text-[10px] text-muted-foreground">{newRequired ? 'User must fill this field' : 'Optional — user can skip'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => { setShowAdd(false); setNewLabel(''); setNewPlaceholder(''); setNewType('text'); setNewRequired(false); }}
                className="py-2.5 text-xs font-black border border-border text-muted-foreground rounded-xl hover:border-primary transition-all">
                Cancel
              </button>
              <button onClick={addCustomField} disabled={!newLabel.trim()}
                className="py-2.5 text-xs font-black bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all">
                ✅ Add Field
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
