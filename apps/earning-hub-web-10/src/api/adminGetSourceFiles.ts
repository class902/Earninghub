import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';

const ALL_SOURCE_FILES = [
  'src/App.tsx',
  'src/index.css',
  'src/types/index.ts',
  'src/utils/slugify.ts',
  'src/contexts/AppContext.tsx',
  'src/hooks/useFormHistory.ts',
  'src/hooks/useTelemetry.ts',
  'src/hooks/useUndoToast.ts',
  // API endpoints
  'src/api/adminCreateBackup.ts',
  'src/api/adminCreateLead.ts',
  'src/api/adminDeleteBackup.ts',
  'src/api/adminDeleteCashbackForm.ts',
  'src/api/adminDeleteLead.ts',
  'src/api/adminDeleteOffer.ts',
  'src/api/adminDeletePoster.ts',
  'src/api/adminGetAffiliateMetrics.ts',
  'src/api/adminGetBackupData.ts',
  'src/api/adminGetBackups.ts',
  'src/api/adminGetCashbackForms.ts',
  'src/api/adminGetCashbackSubmissions.ts',
  'src/api/adminGetLeads.ts',
  'src/api/adminGetOffers.ts',
  'src/api/adminGetPosters.ts',
  'src/api/adminGetReferrals.ts',
  'src/api/adminGetTrash.ts',
  'src/api/adminGoogleLogin.ts',
  'src/api/adminLogin.ts',
  'src/api/adminPermanentDelete.ts',
  'src/api/adminRequestLoginOtp.ts',
  'src/api/adminRestoreBackup.ts',
  'src/api/adminRestoreItem.ts',
  'src/api/adminSaveCashbackForm.ts',
  'src/api/adminSaveOffer.ts',
  'src/api/adminSavePoster.ts',
  'src/api/adminSaveSettings.ts',
  'src/api/adminSendOtp.ts',
  'src/api/adminUpdateLead.ts',
  'src/api/adminUpdateReferral.ts',
  'src/api/adminVerifyLoginOtp.ts',
  'src/api/adminVerifyOtpChangeCredentials.ts',
  'src/api/adminVerifySession.ts',
  'src/api/getCashbackForms.ts',
  'src/api/getOffers.ts',
  'src/api/getPosters.ts',
  'src/api/getSettings.ts',
  'src/api/recordActionClick.ts',
  'src/api/searchLeadsByUpi.ts',
  'src/api/submitCashbackForm.ts',
  'src/api/submitLead.ts',
  'src/api/trackEvent.ts',
  'src/api/trackOfferComplete.ts',
  // Pages
  'src/pages/AdminPage.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/OfferSlugPage.tsx',
  'src/pages/OfferTrackPage.tsx',
  'src/pages/TrackLeadPage.tsx',
  // Components
  'src/components/GlobalTrackModal.tsx',
  'src/components/HeroSection.tsx',
  'src/components/HomeBanner.tsx',
  'src/components/HomeFABs.tsx',
  'src/components/NavBar.tsx',
  'src/components/OfferCard.tsx',
  'src/components/OfferFormModal.tsx',
  'src/components/OfferGrid.tsx',
  'src/components/OfferModal.tsx',
  'src/components/OfferPage.tsx',
  'src/components/OfferWarningPopup.tsx',
  'src/components/PayoutTicker.tsx',
  'src/components/PromoPopup.tsx',
  'src/components/ReferSection.tsx',
  'src/components/SiteFooter.tsx',
  'src/components/Ticker.tsx',
  'src/components/TrackLeadPanel.tsx',
  'src/components/UnifiedCashbackForm.tsx',
  'src/components/WalletSummary.tsx',
  // Admin components
  'src/components/admin/AddEditOffer.tsx',
  'src/components/admin/AdminBackup.tsx',
  'src/components/admin/AdminCashbackForms.tsx',
  'src/components/admin/AdminCashbackSubmissions.tsx',
  'src/components/admin/AdminCommandPalette.tsx',
  'src/components/admin/AdminCredentials.tsx',
  'src/components/admin/AdminDashboard.tsx',
  'src/components/admin/AdminLogin.tsx',
  'src/components/admin/AdminReferrals.tsx',
  'src/components/admin/AdminSidebar.tsx',
  'src/components/admin/AdminTrash.tsx',
  'src/components/admin/AnalyticsPage.tsx',
  'src/components/admin/CashbackFormEditor.tsx',
  'src/components/admin/DashboardCharts.tsx',
  'src/components/admin/FormBuilder.tsx',
  'src/components/admin/LeadFieldsConfig.tsx',
  'src/components/admin/LeadsTable.tsx',
  'src/components/admin/LinkTester.tsx',
  'src/components/admin/ManageOffers.tsx',
  'src/components/admin/MissingAnalysis.tsx',
  'src/components/admin/OfferFormConfig.tsx',
  'src/components/admin/PosterManager.tsx',
  'src/components/admin/ReportsPage.tsx',
  'src/components/admin/SettingsPage.tsx',
  'src/components/offer/LiveOfferTab.tsx',
];

export default createEndpoint({
  description: 'Get all source files bundled for admin download',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    files: z.array(z.object({ path: z.string(), content: z.string() })),
    totalFiles: z.number(),
    totalBytes: z.number(),
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ input }) => {
    const expectedPassword = getAdminPassword();
    if (input.password !== expectedPassword) throw new Error('Unauthorized');

    const files: { path: string; content: string }[] = [];
    let totalBytes = 0;

    try {
      // Dynamic import for Node.js built-in modules
      const fs = await import('fs');
      const path = await import('path');
      const cwd = (process as NodeJS.Process).cwd();

      for (const filePath of ALL_SOURCE_FILES) {
        try {
          const fullPath = path.default.join(cwd, filePath);
          const content = fs.default.readFileSync(fullPath, 'utf-8');
          files.push({ path: filePath, content });
          totalBytes += content.length;
        } catch {
          // File not accessible — skip silently
        }
      }

      if (files.length === 0) {
        return {
          files: [],
          totalFiles: 0,
          totalBytes: 0,
          success: false,
          message: 'Source files are not accessible in the current deployment environment. Use the AI Rebuild Prompt to recreate this app.',
        };
      }

      return {
        files,
        totalFiles: files.length,
        totalBytes,
        success: true,
        message: `Successfully bundled ${files.length} source files (${Math.round(totalBytes / 1024)} KB)`,
      };
    } catch {
      return {
        files: [],
        totalFiles: 0,
        totalBytes: 0,
        success: false,
        message: 'Filesystem access is not available in this environment. Use the AI Rebuild Prompt instead.',
      };
    }
  },
});
