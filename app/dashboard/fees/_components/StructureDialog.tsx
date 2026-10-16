'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { fmtINR, paiseToRupees, rupeesToPaise, toDateInput } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { Loader2, Lock, Plus, X } from 'lucide-react';
import { currentAcademicYear, errorText, type FeeStructure } from './types';

type ItemRow = { key: number; label: string; amount: string };
type Form = {
  title: string; academic_year: string; year: string; semester: string;
  due_date: string; late_fee: string; is_active: boolean; items: ItemRow[];
};

let nextKey = 1;
const blankItem = (): ItemRow => ({ key: nextKey++, label: '', amount: '' });

const formFor = (s: FeeStructure | null): Form => s ? {
  title: s.title,
  academic_year: s.academic_year,
  year: String(s.year),
  semester: s.semester ? String(s.semester) : '',
  due_date: toDateInput(s.due_date),
  late_fee: s.late_fee_paise ? paiseToRupees(s.late_fee_paise) : '',
  is_active: s.is_active,
  items: s.items.length ? s.items.map(i => ({ key: nextKey++, label: i.label, amount: paiseToRupees(i.amount_paise) })) : [blankItem()],
} : {
  title: '', academic_year: currentAcademicYear(), year: '', semester: '',
  due_date: '', late_fee: '', is_active: true, items: [blankItem()],
};

const YEARS = ['1', '2', '3', '4'].map(y => ({ value: y, label: `Year ${y}` }));
const SEMESTERS = [{ value: '', label: 'Not tied to a semester' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: `Semester ${n}` }))];

// Create a fee structure, or edit one. Once published, invoices exist at the
// published amounts, so items, year, semester and academic year are locked
// and only the title, due date, late fee and active flag are sent.
export function StructureDialog({
  open,
  structure,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  structure: FeeStructure | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  // The parent remounts this per structure (key), so the form starts fresh.
  const [form, setForm] = useState<Form>(() => formFor(structure));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const locked = !!structure?.published_at;
  const editing = !!structure;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (key: number, patch: Partial<ItemRow>) =>
    setForm(f => ({ ...f, items: f.items.map(i => (i.key === key ? { ...i, ...patch } : i)) }));

  const itemPaise = form.items.map(i => rupeesToPaise(i.amount));
  const total = itemPaise.reduce<number>((s, p) => s + (p ?? 0), 0);

  const validate = (): string | null => {
    if (form.title.trim().length < 3) return 'Title is required';
    if (!/^\d{4}-\d{2}$/.test(form.academic_year.trim())) return 'Academic year looks like 2026-27';
    if (!form.year) return 'Year must be 1 to 4';
    if (!form.due_date) return 'Due date is required';
    if (form.late_fee.trim() && rupeesToPaise(form.late_fee) === null) return 'Late fee must be an amount in rupees';
    if (!locked) {
      if (form.items.length === 0) return 'Add at least one fee item';
      if (form.items.some((i, idx) => !i.label.trim() || itemPaise[idx] === null)) return 'Each item needs a label and an amount';
      if (total <= 0) return 'Total must be more than zero';
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError('');
    setSaving(true);
    const base = {
      title: form.title.trim(),
      due_date: form.due_date,
      late_fee_paise: rupeesToPaise(form.late_fee) ?? 0,
    };
    const payload = locked
      ? { ...base, is_active: form.is_active }
      : {
          ...base,
          academic_year: form.academic_year.trim(),
          year: Number(form.year),
          semester: form.semester ? Number(form.semester) : null,
          items: form.items.map((i, idx) => ({ label: i.label.trim(), amount_paise: itemPaise[idx] as number })),
          ...(editing ? { is_active: form.is_active } : {}),
        };
    try {
      if (editing) await api.put(`/fees/structures/${structure.id}`, payload);
      else await api.post('/fees/structures', payload);
      toast.success(editing ? 'Fee structure saved' : 'Fee structure created');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e, 'Failed to save the fee structure'));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit fee structure' : 'New fee structure'}</DialogTitle>
          {locked && (
            <DialogDescription className="flex items-start gap-1.5">
              <Lock size={13} className="mt-0.5 shrink-0" />
              Published — invoices exist, so amounts, year and academic year can&apos;t change.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Title" htmlFor="fee-title">
            <Input id="fee-title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Tuition fee — Semester 5" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Academic year" htmlFor="fee-ay">
              <Input id="fee-ay" value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="2026-27" disabled={locked} />
            </FormField>
            <FormField label="Year" htmlFor="fee-year">
              <SelectField id="fee-year" value={form.year} onValueChange={v => set('year', v)} options={YEARS} placeholder="Select year" disabled={locked} />
            </FormField>
          </div>
          <FormField label="Semester (optional)" htmlFor="fee-sem">
            <SelectField id="fee-sem" value={form.semester} onValueChange={v => set('semester', v)} options={SEMESTERS} disabled={locked} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Due date" htmlFor="fee-due">
              <Input id="fee-due" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className="dark:[color-scheme:dark]" />
            </FormField>
            <FormField label="Late fee (₹)" htmlFor="fee-late" hint="Added once, the day after the due date">
              <Input id="fee-late" inputMode="decimal" value={form.late_fee} onChange={e => set('late_fee', e.target.value)} placeholder="0" />
            </FormField>
          </div>

          <div className="space-y-2">
            <p className="label">Items</p>
            {form.items.map((item, idx) => (
              <div key={item.key} className="flex items-center gap-2">
                <Input
                  value={item.label}
                  onChange={e => setItem(item.key, { label: e.target.value })}
                  placeholder="e.g. Tuition"
                  aria-label={`Item ${idx + 1} label`}
                  disabled={locked}
                />
                <Input
                  value={item.amount}
                  onChange={e => setItem(item.key, { amount: e.target.value })}
                  inputMode="decimal"
                  placeholder="₹ 0"
                  aria-label={`Item ${idx + 1} amount in rupees`}
                  aria-invalid={item.amount.trim() !== '' && itemPaise[idx] === null ? true : undefined}
                  className="w-32 text-right tabular-nums"
                  disabled={locked}
                />
                {!locked && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setForm(f => ({ ...f, items: f.items.filter(i => i.key !== item.key) }))}
                    disabled={form.items.length === 1}
                    aria-label={`Remove item ${idx + 1}`}
                    className="text-muted-foreground"
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              {!locked ? (
                <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, blankItem()] }))} className="-ml-2">
                  <Plus /> Add item
                </Button>
              ) : <span />}
              <p className="text-sm text-muted-foreground">
                Total <span className="ml-1 font-medium text-foreground tabular-nums">{fmtINR(total)}</span>
              </p>
            </div>
          </div>

          {editing && (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
              <span>
                <span className="block text-sm text-foreground">Active</span>
                <span className="block text-xs text-muted-foreground">Inactive structures can&apos;t be published and send no reminders.</span>
              </span>
              <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create fee structure'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
