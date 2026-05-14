'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, CheckCircle, Clock, Megaphone, X, Loader2, Megaphone as MegaphoneIcon,
  Megaphone as AnnouncementIcon, ClipboardList, BarChart2
} from 'lucide-react';

type Student = { id: number; name: string; email: string; roll_number: string; year: number; status: string };
type Announcement = { id: number; title: string; content: string; type: string; year?: number; created_at: string; posted_by_name?: string };

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name?.trim().split(' ')[0] || name;
  if (hour >= 5 && hour < 12) return `Good morning, ${first}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, announcements: 0 });
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const open = async (key: string) => {
    if (active === key) { setActive(null); setPanelData([]); return; }
    setActive(key);
    setPanelLoading(true);
    setPanelData([]);
    try {
      if (key === 'total' || key === 'approved' || key === 'pending') {
        const r = await api.get('/admin/users');
        const all: Student[] = r.data;
        if (key === 'total') setPanelData(all);
        else if (key === 'approved') setPanelData(all.filter(s => s.status === 'approved'));
        else setPanelData(all.filter(s => s.status === 'pending'));
      } else if (key === 'announcements') {
        const [general, y1, y2, y3, y4] = await Promise.all([
          api.get('/announcements/general'),
          api.get('/announcements/year/1'),
          api.get('/announcements/year/2'),
          api.get('/announcements/year/3'),
          api.get('/announcements/year/4'),
        ]);
        const all = [...general.data, ...y1.data, ...y2.data, ...y3.data, ...y4.data];
        const unique = Array.from(new Map(all.map((a: Announcement) => [a.id, a])).values())
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPanelData(unique);
      }
    } catch {}
    setPanelLoading(false);
  };

  const cards = [
    { key: 'total', label: 'Total Students', value: stats.total, icon: Users, color: 'text-blue-400' },
    { key: 'approved', label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-400' },
    { key: 'pending', label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
    { key: 'announcements', label: 'Announcements', value: stats.announcements, icon: Megaphone, color: 'text-purple-400' },
  ];

  const quickActions = [
    { label: 'Post Announcement', href: '/dashboard/announcements', icon: AnnouncementIcon, color: 'text-purple-400', bg: 'hover:bg-purple-900/20 border-purple-900/40' },
    { label: 'Mark Attendance', href: '/dashboard/attendance', icon: ClipboardList, color: 'text-blue-400', bg: 'hover:bg-blue-900/20 border-blue-900/40' },
    { label: 'Add SGPA', href: '/dashboard/results', icon: BarChart2, color: 'text-green-400', bg: 'hover:bg-green-900/20 border-green-900/40' },
  ];

  return (
    <div>
      {/* Time-based greeting */}
      {user && (
        <h2 className="text-3xl font-light text-foreground/80 tracking-wide mb-1">
          {getGreeting(user.name)}
        </h2>
      )}
      <h1 className="text-2xl font-light tracking-widest uppercase text-foreground mb-8">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map(({ key, label, value, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => open(key)}
            className={`text-left rounded-xl border transition-all ${
              active === key
                ? 'bg-foreground border-foreground'
                : 'bg-card border-border hover:bg-muted'
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs tracking-widest uppercase mb-2 ${active === key ? 'text-background/70' : 'text-muted-foreground'}`}>
                    {label}
                  </p>
                  <p className={`text-3xl font-light ${active === key ? 'text-background' : 'text-foreground'}`}>
                    {loading ? '—' : value}
                  </p>
                </div>
                <Icon size={28} className={active === key ? 'text-background/60' : color} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions row */}
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          {quickActions.map(({ label, href, icon: Icon, color, bg }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors ${bg}`}
            >
              <Icon size={15} className={color} />
              <span className="tracking-wide">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {active && (
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-foreground text-sm font-medium tracking-widest uppercase">
                {cards.find(c => c.key === active)?.label}
                {!panelLoading && <span className="text-muted-foreground font-light ml-2">({panelData.length})</span>}
              </p>
              <button onClick={() => { setActive(null); setPanelData([]); }}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            {panelLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : panelData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Users size={40} className="text-muted-foreground/40" />
                <p className="text-foreground text-sm font-medium">Nothing here</p>
                <p className="text-muted-foreground text-xs tracking-wide">No records found for this category</p>
              </div>
            ) : active === 'announcements' ? (
              <div className="space-y-3">
                {(panelData as Announcement[]).map(a => (
                  <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-muted border border-border">
                    <MegaphoneIcon size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-foreground text-sm font-medium">{a.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded border tracking-wider uppercase ${
                          a.type === 'general'
                            ? 'bg-blue-900/30 text-blue-400 border-blue-800'
                            : 'bg-purple-900/30 text-purple-400 border-purple-800'
                        }`}>
                          {a.type === 'general' ? 'General' : `Year ${a.year}`}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{a.content}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {a.posted_by_name && `${a.posted_by_name} · `}
                        {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Name', 'Roll No', 'Email', 'Year', 'Status'].map(h => (
                        <th key={h} className="text-left text-muted-foreground text-xs tracking-widest uppercase pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(panelData as Student[]).map(s => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted transition-colors">
                        <td className="py-3 pr-4 text-foreground">{s.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{s.roll_number || '—'}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{s.email}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{s.year ? `Year ${s.year}` : '—'}</td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded border tracking-wider uppercase ${
                            s.status === 'approved'
                              ? 'bg-green-900/30 text-green-400 border-green-800'
                              : s.status === 'pending'
                              ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                              : 'bg-red-900/30 text-red-400 border-red-800'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
