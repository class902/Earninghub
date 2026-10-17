import { appPath } from '@/lib/appUrl';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCashbackForms } from '@/lib/api';
import { Home, ExternalLink } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface FormItem {
  id: string; title: string; description: string;
  logoUrl: string; bannerUrl: string; slug: string;
}

export default function FormsListPage() {
  const navigate = useNavigate();
  const { settings } = useAppContext();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);

  const siteName = settings?.siteName || 'EarningHub';
  const logoUrl = settings?.webLogoUrl || '';

  useEffect(() => {
    getCashbackForms({}).then(r => {
      setForms(r.forms.filter(f => f.isPublic).map(f => ({
        id: f.id, title: f.title, description: f.description,
        logoUrl: f.logoUrl, bannerUrl: f.bannerUrl, slug: f.slug,
      })));
    }).catch(() => setForms([])).finally(() => setLoading(false));
  }, []);

  function openForm(slug: string) {
    if (!slug) return;
    window.open(appPath(`/form/${slug}`), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          {logoUrl ? <img src={logoUrl} alt={siteName} className="h-8 w-auto" /> :
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-sm">💰</div>}
          <span className="font-syne font-black text-foreground text-sm hidden sm:block">{siteName}</span>
        </button>
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all text-sm font-semibold">
          <Home size={14} /> Home
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-5 py-2 rounded-full mb-4">
            💰 Claim Your Cashback
          </span>
          <h1 className="font-syne font-black text-3xl md:text-4xl text-foreground mb-3">
            Cashback Proof <span className="gradient-text-gold">Forms</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Completed an offer? Submit your proof here to receive cashback directly to your UPI.
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-card border border-border animate-pulse" />)}
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-2xl">
            <div className="text-5xl mb-4">📋</div>
            <p className="font-syne font-black text-xl text-foreground mb-2">No Active Forms</p>
            <p className="text-muted-foreground text-sm mb-6">Check back soon for cashback submission forms.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl font-syne font-black text-sm text-black"
              style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>← Back to Offers</button>
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form, i) => (
              <motion.div key={form.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-gold/30 hover:shadow-lg transition-all group">
                {form.bannerUrl && (
                  <div className="h-16 overflow-hidden">
                    <img src={form.bannerUrl} alt={form.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {form.logoUrl ? <img src={form.logoUrl} alt={form.title} className="w-full h-full object-cover" /> : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-syne font-black text-foreground">{form.title}</p>
                    {form.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.description}</p>}
                  </div>
                  <motion.button onClick={() => openForm(form.slug)} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-syne font-black text-sm text-black flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>
                    Submit Proof <ExternalLink size={13} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
