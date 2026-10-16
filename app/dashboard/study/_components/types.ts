export type Subject = { id: number; name: string; code?: string | null; year: number };

export type ExamType = 'MSE1' | 'MSE2' | 'RE_MSE' | 'ESE';
export const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'MSE1', label: 'MSE 1' },
  { value: 'MSE2', label: 'MSE 2' },
  { value: 'RE_MSE', label: 'RE-MSE' },
  { value: 'ESE', label: 'ESE' },
];
export const examLabel = (t: string) => EXAM_TYPES.find(e => e.value === t)?.label ?? t;

export type ExtractStatus = 'pending' | 'processing' | 'done' | 'failed';
export type Paper = {
  id: number;
  subject_id: number;
  subject_name: string;
  code: string | null;
  year: number;
  exam_type: ExamType;
  academic_year: string | null;
  file_url: string;
  file_name: string | null;
  extract_status: ExtractStatus;
  extract_error: string | null;
  question_count: number;
  uploaded_by_name: string | null;
  created_at: string;
};

export type Question = { id: number; question: string; marks: number | string | null; topic: string | null };

export type Exam = {
  id: number;
  subject_id: number;
  subject_name: string;
  code: string | null;
  year: number;
  exam_type: ExamType;
  exam_date: string;
  start_time: string | null;
  room: string | null;
  academic_year: string | null;
};

export const subjectLabel = (s: { name: string; code?: string | null; year: number }) =>
  `${s.code ? `${s.code} — ` : ''}${s.name} (Year ${s.year})`;

export const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
export const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;

export function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 6
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}
