'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toDateInput } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { Bell, Loader2, Plus, X } from 'lucide-react';
import { errorText, type Drive } from './types';

type RoundRow = { key: number; name: string; date: string };
type Form = {
  company: string; role: string; package_lpa: string; location: string; eligibility_cgpa: string;
  branches: string; description: string; apply_url: string;
  apply_deadline: string; drive_date: string; end_date: string;
  rounds: RoundRow[]; status_override: string;
  selected_count: string; selected_names: string; outcome_notes: string;
};

let nextKey = 1;
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

const formFor = (d: Drive | null): Form => ({
  company: str(d?.company),
  role: str(d?.role),
  package_lpa: d?.package_lpa != null ? String(Number(d.package_lpa)) : '',
  location: str(d?.location),
  eligibility_cgpa: d?.eligibility_cgpa != null ? String(Number(d.eligibility_cgpa)) : '',
  branches: (d?.branches || []).join(', '),
  description: str(d?.description),
  apply_url: str(d?.apply_url),
  apply_deadline: toDateInput(d?.apply_deadline),
  drive_date: toDateInput(d?.drive_date),
  end_date: toDateInput(d?.end_date),
  rounds: (d?.rounds || []).map(r => ({ key: nextKey++, name: r.name || '', date: toDateInput(r.date) })),
  status_override: str(d?.status_override),
  selected_count: d?.selected_count != null ? String(d.selected_count) : '',
  selected_names: str(d?.selected_names),
  outcome_notes: str(d?.outcome_notes),
});

const STATUS_OPTIONS = [
  { value: '', label: 'From the dates' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'finished', label: 'Finished' },
];

