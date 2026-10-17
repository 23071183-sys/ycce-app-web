'use client';
import { useId } from 'react';
import { cn } from '@/lib/utils';
import { BrandGradient } from './BrandGradient';
import { starPoints, type LogoProps } from './types';

const SPARKLE = starPoints(24, 22.5, 4, 6.5, 1.8);
const SPARKLE_SMALL = starPoints(32.5, 15.5, 4, 2.6, 0.8);

// The AI assistant's mark, drawn in code: a gradient circle with a white chat
// bubble holding a sparkle. To use official artwork instead, add it as
// public/brand/assistant.png (or .svg) and render
// <img src="/brand/assistant.png" …> here in place of the <svg>.
export function AssistantLogo({ size = 32, withText = false, className, title }: LogoProps) {
  const gid = `as-${useId().replace(/:/g, '')}`;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
        {title ? <title>{title}</title> : null}
        <defs><BrandGradient id={gid} brand="assistant" /></defs>
        <circle cx="24" cy="24" r="24" fill={`url(#${gid})`} />
        {/* chat bubble with a tail at the lower left */}
        <path
          d="M14.5 12.5h19a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H22l-6.5 5v-5h-1a4 4 0 0 1-4-4v-12a4 4 0 0 1 4-4z"
          fill="#FFFFFF"
        />
        <polygon points={SPARKLE} fill={`url(#${gid})`} />
        <polygon points={SPARKLE_SMALL} fill={`url(#${gid})`} />
      </svg>
      {withText ? <span className="text-sm font-semibold">CT Assistant</span> : null}
    </span>
  );
}
