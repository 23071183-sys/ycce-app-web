'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Check } from 'lucide-react';

type Subject = { id: number; name: string; code: string; year: number; professor_name?: string };
type Component = { key: string; label: string; max: number };
type StudentRow = {
  student_id: number;
  student_name: string;
  roll_number: string;
  mse1_marks: string | null;
  mse2_marks: string | null;
  ta_marks: string | null;
  ese_marks: string | null;
};

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 6
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

export default function MarksPage() {
  const { isAdmin, isProfessor, ready } = useCurrentUser();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  const [components, setComponents] = useState<Component[]>([]);
  const [maxTotal, setMaxTotal] = useState(100);
  const [rows, setRows] = useState<StudentRow[]>([]);

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Admins mark any subject; a professor is only offered their own, matching
  // what the API will actually allow them to write.
  useEffect(() => {
    if (!ready) return;
    const endpoint = isAdmin ? '/admin/subjects' : '/subjects/my-subjects';
    api.get(endpoint)
      .then(r => setSubjects(r.data))
      .catch(e => setError(e.response?.data?.error || 'Could not load subjects'));
  }, [ready, isAdmin]);

  const loadSheet = useCallback(async () => {
    if (!subjectId || !semester) return;
    setLoadingSheet(true);
    setError('');
    setSaved(false);
    try {
      const r = await api.get(`/results/subject/${subjectId}/sheet`, { params: { semester } });
      setComponents(r.data.components);
      setMaxTotal(r.data.max_total);
      setRows(r.data.students.map((s: any) => ({
        ...s,
        mse1_marks: s.mse1_marks ?? '',
        mse2_marks: s.mse2_marks ?? '',
        ta_marks: s.ta_marks ?? '',
        ese_marks: s.ese_marks ?? '',
      })));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not load the marks sheet');
      setRows([]);
    }
    setLoadingSheet(false);
  }, [subjectId, semester]);

  useEffect(() => { loadSheet(); }, [loadSheet]);

  const setMark = (studentId: number, key: string, value: string) => {
    setSaved(false);
    setRows(rs => rs.map(r => (r.student_id === studentId ? { ...r, [key]: value } : r)));
  };

  const rowTotal = (r: StudentRow) =>
    components.reduce((sum, c) => sum + (Number((r as any)[c.key]) || 0), 0);

  // Flag a value that exceeds its component's ceiling as the user types, rather
  // than letting the whole save fail on one bad cell.
  const isOver = (r: StudentRow, c: Component) => {
    const v = (r as any)[c.key];
    return v !== '' && Number(v) > c.max;
  };
  const hasErrors = rows.some(r => components.some(c => isOver(r, c)));
  const enteredCount = rows.filter(r => components.some(c => (r as any)[c.key] !== '')).length;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/results/bulk', {
        subject_id: Number(subjectId),
        semester: Number(semester),
        academic_year: academicYear.trim() || null,
        records: rows.map(r => ({
          student_id: r.student_id,
          roll_number: r.roll_number,
          mse1_marks: r.mse1_marks === '' ? null : r.mse1_marks,
          mse2_marks: r.mse2_marks === '' ? null : r.mse2_marks,
          ta_marks: r.ta_marks === '' ? null : r.ta_marks,
          ese_marks: r.ese_marks === '' ? null : r.ese_marks,
        })),
      });
      setSaved(true);
      setError('');
      if (res.data?.saved === 0) setError('Nothing to save — no marks were entered.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save marks');
    }
    setSaving(false);
  };

  if (!ready) return <Skeleton className="h-64 w-full" />;

  if (!isAdmin && !isProfessor) {
    return (
      <p className="text-muted-foreground text-sm">
        Only teaching staff and administrators can enter marks.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">Marks Entry</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {components.length
            ? components.map(c => `${c.label} ${c.max}`).join(' + ') + ` = ${maxTotal}`
            : 'Select a subject and semester to begin.'}
        </p>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs tracking-widest uppercase">Subject</Label>
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code ? `${s.code} — ` : ''}{s.name} (Year {s.year})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs tracking-widest uppercase">Semester</Label>
            <select
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select semester…</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs tracking-widest uppercase">Academic Year</Label>
            <Input
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2026-27"
              className="bg-background border-border text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {loadingSheet && <Skeleton className="h-64 w-full" />}

      {!loadingSheet && rows.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Roll No</TableHead>
                    <TableHead className="text-muted-foreground text-xs tracking-widest uppercase">Student</TableHead>
                    {components.map(c => (
                      <TableHead key={c.key} className="text-muted-foreground text-xs tracking-widest uppercase text-center">
                        {c.label}<span className="normal-case tracking-normal opacity-60"> /{c.max}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-muted-foreground text-xs tracking-widest uppercase text-center">
                      Total<span className="normal-case tracking-normal opacity-60"> /{maxTotal}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const total = rowTotal(r);
                    return (
                      <TableRow key={r.student_id} className="border-border hover:bg-muted">
                        <TableCell className="text-muted-foreground text-sm">{r.roll_number}</TableCell>
                        <TableCell className="text-foreground text-sm">{r.student_name}</TableCell>
                        {components.map(c => (
                          <TableCell key={c.key} className="text-center">
                            <Input
                              type="number"
                              min={0}
                              max={c.max}
                              inputMode="numeric"
                              value={(r as any)[c.key]}
                              onChange={e => setMark(r.student_id, c.key, e.target.value)}
                              className={`w-16 mx-auto text-center bg-background text-foreground ${
                                isOver(r, c) ? 'border-red-500' : 'border-border'
                              }`}
                            />
                          </TableCell>
                        ))}
                        <TableCell
                          className={`text-center text-sm font-semibold ${
                            total === 0 ? 'text-muted-foreground'
                              : total >= 40 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {total || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-muted-foreground text-xs">
                {enteredCount} of {rows.length} students have marks entered
                {hasErrors && <span className="text-red-400"> · some marks exceed their maximum</span>}
              </p>
              <button
                onClick={save}
                disabled={saving || hasErrors}
                className="flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 text-xs tracking-widest uppercase font-light px-4 py-2 rounded-md transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" />
                  : saved ? <Check size={14} />
                  : <Save size={14} />}
                {saving ? 'Saving' : saved ? 'Saved' : 'Save Marks'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loadingSheet && subjectId && semester && rows.length === 0 && !error && (
        <p className="text-muted-foreground text-sm">
          No approved students found for this subject&apos;s year.
        </p>
      )}
    </div>
  );
}