// Add or edit a placement drive. Text left blank is sent as null.
export function DriveDialog({
  open,
  drive,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  drive: Drive | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  // The parent remounts this per drive (key), so the form starts fresh.
  const [form, setForm] = useState<Form>(() => formFor(drive));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = !!drive;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const setRound = (key: number, patch: Partial<RoundRow>) =>
    setForm(f => ({ ...f, rounds: f.rounds.map(r => (r.key === key ? { ...r, ...patch } : r)) }));

  const validate = (): string | null => {
    if (!form.company.trim()) return 'Company is required';
    if (!form.role.trim()) return 'Role is required';
    if (form.package_lpa.trim() && !(Number(form.package_lpa) >= 0 && Number(form.package_lpa) < 10000)) return 'Package must be a number (LPA)';
    if (form.eligibility_cgpa.trim() && !(Number(form.eligibility_cgpa) >= 0 && Number(form.eligibility_cgpa) <= 10)) return 'CGPA cut-off must be 0 to 10';
    if (form.apply_url.trim() && !/^https?:\/\/\S+$/i.test(form.apply_url.trim())) return 'Apply link must start with http:// or https://';
    if (form.rounds.some(r => !r.name.trim() && r.date)) return 'Each round needs a name';
    if (form.selected_count.trim() && !(Number.isInteger(Number(form.selected_count)) && Number(form.selected_count) >= 0)) return 'Selected count must be a whole number';
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError('');
    setSaving(true);
    const text = (s: string) => (s.trim() ? s.trim() : null);
    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      package_lpa: form.package_lpa.trim() ? Number(form.package_lpa) : null,
      location: text(form.location),
      eligibility_cgpa: form.eligibility_cgpa.trim() ? Number(form.eligibility_cgpa) : null,
      branches: form.branches.split(',').map(b => b.trim()).filter(Boolean),
      description: text(form.description),
      apply_url: text(form.apply_url),
      apply_deadline: form.apply_deadline || null,
      drive_date: form.drive_date || null,
      end_date: form.end_date || null,
      rounds: form.rounds.filter(r => r.name.trim()).map(r => ({ name: r.name.trim(), ...(r.date ? { date: r.date } : {}) })),
      status_override: form.status_override || null,
      selected_count: form.selected_count.trim() ? Number(form.selected_count) : null,
      selected_names: text(form.selected_names),
      outcome_notes: text(form.outcome_notes),
    };
    try {
      if (editing) await api.put(`/placements/${drive.id}`, payload);
      else await api.post('/placements', payload);
      toast.success(editing ? 'Drive saved' : 'Drive added — eligible students have been notified');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e, 'Failed to save the drive'));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit placement drive' : 'New placement drive'}</DialogTitle>
          {!editing && (
            <DialogDescription className="flex items-start gap-1.5">
              <Bell size={13} className="mt-0.5 shrink-0" />
              Saving sends a push notification to every student who meets the CGPA cut-off (and those with no SGPA on record yet).
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Company" htmlFor="pl-company">
              <Input id="pl-company" value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Persistent Systems" />
            </FormField>
            <FormField label="Role" htmlFor="pl-role">
              <Input id="pl-role" value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Software Engineer Trainee" />
            </FormField>
            <FormField label="Package (LPA)" htmlFor="pl-package">
              <Input id="pl-package" inputMode="decimal" value={form.package_lpa} onChange={e => set('package_lpa', e.target.value)} placeholder="e.g. 6.5" />
            </FormField>
            <FormField label="Location" htmlFor="pl-location">
              <Input id="pl-location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Pune / Remote" />
            </FormField>
            <FormField label="CGPA cut-off" htmlFor="pl-cgpa" hint="0 to 10; blank for none">
              <Input id="pl-cgpa" inputMode="decimal" value={form.eligibility_cgpa} onChange={e => set('eligibility_cgpa', e.target.value)} placeholder="e.g. 7" />
            </FormField>
            <FormField label="Branches" htmlFor="pl-branches" hint="Comma-separated">
              <Input id="pl-branches" value={form.branches} onChange={e => set('branches', e.target.value)} placeholder="CT, CSE, IT" />
            </FormField>
          </div>
          <FormField label="Apply link" htmlFor="pl-url">
            <Input id="pl-url" type="url" value={form.apply_url} onChange={e => set('apply_url', e.target.value)} placeholder="https://…" />
          </FormField>
          <FormField label="Description" htmlFor="pl-desc">
            <Textarea id="pl-desc" value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="min-h-20 resize-none field-sizing-fixed" placeholder="Eligibility, bond, documents to carry…" />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Apply by" htmlFor="pl-deadline">
              <Input id="pl-deadline" type="date" value={form.apply_deadline} onChange={e => set('apply_deadline', e.target.value)} className="dark:[color-scheme:dark]" />
            </FormField>
            <FormField label="Drive date" htmlFor="pl-drive">
              <Input id="pl-drive" type="date" value={form.drive_date} onChange={e => set('drive_date', e.target.value)} className="dark:[color-scheme:dark]" />
            </FormField>
            <FormField label="End date" htmlFor="pl-end">
              <Input id="pl-end" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="dark:[color-scheme:dark]" />
            </FormField>
          </div>

          <div className="space-y-2">
            <p className="label">Rounds</p>
            {form.rounds.length === 0 && <p className="text-xs text-muted-foreground">No rounds listed.</p>}
            {form.rounds.map((r, idx) => (
              <div key={r.key} className="flex items-center gap-2">
                <Input value={r.name} onChange={e => setRound(r.key, { name: e.target.value })} placeholder="e.g. Aptitude test" aria-label={`Round ${idx + 1} name`} />
                <Input type="date" value={r.date} onChange={e => setRound(r.key, { date: e.target.value })} aria-label={`Round ${idx + 1} date`} className="w-40 dark:[color-scheme:dark]" />
                <Button variant="ghost" size="icon-sm" onClick={() => setForm(f => ({ ...f, rounds: f.rounds.filter(x => x.key !== r.key) }))} aria-label={`Remove round ${idx + 1}`} className="text-muted-foreground">
                  <X />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setForm(f => ({ ...f, rounds: [...f.rounds, { key: nextKey++, name: '', date: '' }] }))}>
              <Plus /> Add round
            </Button>
          </div>

          <FormField label="Status" htmlFor="pl-status" hint="Normally worked out from the drive and end dates">
            <SelectField id="pl-status" value={form.status_override} onValueChange={v => set('status_override', v)} options={STATUS_OPTIONS} />
          </FormField>

          <Separator />
          <div className="space-y-3">
            <p className="label">Outcome <span className="normal-case tracking-normal">(after the drive)</span></p>
            <FormField label="Students selected" htmlFor="pl-selected">
              <Input id="pl-selected" inputMode="numeric" value={form.selected_count} onChange={e => set('selected_count', e.target.value)} className="w-32" />
            </FormField>
            <FormField label="Selected students" htmlFor="pl-names">
              <Textarea id="pl-names" value={form.selected_names} onChange={e => set('selected_names', e.target.value)} rows={2} className="min-h-16 resize-none field-sizing-fixed" placeholder="Names, one per line or comma-separated" />
            </FormField>
            <FormField label="Notes" htmlFor="pl-notes">
              <Textarea id="pl-notes" value={form.outcome_notes} onChange={e => set('outcome_notes', e.target.value)} rows={2} className="min-h-16 resize-none field-sizing-fixed" />
            </FormField>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add drive and notify students'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
