import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
};

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

// A card-wrapped table that handles the loading and empty states itself, so
// every list page looks and behaves the same.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  skeletonRows = 5,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  empty?: ReactNode;
  skeletonRows?: number;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="px-0">
        {!loading && rows.length === 0 && empty ? (
          empty
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((c) => (
                    <TableHead key={c.key} className={cn('label h-11 px-4', ALIGN[c.align ?? 'left'], c.className)}>
                      {c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: skeletonRows }).map((_, i) => (
                      <TableRow key={`s${i}`} className="hover:bg-transparent">
                        {columns.map((c) => (
                          <TableCell key={c.key} className="px-4 py-3">
                            <Skeleton className="h-4 w-full max-w-40" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((row) => (
                      <TableRow key={rowKey(row)}>
                        {columns.map((c) => (
                          <TableCell key={c.key} className={cn('px-4 py-3 text-sm', ALIGN[c.align ?? 'left'], c.className)}>
                            {c.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
