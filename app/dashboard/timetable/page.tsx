'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Clock } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Lecture = {
  id: number; subject_name: string; professor_name: string;
  day: string; start_time: string; end_time: string; room?: string;
};

export default function TimetablePage() {
  const [items, setItems] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState('1');
  const [form, setForm] = useState({
    custom_subject_name: '', faculty_name: '',
    day: 'Monday', start_time: '09:00', end_time: '10:00', room: '',
  });

  const loadTimetable = async (y: string) => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/timetable/year/${y}`);
      setItems(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load timetable');
    }
    setLoading(false);
  };

  useEffect(() => { loadTimetable(year); }, [year]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.custom_subject_name.trim()) { setError('Subject name is required'); return; }
    if (!form.start_time) { setError('Start time is required'); return; }
    if (!form.end_time) { setError('End time is required'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/timetable', {
        custom_subject_name: form.custom_subject_name.trim(),
        year: parseInt(year),
        day: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room.trim() || null,
      });
      setForm({ custom_subject_name: '', faculty_name: '', day: 'Monday', start_time: '09:00', end_time: '10:00', room: '' });
      setOpen(false);
      await loadTimetable(year);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add');
    }
    setSaving(false);
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/timetable/${id}`);
      setItems(prev => prev.filter(l => l.id !== id));
    } catch {
      setError('Failed to delete lecture. Please try again.');
    }
  };

  const byDay = DAYS.map(d => ({ day: d, lectures: items.filter(l => l.day === d) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">Timetable</h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
          <DialogTrigger className="flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs tracking-widest uppercase font-light px-4 py-2 rounded-md transition-colors">
            <Plus size={14} /> Add Lecture
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground font-light tracking-widest uppercase">
                Add Lecture — Year {year}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Subject Name</Label>
                <input
                  value={form.custom_subject_name}
                  onChange={e => set('custom_subject_name', e.target.value)}
                  placeholder="e.g. Data Structures, DBMS, Mathematics..."
                  className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Day</Label>
                <select value={form.day} onChange={e => set('day', e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Start Time', key: 'start_time' }, { label: 'End Time', key: 'end_time' }].map(({ label, key }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-muted-foreground text-xs tracking-widest uppercase">{label}</Label>
                    <input
                      type="time"
                      value={(form as any)[key]}
                      onChange={e => set(key, e.target.value)}
                      onBlur={e => { if (!e.target.value) set(key, key === 'start_time' ? '09:00' : '10:00'); }}
                      className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 [color-scheme:dark]"
                    />
                    <p className="text-zinc-600 text-xs">{(form as any)[key] || 'Not set'}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Room (optional)</Label>
                <input value={form.room} onChange={e => set('room', e.target.value)}
                  placeholder="e.g. CT-301"
                  className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-muted-foreground" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button onClick={create} disabled={saving}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-light tracking-widest uppercase text-sm">
                {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                {saving ? 'Saving...' : 'Add Lecture'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && !open && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm tracking-wide">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {['1', '2', '3', '4'].map(y => (
          <button key={y} onClick={() => setYear(y)}
            className={`px-4 py-1.5 rounded-md text-sm border transition-colors ${
              year === y
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-border'
            }`}>
            Year {y}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          {byDay.map(({ day, lectures }) => lectures.length > 0 && (
            <Card key={day} className="bg-card border-border">
              <CardContent className="py-4">
                <p className="text-muted-foreground text-xs tracking-widest uppercase mb-3">{day}</p>
                <div className="space-y-2">
                  {lectures.map(l => (
                    <div key={l.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 text-zinc-600 text-xs w-28 shrink-0">
                          <Clock size={11} />
                          <span>{l.start_time} – {l.end_time}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-foreground text-sm">{l.subject_name}</span>
                          {l.professor_name && (
                            <span className="text-zinc-500 text-xs ml-2">· {l.professor_name}</span>
                          )}
                          {l.room && (
                            <span className="text-zinc-600 text-xs ml-2">· {l.room}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => remove(l.id)}
                        className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-4">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center text-muted-foreground tracking-wider uppercase text-sm">
                No lectures for Year {year}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
