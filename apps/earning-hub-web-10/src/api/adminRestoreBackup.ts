import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import type { OffersRecordType, CashbackFormsRecordType, CashbackSubmissionsRecordType, ReferralsRecordType, LeadsRecordType, PostersRecordType, ReferralLinksRecordType } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const CONFIG_KEY = '__config__';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function deleteAllPaginated<T extends { id: string }>(
  fetcher: (offset: number) => Promise<{ records: T[]; hasMore: boolean }>,
  delFn: (id: string) => Promise<unknown>,
) {
  let offset = 0;
  while (true) {
    const { records, hasMore } = await fetcher(offset);
    await Promise.all(records.map(r => delFn(r.id)));
    if (!hasMore) break;
    offset += records.length;
  }
}

async function bulkRestoreChunked<T>(
  items: Partial<T>[],
  creator: (records: Partial<T>[]) => Promise<unknown>,
): Promise<number> {
  for (const ch of chunkArray(items, 50)) {
    if (ch.length) await creator(ch);
  }
  return items.length;
}

function stripReadOnly<T extends Record<string, unknown>>(
  record: T,
  readOnlyKeys: string[] = ['id', 'createdAt', 'submittedAt'],
): Omit<T, string> {
  const out: Record<string, unknown> = { ...record };
  for (const k of readOnlyKeys) delete out[k];
  return out as Omit<T, string>;
}

