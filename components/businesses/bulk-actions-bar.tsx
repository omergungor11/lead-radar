"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUSES, type Status } from "@/lib/status";
import { tr } from "@/lib/tr";
import type { BusinessFilters } from "@/lib/types";
import { bulkStatus, exportUrl } from "./api";

interface BulkActionsBarProps {
  selectedIds: string[];
  filters: BusinessFilters;
  onDone: () => void;
}

export function BulkActionsBar({ selectedIds, filters, onDone }: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const [targetStatus, setTargetStatus] = useState<Status | "">("");

  const mutation = useMutation({
    mutationFn: (status: Status) => bulkStatus(selectedIds, status),
    onSuccess: (result) => {
      toast.success(tr.businesses.selection.bulkResult(result.updated, result.skipped.length));
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      onDone();
    },
    onError: () => {
      toast.error(tr.businesses.selection.bulkError);
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium">{tr.businesses.selection.count(selectedIds.length)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as Status)}>
          <SelectTrigger className="w-44" aria-label={tr.businesses.selection.changeStatus}>
            <SelectValue placeholder={tr.businesses.selection.statusPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {tr.status[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!targetStatus || mutation.isPending}
          onClick={() => targetStatus && mutation.mutate(targetStatus)}
        >
          {tr.businesses.selection.apply}
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={exportUrl(filters, selectedIds)} download>
            {tr.businesses.selection.exportSelected}
          </a>
        </Button>
      </div>
    </div>
  );
}
