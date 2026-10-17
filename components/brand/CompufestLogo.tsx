'use client';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { BrandGradient } from './BrandGradient';
import type { LogoProps } from './types';

// Compufest mark, drawn in code: a rounded square in the Compufest gradient
// with a white </> and circuit dots. To use the official artwork instead, add
// it as public/brand/compufest.png (or .svg) and render
// <img src="/brand/compufest.png" …> here in place of the <svg>.
export function CompufestLogo({ size = 40, withText = false, className, title }: LogoProps) {
  const gid = `cf-${useId().replace(/:/g, '')}`;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
        {title ? <title>{title}</title> : null}
        <defs><BrandGradient id={gid} brand="compufest" /></defs>
        <rect width="48" height="48" rx="12" fill={`url(#${gid})`} />
        {/* circuit traces and dots */}
        <g stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M8 13h5l3 3" />
          <path d="M40 35h-5l-3-3" />
        </g>
        <g fill="#FFFFFF" fillOpacity="0.7">
          <circle cx="8" cy="13" r="1.8" />
          <circle cx="40" cy="35" r="1.8" />
          <circle cx="38" cy="10" r="1.3" />
          <circle cx="10" cy="38" r="1.3" />
        </g>
        {/* </> */}
        <g stroke="#FFFFFF" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.5 17.5 12 24l6.5 6.5" />
          <path d="M29.5 17.5 36 24l-6.5 6.5" />
          <path d="M26.5 14.5l-5 19" />
        </g>
      </svg>
      {withText ? <span className="text-sm font-semibold tracking-[0.18em]">COMPUFEST</span> : null}
    </span>
  );
}
