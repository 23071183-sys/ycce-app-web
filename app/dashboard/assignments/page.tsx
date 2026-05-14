'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, ChevronDown, ChevronUp, FileText, Clock, Users } from 'lucide-react';

type Subject = { id: number; name: string; code: string; year: number };
type Assignment = {
  id: number; title: string; description: string | null;
  due_date: string; subject_id: number; posted_by_name: string;
  file_url: string | null; file_name: string | null;
  created_at: string;
};
type Submission = {
  id: number; student_name: string; roll_number: string;
  content: string | null; file_url: string | null; file_name: string | null;
  submitted_at: string; grade: string | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(due: string) {
  return new Date(due) < new Date();
}

export default function AssignmentsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Record<number, Submission[]>>({});
  const [loadingSubs, setLoadingSubs] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', subject_id: '', due_date: '',
  });

  useEffect(() => {
    api.get('/admin/subjects').then(r => {
      setSubjects(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!subjectId) { setAssignments([]); return; }
    api.get(`/assignments/subject/${subjectId}`).then(r => setAssignments(r.data)).catch(() => {});
  }, [subjectId]);

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredSubjects = yearFilter === 'all' ? subjects : subjects.filter(s => String(s.year) === yearFilter);

  const create = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.subject_id) { setError('Select a subject'); return; }
    if (!form.due_date) { setError('Due date is required'); return; }
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('subject_id', form.subject_id);
      fd.append('due_date', form.due_date);
      if (form.description.trim()) fd.append('description', form.description.trim());
      if (file) fd.append('file', file);
      await api.post('/assignments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ title: '', description: '', subject_id: '', due_date: '' });
      setFile(null);
      setOpen(false);
      if (form.subject_id === subjectId) {
        const r = await api.get(`/assignments/subject/${subjectId}`);
        setAssignments(r.data);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create');
    }
    setSaving(false);
  };

  const toggleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!submissions[id]) {
      setLoadingSubs(id);
      try {
        const r = await api.get(`/assignments/${id}/submissions`);
        setSubmissions(prev => ({ ...prev, [id]: r.data }));
      } catch {}
      setLoadingSubs(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">Assignments</h1>
        <button
          onClick={() => { setOpen(true); setError(''); }}
          className="flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs tracking-widest uppercase font-light px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={14} /> New Assignment
        </button>
      </div>

      <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground font-light tracking-widest uppercase">New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Subject</Label>
              <select
                value={form.subject_id}
                onChange={e => setField('subject_id', e.target.value)}
                className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                <option value="">Select subject...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — Year {s.year}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Title</Label>
              <Input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                placeholder="e.g. Unit Test 1 Preparation"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Description (optional)</Label>
              <textarea
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
                className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-muted-foreground"
                placeholder="Instructions or details..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Due Date & Time</Label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={e => setField('due_date', e.target.value)}
                className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs tracking-widest uppercase">Attachment (optional)</Label>
              <label className="flex items-center gap-3 w-full bg-muted border border-dashed border-border rounded-md px-3 py-3 cursor-pointer hover:bg-card transition-colors">
                <FileText size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {file ? file.name : 'Click to attach a PDF or file'}
                </span>
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              {file && (
                <button onClick={() => setFile(null)} className="text-xs text-red-400 hover:text-red-300">
                  ✕ Remove
                </button>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
              onClick={create}
              disabled={saving}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-light tracking-widest uppercase text-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              {saving ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Year + Subject filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all','1','2','3','4'].map(y => (
          <button key={y} onClick={() => { setYearFilter(y); setSubjectId(''); setAssignments([]); }}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              yearFilter === y
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}>
            {y === 'all' ? 'All Years' : `Year ${y}`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {loading ? (
          <div className="col-span-3 flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : filteredSubjects.length === 0 ? (
          <Card className="col-span-3 bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground tracking-wider uppercase text-sm">
              No subjects found
            </CardContent>
          </Card>
        ) : filteredSubjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSubjectId(String(s.id))}
            className={`text-left rounded-lg border p-4 transition-colors ${
              subjectId === String(s.id)
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card border-border hover:bg-muted text-foreground'
            }`}
          >
            <p className="font-medium text-sm">{s.name}</p>
            <p className={`text-xs mt-0.5 ${subjectId === String(s.id) ? 'opacity-70' : 'text-muted-foreground'}`}>
              {s.code} · Year {s.year}
            </p>
          </button>
        ))}
      </div>

      {!subjectId ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground tracking-wider uppercase text-sm">
            Select a subject to view assignments
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center text-muted-foreground tracking-wider uppercase text-sm">
            No assignments for this subject
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const overdue = isOverdue(a.due_date);
            const subs = submissions[a.id] || [];
            const isExpanded = expanded === a.id;
            return (
              <Card key={a.id} className="bg-card border-border">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <p className="text-foreground font-medium text-sm">{a.title}</p>
                        {overdue && (
                          <span className="text-xs px-2 py-0.5 rounded border bg-red-900/30 text-red-400 border-red-800 tracking-wider uppercase">
                            Overdue
                          </span>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed ml-5 mb-2">{a.description}</p>
                      )}
                      <div className="flex items-center gap-4 ml-5 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} />
                          <span>Due: {fmt(a.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users size={11} />
                          <span>{subs.length} submissions</span>
                        </div>
                        {a.file_url && (
                          <a href={a.file_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                            <FileText size={11} />
                            <span>{a.file_name || 'Attachment'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(a.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      {loadingSubs === a.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      }
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      {subs.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4 tracking-wider uppercase">No submissions yet</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              {['Student', 'Roll No', 'Note', 'File', 'Submitted At'].map(h => (
                                <TableHead key={h} className="text-muted-foreground text-xs tracking-widest uppercase">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subs.map(sub => (
                              <TableRow key={sub.id} className="border-border hover:bg-muted">
                                <TableCell className="text-foreground text-sm">{sub.student_name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{sub.roll_number}</TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                  {sub.content || '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {sub.file_url
                                    ? <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs">{sub.file_name || 'View'}</a>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{fmt(sub.submitted_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
