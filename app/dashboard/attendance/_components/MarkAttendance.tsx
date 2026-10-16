'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarDays, CheckCircle, Loader2, Save, Search, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentRow } from './types';

// The roll call for one date: every student starts present, a click flips
// them, and Save writes the whole list at once.
export function MarkAttendance({
  selectedDate,
  subjectName,
  classYear,
  students,
  loading,
  saving,
  saved,
  search,
  onSearchChange,
  onToggle,
  onMarkAll,
  onSave,
}: {
  selectedDate: string | null;
  subjectName: string;
  classYear: string;
  students: StudentRow[];
  loading: boolean;
  saving: boolean;
  saved: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (id: number) => void;
  onMarkAll: (status: 'present' | 'absent') => void;
  onSave: () => void;
}) {
  if (!selectedDate) {
    return (
      <Card className="h-full justify-center">
        <EmptyState icon={<CalendarDays size={28} strokeWidth={1.5} />} title="Select a date on the calendar" />
      </Card>
    );
  }

  const presentCount = students.filter(s => s.status === 'present').length;
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-foreground text-sm font-medium">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">{subjectName}</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && students.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => onMarkAll('present')} className="text-success">
                All P
              </Button>
              <Button variant="outline" size="sm" onClick={() => onMarkAll('absent')} className="text-destructive">
                All A
              </Button>
              <Button
                onClick={onSave}
                disabled={saving}
                size="sm"
                variant={saved ? 'secondary' : 'default'}
                className={saved ? 'bg-success-soft text-success hover:bg-success-soft/70' : undefined}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving ? '...' : saved ? '✓' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {students.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs shrink-0">
                <span className="text-foreground font-medium tabular-nums">{presentCount}</span>/{students.length} present
              </p>
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search student..."
                  aria-label="Search student"
                  className="pl-8 bg-card"
                />
              </div>
            </div>
          )}
          <Card className="py-0 gap-0">
            <CardContent className="p-0">
              {students.length === 0 ? (
                <EmptyState className="py-12" title={`No students for Year ${classYear}`} />
              ) : filtered.length === 0 ? (
                <EmptyState className="py-12" icon={<Search size={28} strokeWidth={1.5} />} title={`No match for "${search}"`} />
              ) : (
                filtered.map((s, i) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={s.status === 'present'}
                    onClick={() => onToggle(s.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(s.id); } }}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors outline-none focus-visible:bg-accent',
                      i !== filtered.length - 1 && 'border-b border-border',
                      s.status === 'present' ? 'hover:bg-accent' : 'bg-destructive-soft hover:bg-destructive/15',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground text-xs w-5 text-right tabular-nums">{i + 1}</span>
                      <div>
                        <p className="text-foreground text-sm">{s.name}</p>
                        <p className="text-muted-foreground text-xs">{s.roll_number}</p>
                      </div>
                    </div>
                    {s.status === 'present'
                      ? <CheckCircle size={16} className="text-success" />
                      : <XCircle size={16} className="text-destructive" />
                    }
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
