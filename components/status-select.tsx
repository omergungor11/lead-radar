"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { allowedTargets, requiresConfirmation, type Status } from "@/lib/status";
import { tr } from "@/lib/tr";
import type { BusinessDetail } from "@/lib/types";
import { patchBusiness } from "@/components/businesses/api";

interface StatusSelectProps {
  id: string;
  status: Status;
  className?: string;
  size?: "sm" | "default";
  onChanged?: (detail: BusinessDetail) => void;
}

export function StatusSelect({ id, status, className, size = "sm", onChanged }: StatusSelectProps) {
  const queryClient = useQueryClient();
  const [pendingTarget, setPendingTarget] = useState<Status | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { status: Status; confirm?: boolean }) => patchBusiness(id, payload),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.setQueryData(["business", id], detail);
      onChanged?.(detail);
    },
    onError: () => {
      toast.error(tr.businesses.statusUpdateError);
    },
  });

  const targets = allowedTargets(status);
  const options: Status[] = [status, ...targets.filter((t) => t !== status)];

  function handleChange(next: string) {
    if (next === status) return;
    const target = next as Status;
    if (requiresConfirmation(status, target)) {
      setPendingTarget(target);
      return;
    }
    mutation.mutate({ status: target });
  }

  function confirmChange() {
    if (!pendingTarget) return;
    mutation.mutate({ status: pendingTarget, confirm: true });
    setPendingTarget(null);
  }

  return (
    <>
      <Select value={status} onValueChange={handleChange} disabled={mutation.isPending}>
        <SelectTrigger size={size} className={className} aria-label={tr.businesses.columns.status}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} disabled={option === status}>
              {tr.status[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr.businesses.statusConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tr.statusConfirm.recontact}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>
              {tr.businesses.statusConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
