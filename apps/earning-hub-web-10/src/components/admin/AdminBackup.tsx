import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Download, Upload, Trash2, RefreshCw, CheckCircle, AlertTriangle,
  Clock, Database, HardDrive, RotateCcw, Users, Package, FileText, Heart,
} from 'lucide-react';
import { adminCreateBackup, adminGetBackups, adminGetBackupData, adminRestoreBackup, adminDeleteBackup, adminFactoryReset } from 'zitejs/api';
import type { AdminGetBackupsOutputType } from 'zitejs/api';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@project/components/ui/alert-dialog';
import { toast } from 'sonner';

type Backup = AdminGetBackupsOutputType['backups'][0];

interface RestoreOptions {
  restoreMode:        'replace' | 'merge';
  restoreOffers:      boolean;
  restoreForms:       boolean;
  restoreSettings:    boolean;
  restorePosters:     boolean;
  restoreLeads:       boolean;
  restoreSubmissions: boolean;
  restoreReferrals:   boolean;
}

interface BackupScope {
  includeLeads:       boolean;
  includeSubmissions: boolean;
  includeReferrals:   boolean;
}

interface Props { password: string }

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function sourceBadge(source: string) {
  const s = source.toLowerCase();
  if (s === 'auto') return 'bg-green-500/15 text-green-400 border-green-500/25';
  if (s === 'local restore') return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
  return 'bg-primary/10 text-primary border-primary/20';
}

// ── CORE items always shown in restore dialog ─────────────────────────────────
const CORE_RESTORE: { key: keyof RestoreOptions; label: string; desc: string; icon: string }[] = [
  { key: 'restoreOffers',   label: '🎯 Offers',         desc: 'All active and inactive offers',       icon: '🎯' },
  { key: 'restoreForms',    label: '📝 Cashback Forms',  desc: 'Custom proof submission forms',        icon: '📝' },
  { key: 'restoreSettings', label: '⚙️ Site Settings',   desc: 'Branding, promo, all configs',         icon: '⚙️' },
  { key: 'restorePosters',  label: '📢 News Posters',    desc: 'Homepage banners & announcement posts', icon: '📢' },
];

const OPT_RESTORE: { key: keyof RestoreOptions; label: string; desc: string; icon: string; warnDest: boolean }[] = [
  { key: 'restoreLeads',       label: '👥 Leads',              desc: 'User lead submissions',        icon: '👥', warnDest: true },
  { key: 'restoreSubmissions', label: '📋 Form Submissions',   desc: 'Cashback proof submissions',   icon: '📋', warnDest: true },
  { key: 'restoreReferrals',   label: '🤝 Referrals',          desc: 'Referral records',             icon: '🤝', warnDest: false },
];

