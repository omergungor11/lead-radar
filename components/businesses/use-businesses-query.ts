"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBusinesses } from "./api";
import type { BusinessFiltersState } from "./use-business-filters";

export function useBusinessesQuery(filters: BusinessFiltersState) {
  return useQuery({
    queryKey: ["businesses", filters],
    queryFn: () => fetchBusinesses(filters),
    placeholderData: (previous) => previous,
  });
}
