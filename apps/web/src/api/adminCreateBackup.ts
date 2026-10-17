import { runtime } from '@server/context';
import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

const CONFIG_KEY = '__config__';

/** Generic paginated fetcher */
async function fetchAll<T>(
  fn: (offset: number) => Promise<{ records: T[]; hasMore: boolean }>,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { records, hasMore } = await fn(offset);
    all.push(...records);
    if (!hasMore) break;
    offset += records.length;
  }
  return all;
}

async function uploadToGoogleDrive(fileName: string, content: string): Promise<string | null> {
  const token = runtime().env.GOOGLE_DRIVE_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const boundary = `backup_${Date.now()}`;
    const metadata = JSON.stringify({ name: fileName, mimeType: 'application/json' });
    const body = [
      `--${boundary}`, 'Content-Type: application/json; charset=UTF-8', '', metadata,
      `--${boundary}`, 'Content-Type: application/json', '', content, `--${boundary}--`,
    ].join('\r\n');
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (res.ok) { const j = await res.json() as { id?: string }; return j.id || null; }
  } catch {}
  return null;
}

export default createEndpoint({
  description: 'Admin: create a COMPLETE A-Z backup — offers, forms, settings, posters, and optionally leads/submissions/referrals',
  inputSchema: z.object({
    password: z.string(),
    label: z.string().optional(),
    source: z.enum(['manual', 'auto']).optional(),
    // Optional large-data tables
    includeLeads: z.boolean().optional().default(false),
    includeSubmissions: z.boolean().optional().default(false),
    includeReferrals: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    backupId: z.string(),
    data: z.string(),
    summary: z.string(),
    driveFileId: z.string().optional(),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    // ── Core data — always included ──────────────────────────────────────────
    const allOffers = await fetchAll(offset => db.offers.findAll({ offset, limit: 500 }));
    const allForms  = await fetchAll(offset => db.cashbackForms.findAll({ offset, limit: 500 }));

    // Posters / News Banners (exclude __config__ settings record)
    const allPostersRaw = await fetchAll(offset => db.posters.findAll({ offset, limit: 500 }));
    const allPosters = allPostersRaw.filter(p => p.title !== CONFIG_KEY);

    // Settings raw JSON blob
    const configRecord = await db.posters.findOne({ filters: { title: CONFIG_KEY } });
    const settingsRaw  = configRecord?.imageUrl || '{}';

    // ── Optional: large data tables ──────────────────────────────────────────
    const allLeads = input.includeLeads
      ? await fetchAll(offset => db.leads.findAll({ offset, limit: 500 })) : [];

    const allSubmissions = input.includeSubmissions
      ? await fetchAll(offset => db.cashbackSubmissions.findAll({ offset, limit: 500 })) : [];

    const allReferrals = input.includeReferrals
      ? await fetchAll(offset => db.referrals.findAll({ offset, limit: 500 })) : [];

    // Referral Links — always included when referrals are included
    const allReferralLinks = input.includeReferrals
      ? await fetchAll(offset => db.referralLinks.findAll({ offset, limit: 500 })) : [];

    // ── Build summary ────────────────────────────────────────────────────────
    const dateLabel = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const summaryParts = [
      `${allOffers.length} Offers`,
      `${allForms.length} Forms`,
      `${allPosters.length} Posters`,
      'Settings',
    ];
    if (input.includeLeads)       summaryParts.push(`${allLeads.length} Leads`);
    if (input.includeSubmissions) summaryParts.push(`${allSubmissions.length} Submissions`);
    if (input.includeReferrals)   summaryParts.push(`${allReferrals.length} Referrals · ${allReferralLinks.length} Referral Links`);
    const summary = summaryParts.join(' · ');
    const label = input.label || `EarningHub Backup — ${dateLabel}`;

    // ── Assemble backup object ───────────────────────────────────────────────
    const backupData = {
      version: '4.0',
      appName: 'EarningHub',
      createdAt: new Date().toISOString(),
      // Core — always present
      offers: allOffers,
      cashbackForms: allForms,
      posters: allPosters,
      settingsRaw,
      // Optional large tables (only present when requested)
      ...(input.includeLeads        ? { leads:       allLeads }       : {}),
      ...(input.includeSubmissions  ? { submissions: allSubmissions }  : {}),
      ...(input.includeReferrals    ? { referrals:   allReferrals }    : {}),
      ...(input.includeReferrals    ? { referralLinks: allReferralLinks } : {}),
      meta: {
        version: '4.0',
        offersCount:       allOffers.length,
        formsCount:        allForms.length,
        postersCount:      allPosters.length,
        leadsCount:        allLeads.length,
        submissionsCount:  allSubmissions.length,
        referralsCount:    allReferrals.length,
        referralLinksCount: allReferralLinks.length,
        includeLeads:       Boolean(input.includeLeads),
        includeSubmissions: Boolean(input.includeSubmissions),
        includeReferrals:   Boolean(input.includeReferrals),
        source: input.source || 'manual',
      },
    };

    const dataStr = JSON.stringify(backupData, null, 2);

    const record = await db.appBackups.create({
      record: {
        label,
        data: dataStr,
        source: input.source === 'auto' ? 'Auto' : 'Manual',
        summary,
      },
    });

    // Drive upload (non-blocking)
    const safeName = dateLabel.replace(/[/,: ]/g, '-').replace(/--+/g, '-');
    const driveFileId = await uploadToGoogleDrive(`EarningHub-Backup-${safeName}.json`, dataStr);

    return { success: true, backupId: record.id, data: dataStr, summary, ...(driveFileId ? { driveFileId } : {}) };
  },
});
