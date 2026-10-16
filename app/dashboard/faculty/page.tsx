'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Mail, GraduationCap } from 'lucide-react';

type Faculty = { id: number; name: string; email: string; role: string; subject_count?: number };

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function FacultyPage() {
  const [items, setItems] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Only async state updates here, so the first load can run from an effect.
  const fetchFaculty = useCallback(() => {
    api.get('/admin/faculty')
      .then(r => { setItems(r.data); setLoadError(false); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    fetchFaculty();
  };

  return (
    <div>
      <PageHeader
        title="Faculty"
        description={loading ? 'Loading…' : `${items.length} members`}
      />

      {loadError && <ErrorBanner title="Couldn't load faculty" onRetry={load} />}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        loadError ? null : (
          <Card>
            <EmptyState
              icon={<GraduationCap size={28} strokeWidth={1.5} />}
              title="No faculty found"
              message="Faculty accounts will appear here once added"
            />
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(f => {
            const isAdmin = f.role === 'super_admin';
            return (
              <Card key={f.id}>
                <CardContent className="py-1">
                  <div className="flex items-center gap-3">
                    <Avatar size="lg">
                      <AvatarFallback className={isAdmin ? 'bg-primary-soft text-primary font-medium' : 'font-medium text-foreground'}>
                        {getInitials(f.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-foreground font-medium text-sm truncate">{f.name}</p>
                        <StatusPill tone={isAdmin ? 'accent' : 'neutral'}>{isAdmin ? 'Admin' : 'Professor'}</StatusPill>
                      </div>
                      {typeof f.subject_count === 'number' && f.subject_count > 0 && (
                        <p className="text-muted-foreground text-xs">
                          {f.subject_count} subject{f.subject_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={11} />
                    <span className="truncate">{f.email}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
