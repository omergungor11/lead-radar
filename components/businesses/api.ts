// İşletme domaini için fetch yardımcıları (ortak istemci: `components/api-client.ts`).

import { apiFetch as request, apiFetchWithMeta as requestWithMeta } from "@/components/api-client";
export { ApiRequestError } from "@/components/api-client";
import type {
  BulkStatusResult,
  BusinessDetail,
  BusinessFilters,
  BusinessListItem,
  NoteDto,
  PageMeta,
} from "@/lib/types";
import type { Status } from "@/lib/status";

function toQueryString(filters: BusinessFilters & { ids?: string[] }): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.district) params.set("district", filters.district);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.band) params.set("band", filters.band);
  if (filters.web) params.set("web", filters.web);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.ids && filters.ids.length > 0) params.set("ids", filters.ids.join(","));
  return params.toString();
}

export function businessesUrl(filters: BusinessFilters): string {
  return `/api/businesses?${toQueryString(filters)}`;
}

export function exportUrl(filters: BusinessFilters, ids?: string[]): string {
  return `/api/export?${toQueryString({ ...filters, ids })}`;
}

export function fetchBusinesses(
  filters: BusinessFilters,
): Promise<{ data: BusinessListItem[]; meta: PageMeta }> {
  return requestWithMeta<BusinessListItem[], PageMeta>(businessesUrl(filters));
}

export function patchBusiness(
  id: string,
  patch: {
    email?: string | null;
    phone?: string | null;
    status?: Status;
    confirm?: boolean;
    undo?: true;
  },
): Promise<BusinessDetail> {
  return request<BusinessDetail>(`/api/businesses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function addNote(id: string, body: string): Promise<NoteDto> {
  return request<NoteDto>(`/api/businesses/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function bulkStatus(ids: string[], status: Status): Promise<BulkStatusResult> {
  return request<BulkStatusResult>("/api/businesses/bulk-status", {
    method: "POST",
    body: JSON.stringify({ ids, status }),
  });
}

export function refreshBusiness(id: string): Promise<{ id: string; lastSyncedAt: string }> {
  return request<{ id: string; lastSyncedAt: string }>(`/api/businesses/${id}/refresh`, {
    method: "POST",
  });
}

export function deleteBusiness(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/api/businesses/${id}`, {
    method: "DELETE",
  });
}

export function bulkDeleteBusinesses(ids: string[]): Promise<{ deleted: number }> {
  return request<{ deleted: number }>("/api/businesses/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
