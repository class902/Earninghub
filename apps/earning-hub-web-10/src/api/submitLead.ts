import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';
import { Email } from 'zitejs/email';

function generateLeadId(): string {
  return `EH-${Math.floor(100000 + Math.random() * 900000)}`;
}

const CONFIG_KEY = '__config__';

async function getNotificationEmail(): Promise<string> {
  try {
    const config = await zite.posters.findOne({ filters: { title: CONFIG_KEY } });
    if (!config?.imageUrl) return '';
    const s = JSON.parse(config.imageUrl);
    return s.notificationEmail || '';
  } catch {
    return '';
  }
}

export default createEndpoint({
  description: 'Submit a lead — with duplicate check, referral tracking, telemetry storage, and admin email notification',
  inputSchema: z.object({
    offerName: z.string(),
    offerPayout: z.number(),
    summary: z.string(),
    leadData: z.string(),
    upiId: z.string().optional().default(''),
    referredBy: z.string().optional(),
    referralCode: z.string().optional(), // Referral link code for attribution
    telemetryJson: z.string().optional(), // JSON of TelemetryData
    isPrivateLead: z.boolean().optional(), // true when submitted from a Private Campaign page
  }),
  outputSchema: z.object({
    success: z.boolean(),
    refId: z.string(),
    isDuplicate: z.boolean(),
  }),
  execute: async ({ input }) => {
    const upiTrimmed = (input.upiId || '').trim().toLowerCase();
    const offerNameLower = input.offerName.toLowerCase();

    // ── Duplicate Check ──────────────────────────────────────────────────────
    if (upiTrimmed.length >= 3) {
      const { records: existing } = await zite.leads.findAll({ limit: 2000 });
      const duplicate = existing.find(r => {
        if (r.offerName?.toLowerCase() !== offerNameLower) return false;
        if (!r.leadData) return false;
        try {
          const parsed = JSON.parse(r.leadData);
          return Object.entries(parsed).some(([k, v]) =>
            !k.startsWith('_') && String(v).toLowerCase().trim() === upiTrimmed
          );
        } catch {
          return r.leadData.toLowerCase().includes(upiTrimmed);
        }
      });
      if (duplicate) {
        return { success: false, refId: '', isDuplicate: true };
      }
    }

    // ── Merge telemetry into leadData ────────────────────────────────────────
    let finalLeadData = input.leadData;
    if (input.telemetryJson) {
      try {
        const base = JSON.parse(input.leadData) as Record<string, unknown>;
        const telemetry = JSON.parse(input.telemetryJson);
        finalLeadData = JSON.stringify({ ...base, _telemetry: telemetry });
      } catch {
        // keep original if parse fails
      }
    }

    // ── Create Lead ──────────────────────────────────────────────────────────
    const leadId = generateLeadId();
    // Build initial actionConfig with flags
    const acFlags: Record<string, unknown> = {};
    if (input.isPrivateLead) acFlags.isPrivateLead = true;

    // ── CHANGES: Enhanced referral attribution with self-referral prevention & absolute splits ──
    let isReferralLead = false;
    let referralLinkId = '';
    if (input.referralCode) {
      const refLink = await zite.referralLinks.findOne({ filters: { referralCode: input.referralCode } });
      if (refLink && refLink.linkStatus === 'Active') {
        // Offer mismatch prevention: referral link must match the submitted offer
        const refOfferLower = (refLink.offerName || '').toLowerCase().trim();
        const offerMismatch = refOfferLower && refOfferLower !== offerNameLower;
        // Self-referral prevention: check if user's UPI matches referrer's UPI
        const referrerUpiLower = (refLink.referrerUpi || '').toLowerCase().trim();
        const selfReferral = referrerUpiLower && upiTrimmed && referrerUpiLower === upiTrimmed;
        if (offerMismatch || selfReferral) {
          // Silently skip referral attribution
        } else {
          isReferralLead = true;
          referralLinkId = refLink.id;
          acFlags.isReferralLead = true;
          acFlags.referralCode = input.referralCode;
          acFlags.referralLinkId = refLink.id;
          acFlags.referrerName = refLink.referrerName || '';
          acFlags.referrerUpi = refLink.referrerUpi || '';
          acFlags.referrerSplit = refLink.referrerSplit || '50';
          // Store absolute ₹ splits
          acFlags.referrerCut = refLink.referrerCut || 0;
          acFlags.userEstimate = refLink.userCut || 0;
          // Look up admin cut from the offer
          try {
            const offerForSplit = await zite.offers.findOne({ id: refLink.offerId || undefined, filters: refLink.offerId ? undefined : { name: refLink.offerName } });
            acFlags.adminCut = offerForSplit?.referralAdminCut || 0;
          } catch { acFlags.adminCut = 0; }
          try {
            acFlags.referrerCustomData = JSON.parse(refLink.customReferrerData || '{}');
          } catch { acFlags.referrerCustomData = {}; }
        }
      }
    }

    const initialActionConfig = Object.keys(acFlags).length > 0 ? JSON.stringify(acFlags) : '';

    await zite.leads.create({
      record: {
        summary: input.summary,
        offerName: input.offerName,
        offerPayout: input.offerPayout,
        leadData: finalLeadData,
        status: 'Pending',
        leadId,
        publicRemark: '',
        internalNote: '',
        actionConfig: initialActionConfig,
        referralCode: input.referralCode || '',
        isReferralLead,
        referralLinkId: referralLinkId || '',
      },
    });

    // ── Referral Record ──────────────────────────────────────────────────────
    if (input.referredBy && input.referredBy.trim() && upiTrimmed) {
      await zite.referrals.create({
        record: {
          referrerUpi: input.referredBy.trim(),
          referredUpi: upiTrimmed,
          offerName: input.offerName,
          bonusPaid: false,
        },
      });
    }

    // ── Admin Notification Email ─────────────────────────────────────────────
    const notificationEmail = await getNotificationEmail();
    if (notificationEmail) {
      try {
        // Parse lead data for email body
        let parsedData: Record<string, string> = {};
        try { parsedData = JSON.parse(finalLeadData); } catch {}
        const userFields = Object.entries(parsedData)
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
          .join('<br/>');

        await Email.send({
          to: notificationEmail,
          subject: `🔔 New Lead — ${input.offerName} (₹${input.offerPayout})`,
          body: [
            {
              type: 'text',
              content: `🎯 New lead submitted!\n\nLead ID: ${leadId}\nOffer: ${input.offerName}\nCashback: ₹${input.offerPayout}\nSummary: ${input.summary}`,
            },
            { type: 'divider' },
            {
              type: 'text',
              content: `User Details:\n${Object.entries((() => { try { return JSON.parse(finalLeadData); } catch { return {}; } })()).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('\n') || '—'}`,
            },
            { type: 'divider' },
            {
              type: 'button',
              label: 'Open Admin Panel →',
              href: `${process.env.ZITE_APP_URL}/admin-boss`,
            },
            {
              type: 'text',
              content: `This is an automated notification from EarningHub. You can update the lead status from the admin panel.`,
            },
          ],
        });
      } catch {
        // Don't fail the lead submission if notification fails
      }
    }

    return { success: true, refId: leadId, isDuplicate: false };
  },
});
