'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getToken, getUser, clearToken, updateStoredUser, useCurrentUser, USER_UPDATED_EVENT, FEST_ADMIN_HOME, festAdminAllowed } from '@/lib/auth';
import {
  LayoutDashboard, Users, Megaphone, BarChart2,
  Clock, GraduationCap, LogOut, Menu, ClipboardList, FileText, MessageCircle, PenSquare, Settings, MessagesSquare, IndianRupee, Briefcase, Ticket, BookOpen
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import ChatWidget from '@/components/ChatWidget';
import { MESSAGES_READ_EVENT } from './messages/_components/types';

const UNREAD_POLL_MS = 30000;

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, subtitle: 'Stats & summary' },
  { href: '/dashboard/users', label: 'Users', icon: Users, subtitle: 'Manage students' },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone, subtitle: 'Post & manage notices' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: ClipboardList, subtitle: 'Mark & view attendance' },
  { href: '/dashboard/results', label: 'Results', icon: BarChart2, subtitle: 'SGPA / CGPA records' },
  { href: '/dashboard/marks', label: 'Marks Entry', icon: PenSquare, subtitle: 'MSE / TA / ESE per subject' },
  { href: '/dashboard/assignments', label: 'Assignments', icon: FileText, subtitle: 'Manage assignments' },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Clock, subtitle: 'Class schedule' },
  { href: '/dashboard/study', label: 'Study', icon: BookOpen, subtitle: 'Past papers & exam schedule', roles: ['admin', 'super_admin', 'professor'] },
  { href: '/dashboard/placements', label: 'Placements', icon: Briefcase, subtitle: 'Campus drives & outcomes' },
  { href: '/dashboard/events', label: 'Events', icon: Ticket, subtitle: 'Fest registrations & check-in', roles: ['fest_admin', 'admin', 'super_admin'] },
  { href: '/dashboard/fees', label: 'Fees', icon: IndianRupee, subtitle: 'Fee structures & collection', roles: ['admin', 'super_admin'] },
  { href: '/dashboard/faculty', label: 'Faculty', icon: GraduationCap, subtitle: 'Staff directory' },
  { href: '/dashboard/messages', label: 'Messages', icon: MessagesSquare, subtitle: 'Direct messages with students' },
  { href: '/dashboard/chat', label: 'AI Assistant', icon: MessageCircle, subtitle: 'Ask anything about the system' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, subtitle: 'Profile, notifications & theme' },
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
  const [unreadCount, setUnreadCount] = useState(0);
  // Role-gated links wait for the browser session, so server and first client
  // render agree.
  const { role } = useCurrentUser();

  // Fest admins are kept to their pages.
  const isFestAdmin = role === 'fest_admin';
  useEffect(() => {
    if (isFestAdmin && !festAdminAllowed(pathname)) router.replace(FEST_ADMIN_HOME);
  }, [isFestAdmin, pathname, router]);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const stored = getUser();
    setUser(stored);
    if (stored?.role === 'fest_admin') return; // no approvals badge or DMs for fest admins
    // Fetch pending approval count
    api.get('/admin/stats')
      .then(r => setPendingCount(r.data?.pending ?? 0))
      // The badge is optional, but a failure here usually means the API is
      // unreachable, which the console should show rather than hide.
      .catch(err => console.warn('Could not load pending approvals count:', err?.message));
    // The session stored at sign-in has no photo; fetch the live profile so the
    // avatar (and any renamed name) shows.
    api.get('/users/me')
      .then(r => updateStoredUser({ name: r.data?.name, avatar_url: r.data?.avatar_url ?? null }))
      .catch(err => console.warn('Could not load profile:', err?.message));
  }, []);

  // Unread direct messages: polled while the tab is visible, and refreshed at
  // once when the messages page marks a thread read.
  useEffect(() => {
    if (!getToken() || getUser()?.role === 'fest_admin') return;
    const fetchUnread = () => {
      if (document.visibilityState !== 'visible') return;
      api.get('/messages/unread-count')
        .then(r => setUnreadCount(Number(r.data?.total) || 0))
        .catch(err => console.warn('Could not load unread messages count:', err?.message));
    };
    fetchUnread();
    const t = setInterval(fetchUnread, UNREAD_POLL_MS);
    window.addEventListener(MESSAGES_READ_EVENT, fetchUnread);
    document.addEventListener('visibilitychange', fetchUnread);
    return () => {
      clearInterval(t);
      window.removeEventListener(MESSAGES_READ_EVENT, fetchUnread);
      document.removeEventListener('visibilitychange', fetchUnread);
    };
  }, []);

  // Settings edits the stored user; follow it here without a reload.
  useEffect(() => {
    const onUpdate = (e: Event) => setUser((e as CustomEvent).detail);
    window.addEventListener(USER_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(USER_UPDATED_EVENT, onUpdate);
  }, []);

  const logout = () => {
    clearToken();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {open && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px] z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-card border-r border-border z-30 flex flex-col
        transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-foreground px-2 py-0.5 text-xs font-semibold tracking-widest text-foreground">YCCE</span>
            <span className="rounded-md border border-foreground px-2 py-0.5 text-xs font-semibold tracking-widest text-foreground">CT</span>
          </div>
          <p className="label mt-3">Admin Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.filter(item => isFestAdmin
            ? festAdminAllowed(item.href)
            : !('roles' in item && item.roles) || item.roles.includes(role)).map(({ href, label, icon: Icon, subtitle }) => {
            // Overview is the parent of every page, so it only matches exactly;
            // other items stay highlighted on their own sub-pages too.
            const active = pathname === href ||
              (href !== '/dashboard' && pathname.startsWith(href + '/'));
            const isUsers = href === '/dashboard/users';
            const isMessages = href === '/dashboard/messages';
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                title={subtitle}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary-soft text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{label}</span>
                {isUsers && pendingCount > 0 && (
                  <span className="min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-primary-foreground tabular-nums">
                    {pendingCount}
                  </span>
                )}
                {isMessages && unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} unread`}
                    className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-primary-foreground tabular-nums"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          {user && (
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              title="Profile & settings"
              className="-mx-2 mb-3 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <Avatar>
                {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                <AvatarFallback className="text-xs font-medium text-foreground">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-foreground text-xs font-medium truncate">{user.name}</p>
                <p className="text-muted-foreground text-xs truncate capitalize">{user.role === 'super_admin' ? 'Admin' : user.role}</p>
              </div>
            </Link>
          )}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={logout} className="-ml-2 text-muted-foreground">
              <LogOut />
              Sign Out
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <span className="label text-foreground">Admin</span>
          <div className="size-8" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {isFestAdmin && !festAdminAllowed(pathname) ? null : children}
        </main>
      </div>
      {/* The chat page is the assistant itself; a floating copy would duplicate it. */}
      {pathname !== '/dashboard/chat' && !isFestAdmin && <ChatWidget />}
    </div>
  );
}
