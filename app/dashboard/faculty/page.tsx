'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Mail, GraduationCap } from 'lucide-react';

type Faculty = { id: number; name: string; email: string; role: string; subject_count?: number };

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'super_admin';
  return (
    <span className={`text-xs px-2 py-0.5 rounded border tracking-wider uppercase ${
      isAdmin
        ? 'bg-purple-900/40 text-purple-300 border-purple-800'
        : 'bg-blue-900/40 text-blue-300 border-blue-800'
    }`}>
      {isAdmin ? 'Admin' : 'Professor'}
    </span>
  );
}

export default function FacultyPage() {
  const [items, setItems] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/faculty')
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">Faculty</h1>
        <span className="text-muted-foreground text-sm">{items.length} members</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <GraduationCap size={40} className="text-muted-foreground/40" />
            <p className="text-foreground text-sm font-medium">No faculty found</p>
            <p className="text-muted-foreground text-xs tracking-wide">Faculty accounts will appear here once added</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(f => (
            <Card key={f.id} className="bg-card border-border">
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  {/* Avatar circle with initials */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
                    f.role === 'super_admin'
                      ? 'bg-purple-900/50 text-purple-200'
                      : 'bg-blue-900/50 text-blue-200'
                  }`}>
                    {getInitials(f.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-foreground font-medium text-sm truncate">{f.name}</p>
                      <RoleBadge role={f.role} />
                    </div>
                    {/* Subject count if available */}
                    {typeof f.subject_count === 'number' && f.subject_count > 0 && (
                      <p className="text-zinc-500 text-xs tracking-wide">
                        {f.subject_count} subject{f.subject_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <Mail size={11} />
                  <span className="truncate">{f.email}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
