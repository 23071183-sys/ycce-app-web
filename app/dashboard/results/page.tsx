'use client';
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, Pencil, BarChart2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    student_id: '',
    semester: '',
    sgpa: '',
    academic_year: currentAcademicYear(),
  });

  const load = async () => {
    setLoading(true);
    try {
      const [sgpa, users] = await Promise.all([
        api.get('/admin/sgpa'),
        api.get('/admin/users'),
      ]);
      setResults(sgpa.data);
      setStudents(users.data.filter((u: any) => u.status === 'approved'));
    } catch {}
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
    s >= 8 ? 'text-green-400' : s >= 6 ? 'text-yellow-400' : 'text-red-400';

  const cgpaColor = (c: number) =>
    c >= 8 ? 'text-green-400' : c >= 6 ? 'text-yellow-400' : 'text-red-400';

  const selectedStudent = students.find(s => String(s.id) === form.student_id);

  // Compute per-student CGPA from all their SGPAs
  const cgpaSummary = useMemo<StudentCGPA[]>(() => {
    if (results.length === 0) return [];
    const map = new Map<number, { student_name: string; roll_number: string; sgpas: number[] }>();
    for (const r of results) {
      if (!map.has(r.student_id)) {
        map.set(r.student_id, { student_name: r.student_name, roll_number: r.roll_number, sgpas: [] });
      }
      map.get(r.student_id)!.sgpas.push(r.sgpa);
    }
    return Array.from(map.entries())
      .map(([student_id, { student_name, roll_number, sgpas }]) => ({
        student_id,
        student_name,
        roll_number,
        semesters: sgpas.length,
        cgpa: parseFloat((sgpas.reduce((a, b) => a + b, 0) / sgpas.length).toFixed(2)),
      }))
      .sort((a, b) => b.cgpa - a.cgpa);
  }, [results]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">Results</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs tracking-widest uppercase font-light px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={14} /> Add SGPA
        </button>
      </div>

      <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground font-light tracking-widest uppercase">
              {editingId ? 'Edit SGPA' : 'Add / Update SGPA'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Student selector */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Student</Label>
              <select
                value={form.student_id}
                onChange={e => handleStudentChange(e.target.value)}
                className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                <option value="">Select student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.roll_number} (Year {s.year})
                  </option>
                ))}
              </select>
              {selectedStudent && (
                <p className="text-zinc-600 text-xs">
                  Year {selectedStudent.year} student · auto-filled semester {autoSemester(selectedStudent.year)}
                </p>
              )}
            </div>

            {/* Semester + SGPA side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Semester</Label>
                <select
                  value={form.semester}
                  onChange={e => setField('semester', e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="">Select...</option>
                  {[1,2,3,4,5,6,7,8].map(s => (
                    <option key={s} value={s}>Sem {s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">SGPA (0–10)</Label>
                <Input
                  value={form.sgpa}
                  onChange={e => setField('sgpa', e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="e.g. 8.5"
                  type="number"
                  min="0" max="10" step="0.01"
                />
              </div>
            </div>

            {/* Academic year */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Academic Year</Label>
              <Input
                value={form.academic_year}
                onChange={e => setField('academic_year', e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                placeholder="e.g. 2024-25"
              />
              <p className="text-zinc-600 text-xs">Auto-filled to current academic year. Edit if needed.</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              onClick={save}
              disabled={saving}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-light tracking-widest uppercase text-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SGPA Table */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {['Student', 'Roll No', 'Semester', 'SGPA', 'Academic Year', ''].map(h => (
                    <TableHead key={h} className="text-muted-foreground text-xs tracking-widest uppercase">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <BarChart2 size={40} className="text-muted-foreground/40" />
                        <p className="text-foreground text-sm font-medium">No results added yet</p>
                        <p className="text-muted-foreground text-xs tracking-wide">Click "+ Add SGPA" to add the first result</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : results.map(r => (
                  <TableRow key={r.id} className="border-border hover:bg-muted">
                    <TableCell className="text-foreground text-sm">{r.student_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.roll_number}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">Sem {r.semester}</TableCell>
                    <TableCell className={`text-sm font-medium ${sgpaColor(r.sgpa)}`}>{r.sgpa}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.academic_year}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => openEdit(r)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
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
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-3">CGPA Summary</p>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {['Student', 'Roll No', 'Semesters', 'CGPA'].map(h => (
                      <TableHead key={h} className="text-muted-foreground text-xs tracking-widest uppercase">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cgpaSummary.map((s, idx) => (
                    <TableRow key={s.student_id} className="border-border hover:bg-muted">
                      <TableCell className="text-foreground text-sm">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <span className="text-yellow-400 text-xs">★</span>}
                          {s.student_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.roll_number}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.semesters}</TableCell>
                      <TableCell className={`text-sm font-semibold ${cgpaColor(s.cgpa)}`}>{s.cgpa}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
