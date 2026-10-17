import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGetLeads, adminUpdateLead, adminDeleteLead, adminRestoreItem, adminCreateLead, adminGetOffers, getSettings } from '@/lib/api';
import { useUndoToast } from '@/hooks/useUndoToast';
import { Dialog, DialogContent } from '@project/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus, Pencil, Download, Search, X, ArrowUpDown,
  ChevronDown, CheckSquare, Square, Shield, AlertTriangle,
  Target, ToggleLeft, ToggleRight, Calendar, RefreshCw,
} from 'lucide-react';
import type { Lead } from '@/types';

interface Props { password: string; onSessionExpired?: () => void; initialStatusFilter?: string }

// ── Status Constants ──────────────────────────────────────────────────────────
const STATUS_OPTS = ['Pending', 'Hold', 'Approved', 'Cashback Sent', 'Missing'];
const CUSTOM_STATUS_VALUE = '__custom__';

// ── Canonical Status Cards for Custom CTA Dialog ───────────────────────────
const CANONICAL_STATUSES = [
  { key: 'pending', emoji: '🔄', label: 'Pending', color: '#f59e0b', defaultCtaEmoji: '▶️' },
  { key: 'onHold', emoji: '⏸️', label: 'On Hold', color: '#f97316', defaultCtaEmoji: '🛠️' },
  { key: 'approved', emoji: '⏳', label: 'Approved', color: '#94a3b8', defaultCtaEmoji: '💰' },
  { key: 'cashbackSent', emoji: '✅', label: 'Cashback Sent', color: '#22c55e', defaultCtaEmoji: '🧾' },
  { key: 'missing', emoji: '❌', label: 'Missing', color: '#ef4444', defaultCtaEmoji: '💬' },
] as const;

// ── Lead Tag Options ──────────────────────────────────────────────────────────
const DEFAULT_CUSTOMER_TYPES = ['Self', 'Family', 'Unknown', 'College Friend'];
const DEFAULT_APP_SOURCES = ['Credit code', 'Earn pati'];

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  Self: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  Family: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  Unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/25',
  'College Friend': 'bg-amber-500/10 text-amber-400 border-amber-500/25',
};
const APP_SOURCE_COLORS: Record<string, string> = {
  'Credit code': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  'Earn pati': 'bg-pink-500/10 text-pink-400 border-pink-500/25',
};

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Hold: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  'Cashback Sent': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  Missing: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  // Legacy backward-compat
  'Under Review': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'On Hold': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Duplicate: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

// ── Status Emoji Helpers ─────────────────────────────────────────────────────
function getLeadStatusEmoji(s: string): string {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return '✅';
  if (l === 'approved') return '⏳';
  if (l === 'rejected' || l === 'missing') return '❌';
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return '⏸️';
  if (l === 'in review' || l === 'under review') return '🔄';
  return '🔄';
}

