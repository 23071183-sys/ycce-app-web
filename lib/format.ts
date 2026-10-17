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
  const fraction = rupees % 1 ? 2 : 0;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: fraction, maximumFractionDigits: fraction })}`;
}

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

// Attendance thresholds: 75% is the college minimum, under 60% is serious.
export function attendanceTone(pct: number | string | null | undefined): Tone {
  const n = Number(pct) || 0;
  if (n >= 75) return 'success';
  if (n >= 60) return 'warning';
  return 'danger';
}

// Rupees typed into a form ("1250", "1,250.50") as whole paise, or null when
// it isn't a usable amount. Rounds to the nearest paisa so 0.1 + 0.2 style
// float error never reaches the API.
export function rupeesToPaise(rupees: string | number | null | undefined): number | null {
  const n = Number(String(rupees ?? '').replace(/[,\s₹]/g, ''));
  if (String(rupees ?? '').trim() === '' || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// Paise back into an editable rupee string: 125050 → "1250.5".
export function paiseToRupees(paise: number | string | null | undefined): string {
  const n = Number(paise);
  return Number.isFinite(n) ? String(n / 100) : '';
}

// A DATE column arrives as an ISO timestamp; this gives the YYYY-MM-DD an
// <input type="date"> wants, read in the viewer's own time zone.
export function toDateInput(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : value ? new Date(value as string) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Subject hues (tokens --hue-* in globals.css). Mirrors hueFor in the mobile
// app's theme.js, so a subject has the same colour on both.
export const HUES = ['teal', 'indigo', 'amber', 'rose', 'emerald', 'sky', 'violet', 'orange'] as const;
export type Hue = (typeof HUES)[number];

// A stable hue for a subject id or code, or null with nothing to go on.
export function hueFor(key: string | number | null | undefined): Hue | null {
  if (key === null || key === undefined || key === '') return null;
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

// Colour for a letter grade, as on mobile: O/A+ emerald, A/B+ sky,
// B/C+/C amber, D/E/F/FF/Fail rose.
export function gradeTone(grade: string | null | undefined): Hue | null {
  const g = String(grade ?? '').trim().toUpperCase();
  if (!g) return null;
  if (g === 'O' || g === 'A+') return 'emerald';
  if (g === 'A' || g === 'B+') return 'sky';
  if (g === 'B' || g === 'C+' || g === 'C') return 'amber';
  if (g === 'D' || g === 'E' || g === 'F' || g === 'FF' || g === 'FAIL') return 'rose';
  return null;
}
