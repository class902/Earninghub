import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X, Copy, Pencil, Save, Send, ExternalLink, RefreshCw,
  Play, Pause, XCircle, Ban, Clock, Link2, BarChart2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Sheet, SheetContent } from '@project/components/ui/sheet';
import { Skeleton } from '@project/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import {
  adminGetLinkDetail, adminUpdateReferralLink, adminUpdateLinkStatus,
  adminExtendLinkExpiry,
  type AdminGetLinkDetailOutputType,
} from 'zitejs/api';

type DetailData = AdminGetLinkDetailOutputType;

const STATUS_MAP: Record<string, { bg: string; text: string; icon: typeof Play; label: string }> = {
  Active: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: Play, label: 'Active' },
  Paused: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: Pause, label: 'Paused' },
  Expired: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-400', icon: Clock, label: 'Expired' },
  Terminated: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: XCircle, label: 'Terminated' },
  Revoked: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: Ban, label: 'Revoked' },
  Disabled: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-400', icon: XCircle, label: 'Disabled' },
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  Clicked: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  'Offer Opened': 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Registered: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  Submitted: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  'Under Review': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  Qualified: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Rejected: 'bg-red-500/10 border-red-500/20 text-red-400',
  'Not Qualified': 'bg-red-500/10 border-red-500/20 text-red-400',
  Cancelled: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  Pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  Approved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'In Review': 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  'Cashback Sent': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Missing: 'bg-red-500/10 border-red-500/20 text-red-400',
  Hold: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  Paid: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Eligible: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Failed: 'bg-red-500/10 border-red-500/20 text-red-400',
};

