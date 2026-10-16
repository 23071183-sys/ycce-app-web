// Money is whole paise throughout. Sums the API computes as bigint arrive as
// strings, so read every amount through Number().

export type FeeItem = { id?: number; label: string; amount_paise: number };

export type FeeStructure = {
  id: number;
  title: string;
  academic_year: string;
  year: number;
  semester: number | null;
  due_date: string;
  late_fee_paise: number;
  is_active: boolean;
  published_at: string | null;
  total_paise: number;
  items: FeeItem[];
  invoices: number;
  settled: number;
  expected_paise: number | string;
  collected_paise: number | string;
};

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'waived' | 'cancelled';

export type Invoice = {
  id: number;
  status: InvoiceStatus;
  amount_due_paise: number;
  amount_paid_paise: number;
  waive_note: string | null;
  student_id: number;
  name: string;
  roll_number: string | null;
  email: string;
  last_paid_at: string | null;
};

export const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 6
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}
