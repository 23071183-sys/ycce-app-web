'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getToken, getUser, clearToken } from '@/lib/auth';
import {
  LayoutDashboard, Users, Megaphone, BarChart2,
  Clock, GraduationCap, LogOut, Menu, ClipboardList, Sun, Moon, FileText, MessageCircle, PenSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import ChatWidget from '@/components/ChatWidget';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, subtitle: 'Stats & summary' },
  { href: '/dashboard/users', label: 'Users', icon: Users, subtitle: 'Manage students' },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone, subtitle: 'Post & manage notices' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: ClipboardList, subtitle: 'Mark & view attendance' },
  { href: '/dashboard/results', label: 'Results', icon: BarChart2, subtitle: 'SGPA / CGPA records' },
  { href: '/dashboard/marks', label: 'Marks Entry', icon: PenSquare, subtitle: 'MSE / TA / ESE per subject' },
  { href: '/dashboard/assignments', label: 'Assignments', icon: FileText, subtitle: 'Manage assignments' },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock, subtitle: 'Class schedule' },
  { href: '/dashboard/faculty', label: 'Faculty', icon: GraduationCap, subtitle: 'Staff directory' },
  { href: '/dashboard/chat', label: 'AI Assistant', icon: MessageCircle, subtitle: 'Ask anything about the system' },
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { theme, setTheme } = useTheme();
  // The active theme is only known in the browser, so the server markup cannot
  // reflect it. Render the toggle's theme-dependent parts after mounting, or
  // the first client render disagrees with the server and hydration fails.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    setUser(getUser());
    // Fetch pending approval count
    api.get('/admin/stats')
      .then(r => setPendingCount(r.data?.pending ?? 0))
      // The badge is optional, but a failure here usually means the API is
      // unreachable, which the console should show rather than hide.
      .catch(err => console.warn('Could not load pending approvals count:', err?.message));
  }, []);

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {open && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-30 flex flex-col
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="border border-foreground rounded px-2.5 py-1">
              <span className="text-foreground text-xs font-bold tracking-widest">YCCE</span>
            </div>
            <div className="border border-foreground rounded px-2.5 py-1">
              <span className="text-foreground text-xs font-bold tracking-widest">CT</span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs tracking-widest uppercase mt-3">Admin Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, subtitle }) => {
            // Overview is the parent of every page, so it only matches exactly;
            // other items stay highlighted on their own sub-pages too.
            const active = pathname === href ||
              (href !== '/dashboard' && pathname.startsWith(href + '/'));
            const isUsers = href === '/dashboard/users';
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                title={subtitle}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="tracking-wide flex-1">{label}</span>
                {isUsers && pendingCount > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${
                    active ? 'bg-red-500 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-zinc-200">{getInitials(user.name)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-xs font-medium truncate">{user.name}</p>
                <p className="text-muted-foreground text-xs truncate capitalize">{user.role === 'super_admin' ? 'Admin' : user.role}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={logout}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <LogOut size={15} />
              <span className="tracking-wide">Sign Out</span>
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
              suppressHydrationWarning
            >
              {mounted ? (theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />) : <Sun size={15} className="invisible" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setOpen(true)}>
            <Menu size={20} className="text-foreground" />
          </button>
          <span className="text-foreground text-sm tracking-widest uppercase">Admin</span>
          <div />
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      {/* The chat page is the assistant itself; a floating copy would duplicate it. */}
      {pathname !== '/dashboard/chat' && <ChatWidget />}
    </div>
  );
}
