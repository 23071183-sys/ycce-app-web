import type { Brand } from './types';

// A diagonal linearGradient in the brand's colours, read from the
// --brand-*-from / -to tokens in globals.css so the values live in one place.
export function BrandGradient({ id, brand }: { id: string; brand: Brand }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style={{ stopColor: `var(--brand-${brand}-from)` }} />
      <stop offset="1" style={{ stopColor: `var(--brand-${brand}-to)` }} />
    </linearGradient>
  );
}
