import { Sheet, SheetContent } from '@project/components/ui/sheet';
import { Sun, Moon, LogOut, Command } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'analytics', label: 'Analytics', icon: '📈' },
      { id: 'missing', label: 'Missing Analysis', icon: '🔴' },
      { id: 'reports', label: 'Reports', icon: '📋' },
      { id: 'offer-report', label: 'Offer Report', icon: '📊' },
    ],
  },
  {
    label: 'Offer Management',
    items: [
      { id: 'offers', label: 'Manage Offers', icon: '🎯' },
      { id: 'add-offer', label: 'Add Offer', icon: '➕' },
    ],
  },
  {
    label: 'Leads & Cashback',
    items: [
      { id: 'leads', label: 'Lead Collection', icon: '👥' },
      { id: 'referrals', label: 'Referral Network', icon: '🤝' },
      { id: 'referral-links', label: 'Generated Links', icon: '🔗' },
      { id: 'cashback-forms', label: 'Cashback Forms', icon: '📝' },
      { id: 'cashback-submissions', label: 'Form Submissions', icon: '📨' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'link-tester', label: 'Link Health Tester', icon: '🔗' },
      { id: 'backup', label: 'Backup & Restore', icon: '🛡️' },
      { id: 'trash', label: 'Trash / Recycle Bin', icon: '🗑️' },
      { id: 'downloads', label: 'Downloads Hub', icon: '⬇️' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { id: 'posters', label: 'News Posters', icon: '📢' },
      { id: 'search-config', label: 'Search Config', icon: '🔎' },
      { id: 'ui-builder', label: 'God-Mode UI Builder', icon: '🎮' },
      { id: 'settings', label: 'Settings & Brand', icon: '⚙️' },
    ],
  },
];

interface InnerProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onOpenCommand?: () => void;
}

function SidebarInner({ activePage, onNavigate, onLogout, onOpenCommand }: InnerProps) {
  const { theme, toggleTheme, settings } = useAppContext();
  const siteName = settings?.siteName || 'EarningHub';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 shadow-lg bg-gradient-to-br from-primary to-blue-400">
            💰
          </div>
          <div className="min-w-0">
            <div className="font-syne font-black text-sm text-foreground leading-tight">{siteName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-bold">Live · Admin</span>
            </div>
          </div>
        </div>

        {/* Command palette trigger */}
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all text-xs"
        >
          <Command size={12} className="flex-shrink-0" />
          <span className="flex-1 text-left">Quick search...</span>
          <kbd className="hidden sm:flex items-center px-1 py-0.5 bg-background border border-border rounded text-[9px] font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="flex items-center gap-2 px-2 mb-1.5">
              <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">{group.label}</div>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-2.5 relative group ${
                      isActive
                        ? 'bg-primary/12 text-primary font-black border border-primary/20 shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/15 hover:text-foreground hover:translate-x-0.5 border border-transparent font-semibold'
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />}
                    <span className="text-sm flex-shrink-0 leading-none">{item.icon}</span>
                    <span className="leading-tight truncate text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
        {/* Admin profile */}
        <div className="px-3 py-2.5 bg-gradient-to-r from-primary/8 to-blue-400/5 rounded-xl border border-primary/15 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 bg-gradient-to-br from-primary to-blue-400 shadow-md">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-foreground leading-none">Administrator</p>
            <p className="text-[10px] text-primary mt-0.5 truncate">{siteName} Admin</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 shadow-sm shadow-green-400/50" />
        </div>

        {/* Theme + Logout */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleTheme}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all text-xs font-semibold">
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span className="text-[11px]">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button onClick={onLogout}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-destructive bg-destructive/8 border border-destructive/20 hover:bg-destructive/15 transition-all">
            <LogOut size={13} />
            <span className="text-[11px]">Logout</span>
          </button>
        </div>

        {/* Shortcut hint */}
        <div className="px-2 py-1.5 text-center">
          <p className="text-[10px] text-muted-foreground/50">Press <kbd className="px-1 py-0.5 bg-background border border-border rounded font-mono text-[9px]">⌘K</kbd> to open command palette</p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onOpenCommand?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ activePage, onNavigate, onLogout, onOpenCommand, mobileOpen = false, onMobileClose }: Props) {
  function handleNav(page: string) { onNavigate(page); onMobileClose?.(); }
  function handleLogout() { onLogout(); onMobileClose?.(); }

  return (
    <>
      <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-border flex-col sticky top-0 h-screen bg-background">
        <SidebarInner activePage={activePage} onNavigate={onNavigate} onLogout={onLogout} onOpenCommand={onOpenCommand} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={open => !open && onMobileClose?.()}>
        <SheetContent side="left" className="p-0 w-56 border-r border-border bg-background">
          <SidebarInner activePage={activePage} onNavigate={handleNav} onLogout={handleLogout} onOpenCommand={() => { onMobileClose?.(); onOpenCommand?.(); }} />
        </SheetContent>
      </Sheet>
    </>
  );
}
