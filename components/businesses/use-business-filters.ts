"use client";

// Tablo filtrelerini URL query'sinde tutar (paylaşılabilir, sayfa yenilense de korunur).

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BUSINESS_SORTS, type BusinessFilters, type BusinessSort } from "@/lib/types";
import { isStatus } from "@/lib/status";

export const PAGE_SIZE = 20;

export interface BusinessFiltersState extends BusinessFilters {
  page: number;
  pageSize: number;
}

function isBand(value: string | null): value is "HOT" | "WARM" | "COLD" {
  return value === "HOT" || value === "WARM" || value === "COLD";
}

function isSort(value: string | null): value is BusinessSort {
  return value !== null && (BUSINESS_SORTS as readonly string[]).includes(value);
}

export function useBusinessFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<BusinessFiltersState>(() => {
    const statusParam = searchParams.get("status");
    const bandParam = searchParams.get("band");
    const sortParam = searchParams.get("sort");
    const pageParam = Number(searchParams.get("page"));

    return {
      city: searchParams.get("city") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: isStatus(statusParam) ? statusParam : undefined,
      band: isBand(bandParam) ? bandParam : undefined,
      q: searchParams.get("q") ?? undefined,
      sort: isSort(sortParam) ? sortParam : "score",
      page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
      pageSize: PAGE_SIZE,
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (patch: Partial<Record<"city" | "category" | "status" | "band" | "q" | "sort", string | undefined>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) params.delete("page");
      else params.set("page", String(page));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openDetail = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeDetail = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const detailId = searchParams.get("id");

  return { filters, setFilter, setPage, detailId, openDetail, closeDetail };
}
