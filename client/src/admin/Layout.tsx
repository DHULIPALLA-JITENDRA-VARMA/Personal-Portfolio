import { Award, BarChart3, Briefcase, ExternalLink, FileText, FolderKanban, GraduationCap, Inbox, LogOut, Sparkles, Trophy, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { adminMessages } from '../api';
import { cn } from '../lib/design';
import { useAuth } from './auth';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/admin/profile', label: 'Profile', icon: User },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/skills', label: 'Skills', icon: Sparkles },
  { to: '/admin/experience', label: 'Experience', icon: Briefcase },
  { to: '/admin/education', label: 'Education', icon: GraduationCap },
  { to: '/admin/certifications', label: 'Certifications', icon: Award },
  { to: '/admin/achievements', label: 'Achievements', icon: Trophy },
  { to: '/admin/resume', label: 'Resume', icon: FileText },
];

export const UNREAD_CHANGED = 'portfolio:unread-changed';

export default function Layout() {
  const { state, logout } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    adminMessages.unreadCount().then((r) => setUnread(r.unread)).catch(() => undefined);
  }, []);
  useEffect(() => {
    refreshUnread();
    window.addEventListener(UNREAD_CHANGED, refreshUnread);
    return () => window.removeEventListener(UNREAD_CHANGED, refreshUnread);
  }, [refreshUnread, pathname]);

  useEffect(() => {
    document.title = 'Admin · Portfolio';
  }, []);

  return (
    <div className="min-h-screen bg-black lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-white/[0.06] bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-7">
          <p className="text-lg text-cream">
            Portfolio <span className="font-serif italic text-primary">admin</span>
          </p>
          <p className="text-xs text-gray-500 lg:mt-1">{state.status === 'authenticated' && `Signed in as ${state.username}`}</p>
        </div>

        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:flex-1 lg:overflow-y-auto lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors duration-200',
                      isActive ? 'bg-white/10 text-cream' : 'text-gray-400 hover:bg-white/5 hover:text-cream',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                  {label === 'Messages' && unread > 0 && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold tabular-nums text-black" aria-label={`${unread} unread`}>
                      {unread}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden gap-1 border-t border-white/[0.06] p-3 lg:flex lg:flex-col">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 transition-colors duration-200 hover:bg-white/5 hover:text-cream">
            <ExternalLink className="h-4 w-4" aria-hidden /> View site
          </a>
          <button type="button" onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-400 transition-colors duration-200 hover:bg-white/5 hover:text-cream">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex items-center justify-end gap-2 px-4 pt-4 lg:hidden">
          <a href="/" target="_blank" rel="noreferrer" className="btn-ghost">
            <ExternalLink className="h-4 w-4" aria-hidden /> View site
          </a>
          <button type="button" onClick={logout} className="btn-ghost">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
        <main className="mx-auto max-w-6xl p-4 py-8 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
