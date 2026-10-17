import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ChevronRight, Command, LogOut, AlertTriangle } from 'lucide-react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminCommandPalette from '@/components/admin/AdminCommandPalette';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ManageOffers from '@/components/admin/ManageOffers';
import AddEditOffer from '@/components/admin/AddEditOffer';
import LeadsTable from '@/components/admin/LeadsTable';
import PosterManager from '@/components/admin/PosterManager';
import AnalyticsPage from '@/components/admin/AnalyticsPage';
import ReportsPage from '@/components/admin/ReportsPage';
import SettingsPage from '@/components/admin/SettingsPage';
import AdminCashbackForms from '@/components/admin/AdminCashbackForms';
import AdminCashbackSubmissions from '@/components/admin/AdminCashbackSubmissions';
import AdminReferrals from '@/components/admin/AdminReferrals';
import AdminReferralLinks from '@/components/admin/AdminReferralLinks';
import LinkTester from '@/components/admin/LinkTester';
import AdminBackup from '@/components/admin/AdminBackup';
import MissingAnalysis from '@/components/admin/MissingAnalysis';
import AdminTrash from '@/components/admin/AdminTrash';
import AdminUIBuilder from '@/components/admin/AdminUIBuilder';
import OfferReportPage from '@/components/admin/OfferReportPage';
import SearchConfig from '@/components/admin/SearchConfig';
import { adminVerifySession } from '@/lib/api';
import type { Offer } from '@/types';

const PAGE_META: Record<string, { title: string; desc: string; emoji: string; group: string }> = {
  dashboard: { title: 'Dashboard', desc: 'Platform overview, stats, and quick actions', emoji: '📊', group: 'Overview' },
  analytics: { title: 'Analytics', desc: 'Charts, trends, and performance insights', emoji: '📈', group: 'Overview' },
  reports: { title: 'Reports', desc: 'Filter, search, and export lead reports', emoji: '📋', group: 'Overview' },
  'offer-report': { title: 'Offer Report', desc: 'Per-offer analytics — leads, revenue, missing, status breakdown', emoji: '📊', group: 'Overview' },
  offers: { title: 'Manage Offers', desc: 'Create and manage cashback offers with quick toggle', emoji: '🎯', group: 'Offers' },
  'add-offer': { title: 'Add Offer', desc: 'Configure offer details and redirect links', emoji: '➕', group: 'Offers' },
  'link-tester': { title: 'Link Health Tester', desc: 'Ping all active offer URLs and detect broken links', emoji: '🔗', group: 'Tools' },
  backup: { title: 'Backup & Restore', desc: 'Cloud backups, local download, and one-click restore', emoji: '🛡️', group: 'Tools' },
  leads: { title: 'Lead Collection', desc: 'All offer lead submissions from users', emoji: '👥', group: 'Leads' },
  referrals: { title: 'Referral Network', desc: 'Track referral links, referred users, and bonus payments', emoji: '🤝', group: 'Leads' },
  'referral-links': { title: 'Generated Links Dashboard', desc: 'View, edit, revoke and export all generated referral links with custom data', emoji: '🔗', group: 'Leads' },
  'cashback-forms': { title: 'Cashback Forms', desc: 'Standalone proof submission forms', emoji: '📝', group: 'Leads' },
  'cashback-submissions': { title: 'Form Submissions', desc: 'View all cashback proof submissions', emoji: '📨', group: 'Leads' },
  'missing': { title: 'Missing Analysis', desc: 'Track revenue gaps — admin loss, user loss, unaccounted payouts', emoji: '🔴', group: 'Overview' },
  'trash': { title: 'Trash / Recycle Bin', desc: 'Restore or permanently delete trashed leads & offers', emoji: '🗑️', group: 'Tools' },
  posters: { title: 'News Posters', desc: 'Manage homepage banners and promotions', emoji: '📢', group: 'Config' },
  'ui-builder': { title: 'God-Mode UI Builder', desc: 'Control every CTA button — text, colors, animations, size, alignment', emoji: '🎮', group: 'Config' },
  settings: { title: 'Settings & Brand', desc: 'Brand, SEO, promotions, lead tracker, referral, integrations, security', emoji: '⚙️', group: 'Config' },
  'search-config': { title: 'Search Configuration', desc: 'Control which lead fields are searchable by users', emoji: '🔎', group: 'Config' },
};

const PAGE_TRANSITION = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
};

function ValidatingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br from-primary to-blue-400 animate-pulse">💰</div>
        <p className="text-muted-foreground text-sm font-semibold">Verifying admin session…</p>
      </div>
    </div>
  );
}

