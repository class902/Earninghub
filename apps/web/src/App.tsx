import { routerBasename } from '@/lib/appUrl';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import { AppProvider } from '@/contexts/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import './styles/brand.css';

/* ── Skeleton shown while lazy chunks load ─────────────────────────── */
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 bg-card/80 border-b border-border animate-pulse" />
      <div className="pt-20 pb-8 px-5 text-center space-y-4">
        <div className="h-5 w-40 mx-auto rounded-full skeleton-shimmer" />
        <div className="h-10 w-72 mx-auto rounded skeleton-shimmer" />
        <div className="h-4 w-60 mx-auto rounded skeleton-shimmer" />
      </div>
      <div className="px-5 pt-6 space-y-4">
        <div className="h-6 w-48 rounded skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Lazy-loaded pages ─────────────────────────────────────────────── */
const HomePage = lazy(() => import('./pages/HomePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const TrackLeadPage = lazy(() => import('./pages/TrackLeadPage'));
const OfferSlugPage = lazy(() => import('./pages/OfferSlugPage'));
const OfferTrackPage = lazy(() => import('./pages/OfferTrackPage'));
const PrivateCampaignPage = lazy(() => import('./pages/PrivateCampaignPage'));
const FormSlugPage = lazy(() => import('./pages/FormSlugPage'));
const FormsListPage = lazy(() => import('./pages/FormsListPage'));
const ReferralLinkPage = lazy(() => import('./pages/ReferralLinkPage'));
const ReferralTrackerPage = lazy(() => import('./pages/ReferralTrackerPage'));
const ReferHubPage = lazy(() => import('./pages/ReferHubPage'));
const ReferralGeneratorPage = lazy(() => import('./pages/ReferralGeneratorPage'));
const DynamicRefRouter = lazy(() => import('./pages/DynamicRefRouter'));

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="The app encountered an error">
      <AppProvider>
        <BrowserRouter basename={routerBasename}>
          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              className: 'font-sans',
              duration: 3500,
            }}
          />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Core pages */}
              <Route path="/" element={<ErrorBoundary fallbackTitle="Failed to load homepage"><HomePage /></ErrorBoundary>} />
              <Route path="/admin-boss" element={<ErrorBoundary fallbackTitle="Failed to load admin panel"><AdminPage /></ErrorBoundary>} />

              {/* Lead tracker */}
              <Route path="/user-lead-track" element={<ErrorBoundary compact><TrackLeadPage /></ErrorBoundary>} />
              <Route path="/track-lead" element={<Navigate to="/user-lead-track" replace />} />

              {/* Offers */}
              <Route path="/offers" element={<ErrorBoundary compact><HomePage /></ErrorBoundary>} />
              <Route path="/offer/:slug" element={<ErrorBoundary compact><OfferSlugPage /></ErrorBoundary>} />

              {/* Cashback Forms */}
              <Route path="/forms" element={<ErrorBoundary compact><FormsListPage /></ErrorBoundary>} />
              <Route path="/cashback-forms" element={<Navigate to="/forms" replace />} />
              <Route path="/form/:slug" element={<ErrorBoundary compact><FormSlugPage /></ErrorBoundary>} />

              {/* Private campaign */}
              <Route path="/exclusive/:slug" element={<ErrorBoundary compact><PrivateCampaignPage /></ErrorBoundary>} />

              {/* Referral System */}
              <Route path="/refer" element={<ErrorBoundary compact><ReferHubPage /></ErrorBoundary>} />
              <Route path="/refer-generate/:slug" element={<ErrorBoundary compact><ReferralGeneratorPage /></ErrorBoundary>} />
              <Route path="/refer/:code" element={<ErrorBoundary compact><ReferralLinkPage /></ErrorBoundary>} />
              <Route path="/offereftrck/:code" element={<ErrorBoundary compact><ReferralTrackerPage /></ErrorBoundary>} />
              <Route path="/:segment1/:segment2" element={<ErrorBoundary compact><DynamicRefRouter /></ErrorBoundary>} />

              {/* Catch-all offer slug (must be LAST) */}
              <Route path="/:slug" element={<ErrorBoundary compact><OfferSlugPage /></ErrorBoundary>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
