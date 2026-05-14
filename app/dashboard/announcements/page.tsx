'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Megaphone, CheckCircle } from 'lucide-react';

type Announcement = {
  id: number; title: string; content: string; type: string;
  year?: number; created_at: string; posted_by_name?: string;
};

const TYPES = [
  { value: 'general', label: 'General (All Years)' },
  { value: 'year_specific', label: 'Year Specific' },
];

const MAX_CONTENT_LENGTH = 1000;

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [year, setYear] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [general, y1, y2, y3, y4] = await Promise.all([
        api.get('/announcements/general'),
        api.get('/announcements/year/1'),
        api.get('/announcements/year/2'),
        api.get('/announcements/year/3'),
        api.get('/announcements/year/4'),
      ]);
      const all = [...general.data, ...y1.data, ...y2.data, ...y3.data, ...y4.data];
      // deduplicate by id and sort by date
      const unique = Array.from(new Map(all.map(a => [a.id, a])).values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(unique);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  const create = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/announcements', {
        title: title.trim(),
        content: content.trim(),
        type,
        year: type === 'year_specific' ? parseInt(year) : null,
      });
      setTitle(''); setContent(''); setType('general'); setYear('1');
      setOpen(false);
      await load();
      showSuccess('Announcement posted!');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to post');
    }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    setItems(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">Announcements</h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
          <DialogTrigger className="flex items-center gap-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs tracking-widest uppercase font-light px-4 py-2 rounded-md transition-colors">
            <Plus size={14} /> New
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground font-light tracking-widest uppercase">New Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Type</Label>
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {type === 'year_specific' && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs tracking-widest uppercase">Year</Label>
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600">
                    {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  placeholder="Announcement title" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs tracking-widest uppercase">Content</Label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
                  maxLength={MAX_CONTENT_LENGTH}
                  className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-muted-foreground"
                  placeholder="Write the announcement..." />
                <p className={`text-xs text-right tabular-nums ${
                  content.length >= MAX_CONTENT_LENGTH
                    ? 'text-red-400'
                    : content.length > MAX_CONTENT_LENGTH * 0.8
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'
                }`}>
                  {content.length} / {MAX_CONTENT_LENGTH}
                </p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button onClick={create} disabled={saving}
                className="w-full bg-foreground text-background hover:bg-foreground/90 font-light tracking-widest uppercase text-sm">
                {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                {saving ? 'Posting...' : 'Post Announcement'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inline success banner */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-900/30 border border-green-800 text-green-300 text-sm tracking-wide flex items-center gap-2">
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <Megaphone size={40} className="text-muted-foreground/40" />
            <p className="text-foreground text-sm font-medium">No announcements yet</p>
            <p className="text-muted-foreground text-xs tracking-wide">Click "+ New" to post the first announcement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <Card key={a.id} className="bg-card border-border">
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex gap-3 min-w-0">
                  <Megaphone size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-foreground font-medium text-sm">{a.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded border tracking-wider uppercase ${
                        a.type === 'general'
                          ? 'bg-blue-900 text-blue-300 border-blue-800'
                          : 'bg-purple-900 text-purple-300 border-purple-800'
                      }`}>
                        {a.type === 'general' ? 'General' : `Year ${a.year}`}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{a.content}</p>
                    <p className="text-zinc-600 text-xs mt-2">
                      {a.posted_by_name && `${a.posted_by_name} · `}
                      {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-zinc-600 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                  <Trash2 size={15} />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
