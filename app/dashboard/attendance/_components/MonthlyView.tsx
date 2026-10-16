'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayData } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Day cells are banded by the share of the class present that day:
// ≥75% / 50–74% / <50%.
const LEGEND = [
  { swatch: 'bg-success-soft ring-1 ring-success/30', label: '≥75% present' },
  { swatch: 'bg-warning-soft ring-1 ring-warning/30', label: '50–74%' },
  { swatch: 'bg-destructive-soft ring-1 ring-destructive/30', label: '<50% present' },
];

// The month calendar: each day shows how many were present, and picking one
// opens it for marking.
export function MonthlyView({
  calYear,
  calMonth,
  monthData,
  loading,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
}: {
  calYear: number;
  calMonth: number;
  monthData: DayData[];
  loading: boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const dayMap: Record<string, DayData> = {};
  monthData.forEach(d => { dayMap[d.date.split('T')[0]] = d; });
  const today = new Date().toISOString().split('T')[0];

  const getDayStyle = (dateStr: string) => {
    const d = dayMap[dateStr];
    if (selectedDate === dateStr) return 'bg-primary text-primary-foreground font-semibold';
    if (!d) return dateStr === today ? 'ring-1 ring-border text-foreground hover:bg-accent' : 'text-muted-foreground hover:bg-accent';
    const pct = d.present / d.total;
    if (pct >= 0.75) return 'bg-success-soft text-success hover:ring-1 hover:ring-success/40';
    if (pct >= 0.5) return 'bg-warning-soft text-warning hover:ring-1 hover:ring-warning/40';
    return 'bg-destructive-soft text-destructive hover:ring-1 hover:ring-destructive/40';
  };

  return (
    <Card>
      <CardContent className="py-1">
        <div className="flex items-center justify-between mb-5">
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <p className="label text-foreground">{MONTHS[calMonth]} {calYear}</p>
            {loading && <Loader2 size={12} className="animate-spin text-muted-foreground mx-auto mt-1" />}
          </div>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="label text-center py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const d = dayMap[dateStr];
            return (
              <button
                key={day}
                onClick={() => onSelectDate(dateStr)}
                aria-pressed={selectedDate === dateStr}
                className={cn(
                  'aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors cursor-pointer tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  getDayStyle(dateStr),
                )}
              >
                <span>{day}</span>
                {d && (
                  <span className="text-[9px] opacity-70 leading-none mt-0.5">
                    {d.present}/{d.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-5 justify-center flex-wrap">
          {LEGEND.map(({ swatch, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${swatch}`} />
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