export default createEndpoint({
  description: 'Admin: restore ALL app data from a v3/v4 backup JSON — offers, forms, settings, posters, leads, submissions, referrals',
  inputSchema: z.object({
    password: z.string(),
    data: z.string(),
    // Granular restore toggles
    restoreOffers:      z.boolean().optional(),
    restoreForms:       z.boolean().optional(),
    restoreSettings:    z.boolean().optional(),
    restorePosters:     z.boolean().optional(),
    restoreLeads:       z.boolean().optional(),
    restoreSubmissions: z.boolean().optional(),
    restoreReferrals:   z.boolean().optional(),
  }),
  outputSchema: z.object({
    success:             z.boolean(),
    offersRestored:      z.number(),
    formsRestored:       z.number(),
    postersRestored:     z.number(),
    settingsRestored:    z.boolean(),
    leadsRestored:       z.number(),
    submissionsRestored: z.number(),
    referralsRestored:   z.number(),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    let backup: any;
    try { backup = JSON.parse(input.data); }
    catch { throw new ZiteError({ code: 'BAD_REQUEST', message: 'Invalid backup file — not valid JSON' }); }

    if (!backup.version) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Unrecognised backup format (missing version)' });
    }

    const doOffers      = input.restoreOffers      !== false;
    const doForms       = input.restoreForms        !== false;
    const doSettings    = input.restoreSettings     !== false;
    const doPosters     = input.restorePosters      === true  && Array.isArray(backup.posters)     && backup.posters.length > 0;
    const doLeads       = input.restoreLeads        === true  && Array.isArray(backup.leads)        && backup.leads.length > 0;
    const doSubmissions = input.restoreSubmissions  === true  && Array.isArray(backup.submissions)  && backup.submissions.length > 0;
    const doReferrals   = input.restoreReferrals    === true  && Array.isArray(backup.referrals)    && backup.referrals.length > 0;
    const doReferralLinks = input.restoreReferrals  === true  && Array.isArray(backup.referralLinks) && backup.referralLinks.length > 0;

    let offersRestored = 0, formsRestored = 0, postersRestored = 0, settingsRestored = false;
    let leadsRestored = 0, submissionsRestored = 0, referralsRestored = 0, referralLinksRestored = 0;

    // ── Offers ───────────────────────────────────────────────────────────────
    if (doOffers && Array.isArray(backup.offers)) {
      await deleteAllPaginated(
        offset => zite.offers.findAll({ offset, limit: 500 }),
        id => zite.offers.delete({ id }),
      );
      const clean = backup.offers.map((o: any) => stripReadOnly(o)) as Partial<OffersRecordType>[];
      offersRestored = await bulkRestoreChunked(clean, records => zite.offers.bulkCreate({ records }));
    }

    // ── Cashback Forms ───────────────────────────────────────────────────────
    if (doForms && Array.isArray(backup.cashbackForms)) {
      await deleteAllPaginated(
        offset => zite.cashbackForms.findAll({ offset, limit: 500 }),
        id => zite.cashbackForms.delete({ id }),
      );
      const clean = backup.cashbackForms.map((f: any) => stripReadOnly(f)) as Partial<CashbackFormsRecordType>[];
      formsRestored = await bulkRestoreChunked(clean, records => zite.cashbackForms.bulkCreate({ records }));
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    if (doSettings && backup.settingsRaw) {
      const config = await zite.posters.findOne({ filters: { title: CONFIG_KEY } });
      if (config) {
        await zite.posters.update({ id: config.id, record: { imageUrl: backup.settingsRaw } });
      } else {
        await zite.posters.create({ record: { title: CONFIG_KEY, imageUrl: backup.settingsRaw, isActive: false, displayOrder: 9999 } });
      }
      settingsRestored = true;
    }

    // ── News Posters / Banners ────────────────────────────────────────────────
    if (doPosters) {
      const { records: existing } = await zite.posters.findAll({ limit: 2000 });
      const nonConfig = existing.filter(p => p.title !== CONFIG_KEY);
      await Promise.all(nonConfig.map(p => zite.posters.delete({ id: p.id })));
      const clean = (backup.posters as any[])
        .filter((p: any) => p.title !== CONFIG_KEY)
        .map((p: any) => stripReadOnly(p)) as Partial<PostersRecordType>[];
      postersRestored = await bulkRestoreChunked(clean, records => zite.posters.bulkCreate({ records }));
    }

    // ── Leads ────────────────────────────────────────────────────────────────
    if (doLeads) {
      await deleteAllPaginated(
        offset => zite.leads.findAll({ offset, limit: 500 }),
        id => zite.leads.delete({ id }),
      );
      const clean = backup.leads.map((l: any) => stripReadOnly(l)) as Partial<LeadsRecordType>[];
      leadsRestored = await bulkRestoreChunked(clean, records => zite.leads.bulkCreate({ records }));
    }

    // ── Cashback Submissions ─────────────────────────────────────────────────
    if (doSubmissions) {
      await deleteAllPaginated(
        offset => zite.cashbackSubmissions.findAll({ offset, limit: 500 }),
        id => zite.cashbackSubmissions.delete({ id }),
      );
      const clean = backup.submissions.map(
        (s: any) => stripReadOnly(s, ['id', 'submittedAt'])
      ) as Partial<CashbackSubmissionsRecordType>[];
      submissionsRestored = await bulkRestoreChunked(clean, records => zite.cashbackSubmissions.bulkCreate({ records }));
    }

    // ── Referrals ────────────────────────────────────────────────────────────
    if (doReferrals) {
      await deleteAllPaginated(
        offset => zite.referrals.findAll({ offset, limit: 500 }),
        id => zite.referrals.delete({ id }),
      );
      const clean = backup.referrals.map((r: any) => stripReadOnly(r)) as Partial<ReferralsRecordType>[];
      referralsRestored = await bulkRestoreChunked(clean, records => zite.referrals.bulkCreate({ records }));
    }

    // ── Referral Links ────────────────────────────────────────────────────────
    if (doReferralLinks) {
      await deleteAllPaginated(
        offset => zite.referralLinks.findAll({ offset, limit: 500 }),
        id => zite.referralLinks.delete({ id }),
      );
      const cleanLinks = backup.referralLinks.map((r: any) => stripReadOnly(r)) as Partial<ReferralLinksRecordType>[];
      referralLinksRestored = await bulkRestoreChunked(cleanLinks, records => zite.referralLinks.bulkCreate({ records }));
    }

    return {
      success: true,
      offersRestored, formsRestored, postersRestored, settingsRestored,
      leadsRestored, submissionsRestored, referralsRestored: referralsRestored + referralLinksRestored,
    };
  },
});
