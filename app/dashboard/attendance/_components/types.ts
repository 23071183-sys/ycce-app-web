export type Subject = { id: number; name: string; code: string; year: number };
export type StudentRow = { id: number; name: string; roll_number: string; status: string | null };
export type DayData = { date: string; present: number; absent: number; total: number };
export type SummaryRow = { student_id: number; student_name: string; roll_number: string; present: number; total: number; percentage: number };
export type StudentDetail = {
  summary: { name: string; roll_number: string; present_count: number; total_count: number; percentage: string };
  records: { date: string; status: string }[];
};
