import { useState } from 'react';
import { toast } from 'sonner';
import { Link2, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import {
  adminUpdateReferralStatus, adminAddReferralRemark,
  type AdminGetReferralDetailOutputType,
} from 'zitejs/api';

type Detail = AdminGetReferralDetailOutputType;

const STATUS_COLORS: Record<string, string> = {
  Clicked: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Offer Opened': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Registered: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Submitted: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Under Review': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Action Required': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Qualified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Not Qualified': 'bg-red-500/10 text-red-400 border-red-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  Cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  Reversed: 'bg-red-500/10 text-red-400 border-red-500/20',
  Eligible: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Ineligible: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-muted/20 text-muted-foreground border-border';
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black ${cls}`}>{status}</span>;
}

function maskUpi(upi: string): string {
  if (!upi) return '—';
  const atIdx = upi.indexOf('@');
  if (atIdx < 0) return upi.length <= 4 ? upi : upi.slice(0, 4) + '••••' + upi.slice(-3);
  const prefix = upi.slice(0, atIdx);
  const suffix = upi.slice(atIdx);
  if (prefix.length <= 4) return prefix + '••••' + suffix;
  return prefix.slice(0, 4) + '••••' + prefix.slice(-3) + suffix;
}

function fmtDate(d: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}

function fmtCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

interface Props {
  detail: Detail;
  password: string;
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToLink?: (linkId: string) => void;
}

export default function ReferralDetailDrawer({ detail, password, onClose, onRefresh, onNavigateToLink }: Props) {
  const r = detail.referral;
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [statusField, setStatusField] = useState<'lead' | 'cashback' | 'reward' | 'payment'>('lead');
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [showRemark, setShowRemark] = useState(false);
  const [publicRemark, setPublicRemark] = useState(r.publicRemark);
  const [internalNote, setInternalNote] = useState(r.internalNote);
  const [savingRemark, setSavingRemark] = useState(false);

  const [showTimeline, setShowTimeline] = useState(true);

  const statusOptions: Record<string, string[]> = {
    lead: ['Clicked', 'Offer Opened', 'Registered', 'Submitted', 'Under Review', 'Action Required', 'Qualified', 'Not Qualified', 'Rejected', 'Cancelled', 'Completed'],
    cashback: ['Pending', 'Processing', 'Approved', 'Paid', 'Failed', 'Reversed'],
    reward: ['Pending', 'Eligible', 'Approved', 'Processing', 'Paid', 'Failed', 'Reversed', 'Ineligible'],
    payment: ['Pending', 'Processing', 'Paid', 'Failed'],
  };

  async function handleStatusChange() {
    if (!newStatus) return;
    setSaving(true);
    try {
      await adminUpdateReferralStatus({
        password,
        referralLeadId: r.id,
        ...(statusField === 'lead' ? { leadStatus: newStatus } : {}),
        ...(statusField === 'cashback' ? { cashbackStatus: newStatus } : {}),
        ...(statusField === 'reward' ? { rewardStatus: newStatus } : {}),
        ...(statusField === 'payment' ? { paymentStatus: newStatus } : {}),
        reason: reason || undefined,
      });
      toast.success(`${statusField} status updated to ${newStatus}`);
      setShowStatusChange(false);
      setNewStatus('');
      setReason('');
      onRefresh();
    } catch (e: unknown) {
      toast.error(String((e as { message?: string })?.message || 'Update failed'));
    } finally { setSaving(false); }
  }

  async function handleSaveRemark() {
    setSavingRemark(true);
    try {
      await adminAddReferralRemark({
        password,
        referralLeadId: r.id,
        publicRemark: publicRemark || undefined,
        internalNote: internalNote || undefined,
      });
      toast.success('Remark saved');
      setShowRemark(false);
      onRefresh();
    } catch { toast.error('Failed to save remark'); }
    finally { setSavingRemark(false); }
  }

  return (
    <div className="divide-y divide-border">
      {/* ── Referral identification header ── */}
      <div className="px-5 py-4 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={14} className="text-primary" />
          <span className="text-[10px] font-black text-primary uppercase tracking-wider">Referral</span>
          {r.flaggedForReview && (
            <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle size={9} /> Review
            </span>
          )}
        </div>
        <p className="font-syne font-black text-base text-foreground">{r.referrerName || '—'}</p>
        <p className="text-xs text-muted-foreground font-mono">{maskUpi(r.referrerUpi)} {r.referralCode ? `• Link: ${r.referralCode}` : ''}</p>
      </div>

      {/* ── Identity ── */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Identity</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Referral ID', value: r.referralId ? `#${r.referralId}` : r.id.slice(0, 8) },
            { label: 'Lead ID', value: r.leadId || '—' },
            { label: 'Referred User', value: r.referredUserName || '—' },
            { label: 'Identifier', value: maskUpi(r.referredUserIdentifier) },
            { label: 'Offer', value: r.offerName || '—' },
            { label: 'Source', value: r.createdByType || 'User' },
          ].map(item => (
            <div key={item.label} className="bg-background border border-border rounded-xl p-2.5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-bold text-foreground mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status overview ── */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Status</p>
          <button onClick={() => { setShowStatusChange(true); setStatusField('lead'); }}
            className="text-[10px] font-black text-primary hover:underline">Change Status</button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Lead', status: r.leadStatus, field: 'lead' as const },
            { label: 'Cashback', status: r.cashbackStatus, field: 'cashback' as const },
            { label: 'Reward', status: r.rewardStatus, field: 'reward' as const },
            { label: 'Payment', status: r.paymentStatus, field: 'payment' as const },
          ].map(item => (
            <button key={item.label} onClick={() => { setShowStatusChange(true); setStatusField(item.field); }}
              className="bg-background border border-border rounded-xl p-2.5 text-left hover:border-primary/30 transition-all">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Financial Summary ── */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Financial</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'User Cashback', value: fmtCurrency(r.cashbackAmount) },
            { label: 'Referral Reward', value: fmtCurrency(r.rewardAmount) },
          ].map(item => (
            <div key={item.label} className="bg-background border border-border rounded-xl p-2.5">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="font-syne font-black text-base text-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
        {r.qualifiedAt && <p className="text-[10px] text-muted-foreground">Qualified: {fmtDate(r.qualifiedAt)}</p>}
        {r.cashbackPaidAt && <p className="text-[10px] text-emerald-400">Cashback Paid: {fmtDate(r.cashbackPaidAt)}</p>}
        {r.rewardPaidAt && <p className="text-[10px] text-emerald-400">Reward Paid: {fmtDate(r.rewardPaidAt)}</p>}
      </div>

      {/* ── Source Link ── */}
      {detail.link != null && (
        <div className="px-5 py-4 space-y-2">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Source Link</p>
          <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">{(detail.link as { referralCode: string }).referralCode}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={(detail.link as { linkStatus: string }).linkStatus} />
                <span className="text-[10px] text-muted-foreground">{(detail.link as { clickCount: number }).clickCount} clicks</span>
              </div>
            </div>
            {onNavigateToLink && (
              <button onClick={() => onNavigateToLink((detail.link as { id: string }).id)}
                className="text-[10px] font-black text-primary hover:underline">View Link →</button>
            )}
          </div>
        </div>
      )}

      {/* ── Remarks ── */}
      <div className="px-5 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Remarks & Notes</p>
          <button onClick={() => setShowRemark(v => !v)}
            className="text-[10px] font-black text-primary hover:underline flex items-center gap-1">
            <MessageSquare size={10} /> {showRemark ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {showRemark ? (
          <div className="space-y-2.5">
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Public Remark (visible to user)</label>
              <textarea value={publicRemark} onChange={e => setPublicRemark(e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl resize-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Internal Note (admin only)</label>
              <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl resize-none" />
            </div>
            <button onClick={handleSaveRemark} disabled={savingRemark}
              className="w-full py-2 bg-primary/15 border border-primary/30 text-primary text-xs font-black rounded-xl disabled:opacity-60">
              {savingRemark ? 'Saving…' : '✓ Save Remarks'}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {r.publicRemark && (
              <div className="bg-background border border-border rounded-xl p-2.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Public</p>
                <p className="text-xs text-foreground">{r.publicRemark}</p>
              </div>
            )}
            {r.internalNote && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5">
                <p className="text-[9px] font-black text-amber-400 uppercase mb-0.5">Internal</p>
                <p className="text-xs text-foreground">{r.internalNote}</p>
              </div>
            )}
            {r.rejectionReason && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-2.5">
                <p className="text-[9px] font-black text-red-400 uppercase mb-0.5">Rejection Reason</p>
                <p className="text-xs text-foreground">{r.rejectionReason}</p>
              </div>
            )}
            {!r.publicRemark && !r.internalNote && !r.rejectionReason && (
              <p className="text-xs text-muted-foreground">No remarks yet</p>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="px-5 py-4 space-y-2">
        <button onClick={() => setShowTimeline(v => !v)} className="flex items-center justify-between w-full">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Timeline</p>
          <ChevronDown size={12} className={`text-muted-foreground transition-transform ${showTimeline ? 'rotate-180' : ''}`} />
        </button>
        {showTimeline && (
          detail.timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground">No audit events yet</p>
          ) : (
            <div className="space-y-1">
              {detail.timeline.map((evt, i) => (
                <div key={i} className="flex gap-3 p-2.5 bg-background border border-border rounded-xl">
                  <div className="w-1 rounded-full bg-primary/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{evt.action}</p>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                      {evt.previousValue && <span className="text-[9px] text-red-400 line-through">{evt.previousValue}</span>}
                      {evt.newValue && <span className="text-[9px] text-emerald-400">{evt.newValue}</span>}
                    </div>
                    {evt.reason && <p className="text-[10px] text-muted-foreground mt-0.5">Reason: {evt.reason}</p>}
                    <p className="text-[9px] text-muted-foreground mt-1">{evt.actor} • {fmtDate(evt.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Metadata ── */}
      <div className="px-5 py-4">
        <p className="text-[9px] text-muted-foreground">Created: {fmtDate(r.createdAt)} • Updated: {fmtDate(r.updatedAt)}</p>
      </div>

      {/* ── Status Change Dialog ── */}
      <AlertDialog open={showStatusChange} onOpenChange={setShowStatusChange}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground capitalize">
              Change {statusField} Status
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              Select new status for this referral's {statusField} track.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {statusOptions[statusField]?.map(s => (
                <button key={s} onClick={() => setNewStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${newStatus === s ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
                  {s}
                </button>
              ))}
            </div>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)"
              className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={!newStatus || saving}
              className="bg-primary text-white font-black disabled:opacity-60">
              {saving ? 'Updating…' : 'Update Status'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
