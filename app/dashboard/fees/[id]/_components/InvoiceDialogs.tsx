'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { fmtINR, paiseToRupees, rupeesToPaise } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { Loader2 } from 'lucide-react';
import { errorText, type Invoice } from '../../_components/types';

const outstanding = (inv: Invoice) => Math.max(0, Number(inv.amount_due_paise) - Number(inv.amount_paid_paise));

// Cash or cheque handed in at the office. Defaults to the full balance.
// The parent remounts this per invoice (key), so the form starts fresh.
export function OfflinePaymentDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(() => (invoice ? paiseToRupees(outstanding(invoice)) : ''));
  const [method, setMethod] = useState<'cash' | 'cheque'>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!invoice) return;
    const paise = rupeesToPaise(amount);
    if (!paise) { setError('Enter the amount received'); return; }
    if (paise > outstanding(invoice)) { setError('That is more than the amount outstanding'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post(`/fees/invoices/${invoice.id}/offline-payment`, { amount_paise: paise, method, note: note.trim() || undefined });
      toast.success(`Recorded ${fmtINR(paise)} from ${invoice.name}`);
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e, 'Failed to record the payment'));
    }
    setSaving(false);
  };

  return (
    <Dialog open={invoice !== null} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                {invoice.name}{invoice.roll_number ? ` · ${invoice.roll_number}` : ''} — {fmtINR(outstanding(invoice))} outstanding
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Amount (₹)" htmlFor="pay-amount">
                  <Input id="pay-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="tabular-nums" />
                </FormField>
                <FormField label="Method" htmlFor="pay-method">
                  <SelectField
                    id="pay-method"
                    value={method}
                    onValueChange={v => setMethod(v === 'cheque' ? 'cheque' : 'cash')}
                    options={[{ value: 'cash', label: 'Cash' }, { value: 'cheque', label: 'Cheque' }]}
                  />
                </FormField>
              </div>
              <FormField label="Note (optional)" htmlFor="pay-note">
                <Input id="pay-note" value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder={method === 'cheque' ? 'e.g. Cheque 004512, SBI' : 'e.g. Paid at the office'} />
              </FormField>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? <Loader2 className="animate-spin" /> : null}
                {saving ? 'Recording...' : 'Record payment'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Close an invoice without payment. The reason is kept on the invoice.
export function WaiveDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!invoice) return;
    if (note.trim().length < 3) { setError('Give a reason for the waiver'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post(`/fees/invoices/${invoice.id}/waive`, { note: note.trim() });
      toast.success(`Waived the fee for ${invoice.name}`);
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e, 'Failed to waive the fee'));
    }
    setSaving(false);
  };

  return (
    <Dialog open={invoice !== null} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle>Waive fee</DialogTitle>
              <DialogDescription>
                {invoice.name} won&apos;t owe the remaining {fmtINR(outstanding(invoice))}. Payments already made are kept.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormField label="Reason" htmlFor="waive-note">
                <Textarea
                  id="waive-note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="min-h-20 resize-none field-sizing-fixed"
                  placeholder="e.g. Scholarship — merit, approved by the principal"
                />
              </FormField>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button variant="destructive" onClick={save} disabled={saving} className="w-full">
                {saving ? <Loader2 className="animate-spin" /> : null}
                {saving ? 'Waiving...' : 'Waive fee'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
