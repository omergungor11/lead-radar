"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { tr } from "@/lib/tr";
import type { NoteDto } from "@/lib/types";
import { addNote } from "./api";
import { formatDateTime } from "./format";

interface NotesPanelProps {
  id: string;
  notes: NoteDto[];
}

export function NotesPanel({ id, notes }: NotesPanelProps) {
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (value: string) => addNote(id, value),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["business", id] });
    },
    onError: () => {
      toast.error(tr.detail.notes.addError);
    },
  });

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={tr.detail.notes.placeholder}
        className="min-h-20"
      />
      <Button size="sm" className="self-end" disabled={!body.trim() || mutation.isPending} onClick={submit}>
        {tr.detail.notes.add}
      </Button>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr.detail.notes.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
