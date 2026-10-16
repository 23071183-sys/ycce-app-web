'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Users, CheckCircle, Clock, Megaphone, ClipboardList,
  BarChart2, FileText, GraduationCap, ArrowRight, TrendingUp, Activity,
} from 'lucide-react';

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name?.trim().split(' ')[0] || name;
  if (hour >= 5 && hour < 12) return `Good morning, ${first}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

// The bars and ring grow in once the numbers arrive — the only motion kept on
// this page, since it shows the proportions settling rather than decorating.
function YearBar({ year, count, max, delay }: { year: number; count: number; max: number; delay: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-12 shrink-0">Year {year}</span>
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="h-1.5 rounded-full bg-foreground"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-foreground tabular-nums w-6 text-right">{count}</span>
    </div>
  );
}

const QUICK_LINKS = [
  { href: '/dashboard/users', label: 'Manage Users', icon: Users, desc: 'Approve & view students' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: ClipboardList, desc: 'Mark & view records' },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone, desc: 'Post notices' },
  { href: '/dashboard/results', label: 'Results', icon: BarChart2, desc: 'SGPA / CGPA records' },
  { href: '/dashboard/assignments', label: 'Assignments', icon: FileText, desc: 'Manage submissions' },
  { href: '/dashboard/faculty', label: 'Faculty', icon: GraduationCap, desc: 'Staff directory' },
];

// StatCard renders its value inside a <p>, so the placeholder must be inline.
const statValue = (loading: boolean, n: number) =>
  loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-muted align-middle" /> : n;

export default function OverviewPage() {
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, approved: 0, announcements: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const { user, ready } = useCurrentUser();

  // Only async state updates here, so the first load can run from an effect.
  const fetchAll = useCallback(() => {
    let failed = false;
    Promise.all([
      api.get('/admin/stats').catch(() => { failed = true; return { data: {} }; }),
      api.get('/admin/users').catch(() => { failed = true; return { data: [] }; }),
    ]).then(([statsRes, usersRes]) => {
      setStats(statsRes.data || {});
      setUsers(usersRes.data || []);
      setLoadFailed(failed);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchAll();
  };

  const students = users.filter(u => u.role === 'student' && u.status === 'approved');
  const byYear = [1, 2, 3, 4].map(y => ({ year: y, count: students.filter(s => s.year === y).length }));
  const maxByYear = Math.max(...byYear.map(b => b.count), 1);
  const pending = users.filter(u => u.status === 'pending');

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <p className="label mb-1 min-h-4">
          {/* Today's date depends on the viewer's clock, so it waits for the browser. */}
          {ready ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null}
        </p>
        <h1 className="text-3xl font-extralight text-foreground tracking-wide min-h-9">
          {user ? getGreeting(user.name) : null}
        </h1>
      </div>

      {loadFailed && !loading && (
        <ErrorBanner title="Some figures couldn't load" onRetry={load} />
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={statValue(loading, stats.total ?? 0)} icon={<Users size={14} />} hint="Registered accounts" />
        <StatCard label="Approved" value={statValue(loading, stats.approved ?? 0)} icon={<CheckCircle size={14} />} hint="Active students" tone="success" />
        <StatCard
          label="Pending"
          value={statValue(loading, stats.pending ?? 0)}
          icon={<Clock size={14} />}
          hint={stats.pending > 0 ? 'Needs your attention' : 'All clear'}
          tone={stats.pending > 0 ? 'warning' : 'neutral'}
        />
        <StatCard label="Announcements" value={statValue(loading, stats.announcements ?? 0)} icon={<Megaphone size={14} />} hint="Total posted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">Students by Year</p>
                {loading
                  ? <Skeleton className="h-6 w-24 mt-1" />
                  : <p className="text-foreground text-lg font-light mt-1 tabular-nums">{students.length} approved</p>
                }
              </div>
              <TrendingUp size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-3 pt-1">
              {loading
                ? [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-3 w-full rounded-full" />)
                : byYear.map(({ year, count }, i) => (
                    <YearBar key={year} year={year} count={count} max={maxByYear} delay={i * 0.1} />
                  ))
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="label">Pending Approvals</p>
                {loading
                  ? <Skeleton className="h-6 w-20 mt-1" />
                  : <p className="text-foreground text-lg font-light mt-1">{pending.length} waiting</p>
                }
              </div>
              <Activity size={16} className="text-muted-foreground" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <EmptyState
                className="py-6"
                icon={<CheckCircle size={28} strokeWidth={1.5} className="text-success" />}
                title="All requests handled"
              />
            ) : (
              <div className="space-y-2">
                {pending.slice(0, 4).map(u => (
                  <div key={u.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Avatar size="sm">
                      <AvatarFallback>{u.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm truncate">{u.name}</p>
                      <p className="text-muted-foreground text-xs">Year {u.year} · {u.roll_number}</p>
                    </div>
                    <StatusPill tone="warning" className="shrink-0">Pending</StatusPill>
                  </div>
                ))}
                {pending.length > 4 && <p className="text-xs text-muted-foreground pt-1">+{pending.length - 4} more</p>}
                <Link href="/dashboard/users?tab=pending" className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="label mb-4">Approval Rate</p>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-28 h-28 rounded-full" />
                <div className="w-full space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-3 w-full" />)}
                </div>
              </div>
            ) : stats.total > 0 ? (() => {
              const rate = Math.round((stats.approved / stats.total) * 100);
              const circumference = 2 * Math.PI * 40;
              const offset = circumference - (rate / 100) * circumference;
              return (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                      <motion.circle
                        cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        strokeLinecap="round" className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="num-display text-2xl text-foreground">{rate}%</span>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    {[
                      { label: 'Approved', count: stats.approved, color: 'bg-success' },
                      { label: 'Pending', count: stats.pending, color: 'bg-warning' },
                      { label: 'Total', count: stats.total, color: 'bg-foreground' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                        <span className="text-xs text-foreground tabular-nums">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="label mb-4">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card border border-border rounded-xl p-4 hover:border-foreground/20 hover:bg-accent transition-colors flex flex-col gap-2 h-full"
            >
              <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-background border border-border flex items-center justify-center transition-colors">
                <Icon size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <p className="text-foreground text-xs font-medium">{label}</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-snug">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
