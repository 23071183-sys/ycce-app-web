// Date and money formatting shared by every admin page, in Indian conventions.
// Mirrors src/utils/format.js in the mobile app.

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

// "17 Oct 2026", or "17 Oct" with { year: false }.
export function fmtDate(value: unknown, { year = true }: { year?: boolean } = {}): string {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
}

// "just now", "5 min ago", "3 h ago", "yesterday", or the date beyond a week.
export function relativeTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return '';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 172800) return 'yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return fmtDate(d, { year: d.getFullYear() !== new Date().getFullYear() });
}

// Money is stored in whole paise; show it as rupees: "₹1,25,000".
export function fmtINR(paise: number | string | null | undefined): string {
  const rupees = (Number(paise) || 0) / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: rupees % 1 ? 2 : 0 })}`;
}

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

// Attendance thresholds: 75% is the college minimum, under 60% is serious.
export function attendanceTone(pct: number | string | null | undefined): Tone {
  const n = Number(pct) || 0;
  if (n >= 75) return 'success';
  if (n >= 60) return 'warning';
  return 'danger';
}