function SessionExpiredBanner({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive border-b border-destructive/40 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangle size={16} className="text-destructive-foreground flex-shrink-0" />
        <p className="text-destructive-foreground text-sm font-bold">
          Session expired or password changed. Please log out and log in again.
        </p>
      </div>
      <button onClick={onLogout}
        className="flex items-center gap-1.5 px-4 py-1.5 bg-destructive-foreground text-destructive font-black text-xs rounded-xl flex-shrink-0 hover:opacity-90 transition-all">
        <LogOut size={13} /> Logout Now
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [validating, setValidating] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [leadInitialFilter, setLeadInitialFilter] = useState('');
  const [reportCampaign, setReportCampaign] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // On mount: check for stored session and validate it
  useEffect(() => {
    const stored = sessionStorage.getItem('eh_admin_pw');
    if (!stored) return;
    setValidating(true);
    adminVerifySession({ password: stored })
      .then(({ valid }) => {
        if (valid) {
          setPassword(stored);
        } else {
          // Stale / invalid session — clear and force login
          sessionStorage.removeItem('eh_admin_pw');
        }
      })
      .catch(() => {
        // Network error during verify — do NOT trust optimistically, force login
        // This prevents stale sessions from persisting through network hiccups
        sessionStorage.removeItem('eh_admin_pw');
      })
      .finally(() => setValidating(false));
  }, []);

  function handleLogin(sessionToken: string) {
    sessionStorage.setItem('eh_admin_pw', sessionToken);
    setPassword(sessionToken);
    setSessionExpired(false);
  }

  function handleLogout() {
    sessionStorage.removeItem('eh_admin_pw');
    setPassword('');
    setSessionExpired(false);
  }

  function handleSessionExpired() {
    setSessionExpired(true);
    // Don't force logout immediately — show banner so user knows what happened
  }

  function handleNavigate(page: string) {
    if (page.startsWith('leads:')) {
      const filter = page.slice(6);
      setLeadInitialFilter(filter);
      setActivePage('leads');
    } else if (page.startsWith('offer-report:')) {
      setReportCampaign(page.slice(13));
      setActivePage('offer-report');
    } else {
      setActivePage(page);
      if (page !== 'leads') setLeadInitialFilter('');
      if (page !== 'offer-report') setReportCampaign('');
    }
    if (page !== 'add-offer' && !page.startsWith('leads:')) setEditOffer(null);
  }

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (validating) return <ValidatingScreen />;
  if (!password) return <AdminLogin onLogin={handleLogin} />;

  const isEditOffer = !!editOffer && activePage === 'add-offer';
  const meta = PAGE_META[activePage] || { title: 'Admin', desc: '', emoji: '🔧', group: '' };
  const displayTitle = isEditOffer ? 'Edit Offer' : meta.title;
  const displayEmoji = isEditOffer ? '✏️' : meta.emoji;
  const displayDesc = isEditOffer ? 'Update offer details and settings' : meta.desc;
  const displayGroup = meta.group;

  return (
    <div className="flex min-h-screen bg-background font-satoshi">
      {sessionExpired && <SessionExpiredBanner onLogout={handleLogout} />}

      <AdminSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onOpenCommand={() => setCommandOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className={`flex-1 overflow-auto min-w-0 ${sessionExpired ? 'pt-12' : ''}`}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="px-4 md:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden flex-shrink-0 p-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
            >
              <Menu size={17} />
            </button>

            <div className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-sm bg-primary/10 border border-primary/20 flex-shrink-0">
              {displayEmoji}
            </div>

            <div className="flex-1 min-w-0">
              {displayGroup && (
                <div className="hidden sm:flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{displayGroup}</span>
                  <ChevronRight size={9} className="text-muted-foreground/40" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{displayTitle}</span>
                </div>
              )}
              <h1 className="font-syne font-black text-sm md:text-base text-foreground leading-none">{displayTitle}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">{displayDesc}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setCommandOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all text-xs">
                <Command size={12} />
                <span className="hidden md:block">Search</span>
                <kbd className="hidden lg:block px-1 py-0.5 bg-background border border-border rounded font-mono text-[9px]">⌘K</kbd>
              </button>

              {sessionExpired ? (
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive text-xs font-black hover:bg-destructive/25 transition-all">
                  <LogOut size={12} /> Force Logout
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-green-500/20 bg-green-500/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-black text-green-400 hidden sm:block">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Animated page content */}
        <AnimatePresence mode="wait">
          <motion.div key={activePage + (isEditOffer ? '-edit' : '')} {...PAGE_TRANSITION}>
            {activePage === 'dashboard' && <AdminDashboard password={password} onNavigate={handleNavigate} />}
            {activePage === 'analytics' && <AnalyticsPage password={password} />}
            {activePage === 'reports' && <ReportsPage password={password} />}
            {activePage === 'offer-report' && <OfferReportPage password={password} initialCampaign={reportCampaign} />}
            {activePage === 'settings' && <SettingsPage password={password} />}
            {activePage === 'offers' && (
              <ManageOffers password={password} onEdit={offer => { setEditOffer(offer || null); setActivePage('add-offer'); }} onViewReport={name => { setReportCampaign(name); setActivePage('offer-report'); }} />
            )}
            {activePage === 'add-offer' && (
              <AddEditOffer
                password={password}
                offer={editOffer}
                onSaved={() => { setEditOffer(null); setActivePage('offers'); }}
                onSessionExpired={handleSessionExpired}
              />
            )}
            {activePage === 'leads' && <LeadsTable password={password} onSessionExpired={handleSessionExpired} initialStatusFilter={leadInitialFilter} />}
            {activePage === 'referrals' && <AdminReferrals password={password} onNavigate={handleNavigate} />}
            {activePage === 'referral-links' && <AdminReferralLinks password={password} onNavigate={handleNavigate} />}
            {activePage === 'posters' && <PosterManager password={password} />}
            {activePage === 'cashback-forms' && <AdminCashbackForms password={password} />}
            {activePage === 'cashback-submissions' && <AdminCashbackSubmissions password={password} />}
            {activePage === 'link-tester' && <LinkTester password={password} />}
            {activePage === 'backup' && <AdminBackup password={password} />}
            {activePage === 'missing' && <MissingAnalysis password={password} />}
            {activePage === 'trash' && <AdminTrash password={password} />}
            {activePage === 'ui-builder' && <AdminUIBuilder password={password} />}
            {activePage === 'search-config' && <SearchConfig password={password} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {commandOpen && (
          <AdminCommandPalette
            open={commandOpen}
            onClose={() => setCommandOpen(false)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
