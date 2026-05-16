'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
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

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-light text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function YearBar({ year, count, max }: { year: number; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-12 shrink-0">Year {year}</span>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div className="h-2 rounded-full bg-foreground transition-all duration-500" style={{ width: `${pct}%` }} />
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

export default function OverviewPage() {
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, approved: 0, announcements: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
    Promise.all([
      api.get('/admin/stats').catch(() => ({ data: {} })),
      api.get('/admin/users').catch(() => ({ data: [] })),
    ]).then(([statsRes, usersRes]) => {
      setStats(statsRes.data || {});
      setUsers(usersRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // Year breakdown
  const students = users.filter(u => u.role === 'student' && u.status === 'approved');
  const byYear = [1, 2, 3, 4].map(y => ({
    year: y,
    count: students.filter(s => s.year === y).length,
  }));
  const maxByYear = Math.max(...byYear.map(b => b.count), 1);

  // Pending users
  const pending = users.filter(u => u.status === 'pending');

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        {user && (
          <h2 className="text-3xl font-extralight text-foreground tracking-wide">
            {getGreeting(user.name)}
          </h2>
        )}
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={loading ? '—' : stats.total ?? 0} icon={Users}
          color="bg-blue-500/10 text-blue-400" sub="Registered accounts" />
        <StatCard label="Approved" value={loading ? '—' : stats.approved ?? 0} icon={CheckCircle}
          color="bg-green-500/10 text-green-400" sub="Active students" />
        <StatCard label="Pending" value={loading ? '—' : stats.pending ?? 0} icon={Clock}
          color="bg-yellow-500/10 text-yellow-400"
          sub={stats.pending > 0 ? 'Needs your attention' : 'All clear'} />
        <StatCard label="Announcements" value={loading ? '—' : stats.announcements ?? 0} icon={Megaphone}
          color="bg-purple-500/10 text-purple-400" sub="Total posted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Year breakdown */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">Students by Year</p>
              <p className="text-foreground text-lg font-light mt-1 tabular-nums">{students.length} approved</p>
            </div>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-3 pt-1">
            {byYear.map(({ year, count }) => (
              <YearBar key={year} year={year} count={count} max={maxByYear} />
            ))}
          </div>
        </div>

        {/* Pending approvals */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground tracking-widest uppercase">Pending Approvals</p>
              <p className="text-foreground text-lg font-light mt-1">{pending.length} waiting</p>
            </div>
            <Activity size={16} className="text-muted-foreground" />
          </div>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <CheckCircle size={28} className="text-green-500/50" />
              <p className="text-muted-foreground text-xs tracking-wider">All requests handled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 4).map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">
                      {u.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm truncate">{u.name}</p>
                    <p className="text-muted-foreground text-xs">Year {u.year} · {u.roll_number}</p>
                  </div>
                  <span className="text-xs text-yellow-400 border border-yellow-900 px-1.5 py-0.5 rounded shrink-0">Pending</span>
                </div>
              ))}
              {pending.length > 4 && (
                <p className="text-xs text-muted-foreground pt-1">+{pending.length - 4} more</p>
              )}
              <Link href="/dashboard/users?tab=pending"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>

        {/* Approval rate */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">Approval Rate</p>
          {!loading && stats.total > 0 ? (() => {
            const rate = Math.round((stats.approved / stats.total) * 100);
            const circumference = 2 * Math.PI * 40;
            const offset = circumference - (rate / 100) * circumference;
            return (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                      strokeDasharray={circumference} strokeDashoffset={offset}
                      strokeLinecap="round" className="text-foreground transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-light text-foreground">{rate}%</span>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {[
                    { label: 'Approved', count: stats.approved, color: 'bg-green-400' },
                    { label: 'Pending', count: stats.pending, color: 'bg-yellow-400' },
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
        </div>
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href}
              className="group bg-card border border-border rounded-xl p-4 hover:border-foreground/30 hover:bg-muted transition-all flex flex-col gap-2">
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
