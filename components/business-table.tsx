"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreBadge } from "@/components/score-badge";
import { StatusSelect } from "@/components/status-select";
import { BusinessSheet } from "@/components/business-sheet";
import { FiltersBar } from "@/components/businesses/filters-bar";
import { PaginationBar } from "@/components/businesses/pagination-bar";
import { BulkActionsBar } from "@/components/businesses/bulk-actions-bar";
import { BusinessRowActions } from "@/components/businesses/business-row-actions";
import { BusinessAvatar } from "@/components/businesses/business-avatar";
import { PhoneCell } from "@/components/businesses/phone-cell";
import { EditableEmailCell } from "@/components/businesses/editable-email-cell";
import { SortableHead } from "@/components/businesses/sortable-head";
import { StaleIndicator } from "@/components/businesses/stale-indicator";
import { WebsiteBadge } from "@/components/website-badge";
import { formatDate, formatRatingReviews } from "@/components/businesses/format";
import { exportUrl } from "@/components/businesses/api";
import { useBusinessFilters } from "@/components/businesses/use-business-filters";
import { useBusinessesQuery } from "@/components/businesses/use-businesses-query";
import { categoryLabel } from "@/lib/categories";
import { tr } from "@/lib/tr";

const SKELETON_ROWS = 8;
const COLUMN_COUNT = 12;

export function BusinessTable() {
  const { filters, setFilter, setPage, detailId, openDetail, closeDetail } = useBusinessFilters();
  const { data, isLoading, isError } = useBusinessesQuery(filters);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    setSelected(new Set());
  }, [
    filters.city,
    filters.district,
    filters.category,
    filters.status,
    filters.band,
    filters.web,
    filters.q,
    filters.sort,
    filters.dir,
    filters.page,
  ]);

  const sortProps = {
    sort: filters.sort ?? "score",
    dir: filters.dir,
    onSort: (sort: string, dir: string | undefined) => setFilter({ sort, dir }),
  } as const;

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((row) => row.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <FiltersBar filters={filters} onChange={setFilter} />

      {selected.size > 0 ? (
        <BulkActionsBar
          selectedIds={[...selected]}
          filters={filters}
          onDone={() => setSelected(new Set())}
          detailId={detailId}
          onCloseDetail={closeDetail}
        />
      ) : (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={exportUrl(filters)} download>
              {tr.businesses.selection.exportFiltered}
            </a>
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label={tr.businesses.selection.count(rows.length)}
                />
              </TableHead>
              <TableHead>{tr.businesses.columns.photo}</TableHead>
              <SortableHead column="name" label={tr.businesses.columns.name} {...sortProps} />
              <SortableHead column="category" label={tr.businesses.columns.category} {...sortProps} />
              <SortableHead column="city" label={tr.businesses.columns.city} {...sortProps} />
              <SortableHead column="phone" label={tr.businesses.columns.phone} {...sortProps} />
              <SortableHead column="email" label={tr.businesses.columns.email} {...sortProps} />
              <SortableHead column="rating" label={tr.businesses.columns.rating} {...sortProps} />
              <SortableHead column="score" label={tr.businesses.columns.score} {...sortProps} />
              <SortableHead column="status" label={tr.businesses.columns.status} {...sortProps} />
              <SortableHead column="lastContact" label={tr.businesses.columns.lastContact} {...sortProps} />
              <TableHead className="w-10">
                <span className="sr-only">{tr.businesses.columns.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-sm text-destructive">
                  {tr.businesses.loadError}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center">
                  <p className="text-sm font-medium text-foreground">{tr.businesses.empty.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tr.businesses.empty.description}{" "}
                    <Link href="/searches" className="text-primary underline underline-offset-4">
                      {tr.businesses.empty.action}
                    </Link>
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id} data-state={selected.has(item.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      aria-label={item.name}
                    />
                  </TableCell>
                  <TableCell>
                    <BusinessAvatar name={item.name} thumbnailUrl={item.thumbnailUrl} />
                  </TableCell>
                  <TableCell className="max-w-48">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="flex items-center gap-1.5 text-left text-sm font-medium hover:underline"
                      >
                        <span className="truncate">{item.name}</span>
                        {item.isStale ? <StaleIndicator /> : null}
                      </button>
                      <WebsiteBadge websiteUri={item.websiteUri} websiteKind={item.websiteKind} />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {categoryLabel(item.primaryType)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.district ? (
                      <div className="flex flex-col">
                        <span>{item.district}</span>
                        <span className="text-xs text-muted-foreground">{item.city}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{item.city}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <PhoneCell phone={item.phone} phoneE164={item.phoneE164} />
                  </TableCell>
                  <TableCell>
                    <EditableEmailCell id={item.id} email={item.email} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {formatRatingReviews(item.rating, item.userRatingCount)}
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={item.score} band={item.band} />
                  </TableCell>
                  <TableCell>
                    <StatusSelect id={item.id} status={item.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.lastContactedAt)}
                  </TableCell>
                  <TableCell>
                    <BusinessRowActions
                      id={item.id}
                      name={item.name}
                      onDeleted={() => {
                        if (detailId === item.id) closeDetail();
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar meta={data?.meta} onPageChange={setPage} />

      <BusinessSheet
        id={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      />
    </div>
  );
}
