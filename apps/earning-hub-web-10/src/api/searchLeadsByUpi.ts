import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

function maskMobile(s: string): string {
  const d = s.replace(/\D/g, '');
  if (d.length < 4) return '****';
  return d.slice(0, 2) + '****' + d.slice(-2);
}
function maskEmail(s: string): string {
  const [local, domain] = s.split('@');
  if (!domain || !local) return s.slice(0, 2) + '****';
  return local.slice(0, 2) + '****@' + domain;
}
function maskUpi(s: string): string {
  const at = s.indexOf('@');
  if (at < 0) return s.slice(0, 2) + '****';
  return s.slice(0, 2) + '****' + s.slice(at);
}
function isProofUrl(v: string): boolean {
  return (
    v.startsWith('http') &&
    (v.includes('.jpg') || v.includes('.jpeg') || v.includes('.png') ||
      v.includes('.pdf') || v.includes('.webp') || v.includes('fillout.com') || v.includes('blob.'))
  );
}
function maskField(label: string, value: string): string {
  const l = label.toLowerCase();
  if (isProofUrl(value)) return value;
  if (l.includes('name')) return value;
  if (l.includes('upi')) return maskUpi(value);
  if (l.includes('mobile') || l.includes('phone') || l.includes('number')) return maskMobile(value);
  if (l.includes('email')) return maskEmail(value);
  if (l.includes('date') || l.includes('amount')) return value;
  if (value.length <= 3) return '****';
  return value.slice(0, 2) + '****';
}

// ── Parse showPayoutToUser from offer's fieldsConfig ─────────────────────────
function parseShowPayoutToUser(fieldsConfig?: string): boolean {
  if (!fieldsConfig) return false;
  try {
    const parsed = JSON.parse(fieldsConfig);
    // New wrapper format: { fields: [...], showPayoutToUser: bool }
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      return Boolean(parsed.showPayoutToUser);
    }
    // Legacy array format → default false (admin hasn't opted in)
    return false;
  } catch { return false; }
}

