import { useState } from 'react';
import { adminGetSourceFiles } from 'zitejs/api';
import { motion } from 'framer-motion';
import { Download, FileCode2, Bot, Sparkles, CheckCircle2, AlertCircle, Loader2, FileText, Database, Layers, Code2, Cpu, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Props { password: string }

function buildPrompt(): string {
  return `# 🚀 EarningHub — Complete AI Rebuild Prompt
> Generated from the live EarningHub platform. Use this to rebuild the exact same app with any AI agent.

---

## 📱 App Overview
**EarningHub** is a full-stack affiliate marketing & cashback earning platform. It has two sides:
1. **Public frontend** — users browse offers, submit leads, track lead status, earn via referrals
2. **Admin panel** — full CMS to manage offers, leads, payouts, analytics, cashback forms, backups, and all settings

---

## 🛠 Tech Stack
- **Framework**: React + TypeScript (ZiteJS / Next.js-like, file-based routing)
- **Styling**: Tailwind CSS + shadcn/ui component library
- **Database**: Airtable-compatible database with typed SDK (tables, linked records, CRUD)
- **Backend**: Node.js API endpoints with Zod input/output schemas
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Auth**: OTP email + Admin password (server-side verification)
- **File Uploads**: Cloud storage via SDK (images, banners)

---

## 🗄 Database Schema

### Table 1: Offers
| Field | Type | Notes |
|-------|------|-------|
| name | text | Offer display name (primary field) |
| description | long_text | Offer description |
| imageUrl | text | Offer banner/image URL |
| redirectLink | text | Affiliate redirect URL |
| status | single_select | "Active" / "Paused" / "Archived" |
| actionConfig | long_text | JSON: { offerPayout, earningPayout, userPayout, sendUserAmount } |
| offerFormConfigJson | long_text | JSON: custom lead form fields per offer |
| slug | text | URL-friendly identifier |
| order | number | Display sort order |
| tags | text | Comma-separated tags |
| isUserFacing | checkbox | Show/hide from public |
| deletedAt | datetime | Soft delete timestamp |

### Table 2: Leads
| Field | Type | Notes |
|-------|------|-------|
| leadId | text | Unique ID e.g. "EH-12345" (primary field) |
| offerName | text | Associated offer name |
| offerId | text | Associated offer record ID |
| status | single_select | "Pending" / "In Review" / "Under Review" / "Hold" / "Approved" / "Rejected" / "Cashback Sent" / "Missing" / "Paid" |
| summary | text | User display name (name + UPI) |
| upiId | text | User's UPI ID |
| fullName | text | User's full name |
| mobileNumber | text | User's mobile number |
| formData | long_text | JSON: all lead form field submissions |
| actionConfig | long_text | JSON: { myEarning, userPayout, sendUserAmount } — set by admin |
| statusHistory | long_text | JSON array: [{ status, timestamp, note }] |
| ctaOverrideJson | long_text | JSON: per-lead CTA button overrides |
| ipAddress | text | Submitter's IP address |
| adminNote | text | Internal admin notes |
| customerType | text | Classification (Self/Family/College Friend/Unknown/custom) |
| appSource | text | Traffic source (Credit Code/Earn Pati/custom) |
| deletedAt | datetime | Soft delete timestamp |
| createdAt | datetime | Submission timestamp |

### Table 3: Settings (single record)
Stores all platform-wide configuration as JSON fields:
- siteName, faviconUrl, webLogoUrl, fontFamily, tickerText
- themeConfig JSON: { primaryHex, radius }
- layoutConfig JSON: { offerColumns, showHero, showTicker }
- socialLinksJson: [{ id, name, url, iconUrl }]
- telegramLink, supportEmail, notificationEmail, whatsappLink
- seoTitle, seoDescription, gaId, customDomain
- promoEnabled (bool), promoBannerUrl, promoTitle, promoSubtitle, promoButtonText, promoOfferLink, promoRedirectLink, promoCashbackFormEnabled
- wifiWarningBannerUrl
- referralEnabled, referralBonusYou, referralBonusFriend, referralTerms, referralMinOffers
- googleFormUrl, googleFormLabel, googleFormEnabled
- leadFieldsConfig JSON: array of { id, key, label, type, required, placeholder, options }
- globalActionButtonsJson: [{ id, type, label, message, url, enabled }]
- trackByUpi, trackByName (booleans)
- statusCtaConfigJson: per-status CTA configs
- statusLabelsJson: custom display names for statuses
- statusHistoryMode: "show" / "collapsed" / "hidden"
- leadTrackDefaultFilter: "24h" / "7d"
- payoutConfigJson: { earningLabel, userPayoutLabel, sendUserLabel, showUserPayoutInTracker, showSendAmountInTracker, globalUserFacingEnabled }
- leadTagOptionsJson: { customCustomerTypes[], customAppSources[] }
- dashboardCustomJson: { showMyEarnings, showUserPayoutTotal, showSendUserTotal, showPendingPayouts, showConversionRate, showFraudAlerts, showTodayLeads }
- showStatusHistoryDefault (bool)

### Table 4: Posters
| Field | Type |
|-------|------|
| title | text |
| imageUrl | text |
| link | text |
| order | number |
| isActive | checkbox |

### Table 5: Backups
| Field | Type |
|-------|------|
| name | text |
| data | long_text — full JSON snapshot of all tables |
| size | text |
| type | single_select — "auto" / "manual" |
| createdAt | datetime |

### Table 6: Cashback Forms
| Field | Type |
|-------|------|
| name | text |
| slug | text |
| fieldsJson | long_text — form field definitions |
| isActive | checkbox |

### Table 7: Cashback Submissions
| Field | Type |
|-------|------|
| formId | text |
| formName | text |
| submissionData | long_text — JSON |
| status | single_select — "Pending" / "Approved" / "Rejected" |
| submittedAt | datetime |
| ipAddress | text |

### Table 8: Referrals
| Field | Type |
|-------|------|
| referralCode | text |
| name | text |
| source | text |
| clicks | number |
| conversions | number |
| bonus | number |
| status | single_select |
| createdAt | datetime |

---

## 📐 Key Financial Calculations

### actionConfig fields per Lead (set by admin):
- **offerPayout** — total payout from the affiliate network for this offer
- **earningPayout** — admin's own cut from this lead (offerPayout - userPayout)
- **myEarning** — actual admin cut confirmed/set by admin
- **userPayout** — estimated payout to user
- **sendUserAmount** — actual amount sent to user

### Analytics — Missing Analysis:
\`\`\`
Admin Net Loss = 
  Sum(earningPayout of MISSING leads) - Sum(myEarning of MISSING leads)
  = Expected admin cut - Actual admin cut received

User Net Loss = 
  Sum(userPayout of MISSING leads) - Sum(sendUserAmount of MISSING leads)  
  = Expected user payout - Actual amount sent to users
\`\`\`

### Revenue Intelligence (Dashboard):
\`\`\`
Admin Profit (confirmed) = Sum of myEarning from PAID / Cashback Sent leads ONLY
Pending Liabilities      = Sum of userPayout from Pending / In Review / Hold leads
Total Sent to Users      = Sum of sendUserAmount from ALL leads
\`\`\`

---

## 🏛 Admin Panel Pages (all under /admin-boss route)

1. **Dashboard** — KPI grid (10 cards), Revenue Intelligence (collapsible), Quick Actions, Charts, Recent Submissions, Missing Analysis widget
2. **Analytics** — Status distribution pie, daily submissions line chart, offer performance bar, revenue trend, admin/user net loss cards, conversion funnel
3. **Missing Analysis** — Detailed missing leads table, admin loss breakdown, user loss breakdown, unaccounted payout analysis
4. **Reports** — Filter leads by date/status/offer, search, export CSV
5. **Manage Offers** — Cards with toggle active/pause, quick stats, edit/delete buttons
6. **Add/Edit Offer** — Form with image upload, payout config (4 fields), custom form builder per offer, lead fields config, redirect URL
7. **Lead Collection** — Full table with search, filter by status, payout config modal (💰 button), CTA override modal (🎯 button), status update, admin notes, bulk export, lead history
8. **Referral Network** — Referral code management, click/conversion tracking
9. **Cashback Forms** — Form builder, form slug URLs, enable/disable
10. **Form Submissions** — View/approve/reject cashback proof submissions
11. **Link Health Tester** — Ping all active offer URLs, show HTTP status, detect broken links
12. **Backup & Restore** — Auto + manual backups, download as JSON, restore from file/cloud
13. **Trash** — Soft-deleted offers and leads, restore or permanently delete
14. **News Posters** — Image upload, order management, link targets
15. **Settings** — 7 tabs: Brand & Design (colors, logo, font, layout), SEO & Domain, Promotions, Lead & CTA (form config, payout labels, status CTAs, search modes), Referral, Tools & Alerts, Security

---

## 🌐 Public Frontend Pages

### Home Page (/)
- NavBar with logo, search, track lead button, Telegram link
- Optional Hero/Banner section (configurable)
- Optional scrolling Ticker bar (payout announcements)
- Offer Grid (2/3/4 column, configurable per settings)
- OfferCard component with image, name, cashback badge, action buttons
- ReferSection (if referral enabled)
- SiteFooter with social links
- PromoPopup (timed, session-once)
- WiFi Warning Popup before offer redirect
- Floating Action Buttons (track, contact, form)

### Offer Page (/offer/:slug)
- Offer details hero
- Live offer tab with payout info
- Lead submission form (dynamic fields from offer config or global settings)
- Form validation, duplicate detection by UPI/name

### Track Lead Page (/track)
- Search by UPI ID or Full Name / Mobile Number
- Shows lead cards with status, payout amounts (if enabled), status history
- Status badges with custom colors
- Per-status CTA buttons

### Cashback Form Page (/cashback/:slug)  
- Dynamic form based on cashback form config
- File/image upload support
- Success/error states

---

## 🔐 Authentication

- Admin authentication ONLY (no user accounts needed)
- Two login methods:
  1. Admin ID + Password (verified server-side via API endpoint)
  2. OTP email — 6-digit code sent to admin email, expires in 10 minutes
- Password stored as ZITE_ADMIN_PASSWORD environment variable
- No built-in fallback password: the server fails closed unless ZITE_ADMIN_PASSWORD is configured
- Session stored in sessionStorage
- Session validation endpoint called on every admin page load
- Google OAuth for admin (optional)

---

## 🎨 Design System

- **Base**: Dark mode default, light mode toggle via button
- **Primary Color**: #3b82f6 (blue) — fully customizable via admin settings
- **Fonts**: Syne (headings), Satoshi (body) — loaded from CDN
- **Radius**: 0.75rem default — customizable via settings
- **Effects**: Glass morphism cards, gradient accent bars, glow shadows on primary elements
- **Animations**: Framer Motion for page transitions, Animate presence for modals
- **Components**: All from shadcn/ui (Dialog, Sheet, Tabs, Select, Toast/Sonner, etc.)
- **Mobile**: Fully responsive — sidebar becomes a Sheet on mobile, bottom FABs for quick actions

---

## ⚡ Special Features to Implement

1. **Command Palette** (Ctrl+K / Cmd+K) — quick navigation, search pages, filter leads
2. **Live Theme Preview** — color picker changes apply instantly, saved on "Save All Settings"
3. **Payout Config Modal** — per-lead modal to set 4 payout values (offerPayout, earningPayout, userPayout, sendUserAmount)
4. **CTA Override Modal** — per-lead custom CTA button with label, URL, message, color
5. **Status History Timeline** — collapsible status change log on lead tracking page
6. **Auto-Backup Trigger** — create backup after major bulk operations
7. **Fraud Detection** — flag if multiple UPI IDs from same IP within 24h
8. **WiFi Warning Overlay** — show before affiliate redirect links with custom banner image
9. **Lead Form Builder** — drag-sortable fields, types: text/number/select/date/file/checkbox
10. **Soft Delete + Trash** — leads and offers go to trash before permanent delete
11. **OTP System** — generate random 6-digit OTP, store with expiry, verify on login
12. **Duplicate Lead Detection** — check same UPI + same offer within 24h window
13. **Analytics Net Loss Cards** — calculate admin vs user net loss from missing leads

---

## 📦 API Endpoints to Build

\`\`\`
Public:
GET  /api/getOffers         — fetch all active offers
GET  /api/getSettings       — fetch public settings
GET  /api/getPosters        — fetch active posters
GET  /api/getCashbackForms  — fetch active cashback forms
POST /api/submitLead        — submit a new lead
POST /api/submitCashbackForm — submit cashback proof
POST /api/searchLeadsByUpi  — look up leads by UPI/name/phone
POST /api/trackEvent        — log analytics event
POST /api/trackOfferComplete — mark offer as completed
POST /api/recordActionClick — log CTA button click

Admin (all require password verification):
POST /api/adminLogin                — verify admin password
POST /api/adminRequestLoginOtp      — send OTP email
POST /api/adminVerifyLoginOtp       — verify OTP code
POST /api/adminGoogleLogin          — Google OAuth admin login
POST /api/adminVerifySession        — validate stored session
POST /api/adminVerifyOtpChangeCredentials — change admin ID/password via OTP
POST /api/adminSendOtp              — send OTP for credential change
GET  /api/adminGetOffers            — get all offers (including inactive)
POST /api/adminSaveOffer            — create/update offer
POST /api/adminDeleteOffer          — soft delete offer
POST /api/adminGetLeads             — get all leads with filters
POST /api/adminCreateLead           — create lead manually
POST /api/adminUpdateLead           — update lead status/payout/notes
POST /api/adminDeleteLead           — soft delete lead
GET  /api/adminGetPosters           — get all posters
POST /api/adminSavePoster           — create/update poster
POST /api/adminDeletePoster         — delete poster
GET  /api/adminGetSettings          — get full settings
POST /api/adminSaveSettings         — save all settings
POST /api/adminGetCashbackForms     — get all cashback forms
POST /api/adminSaveCashbackForm     — create/update cashback form
POST /api/adminDeleteCashbackForm   — delete cashback form
POST /api/adminGetCashbackSubmissions — get submissions
POST /api/adminGetReferrals         — get referral records
POST /api/adminUpdateReferral       — update referral
GET  /api/adminGetBackups           — list all backups
POST /api/adminCreateBackup         — create new backup snapshot
POST /api/adminRestoreBackup        — restore from backup
POST /api/adminDeleteBackup         — delete backup
POST /api/adminGetBackupData        — get backup JSON content
GET  /api/adminGetTrash             — get soft-deleted items
POST /api/adminRestoreItem          — restore item from trash
POST /api/adminPermanentDelete      — permanently delete item
POST /api/adminGetAffiliateMetrics  — get analytics metrics
POST /api/adminGetSourceFiles       — bundle source code for download
\`\`\`

---

## 🔧 Environment Variables
\`\`\`
ZITE_ADMIN_PASSWORD=<your-admin-password>
\`\`\`

---

## 📋 Build Instructions for AI Agent

1. Set up React + TypeScript project with Tailwind CSS and shadcn/ui
2. Create the database tables as described above
3. Build all API endpoints with Zod schemas (input + output validation)
4. Build public frontend pages (Home, Offer, Track, Cashback Form)
5. Build admin panel with sidebar navigation and all 15 pages
6. Implement the authentication system (password + OTP)
7. Add dark/light mode toggle
8. Make fully mobile responsive
9. Add all special features (command palette, payout config, CTA overrides, etc.)
10. Test all calculations (net loss, revenue intelligence, conversion rate)

**Priority order**: Database schema → API endpoints → Admin login → Lead management → Offer management → Analytics → Settings → Public frontend

---

*Generated from EarningHub v1.0 — Affiliate Marketing & Cashback Platform*
*Rebuild this app by pasting this prompt into any AI coding agent (Claude, GPT-4, Gemini, etc.)*
`;
}

interface DownloadCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  items: string[];
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  gradient: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

function DownloadCard({ icon, title, description, badge, badgeColor, items, buttonLabel, buttonIcon, gradient, onClick, loading, disabled }: DownloadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 group"
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-md`}>
              {icon}
            </div>
            <div>
              <h3 className="font-syne font-black text-foreground text-base">{title}</h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={onClick}
          disabled={loading || disabled}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-syne font-black text-sm text-white bg-gradient-to-r ${gradient} hover:opacity-90 transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : buttonIcon}
          {loading ? 'Preparing...' : buttonLabel}
        </button>
      </div>
    </motion.div>
  );
}

export default function DownloadsPage({ password }: Props) {
  const [loadingSource, setLoadingSource] = useState(false);
  const [sourceResult, setSourceResult] = useState<{ success: boolean; message: string; totalFiles: number; totalBytes: number } | null>(null);

  function downloadPrompt() {
    const content = buildPrompt();
    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earninghub-rebuild-prompt-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('🤖 AI Rebuild Prompt downloaded!');
  }

  async function downloadSourceCode() {
    setLoadingSource(true);
    setSourceResult(null);
    try {
      const result = await adminGetSourceFiles({ password });
      setSourceResult({ success: result.success, message: result.message, totalFiles: result.totalFiles, totalBytes: result.totalBytes });

      if (result.success && result.files.length > 0) {
        // Build a text archive with clear file separators
        const separator = '='.repeat(80);
        const lines: string[] = [];
        lines.push('// ╔══════════════════════════════════════════════════════════╗');
        lines.push('// ║           EARNINGHUB — SOURCE CODE ARCHIVE              ║');
        lines.push(`// ║  Generated: ${new Date().toLocaleString('en-IN')}                    ║`);
        lines.push(`// ║  Files: ${result.totalFiles} | Size: ${Math.round(result.totalBytes / 1024)} KB                          ║`);
        lines.push('// ╚══════════════════════════════════════════════════════════╝');
        lines.push('');

        for (const file of result.files) {
          lines.push(separator);
          lines.push(`// FILE: ${file.path}`);
          lines.push(separator);
          lines.push(file.content);
          lines.push('');
        }

        const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earninghub-source-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`✅ Source archive downloaded — ${result.totalFiles} files!`);
      } else {
        toast.error('Source files not accessible. Try the AI Rebuild Prompt instead.');
      }
    } catch {
      toast.error('Failed to bundle source files.');
      setSourceResult({ success: false, message: 'Request failed.', totalFiles: 0, totalBytes: 0 });
    } finally {
      setLoadingSource(false);
    }
  }

  const STATS = [
    { icon: <FileCode2 size={16} />, label: 'Source Files', value: '80+', color: 'text-primary' },
    { icon: <Layers size={16} />, label: 'Components', value: '45+', color: 'text-violet-400' },
    { icon: <Database size={16} />, label: 'DB Tables', value: '8', color: 'text-emerald-400' },
    { icon: <Cpu size={16} />, label: 'API Endpoints', value: '42', color: 'text-amber-400' },
    { icon: <Globe size={16} />, label: 'Frontend Pages', value: '5', color: 'text-cyan-400' },
    { icon: <Code2 size={16} />, label: 'Lines of Code', value: '15K+', color: 'text-rose-400' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-violet-500/5 border border-primary/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
            ⬇️
          </div>
          <div className="flex-1">
            <h2 className="font-syne font-black text-xl text-foreground">Downloads Hub</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Export this app's source code or generate an AI rebuild prompt — recreate EarningHub anywhere with any AI agent.
            </p>
          </div>
        </div>

        {/* Project stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5">
          {STATS.map(s => (
            <div key={s.label} className="bg-background/60 border border-border rounded-xl p-3 text-center">
              <div className={`flex justify-center mb-1.5 ${s.color} opacity-70`}>{s.icon}</div>
              <p className={`font-syne font-black text-base ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={15} className="text-primary" />
          <h3 className="font-syne font-black text-foreground text-sm">How These Downloads Work</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: '📁', title: 'Source Code Archive', color: 'bg-blue-500/10 border-blue-500/20',
              points: [
                'Bundles all TypeScript/TSX source files into one .txt archive',
                'Includes every component, endpoint, page, type, and hook',
                'Readable format with clear file path separators',
                'Use to host on GitHub, deploy elsewhere, or inspect code',
              ],
            },
            {
              icon: '🤖', title: 'AI Rebuild Prompt', color: 'bg-violet-500/10 border-violet-500/20',
              points: [
                'Complete .md specification of the entire app',
                'Database schema, API endpoints, feature list, calculations',
                'Design system, auth flow, special features explained',
                'Paste into Claude, GPT-4, Gemini, or any AI to rebuild',
              ],
            },
          ].map(item => (
            <div key={item.title} className={`rounded-xl border ${item.color} p-4 space-y-2`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{item.icon}</span>
                <p className="font-syne font-black text-sm text-foreground">{item.title}</p>
              </div>
              {item.points.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                  {p}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DownloadCard
          icon={<FileCode2 size={20} className="text-white" />}
          title="Source Code Archive"
          description="Download all TypeScript and TSX source files bundled into a single text archive. Includes every component, API endpoint, type definition, and hook."
          badge="Complete Codebase"
          badgeColor="text-blue-400 border-blue-500/30 bg-blue-500/10"
          items={[
            '80+ source files (components, pages, endpoints)',
            'All admin panel pages and public frontend',
            '42 API endpoints with Zod schemas',
            'Types, hooks, contexts, utilities',
            'Ready to inspect or migrate to another platform',
          ]}
          buttonLabel="Download Source Code (.txt)"
          buttonIcon={<Download size={16} />}
          gradient="from-blue-600 to-cyan-500"
          onClick={downloadSourceCode}
          loading={loadingSource}
        />

        <DownloadCard
          icon={<Bot size={20} className="text-white" />}
          title="AI Rebuild Prompt"
          description="Download a comprehensive Markdown prompt that describes every feature, database schema, calculation, and design decision — sufficient to rebuild this exact app from scratch."
          badge="AI-Ready Prompt"
          badgeColor="text-violet-400 border-violet-500/30 bg-violet-500/10"
          items={[
            'Complete database schema (8 tables, all fields)',
            'All 42 API endpoints with descriptions',
            'Key financial formulas and calculations',
            'Admin panel (15 pages) + public frontend explained',
            'Design system, auth flow, special features',
            'Step-by-step build instructions for AI agents',
          ]}
          buttonLabel="Download Rebuild Prompt (.md)"
          buttonIcon={<Bot size={16} />}
          gradient="from-violet-600 to-purple-500"
          onClick={downloadPrompt}
        />
      </div>

      {/* Source code result */}
      {sourceResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-5 flex items-start gap-4 ${
            sourceResult.success
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
          }`}
        >
          {sourceResult.success
            ? <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1">
            <p className={`font-syne font-black text-sm ${sourceResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>
              {sourceResult.success ? '✅ Source Code Downloaded!' : '⚠️ Source Files Not Accessible'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{sourceResult.message}</p>
            {!sourceResult.success && (
              <div className="mt-3 p-3 bg-background border border-border rounded-xl">
                <p className="text-xs font-black text-foreground mb-1">💡 Alternative: Use the AI Rebuild Prompt</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The AI Rebuild Prompt contains everything needed to recreate this app — database schema, all 42 API endpoints, component structure, calculations, and step-by-step instructions. Download it and paste into Claude, GPT-4, or Gemini.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Usage guide */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <FileText size={15} className="text-primary" />
          <span className="font-syne font-black text-foreground text-sm">How to Use the AI Prompt</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '01', icon: '⬇️', title: 'Download the Prompt',
                desc: 'Click "Download Rebuild Prompt" to get the .md file with complete app specification.',
                color: 'border-primary/20 bg-primary/5',
              },
              {
                step: '02', icon: '🤖', title: 'Open an AI Agent',
                desc: 'Open Claude, ChatGPT, Gemini, or any AI coding tool (Cursor, v0, Bolt, Replit, Zite, etc.).',
                color: 'border-violet-500/20 bg-violet-500/5',
              },
              {
                step: '03', icon: '✨', title: 'Paste & Build',
                desc: 'Paste the entire prompt content. The AI will understand the full spec and build the same app.',
                color: 'border-emerald-500/20 bg-emerald-500/5',
              },
            ].map(item => (
              <div key={item.step} className={`rounded-xl border ${item.color} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-muted-foreground/50 font-mono">STEP {item.step}</span>
                </div>
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-syne font-black text-sm text-foreground mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <Sparkles size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-primary mb-1">💡 Pro Tip</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The AI prompt includes all key financial calculations (Admin Net Loss, User Net Loss, Revenue Intelligence) with exact formulas.
                It also covers every special feature like the Command Palette, Payout Config Modal, CTA Override system, and WiFi Warning popup.
                Any good AI agent with access to a database integration can rebuild this app completely from the prompt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
