'use client';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Search, Users, Megaphone } from 'lucide-react';
import { isSuperAdmin, getUser } from '@/lib/auth';

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
  const [successMsg, setSuccessMsg] = useState('');
  const canWrite = isSuperAdmin();
  const canManageStaff = ['super_admin', 'admin'].includes(getUser()?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [p, a, s] = await Promise.all([api.get('/admin/pending'), api.get('/admin/users'), api.get('/admin/faculty')]);
      setPending(p.data);
      setAll(a.data);
      setStaff(s.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const approve = async (id: number) => {
    setActing(id);
    await api.put(`/admin/users/${id}/approve`);
    await load();
    setActing(null);
    showSuccess('User approved successfully.');
  };

  const reject = async (id: number) => {
    if (!window.confirm('Are you sure you want to reject this user?')) return;
    setActing(id);
    await api.put(`/admin/users/${id}/reject`);
    await load();
    setActing(null);
    showSuccess('User rejected.');
  };

  const toggleGeneralPost = async (id: number) => {
    setActing(id);
    const res = await api.put(`/admin/users/${id}/toggle-general-post`);
    setStaff(prev => prev.map(u => u.id === id ? { ...u, can_post_general: res.data.can_post_general } : u));
    setActing(null);
    showSuccess(`General announcement permission ${res.data.can_post_general ? 'granted' : 'revoked'}.`);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      approved: 'bg-green-900 text-green-300 border-green-800',
      pending: 'bg-yellow-900 text-yellow-300 border-yellow-800',
      rejected: 'bg-red-900 text-red-300 border-red-800',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded border tracking-wider uppercase ${map[s] || ''}`}>
        {s}
      </span>
    );
  };

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
      <h1 className="text-2xl font-light tracking-widest uppercase text-foreground mb-8">Users</h1>

      {/* Inline success banner */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-900/30 border border-green-800 text-green-300 text-sm tracking-wide flex items-center gap-2">
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted border border-border mb-6">
          <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">
            All Students
            <span className="ml-1.5 text-xs opacity-70">({all.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">
            Pending {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          {canManageStaff && (
            <TabsTrigger value="staff" className="data-[state=active]:bg-white data-[state=active]:text-black text-zinc-400">
              Staff Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : pending.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-16 flex flex-col items-center gap-3">
                <CheckCircle size={40} className="text-muted-foreground/40" />
                <p className="text-foreground text-sm font-medium">All caught up</p>
                <p className="text-muted-foreground text-xs tracking-wide">No pending approvals at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map(u => (
                <Card key={u.id} className="bg-card border-border">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-foreground font-medium">{u.name}</p>
                      <p className="text-muted-foreground text-sm">{u.email}</p>
                      <p className="text-zinc-600 text-xs mt-1 tracking-wider">
                        Year {u.year} · Roll {u.roll_number} · {u.department}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approve(u.id)}
                          disabled={acting === u.id}
                          className="bg-green-900 hover:bg-green-800 text-green-300 border border-green-800 text-xs tracking-wider"
                        >
                          {acting === u.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          <span className="ml-1.5">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => reject(u.id)}
                          disabled={acting === u.id}
                          className="bg-red-900 hover:bg-red-800 text-red-300 border border-red-800 text-xs tracking-wider"
                        >
                          {acting === u.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          <span className="ml-1.5">Reject</span>
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
              className="pl-8 bg-card border-border text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : filteredAll.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Users size={40} className="text-muted-foreground/40" />
                  <p className="text-foreground text-sm font-medium">
                    {search ? 'No results found' : 'No students yet'}
                  </p>
                  <p className="text-muted-foreground text-xs tracking-wide">
                    {search ? 'Try a different search term' : 'Students will appear here once they register'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Name</TableHead>
                      <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Email</TableHead>
                      <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Roll</TableHead>
                      <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Year</TableHead>
                      <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAll.map(u => (
                      <TableRow key={u.id} className="border-border hover:bg-muted">
                        <TableCell className="text-foreground text-sm">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.roll_number}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">Y{u.year}</TableCell>
                        <TableCell>{statusBadge(u.status)}</TableCell>
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
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Name</TableHead>
                        <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Email</TableHead>
                        <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Role</TableHead>
                        <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">General Announcements</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map(u => (
                        <TableRow key={u.id} className="border-border hover:bg-muted">
                          <TableCell className="text-foreground text-sm">{u.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-0.5 rounded border tracking-wider uppercase bg-blue-900 text-blue-300 border-blue-800">
                              {u.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => toggleGeneralPost(u.id)}
                              disabled={acting === u.id}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded border tracking-wider transition-colors ${
                                u.can_post_general
                                  ? 'bg-green-900 text-green-300 border-green-800 hover:bg-green-800'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                              }`}
                            >
                              {acting === u.id ? <Loader2 size={12} className="animate-spin" /> : <Megaphone size={12} />}
                              {u.can_post_general ? 'Allowed' : 'Restricted'}
                            </button>
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
