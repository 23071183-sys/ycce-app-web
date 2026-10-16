'use client';
import type { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: ReactNode };

// A string-valued dropdown on the base-ui Select, shaped like a native
// <select>: an options list, a value, and a change handler. An empty string
// means "nothing chosen": it shows the placeholder, or the label of an option
// whose value is '' (e.g. "All years"), just as a native select would.
export function SelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
  size,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: ReactNode;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
  'aria-label'?: string;
}) {
  const items = options.map((o) => ({ label: o.label, value: o.value === '' ? null : o.value }));
  return (
    <Select<string | null>
      value={value === '' ? null : value}
      onValueChange={(v) => onValueChange(v ?? '')}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value ?? ''} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
