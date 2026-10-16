'use client';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Search, Users, Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Tone } from '@/lib/format';

const STATUS_TONE: Record<string, Tone> = { approved: 'success', pending: 'warning', rejected: 'danger' };

type User = {
  id: number; name: string; email: string; role: string;
  year: number; roll_number: string; department: string; status: string;
};
type StaffUser = { id: number; name: string; email: string; role: string; can_post_general: boolean };

export default function UsersPage() {
  const [pending, setPending] = useState<User[]>([]);
  const [all, setAll] = useState<User[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState('');
  const { isSuperAdmin: canWrite, isAdmin: canManageStaff } = useCurrentUser();

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [p, a, s] = await Promise.all([api.get('/admin/pending'), api.get('/admin/users'), api.get('/admin/faculty')]);
      setPending(p.data);
      setAll(a.data);
      setStaff(s.data);
    } catch (e: any) {
      setLoadError(e.response?.data?.error || 'Failed to load users');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => toast.success(msg);

  const approve = async (id: number) => {
    setActing(id);
    try {
      await api.put(`/admin/users/${id}/approve`);
      await load();
      showSuccess('User approved successfully.');
    } catch { setLoadError('Failed to approve user.'); }
    setActing(null);
  };

  const reject = async (id: number) => {
    if (!window.confirm('Are you sure you want to reject this user?')) return;
    setActing(id);
    try {
      await api.put(`/admin/users/${id}/reject`);
      await load();
      showSuccess('User rejected.');
    } catch { setLoadError('Failed to reject user.'); }
    setActing(null);
  };

  const toggleGeneralPost = async (id: number) => {
    setActing(id);
    try {
      const res = await api.put(`/admin/users/${id}/toggle-general-post`);
      setStaff(prev => prev.map(u => u.id === id ? { ...u, can_post_general: res.data.can_post_general } : u));
      showSuccess(`General announcement permission ${res.data.can_post_general ? 'granted' : 'revoked'}.`);
    } catch { setLoadError('Failed to update permission.'); }
    setActing(null);
  };

  const statusBadge = (s: string) => (
    <StatusPill tone={STATUS_TONE[s] ?? 'neutral'} className="capitalize">{s}</StatusPill>
  );

  // Filter students by search query
  const filteredAll = useMemo(() => {
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.roll_number && u.roll_number.toLowerCase().includes(q))
    );
  }, [all, search]);

  return (
    <div>
      <PageHeader title="Users" description="Approve registrations and manage student and staff accounts" />

      {loadError && <ErrorBanner title="Something went wrong" message={loadError} onRetry={load} />}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All Students
            <span className="text-xs text-muted-foreground tabular-nums">({all.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          {canManageStaff && (
            <TabsTrigger value="staff">
              Staff Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : pending.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CheckCircle size={28} strokeWidth={1.5} />}
                title="All caught up"
                message="No pending approvals at this time"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map(u => (
                <Card key={u.id}>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-foreground font-medium">{u.name}</p>
                      <p className="text-muted-foreground text-sm">{u.email}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Year {u.year} · Roll {u.roll_number} · {u.department}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex gap-2 shrink-0">
                        <Button onClick={() => approve(u.id)} disabled={acting === u.id}>
                          {acting === u.id ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                          Approve
                        </Button>
                        <Button variant="destructive" onClick={() => reject(u.id)} disabled={acting === u.id}>
                          {acting === u.id ? <Loader2 className="animate-spin" /> : <XCircle />}
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {/* Search input */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email, or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-8 bg-card"
            />
          </div>

          <Card className="py-0">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-5 w-16 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredAll.length === 0 ? (
                <EmptyState
                  icon={<Users size={28} strokeWidth={1.5} />}
                  title={search ? 'No results found' : 'No students yet'}
                  message={search ? 'Try a different search term' : 'Students will appear here once they register'}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="label h-11 px-4">Name</TableHead>
                      <TableHead className="label h-11 px-4">Email</TableHead>
                      <TableHead className="label h-11 px-4">Roll</TableHead>
                      <TableHead className="label h-11 px-4">Year</TableHead>
                      <TableHead className="label h-11 px-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAll.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="px-4 py-3 text-foreground text-sm">{u.name}</TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground text-sm">{u.roll_number}</TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground text-sm">Y{u.year}</TableCell>
                        <TableCell className="px-4 py-3">{statusBadge(u.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canManageStaff && (
          <TabsContent value="staff">
            <Card className="py-0">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="label h-11 px-4">Name</TableHead>
                        <TableHead className="label h-11 px-4">Email</TableHead>
                        <TableHead className="label h-11 px-4">Role</TableHead>
                        <TableHead className="label h-11 px-4">General Announcements</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="px-4 py-3 text-foreground text-sm">{u.name}</TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground text-sm">{u.email}</TableCell>
                          <TableCell className="px-4 py-3">
                            <StatusPill className="capitalize">{u.role}</StatusPill>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Button
                              size="sm"
                              variant={u.can_post_general ? 'secondary' : 'outline'}
                              onClick={() => toggleGeneralPost(u.id)}
                              disabled={acting === u.id}
                              aria-pressed={u.can_post_general}
                              className={u.can_post_general ? 'bg-success-soft text-success hover:bg-success-soft/70' : 'text-muted-foreground'}
                            >
                              {acting === u.id ? <Loader2 className="animate-spin" /> : <Megaphone />}
                              {u.can_post_general ? 'Allowed' : 'Restricted'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
