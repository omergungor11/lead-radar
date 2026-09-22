"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/components/api-client";
import type { BusinessDetail } from "@/lib/types";

export function useBusinessDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ["business", id],
    queryFn: () => apiFetch<BusinessDetail>(`/api/businesses/${id}`),
    enabled: id !== null,
  });
}
