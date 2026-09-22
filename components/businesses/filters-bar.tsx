"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/components/api-client";
import { CityCombobox } from "@/components/city-combobox";
import type { SettingsData } from "@/components/settings/types";
import { STATUSES } from "@/lib/status";
import { tr } from "@/lib/tr";
import type { BusinessFiltersState } from "./use-business-filters";

const ALL = "__all__";
const BANDS = ["HOT", "WARM", "COLD"] as const;
const SORTS = [
  { value: "score", label: tr.businesses.filters.sortScore },
  { value: "reviews", label: tr.businesses.filters.sortReviews },
  { value: "recent", label: tr.businesses.filters.sortRecent },
] as const;

interface FiltersBarProps {
  filters: BusinessFiltersState;
  onChange: (
    patch: Partial<Record<"city" | "category" | "status" | "band" | "q" | "sort", string | undefined>>,
  ) => void;
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsData>("/api/settings"),
  });

  const [query, setQuery] = useState(filters.q ?? "");
  const skipNext = useRef(true);

  // Filtre URL'den değiştiğinde (ör. geri tuşu) yerel input'u senkronla.
  useEffect(() => {
    setQuery(filters.q ?? "");
    skipNext.current = true;
  }, [filters.q]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      onChange({ q: query || undefined });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange her render'da yeniden oluşabilir
  }, [query]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr.businesses.filters.searchPlaceholder}
          className="pl-8"
        />
      </div>

      <CityCombobox
        cities={settings?.cities ?? []}
        value={filters.city}
        onChange={(city) => onChange({ city })}
        allLabel={tr.businesses.filters.cityAll}
        aria-label={tr.businesses.filters.cityLabel}
        className="sm:w-44"
      />

      <Input
        value={filters.category ?? ""}
        onChange={(e) => onChange({ category: e.target.value || undefined })}
        placeholder={tr.businesses.filters.categoryPlaceholder}
        className="w-full sm:w-44"
        aria-label={tr.businesses.filters.categoryLabel}
      />

      <Select
        value={filters.status ?? ALL}
        onValueChange={(v) => onChange({ status: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-full sm:w-36" aria-label={tr.businesses.filters.statusLabel}>
          <SelectValue placeholder={tr.businesses.filters.statusLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{tr.businesses.filters.statusAll}</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {tr.status[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.band ?? ALL}
        onValueChange={(v) => onChange({ band: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="w-full sm:w-32" aria-label={tr.businesses.filters.bandLabel}>
          <SelectValue placeholder={tr.businesses.filters.bandLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{tr.businesses.filters.bandAll}</SelectItem>
          {BANDS.map((band) => (
            <SelectItem key={band} value={band}>
              {tr.scoreBands[band]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.sort ?? "score"} onValueChange={(v) => onChange({ sort: v })}>
        <SelectTrigger className="w-full sm:w-44" aria-label={tr.businesses.filters.sortLabel}>
          <SelectValue placeholder={tr.businesses.filters.sortLabel} />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((sort) => (
            <SelectItem key={sort.value} value={sort.value}>
              {sort.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
