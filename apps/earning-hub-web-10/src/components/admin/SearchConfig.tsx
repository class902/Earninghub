import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getSettings, adminSaveSettings, GetSettingsOutputType } from 'zitejs/api';
import LeadFieldsConfig from './LeadFieldsConfig';
import type { LeadFieldDef } from '@/types';
import { DEFAULT_LEAD_FIELDS } from '@/types';

interface Props { password: string }

export default function SearchConfig({ password }: Props) {
  const [fields, setFields] = useState<LeadFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const settingsRef = useRef<GetSettingsOutputType | null>(null);

  useEffect(() => {
    getSettings({}).then(res => {
      settingsRef.current = res;
      if (res.leadFieldsConfig) {
        try {
          const parsed = JSON.parse(res.leadFieldsConfig);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFields(parsed);
            setLoading(false);
            return;
          }
        } catch {}
      }
      setFields(DEFAULT_LEAD_FIELDS);
      setLoading(false);
    }).catch(() => { setFields(DEFAULT_LEAD_FIELDS); setLoading(false); });
  }, []);

  async function handleSave(updated: LeadFieldDef[]) {
    setFields(updated);
    setSaving(true);
    try {
      const s = settingsRef.current;
      await adminSaveSettings({
        password,
        googleFormUrl: s?.googleFormUrl || '',
        googleFormLabel: s?.googleFormLabel || 'Apply Now',
        googleFormEnabled: s?.googleFormEnabled ?? false,
        leadFieldsConfig: JSON.stringify(updated),
      });
      toast.success('Search configuration saved ✅');
    } catch {
      toast.error('Failed to save. Try again.');
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="font-syne font-black text-lg text-foreground">🔍 Search Configuration</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Control which lead fields are searchable by users in the Cashback Tracker.
          Toggle the 🔎 icon to enable/disable search for each field.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-primary">How it works:</strong> When a user searches in the Cashback Tracker,
          only fields marked as <span className="text-emerald-500 font-bold">🔍 Searchable</span> will be matched.
          Disable fields you don't want users to search by. Changes take effect immediately.
        </p>
      </div>

      <LeadFieldsConfig fields={fields} onChange={handleSave} />

      {saving && (
        <div className="flex items-center gap-2 text-sm text-primary font-semibold">
          <span className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          Saving changes…
        </div>
      )}
    </div>
  );
}
