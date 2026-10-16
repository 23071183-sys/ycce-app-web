export type Round = { name: string; date?: string | null };
export type DriveStatus = 'upcoming' | 'ongoing' | 'finished';

// NUMERIC columns (package, cut-off) arrive as strings; DATE columns as ISO
// timestamps.
export type Drive = {
  id: number;
  company: string;
  role: string;
  package_lpa: string | number | null;
  location: string | null;
  eligibility_cgpa: string | number | null;
  branches: string[];
  description: string | null;
  apply_url: string | null;
  apply_deadline: string | null;
  drive_date: string | null;
  end_date: string | null;
  rounds: Round[];
  status_override: DriveStatus | null;
  status: DriveStatus;
  selected_count: number | null;
  selected_names: string | null;
  outcome_notes: string | null;
};

export const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
