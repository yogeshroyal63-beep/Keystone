import { Link, NavLink } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { label: 'Projects', to: '/dashboard' },
  { label: 'Settings', to: '/settings' },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="premium-shell text-ink">
      <header className="sticky top-0 z-20 border-b border-hair bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5 sm:gap-8">
            <Link to="/dashboard" className="flex items-center gap-2.5 text-lg font-medium text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blueprint to-blueprintDeep text-[11px] font-bold text-[var(--on-accent)]">
                K
              </span>
              <span className="font-serif text-[1.6rem] leading-none text-ink">Keystone</span>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map(({ label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `nav-pill text-[13px] font-medium transition ${isActive ? 'active' : 'text-muted hover:text-ink'}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden items-center gap-2 rounded-full border border-hair bg-chip px-2.5 py-1.5 sm:flex">
              <Sparkles size={14} className="text-[var(--accent-mint)]" />
              <span className="text-[12px] text-muted">{user?.name}</span>
            </div>

            <button type="button" onClick={logout} aria-label="Log out" className="ghost-button">
              <LogOut size={15} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
