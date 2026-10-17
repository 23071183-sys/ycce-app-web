'use client';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Pencil, BarChart2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/auth';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { SubjectResults } from './_components/SubjectResults';

type SGPARow = {
  id: number; student_id: number; student_name: string; roll_number: string;
  semester: number; sgpa: number; academic_year: string;
};
type Student = { id: number; name: string; roll_number: string; year: number };

// Returns the current academic year string e.g. "2024-25"
function currentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  if (month >= 6) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

// Returns the likely current semester for a given student year
// Odd months (Jun-Nov) → odd semester; Even months (Dec-May) → even semester
function autoSemester(studentYear: number): number {
  const month = new Date().getMonth() + 1;
  const isOddSem = month >= 6; // Jun–Nov = odd semester
  const base = (studentYear - 1) * 2 + 1; // Year1→1, Year2→3, Year3→5, Year4→7
  return isOddSem ? base : base + 1;
}

type StudentCGPA = {
  student_id: number;
  student_name: string;
  roll_number: string;
  semesters: number;
  cgpa: number;
};

export default function ResultsPage() {
  const [results, setResults] = useState<SGPARow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const { isSuperAdmin, isAdmin, isProfessor, ready } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    student_id: '',
    semester: '',
    sgpa: '',
    academic_year: currentAcademicYear(),
  });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [sgpa, users] = await Promise.all([
        api.get('/admin/sgpa'),
        api.get('/admin/users'),
      ]);
      setResults(sgpa.data);
      setStudents(users.data.filter((u: any) => u.status === 'approved'));
    } catch (e: any) {
      setLoadError(e.response?.data?.error || 'Failed to load results');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // When student changes, auto-fill semester and keep academic year
  const handleStudentChange = (studentId: string) => {
    setField('student_id', studentId);
    if (!studentId) return;
    const student = students.find(s => String(s.id) === studentId);
    if (student) {
      setField('semester', String(autoSemester(student.year)));
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ student_id: '', semester: '', sgpa: '', academic_year: currentAcademicYear() });
    setError('');
    setOpen(true);
  };

  const openEdit = (row: SGPARow) => {
    setEditingId(row.id);
    setForm({
      student_id: String(row.student_id),
      semester: String(row.semester),
      sgpa: String(row.sgpa),
      academic_year: row.academic_year,
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    if (!form.student_id) { setError('Select a student'); return; }
    if (!form.semester) { setError('Semester is required'); return; }
    if (!form.sgpa) { setError('SGPA is required'); return; }
    const sgpaVal = parseFloat(form.sgpa);
    if (isNaN(sgpaVal) || sgpaVal < 0 || sgpaVal > 10) { setError('SGPA must be between 0 and 10'); return; }
    if (!form.academic_year.trim()) { setError('Academic year is required'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/results/sgpa', {
        student_id: parseInt(form.student_id),
        semester: parseInt(form.semester),
        sgpa: sgpaVal,
        academic_year: form.academic_year.trim(),
      });
      setOpen(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const sgpaColor = (s: number) =>
    s >= 8 ? 'text-success' : s >= 6 ? 'text-warning' : 'text-destructive';

  const cgpaColor = (c: number) =>
    c >= 8 ? 'text-success' : c >= 6 ? 'text-warning' : 'text-destructive';

  const selectedStudent = students.find(s => String(s.id) === form.student_id);

  // Compute per-student CGPA from all their SGPAs
  const cgpaSummary = useMemo<StudentCGPA[]>(() => {
    if (results.length === 0) return [];
    const map = new Map<number, { student_name: string; roll_number: string; sgpas: number[] }>();
    for (const r of results) {
      if (!map.has(r.student_id)) {
        map.set(r.student_id, { student_name: r.student_name, roll_number: r.roll_number, sgpas: [] });
      }
      // sgpa is a Postgres numeric, which arrives as a string to keep its
      // precision. Left as-is it would concatenate under reduce rather than
      // add, so coerce here and drop anything that isn't a usable number.
      const sgpa = Number(r.sgpa);
      if (Number.isFinite(sgpa)) map.get(r.student_id)!.sgpas.push(sgpa);
    }
    return Array.from(map.entries())
      .map(([student_id, { student_name, roll_number, sgpas }]) => ({
        student_id,
        student_name,
        roll_number,
        semesters: sgpas.length,
        cgpa: sgpas.length
          ? parseFloat((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2))
          : 0,
      }))
      .sort((a, b) => b.cgpa - a.cgpa);
  }, [results]);

  return (
    <div>
      <PageHeader
        title="Results"
        description="Semester SGPA records and the CGPA they add up to"
        actions={isSuperAdmin && (
          <Button onClick={openNew}>
            <Plus /> Add Results
          </Button>
        )}
      />

      <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Result' : 'Add Result'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <FormField
              label="Student"
              htmlFor="res-student"
              hint={selectedStudent && `Year ${selectedStudent.year} student · auto-filled semester ${autoSemester(selectedStudent.year)}`}
            >
              <SelectField
                id="res-student"
                value={form.student_id}
                onValueChange={handleStudentChange}
                placeholder="Select student..."
                options={students.map(s => ({ value: String(s.id), label: `${s.name} — ${s.roll_number} (Year ${s.year})` }))}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Semester" htmlFor="res-semester">
                <SelectField
                  id="res-semester"
                  value={form.semester}
                  onValueChange={v => setField('semester', v)}
                  placeholder="Select..."
                  options={[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: `Sem ${n}` }))}
                />
              </FormField>
              <FormField label="SGPA (0–10)" htmlFor="res-sgpa">
                <Input
                  id="res-sgpa"
                  value={form.sgpa}
                  onChange={e => setField('sgpa', e.target.value)}
                  placeholder="e.g. 8.5"
                  type="number"
                  min="0" max="10" step="0.01"
                />
              </FormField>
            </div>

            <FormField label="Academic Year" htmlFor="res-ay" hint="Auto-filled to current academic year. Edit if needed.">
              <Input
                id="res-ay"
                value={form.academic_year}
                onChange={e => setField('academic_year', e.target.value)}
                placeholder="e.g. 2024-25"
              />
            </FormField>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loadError && <ErrorBanner title="Couldn't load results" message={loadError} onRetry={load} />}

      {/* SGPA Table */}
      <Card className="py-0 gap-0 mb-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {['Student', 'Roll No', 'Semester', 'SGPA', 'Academic Year', ''].map(h => (
                    <TableHead key={h} className="label h-11 px-4">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={<BarChart2 size={28} strokeWidth={1.5} />}
                        title="No results added yet"
                        message='Click "+ Add Results" to add the first result'
                      />
                    </TableCell>
                  </TableRow>
                ) : results.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="px-4 py-3 text-foreground text-sm">{r.student_name}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground text-sm">{r.roll_number}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground text-sm">Sem {r.semester}</TableCell>
                    <TableCell className={`px-4 py-3 text-sm tabular-nums font-medium ${sgpaColor(r.sgpa)}`}>{r.sgpa}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground text-sm">{r.academic_year}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} aria-label={`Edit ${r.student_name}'s result`} className="text-muted-foreground">
                          <Pencil />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CGPA Summary */}
      {!loading && cgpaSummary.length > 0 && (
        <div>
          <p className="label mb-3">CGPA Summary</p>
          <Card className="py-0 gap-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Student', 'Roll No', 'Semesters', 'CGPA'].map(h => (
                      <TableHead key={h} className="label h-11 px-4">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cgpaSummary.map((s, idx) => (
                    <TableRow key={s.student_id}>
                      <TableCell className="px-4 py-3 text-foreground text-sm">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <span className="text-warning text-xs" aria-label="Top CGPA">★</span>}
                          {s.student_name}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-sm">{s.roll_number}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-sm">{s.semesters}</TableCell>
                      <TableCell className={`px-4 py-3 text-sm tabular-nums font-semibold ${cgpaColor(s.cgpa)}`}>{s.cgpa}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {ready && (isAdmin || isProfessor) && (
        <div className="mt-8">
          <SubjectResults isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}
