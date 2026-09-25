"use client";

// Tıklanınca o kolona göre sıralayan tablo başlığı. Aynı kolona tekrar tıklamak yönü çevirir;
// yeni kolonda varsayılan yön DEFAULT_SORT_DIR'den gelir (metin A→Z, sayı/tarih büyükten küçüğe).

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DEFAULT_SORT_DIR, type BusinessSort, type SortDir } from "@/lib/types";
import { tr } from "@/lib/tr";

interface SortableHeadProps {
  column: BusinessSort;
  label: string;
  sort: BusinessSort;
  dir: SortDir | undefined;
  onSort: (sort: BusinessSort, dir: SortDir | undefined) => void;
  className?: string;
}

export function SortableHead({ column, label, sort, dir, onSort, className }: SortableHeadProps) {
  const active = sort === column;
  const currentDir = dir ?? DEFAULT_SORT_DIR[sort];

  function handleClick() {
    if (!active) {
      onSort(column, undefined);
      return;
    }
    const next: SortDir = currentDir === "asc" ? "desc" : "asc";
    // Varsayılan yöne dönülürse URL'den `dir` kalksın
    onSort(column, next === DEFAULT_SORT_DIR[column] ? undefined : next);
  }

  const Icon = !active ? ArrowUpDown : currentDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      className={className}
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={handleClick}
        title={tr.businesses.sortBy(label)}
        className={cn(
          "-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  );
}
