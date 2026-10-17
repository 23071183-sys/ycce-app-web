'use client';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { BrandGradient } from './BrandGradient';
import { starPoints, type LogoProps } from './types';

const RAYS = starPoints(24, 24, 8, 15, 6.2);
const CORE = starPoints(24, 24, 4, 6, 2.6, 0);

// Yash fest mark, drawn in code: a sunset-gradient rounded square with a
// white sunburst. To use the official artwork instead, add it as
// public/brand/yash.png (or .svg) and render <img src="/brand/yash.png" …>
// here in place of the <svg>.
export function YashLogo({ size = 40, withText = false, className, title }: LogoProps) {
  const gid = `yf-${useId().replace(/:/g, '')}`;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
        {title ? <title>{title}</title> : null}
        <defs><BrandGradient id={gid} brand="yash" /></defs>
        <rect width="48" height="48" rx="12" fill={`url(#${gid})`} />
        <circle cx="24" cy="24" r="16.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1.2" />
        <polygon points={RAYS} fill="#FFFFFF" />
        <polygon points={CORE} fill={`url(#${gid})`} />
      </svg>
      {withText ? <span className="text-sm font-semibold tracking-[0.18em]">YASH</span> : null}
    </span>
  );
}