// ── Effective date helper: uses admin-overridden submissionDate when set ─────
// This ensures date filters match what the user SEES as their submission date.
function getEffectiveDate(createdAt: string | undefined | null, actionConfigStr: string | undefined | null): Date | null {
  if (actionConfigStr) {
    try {
      const ac = JSON.parse(actionConfigStr as string);
      if (ac.submissionDate && typeof ac.submissionDate === 'string' && ac.submissionDate.trim()) {
        const d = new Date(ac.submissionDate);
        if (!isNaN(d.getTime())) return d;
      }
    } catch {}
  }
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// ── Public actionConfig — NO admin-private fields (myEarning/adminCut never exposed) ──
const actionConfigSchema = z.object({
  actionMessage: z.string().optional().default(''),
  buttonLabel: z.string().optional().default(''),
  buttonRedirectUrl: z.string().optional().default(''),
  buttonColor: z.string().optional().default(''),
  clickCount: z.number().optional().default(0),
  lastClickAt: z.string().optional().default(''),
  completionClicks: z.number().optional().default(0),
  lastCompletionAt: z.string().optional().default(''),
  paidDate: z.string().optional().default(''),
  submissionDate: z.string().optional().default(''),
  statusHistory: z.array(z.object({ status: z.string(), date: z.string() })).optional().default([]),
  hiddenFromTracker: z.boolean().optional().default(false),
  // User-facing payout fields only — myEarning (admin cut) is NEVER exposed
  userPayout: z.number().optional().default(0),    // Estimate User (planned cashback)
  sendUserAmount: z.number().optional().default(0), // User Got (actual payment)
  sendUserNote: z.string().optional().default(''),
  // Per-lead granular visibility toggles (admin-controlled, default true = visible)
  showUserGot: z.boolean().optional().default(true),
  showEstimate: z.boolean().optional().default(true),
  showStatusHistory: z.boolean().optional().default(true),
  // Searchable fields config & dates visibility
  searchableFields: z.array(z.string()).optional().default([]),
  showDatesTimestamps: z.boolean().optional().default(true),
});

export default createEndpoint({
  description: 'Search leads by UPI ID, name, or mobile number — user cashback tracking',
  inputSchema: z.object({
    upiId: z.string(),
    dateFilter: z.enum(['all', 'today', '7d', '1m', '24h', 'custom']).optional().default('7d'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    searchMode: z.enum(['upi', 'name', 'any']).optional().default('any'),
    trackByUpi: z.boolean().optional().default(true),
    trackByName: z.boolean().optional().default(true),
    trackByMobile: z.boolean().optional().default(true),
    trackByEmail: z.boolean().optional().default(false),
    // New: searchable field labels from LeadFieldsConfig 🔎 toggles
    searchableFieldLabels: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    leads: z.array(
      z.object({
        id: z.string(),
        leadId: z.string(),
        offerName: z.string(),
        // ⚠️ offerPayout is ALWAYS 0 here — Total Lead Payout is NEVER exposed to users.
        // User-visible amounts are in actionConfig.userPayout (estimate) and actionConfig.sendUserAmount (user got).
        offerPayout: z.number(),
        offerBannerUrl: z.string(),
        offerRedirectLink: z.string(),
        sampleScreenshotUrl: z.string(),
        status: z.string(),
        createdAt: z.string(),
        publicRemark: z.string(),
        userName: z.string(),
        upiId: z.string(),
        paidDate: z.string(),
        submissionDate: z.string(),
        statusHistory: z.array(z.object({ status: z.string(), date: z.string() })),
        fields: z.array(
          z.object({ label: z.string(), maskedValue: z.string(), isProof: z.boolean() })
        ),
        actionConfig: actionConfigSchema,
        // Controls whether payout amounts are shown to user (admin toggle per offer)
        showPayoutToUser: z.boolean(),
      })
    ),
  }),
  execute: async ({ input }) => {
    const q = (input.upiId || '').trim().toLowerCase();
    if (q.length < 3) return { leads: [] };

    const [{ records }, { records: offerRecords }] = await Promise.all([
      zite.leads.findAll({ limit: 2000 }),
      zite.offers.findAll({}),
    ]);

    const offerBannerMap = new Map<string, string>(
      offerRecords.map(o => [o.name?.toLowerCase() || '', o.bannerUrl || ''])
    );
    const offerRedirectMap = new Map<string, string>(
      offerRecords.map(o => [o.name?.toLowerCase() || '', o.redirectLink || ''])
    );
    const offerScreenshotMap = new Map<string, string>(
      offerRecords.map(o => [o.name?.toLowerCase() || '', o.sampleScreenshotUrl || ''])
    );
    // Admin-controlled toggle: show payout to user per offer
    const offerShowPayoutMap = new Map<string, boolean>(
      offerRecords.map(o => [o.name?.toLowerCase() || '', parseShowPayoutToUser(o.fieldsConfig)])
    );

    // ── Check if a field label is globally searchable ──
    // New: uses searchableFieldLabels from admin's per-field 🔎 toggles
    const globalSearchableLabels = input.searchableFieldLabels;
    const isFieldSearchable = (label: string): boolean => {
      // If new searchableFieldLabels array is provided, use exact label matching
      if (globalSearchableLabels && globalSearchableLabels.length > 0) {
        return globalSearchableLabels.some(sl => sl.toLowerCase() === label.toLowerCase());
      }
      // Fallback to legacy trackBy* toggles for backward compatibility
      const l = label.toLowerCase();
      if (input.trackByUpi && l.includes('upi')) return true;
      if (input.trackByName && l.includes('name')) return true;
      if (input.trackByMobile && (l.includes('mobile') || l.includes('phone') || l.includes('number'))) return true;
      if (input.trackByEmail && l.includes('email')) return true;
      return false;
    };

    // ── CRITICAL: Exclude trashed leads before any processing ──
    const nonTrashedRecords = records.filter(r => {
      if (!r.actionConfig) return true;
      try { const ac = JSON.parse(r.actionConfig); return ac._trashed !== true; } catch { return true; }
    });

    let filtered = nonTrashedRecords.filter(r => {
      if (!r.leadData) return false;

      // Parse actionConfig for hiddenFromTracker and searchableFields
      let searchableFields: string[] = [];
      if (r.actionConfig) {
        try {
          const ac = JSON.parse(r.actionConfig);
          if (ac.hiddenFromTracker === true) return false;
          if (Array.isArray(ac.searchableFields) && ac.searchableFields.length > 0) {
            searchableFields = ac.searchableFields;
          }
        } catch {}
      }

      try {
        const parsed = JSON.parse(r.leadData);
        const entries = Object.entries(parsed).filter(([k]) => k !== '_telemetry');

        // ── PRIORITY 1: Per-lead searchableFields (bypasses global searchMode entirely) ──
        if (searchableFields.length > 0) {
          return entries.some(([k, v]) =>
            searchableFields.includes(k) && String(v).toLowerCase().trim() === q
          );
        }

        // ── PRIORITY 2: Global field-level 🔎 search ──
        return entries.some(([k, v]) => {
          if (!isFieldSearchable(k)) return false;
          return String(v).toLowerCase().trim() === q;
        });
      } catch {
        return r.leadData.toLowerCase().includes(q);
      }
    });

    // ── Strict Date Filter — uses effective date (submissionDate override || createdAt) ──
    // CRITICAL: A lead with submissionDate "25 Mar 2026" must be filtered OUT by 7d filter
    // even if it was recently entered into the DB. We filter by what the user SEES.
    const now = new Date();
    if (input.dateFilter === '24h') {
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => {
        const d = getEffectiveDate(r.createdAt, r.actionConfig);
        return d !== null && d >= start;
      });
    } else if (input.dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(r => {
        const d = getEffectiveDate(r.createdAt, r.actionConfig);
        return d !== null && d >= start;
      });
    } else if (input.dateFilter === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => {
        const d = getEffectiveDate(r.createdAt, r.actionConfig);
        return d !== null && d >= start;
      });
    } else if (input.dateFilter === '1m') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(r => {
        const d = getEffectiveDate(r.createdAt, r.actionConfig);
        return d !== null && d >= start;
      });
    } else if (input.dateFilter === 'custom' && input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        const d = getEffectiveDate(r.createdAt, r.actionConfig);
        return d !== null && d >= start && d <= end;
      });
    }
    // 'all' → no date filter, show everything

    // Always sort newest first (by effective date — submissionDate override if set, else createdAt)
    filtered.sort((a, b) => {
      const da = getEffectiveDate(a.createdAt, a.actionConfig);
      const db = getEffectiveDate(b.createdAt, b.actionConfig);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    });

    return {
      leads: filtered.map(r => {
        let parsedData: Record<string, string> = {};
        try { parsedData = JSON.parse(r.leadData || '{}'); } catch {}

        const nameEntry = Object.entries(parsedData).find(([k]) => k.toLowerCase().includes('name'));
        const userName = nameEntry ? nameEntry[1] : (r.summary || '');

        const upiEntry = Object.entries(parsedData).find(([k]) => k.toLowerCase().includes('upi'));
        const maskedUpi = upiEntry ? maskUpi(String(upiEntry[1])) : '';

        const fields = Object.entries(parsedData)
          .filter(([k]) => k !== '_telemetry')
          .map(([label, value]) => ({
            label,
            maskedValue: maskField(label, String(value)),
            isProof: isProofUrl(String(value)),
          }));

        // Default actionConfig — only user-facing fields, NEVER admin cut
        let actionConfig = {
          actionMessage: '', buttonLabel: '', buttonRedirectUrl: '', buttonColor: '',
          clickCount: 0, lastClickAt: '', completionClicks: 0, lastCompletionAt: '',
          paidDate: '', submissionDate: '',
          statusHistory: [] as Array<{ status: string; date: string }>,
          hiddenFromTracker: false,
          userPayout: 0, sendUserAmount: 0, sendUserNote: '',
          showUserGot: true, showEstimate: true, showStatusHistory: true,
          searchableFields: [] as string[], showDatesTimestamps: true,
        };
        try {
          if (r.actionConfig) {
            const parsed = JSON.parse(r.actionConfig);
            actionConfig = {
              actionMessage: parsed.actionMessage || '',
              buttonLabel: parsed.buttonLabel || '',
              buttonRedirectUrl: parsed.buttonRedirectUrl || '',
              buttonColor: parsed.buttonColor || '',
              clickCount: parsed.clickCount || 0,
              lastClickAt: parsed.lastClickAt || '',
              completionClicks: parsed.completionClicks || 0,
              lastCompletionAt: parsed.lastCompletionAt || '',
              paidDate: parsed.paidDate || '',
              submissionDate: parsed.submissionDate || '',
              statusHistory: Array.isArray(parsed.statusHistory) ? parsed.statusHistory : [],
              hiddenFromTracker: Boolean(parsed.hiddenFromTracker),
              // User-facing payout only — myEarning intentionally excluded (zero-leakage policy)
              userPayout: typeof parsed.userPayout === 'number' ? parsed.userPayout : 0,
              sendUserAmount: typeof parsed.sendUserAmount === 'number' ? parsed.sendUserAmount : 0,
              sendUserNote: parsed.sendUserNote || '',
              // Per-lead visibility toggles — default true (visible) if not explicitly set
              showUserGot: typeof parsed.showUserGot === 'boolean' ? parsed.showUserGot : true,
              showEstimate: typeof parsed.showEstimate === 'boolean' ? parsed.showEstimate : true,
              showStatusHistory: typeof parsed.showStatusHistory === 'boolean' ? parsed.showStatusHistory : true,
              searchableFields: Array.isArray(parsed.searchableFields) ? parsed.searchableFields : [],
              showDatesTimestamps: typeof parsed.showDatesTimestamps === 'boolean' ? parsed.showDatesTimestamps : true,
            };
          }
        } catch {}

        const offerKey = r.offerName?.toLowerCase() || '';

        return {
          id: r.id,
          leadId: r.leadId || `HUB-${r.id.slice(-6).toUpperCase()}`,
          offerName: r.offerName || '',
          // ✅ ZERO-LEAKAGE: offerPayout (Total Lead) is NEVER exposed to users. Always 0.
          offerPayout: 0,
          offerBannerUrl: offerBannerMap.get(offerKey) || '',
          offerRedirectLink: offerRedirectMap.get(offerKey) || '',
          sampleScreenshotUrl: offerScreenshotMap.get(offerKey) || '',
          status: r.status || 'Pending',
          createdAt: r.createdAt || '',
          publicRemark: r.publicRemark || '',
          userName,
          upiId: maskedUpi,
          paidDate: actionConfig.paidDate,
          submissionDate: actionConfig.submissionDate,
          statusHistory: actionConfig.statusHistory,
          fields,
          actionConfig,
          // Admin-controlled toggle: does this offer show payout to users?
          showPayoutToUser: offerShowPayoutMap.get(offerKey) ?? false,
        };
      }),
    };
  },
});
