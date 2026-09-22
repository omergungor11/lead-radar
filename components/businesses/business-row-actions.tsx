"use client";

// Tablo satırındaki kebab menü: tekil işletme silme. Menü/dialog tıklaması satırın
// kendi tıklama davranışına (detay açma) yayılmasın diye durduruluyor.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteBusiness } from "@/components/businesses/api";
import { tr } from "@/lib/tr";

interface BusinessRowActionsProps {
  id: string;
  name: string;
  onDeleted?: () => void;
}

export function BusinessRowActions({ id, name, onDeleted }: BusinessRowActionsProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => deleteBusiness(id),
    onSuccess: () => {
      toast.success(tr.businesses.delete.success(name));
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setConfirmOpen(false);
      onDeleted?.();
    },
    onError: () => {
      toast.error(tr.businesses.delete.error);
    },
  });

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={tr.businesses.columns.actions}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" />
            {tr.businesses.delete.menuLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr.businesses.delete.title}</AlertDialogTitle>
            <AlertDialogDescription>{tr.businesses.delete.description(name)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr.businesses.delete.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {tr.businesses.delete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
