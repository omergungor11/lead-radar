"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/components/api-client";
import type { SettingsData } from "./types";

export const SETTINGS_QUERY_KEY = ["settings"] as const;

export function useSettingsQuery() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => apiFetch<SettingsData>("/api/settings"),
  });
}
