'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusPill } from '@/components/shared/StatusPill';
import { attendanceTone, type Tone } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, Search, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { StudentDetail, SummaryRow } from './types';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-foreground',
  accent: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
const TONE_BAR: Record<Tone, string> = {
  neutral: 'bg-foreground',
  accent: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
};

// The subject-wide report: every student's attendance, and one student's
// date-by-date record beside it.
export function SubjectReport({
  subjectName,
  summary,
  loading,
  detailStudent,
  studentDetail,
  loadingDetail,
  onBack,
  onOpenStudent,
  onCloseStudent,
}: {
  subjectName: string;
  summary: SummaryRow[];
  loading: boolean;
  detailStudent: SummaryRow | null;
  studentDetail: StudentDetail | null;
  loadingDetail: boolean;
  onBack: () => void;
  onOpenStudent: (row: SummaryRow) => void;
  onCloseStudent: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to calendar">
          <ArrowLeft />
        </Button>
        <h2 className="label text-foreground">Overall Summary — {subjectName}</h2>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="py-0 gap-0">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : summary.length === 0 ? (
              <EmptyState title="No attendance recorded yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Student', 'Roll No', 'Present', 'Total', '%', ''].map(h => (
                      <TableHead key={h} className="label h-11 px-4">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((r, i) => (
                    <TableRow
                      key={i}
                      onClick={() => onOpenStudent(r)}
                      data-state={detailStudent?.student_id === r.student_id ? 'selected' : undefined}
                      className={cn('cursor-pointer', detailStudent?.student_id === r.student_id && 'bg-muted')}
                    >
                      <TableCell className="px-4 py-3 text-foreground text-sm font-medium">{r.student_name}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-sm">{r.roll_number}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-sm tabular-nums">{r.present}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-sm tabular-nums">{r.total}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {r.total > 0
                          ? <StatusPill tone={attendanceTone(r.percentage)} className="tabular-nums">{r.percentage}%</StatusPill>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {r.total > 0 && (
                          r.percentage >= 75
                            ? <TrendingUp size={14} className="text-success" />
                            : <TrendingDown size={14} className="text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {detailStudent ? (
          <Card>
            <CardContent className="py-1">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-foreground font-medium">{detailStudent.student_name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{detailStudent.roll_number} · {subjectName}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onCloseStudent} aria-label="Close student report">
                  <X />
                </Button>
              </div>

              {loadingDetail ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : studentDetail ? (
                <StudentDetailBody detail={studentDetail} />
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="justify-center">
            <EmptyState
              icon={<Search size={28} strokeWidth={1.5} />}
              title="Click a student to view report"
              message="Date-wise attendance and full stats will appear here"
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function StudentDetailBody({ detail }: { detail: StudentDetail }) {
  const { summary, records } = detail;
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Present', value: summary.present_count, color: 'text-success' },
          { label: 'Absent', value: Number(summary.total_count) - Number(summary.present_count), color: 'text-destructive' },
          { label: 'Total', value: summary.total_count, color: 'text-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-muted rounded-lg p-3 text-center">
            <p className={`num-display text-xl ${color}`}>{value}</p>
            <p className="label mt-1">{label}</p>
          </div>
        ))}
      </div>

      {summary.total_count > 0 && (() => {
        const pct = parseFloat(summary.percentage || '0');
        const tone = attendanceTone(pct);
        return (
          <div className="mb-5">
            <div className="flex justify-between items-center mb-1.5">
              <p className="label">Attendance</p>
              <p className={`text-sm font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{pct}%</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${TONE_BAR[tone]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            {pct < 75 && (
              <p className="text-destructive text-xs mt-2">
                ⚠️ Needs {Math.ceil(Math.max(0, (0.75 * Number(summary.total_count) - Number(summary.present_count)) / 0.25))} more classes to reach 75%
              </p>
            )}
          </div>
        );
      })()}

      <p className="label mb-3">Date-wise Record</p>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {records.length === 0 ? (
          <EmptyState className="py-8" title="No records" />
        ) : records.map((rec, i) => (
          <div key={i} className={cn('flex items-center justify-between px-3 py-2.5', i !== records.length - 1 && 'border-b border-border')}>
            <p className="text-foreground text-sm">
              {new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <StatusPill tone={rec.status === 'present' ? 'success' : 'danger'}>
              {rec.status === 'present' ? 'P' : 'A'}
            </StatusPill>
          </div>
        ))}
      </div>
    </>
  );
}
