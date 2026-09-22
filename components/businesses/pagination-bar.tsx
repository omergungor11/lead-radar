"use client";

import { Button } from "@/components/ui/button";
import { tr } from "@/lib/tr";
import type { PageMeta } from "@/lib/types";

interface PaginationBarProps {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ meta, onPageChange }: PaginationBarProps) {
  if (!meta || meta.total === 0) return null;

  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  const hasPrev = meta.page > 1;
  const hasNext = to < meta.total;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {tr.businesses.pagination.range(from, to, meta.total)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onPageChange(meta.page - 1)}
        >
          {tr.businesses.pagination.prev}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(meta.page + 1)}
        >
          {tr.businesses.pagination.next}
        </Button>
      </div>
    </div>
  );
}
