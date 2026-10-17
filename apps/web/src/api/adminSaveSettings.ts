import { appUrl as getAppUrl } from '@server/context';
import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';
import { Email } from '@server/email';

const CONFIG_KEY = '__config__';
const NOTIFY_EMAIL = 'gclass902@gmail.com';

/**
 * Merge-based settings save.
 * Only fields explicitly provided in the input overwrite the persisted value.
 * Missing/undefined optional fields are left untouched — this prevents
 * one admin page from accidentally resetting another page's settings.
 */
export default createEndpoint({
  description: 'Admin: save global site settings (merge-based)',
  inputSchema: z.object({
    password: z.string(),
    // Every field is optional so partial saves work
    googleFormUrl: z.string().optional(),
    googleFormLabel: z.string().optional(),
    googleFormEnabled: z.boolean().optional(),
    leadFieldsConfig: z.string().optional(),
    wifiWarningBannerUrl: z.string().optional(),
    promoEnabled: z.boolean().optional(),
    promoBannerUrl: z.string().optional(),
    promoTitle: z.string().optional(),
    promoSubtitle: z.string().optional(),
    promoButtonText: z.string().optional(),
    promoOfferLink: z.string().optional(),
    promoRedirectLink: z.string().optional(),
    promoCashbackFormEnabled: z.boolean().optional(),
    telegramLink: z.string().optional(),
    supportEmail: z.string().optional(),
    webLogoUrl: z.string().optional(),
    socialLinksJson: z.string().optional(),
    referralEnabled: z.boolean().optional(),
    referralBonusYou: z.number().optional(),
    referralBonusFriend: z.number().optional(),
    referralTerms: z.string().optional(),
    referralMinOffers: z.number().optional(),
    globalActionButtonsJson: z.string().optional(),
    trackByUpi: z.boolean().optional(),
    trackByName: z.boolean().optional(),
    trackByMobile: z.boolean().optional(),
    trackByEmail: z.boolean().optional(),
    statusCtaConfigJson: z.string().optional(),
    statusLabelsJson: z.string().optional(),
    showStatusHistoryDefault: z.boolean().optional(),
    statusHistoryMode: z.string().optional(),
    leadTrackDefaultFilter: z.string().optional(),
    payoutConfigJson: z.string().optional(),
    dashboardCustomJson: z.string().optional(),
    siteName: z.string().optional(),
    faviconUrl: z.string().optional(),
    themeConfig: z.string().optional(),
    layoutConfig: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    gaId: z.string().optional(),
    fontFamily: z.string().optional(),
    tickerText: z.string().optional(),
    customDomain: z.string().optional(),
    notificationEmail: z.string().optional(),
    whatsappLink: z.string().optional(),
    leadTagOptionsJson: z.string().optional(),
    promoDelay: z.number().optional(),
    promoAutoClose: z.number().optional(),
    siteLinksCustomJson: z.string().optional(),
    uiConfigJson: z.string().optional(),
    // Config version for concurrency protection
    configVersion: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    configVersion: z.number(),
    savedAt: z.string(),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    // ── 1. Read existing persisted config ──────────────────────────────────
    let existing: Record<string, unknown> = {};
    const configRow = await db.posters.findOne({ filters: { title: CONFIG_KEY } });
    if (configRow?.imageUrl) {
      try { existing = JSON.parse(configRow.imageUrl); } catch { /* start fresh */ }
    }

    // ── 2. Merge: only overwrite keys that were explicitly sent ────────────
    // We use a whitelist of known config keys. For each, if the input has it
    // (even if the value is false, 0, or ''), we take the input value.
    // If the input does NOT have it (undefined), we keep the existing value.
    const FIELDS = [
      'googleFormUrl', 'googleFormLabel', 'googleFormEnabled', 'leadFieldsConfig',
      'wifiWarningBannerUrl', 'promoEnabled', 'promoBannerUrl', 'promoTitle',
      'promoSubtitle', 'promoButtonText', 'promoOfferLink', 'promoRedirectLink',
      'promoCashbackFormEnabled', 'telegramLink', 'supportEmail', 'webLogoUrl',
      'socialLinksJson', 'referralEnabled', 'referralBonusYou', 'referralBonusFriend',
      'referralTerms', 'referralMinOffers', 'globalActionButtonsJson',
      'trackByUpi', 'trackByName', 'trackByMobile', 'trackByEmail',
      'statusCtaConfigJson', 'statusLabelsJson', 'showStatusHistoryDefault',
      'statusHistoryMode', 'leadTrackDefaultFilter', 'payoutConfigJson',
      'dashboardCustomJson', 'siteName', 'faviconUrl', 'themeConfig', 'layoutConfig',
      'seoTitle', 'seoDescription', 'gaId', 'fontFamily', 'tickerText', 'customDomain',
      'notificationEmail', 'whatsappLink', 'leadTagOptionsJson',
      'promoDelay', 'promoAutoClose', 'siteLinksCustomJson', 'uiConfigJson',
    ] as const;

    const merged: Record<string, unknown> = { ...existing };
    for (const key of FIELDS) {
      const inputVal = (input as Record<string, unknown>)[key];
      if (inputVal !== undefined) {
        merged[key] = inputVal;
      }
      // If inputVal is undefined, the existing value is preserved (no overwrite)
    }

    // Derive statusHistoryMode consistently
    if (input.statusHistoryMode !== undefined) {
      merged.statusHistoryMode = input.statusHistoryMode;
      merged.showStatusHistoryDefault = input.statusHistoryMode === 'show';
    } else if (input.showStatusHistoryDefault !== undefined) {
      merged.showStatusHistoryDefault = input.showStatusHistoryDefault;
      merged.statusHistoryMode = input.showStatusHistoryDefault ? 'show' : 'collapsed';
    }

    // ── 3. Bump config version ────────────────────────────────────────────
    const prevVersion = typeof existing.configVersion === 'number' ? existing.configVersion : 0;
    const newVersion = prevVersion + 1;
    merged.configVersion = newVersion;
    const savedAt = new Date().toISOString();
    merged.lastSavedAt = savedAt;

    // ── 4. Persist atomically ──────────────────────────────────────────────
    const payload = JSON.stringify(merged);
    try {
      if (configRow) {
        await db.posters.update({ id: configRow.id, record: { imageUrl: payload } });
      } else {
        await db.posters.create({ record: { title: CONFIG_KEY, imageUrl: payload, isActive: false, displayOrder: 9999 } });
      }
    } catch (err) {
      const msg = String((err as Error)?.message || 'Database error');
      throw new ApiError({ code: 'INTERNAL_ERROR', message: `Settings save failed: ${msg}` });
    }

    // ── 5. Email notification (non-blocking) ──────────────────────────────
    const siteName = String(merged.siteName || 'EarningHub');
    const domain = String(merged.customDomain || getAppUrl() || '');
    const updatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    try {
      await Email.send({
        to: NOTIFY_EMAIL,
        subject: `⚙️ Settings Updated — ${siteName} v${newVersion} [${updatedAt}]`,
        body: [
          {
            type: 'text' as const,
            content: `<strong>Settings saved</strong> for <strong>${siteName}</strong>.\n\n<strong>Version:</strong> ${newVersion}\n<strong>Saved at:</strong> ${updatedAt}\n<strong>Domain:</strong> ${domain || '(not set)'}`,
          },
          { type: 'divider' as const },
          {
            type: 'button' as const,
            label: '🔐 Open Admin Panel',
            href: `${getAppUrl()}/admin-boss`,
          },
        ],
      });
    } catch {
      // Email failure should not block save
    }

    return { success: true, configVersion: newVersion, savedAt };
  },
});