function fmtDate(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
}
function fmtDateTime(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
}
function fmtCurrency(n: number) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 }); }
function maskUpi(upi: string) {
  if (!upi) return '—';
  const at = upi.indexOf('@');
  if (at < 0) return upi.length <= 4 ? upi : upi.slice(0, 4) + '••••';
  const p = upi.slice(0, at), s = upi.slice(at);
  return (p.length <= 4 ? p : p.slice(0, 4) + '••••') + s;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.Active;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black ${s.bg} ${s.text}`}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

function LeadStatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-black ${LEAD_STATUS_COLORS[status] || 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
}

/* ── Stat Card ── */
function StatCard({ label, value, color = 'text-foreground', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-3 text-center">
      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`font-syne font-black text-xl ${color}`}>{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Editable Referrer Profile ── */
function ReferrerProfile({ data, password, onSaved }: { data: DetailData; password: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(data.link.referrerName);
  const [upi, setUpi] = useState(data.link.referrerUpi);
  const [referrerCut, setReferrerCut] = useState(String(data.link.referrerCut));
  const [userCut, setUserCut] = useState(String(data.link.userCut));
  const [note, setNote] = useState(data.link.internalNote);

  // Parse custom data for phone/email
  let customData: Record<string, string> = {};
  try { customData = JSON.parse(data.link.customReferrerData || '{}'); } catch {}
  const [phone, setPhone] = useState(customData.phone || customData.mobile || '');
  const [email, setEmail] = useState(customData.email || '');

  useEffect(() => {
    setName(data.link.referrerName);
    setUpi(data.link.referrerUpi);
    setReferrerCut(String(data.link.referrerCut));
    setUserCut(String(data.link.userCut));
    setNote(data.link.internalNote);
    try {
      const cd = JSON.parse(data.link.customReferrerData || '{}');
      setPhone(cd.phone || cd.mobile || '');
      setEmail(cd.email || '');
    } catch {}
  }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      const updatedCustom = { ...customData, phone, email };
      await adminUpdateReferralLink({
        password,
        id: data.link.id,
        referrerName: name,
        referrerUpi: upi,
        referrerCut: parseFloat(referrerCut) || 0,
        userCut: parseFloat(userCut) || 0,
        internalNote: note,
        customReferrerData: JSON.stringify(updatedCustom),
      });
      toast.success('Profile updated ✅');
      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      toast.error(String((e as { message?: string })?.message || 'Update failed'));
    } finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">👤 Referrer Profile</p>
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black rounded-lg hover:bg-primary/20 transition-all">
            <Pencil size={10} /> Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: 'Name', v: data.link.referrerName || '—' },
            { l: 'UPI ID', v: data.link.referrerUpi || '—' },
            { l: 'Phone', v: phone || '—' },
            { l: 'Email', v: email || '—' },
            { l: 'Referrer Payout', v: fmtCurrency(data.link.referrerCut) },
            { l: 'User Payout', v: fmtCurrency(data.link.userCut) },
          ].map(item => (
            <div key={item.l} className="bg-background border border-border rounded-xl p-2.5">
              <p className="text-[8px] font-black text-muted-foreground uppercase">{item.l}</p>
              <p className="text-xs font-bold text-foreground mt-0.5 truncate">{item.v}</p>
            </div>
          ))}
        </div>
        {data.link.internalNote && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-2.5">
            <p className="text-[8px] font-black text-amber-400 uppercase mb-0.5">📝 Internal Note</p>
            <p className="text-xs text-foreground">{data.link.internalNote}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">✏️ Edit Referrer</p>
        <button onClick={() => setEditing(false)} className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground"><X size={12} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <EditField label="Name" value={name} onChange={setName} />
        <EditField label="UPI ID" value={upi} onChange={setUpi} />
        <EditField label="Phone" value={phone} onChange={setPhone} />
        <EditField label="Email" value={email} onChange={setEmail} />
        <EditField label="Referrer Payout ₹" value={referrerCut} onChange={setReferrerCut} type="number" />
        <EditField label="User Payout ₹" value={userCut} onChange={setUserCut} type="number" />
      </div>
      <div>
        <label className="text-[8px] font-black text-muted-foreground uppercase block mb-1">Internal Note</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
          className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl resize-none focus:outline-none focus:border-primary" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/90 disabled:opacity-60 transition-all">
        <Save size={12} /> {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[8px] font-black text-muted-foreground uppercase block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary" />
    </div>
  );
}

/* ── Share Section ── */
function ShareSection({ data }: { data: DetailData }) {
  const offerLink = data.offerLink;
  const dashboardLink = data.dashboardLink;
  const referLink = `${appOrigin()}/refer/${data.link.referralCode}`;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied! 📋`)).catch(() => toast.error('Copy failed'));
  }

  function shareWhatsApp(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">🔗 Share & Links</p>
      {[
        { label: 'Referral Link', url: referLink, icon: Link2, color: 'text-primary' },
        { label: 'Offer Page', url: offerLink, icon: ExternalLink, color: 'text-emerald-400' },
        { label: 'Tracker Dashboard', url: dashboardLink, icon: BarChart2, color: 'text-violet-400' },
      ].map(item => (
        <div key={item.label} className="bg-background border border-border rounded-xl p-3 flex items-center gap-3">
          <item.icon size={14} className={item.color + ' flex-shrink-0'} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-muted-foreground uppercase">{item.label}</p>
            <p className="text-[10px] text-foreground font-mono truncate">{item.url}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => copy(item.url, item.label)} title="Copy" className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all">
              <Copy size={11} />
            </button>
            <button onClick={() => shareWhatsApp(`${item.label}: ${item.url}`)} title="WhatsApp" className="p-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all">
              <Send size={11} />
            </button>
            <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all">
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Performance Section ── */
function PerformanceSection({ perf }: { perf: DetailData['performance'] }) {
  const funnelSteps = [
    { label: 'Clicks', value: perf.clicks, color: 'text-blue-400' },
    { label: 'Unique', value: perf.uniqueClicks, color: 'text-indigo-400' },
    { label: 'Leads', value: perf.leads, color: 'text-primary' },
    { label: 'Submitted', value: perf.submitted, color: 'text-amber-400' },
    { label: 'Qualified', value: perf.qualified, color: 'text-emerald-400' },
    { label: 'Completed', value: perf.completed, color: 'text-emerald-400' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">📊 Performance Funnel</p>
      {/* Funnel visual */}
      <div className="space-y-1.5">
        {funnelSteps.map((step, i) => {
          const maxVal = Math.max(perf.clicks, 1);
          const widthPct = Math.max(((step.value / maxVal) * 100), 8);
          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="text-[9px] font-black text-muted-foreground uppercase w-16 text-right flex-shrink-0">{step.label}</span>
              <div className="flex-1 h-7 bg-background border border-border rounded-lg overflow-hidden relative">
                <div
                  className={`h-full rounded-lg transition-all duration-500 ${i === 0 ? 'bg-blue-500/20' : i < 3 ? 'bg-primary/20' : 'bg-emerald-500/20'}`}
                  style={{ width: `${widthPct}%` }}
                />
                <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-black ${step.color}`}>{step.value}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Conversion & Rejection */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Conversion" value={`${perf.conversionRate}%`} color="text-primary" />
        <StatCard label="Under Review" value={perf.underReview} color="text-amber-400" />
        <StatCard label="Rejected" value={perf.rejected} color="text-red-400" />
      </div>
    </div>
  );
}

/* ── Reward Summary Section ── */
function RewardSection({ reward }: { reward: DetailData['rewardSummary'] }) {
  return (
    <div className="space-y-3">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">💰 Reward Summary</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-muted-foreground uppercase">Total Earnings</p>
          <p className="font-syne font-black text-2xl text-primary">{fmtCurrency(reward.totalReward)}</p>
          <p className="text-[9px] text-muted-foreground">Cashback: {fmtCurrency(reward.totalCashback)}</p>
        </div>
        <StatCard label="Pending" value={reward.pending} color="text-amber-400" />
        <StatCard label="Eligible" value={reward.eligible} color="text-blue-400" />
        <StatCard label="Approved" value={reward.approved} color="text-emerald-400" />
        <StatCard label="Paid" value={reward.paid} color="text-emerald-400" />
        <StatCard label="Failed" value={reward.failed} color="text-red-400" />
      </div>
    </div>
  );
}

/* ── Leads Table ── */
function LeadsSection({ referrals, linkedLeads, onNavigate }: {
  referrals: DetailData['referrals'];
  linkedLeads: DetailData['linkedLeads'];
  onNavigate?: (page: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const totalLeads = referrals.length + linkedLeads.length;
  const allStatuses = [...new Set([...referrals.map(r => r.leadStatus), ...linkedLeads.map(l => l.status)])];

  const filteredReferrals = filter ? referrals.filter(r => r.leadStatus === filter) : referrals;
  const filteredLinked = filter ? linkedLeads.filter(l => l.status === filter) : linkedLeads;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">📋 All Leads ({totalLeads})</p>
        {onNavigate && (
          <button onClick={() => onNavigate('leads')} className="text-[10px] font-black text-primary hover:underline">Open Leads →</button>
        )}
      </div>

      {/* Status filter pills */}
      {allStatuses.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter('')}
            className={`px-2.5 py-1 rounded-full text-[9px] font-black border transition-all ${!filter ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
            All ({totalLeads})
          </button>
          {allStatuses.map(s => {
            const count = referrals.filter(r => r.leadStatus === s).length + linkedLeads.filter(l => l.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(s === filter ? '' : s)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black border transition-all ${filter === s ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
                {s} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Referral Leads */}
      {filteredReferrals.length > 0 && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {filteredReferrals.map(ref => (
            <div key={ref.id} className="bg-background border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-foreground truncate">{ref.referredUserName || ref.referredUserIdentifier || '—'}</p>
                  {ref.referredUserIdentifier && ref.referredUserName && (
                    <p className="text-[9px] text-muted-foreground font-mono truncate">{ref.referredUserIdentifier}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {ref.rewardAmount > 0 && <p className="text-xs font-black text-emerald-400">{fmtCurrency(ref.rewardAmount)}</p>}
                  {ref.cashbackAmount > 0 && <p className="text-[9px] text-muted-foreground">CB: {fmtCurrency(ref.cashbackAmount)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <LeadStatusPill status={ref.leadStatus} />
                <LeadStatusPill status={ref.cashbackStatus} />
                <LeadStatusPill status={ref.rewardStatus} />
                <span className="text-[9px] text-muted-foreground ml-auto">{fmtDate(ref.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Linked Leads from Leads table */}
      {filteredLinked.length > 0 && (
        <>
          {filteredReferrals.length > 0 && <div className="border-t border-border" />}
          <p className="text-[8px] font-black text-muted-foreground uppercase">Linked Leads ({filteredLinked.length})</p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {filteredLinked.map(lead => (
              <div key={lead.id} className="bg-background border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-foreground truncate">{lead.userName}</p>
                    {lead.userUpi && <p className="text-[9px] text-muted-foreground font-mono truncate">{maskUpi(lead.userUpi)}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {lead.userGot > 0 && <p className="text-xs font-black text-emerald-400">{fmtCurrency(lead.userGot)}</p>}
                    {lead.offerPayout > 0 && <p className="text-[9px] text-muted-foreground">{fmtCurrency(lead.offerPayout)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold">{lead.offerName}</span>
                  <LeadStatusPill status={lead.status} />
                  <LeadStatusPill status={lead.payoutStatus} />
                  <span className="text-[9px] text-muted-foreground ml-auto">{lead.leadId} • {fmtDate(lead.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {totalLeads === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm text-muted-foreground">No leads yet for this link</p>
        </div>
      )}
    </div>
  );
}

/* ── Timeline ── */
function TimelineSection({ timeline }: { timeline: DetailData['timeline'] }) {
  const [expanded, setExpanded] = useState(false);
  if (timeline.length === 0) return null;
  const visible = expanded ? timeline : timeline.slice(0, 3);
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">🕐 Audit Timeline</p>
      <div className="relative pl-4 space-y-2">
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
        {visible.map((evt, i) => (
          <div key={i} className="relative bg-background border border-border rounded-xl p-3">
            <div className="absolute left-[-17px] top-3 w-3 h-3 rounded-full bg-primary border-2 border-card" />
            <p className="text-xs font-bold text-foreground">{evt.action}</p>
            <div className="flex gap-2 mt-0.5">
              {evt.previousValue && <span className="text-[9px] text-red-400 line-through">{evt.previousValue}</span>}
              {evt.newValue && <span className="text-[9px] text-emerald-400">{evt.newValue}</span>}
            </div>
            {evt.reason && <p className="text-[9px] text-muted-foreground mt-0.5">{evt.reason}</p>}
            <p className="text-[9px] text-muted-foreground mt-1">{evt.actor} • {fmtDateTime(evt.createdAt)}</p>
          </div>
        ))}
      </div>
      {timeline.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline">
          {expanded ? <><ChevronUp size={10} /> Show Less</> : <><ChevronDown size={10} /> Show {timeline.length - 3} More</>}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
interface Props {
  linkId: string | null;
  password: string;
  onClose: () => void;
  onRefresh: () => void;
  onNavigate?: (page: string) => void;
}

export default function LinkDetailDashboard({ linkId, password, onClose, onRefresh, onNavigate }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);

  // Action dialogs
  const [actionType, setActionType] = useState<'pause' | 'terminate' | 'revoke' | 'extend' | ''>('');
  const [actionReason, setActionReason] = useState('');
  const [actionExpiry, setActionExpiry] = useState('');
  const [acting, setActing] = useState(false);

  const loadDetail = useCallback(() => {
    if (!linkId) return;
    setLoading(true);
    adminGetLinkDetail({ password, linkId })
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load link detail'))
      .finally(() => setLoading(false));
  }, [linkId, password]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  async function handleAction() {
    if (!data || !actionType) return;
    setActing(true);
    try {
      if (actionType === 'extend') {
        if (!actionExpiry) { toast.error('Select new expiry date'); setActing(false); return; }
        await adminExtendLinkExpiry({ password, linkId: data.link.id, newExpiryDate: actionExpiry, reason: actionReason || undefined });
        toast.success('Expiry extended ✅');
      } else {
        const statusMap = { pause: 'Paused', terminate: 'Terminated', revoke: 'Revoked' } as const;
        await adminUpdateLinkStatus({ password, linkId: data.link.id, targetStatus: statusMap[actionType], reason: actionReason || undefined });
        toast.success(`Link ${actionType}d ✅`);
      }
      setActionType(''); setActionReason(''); setActionExpiry('');
      loadDetail();
      onRefresh();
    } catch (e: unknown) {
      toast.error(String((e as { message?: string })?.message || 'Action failed'));
    } finally { setActing(false); }
  }

  async function handleResume() {
    if (!data) return;
    try {
      await adminUpdateLinkStatus({ password, linkId: data.link.id, targetStatus: 'Active' });
      toast.success('Link resumed ✅');
      loadDetail();
      onRefresh();
    } catch (e: unknown) { toast.error(String((e as { message?: string })?.message || 'Resume failed')); }
  }

  return (
    <>
      <Sheet open={!!linkId} onOpenChange={open => !open && onClose()}>
        <SheetContent className="bg-card border-border w-full sm:max-w-xl overflow-y-auto p-0" aria-describedby={undefined}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link2 size={18} className="text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="font-syne font-black text-foreground text-base truncate">Link Dashboard</h2>
                {data && <p className="text-[10px] text-muted-foreground font-mono truncate">/{data.link.referralCode}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={loadDetail} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all"><X size={13} /></button>
            </div>
          </div>

          {loading && !data ? (
            <div className="p-5 space-y-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : data ? (
            <div className="p-5 space-y-6">
              {/* Status + Quick Info */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <StatusBadge status={data.link.linkStatus} />
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">Created {fmtDate(data.link.createdAt)}</span>
                  {data.link.expiryDate && <span className="text-amber-400">Expires {fmtDate(data.link.expiryDate)}</span>}
                </div>
              </div>

              {/* Offer Info */}
              <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/15 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-muted-foreground uppercase">Offer</p>
                  <p className="text-sm font-black text-foreground">{data.link.offerName}</p>
                  <p className="text-[10px] text-muted-foreground">By {data.link.createdByType} {data.link.referralLimit ? `• Limit: ${data.link.referralLimit}` : ''}</p>
                </div>
                <div className="text-right">
                  <span className="text-primary font-black text-sm">₹{data.link.referrerCut}</span>
                  <span className="text-muted-foreground text-[10px]"> / </span>
                  <span className="text-amber-400 font-black text-sm">₹{data.link.userCut}</span>
                </div>
              </div>

              {/* Tabbed sections */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-background border border-border p-0.5 h-auto gap-0 rounded-xl w-full grid grid-cols-4">
                  {[
                    { v: 'overview', l: '📊 Overview' },
                    { v: 'leads', l: '👥 Leads' },
                    { v: 'share', l: '🔗 Share' },
                    { v: 'history', l: '🕐 History' },
                  ].map(t => (
                    <TabsTrigger key={t.v} value={t.v} className="py-2 text-[10px] font-black rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">{t.l}</TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-6">
                  <ReferrerProfile data={data} password={password} onSaved={loadDetail} />
                  <PerformanceSection perf={data.performance} />
                  <RewardSection reward={data.rewardSummary} />
                </TabsContent>

                <TabsContent value="leads" className="mt-4">
                  <LeadsSection referrals={data.referrals} linkedLeads={data.linkedLeads} onNavigate={onNavigate} />
                </TabsContent>

                <TabsContent value="share" className="mt-4">
                  <ShareSection data={data} />
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <TimelineSection timeline={data.timeline} />
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">⚡ Quick Actions</p>
                <div className="grid grid-cols-3 gap-2">
                  {data.link.linkStatus === 'Active' && (
                    <>
                      <button onClick={() => setActionType('pause')}
                        className="py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-amber-500/15 transition-all">
                        <Pause size={12} /> Pause
                      </button>
                      <button onClick={() => setActionType('terminate')}
                        className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/15 transition-all">
                        <XCircle size={12} /> Terminate
                      </button>
                      <button onClick={() => setActionType('revoke')}
                        className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/15 transition-all">
                        <Ban size={12} /> Revoke
                      </button>
                    </>
                  )}
                  {data.link.linkStatus === 'Paused' && (
                    <>
                      <button onClick={handleResume}
                        className="col-span-2 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-emerald-500/15 transition-all">
                        <Play size={12} /> Resume
                      </button>
                      <button onClick={() => setActionType('terminate')}
                        className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-red-500/15 transition-all">
                        <XCircle size={12} /> Terminate
                      </button>
                    </>
                  )}
                  {data.link.linkStatus === 'Expired' && (
                    <button onClick={() => setActionType('extend')}
                      className="col-span-3 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-blue-500/15 transition-all">
                      <Clock size={12} /> Extend Expiry
                    </button>
                  )}
                  {data.link.linkStatus === 'Disabled' && (
                    <button onClick={handleResume}
                      className="col-span-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-xl flex items-center justify-center gap-1 hover:bg-emerald-500/15 transition-all">
                      <Play size={12} /> Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Action Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={open => { if (!open) { setActionType(''); setActionReason(''); setActionExpiry(''); } }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground capitalize">
              {actionType === 'extend' ? '⏰ Extend Expiry' : actionType === 'pause' ? '⏸️ Pause Link' : actionType === 'terminate' ? '🛑 Terminate Link' : '🚫 Revoke Link'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {actionType === 'terminate' && 'This link will permanently stop accepting new referrals. Existing leads remain.'}
              {actionType === 'revoke' && 'This link will be invalidated. Use for fraud or policy violations.'}
              {actionType === 'pause' && 'Temporarily stop new referral attribution. You can resume later.'}
              {actionType === 'extend' && 'Set a new expiry date for this link.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            {actionType === 'extend' && (
              <input type="datetime-local" value={actionExpiry} onChange={e => setActionExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
            )}
            <input value={actionReason} onChange={e => setActionReason(e.target.value)}
              placeholder={['terminate', 'revoke'].includes(actionType) ? 'Reason (required for audit)' : 'Reason (optional)'}
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={acting || (['terminate', 'revoke'].includes(actionType) && !actionReason)}
              className={`font-black disabled:opacity-60 ${['terminate', 'revoke'].includes(actionType) ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-white'}`}>
              {acting ? 'Processing…' : actionType === 'extend' ? 'Extend' : `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Link`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
