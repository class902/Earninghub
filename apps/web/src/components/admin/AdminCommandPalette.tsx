import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

const NAV_CMDS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'Navigate', desc: 'Platform overview and stats' },
  { id: 'analytics', label: 'Analytics', icon: '📈', group: 'Navigate', desc: 'Charts and trends' },
  { id: 'reports', label: 'Reports', icon: '📋', group: 'Navigate', desc: 'Filter and export leads' },
  { id: 'leads', label: 'Lead Collection', icon: '👥', group: 'Navigate', desc: 'All lead submissions' },
  { id: 'offers', label: 'Manage Offers', icon: '🎯', group: 'Navigate', desc: 'Create and manage offers' },
  { id: 'add-offer', label: 'Add New Offer', icon: '➕', group: 'Navigate', desc: 'Configure a new offer' },
  { id: 'referrals', label: 'Referral Network', icon: '🤝', group: 'Navigate', desc: 'Track referrals and bonuses' },
  { id: 'referral-links', label: 'Generated Links Dashboard', icon: '🔗', group: 'Navigate', desc: 'View, edit, revoke and export referral links' },
  { id: 'cashback-forms', label: 'Cashback Forms', icon: '📝', group: 'Navigate', desc: 'Standalone proof forms' },
  { id: 'cashback-submissions', label: 'Form Submissions', icon: '📨', group: 'Navigate', desc: 'View all submissions' },
  { id: 'posters', label: 'News Posters', icon: '📢', group: 'Navigate', desc: 'Manage homepage banners' },
  { id: 'backup', label: 'Backup & Restore', icon: '🛡️', group: 'Navigate', desc: 'Cloud backups and restore' },
  { id: 'link-tester', label: 'Link Health Tester', icon: '🔗', group: 'Navigate', desc: 'Check offer URL health' },
  { id: 'settings', label: 'Settings', icon: '⚙️', group: 'Navigate', desc: 'Site branding and config' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export default function AdminCommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return NAV_CMDS;
    const q = query.toLowerCase();
    return NAV_CMDS.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => { setActiveIdx(0); }, [query]);
  useEffect(() => { if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  function handleSelect(id: string) { onNavigate(id); onClose(); setQuery(''); }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIdx]) { handleSelect(filtered[activeIdx].id); }
    if (e.key === 'Escape') { onClose(); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -12 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent text-foreground text-sm focus:outline-none font-satoshi placeholder:text-muted-foreground/60"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-muted-foreground font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No results for "{query}"</div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.id)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    i === activeIdx ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/20 border border-transparent'
                  }`}
                >
                  <span className="text-base flex-shrink-0 w-6 text-center">{cmd.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-semibold leading-none ${i === activeIdx ? 'text-primary' : 'text-foreground'}`}>{cmd.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{cmd.desc}</div>
                  </div>
                  {i === activeIdx && <span className="text-[10px] text-primary flex-shrink-0">↵</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-background border border-border rounded font-mono text-[9px]">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-background border border-border rounded font-mono text-[9px]">↵</kbd> Open</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded font-mono text-[9px]">⌘K</kbd>
            <span>Command Palette</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
