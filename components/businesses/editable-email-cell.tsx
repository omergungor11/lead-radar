"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { tr } from "@/lib/tr";
import { patchBusiness } from "./api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EditableEmailCellProps {
  id: string;
  email: string | null;
}

export function EditableEmailCell({ id, email }: EditableEmailCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (next: string | null) => patchBusiness(id, { email: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.invalidateQueries({ queryKey: ["business", id] });
    },
    onError: () => {
      toast.error(tr.businesses.emailUpdateError);
      setValue(email ?? "");
    },
  });

  function commit() {
    const trimmed = value.trim();
    if (trimmed === (email ?? "")) {
      setEditing(false);
      return;
    }
    if (trimmed !== "" && !EMAIL_RE.test(trimmed)) {
      toast.error(tr.businesses.emailInvalid);
      setValue(email ?? "");
      setEditing(false);
      return;
    }
    mutation.mutate(trimmed === "" ? null : trimmed);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(email ?? "");
          setEditing(true);
        }}
        className="max-w-44 truncate text-left text-sm hover:underline"
      >
        {email || <span className="text-muted-foreground">{tr.businesses.noEmail}</span>}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setValue(email ?? "");
          setEditing(false);
        }
      }}
      className="h-7 w-44 text-sm"
    />
  );
}
