/**
 * Shared utilities for referral system endpoints.
 * Merged: supports both return-value and throw patterns.
 */
import { getAdminPassword } from './adminAuth';
import { zite } from 'zitejs/db';
import { ZiteError } from 'zitejs/backend';

export function verifyAdmin(password: string) {
  const envPassword = getAdminPassword();
  if (password !== envPassword) {
    throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid admin password' });
  }
}

// ── Audit Logging ──
export async function logAudit(params: {
  entityType: 'Link' | 'Referral' | 'Reward' | 'Payment' | 'Lead';
  entityId: string;
  action: string;
  actor?: string;
  previousValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  note?: string | null;
}) {
  await zite.referralAuditLog.create({
    record: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actor: params.actor || 'Admin',
      previousValue: params.previousValue ?? null,
      newValue: params.newValue ?? null,
      reason: params.reason ?? null,
      note: params.note ?? null,
    },
  });
}

// ── Link State Machine ──
const VALID_LINK_TRANSITIONS: Record<string, string[]> = {
  Draft: ['Active', 'Terminated'],
  Active: ['Paused', 'Terminated', 'Revoked', 'Expired', 'Disabled'],
  Paused: ['Active', 'Terminated', 'Revoked'],
  Expired: ['Terminated', 'Revoked'],
  Terminated: [],
  Revoked: [],
  Disabled: ['Active', 'Terminated', 'Revoked'],
};

export function validateLinkTransition(current: string, target: string): { valid: boolean; reason?: string } {
  const allowed = VALID_LINK_TRANSITIONS[current];
  if (!allowed) return { valid: false, reason: `Unknown current status: ${current}` };
  if (!allowed.includes(target)) {
    return { valid: false, reason: `Cannot transition from "${current}" to "${target}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}` };
  }
  return { valid: true };
}

// ── Lead Status State Machine ──
const VALID_LEAD_TRANSITIONS: Record<string, string[]> = {
  Clicked: ['Offer Opened', 'Registered', 'Submitted', 'Cancelled'],
  'Offer Opened': ['Registered', 'Submitted', 'Cancelled'],
  Registered: ['Submitted', 'Cancelled'],
  Submitted: ['Under Review', 'Action Required', 'Qualified', 'Not Qualified', 'Rejected', 'Cancelled'],
  'Under Review': ['Action Required', 'Qualified', 'Not Qualified', 'Rejected', 'Cancelled'],
  'Action Required': ['Under Review', 'Qualified', 'Not Qualified', 'Rejected', 'Cancelled'],
  Qualified: ['Completed', 'Rejected', 'Cancelled'],
  'Not Qualified': ['Under Review', 'Cancelled'],
  Rejected: [],
  Cancelled: [],
  Completed: [],
};

export function validateLeadTransition(current: string, target: string): { valid: boolean; reason?: string } {
  const allowed = VALID_LEAD_TRANSITIONS[current];
  if (!allowed) return { valid: false, reason: `Unknown current lead status: ${current}` };
  if (!allowed.includes(target)) {
    return { valid: false, reason: `Cannot transition lead from "${current}" to "${target}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}` };
  }
  return { valid: true };
}

// ── Cashback Status Transitions ──
const VALID_CASHBACK_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Processing', 'Approved', 'Failed'],
  Processing: ['Approved', 'Paid', 'Failed'],
  Approved: ['Processing', 'Paid', 'Failed'],
  Paid: ['Reversed'],
  Failed: ['Pending', 'Processing'],
  Reversed: [],
};

export function validateCashbackTransition(current: string, target: string): { valid: boolean; reason?: string } {
  const allowed = VALID_CASHBACK_TRANSITIONS[current];
  if (!allowed) return { valid: false, reason: `Unknown cashback status: ${current}` };
  if (!allowed.includes(target)) {
    return { valid: false, reason: `Cannot transition cashback from "${current}" to "${target}". Allowed: ${allowed.join(', ') || 'none'}` };
  }
  return { valid: true };
}

// ── Reward Status Transitions ──
const VALID_REWARD_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Eligible', 'Ineligible'],
  Eligible: ['Approved', 'Ineligible'],
  Approved: ['Processing', 'Paid', 'Failed'],
  Processing: ['Paid', 'Failed'],
  Paid: ['Reversed'],
  Failed: ['Processing', 'Approved'],
  Reversed: [],
  Ineligible: ['Pending', 'Eligible'],
};

export function validateRewardTransition(current: string, target: string): { valid: boolean; reason?: string } {
  const allowed = VALID_REWARD_TRANSITIONS[current];
  if (!allowed) return { valid: false, reason: `Unknown reward status: ${current}` };
  if (!allowed.includes(target)) {
    return { valid: false, reason: `Cannot transition reward from "${current}" to "${target}". Allowed: ${allowed.join(', ') || 'none'}` };
  }
  return { valid: true };
}

// ── Payment Status Transitions ──
const VALID_PAYMENT_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Processing', 'Paid', 'Failed'],
  Processing: ['Paid', 'Failed'],
  Paid: [],
  Failed: ['Processing', 'Pending'],
};

export function validatePaymentTransition(current: string, target: string): { valid: boolean; reason?: string } {
  const allowed = VALID_PAYMENT_TRANSITIONS[current];
  if (!allowed) return { valid: false, reason: `Unknown payment status: ${current}` };
  if (!allowed.includes(target)) {
    return { valid: false, reason: `Cannot transition payment from "${current}" to "${target}". Allowed: ${allowed.join(', ') || 'none'}` };
  }
  return { valid: true };
}

// ── Privacy Masking ──
export function maskUpi(upi: string): string {
  if (!upi) return '—';
  const atIdx = upi.indexOf('@');
  if (atIdx < 0) {
    if (upi.length <= 4) return upi;
    return upi.slice(0, 4) + '••••' + upi.slice(-3);
  }
  const prefix = upi.slice(0, atIdx);
  const suffix = upi.slice(atIdx);
  if (prefix.length <= 4) return prefix + '••••' + suffix;
  return prefix.slice(0, 4) + '••••' + prefix.slice(-3) + suffix;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone || '—';
  return phone.slice(0, 4) + '••••' + phone.slice(-3);
}

// Alias from other editor
export const maskMobile = maskPhone;

export function maskEmail(email: string): string {
  if (!email) return '—';
  const atIdx = email.indexOf('@');
  if (atIdx < 1) return email;
  return email[0] + '••••' + email.slice(atIdx);
}

// ── Unique Code Generation ──
export function generateCode(length = 7): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Alias from other editor
export const generateReferralCode = generateCode;