// ── Restore options dialog ────────────────────────────────────────────────────
function RestoreDialog({
  label, backup, onConfirm, children,
}: {
  label: string;
  backup: { hasLeads: boolean; hasSubmissions: boolean; hasReferrals: boolean; hasPosters: boolean };
  onConfirm: (opts: RestoreOptions) => void;
  children: React.ReactNode;
}) {
  const [opts, setOpts] = useState<RestoreOptions>({
    restoreMode: 'replace', restoreOffers: true, restoreForms: true, restoreSettings: true, restorePosters: true,
    restoreLeads: true, restoreSubmissions: true, restoreReferrals: true,
  });
  const toggle = (key: keyof RestoreOptions) => setOpts(p => ({ ...p, [key]: !p[key] }));
  const noneSelected = !Object.values(opts).some(Boolean);
  const hasDangerous = opts.restoreLeads || opts.restoreSubmissions;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-syne text-foreground">Restore Backup?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Restoring <strong className="text-foreground">"{label}"</strong> will overwrite existing data. Choose what to restore:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Restore Mode Toggle */}
        <div className="p-3 rounded-xl border border-primary/25 bg-primary/5 space-y-2">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Restore Mode</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setOpts(p => ({ ...p, restoreMode: 'replace' }))}
              className={`p-3 rounded-xl border text-left transition-all ${opts.restoreMode === 'replace' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'}`}>
              <p className="text-xs font-black text-foreground">🔄 Replace (Clean Import)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Delete existing → restore from backup</p>
            </button>
            <button onClick={() => setOpts(p => ({ ...p, restoreMode: 'merge' }))}
              className={`p-3 rounded-xl border text-left transition-all ${opts.restoreMode === 'merge' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-emerald-500/30'}`}>
              <p className="text-xs font-black text-foreground">➕ Merge (Add to Existing)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Append backup records without deleting</p>
            </button>
          </div>
        </div>

        {/* Core items */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider px-1">Always Safe</p>
          {CORE_RESTORE.map(item => {
            const avail = item.key === 'restorePosters' ? backup.hasPosters : true;
            return (
              <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${!avail ? 'opacity-40 cursor-not-allowed border-border' : 'hover:border-primary/40 border-border'}`}>
                <input type="checkbox" checked={opts[item.key] as boolean} disabled={!avail}
                  onChange={() => avail && toggle(item.key)} className="accent-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{!avail ? 'Not in this backup' : item.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Optional destructive items */}
        <div className="space-y-1.5 mt-2">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider px-1">⚠️ Destructive — Overwrites All Records</p>
          {OPT_RESTORE.map(item => {
            const available = item.key === 'restoreLeads' ? backup.hasLeads
              : item.key === 'restoreSubmissions' ? backup.hasSubmissions
              : item.key === 'restoreReferrals' ? backup.hasReferrals : false;
            return (
              <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${!available ? 'opacity-40 cursor-not-allowed border-border' : (opts[item.key] as boolean) ? 'border-destructive/40 bg-destructive/5 cursor-pointer' : 'border-border hover:border-amber-500/40 cursor-pointer'}`}>
                <input type="checkbox" checked={opts[item.key] as boolean} disabled={!available}
                  onChange={() => available && toggle(item.key)} className="accent-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{!available ? 'Not in this backup' : `DELETE all current ${item.label.split(' ').pop()?.toLowerCase()} and restore from backup`}</p>
                </div>
              </label>
            );
          })}
        </div>

        {hasDangerous && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-bold text-red-400">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            ⚠️ Restoring destructive items will permanently DELETE all matching current records!
          </div>
        )}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-xs text-destructive font-medium">
          <AlertTriangle size={13} className="flex-shrink-0" /> This cannot be undone. Create a fresh backup first.
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-white font-black"
            onClick={() => onConfirm(opts)} disabled={noneSelected}
          >
            Restore Selected
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Scope toggle pill ─────────────────────────────────────────────────────────
function ScopeToggle({
  icon, label, desc, enabled, onToggle, warn = false,
}: {
  icon: React.ReactNode; label: string; desc: string;
  enabled: boolean; onToggle: () => void; warn?: boolean;
}) {
  return (
    <button onClick={onToggle}
      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all w-full ${
        enabled
          ? warn ? 'bg-amber-500/8 border-amber-500/30' : 'bg-primary/8 border-primary/30'
          : 'bg-background border-border hover:border-primary/30'
      }`}
    >
      <div className={`flex-shrink-0 ${enabled ? (warn ? 'text-amber-400' : 'text-primary') : 'text-muted-foreground'}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${enabled ? (warn ? 'text-amber-400' : 'text-primary') : 'text-foreground'}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <div className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${enabled ? (warn ? 'bg-amber-500' : 'bg-primary') : 'bg-border'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminBackup({ password }: Props) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingLocal, setPendingLocal] = useState<{
    data: string; name: string;
    has: { leads: boolean; submissions: boolean; referrals: boolean; posters: boolean };
  } | null>(null);
  const [localRestoreOpts, setLocalRestoreOpts] = useState<RestoreOptions>({
    restoreMode: 'replace', restoreOffers: true, restoreForms: true, restoreSettings: true, restorePosters: true,
    restoreLeads: true, restoreSubmissions: true, restoreReferrals: true,
  });
  const [scope, setScope] = useState<BackupScope>({
    includeLeads: true, includeSubmissions: true, includeReferrals: true,
  });
  const [backupLabel, setBackupLabel] = useState('');
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoBackupRef = useRef<number>(0);
  const [autoBackupStatus, setAutoBackupStatus] = useState<'idle' | 'running'>('idle');
  const [nextAutoIn, setNextAutoIn] = useState(300);

  useEffect(() => { loadBackups(); }, []);

  useEffect(() => {
    const countdown = setInterval(() => setNextAutoIn(s => s <= 1 ? 300 : s - 1), 1000);
    const backupInterval = setInterval(async () => {
      if (autoBackupRef.current !== 0) return;
      autoBackupRef.current = 1;
      setAutoBackupStatus('running');
      try {
        await adminCreateBackup({ password, source: 'auto', includeLeads: false, includeSubmissions: false, includeReferrals: false });
        toast.success('🤖 Auto-backup saved', { duration: 2500 });
        loadBackups();
      } catch {} finally {
        autoBackupRef.current = 0; setAutoBackupStatus('idle'); setNextAutoIn(300);
      }
    }, 5 * 60 * 1000);
    return () => { clearInterval(countdown); clearInterval(backupInterval); };
  }, [password]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await adminGetBackups({ password });
      setBackups(res.backups);
      if (res.backups.length === 0 || (res.backups[0]?.createdAt && Date.now() - new Date(res.backups[0].createdAt).getTime() > 86_400_000)) {
        createBackup('auto');
      }
    } catch { toast.error('Could not load backups'); }
    finally { setLoading(false); }
  }

  async function createBackup(source: 'manual' | 'auto' = 'manual') {
    setCreating(true);
    try {
      const res = await adminCreateBackup({
        password, source,
        includeLeads:       source === 'manual' ? scope.includeLeads : false,
        includeSubmissions: source === 'manual' ? scope.includeSubmissions : false,
        includeReferrals:   source === 'manual' ? scope.includeReferrals : false,
      });
      const driveMsg = (res as { driveFileId?: string }).driveFileId ? ' ☁️ Saved to Drive' : '';
      if (source === 'manual') {
        toast.success(`✅ Backup created${driveMsg}`);
        downloadJson(res.data, res.backupId.slice(0, 8));
      }
      await loadBackups();
    } catch { toast.error('Backup failed'); }
    finally { setCreating(false); }
  }

  function downloadJson(data: string, suffix = 'backup') {
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `earninghub-backup-${suffix}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function downloadCloudBackup(backup: Backup) {
    setDownloadingId(backup.id);
    try {
      const res = await adminGetBackupData({ password, backupId: backup.id });
      downloadJson(res.data, backup.id.slice(0, 8));
      toast.success('Downloaded to device');
    } catch { toast.error('Download failed'); }
    finally { setDownloadingId(null); }
  }

  async function restoreFrom(data: string, opts: RestoreOptions) {
    try {
      const res = await adminRestoreBackup({ password, data, ...opts });
      const parts: string[] = [];
      if (opts.restoreOffers)      parts.push(`${res.offersRestored} offers`);
      if (opts.restoreForms)       parts.push(`${res.formsRestored} forms`);
      if (opts.restorePosters)     parts.push(`${res.postersRestored} posters`);
      if (opts.restoreSettings && res.settingsRestored) parts.push('settings');
      if (opts.restoreLeads)       parts.push(`${res.leadsRestored} leads`);
      if (opts.restoreSubmissions) parts.push(`${res.submissionsRestored} submissions`);
      if (opts.restoreReferrals)   parts.push(`${res.referralsRestored} referrals`);
      toast.success(`✅ Restored: ${parts.join(', ')}`);
    } catch (e: any) { toast.error(e?.message || 'Restore failed'); }
  }

  async function restoreCloud(backup: Backup, opts: RestoreOptions) {
    setRestoringId(backup.id);
    try {
      const { data } = await adminGetBackupData({ password, backupId: backup.id });
      await restoreFrom(data, opts);
    } catch { toast.error('Could not fetch backup data'); }
    finally { setRestoringId(null); }
  }

  async function deleteBackup(id: string) {
    setDeletingId(id);
    try {
      await adminDeleteBackup({ password, backupId: id });
      setBackups(prev => prev.filter(b => b.id !== id));
      toast.success('Backup deleted');
    } catch { toast.error('Delete failed'); }
    finally { setDeletingId(null); }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text   = await file.text();
      const parsed = JSON.parse(text);
      setPendingLocal({
        data: text, name: file.name,
        has: {
          leads:       Array.isArray(parsed.leads)       && parsed.leads.length > 0,
          submissions: Array.isArray(parsed.submissions) && parsed.submissions.length > 0,
          referrals:   Array.isArray(parsed.referrals)   && parsed.referrals.length > 0,
          posters:     Array.isArray(parsed.posters)     && parsed.posters.length > 0,
        },
      });
      setLocalRestoreOpts({ restoreMode: 'replace', restoreOffers: true, restoreForms: true, restoreSettings: true, restorePosters: true, restoreLeads: true, restoreSubmissions: true, restoreReferrals: true });
    } catch { toast.error('Invalid backup file — must be valid JSON'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  function getBackupHas(backup: Backup) {
    const summary = backup.summary || '';
    return {
      hasLeads:       summary.includes('Leads'),
      hasSubmissions: summary.includes('Submissions'),
      hasReferrals:   summary.includes('Referrals'),
      hasPosters:     summary.includes('Posters'),
    };
  }

  const lastBackup = backups[0];
  const hasAnyOptional = scope.includeLeads || scope.includeSubmissions || scope.includeReferrals;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">

      {/* Status Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Database size={18} className="text-primary" />, label: 'Cloud Backups', value: loading ? '…' : String(backups.length), sub: 'stored in database' },
          { icon: <Clock size={18} className="text-green-400" />, label: 'Last Backup', value: loading ? '…' : (lastBackup ? formatDate(lastBackup.createdAt) : 'Never'), sub: lastBackup?.source || '—' },
          { icon: <CheckCircle size={18} className={autoBackupStatus === 'running' ? 'text-amber-400 animate-spin' : 'text-blue-400'} />, label: 'Auto-Backup', value: autoBackupStatus === 'running' ? '⏳ Running…' : 'Every 5 Min', sub: `Next in ${Math.floor(nextAutoIn / 60)}:${String(nextAutoIn % 60).padStart(2, '0')}` },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">{stat.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{stat.label}</p>
              <p className="font-syne font-black text-foreground text-sm leading-snug mt-0.5">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Backup Scope ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Package size={16} className="text-primary" />
          <h3 className="font-syne font-black text-foreground text-sm">Backup Scope — Choose What to Include</h3>
        </div>

        {/* Always included */}
        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">✅ Always Included (Core Data)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: '🎯', label: 'Offers',        desc: 'All active + inactive' },
              { icon: '📝', label: 'Forms',          desc: 'Custom cashback forms' },
              { icon: '📢', label: 'News Posters',   desc: 'Homepage banners' },
              { icon: '⚙️', label: 'Site Settings',  desc: 'Branding & config' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-green-400 truncate">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{item.desc}</p>
                </div>
                <CheckCircle size={11} className="text-green-400 flex-shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Optional toggles */}
        <div>
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-2">⚠️ Optional Large Data (Toggle to Include)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ScopeToggle
              icon={<Users size={15} />} label="Leads Data" desc="User lead submissions" warn
              enabled={scope.includeLeads} onToggle={() => setScope(p => ({ ...p, includeLeads: !p.includeLeads }))}
            />
            <ScopeToggle
              icon={<FileText size={15} />} label="Form Submissions" desc="Cashback proof entries" warn
              enabled={scope.includeSubmissions} onToggle={() => setScope(p => ({ ...p, includeSubmissions: !p.includeSubmissions }))}
            />
            <ScopeToggle
              icon={<Heart size={15} />} label="Referrals" desc="Referral program records"
              enabled={scope.includeReferrals} onToggle={() => setScope(p => ({ ...p, includeReferrals: !p.includeReferrals }))}
            />
          </div>
          {hasAnyOptional && (
            <div className="flex items-start gap-2 p-3 mt-2 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400 font-medium">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              Including large tables significantly increases backup size. Auto-backups never include optional data.
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 mb-1">
            <Cloud size={18} className="text-primary" />
            <h3 className="font-syne font-black text-foreground text-sm">Cloud Backup</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Snapshot saved to database + downloaded locally.{' '}
            {hasAnyOptional && <span className="text-amber-400 font-bold">Extended scope selected.</span>}
          </p>
          <div className="p-3 bg-background rounded-xl border border-border text-[10px] text-muted-foreground">
            <span className="text-green-400 font-black">✓ Core:</span> Offers · Forms · Posters · Settings
            {scope.includeLeads && <><br /><span className="text-amber-400 font-black">+ Leads</span></>}
            {scope.includeSubmissions && <><br /><span className="text-amber-400 font-black">+ Form Submissions</span></>}
            {scope.includeReferrals && <><br /><span className="text-amber-400 font-black">+ Referrals</span></>}
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">Backup Label (optional)</p>
            <input
              value={backupLabel}
              onChange={e => setBackupLabel(e.target.value)}
              placeholder="e.g. Pre-cleanup backup, Before migration…"
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors mb-3"
              maxLength={80}
            />
          </div>
          <button
            onClick={() => createBackup('manual')} disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-syne font-black text-sm hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {creating ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
            {creating ? 'Creating Backup…' : '💾 Backup Now'}
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 mb-1">
            <HardDrive size={18} className="text-purple-400" />
            <h3 className="font-syne font-black text-foreground text-sm">Restore from Local File</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a previously downloaded <code className="text-primary text-[11px]">.json</code> backup to restore data.
          </p>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-syne font-black text-sm hover:bg-purple-500/25 transition-all disabled:opacity-60"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Restoring…' : '📂 Upload & Restore'}
          </button>
        </div>
      </div>

      {/* ── Factory Reset ──────────────────────────────────────────────────── */}
      <div className="bg-card border-2 border-destructive/25 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2.5 mb-1">
          <Trash2 size={18} className="text-destructive" />
          <h3 className="font-syne font-black text-foreground text-sm">🗑️ Factory Reset — Clear All Data</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Permanently delete <strong className="text-destructive">ALL</strong> offers, leads, form submissions, referrals, and referral links.
          This cannot be undone. <strong className="text-foreground">Create a full backup first.</strong>
        </p>
        <AlertDialog open={showFactoryReset} onOpenChange={o => { if (!o) { setShowFactoryReset(false); setResetConfirmText(''); } }}>
          <AlertDialogTrigger asChild>
            <button
              onClick={() => setShowFactoryReset(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-destructive/40 bg-destructive/5 text-destructive font-syne font-black text-sm hover:bg-destructive/15 transition-all"
            >
              <Trash2 size={14} /> Factory Reset
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-syne font-black text-destructive flex items-center gap-2">
                <AlertTriangle size={18} /> ⚠️ Permanent Destruction
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground space-y-3">
                <span className="block">This will <strong className="text-destructive">permanently delete ALL data</strong>:</span>
                <span className="block text-xs space-y-1">
                  <span className="block">• All Offers (active + inactive)</span>
                  <span className="block">• All Leads & submissions</span>
                  <span className="block">• All Cashback Form submissions</span>
                  <span className="block">• All Referrals & referral links</span>
                </span>
                <span className="block text-destructive font-black text-sm">Type "DELETE ALL" to confirm:</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              placeholder='Type "DELETE ALL" here…'
              className="w-full px-4 py-3 bg-background border-2 border-destructive/30 text-foreground text-sm font-mono rounded-xl focus:outline-none focus:border-destructive transition-colors text-center"
              autoFocus
            />
            <AlertDialogFooter>
              <AlertDialogCancel className="font-bold border-border" onClick={() => { setShowFactoryReset(false); setResetConfirmText(''); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white font-black"
                disabled={resetConfirmText !== 'DELETE ALL' || resetting}
                onClick={async () => {
                  setResetting(true);
                  try {
                    const res = await adminFactoryReset({ password, confirmText: 'DELETE ALL' });
                    toast.success(`🗑️ Factory reset complete! Deleted: ${res.deletedOffers} offers, ${res.deletedLeads} leads, ${res.deletedSubmissions} submissions, ${res.deletedReferrals} referrals, ${res.deletedReferralLinks} referral links.`);
                  } catch (e: any) { toast.error(e?.message || 'Factory reset failed'); }
                  finally { setResetting(false); setShowFactoryReset(false); setResetConfirmText(''); }
                }}
              >
                {resetting ? '⏳ Deleting Everything…' : '☠️ Confirm Factory Reset'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ── Cloud Backup List ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-syne font-black text-foreground text-base flex items-center gap-2">
            <Cloud size={16} className="text-primary" /> Cloud Backups
          </h3>
          <button onClick={loadBackups} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />)}</div>
        ) : backups.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <Database size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-black text-sm text-foreground">No backups yet</p>
            <p className="text-xs mt-1">Click "Backup Now" to create your first backup</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2.5">
              {backups.map((backup, i) => {
                const has = getBackupHas(backup);
                return (
                  <motion.div key={backup.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.04 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground text-sm truncate max-w-[250px]">{backup.label}</p>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sourceBadge(backup.source)}`}>
                          {backup.source}
                        </span>
                        {i === 0 && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400">Latest</span>}
                        {has.hasLeads       && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">+Leads</span>}
                        {has.hasSubmissions && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-400">+Submissions</span>}
                        {has.hasReferrals   && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-400">+Referrals</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">{backup.summary}</span>
                        <span className="text-[11px] text-muted-foreground/60">· {formatDate(backup.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => downloadCloudBackup(backup)} disabled={downloadingId === backup.id}
                        title="Download as JSON"
                        className="p-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all disabled:opacity-50">
                        {downloadingId === backup.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>

                      <RestoreDialog label={backup.label} backup={has} onConfirm={opts => restoreCloud(backup, opts)}>
                        <button disabled={restoringId === backup.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-50">
                          {restoringId === backup.id ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          {restoringId === backup.id ? 'Restoring…' : 'Restore'}
                        </button>
                      </RestoreDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button disabled={deletingId === backup.id}
                            className="p-2 rounded-xl border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all disabled:opacity-50">
                            {deletingId === backup.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-syne font-black">Delete Backup?</AlertDialogTitle>
                            <AlertDialogDescription>"{backup.label}" will be permanently deleted.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border font-bold">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-white font-black" onClick={() => deleteBackup(backup.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Local Restore Dialog */}
      <AlertDialog open={!!pendingLocal} onOpenChange={open => !open && setPendingLocal(null)}>
        <AlertDialogContent className="max-w-lg bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground">Restore from Local File?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Restoring <strong className="text-foreground">"{pendingLocal?.name}"</strong> will overwrite data. Choose what to restore:
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Local Restore Mode Toggle */}
          <div className="p-3 rounded-xl border border-primary/25 bg-primary/5 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Restore Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setLocalRestoreOpts(p => ({ ...p, restoreMode: 'replace' }))}
                className={`p-3 rounded-xl border text-left transition-all ${localRestoreOpts.restoreMode === 'replace' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'}`}>
                <p className="text-xs font-black text-foreground">🔄 Replace</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Delete existing → restore</p>
              </button>
              <button onClick={() => setLocalRestoreOpts(p => ({ ...p, restoreMode: 'merge' }))}
                className={`p-3 rounded-xl border text-left transition-all ${localRestoreOpts.restoreMode === 'merge' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-emerald-500/30'}`}>
                <p className="text-xs font-black text-foreground">➕ Merge</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Add without deleting</p>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider px-1">Always Safe</p>
            {CORE_RESTORE.map(item => {
              const avail = item.key === 'restorePosters' ? (pendingLocal?.has.posters ?? false) : true;
              return (
                <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${!avail ? 'opacity-40 cursor-not-allowed border-border' : 'hover:border-primary/40 border-border'}`}>
                  <input type="checkbox" checked={localRestoreOpts[item.key] as boolean} disabled={!avail}
                    onChange={() => avail && setLocalRestoreOpts(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className="accent-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{!avail ? 'Not in this backup' : item.desc}</p>
                  </div>
                </label>
              );
            })}
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider px-1 mt-2">⚠️ Destructive</p>
            {OPT_RESTORE.map(item => {
              const avail = item.key === 'restoreLeads' ? (pendingLocal?.has.leads ?? false)
                : item.key === 'restoreSubmissions' ? (pendingLocal?.has.submissions ?? false)
                : (pendingLocal?.has.referrals ?? false);
              return (
                <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${!avail ? 'opacity-40 cursor-not-allowed border-border' : (localRestoreOpts[item.key] as boolean) ? 'border-destructive/40 bg-destructive/5 cursor-pointer' : 'border-border hover:border-amber-500/40 cursor-pointer'}`}>
                  <input type="checkbox" checked={localRestoreOpts[item.key] as boolean} disabled={!avail}
                    onChange={() => avail && setLocalRestoreOpts(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className="accent-destructive flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{!avail ? 'Not in this backup' : item.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {(localRestoreOpts.restoreLeads || localRestoreOpts.restoreSubmissions) && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-bold text-red-400">
              <AlertTriangle size={13} className="flex-shrink-0" /> ⚠️ This will DELETE all current matching records permanently!
            </div>
          )}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-xs text-destructive font-medium">
            <AlertTriangle size={13} className="flex-shrink-0" /> This action cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setPendingLocal(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white font-black"
              onClick={async () => {
                if (!pendingLocal) return;
                setUploading(true);
                try { await restoreFrom(pendingLocal.data, localRestoreOpts); setPendingLocal(null); }
                catch { toast.error('Restore failed'); }
                finally { setUploading(false); }
              }}
              disabled={uploading || !Object.values(localRestoreOpts).some(Boolean)}
            >
              {uploading ? 'Restoring…' : 'Restore Selected'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drive & Security notices */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-lg">☁️</div>
        <div className="text-xs text-muted-foreground flex-1">
          <p className="font-bold text-foreground mb-1 flex items-center gap-2">
            Google Drive Auto-Sync
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">Connected</span>
          </p>
          Every manual backup is automatically uploaded to Google Drive as <code className="text-primary bg-primary/10 px-1 rounded">EarningHub-Backup-*.json</code>.
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <CheckCircle size={16} className="text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="font-bold text-foreground mb-0.5">Backup Security</p>
          Backups are stored in your private database and Drive. Restore requires admin authentication. Optional data (leads, submissions) contains personal user info — handle with care.
        </div>
      </div>
    </div>
  );
}
