"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STATUSES, type Status } from "@/lib/status";
import { tr } from "@/lib/tr";
import type { BusinessFilters } from "@/lib/types";
import { bulkDeleteBusinesses, bulkStatus, exportUrl } from "./api";

interface BulkActionsBarProps {
  selectedIds: string[];
  filters: BusinessFilters;
  onDone: () => void;
  detailId: string | null;
  onCloseDetail: () => void;
}

export function BulkActionsBar({
  selectedIds,
  filters,
  onDone,
  detailId,
  onCloseDetail,
}: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const [targetStatus, setTargetStatus] = useState<Status | "">("");
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteBusinesses(selectedIds),
    onSuccess: (result) => {
      toast.success(tr.businesses.selection.bulkDeleteSuccess(result.deleted));
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      if (detailId && selectedIds.includes(detailId)) onCloseDetail();
      setDeleteOpen(false);
      onDone();
    },
    onError: () => {
      toast.error(tr.businesses.selection.bulkDeleteError);
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
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-3.5" />
          {tr.businesses.selection.bulkDelete}
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr.businesses.selection.bulkDeleteTitle(selectedIds.length)}</AlertDialogTitle>
            <AlertDialogDescription>{tr.businesses.selection.bulkDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr.businesses.delete.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {tr.businesses.delete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
