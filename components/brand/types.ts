export type Brand = 'compufest' | 'yash' | 'assistant' | 'results';

export type LogoProps = {
  /** Square size in px. */
  size?: number;
  /** Show the wordmark beside the mark. */
  withText?: boolean;
  className?: string;
  /** Accessible name; the mark is decorative when omitted. */
  title?: string;
};

// Points of a star polygon around (cx, cy), alternating outer and inner radius.
export function starPoints(cx: number, cy: number, points: number, outer: number, inner: number, rotate = -Math.PI / 2) {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotate + (i * Math.PI) / points;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(' ');
}
