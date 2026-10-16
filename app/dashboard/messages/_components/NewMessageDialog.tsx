'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SelectField } from '@/components/shared/SelectField';
import { EmptyState } from '@/components/shared/EmptyState';
import { Loader2, Search } from 'lucide-react';
import { initials, personLine, type Person } from './types';

const YEARS = [
  { value: '', label: 'All years' },
  ...['1', '2', '3', '4'].map(y => ({ value: y, label: `Year ${y}` })),
];

// Pick someone to message. The server decides who is reachable: admins see
// every student, professors the students in the years they teach.
export function NewMessageDialog({
  open,
  onOpenChange,
  onPick,
  starting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (person: Person) => void;
  starting: number | null;
}) {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [contacts, setContacts] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced so each keystroke doesn't hit the API.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      api.get('/messages/contacts', { params: { q: q.trim() || undefined, year: year || undefined } })
        .then(r => { if (!cancelled) { setContacts(r.data); setError(''); } })
        .catch(e => { if (!cancelled) setError(e?.response?.data?.error || 'Could not load contacts'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, q, year]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Find a student by name or roll number.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              aria-label="Search contacts"
              className="pl-8"
              autoFocus
            />
          </div>
          <SelectField value={year} onValueChange={setYear} options={YEARS} className="w-32" aria-label="Year" />
        </div>
        <div className="-mx-2 max-h-80 min-h-40 overflow-y-auto">
          {error ? (
            <p className="px-2 py-6 text-center text-sm text-destructive">{error}</p>
          ) : loading && contacts.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : contacts.length === 0 ? (
            <EmptyState className="py-10" title="No one found" message="Try another name, or clear the year filter." />
          ) : (
            <ul className="space-y-0.5">
              {contacts.map(p => (
                <li key={p.id}>
                  <Button
                    variant="ghost"
                    onClick={() => onPick(p)}
                    disabled={starting !== null}
                    className="h-auto w-full justify-start gap-3 px-2 py-2 text-left font-normal"
                  >
                    <Avatar className="size-8">
                      {p.avatar_url ? <AvatarImage src={p.avatar_url} alt="" /> : null}
                      <AvatarFallback className="text-xs font-medium text-foreground">{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{personLine(p)}</span>
                    </span>
                    {starting === p.id && <Loader2 className="animate-spin text-muted-foreground" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