function classifyStatusForAnim(s: string): string {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return 'bounce';
  if (l === 'approved') return 'pulse';
  if (l === 'rejected' || l === 'missing') return 'shake';
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return 'pulse';
  return 'spin';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUPI(data: Record<string, any>): string {
  const entry = Object.entries(data).find(([k]) => k.toLowerCase().includes('upi'));
  return entry ? String(entry[1]) : '—';
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractName(data: Record<string, any>): string {
  const entry = Object.entries(data).find(([k]) => k.toLowerCase().includes('name'));
  return entry ? String(entry[1]) : '';
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMobile(data: Record<string, any>): string {
  const entry = Object.entries(data).find(([k]) =>
    k.toLowerCase().includes('mobile') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('number')
  );
  return entry ? String(entry[1]) : '';
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTelemetry(data: Record<string, any>) {
  try {
    const raw = data['_telemetry'];
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') return JSON.parse(raw);
  } catch {}
  return null;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseData(lead: Lead): Record<string, any> {
  try { return JSON.parse(lead.leadData); } catch { return {}; }
}

// ── Date formatting: DD/MM/YYYY ───────────────────────────────────────────────
function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '–';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '–';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return '–'; }
}
function fmtTime(d: string | Date | undefined | null): string {
  if (!d) return '';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '';
    const h = dt.getHours();
    const min = String(dt.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  } catch { return ''; }
}

// ── Sort Constants (outside component for stability) ──────────────────────────
type SortMode = 'submitted-desc' | 'submitted-asc' | 'updated-desc' | 'updated-asc' | 'payout-desc' | 'payout-asc' | 'status' | 'offer-az' | 'name-az';
const SORT_OPTIONS: { value: SortMode; label: string; chip: string }[] = [
  { value: 'submitted-desc', label: 'Submitted — Newest First', chip: '↓ Submitted' },
  { value: 'submitted-asc', label: 'Submitted — Oldest First', chip: '↑ Submitted' },
  { value: 'updated-desc', label: 'Updated — Recently Updated', chip: '↓ Updated' },
  { value: 'updated-asc', label: 'Updated — Least Recent', chip: '↑ Updated' },
  { value: 'payout-desc', label: 'Payout High→Low', chip: '↓ Payout' },
  { value: 'payout-asc', label: 'Payout Low→High', chip: '↑ Payout' },
  { value: 'status', label: 'Status (grouped)', chip: '⊞ Status' },
  { value: 'offer-az', label: 'Offer Name A→Z', chip: '↓ Offer' },
  { value: 'name-az', label: 'Name A→Z', chip: '↓ Name' },
];
const SORT_STATUS_ORDER: Record<string, number> = { Pending: 0, Hold: 1, Approved: 2, 'Cashback Sent': 3, Missing: 4 };

// ── Fraud Detection ───────────────────────────────────────────────────────────
function buildFraudMap(leads: Lead[]): Set<string> {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const ipMap = new Map<string, Set<string>>();
  const ipToLeadIds = new Map<string, string[]>();
  leads.forEach(l => {
    if (!l.createdAt || now - new Date(l.createdAt).getTime() > h24) return;
    const data = parseData(l);
    const tel = extractTelemetry(data);
    const ip = tel?.ip;
    if (!ip || ip === 'Unknown') return;
    const upi = extractUPI(data);
    if (!ipMap.has(ip)) { ipMap.set(ip, new Set()); ipToLeadIds.set(ip, []); }
    ipMap.get(ip)!.add(upi);
    ipToLeadIds.get(ip)!.push(l.id);
  });
  const flagged = new Set<string>();
  ipToLeadIds.forEach((ids, ip) => {
    if (ipMap.get(ip)!.size > 1) ids.forEach(id => flagged.add(id));
  });
  return flagged;
}

// Build duplicate UPI map for admin awareness
function buildDuplicateUpiMap(leads: Lead[]): Map<string, Lead[]> {
  const upiMap = new Map<string, Lead[]>();
  leads.forEach(l => {
    const data = parseData(l);
    const upi = extractUPI(data).toLowerCase().trim();
    if (!upi || upi === '—') return;
    if (!upiMap.has(upi)) upiMap.set(upi, []);
    upiMap.get(upi)!.push(l);
  });
  // Only keep UPIs with > 1 lead
  const duplicates = new Map<string, Lead[]>();
  upiMap.forEach((lList, upi) => { if (lList.length > 1) duplicates.set(upi, lList); });
  return duplicates;
}

const inp = 'w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi';
const lbl = 'text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block';

// ── Add/Edit Lead Modal ───────────────────────────────────────────────────────
interface EditModalProps {
  lead?: Lead | null; offerNames: string[]; offerRedirectMap: Record<string, string>;
  password: string; onClose: () => void; onSaved: () => void;
  extraCustomerTypes?: string[]; extraAppSources?: string[];
}

function LeadModal({ lead, offerNames, offerRedirectMap, password, onClose, onSaved, extraCustomerTypes = [], extraAppSources = [] }: EditModalProps) {
  const isNew = !lead;
  const initData = lead ? parseData(lead) : {};

  // Offer & basic info
  const [offerName, setOfferName] = useState(lead?.offerName || '');
  const [offerPayout, setOfferPayout] = useState(lead ? String(lead.offerPayout) : '');
  const [offerNameLocked, setOfferNameLocked] = useState(!isNew); // Lock offer name for existing leads
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Status — supports custom text
  const initialStatus = lead?.status || 'Pending';
  const isInitialCustom = !STATUS_OPTS.includes(initialStatus);
  const [status, setStatus] = useState(isInitialCustom ? CUSTOM_STATUS_VALUE : initialStatus);
  const [customStatusText, setCustomStatusText] = useState(isInitialCustom ? initialStatus : '');

  const effectiveStatus = status === CUSTOM_STATUS_VALUE ? customStatusText.trim() : status;

  // Remarks
  const [publicRemark, setPublicRemark] = useState(lead?.publicRemark || '');
  const [internalNote, setInternalNote] = useState(lead?.internalNote || '');

  // Data fields
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [fields, setFields] = useState<{ key: string; value: string }[]>(
    Object.entries(initData).filter(([k]) => k !== '_telemetry').length > 0
      ? Object.entries(initData).filter(([k]) => k !== '_telemetry').map(([key, value]) => ({ key, value: String(value) }))
      : [{ key: 'UPI ID', value: '' }, { key: 'Full Name', value: '' }, { key: 'Mobile Number', value: '' }]
  );

  // Dates
  const [submissionDateInput, setSubmissionDateInput] = useState(''); // Admin-override submission date
  const [paidDateInput, setPaidDateInput] = useState('');

  // Status history
  const [statusHistory, setStatusHistory] = useState<Array<{ status: string; date: string }>>([]);
  const [hiddenFromTracker, setHiddenFromTracker] = useState(false);

  // 4 Payout fields: Total Lead (offerPayout), Admin Cut, Estimate User, User Got
  const [adminCut, setAdminCut] = useState('');
  const [estimateUser, setEstimateUser] = useState('');
  const [userGot, setUserGot] = useState('');
  const [sendUserNote, setSendUserNote] = useState('');
  // ── Missing Lead Recovery Fields ──────────────────────────────────────────
  const [adminRecoveredAmount, setAdminRecoveredAmount] = useState('');
  const [userMissingIncentive, setUserMissingIncentive] = useState('');
  // ── Module 2 & 3: Per-lead granular visibility toggles ──────────────────────
  const [showUserGotToggle, setShowUserGotToggle] = useState(true);
  const [showEstimateToggle, setShowEstimateToggle] = useState(true);
  const [showStatusHistoryToggle, setShowStatusHistoryToggle] = useState(true);

  // Lead Tags
  const [customerType, setCustomerType] = useState('');
  const [appSource, setAppSource] = useState('');
  const [customCustomerType, setCustomCustomerType] = useState('');
  const [customAppSource, setCustomAppSource] = useState('');

  // Searchable fields — now user-controlled from tracker panel (read-only in admin)
  const [searchableFields, setSearchableFields] = useState<Set<string>>(new Set());

  // Dates & Timestamps visibility toggle
  const [showDatesTimestamps, setShowDatesTimestamps] = useState(true);

  // CTA override
  const [actionEnabled, setActionEnabled] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonRedirectUrl, setButtonRedirectUrl] = useState('');
  const [ctaBtnColor, setCtaBtnColor] = useState('');

  // Lead source classification
  const [leadSource, setLeadSource] = useState<'User' | 'Admin' | 'Referral'>(() => {
    if (lead?.isReferralLead) return 'Referral';
    if (lead?.createdByType === 'Referral') return 'Referral';
    if (lead?.createdByType === 'Admin') return 'Admin';
    return 'User';
  });
  const [referrerUpiInput, setReferrerUpiInput] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState(lead?.referralCode || '');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ── CRITICAL: Fully reset ALL CTA & modal state from this specific lead ──
    // This prevents Lead A's CTA values from bleeding into Lead B's edit modal
    setActionEnabled(false);
    setActionMessage('');
    setButtonLabel('');
    setButtonRedirectUrl('');
    setCtaBtnColor('');
    setSubmissionDateInput('');
    setPaidDateInput('');
    setStatusHistory([]);
    setHiddenFromTracker(false);
    setAdminCut('');
    setEstimateUser('');
    setUserGot('');
    setSendUserNote('');
    setAdminRecoveredAmount('');
    setUserMissingIncentive('');
    setShowUserGotToggle(true);
    setShowEstimateToggle(true);
    setShowStatusHistoryToggle(true);
    setSearchableFields(new Set());
    setShowDatesTimestamps(true);
    setCustomerType('');
    setAppSource('');
    setCustomCustomerType('');
    setCustomAppSource('');
    // Lead source — derive from lead record fields + actionConfig
    setLeadSource(() => {
      if (lead?.isReferralLead) return 'Referral';
      if (lead?.createdByType === 'Referral') return 'Referral';
      if (lead?.createdByType === 'Admin') return 'Admin';
      return 'User';
    });
    setReferrerUpiInput('');
    setReferralCodeInput(lead?.referralCode || '');

    if (lead?.actionConfig) {
      try {
        const ac = JSON.parse(lead.actionConfig);
        // CTA
        if (ac.buttonLabel) {
          setActionEnabled(true);
          setActionMessage(ac.actionMessage || '');
          setButtonLabel(ac.buttonLabel || '');
          setButtonRedirectUrl(ac.buttonRedirectUrl || '');
        }
        if (ac.buttonColor) setCtaBtnColor(ac.buttonColor);
        // Dates
        if (ac.submissionDate) {
          try { setSubmissionDateInput(new Date(ac.submissionDate).toISOString().slice(0, 16)); } catch {}
        }
        if (ac.paidDate) {
          try { setPaidDateInput(new Date(ac.paidDate).toISOString().slice(0, 16)); } catch {}
        }
        // History
        if (Array.isArray(ac.statusHistory)) setStatusHistory(ac.statusHistory);
        setHiddenFromTracker(Boolean(ac.hiddenFromTracker));
        // 4 payout fields
        if (typeof ac.myEarning === 'number' && ac.myEarning > 0) setAdminCut(String(ac.myEarning));
        if (typeof ac.userPayout === 'number' && ac.userPayout > 0) setEstimateUser(String(ac.userPayout));
        if (typeof ac.sendUserAmount === 'number' && ac.sendUserAmount > 0) setUserGot(String(ac.sendUserAmount));
        if (ac.sendUserNote) setSendUserNote(ac.sendUserNote);
        // Missing lead recovery fields
        if (typeof ac.adminRecoveredAmount === 'number' && ac.adminRecoveredAmount > 0) setAdminRecoveredAmount(String(ac.adminRecoveredAmount));
        if (typeof ac.userMissingIncentive === 'number' && ac.userMissingIncentive > 0) setUserMissingIncentive(String(ac.userMissingIncentive));
        // Per-lead visibility toggles
        if (typeof ac.showUserGot === 'boolean') setShowUserGotToggle(ac.showUserGot);
        if (typeof ac.showEstimate === 'boolean') setShowEstimateToggle(ac.showEstimate);
        if (typeof ac.showStatusHistory === 'boolean') setShowStatusHistoryToggle(ac.showStatusHistory);
        // Searchable fields
        if (Array.isArray(ac.searchableFields)) setSearchableFields(new Set(ac.searchableFields));
        // Dates visibility
        if (typeof ac.showDatesTimestamps === 'boolean') setShowDatesTimestamps(ac.showDatesTimestamps);
        // Lead tags
        if (ac.customerType) {
          if (DEFAULT_CUSTOMER_TYPES.includes(ac.customerType)) { setCustomerType(ac.customerType); }
          else { setCustomerType('__custom__'); setCustomCustomerType(ac.customerType); }
        }
        if (ac.appSource) {
          if (DEFAULT_APP_SOURCES.includes(ac.appSource)) { setAppSource(ac.appSource); }
          else { setAppSource('__custom__'); setCustomAppSource(ac.appSource); }
        }
        // Referrer UPI from actionConfig (for referral leads)
        if (ac.referrerUpi) setReferrerUpiInput(ac.referrerUpi);
      } catch {}
    }
  }, [lead?.id, lead?.actionConfig]);

  function handleActionToggle() {
    const newEnabled = !actionEnabled;
    setActionEnabled(newEnabled);
    if (newEnabled && !buttonRedirectUrl && offerName && offerRedirectMap[offerName]) {
      setButtonRedirectUrl(offerRedirectMap[offerName]);
    }
  }

  function handleOfferNameChange(v: string) {
    setOfferName(v);
    if (actionEnabled && !buttonRedirectUrl && offerRedirectMap[v]) {
      setButtonRedirectUrl(offerRedirectMap[v]);
    }
  }

  const isPaidStatus = effectiveStatus === 'Cashback Sent' || effectiveStatus === 'Paid' || effectiveStatus === 'Approved';

  async function handleSave() {
    if (!offerName.trim()) { toast.error('Offer name is required'); return; }
    if (status === CUSTOM_STATUS_VALUE && !customStatusText.trim()) { toast.error('Enter custom status text'); return; }
    const payout = parseFloat(offerPayout) || 0;
    const dataObj = Object.fromEntries(fields.filter(f => f.key.trim()).map(f => [f.key.trim(), f.value]));
    if (lead) { const orig = parseData(lead); if (orig['_telemetry']) (dataObj as Record<string, unknown>)['_telemetry'] = orig['_telemetry']; }
    const leadData = JSON.stringify(dataObj);

    const acData: Record<string, unknown> = {};

    // CTA — explicit clear when disabled prevents backend merge keeping stale data
    if (actionEnabled && buttonLabel.trim()) {
      acData.actionMessage = actionMessage;
      acData.buttonLabel = buttonLabel.trim();
      acData.buttonRedirectUrl = buttonRedirectUrl;
      acData.clickCount = 0;
      if (ctaBtnColor.trim()) acData.buttonColor = ctaBtnColor.trim();
    } else {
      acData.actionMessage = '';
      acData.buttonLabel = '';
      acData.buttonRedirectUrl = '';
      acData.buttonColor = '';
      acData.clickCount = 0;
    }

    // Submission date override
    if (submissionDateInput) {
      try { acData.submissionDate = new Date(submissionDateInput).toISOString(); } catch {}
    }

    // Paid date
    if (isPaidStatus && paidDateInput) {
      try { acData.paidDate = new Date(paidDateInput).toISOString(); } catch {}
    }

    acData.hiddenFromTracker = hiddenFromTracker;
    if (statusHistory.length > 0) acData.statusHistory = statusHistory;

    // 4 payout fields — ALWAYS include (even 0) so clearing a field properly saves to DB
    // Bug fix: previously skipped when 0, causing old values to persist via backend merge
    const adminCutNum = parseFloat(adminCut) || 0;
    const estimateUserNum = parseFloat(estimateUser) || 0;
    const userGotNum = parseFloat(userGot) || 0;
    acData.myEarning = adminCutNum;
    acData.userPayout = estimateUserNum;
    acData.sendUserAmount = userGotNum;
    acData.sendUserNote = sendUserNote.trim(); // Always include to allow clearing
    // Missing recovery amounts
    const adminRecoveredNum = parseFloat(adminRecoveredAmount) || 0;
    const userMissingIncentiveNum = parseFloat(userMissingIncentive) || 0;
    // Include recovery amounts always when in missing status or when they have a value
    if (effectiveStatus === 'Missing' || adminRecoveredNum > 0) acData.adminRecoveredAmount = adminRecoveredNum;
    if (effectiveStatus === 'Missing' || userMissingIncentiveNum > 0) acData.userMissingIncentive = userMissingIncentiveNum;
    // Per-lead visibility toggles (always saved explicitly so defaults are stored)
    acData.showUserGot = showUserGotToggle;
    acData.showEstimate = showEstimateToggle;
    acData.showStatusHistory = showStatusHistoryToggle;
    // Searchable fields
    acData.searchableFields = [...searchableFields];
    // Dates visibility
    acData.showDatesTimestamps = showDatesTimestamps;
    // Lead tags
    const finalCustomerType = customerType === '__custom__' ? customCustomerType.trim() : customerType;
    const finalAppSource = appSource === '__custom__' ? customAppSource.trim() : appSource;
    if (finalCustomerType) acData.customerType = finalCustomerType;
    if (finalAppSource) acData.appSource = finalAppSource;
    // Lead source → always write referral flags to actionConfig (prevents stale merge)
    if (leadSource === 'Referral') {
      acData.isReferralLead = true;
      if (referrerUpiInput.trim()) acData.referrerUpi = referrerUpiInput.trim();
      else acData.referrerUpi = '';
      if (referralCodeInput.trim()) acData.referralCode = referralCodeInput.trim();
    } else {
      // CRITICAL: Explicitly clear referral flags so backend merge doesn't keep stale values
      acData.isReferralLead = false;
      acData.referralCode = '';
      acData.referrerUpi = '';
      acData.referrerName = '';
      acData.referralLinkId = '';
      acData.referrerSplit = '';
      acData.referrerCut = 0;
      acData.userEstimate = 0;
    }

    const actionConfigJson = JSON.stringify(acData);

    // For existing leads, require confirmation before saving
    if (!isNew && !showSaveConfirm) {
      setShowSaveConfirm(true);
      return;
    }
    setShowSaveConfirm(false);

    setSaving(true);
    try {
      if (isNew) {
        await adminCreateLead({ password, offerName: offerName.trim(), offerPayout: payout, leadData, status: effectiveStatus, publicRemark, internalNote, actionConfig: actionConfigJson });
        toast.success('Lead created! ✓');
      } else {
        await adminUpdateLead({
          password, id: lead!.id, offerName: offerName.trim(), offerPayout: payout, leadData, status: effectiveStatus, publicRemark, internalNote, actionConfig: actionConfigJson,
          // Lead source reclassification
          createdByType: leadSource,
          isReferralLead: leadSource === 'Referral',
          referralCode: leadSource === 'Referral' ? referralCodeInput.trim() : '',
          referralLinkId: leadSource !== 'Referral' ? '' : undefined,
          referrerUpi: leadSource === 'Referral' ? referrerUpiInput.trim() : undefined,
        });
        toast.success('Lead updated! ✓');
      }
      onSaved();
    } catch (e) {
      const msg = String((e as { message?: string })?.message || '');
      if (msg.toLowerCase().includes('invalid password') || msg.toLowerCase().includes('unauthorized')) {
        toast.error('Session expired — please log in again.');
      } else {
        toast.error(msg ? `Error: ${msg}` : (isNew ? 'Failed to create lead.' : 'Failed to update lead.'));
      }
    }
    finally { setSaving(false); }
  }

  const totalPayout = parseFloat(offerPayout) || 0;
  const adminCutNum = parseFloat(adminCut) || 0;
  const estimateNum = parseFloat(estimateUser) || 0;
  const userGotNum = parseFloat(userGot) || 0;
  // Payout validation: Admin Cut + Estimate User must NOT exceed Total Lead Payout
  const payoutOverflow = totalPayout > 0 && (adminCutNum + estimateNum) > totalPayout;
  const payoutWarning = totalPayout > 0 && userGotNum > totalPayout;

  // Quick split options
  const quickAmounts = totalPayout > 0
    ? [50, 100, 150, 200, 250, 300, 400, 500].filter(a => a < totalPayout)
    : [];

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[92vh] overflow-y-auto p-0">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-syne font-black text-lg text-foreground">{isNew ? '➕ Add Manual Lead' : '✏️ Edit Lead'}</h2>
          {!isNew && lead && <p className="text-xs text-muted-foreground mt-0.5">Lead ID: <span className="text-primary font-mono">{lead.leadId}</span></p>}
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Offer */}
          <div>
            <label className={lbl}>Offer Name *</label>
            <div className="flex gap-2">
              <input list="offer-list" value={offerName} onChange={e => handleOfferNameChange(e.target.value)} placeholder="e.g. Bajaj Broking" className={inp + (offerNameLocked ? ' opacity-50 cursor-not-allowed' : '')} disabled={offerNameLocked} />
              {!isNew && (
                <button type="button" onClick={() => setOfferNameLocked(!offerNameLocked)}
                  className={`px-3 py-2 rounded-xl border text-xs font-black transition-all flex-shrink-0 ${offerNameLocked ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-primary/30 text-primary bg-primary/10'}`}>
                  {offerNameLocked ? '🔒 Unlock' : '🔓 Editing'}
                </button>
              )}
            </div>
            <datalist id="offer-list">{offerNames.map(n => <option key={n} value={n} />)}</datalist>
          </div>

          {/* ── Lead Tags: Customer Type & App Source ── */}
          <div className="p-4 rounded-xl border border-primary/20 space-y-4" style={{ background: 'rgba(59,130,246,0.04)' }}>
            <p className="text-xs font-black text-primary flex items-center gap-2">🏷️ Lead Classification</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Customer Type */}
              <div>
                <label className={lbl}>👤 Customer Type</label>
                <select value={customerType} onChange={e => setCustomerType(e.target.value)} className={inp}>
                  <option value="">— Select —</option>
                  {[...DEFAULT_CUSTOMER_TYPES, ...extraCustomerTypes].map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
                {customerType === '__custom__' && (
                  <input value={customCustomerType} onChange={e => setCustomCustomerType(e.target.value)}
                    placeholder="Type custom customer type…" className={inp + ' mt-2'} maxLength={40} />
                )}
              </div>
              {/* App Source */}
              <div>
                <label className={lbl}>📱 App Source</label>
                <select value={appSource} onChange={e => setAppSource(e.target.value)} className={inp}>
                  <option value="">— Select —</option>
                  {[...DEFAULT_APP_SOURCES, ...extraAppSources].map(a => <option key={a} value={a}>{a}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
                {appSource === '__custom__' && (
                  <input value={customAppSource} onChange={e => setCustomAppSource(e.target.value)}
                    placeholder="Type custom app source…" className={inp + ' mt-2'} maxLength={40} />
                )}
              </div>
            </div>
          </div>

          {/* ── Lead Source Classification ── */}
          <div className="p-4 rounded-xl border border-emerald-500/20 space-y-3" style={{ background: 'rgba(16,185,129,0.04)' }}>
            <p className="text-xs font-black text-emerald-400 flex items-center gap-2">📍 Lead Source</p>
            <div className="flex gap-2">
              {(['User', 'Admin', 'Referral'] as const).map(src => (
                <button key={src} type="button" onClick={() => setLeadSource(src)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                    leadSource === src
                      ? src === 'Referral' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : src === 'Admin' ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                        : 'border-blue-500 bg-blue-500/15 text-blue-400'
                      : 'border-border/40 text-muted-foreground hover:border-border'
                  }`}>
                  {src === 'User' && '👤 '}{src === 'Admin' && '🔧 '}{src === 'Referral' && '🔗 '}{src}
                </button>
              ))}
            </div>
            {leadSource === 'Referral' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <div>
                  <label className={lbl}>Referrer UPI ID</label>
                  <input value={referrerUpiInput} onChange={e => setReferrerUpiInput(e.target.value)}
                    placeholder="e.g. referrer@paytm" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Referral Code (optional)</label>
                  <input value={referralCodeInput} onChange={e => setReferralCodeInput(e.target.value)}
                    placeholder="e.g. REF-ABC123" className={inp} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Payout + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Total Lead Payout (₹)</label>
              <input type="number" value={offerPayout} onChange={e => setOfferPayout(e.target.value)} placeholder="0" className={inp} />
              <p className="text-[10px] text-amber-400 mt-1 font-bold">Offer's full payout</p>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={inp}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value={CUSTOM_STATUS_VALUE}>Custom Text…</option>
              </select>
            </div>
          </div>

          {/* Custom status text */}
          {status === CUSTOM_STATUS_VALUE && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-xl border border-primary/30 bg-primary/5">
              <label className={lbl}>Custom Status Text *</label>
              <input value={customStatusText} onChange={e => setCustomStatusText(e.target.value)}
                placeholder="e.g. KYC Pending, Verification Required, Under Process…"
                className={inp} maxLength={80} />
              <p className="text-[10px] text-primary mt-1 font-semibold">This exact text will show as the lead status to user</p>
            </motion.div>
          )}

          {/* Dates Section */}
          <div className="p-4 rounded-xl border border-blue-500/25 space-y-4" style={{ background: 'rgba(59,130,246,0.05)' }}>
            <p className="text-xs font-black text-blue-400 flex items-center gap-2"><Calendar size={13} /> Dates & Timestamps</p>
            <div>
              <label className={lbl}>📅 Submission Date (Override)</label>
              <input type="datetime-local" value={submissionDateInput} onChange={e => setSubmissionDateInput(e.target.value)} className={inp} />
              <p className="text-[10px] text-muted-foreground mt-1">Overrides the "Date of Submission" shown to user on tracker. Leave blank to use actual submission time.</p>
            </div>
            {isPaidStatus && (
              <div>
                <label className={lbl}>💰 Cashback Paid Date & Time</label>
                <input type="datetime-local" value={paidDateInput} onChange={e => setPaidDateInput(e.target.value)} className={inp} />
                <p className="text-[10px] text-muted-foreground mt-1">Shown to user as "Cashback sent on [date]".</p>
              </div>
            )}
          </div>

          {/* 4 Payout Fields */}
          <div className={`p-4 rounded-xl border space-y-4 ${payoutOverflow ? 'border-red-500/40' : 'border-violet-500/25'}`}
            style={{ background: payoutOverflow ? 'rgba(239,68,68,0.06)' : 'rgba(139,92,246,0.05)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-violet-400 flex items-center gap-2">💰 Payout Breakdown (4 Fields)</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total Lead → Admin Cut → Estimate User → User Got</p>
              </div>
              {totalPayout > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Total Lead</p>
                  <p className="font-syne font-black text-base text-amber-400">₹{totalPayout}</p>
                </div>
              )}
            </div>

            {/* ── Payout Validation Warning ── */}
            {payoutOverflow && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <span className="text-red-400 text-sm flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-black text-red-400">Payout Overflow!</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Admin Cut (₹{adminCutNum}) + Estimate User (₹{estimateNum}) = ₹{adminCutNum + estimateNum} exceeds Total Lead Payout (₹{totalPayout}).
                    Rule: <strong>Sum must not exceed Total Lead Payout.</strong>
                  </p>
                </div>
              </div>
            )}
            {payoutWarning && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-amber-400 text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-400 font-bold">User Got (₹{userGotNum}) exceeds Total Lead Payout (₹{totalPayout})</p>
              </div>
            )}
            {/* Payout visibility legend */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 bg-background/60">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Visibility:</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/50"><span>🔒</span> Admin Only</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400"><span>💡</span> User Facing (toggle)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Admin Cut — Admin Only */}
              <div>
                <label className={lbl}>
                  ✂️ Admin Cut
                  <span className="text-muted-foreground/40 ml-1 normal-case font-normal text-[9px]">(Admin Only)</span>
                </label>
                <input type="number" value={adminCut} onChange={e => setAdminCut(e.target.value)}
                  placeholder="0" min={0} className={inp} />
                <p className="text-[10px] text-violet-400 mt-1 font-bold">Admin keeps</p>
              </div>

              {/* Estimate User — User Facing with 💡 toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={lbl + ' mb-0'}>
                    📊 Estimate
                    <span className="text-sky-400 ml-1 normal-case font-normal text-[9px]">(User)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEstimateToggle(v => !v)}
                    title={showEstimateToggle ? 'Click to hide from user' : 'Click to show to user'}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black transition-all border ${
                      showEstimateToggle
                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-400 shadow-sm shadow-sky-500/10'
                        : 'bg-background border-border/30 text-muted-foreground/35'
                    }`}
                  >
                    <span className="text-[12px]">{showEstimateToggle ? '💡' : '🔕'}</span>
                  </button>
                </div>
                <input type="number" value={estimateUser} onChange={e => setEstimateUser(e.target.value)}
                  placeholder="0" min={0} className={inp} />
                <p className={`text-[10px] mt-1 font-bold transition-colors ${showEstimateToggle ? 'text-sky-400' : 'text-muted-foreground/30 line-through'}`}>
                  {showEstimateToggle ? '👁 Shown to user' : '🙈 Hidden'}
                </p>
              </div>

              {/* User Got — User Facing with 💡 toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={lbl + ' mb-0'}>
                    ✅ User Got
                    <span className="text-emerald-400 ml-1 normal-case font-normal text-[9px]">(User)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUserGotToggle(v => !v)}
                    title={showUserGotToggle ? 'Click to hide from user' : 'Click to show to user'}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black transition-all border ${
                      showUserGotToggle
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10'
                        : 'bg-background border-border/30 text-muted-foreground/35'
                    }`}
                  >
                    <span className="text-[12px]">{showUserGotToggle ? '💡' : '🔕'}</span>
                  </button>
                </div>
                <input type="number" value={userGot} onChange={e => setUserGot(e.target.value)}
                  placeholder="0" min={0} className={inp} />
                <p className={`text-[10px] mt-1 font-bold transition-colors ${showUserGotToggle ? 'text-emerald-400' : 'text-muted-foreground/30 line-through'}`}>
                  {showUserGotToggle ? '👁 Shown to user' : '🙈 Hidden'}
                </p>
              </div>
            </div>

            {/* Quick send amount buttons */}
            {totalPayout > 0 && quickAmounts.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">⚡ Quick User Got Amount</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickAmounts.map(amt => (
                    <button key={amt} type="button"
                      onClick={() => {
                        setUserGot(String(amt));
                        if (!estimateUser) setEstimateUser(String(amt));
                        if (!adminCut) setAdminCut(String(Math.max(0, totalPayout - amt)));
                      }}
                      className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg border transition-all ${parseFloat(userGot) === amt ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400' : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'}`}>
                      ₹{amt}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => {
                      const half = Math.round(totalPayout / 2);
                      setUserGot(String(half));
                      setEstimateUser(String(half));
                      setAdminCut(String(totalPayout - half));
                    }}
                    className="px-2.5 py-1.5 text-[10px] font-black rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                    50/50 Split
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className={lbl}>Send Note (shown to user)</label>
              <input value={sendUserNote} onChange={e => setSendUserNote(e.target.value)}
                placeholder="e.g. Paid via UPI on 15 May" className={inp} maxLength={100} />
            </div>

            {/* ── Missing Status: Recovery Fields ── */}
            {(effectiveStatus === 'Missing' || adminRecoveredAmount || userMissingIncentive) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl border border-rose-500/25 space-y-3 bg-rose-500/5">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">❓ Missing Lead Recovery (Analytics)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={lbl}>💰 Admin Recovered (₹)</label>
                    <input type="number" value={adminRecoveredAmount} onChange={e => setAdminRecoveredAmount(e.target.value)}
                      placeholder="0" min={0} className={inp} />
                    <p className="text-[9px] text-rose-400 mt-1">Amount admin recovered</p>
                  </div>
                  <div>
                    <label className={lbl}>👤 User Incentive Paid (₹)</label>
                    <input type="number" value={userMissingIncentive} onChange={e => setUserMissingIncentive(e.target.value)}
                      placeholder="0" min={0} className={inp} />
                    <p className="text-[9px] text-rose-400 mt-1">Missing incentive paid to user</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Live breakdown preview */}
            {(adminCutNum > 0 || estimateNum > 0 || userGotNum > 0) && (
              <div className="grid grid-cols-4 gap-2 p-3 bg-background rounded-xl border border-border">
                {[
                  { label: '📋 Total Lead', value: totalPayout, color: 'text-amber-400' },
                  { label: '✂️ Admin Cut', value: adminCutNum, color: 'text-violet-400' },
                  { label: '📊 Estimate', value: estimateNum, color: 'text-sky-400' },
                  { label: '✅ User Got', value: userGotNum, color: 'text-emerald-400' },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-[9px] text-muted-foreground font-bold leading-tight">{item.label}</p>
                    <p className={`font-syne font-black text-sm ${item.color}`}>{item.value > 0 ? `₹${item.value}` : '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User data fields — compact preview + popup editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl + ' mb-0'}>User Data Fields</label>
              <span className="text-[10px] text-muted-foreground font-bold">
                {fields.filter(f => f.key.trim()).length} field{fields.filter(f => f.key.trim()).length !== 1 ? 's' : ''}
                {searchableFields.size > 0 && <span className="text-emerald-400 ml-1">· {searchableFields.size} searchable 🔍</span>}
              </span>
            </div>
            <div className="space-y-1 mb-3">
              {fields.filter(f => f.key.trim()).slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-background border border-border/50 rounded-lg">
                  <span className="text-xs font-bold text-muted-foreground truncate flex items-center gap-1">
                    {f.key}
                    {searchableFields.has(f.key.trim()) && <span className="text-emerald-400 text-[10px]" title="Searchable in tracker">🔍</span>}
                  </span>
                  <span className="text-xs text-foreground font-semibold truncate max-w-[140px]">{f.value || '—'}</span>
                </div>
              ))}
              {fields.filter(f => f.key.trim()).length > 3 && (
                <p className="text-[10px] text-muted-foreground text-center">+{fields.filter(f => f.key.trim()).length - 3} more</p>
              )}
            </div>
            <button onClick={() => setShowFieldsDialog(true)}
              className="w-full py-2.5 border-2 border-dashed border-primary/30 rounded-xl text-xs font-black text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
              <Pencil size={12} /> View / Edit All Fields
            </button>
          </div>

          {/* User Data Fields Popup Dialog */}
          <Dialog open={showFieldsDialog} onOpenChange={o => !o && setShowFieldsDialog(false)}>
            <DialogContent className="max-w-md bg-card border-border max-h-[80vh] overflow-y-auto p-0">
              <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-black text-sm text-foreground">📋 User Data Fields</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fields.length} field(s) — add, edit, or remove</p>
                </div>
                <button onClick={() => setFields(f => [...f, { key: '', value: '' }])}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-white bg-primary rounded-lg hover:opacity-90 transition-all">
                  <Plus size={12} /> Add
                </button>
              </div>

              {/* Searchable Fields Banner — interactive per-lead toggles */}
              <div className="px-6 pt-4">
                <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="text-sm">🔍</span>
                      {searchableFields.size} of {fields.filter(f => f.key.trim()).length} fields searchable
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSearchableFields(new Set(fields.filter(f => f.key.trim()).map(f => f.key.trim())))}
                        className="px-2.5 py-1 text-[10px] font-black rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        ✅ Enable All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchableFields(new Set())}
                        className="px-2.5 py-1 text-[10px] font-black rounded-lg border border-border bg-background text-muted-foreground hover:border-destructive hover:text-destructive transition-all"
                      >
                        ✕ Disable All
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Per-lead 🔎 overrides global search settings. Toggle each field to control which data is searchable for this specific lead in the tracker.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 space-y-2.5">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-background border border-border rounded-xl">
                    <div className="flex-1 space-y-1.5">
                      <input value={f.key} onChange={e => setFields(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                        placeholder="Label (e.g. UPI ID, Bank Account)" className={inp + ' text-xs'} />
                      <input value={f.value} onChange={e => setFields(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                        placeholder="Value" className={inp + ' text-xs'} />
                    </div>
                    {/* 🔎 Searchable toggle — interactive per-lead */}
                    <button
                      type="button"
                      onClick={() => {
                        const key = f.key.trim();
                        if (!key) return;
                        setSearchableFields(prev => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key); else next.add(key);
                          return next;
                        });
                      }}
                      disabled={!f.key.trim()}
                      title={searchableFields.has(f.key.trim()) ? 'Searchable ON — click to disable' : 'Searchable OFF — click to enable'}
                      className={`p-2 rounded-lg border-2 flex-shrink-0 self-center transition-all ${
                        f.key.trim() && searchableFields.has(f.key.trim())
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/20'
                          : 'border-border/40 bg-background text-muted-foreground/35 hover:border-emerald-500/30 hover:text-emerald-400/60'
                      } ${!f.key.trim() ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="text-base">{f.key.trim() && searchableFields.has(f.key.trim()) ? '🔍' : '🔎'}</span>
                    </button>
                    <button onClick={() => setFields(p => p.filter((_, j) => j !== i))}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 self-center">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {fields.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs">No fields yet. Click "Add" to create one.</div>
                )}
              </div>
              <div className="px-6 pb-5">
                <button onClick={() => setShowFieldsDialog(false)}
                  className="w-full py-3 font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 rounded-xl hover:opacity-90 transition-all">
                  ✅ Done
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Remarks */}
          <div className="space-y-3 border-t border-border pt-4">
            <div><label className="text-xs font-bold text-green-400 mb-1.5 block">💬 Public Remark (visible to user)</label><textarea value={publicRemark} onChange={e => setPublicRemark(e.target.value)} rows={2} placeholder="Visible to user on tracker..." className={inp} /></div>
            <div><label className="text-xs font-bold text-amber-400 mb-1.5 block">🔒 Internal Note (Admin Only)</label><textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} className={inp} /></div>
          </div>

          {/* Advanced */}
          <div className="space-y-3 border-t border-border pt-4">
            {/* ── Compact 2-Col Visibility Toggles (Module 1) ── */}
            {!isNew && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Status History Swipe */}
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${showStatusHistoryToggle ? 'border-primary/25 bg-primary/5' : 'border-border/40 bg-background'}`}>
                    <div className="min-w-0 pr-2 flex-1">
                      <p className="text-[11px] font-black text-foreground flex items-center gap-1 flex-wrap leading-tight">
                        📋 Timeline
                        <span className={`text-[9px] font-black px-1 py-0.5 rounded-full border flex-shrink-0 ${showStatusHistoryToggle ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-border/20 border-border/30 text-muted-foreground/40'}`}>
                          {showStatusHistoryToggle ? 'ON' : 'OFF'}
                        </span>
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">User sees status history</p>
                    </div>
                    <button type="button" onClick={() => setShowStatusHistoryToggle(v => !v)}
                      className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${showStatusHistoryToggle ? 'bg-primary' : 'bg-border'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showStatusHistoryToggle ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {/* Hide from Tracker */}
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${hiddenFromTracker ? 'bg-destructive/8 border-destructive/30' : 'bg-background border-border'}`}>
                    <div className="min-w-0 pr-2 flex-1">
                      <p className="text-[11px] font-black text-foreground flex items-center gap-1 flex-wrap leading-tight">
                        🙈 Hide Track
                        {hiddenFromTracker && <span className="text-[9px] font-black px-1 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/20 flex-shrink-0">ON</span>}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">User can't find by UPI</p>
                    </div>
                    <button onClick={() => setHiddenFromTracker(v => !v)}
                      className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${hiddenFromTracker ? 'bg-destructive' : 'bg-border'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${hiddenFromTracker ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
                {/* 📅 Show Dates to User */}
                <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${showDatesTimestamps ? 'border-blue-500/25 bg-blue-500/5' : 'border-border/40 bg-background'}`}>
                  <div className="min-w-0 pr-2 flex-1">
                    <p className="text-[11px] font-black text-foreground flex items-center gap-1 flex-wrap leading-tight">
                      📅 Show to User
                      <span className={`text-[9px] font-black px-1 py-0.5 rounded-full border flex-shrink-0 ${showDatesTimestamps ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-border/20 border-border/30 text-muted-foreground/40'}`}>
                        {showDatesTimestamps ? 'ON' : 'OFF'}
                      </span>
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">Dates & timestamps visible on tracker</p>
                  </div>
                  <button type="button" onClick={() => setShowDatesTimestamps(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${showDatesTimestamps ? 'bg-blue-500' : 'bg-border'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showDatesTimestamps ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Status History — Editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-wider">📋 Status History</label>
                <button type="button"
                  onClick={() => setStatusHistory(p => [...p, { status: effectiveStatus || 'Pending', date: new Date().toISOString() }])}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <Plus size={11} /> Add Entry
                </button>
              </div>
              {statusHistory.length === 0 ? (
                <div className="text-center py-3 text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
                  No history entries. Auto-added when status changes.
                </div>
              ) : (
                <div className="space-y-2">
                  {statusHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-background border border-border rounded-xl">
                      <select
                        value={STATUS_OPTS.includes(h.status) ? h.status : CUSTOM_STATUS_VALUE}
                        onChange={e => {
                          const v = e.target.value === CUSTOM_STATUS_VALUE ? h.status : e.target.value;
                          setStatusHistory(p => p.map((x, j) => j === i ? { ...x, status: v } : x));
                        }}
                        className="text-xs font-black px-2 py-1.5 rounded-lg border bg-card text-foreground focus:outline-none focus:border-primary border-border flex-shrink-0">
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value={CUSTOM_STATUS_VALUE}>Custom…</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={(() => { try { return new Date(h.date).toISOString().slice(0, 16); } catch { return ''; } })()}
                        onChange={e => {
                          try { setStatusHistory(p => p.map((x, j) => j === i ? { ...x, date: new Date(e.target.value).toISOString() } : x)); } catch {}
                        }}
                        className="flex-1 text-xs px-2 py-1.5 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:border-primary min-w-0"
                      />
                      <button type="button" onClick={() => setStatusHistory(p => p.filter((_, j) => j !== i))}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={11} /> Per-Lead Custom CTA
                  </label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Override Global Status CTA for this lead only</p>
                </div>
                <div className="flex gap-2">
                  {actionEnabled && (
                    <button onClick={() => { setActionEnabled(false); setButtonLabel(''); setActionMessage(''); setButtonRedirectUrl(''); setCtaBtnColor(''); }}
                      className="px-2.5 py-1.5 rounded-full text-xs font-black border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all flex items-center gap-1">
                      <RefreshCw size={10} /> Reset to Global
                    </button>
                  )}
                  <button onClick={handleActionToggle} className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all ${actionEnabled ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border text-muted-foreground'}`}>
                    {actionEnabled ? <span className="flex items-center gap-1"><ToggleRight size={14} /> Active</span> : <span className="flex items-center gap-1"><ToggleLeft size={14} /> Add CTA</span>}
                  </button>
                </div>
              </div>
              {actionEnabled && (
                <div className="space-y-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <div><label className={lbl}>Message (shown above button)</label><textarea value={actionMessage} onChange={e => setActionMessage(e.target.value)} rows={2} placeholder="e.g. Aadhaar verification pending. Complete to unlock cashback." className={inp} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={lbl}>Button Label *</label><input value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} placeholder="e.g. Complete Now" className={inp} /></div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={lbl + ' mb-0'}>Redirect URL</label>
                        {offerName && offerRedirectMap[offerName] && (
                          <button onClick={() => setButtonRedirectUrl(offerRedirectMap[offerName])} className="text-[10px] font-black text-primary hover:underline">Use Offer Link</button>
                        )}
                      </div>
                      <input value={buttonRedirectUrl} onChange={e => setButtonRedirectUrl(e.target.value)} placeholder={offerRedirectMap[offerName] || 'https://...'} className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Button Color (hex)</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={ctaBtnColor || '#3b82f6'} onChange={e => setCtaBtnColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border-2 border-border cursor-pointer p-1 bg-card flex-shrink-0" />
                      <input value={ctaBtnColor} onChange={e => setCtaBtnColor(e.target.value)} placeholder="Leave blank for status default" className={inp + ' flex-1'} />
                      {ctaBtnColor && <button type="button" onClick={() => setCtaBtnColor('')} className="text-xs text-muted-foreground hover:text-destructive flex-shrink-0 px-1">✕</button>}
                    </div>
                  </div>
                </div>
              )}
              {!actionEnabled && (
                <p className="text-[10px] text-muted-foreground p-2 text-center">
                  Using <strong className="text-primary">Global Status CTA</strong> for <strong>{effectiveStatus || 'this status'}</strong> from Settings → Payouts & CTA
                </p>
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full py-3.5 font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg">
            {saving ? '💾 Saving...' : (isNew ? '✅ Create Lead' : '✅ Save Changes')}
          </button>
        </div>
      </DialogContent>

      {/* Save Confirmation Dialog for edits */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne">Confirm Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to <strong className="text-foreground">{lead?.offerName || 'this lead'}</strong>? This will update the lead record immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} className="bg-primary text-primary-foreground">
              ✅ Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// ── Unified CTA Dialog (Global Status + Per-Lead Custom in one) ──────────────
type CtaMode = 'pending' | 'onHold' | 'approved' | 'cashbackSent' | 'missing' | 'custom';

const CTA_OPTIONS: { key: CtaMode; emoji: string; label: string; scope: string; color: string; defaultEmoji: string; defaultButton: string; defaultMessage: string }[] = [
  { key: 'pending', emoji: '🔄', label: 'Pending', scope: 'Global CTA — Pending', color: '#f59e0b', defaultEmoji: '▶️', defaultButton: 'Continue', defaultMessage: 'Your lead is still being processed.' },
  { key: 'onHold', emoji: '⏸️', label: 'On Hold', scope: 'Global CTA — On Hold', color: '#f97316', defaultEmoji: '🛠️', defaultButton: 'Resolve Issue', defaultMessage: 'Your lead is on hold and needs attention.' },
  { key: 'approved', emoji: '⏳', label: 'Approved', scope: 'Global CTA — Approved', color: '#94a3b8', defaultEmoji: '💰', defaultButton: 'View Cashback Status', defaultMessage: 'Your lead is approved. Cashback will be sent soon.' },
  { key: 'cashbackSent', emoji: '✅', label: 'Cashback Sent', scope: 'Global CTA — Cashback Sent', color: '#22c55e', defaultEmoji: '🧾', defaultButton: 'View Transaction', defaultMessage: 'Cashback sent successfully. Check your account.' },
  { key: 'missing', emoji: '❌', label: 'Missing', scope: 'Global CTA — Missing', color: '#ef4444', defaultEmoji: '💬', defaultButton: 'Contact Support', defaultMessage: "We couldn't find your lead. Contact support." },
  { key: 'custom', emoji: '🎯', label: 'Custom', scope: '🎯 Custom CTA — This Lead Only', color: '#d97706', defaultEmoji: '🎯', defaultButton: '', defaultMessage: '' },
];

function UnifiedCtaDialog({ lead, offerRedirectMap, password, onClose, onSaved }: {
  lead: Lead; offerRedirectMap: Record<string, string>;
  password: string; onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState<CtaMode | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor fields
  const [ctaEmoji, setCtaEmoji] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [message, setMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [btnColor, setBtnColor] = useState('');
  const [urlError, setUrlError] = useState('');

  // Global CTA config loaded from settings
  const [globalConfig, setGlobalConfig] = useState<Record<string, { emoji: string; label: string; url: string; message: string; color?: string }>>({});
  const [globalLoaded, setGlobalLoaded] = useState(false);

  // Detect if lead has a custom CTA
  const hasCustomCta = useMemo(() => {
    try {
      if (!lead.actionConfig) return false;
      const ac = JSON.parse(lead.actionConfig);
      return !!(ac.buttonLabel && ac.buttonLabel.trim());
    } catch { return false; }
  }, [lead]);

  // Load global config on mount
  useEffect(() => {
    getSettings({}).then(s => {
      try {
        const cfg = JSON.parse((s as { statusCtaConfigJson?: string }).statusCtaConfigJson || '{}');
        setGlobalConfig(cfg);
      } catch {}
      setGlobalLoaded(true);
    }).catch(() => setGlobalLoaded(true));
  }, []);

  function selectMode(m: CtaMode) {
    setMode(m);
    setUrlError('');
    if (m === 'custom') {
      // Load from lead's per-lead CTA
      try {
        const ac = lead.actionConfig ? JSON.parse(lead.actionConfig) : {};
        setCtaEmoji(ac.ctaEmoji || '🎯');
        setButtonLabel(ac.buttonLabel || '');
        setMessage(ac.actionMessage || '');
        setRedirectUrl(ac.buttonRedirectUrl || '');
        setBtnColor(ac.buttonColor || '');
      } catch {
        const opt = CTA_OPTIONS.find(o => o.key === m)!;
        setCtaEmoji(opt.defaultEmoji);
        setButtonLabel(opt.defaultButton);
        setMessage(opt.defaultMessage);
        setRedirectUrl('');
        setBtnColor('');
      }
    } else {
      // Load from global config or defaults
      const opt = CTA_OPTIONS.find(o => o.key === m)!;
      const saved = globalConfig[m];
      setCtaEmoji(saved?.emoji || opt.defaultEmoji);
      setButtonLabel(saved?.label || opt.defaultButton);
      setMessage(saved?.message || opt.defaultMessage);
      setRedirectUrl(saved?.url || '');
      setBtnColor(saved?.color || opt.color);
    }
  }

  function validateUrl(url: string): boolean {
    if (!url.trim()) return true;
    try { new URL(url); return true; } catch {
      if (url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:')) return true;
      return false;
    }
  }

  function handleUrlChange(val: string) {
    setRedirectUrl(val);
    if (val.trim() && !validateUrl(val)) setUrlError('Enter a valid URL (https://...) or path (/...)');
    else setUrlError('');
  }

  function resetToDefault() {
    if (!mode) return;
    const opt = CTA_OPTIONS.find(o => o.key === mode)!;
    setCtaEmoji(opt.defaultEmoji);
    setButtonLabel(opt.defaultButton);
    setMessage(opt.defaultMessage);
    setRedirectUrl('');
    setBtnColor(opt.color);
    setUrlError('');
  }

  const offerLink = offerRedirectMap[lead.offerName] || '';
  const activeOpt = mode ? CTA_OPTIONS.find(o => o.key === mode)! : null;

  async function handleSave() {
    if (!mode || !activeOpt) return;
    if (mode !== 'custom' && !buttonLabel.trim()) { toast.error('Button text is required'); return; }
    if (redirectUrl.trim() && !validateUrl(redirectUrl)) { toast.error('Invalid redirect URL'); return; }

    setSaving(true);
    try {
      if (mode === 'custom') {
        // Save to per-lead actionConfig
        let existing: Record<string, unknown> = {};
        try { if (lead.actionConfig) existing = JSON.parse(lead.actionConfig); } catch {}
        if (buttonLabel.trim()) {
          existing.actionMessage = message;
          existing.buttonLabel = buttonLabel.trim();
          existing.ctaEmoji = ctaEmoji.trim();
          existing.buttonRedirectUrl = redirectUrl;
          if (btnColor.trim()) existing.buttonColor = btnColor.trim();
          else delete existing.buttonColor;
        } else {
          // Clear custom CTA
          existing.actionMessage = '';
          existing.buttonLabel = '';
          existing.ctaEmoji = '';
          existing.buttonRedirectUrl = '';
          existing.buttonColor = '';
          existing.clickCount = 0;
        }
        await adminUpdateLead({ password, id: lead.id, actionConfig: JSON.stringify(existing) });
        toast.success(buttonLabel.trim() ? '🎯 Custom CTA saved ✓' : 'Custom CTA removed ✓');
      } else {
        // Save to global settings
        const updated = { ...globalConfig };
        updated[mode] = {
          emoji: ctaEmoji.trim() || activeOpt.defaultEmoji,
          label: buttonLabel.trim(),
          url: redirectUrl,
          message: message,
          color: btnColor.trim() || activeOpt.color,
        };
        const { adminSaveSettings } = await import('@/lib/api');
        const currentSettings = await getSettings({}) as Record<string, unknown>;
        await adminSaveSettings({ ...currentSettings, password, statusCtaConfigJson: JSON.stringify(updated) } as Parameters<typeof adminSaveSettings>[0]);
        toast.success(`🌐 Global CTA for ${activeOpt.label} saved ✓`);
      }
      onSaved();
    } catch (e) {
      toast.error(String((e as { message?: string })?.message || 'Failed to save CTA'));
    } finally { setSaving(false); }
  }

  async function handleRemoveCustomCta() {
    setSaving(true);
    try {
      let existing: Record<string, unknown> = {};
      try { if (lead.actionConfig) existing = JSON.parse(lead.actionConfig); } catch {}
      existing.actionMessage = '';
      existing.buttonLabel = '';
      existing.ctaEmoji = '';
      existing.buttonRedirectUrl = '';
      existing.buttonColor = '';
      existing.clickCount = 0;
      await adminUpdateLead({ password, id: lead.id, actionConfig: JSON.stringify(existing) });
      toast.success('Custom CTA removed — using Global CTA ✓');
      onSaved();
    } catch (e) {
      toast.error(String((e as { message?: string })?.message || 'Failed'));
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md bg-card border-border p-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <h3 className="font-syne font-black text-sm text-foreground flex items-center gap-2">
            <Target size={14} className="text-primary" /> CTA Control
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[320px]">{lead.offerName} · {lead.summary || '—'}</p>
          {hasCustomCta && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                🎯 CUSTOM CTA ACTIVE
              </span>
              <button onClick={handleRemoveCustomCta} disabled={saving}
                className="text-[9px] font-bold text-muted-foreground hover:text-primary transition-colors">
                ↩️ Use Global CTA
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* ── Step 1: 6 Status Cards ── */}
          {!mode ? (
            <>
              <p className="text-[11px] font-bold text-muted-foreground">Select which CTA to configure:</p>
              <div className="grid grid-cols-3 gap-2">
                {CTA_OPTIONS.map(opt => {
                  const isCustom = opt.key === 'custom';
                  return (
                    <button key={opt.key} onClick={() => selectMode(opt.key)}
                      className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.03] group ${
                        isCustom
                          ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 col-span-3'
                          : 'border-border/40 hover:border-white/30'
                      }`}
                      style={!isCustom ? { background: `${opt.color}06` } : undefined}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform" style={{ filter: `drop-shadow(0 0 4px ${opt.color}60)` }}>
                        {opt.emoji}
                      </span>
                      <span className="text-[10px] font-black text-center leading-tight">{opt.label}</span>
                      <span className="text-[8px] text-muted-foreground/70 leading-tight">
                        {isCustom ? 'This lead only' : 'All leads with this status'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="p-2.5 bg-background/60 border border-border/40 rounded-xl text-center">
                <p className="text-[9px] text-muted-foreground/70">Priority: <strong className="text-amber-400">Per-Lead Custom</strong> → <strong className="text-primary">Status Global</strong> → System Default</p>
              </div>
            </>
          ) : (
            <>
              {/* ── Step 2: CTA Editor ── */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: `${activeOpt!.color}40`, background: `${activeOpt!.color}08` }}>
                <span className="text-base">{activeOpt!.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black" style={{ color: activeOpt!.color }}>{activeOpt!.scope}</span>
                  <p className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5">
                    {mode === 'custom' ? 'Special CTA for this lead only, independent of status.' : 'Default CTA for all leads with this status.'}
                  </p>
                </div>
                <button onClick={() => setMode(null)} className="text-[10px] font-bold text-muted-foreground hover:text-primary flex-shrink-0">← Back</button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Emoji</label>
                    <input value={ctaEmoji} onChange={e => setCtaEmoji(e.target.value)} placeholder="🎯"
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary text-center" maxLength={4} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Button Text {mode !== 'custom' && '*'}</label>
                    <input value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} placeholder="e.g. Contact Admin"
                      className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">User Comment / Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                    placeholder="Message shown to users above the CTA button"
                    className="w-full px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary resize-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Redirect URL / Action</label>
                    {offerLink && <button onClick={() => { setRedirectUrl(offerLink); setUrlError(''); }} className="text-[10px] font-black text-primary hover:underline">Use Offer Link</button>}
                  </div>
                  <input value={redirectUrl} onChange={e => handleUrlChange(e.target.value)} placeholder={offerLink || 'https://...'}
                    className={`w-full px-3 py-2 bg-background border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary ${urlError ? 'border-destructive' : 'border-border'}`} />
                  {urlError && <p className="text-[10px] text-destructive mt-1">{urlError}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Button Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={btnColor || activeOpt!.color} onChange={e => setBtnColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-border cursor-pointer p-1 bg-card flex-shrink-0" />
                    <input value={btnColor} onChange={e => setBtnColor(e.target.value)} placeholder="Leave blank for default"
                      className="flex-1 px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary" />
                    {btnColor && <button onClick={() => setBtnColor('')} className="text-xs text-muted-foreground hover:text-destructive">✕</button>}
                  </div>
                </div>

                {/* Live Preview */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/60 space-y-2.5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Live Preview</p>
                  {message && <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>}
                  <div className="w-full py-2.5 rounded-xl text-center font-black text-sm text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${btnColor || activeOpt!.color}, ${btnColor || activeOpt!.color}cc)` }}>
                    {ctaEmoji && <span className="mr-1.5">{ctaEmoji}</span>}{buttonLabel || 'Button Text'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={resetToDefault}
                  className="py-3 font-syne font-black text-xs text-muted-foreground border border-border rounded-xl hover:bg-muted/30 transition-all flex items-center justify-center gap-1.5">
                  <RefreshCw size={12} /> Reset to Default
                </button>
                <button onClick={handleSave} disabled={saving || (mode !== 'custom' && !buttonLabel.trim()) || !!urlError}
                  className="py-3 font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">
                  {saving ? '⏳ Saving...' : '✅ Save'}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LeadsTable({ password, onSessionExpired, initialStatusFilter = '' }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [offerNames, setOfferNames] = useState<string[]>([]);
  const [offerRedirectMap, setOfferRedirectMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('Cashback Sent');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [ctaLead, setCtaLead] = useState<Lead | null>(null);
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [cashbackDialogLeadId, setCashbackDialogLeadId] = useState<string | null>(null);
  const [cashbackAmount, setCashbackAmount] = useState('');
  const [cashbackSaving, setCashbackSaving] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [appSourceFilter, setAppSourceFilter] = useState('');
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<'' | 'general' | 'private' | 'referral'>('');
  const [offerFilter, setOfferFilter] = useState('');

  // ── Sort System ──────────────────────────────────────────────────────────
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    try { return (sessionStorage.getItem('leads_sort') as SortMode) || 'submitted-desc'; } catch { return 'submitted-desc'; }
  });
  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    try { sessionStorage.setItem('leads_sort', mode); } catch {}
  };
  // Keyboard shortcut: S to cycle sorts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        const idx = SORT_OPTIONS.findIndex(o => o.value === sortMode);
        handleSortChange(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sortMode]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'submitted' | 'updated'>('submitted');
  const [extraCustomerTypes, setExtraCustomerTypes] = useState<string[]>([]);
  const [extraAppSources, setExtraAppSources] = useState<string[]>([]);

  // Load custom tag options from settings
  useEffect(() => {
    getSettings({}).then(s => {
      try {
        const tagOpts = JSON.parse((s as { leadTagOptionsJson?: string }).leadTagOptionsJson || '{}');
        if (Array.isArray(tagOpts.customCustomerTypes)) setExtraCustomerTypes(tagOpts.customCustomerTypes);
        if (Array.isArray(tagOpts.customAppSources)) setExtraAppSources(tagOpts.customAppSources);
      } catch {}
    }).catch(() => {});
  }, []);

  // Sync initialStatusFilter → local state (handles navigating to leads with pre-set filter)
  useEffect(() => {
    setStatusFilter(initialStatusFilter || '');
  }, [initialStatusFilter]);

  const loadLeads = useCallback(() => {
    setLoading(true);
    const checkAuthError = (err: unknown) => {
      const msg = String((err as { message?: string })?.message || '');
      if (msg.toLowerCase().includes('invalid password') || msg.toLowerCase().includes('unauthorized')) {
        onSessionExpired?.();
      }
    };
    Promise.all([
      adminGetLeads({ password }).then(r => setLeads(r.leads)).catch(checkAuthError),
      adminGetOffers({ password }).then(r => {
        setOfferNames(r.offers.map(o => o.name));
        const redirectMap: Record<string, string> = {};
        r.offers.forEach(o => { redirectMap[o.name] = o.redirectLink || ''; });
        setOfferRedirectMap(redirectMap);
      }).catch(checkAuthError),
    ]).finally(() => setLoading(false));
  }, [password, onSessionExpired]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const fraudSet = useMemo(() => buildFraudMap(leads), [leads]);
  const duplicateUpiMap = useMemo(() => buildDuplicateUpiMap(leads), [leads]);

  // Derive unique Customer Types and App Sources from existing leads + defaults
  const { uniqueCustomerTypes, uniqueAppSources } = useMemo(() => {
    const ctSet = new Set<string>([...DEFAULT_CUSTOMER_TYPES, ...extraCustomerTypes]);
    const asSet = new Set<string>([...DEFAULT_APP_SOURCES, ...extraAppSources]);
    leads.forEach(l => {
      try {
        if (l.actionConfig) {
          const ac = JSON.parse(l.actionConfig);
          if (ac.customerType && typeof ac.customerType === 'string' && ac.customerType.trim()) ctSet.add(ac.customerType.trim());
          if (ac.appSource && typeof ac.appSource === 'string' && ac.appSource.trim()) asSet.add(ac.appSource.trim());
        }
      } catch {}
    });
    return { uniqueCustomerTypes: [...ctSet], uniqueAppSources: [...asSet] };
  }, [leads, extraCustomerTypes, extraAppSources]);

  // Phase 4: filtered MUST come before payoutTotals (dependency order)
  const filtered = useMemo(() => leads.filter(l => {
    const data = parseData(l);
    const upi = extractUPI(data).toLowerCase();
    const name = extractName(data).toLowerCase();
    const mobile = extractMobile(data).toLowerCase();
    const q = search.toLowerCase().trim();

    let matchSearch = true;
    if (q) {
      matchSearch = upi.includes(q) || name.includes(q) || mobile.includes(q) ||
        l.offerName.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q) || l.leadId.toLowerCase().includes(q);
    }
    const matchStatus = !statusFilter || l.status === statusFilter;
    // Customer type & app source filters
    let matchCustomerType = true;
    let matchAppSource = true;
    if (customerTypeFilter || appSourceFilter) {
      try {
        if (l.actionConfig) {
          const ac = JSON.parse(l.actionConfig);
          if (customerTypeFilter) matchCustomerType = (ac.customerType || '') === customerTypeFilter;
          if (appSourceFilter) matchAppSource = (ac.appSource || '') === appSourceFilter;
        } else {
          if (customerTypeFilter) matchCustomerType = false;
          if (appSourceFilter) matchAppSource = false;
        }
      } catch {
        if (customerTypeFilter) matchCustomerType = false;
        if (appSourceFilter) matchAppSource = false;
      }
    }
    // ── Strict Date Range Filter (Phase 4 / Phase 5 compound filters) ──────────
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      const dateField = dateFilterType === 'updated' ? l.updatedAt : l.resolvedSubmittedAt;
      if (!dateField || new Date(dateField) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      const dateField = dateFilterType === 'updated' ? l.updatedAt : l.resolvedSubmittedAt;
      if (!dateField || new Date(dateField) > to) return false;
    }
    // Campaign type filter
    if (campaignTypeFilter === 'private' && !l.isPrivateLead) return false;
    if (campaignTypeFilter === 'general' && l.isPrivateLead) return false;
    if (campaignTypeFilter === 'referral') {
      const isRef = (l as Lead & { isReferralLead?: boolean }).isReferralLead;
      if (!isRef) return false;
    }
    // Offer filter — click any offer name to filter
    if (offerFilter && l.offerName !== offerFilter) return false;
    return matchSearch && matchStatus && matchCustomerType && matchAppSource;
  }), [leads, search, statusFilter, customerTypeFilter, appSourceFilter, dateFrom, dateTo, dateFilterType, campaignTypeFilter, offerFilter]);

  // No auto-select — selection starts empty every time

  // ── Sorted array (applied AFTER filtering) ─────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const tsVal = (s: string | undefined) => s ? new Date(s).getTime() : 0;
    switch (sortMode) {
      case 'submitted-desc': return arr.sort((a, b) => tsVal(b.resolvedSubmittedAt) - tsVal(a.resolvedSubmittedAt) || b.id.localeCompare(a.id));
      case 'submitted-asc': return arr.sort((a, b) => tsVal(a.resolvedSubmittedAt) - tsVal(b.resolvedSubmittedAt) || a.id.localeCompare(b.id));
      case 'updated-desc': return arr.sort((a, b) => tsVal(b.updatedAt) - tsVal(a.updatedAt) || tsVal(b.createdAt) - tsVal(a.createdAt) || b.id.localeCompare(a.id));
      case 'updated-asc': return arr.sort((a, b) => tsVal(a.updatedAt) - tsVal(b.updatedAt) || tsVal(a.createdAt) - tsVal(b.createdAt) || a.id.localeCompare(b.id));
      case 'payout-desc': return arr.sort((a, b) => (b.offerPayout || 0) - (a.offerPayout || 0));
      case 'payout-asc': return arr.sort((a, b) => (a.offerPayout || 0) - (b.offerPayout || 0));
      case 'status': return arr.sort((a, b) => (SORT_STATUS_ORDER[a.status] ?? 99) - (SORT_STATUS_ORDER[b.status] ?? 99));
      case 'offer-az': return arr.sort((a, b) => a.offerName.localeCompare(b.offerName));
      case 'name-az': return arr.sort((a, b) => {
        const na = extractName(parseData(a)).toLowerCase();
        const nb = extractName(parseData(b)).toLowerCase();
        return na.localeCompare(nb);
      });
      default: return arr;
    }
  }, [filtered, sortMode]);

  // Phase 4: Dynamic Financial KPIs — STATUS-AWARE, recalculates on every filter change
  // Strict Phase 2 rules: Admin Profit = PAID-only cut, Pending Liabilities = PENDING-only estimate
  const payoutTotals = useMemo(() => {
    const PAID_SET = new Set(['Paid', 'Cashback Sent', 'Approved']);
    const PENDING_SET = new Set(['Pending', 'Hold']);
    let totalLead = 0, adminProfit = 0, pendingLiabilities = 0, userGotPaid = 0, totalUserGot = 0, totalAdminCut = 0;
    filtered.forEach(l => {
      totalLead += l.offerPayout || 0;
      try {
        if (l.actionConfig) {
          const ac = JSON.parse(l.actionConfig);
          const myEarning = typeof ac.myEarning === 'number' ? ac.myEarning : 0;
          const userPayout = typeof ac.userPayout === 'number' ? ac.userPayout : 0;
          const sendUserAmount = typeof ac.sendUserAmount === 'number' ? ac.sendUserAmount : 0;
          totalAdminCut += myEarning;
          totalUserGot += sendUserAmount;
          if (PAID_SET.has(l.status)) { adminProfit += myEarning; userGotPaid += sendUserAmount; }
          if (PENDING_SET.has(l.status)) { pendingLiabilities += userPayout; }
        }
      } catch {}
    });
    return { totalLead, adminProfit, pendingLiabilities, userGotPaid, totalUserGot, totalAdminCut };
  }, [filtered]);

  const { showUndoToast } = useUndoToast();

  function handleAuthError(err: unknown) {
    const msg = String((err as { message?: string })?.message || '');
    if (msg.toLowerCase().includes('invalid password') || msg.toLowerCase().includes('unauthorized')) {
      toast.error('Session expired — please log in again.'); onSessionExpired?.();
    }
  }

  async function handleStatusChange(id: string, status: string) {
    if (status === CUSTOM_STATUS_VALUE) return;
    // Cashback Sent requires entering amount first
    if (status === 'Cashback Sent') {
      setCashbackDialogLeadId(id);
      setCashbackAmount('');
      return;
    }
    const lead = leads.find(l => l.id === id);
    const prevStatus = lead?.status || 'Pending';
    try {
      // Auto-append status change to history timeline
      let acUpdate: string | undefined;
      try {
        const existing = lead?.actionConfig ? JSON.parse(lead.actionConfig) : {};
        const history = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
        history.push({ status, date: new Date().toISOString() });
        existing.statusHistory = history;
        acUpdate = JSON.stringify(existing);
      } catch {}
      await adminUpdateLead({ password, id, status, ...(acUpdate ? { actionConfig: acUpdate } : {}) });
      showUndoToast(`Status → ${status}`, {
        onUndo: async () => {
          await adminUpdateLead({ password, id, status: prevStatus });
          loadLeads();
        },
      });
      loadLeads();
    } catch (e) { handleAuthError(e); toast.error('Update failed.'); }
  }

  async function handleCashbackConfirm() {
    if (!cashbackDialogLeadId) return;
    const amt = parseFloat(cashbackAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid cashback amount'); return; }
    setCashbackSaving(true);
    const lead = leads.find(l => l.id === cashbackDialogLeadId);
    const prevStatus = lead?.status || 'Pending';
    try {
      let existing: Record<string, unknown> = {};
      try { if (lead?.actionConfig) existing = JSON.parse(lead.actionConfig); } catch {}
      existing.sendUserAmount = amt;
      if (!existing.userPayout) existing.userPayout = amt;
      const history = Array.isArray(existing.statusHistory) ? (existing.statusHistory as Array<{status: string; date: string}>) : [];
      history.push({ status: 'Cashback Sent', date: new Date().toISOString() });
      existing.statusHistory = history;
      await adminUpdateLead({ password, id: cashbackDialogLeadId, status: 'Cashback Sent', actionConfig: JSON.stringify(existing) });
      showUndoToast(`Cashback ₹${amt} marked as sent ✓`, {
        onUndo: async () => {
          await adminUpdateLead({ password, id: cashbackDialogLeadId!, status: prevStatus });
          loadLeads();
        },
      });
      setCashbackDialogLeadId(null);
      loadLeads();
    } catch (e) { handleAuthError(e); toast.error('Failed to update.'); }
    finally { setCashbackSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await adminDeleteLead({ password, id });
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      loadLeads();
      showUndoToast('Lead moved to Trash 🗑️', {
        onUndo: async () => {
          await adminRestoreItem({ password, id, type: 'lead', previousActionConfig: res.previousActionConfig });
          loadLeads();
        },
        duration: 8000,
      });
    } catch { toast.error('Delete failed.'); }
    finally { setDeletingId(null); }
  }

  async function handleBulkStatusUpdate() {
    if (!selected.size) return;
    setBulkLoading(true);
    const prevStatuses = new Map([...selected].map(id => [id, leads.find(l => l.id === id)?.status || 'Pending']));
    try {
      await Promise.all([...selected].map(id => adminUpdateLead({ password, id, status: bulkStatus })));
      const selCopy = new Set(selected);
      setSelected(new Set());
      loadLeads();
      showUndoToast(`${selCopy.size} leads → "${bulkStatus}"`, {
        onUndo: async () => {
          await Promise.all([...selCopy].map(id => adminUpdateLead({ password, id, status: prevStatuses.get(id) || 'Pending' })));
          loadLeads();
        },
      });
    } catch { toast.error('Bulk update failed.'); }
    finally { setBulkLoading(false); }
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    setBulkLoading(true);
    const selCopy = new Set(selected);
    try {
      const results = await Promise.all([...selCopy].map(id => adminDeleteLead({ password, id })));
      const prevConfigs = new Map([...selCopy].map((id, i) => [id, results[i].previousActionConfig]));
      setSelected(new Set()); setShowBulkDeleteConfirm(false); loadLeads();
      showUndoToast(`${selCopy.size} leads moved to Trash 🗑️`, {
        onUndo: async () => {
          await Promise.all([...selCopy].map(id => adminRestoreItem({ password, id, type: 'lead', previousActionConfig: prevConfigs.get(id) })));
          loadLeads();
        },
        duration: 9000,
      });
    } catch { toast.error('Bulk move to trash failed.'); }
    finally { setBulkLoading(false); }
  }

  function toggleSelect(id: string) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id)));
  }

  function exportCSV(idsToExport?: Set<string>) {
    const target = idsToExport ? leads.filter(l => idsToExport.has(l.id)) : leads;
    if (!target.length) { toast.error('No leads to export.'); return; }
    const allKeys = new Set<string>();
    target.forEach(l => { try { Object.keys(JSON.parse(l.leadData)).filter(k => k !== '_telemetry').forEach(k => allKeys.add(k)); } catch {} });
    const keyArr = Array.from(allKeys);
    const headers = ['Lead ID', 'UPI ID', 'Name', 'Mobile', 'Offer Name', 'Total Lead (₹)', 'Admin Cut (₹)', 'Estimate User (₹)', 'User Got (₹)', 'Status', 'Paid Date', 'Submitted On', 'Updated On', 'Origin', 'Public Remark', 'Internal Note', 'CTA Active', 'Searchable Fields', 'Show Dates', ...keyArr,
      '🌐 IP Address', '🌍 Country', '📍 City', '📱 Device', '💻 OS', '🌐 Browser', '📶 Network', '⏱ Time Spent (s)', '📜 Scroll Depth %', '🔏 Fingerprint'];
    const rows = target.map(l => {
      const data = parseData(l);
      const upi = extractUPI(data), name = extractName(data), mobile = extractMobile(data);
      const tel = extractTelemetry(data) || {};
      let paidDate = '', ctaActive = 'No', adminCut = 0, estimateUser = 0, userGot = 0, searchableFieldsStr = '', showDates = 'Yes';
      try {
        if (l.actionConfig) {
          const ac = JSON.parse(l.actionConfig);
          paidDate = ac.paidDate ? fmtDate(ac.paidDate) + ' ' + fmtTime(ac.paidDate) : '';
          ctaActive = ac.buttonLabel ? 'Yes' : 'No';
          adminCut = ac.myEarning || 0;
          estimateUser = ac.userPayout || 0;
          userGot = ac.sendUserAmount || 0;
          searchableFieldsStr = Array.isArray(ac.searchableFields) ? ac.searchableFields.join('; ') : '';
          showDates = ac.showDatesTimestamps === false ? 'No' : 'Yes';
        }
      } catch {}
      return [
        l.leadId, upi, name, mobile, l.offerName,
        `₹${l.offerPayout}`, adminCut > 0 ? `₹${adminCut}` : '—', estimateUser > 0 ? `₹${estimateUser}` : '—', userGot > 0 ? `₹${userGot}` : '—',
        l.status, paidDate, l.resolvedSubmittedAt ? fmtDate(l.resolvedSubmittedAt) + ' ' + fmtTime(l.resolvedSubmittedAt) : '',
        l.updatedAt ? fmtDate(l.updatedAt) + ' ' + fmtTime(l.updatedAt) : '',
        l.createdByType === 'Admin' ? 'Admin Added' : 'User',
        l.publicRemark || '', l.internalNote || '', ctaActive, searchableFieldsStr, showDates,
        ...keyArr.map(k => data[k] || ''),
        tel.ip || '—', tel.country || '—', tel.city || '—', tel.deviceType || '—', tel.os || '—', tel.browser || '—', tel.networkType || '—',
        tel.timeSpentSeconds ?? '—', tel.scrollDepth != null ? `${tel.scrollDepth}%` : '—', tel.deviceFingerprint || '—',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `earninghub-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success(`📥 Exported ${target.length} leads`);
  }

  // Phase 4: Dynamic stats — counts from FILTERED subset for contextual KPIs
  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter(l => l.status === 'Pending').length,
    approved: filtered.filter(l => ['Approved', 'Cashback Sent', 'Paid'].includes(l.status)).length,
    cashbackSent: filtered.filter(l => ['Cashback Sent', 'Paid'].includes(l.status)).length,
    fraudAlerts: fraudSet.size,
    // True whenever ANY filter (search, status, tags, date range, campaign type) is active
    isFiltered: filtered.length !== leads.length || !!(search || statusFilter || customerTypeFilter || appSourceFilter || dateFrom || dateTo || campaignTypeFilter || offerFilter),
    totalAll: leads.length,
  }), [filtered, leads, fraudSet, search, statusFilter, customerTypeFilter, appSourceFilter, dateFrom, dateTo, dateFilterType]);

  const allSelectedOnPage = sorted.length > 0 && selected.size === sorted.length;

  if (loading) return (
    <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl h-14 animate-pulse" />)}</div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Dynamic Top Analysis — recalculates on filter change (Phase 4) */}
      {stats.isFiltered && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/30 bg-primary/5">
          <span className="text-xs font-black text-primary">⚡ Dynamic Analysis</span>
          <span className="text-[10px] text-muted-foreground">KPIs below show stats for <strong className="text-foreground">{filtered.length} filtered leads</strong> (of {stats.totalAll} total)</span>
          <button onClick={() => { setSearch(''); setStatusFilter(''); setCustomerTypeFilter(''); setAppSourceFilter(''); setDateFrom(''); setDateTo(''); setDateFilterType('submitted'); setCampaignTypeFilter(''); setOfferFilter(''); }}
            className="ml-auto text-[10px] font-black text-destructive hover:underline flex-shrink-0">
            Clear All Filters
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: stats.total, color: 'text-foreground', filterVal: '', icon: '📋', desc: stats.isFiltered ? 'In current filter' : 'All submissions' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-400', filterVal: 'Pending', icon: '⏳', desc: 'Needs review' },
          { label: 'Approved', value: stats.approved, color: 'text-green-400', filterVal: 'Approved', icon: '✅', desc: 'Approved leads' },
          { label: 'Cashback Sent', value: stats.cashbackSent, color: 'text-emerald-400', filterVal: 'Cashback Sent', icon: '💰', desc: 'Paid out' },
        ].map(s => {
          const isActive = statusFilter === s.filterVal && s.filterVal !== '';
          return (
          <button key={s.label} onClick={() => s.filterVal !== '' && setStatusFilter(isActive ? '' : s.filterVal)}
            className={`bg-card border rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md group ${
              isActive ? 'border-primary/50 shadow-sm shadow-primary/10 bg-primary/5' : 'border-border hover:border-primary/30'
            } ${s.filterVal === '' ? 'cursor-default' : 'cursor-pointer'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{s.label}</p>
              {s.filterVal !== '' && (
                <span className={`text-[9px] font-black transition-all ${isActive ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'}`}>
                  {isActive ? '✕ clear' : '↗ filter'}
                </span>
              )}
            </div>
            <p className={`font-syne font-black text-xl mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{s.desc}</p>
          </button>
          );
        })}
      </div>

      {/* Phase 4: Dynamic Financial KPIs — status-aware, recalculates on every filter change */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              💰 Financial Analysis {stats.isFiltered && <span className="text-primary ml-1">(Filtered View)</span>}
            </p>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">🔒 Admin Only</span>
          </div>
          {stats.isFiltered && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
              {filtered.length} of {stats.totalAll} leads
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: '🏦 Admin Profit', value: payoutTotals.adminProfit, color: 'text-violet-400',
              desc: 'Cut from PAID leads only', bg: 'bg-violet-500/5 border-violet-500/20',
              badge: null,
            },
            {
              label: '⏳ Pending Liabilities', value: payoutTotals.pendingLiabilities, color: 'text-amber-400',
              desc: 'Owed to pending/review users', bg: 'bg-amber-500/5 border-amber-500/20',
              badge: payoutTotals.pendingLiabilities > 0 ? 'Action needed' : null,
            },
            {
              label: '✅ User Got (Paid)', value: payoutTotals.userGotPaid, color: 'text-emerald-400',
              desc: 'Actually paid to users', bg: 'bg-emerald-500/5 border-emerald-500/20',
              badge: null,
            },
            {
              label: '📋 Total Lead Value', value: payoutTotals.totalLead, color: 'text-sky-400',
              desc: 'Gross offer payout sum', bg: 'bg-sky-500/5 border-sky-500/20',
              badge: null,
            },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider leading-tight mb-1">{s.label}</p>
              <p className={`font-syne font-black text-lg ${s.color}`}>
                {s.value > 0 ? `₹${s.value.toLocaleString('en-IN')}` : <span className="text-muted-foreground/40 text-sm font-normal">—</span>}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{s.desc}</p>
              {s.badge && <span className="text-[9px] font-black text-amber-400 mt-1 block">⚠️ {s.badge}</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2.5 border-t border-border/20 flex items-start gap-2">
          <div className="w-4 h-4 rounded bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-400 text-[8px] font-black">i</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            <strong className="text-violet-400">Admin Profit</strong> = Admin Cut from PAID/Cashback Sent leads only ·{' '}
            <strong className="text-amber-400">Pending Liabilities</strong> = User Estimate on PENDING/IN-REVIEW ·{' '}
            <strong className="text-emerald-400">User Got</strong> = Confirmed paid out amounts
          </p>
        </div>
      </div>

      {/* Tag Distribution — Customer Type & App Source quick analysis */}
      {leads.length > 0 && (() => {
        const ctMap = new Map<string, number>();
        const asMap = new Map<string, number>();
        leads.forEach(l => {
          try {
            if (l.actionConfig) {
              const ac = JSON.parse(l.actionConfig);
              if (ac.customerType) ctMap.set(ac.customerType, (ctMap.get(ac.customerType) || 0) + 1);
              if (ac.appSource) asMap.set(ac.appSource, (asMap.get(ac.appSource) || 0) + 1);
            }
          } catch {}
        });
        if (ctMap.size === 0 && asMap.size === 0) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ctMap.size > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">👤 Customer Type Distribution</p>
                <div className="flex flex-wrap gap-2">
                  {[...ctMap.entries()].sort((a,b) => b[1]-a[1]).map(([type, count]) => (
                    <button key={type} onClick={() => setCustomerTypeFilter(customerTypeFilter === type ? '' : type)}
                      className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border transition-all ${customerTypeFilter === type ? 'ring-2 ring-primary' : ''} ${CUSTOMER_TYPE_COLORS[type] || 'bg-primary/10 text-primary border-primary/25'}`}>
                      {type} <span className="opacity-70">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {asMap.size > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">📱 App Source Distribution</p>
                <div className="flex flex-wrap gap-2">
                  {[...asMap.entries()].sort((a,b) => b[1]-a[1]).map(([src, count]) => (
                    <button key={src} onClick={() => setAppSourceFilter(appSourceFilter === src ? '' : src)}
                      className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border transition-all ${appSourceFilter === src ? 'ring-2 ring-primary' : ''} ${APP_SOURCE_COLORS[src] || 'bg-violet-500/10 text-violet-400 border-violet-500/25'}`}>
                      {src} <span className="opacity-70">({count})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Fraud + Fraud alerts */}
      {(fraudSet.size > 0 || duplicateUpiMap.size > 0) && (
        <div className="space-y-2">
          {fraudSet.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-red-500/30 bg-red-500/5">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              <p className="text-sm font-bold text-red-400"><strong>{fraudSet.size} leads</strong> flagged — multiple UPIs from same IP within 24h.</p>
            </div>
          )}
          {duplicateUpiMap.size > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/5">
              <span className="text-amber-400 flex-shrink-0 text-sm mt-0.5">🔄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-400 mb-1">{duplicateUpiMap.size} UPI ID{duplicateUpiMap.size > 1 ? 's' : ''} with Multiple Leads</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...duplicateUpiMap.entries()].slice(0, 8).map(([upi, lList]) => (
                    <button key={upi} onClick={() => setSearch(upi)}
                      className="text-[10px] font-black px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">
                      {upi} ({lList.length})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectionEnabled && selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0"><CheckSquare size={16} className="text-primary" /><span className="font-syne font-black text-sm text-primary">{selected.size} selected</span></div>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="px-3 py-1.5 bg-background border border-border text-sm text-foreground rounded-xl focus:outline-none focus:border-primary font-satoshi">
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={handleBulkStatusUpdate} disabled={bulkLoading} className="px-4 py-1.5 bg-primary text-white font-syne font-black text-xs rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">{bulkLoading ? '⏳ Updating…' : '✅ Update Status'}</button>
              <button onClick={() => exportCSV(selected)} className="flex items-center gap-1.5 px-4 py-1.5 bg-background border border-border text-sm font-bold rounded-xl hover:border-primary hover:text-primary transition-all"><Download size={13} /> Export Selected</button>
              <button onClick={() => setShowBulkDeleteConfirm(true)} disabled={bulkLoading} className="px-4 py-1.5 text-destructive border border-destructive/30 font-syne font-black text-xs rounded-xl hover:bg-destructive/10 transition-all">🗑 Delete Selected</button>
            </div>
            <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search UPI / Name / Phone / Offer..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi" />
            </div>
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <ArrowUpDown size={13} className="text-primary flex-shrink-0" />
              <select value={sortMode} onChange={e => handleSortChange(e.target.value as SortMode)}
                title="Sort leads (press S to cycle)"
                className="px-2 py-2 bg-background border border-primary/30 text-sm text-primary rounded-xl focus:outline-none focus:border-primary font-satoshi font-bold">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-background border border-border text-sm text-foreground rounded-xl focus:outline-none focus:border-primary font-satoshi">
              <option value="">All Status</option>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={customerTypeFilter} onChange={e => setCustomerTypeFilter(e.target.value)} className="px-3 py-2 bg-background border border-border text-sm text-foreground rounded-xl focus:outline-none focus:border-primary font-satoshi">
              <option value="">All Customer Types</option>
              {uniqueCustomerTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={appSourceFilter} onChange={e => setAppSourceFilter(e.target.value)} className="px-3 py-2 bg-background border border-border text-sm text-foreground rounded-xl focus:outline-none focus:border-primary font-satoshi">
              <option value="">All App Sources</option>
              {uniqueAppSources.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {/* Campaign Type Filter */}
            <select value={campaignTypeFilter} onChange={e => setCampaignTypeFilter(e.target.value as '' | 'general' | 'private' | 'referral')} className={`px-3 py-2 border text-sm rounded-xl focus:outline-none focus:border-primary font-satoshi transition-colors ${campaignTypeFilter === 'private' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : campaignTypeFilter === 'referral' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : campaignTypeFilter === 'general' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-background border-border text-foreground'}`}>
              <option value="">All Campaigns</option>
              <option value="general">🌐 General Only</option>
              <option value="private">🔒 Private Only (S)</option>
              <option value="referral">🔗 Referral Only (R)</option>
            </select>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => exportCSV()} className="flex items-center gap-1.5 px-3 py-2 bg-background border border-border text-sm font-bold rounded-xl hover:border-primary hover:text-primary transition-all"><Download size={14} /> CSV</button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-black rounded-xl text-white bg-gradient-to-r from-primary to-blue-400 hover:opacity-90 transition-all shadow-md"><Plus size={14} /> Add Lead</button>
          </div>
        </div>
        {/* Date Range Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex-shrink-0">
              <Calendar size={11} className="inline mr-1" />{dateFilterType === 'updated' ? 'Updated' : 'Submitted'} Date
            </span>
            <select value={dateFilterType} onChange={e => setDateFilterType(e.target.value as 'submitted' | 'updated')}
              className="px-2 py-1.5 bg-background border border-primary/30 text-[10px] font-black text-primary rounded-lg focus:outline-none focus:border-primary">
              <option value="submitted">Submitted Date</option>
              <option value="updated">Updated Date</option>
            </select>
            <input
              type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary transition-colors"
              title="Filter from date"
            />
            <span className="text-[10px] text-muted-foreground font-bold flex-shrink-0">→</span>
            <input
              type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary transition-colors"
              title="Filter to date"
            />
            {/* Quick presets */}
            {[
              { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0,10); setDateFrom(t); setDateTo(t); } },
              { label: 'Yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const t = d.toISOString().slice(0,10); setDateFrom(t); setDateTo(t); } },
              { label: 'Last 7 Days', fn: () => { const d = new Date(); d.setDate(d.getDate()-6); setDateFrom(d.toISOString().slice(0,10)); setDateTo(new Date().toISOString().slice(0,10)); } },
              { label: 'Last 30 Days', fn: () => { const d = new Date(); d.setDate(d.getDate()-29); setDateFrom(d.toISOString().slice(0,10)); setDateTo(new Date().toISOString().slice(0,10)); } },
            ].map(p => (
              <button key={p.label} onClick={p.fn}
                className="text-[10px] font-black px-2 py-1 rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary transition-all flex-shrink-0">
                {p.label}
              </button>
            ))}
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex-shrink-0"
              >
                Clear Dates ✕
              </button>
            )}
          </div>
        </div>

        {/* Sort chip */}
        {sortMode !== 'submitted-desc' && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Sort:</span>
            <button onClick={() => handleSortChange('submitted-desc')}
              className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/25">
              {SORT_OPTIONS.find(o => o.value === sortMode)?.chip || sortMode} ✕
            </button>
            <span className="text-[9px] text-muted-foreground/50 ml-1">Press <kbd className="px-1 py-0.5 rounded bg-background border border-border text-[8px] font-mono">S</kbd> to cycle</span>
          </div>
        )}
        {/* Active filter chips */}
        {(customerTypeFilter || appSourceFilter || dateFrom || dateTo || campaignTypeFilter || offerFilter) && (
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider self-center">Active Filters:</span>
            {customerTypeFilter && (
              <button onClick={() => setCustomerTypeFilter('')}
                className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${CUSTOMER_TYPE_COLORS[customerTypeFilter] || 'bg-primary/10 text-primary border-primary/25'}`}>
                👤 {customerTypeFilter} ✕
              </button>
            )}
            {appSourceFilter && (
              <button onClick={() => setAppSourceFilter('')}
                className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${APP_SOURCE_COLORS[appSourceFilter] || 'bg-violet-500/10 text-violet-400 border-violet-500/25'}`}>
                📱 {appSourceFilter} ✕
              </button>
            )}
            {dateFrom && (
              <button onClick={() => setDateFrom('')}
                className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/25">
                📅 {dateFilterType === 'updated' ? 'Updated' : 'Submitted'} From: {dateFrom} ✕
              </button>
            )}
            {dateTo && (
              <button onClick={() => setDateTo('')}
                className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/25">
                📅 {dateFilterType === 'updated' ? 'Updated' : 'Submitted'} To: {dateTo} ✕
              </button>
            )}
            {campaignTypeFilter && (
              <button onClick={() => setCampaignTypeFilter('')}
                className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${campaignTypeFilter === 'referral' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-purple-500/10 text-purple-400 border-purple-500/25'}`}>
                {campaignTypeFilter === 'private' ? '🔒 Private' : campaignTypeFilter === 'referral' ? '🔗 Referral' : '🌐 General'} ✕
              </button>
            )}
            {offerFilter && (
              <button onClick={() => setOfferFilter('')}
                className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/25">
                📦 {offerFilter} ✕
              </button>
            )}
            <button onClick={() => { setCustomerTypeFilter(''); setAppSourceFilter(''); setDateFrom(''); setDateTo(''); setDateFilterType('submitted'); setCampaignTypeFilter(''); setOfferFilter(''); }}
              className="text-[10px] font-black px-2.5 py-1 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">
              Clear All ✕
            </button>
          </div>
        )}

      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-syne font-black text-foreground text-sm">
              {selected.size > 0
                ? `${selected.size} selected`
                : `${filtered.length} leads${filtered.length !== leads.length ? ` of ${leads.length}` : ''}`}
            </span>
            {offerFilter && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-[10px] font-black text-primary">📦 {offerFilter}</span>
                <button onClick={() => setOfferFilter('')} className="text-primary/60 hover:text-primary text-[10px] transition-colors">✕</button>
              </div>
            )}
          </div>
          {fraudSet.size > 0 && <div className="flex items-center gap-1.5 text-xs font-bold text-red-400"><Shield size={12} />{fraudSet.size} flagged</div>}
          <button
            onClick={() => { setSelectionEnabled(v => !v); if (selectionEnabled) setSelected(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${selectionEnabled ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>
            <CheckSquare size={12} /> {selectionEnabled ? 'Selection ON' : 'Select'}
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-semibold">
            {search || statusFilter || customerTypeFilter || appSourceFilter || dateFrom || dateTo
              ? <div className="space-y-2"><p>No leads match your filters.</p>{(dateFrom || dateTo) && <p className="text-xs text-muted-foreground">💡 Clear the date range filter — leads may exist outside this window.</p>}</div>
              : 'No leads yet. Share your offers!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  {selectionEnabled && (
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-primary transition-colors">
                        {allSelectedOnPage ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                      </button>
                    </th>
                  )}
                  <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground w-12">SR</th>
                  {(([
                    { label: 'Name / Contact', sort: 'name-az' as SortMode },
                    { label: 'Offer', sort: 'offer-az' as SortMode },
                    { label: 'Payout (4 Fields)', sort: 'payout-desc' as SortMode },
                    { label: 'Status', sort: 'status' as SortMode },
                    { label: 'Tags', sort: undefined },
                    { label: 'Submitted', sort: 'submitted-desc' as SortMode },
                    { label: 'Updated', sort: 'updated-desc' as SortMode },
                    { label: 'Device', sort: undefined },
                    { label: 'Actions', sort: undefined },
                  ]) as { label: string; sort?: SortMode }[]).map(h => {
                    // Determine click target for toggling
                    const toggleSort = () => {
                      if (!h.sort) return;
                      if (h.sort === 'submitted-desc') handleSortChange(sortMode === 'submitted-desc' ? 'submitted-asc' : 'submitted-desc');
                      else if (h.sort === 'updated-desc') handleSortChange(sortMode === 'updated-desc' ? 'updated-asc' : 'updated-desc');
                      else if (h.sort === 'payout-desc') handleSortChange(sortMode === 'payout-desc' ? 'payout-asc' : 'payout-desc');
                      else handleSortChange(sortMode === h.sort ? 'submitted-desc' : h.sort);
                    };
                    const isActiveSubmitted = h.sort === 'submitted-desc' && (sortMode === 'submitted-desc' || sortMode === 'submitted-asc');
                    const isActiveUpdated = h.sort === 'updated-desc' && (sortMode === 'updated-desc' || sortMode === 'updated-asc');
                    const isActivePayout = h.sort === 'payout-desc' && (sortMode === 'payout-desc' || sortMode === 'payout-asc');
                    const isActive = isActiveSubmitted || isActiveUpdated || isActivePayout || (h.sort && sortMode === h.sort);
                    let arrow = '';
                    if (isActiveSubmitted) arrow = sortMode === 'submitted-desc' ? ' ↓' : ' ↑';
                    else if (isActiveUpdated) arrow = sortMode === 'updated-desc' ? ' ↓' : ' ↑';
                    else if (isActivePayout) arrow = sortMode === 'payout-desc' ? ' ↓' : ' ↑';
                    else if (h.sort) arrow = ' ↕';
                    return (
                    <th key={h.label}
                      onClick={toggleSort}
                      className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider select-none ${h.sort ? 'cursor-pointer hover:text-primary transition-colors' : ''} ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {h.label}{arrow}
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sorted.map((l, idx) => {
                    const data = parseData(l);
                    const upi = extractUPI(data);
                    const name = extractName(data);
                    const mobile = extractMobile(data);
                    const tel = extractTelemetry(data);
                    const isFlagged = fraudSet.has(l.id);
                    const upiLower = upi.toLowerCase().trim();
                    const isDuplicateUpi = duplicateUpiMap.has(upiLower);
                    const isExpanded = expandedRow === l.id;
                    const isSelected = selected.has(l.id);

                    let paidDate = '', historyLen = 0, isHidden = false, hasCta = false;
                    let leadAdminCut = 0, leadEstimate = 0, leadUserGot = 0;
                    let leadCustomerType = '', leadAppSource = '';
                    try {
                      if (l.actionConfig) {
                        const ac = JSON.parse(l.actionConfig);
                        if (ac.paidDate) paidDate = fmtDate(ac.paidDate);
                        if (Array.isArray(ac.statusHistory)) historyLen = ac.statusHistory.length;
                        isHidden = Boolean(ac.hiddenFromTracker);
                        hasCta = Boolean(ac.buttonLabel);
                        leadAdminCut = typeof ac.myEarning === 'number' ? ac.myEarning : 0;
                        leadEstimate = typeof ac.userPayout === 'number' ? ac.userPayout : 0;
                        leadUserGot = typeof ac.sendUserAmount === 'number' ? ac.sendUserAmount : 0;
                        leadCustomerType = ac.customerType || '';
                        leadAppSource = ac.appSource || '';
                      }
                    } catch {}

                    return (
                      <React.Fragment key={l.id}>
                        <motion.tr initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.012 }}
                          className={`border-b border-border/40 last:border-0 transition-colors ${isSelected ? 'bg-primary/5' : isDuplicateUpi ? 'bg-amber-500/3' : 'hover:bg-background/40'}`}>
                          {selectionEnabled && (
                            <td className="px-4 py-3.5">
                              <button onClick={() => toggleSelect(l.id)} className="text-muted-foreground hover:text-primary transition-colors">
                                {isSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                              </button>
                            </td>
                          )}
                          <td className="px-3 py-3.5 text-center">
                            <span className="text-[11px] font-black text-muted-foreground/60 font-mono">{idx + 1}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {isFlagged && <span title="Fraud Alert" className="text-red-400 flex-shrink-0 text-sm">⚠️</span>}
                              {isDuplicateUpi && !isFlagged && <span title="Duplicate UPI" className="text-amber-400 flex-shrink-0 text-sm">🔄</span>}
                              <div className="cursor-pointer" onClick={() => setEditLead(l)}>
                                <div className="font-syne font-black text-sm text-foreground max-w-[150px] truncate flex items-center gap-1.5 hover:text-primary transition-colors" title="Click to edit lead">
                                  {isHidden && <span title="Hidden from tracker" className="text-[10px]">🙈</span>}
                                  👤 {name || l.summary || '—'}
                                </div>
                                {mobile && <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[150px]">📱 {mobile}</div>}
                                <div className="text-[10px] text-primary/70 mt-0.5 truncate max-w-[150px] font-semibold" title={upi}>💳 {upi}</div>
                                <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">{l.leadId}</div>
                                {(leadCustomerType || leadAppSource) && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {leadCustomerType && (
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${CUSTOMER_TYPE_COLORS[leadCustomerType] || 'bg-primary/10 text-primary border-primary/25'}`}>
                                        👤 {leadCustomerType}
                                      </span>
                                    )}
                                    {leadAppSource && (
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${APP_SOURCE_COLORS[leadAppSource] || 'bg-violet-500/10 text-violet-400 border-violet-500/25'}`}>
                                        📱 {leadAppSource}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setOfferFilter(offerFilter === l.offerName ? '' : l.offerName)}
                                title={offerFilter === l.offerName ? `Clear offer filter` : `Filter by "${l.offerName}"`}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all hover:-translate-y-px ${
                                  offerFilter === l.offerName
                                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                                    : 'bg-primary/10 text-primary hover:bg-primary/25'
                                }`}>
                                {l.offerName}
                              </button>
                              {l.isPrivateLead && (
                                <span
                                  title="Private Campaign Lead"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-black flex-shrink-0 shadow-md"
                                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}
                                >
                                  S
                                </span>
                              )}
                              {(l as Lead & { isReferralLead?: boolean }).isReferralLead && (
                                <span
                                  title="Referral Lead — Click to view referrer info"
                                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-black flex-shrink-0 shadow-md animate-pulse cursor-help"
                                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 10px rgba(16,185,129,0.6)' }}
                                >
                                  R
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-syne font-black text-sm text-amber-400">₹{l.offerPayout}</p>
                            {(leadAdminCut > 0 || leadEstimate > 0 || leadUserGot > 0) && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {leadAdminCut > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">✂️₹{leadAdminCut}</span>}
                                {leadEstimate > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">📊₹{leadEstimate}</span>}
                                {leadUserGot > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">✅₹{leadUserGot}</span>}
                              </div>
                            )}
                          </td>
                          {/* Tags Column */}
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm status-emoji-${classifyStatusForAnim(l.status)}`}>{getLeadStatusEmoji(l.status)}</span>
                                <select value={STATUS_OPTS.includes(l.status) ? l.status : l.status}
                                onChange={e => handleStatusChange(l.id, e.target.value)}
                                className={`text-xs font-black px-2 py-1 rounded-lg border cursor-pointer bg-transparent focus:outline-none ${STATUS_COLORS[l.status] || 'bg-border/20 text-muted-foreground border-border'}`}>
                                {STATUS_OPTS.map(s => <option key={s} value={s} className="bg-card text-foreground">{getLeadStatusEmoji(s)} {s}</option>)}
                                {!STATUS_OPTS.includes(l.status) && <option value={l.status} className="bg-card text-foreground">{l.status}</option>}
                              </select>
                              </div>
                              {historyLen > 0 && <div className="text-[9px] text-muted-foreground">{historyLen} changes</div>}
                              {hasCta && <div className="text-[9px] text-primary font-black">🎯 Custom CTA</div>}
                            </div>
                          </td>
                          {/* Tags column — now correctly after Status */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-1">
                              {leadCustomerType && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${CUSTOMER_TYPE_COLORS[leadCustomerType] || 'bg-primary/10 text-primary border-primary/25'}`}>
                                  👤 {leadCustomerType}
                                </span>
                              )}
                              {leadAppSource && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${APP_SOURCE_COLORS[leadAppSource] || 'bg-violet-500/10 text-violet-400 border-violet-500/25'}`}>
                                  📱 {leadAppSource}
                                </span>
                              )}
                              {!leadCustomerType && !leadAppSource && (
                                <span className="text-[9px] text-muted-foreground/40">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs text-muted-foreground">
                              <div className="font-bold text-foreground/70">
                                {fmtDate(l.resolvedSubmittedAt)}
                              </div>
                              <div className="text-[9px]">{fmtTime(l.resolvedSubmittedAt)}</div>
                              {l.createdByType === 'Admin' && (
                                <div className="text-[9px] font-black text-violet-400 mt-0.5 flex items-center gap-0.5">👤 Admin Added</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs text-muted-foreground">
                              {l.updatedAt ? (
                                <div className="font-bold text-foreground/70">{fmtDate(l.updatedAt)}</div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/40">—</span>
                              )}
                              {paidDate && <div className="text-[10px] text-emerald-400 font-bold mt-0.5">💰 Paid: {paidDate}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {tel ? (
                              <div className="text-[10px] text-muted-foreground space-y-0.5">
                                <div className="flex items-center gap-1"><span>📱</span><span className="font-bold text-foreground">{tel.deviceType}</span></div>
                                <div className="flex items-center gap-1"><span>🌐</span><span>{tel.city || tel.country || '—'}</span></div>
                              </div>
                            ) : <span className="text-[10px] text-muted-foreground/40">No data</span>}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setExpandedRow(isExpanded ? null : l.id)}
                                  title={isExpanded ? 'Collapse details' : 'Expand full lead details'}
                                  className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}>
                                  <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                <button onClick={() => setEditLead(l)}
                                  title="Edit lead — update status, payout, fields"
                                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => setCtaLead(l)}
                                  title="🎯 CTA — manage Global Status CTA or Per-Lead Custom CTA"
                                  className={`p-1.5 rounded-lg border transition-all flex items-center gap-0.5 ${hasCta ? 'border-amber-500/40 bg-amber-500/15 text-amber-500' : 'border-primary/30 text-primary/60 hover:border-primary hover:text-primary hover:bg-primary/5'}`}>
                                  <Target size={13} /><span className="text-[8px] font-black hidden lg:inline">CTA</span>
                                </button>

                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {hasCta && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                    🎯 CTA
                                  </span>
                                )}
                                {isHidden && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                                    🙈 Hidden
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr key={l.id + '-exp'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <td colSpan={selectionEnabled ? 12 : 11} className="px-4 pb-4 pt-0">
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="bg-background border border-border rounded-xl p-4 mt-1 space-y-4">
                                    {/* Data Fields */}
                                    <div>
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">Submitted Data</p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(data).filter(([k]) => k !== '_telemetry' && !String(data[k]).startsWith('http')).map(([k, v]) => (
                                          <div key={k} className="bg-card border border-border rounded-lg p-3">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{k}</p>
                                            <p className="font-semibold text-foreground text-sm mt-0.5 break-all">{String(v) || '—'}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* 4-Field Payout Breakdown */}
                                    <div className="p-3 rounded-xl border border-violet-500/20" style={{ background: 'rgba(139,92,246,0.05)' }}>
                                      <p className="text-[10px] font-black text-violet-400 uppercase tracking-wider mb-3">💰 Payout Breakdown (4 Fields)</p>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          { label: '📋 Total Lead', value: l.offerPayout, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                          { label: '✂️ Admin Cut', value: leadAdminCut, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                                          { label: '📊 Estimate User', value: leadEstimate, color: 'text-sky-400', bg: 'bg-sky-500/10' },
                                          { label: '✅ User Got', value: leadUserGot, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                        ].map(item => (
                                          <div key={item.label} className={`${item.bg} rounded-lg p-2 text-center`}>
                                            <p className="text-[9px] text-muted-foreground font-bold leading-tight">{item.label}</p>
                                            <p className={`font-syne font-black text-base ${item.color}`}>
                                              {item.value > 0 ? `₹${item.value}` : '—'}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                      {(() => {
                                        let sendNote = '';
                                        try { if (l.actionConfig) { const ac = JSON.parse(l.actionConfig); sendNote = ac.sendUserNote || ''; } } catch {}
                                        return sendNote ? <p className="text-[10px] text-muted-foreground mt-2 font-semibold">📝 {sendNote}</p> : null;
                                      })()}
                                    </div>

                                    {/* Telemetry */}
                                    {tel && (
                                      <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                          <Shield size={11} /> Deep Telemetry {isFlagged && <span className="text-red-400 font-black">⚠️ FRAUD FLAGGED</span>}
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                          {[['🌐 IP', tel.ip], ['🌍 Country', tel.country], ['📍 City', tel.city], ['📱 Device', tel.deviceType], ['💻 OS', tel.os], ['🌐 Browser', tel.browser], ['📶 Network', tel.networkType], ['⏱ Time', `${tel.timeSpentSeconds}s`], ['📜 Scroll', `${tel.scrollDepth}%`], ['🔏 FP', tel.deviceFingerprint?.slice(0, 8) + '…']].map(([k, v]) => v ? (
                                            <div key={String(k)} className="bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2">
                                              <p className="text-[9px] font-bold text-muted-foreground">{k}</p>
                                              <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{String(v)}</p>
                                            </div>
                                          ) : null)}
                                        </div>
                                      </div>
                                    )}

                                    {/* Lead Tags */}
                                    {(leadCustomerType || leadAppSource) && (
                                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex flex-wrap gap-2">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-wider w-full">🏷️ Classification Tags</p>
                                        {leadCustomerType && (
                                          <span className={`text-xs font-black px-3 py-1.5 rounded-lg border ${CUSTOMER_TYPE_COLORS[leadCustomerType] || 'bg-primary/10 text-primary border-primary/25'}`}>
                                            👤 {leadCustomerType}
                                          </span>
                                        )}
                                        {leadAppSource && (
                                          <span className={`text-xs font-black px-3 py-1.5 rounded-lg border ${APP_SOURCE_COLORS[leadAppSource] || 'bg-violet-500/10 text-violet-400 border-violet-500/25'}`}>
                                            📱 {leadAppSource}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {/* Referral Info — shown for referral leads */}
                                    {(() => {
                                      try {
                                        if (!l.actionConfig) return null;
                                        const ac = JSON.parse(l.actionConfig);
                                        if (!ac.isReferralLead) return null;
                                        return (
                                          <div className="p-4 rounded-xl border border-emerald-500/25 space-y-3" style={{ background: 'rgba(16,185,129,0.05)' }}>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-black" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}>R</span>
                                              Referral Lead — Referrer Information
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                              <div className="bg-background rounded-lg p-2.5 border border-border">
                                                <p className="text-[9px] text-muted-foreground font-bold">Referrer Name</p>
                                                <p className="text-xs font-black text-foreground">{ac.referrerName || '—'}</p>
                                              </div>
                                              <div className="bg-background rounded-lg p-2.5 border border-border">
                                                <p className="text-[9px] text-muted-foreground font-bold">Referrer UPI</p>
                                                <p className="text-xs font-black text-foreground">{ac.referrerUpi || '—'}</p>
                                              </div>
                                              <div className="bg-background rounded-lg p-2.5 border border-border">
                                                <p className="text-[9px] text-muted-foreground font-bold">Payout Split</p>
                                                <p className="text-xs font-black text-emerald-400">{ac.referrerSplit || '50'}% to referrer</p>
                                              </div>
                                            </div>
                                            {ac.referrerCustomData && typeof ac.referrerCustomData === 'object' && Object.keys(ac.referrerCustomData).length > 0 && (
                                              <div className="space-y-1.5">
                                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Custom Referrer Data</p>
                                                {Object.entries(ac.referrerCustomData).filter(([, v]) => v).map(([key, val]) => (
                                                  <div key={key} className="flex items-center gap-2 px-2.5 py-1.5 bg-background border border-border rounded-lg">
                                                    <span className="text-[10px] font-black text-muted-foreground min-w-[80px]">{key}</span>
                                                    <span className="text-xs text-foreground font-medium truncate">{String(val)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            {ac.referralCode && (
                                              <p className="text-[9px] text-muted-foreground">Referral Code: <span className="font-mono text-primary">{ac.referralCode}</span></p>
                                            )}
                                          </div>
                                        );
                                      } catch { return null; }
                                    })()}
                                    {l.publicRemark && <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl"><p className="text-xs font-bold text-green-400">💬 Public Remark: {l.publicRemark}</p></div>}
                                    {l.internalNote && <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl"><p className="text-xs font-bold text-amber-400">🔒 Internal Note: {l.internalNote}</p></div>}

                                    {/* Proof images */}
                                    {Object.entries(data).filter(([k, v]) => k !== '_telemetry' && String(v).startsWith('http')).map(([k, v]) => (
                                      <div key={k}><p className="text-xs font-bold text-muted-foreground mb-2">📎 {k}</p>
                                        <a href={String(v)} target="_blank" rel="noreferrer">
                                          <img src={String(v)} alt="Proof" className="w-full max-h-40 object-cover rounded-xl border border-border" onError={e => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')} />
                                        </a>
                                      </div>
                                    ))}

                                    {/* CTA inline editor */}
                                    <div className="border-t border-border pt-3 flex items-center justify-between flex-wrap gap-2">
                                      <div>
                                        <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                                          <Target size={12} className="text-primary" />
                                          CTA: {hasCta ? <span className="text-primary">Custom Active</span> : <span className="text-muted-foreground">Global Defaults</span>}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          {hasCta ? 'This lead has a custom CTA button' : 'Inherits from Settings → Lead Tracker'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => setCtaLead(l)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-black hover:bg-primary/20 transition-all">
                                          🎯 CTA
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {ctaLead && <UnifiedCtaDialog lead={ctaLead} offerRedirectMap={offerRedirectMap} password={password} onClose={() => setCtaLead(null)} onSaved={() => { setCtaLead(null); loadLeads(); }} />}
      {showAddModal && <LeadModal offerNames={offerNames} offerRedirectMap={offerRedirectMap} password={password} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadLeads(); }} extraCustomerTypes={extraCustomerTypes} extraAppSources={extraAppSources} />}
      {editLead && <LeadModal lead={editLead} offerNames={offerNames} offerRedirectMap={offerRedirectMap} password={password} onClose={() => setEditLead(null)} onSaved={() => { setEditLead(null); loadLeads(); }} extraCustomerTypes={extraCustomerTypes} extraAppSources={extraAppSources} />}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground">Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This lead will be moved to the <strong className="text-foreground">Trash</strong>. You can restore it from the Trash bin within the admin panel. A toast will appear with an <strong className="text-primary">Undo</strong> button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setDeleteConfirmId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId) { handleDelete(deleteConfirmId); setDeleteConfirmId(null); } }}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black">
              {deletingId ? '⏳ Moving...' : '🗑️ Move to Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={open => !open && setShowBulkDeleteConfirm(false)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-syne font-black text-foreground">Delete {selected.size} lead{selected.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This will move {selected.size} lead record{selected.size !== 1 ? 's' : ''} to Trash. An <strong className="text-primary">Undo</strong> toast will appear for 9 seconds. Items can also be restored from the Trash bin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold border-border" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black">
              {bulkLoading ? '⏳ Moving...' : `🗑️ Move ${selected.size} to Trash`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cashback Sent — Compulsory Amount Dialog */}
      <Dialog open={!!cashbackDialogLeadId} onOpenChange={o => !o && setCashbackDialogLeadId(null)}>
        <DialogContent className="max-w-sm bg-card border-border p-0">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <h3 className="font-syne font-black text-base text-foreground flex items-center gap-2">💰 Cashback Amount Required</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the exact amount sent to the user before marking as <strong className="text-emerald-400">Cashback Sent</strong>.
            </p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">User Got (₹) *</label>
              <input type="number" value={cashbackAmount} onChange={e => setCashbackAmount(e.target.value)}
                placeholder="Enter cashback amount" min={1}
                className="w-full px-4 py-3 bg-background border border-border text-foreground text-lg font-syne font-black rounded-xl focus:outline-none focus:border-emerald-500 transition-colors text-center"
                autoFocus />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">⚡ Quick Amount</p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 150, 200, 250, 300, 400, 500].map(amt => (
                  <button key={amt} type="button" onClick={() => setCashbackAmount(String(amt))}
                    className={`px-3 py-2 text-xs font-black rounded-xl border transition-all ${
                      parseFloat(cashbackAmount) === amt
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'
                    }`}>
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
            {cashbackDialogLeadId && (() => {
              const lead = leads.find(l => l.id === cashbackDialogLeadId);
              if (!lead) return null;
              const d = parseData(lead);
              return (
                <div className="p-3 bg-background border border-border rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Lead Details</p>
                  <p className="text-xs text-foreground font-bold">👤 {extractName(d) || lead.summary || '—'}</p>
                  <p className="text-xs text-muted-foreground">📦 {lead.offerName} · ₹{lead.offerPayout}</p>
                  <p className="text-xs text-primary/70">💳 {extractUPI(d)}</p>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setCashbackDialogLeadId(null)}
                className="py-3 font-syne font-black text-sm border border-border text-muted-foreground rounded-xl hover:border-primary transition-all">
                Cancel
              </button>
              <button onClick={handleCashbackConfirm} disabled={cashbackSaving || !cashbackAmount || parseFloat(cashbackAmount) <= 0}
                className="py-3 font-syne font-black text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
                {cashbackSaving ? '⏳ Saving…' : '✅ Confirm & Send'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
