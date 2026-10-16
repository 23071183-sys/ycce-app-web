// Build a CSV in the browser and hand it to the user as a download.

// Quote a field when it holds a comma, quote or newline.
const field = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map(r => r.map(field).join(',')).join('\n');
}

// A safe file name from a title: "Tuition Sem 5" → "tuition-sem-5".
export const slug = (s: string) => s.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'export';

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const blob = new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
