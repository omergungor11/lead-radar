"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/components/api-client";
import { hasOptOut } from "@/lib/templates";
import type { Template } from "./types";
import { tr } from "@/lib/tr";

const PLACEHOLDERS = ["{{isletme}}", "{{sehir}}", "{{puan}}", "{{yorumSayisi}}", "{{platform}}"] as const;
const TEMPLATES_QUERY_KEY = ["templates"] as const;

interface TemplateFormDialogProps {
  mode: "create" | "edit";
  template?: Template;
  trigger: ReactNode;
}

export function TemplateFormDialog({ mode, template, trigger }: TemplateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<Template["channel"]>(template?.channel ?? "WHATSAPP");
  const [body, setBody] = useState(template?.body ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setChannel(template?.channel ?? "WHATSAPP");
      setBody(template?.body ?? "");
    }
  }, [open, template]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, channel, body };
      if (mode === "create") {
        return apiFetch<Template>("/api/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      return apiFetch<Template>(`/api/templates/${template?.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
      toast.success(
        mode === "create"
          ? tr.settings.templates.createSuccess
          : tr.settings.templates.updateSuccess
      );
      setOpen(false);
    },
    onError: () => toast.error(tr.settings.templates.saveError),
  });

  function insertPlaceholder(placeholder: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => prev + placeholder);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + placeholder + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + placeholder.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const optOutMissing = body.trim().length > 0 && !hasOptOut(body);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? tr.settings.templates.formTitleNew
              : tr.settings.templates.formTitleEdit}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-name">{tr.settings.templates.formNameLabel}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tr.settings.templates.formNamePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{tr.settings.templates.formChannelLabel}</Label>
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value as Template["channel"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHATSAPP">{tr.settings.templates.channelWhatsapp}</SelectItem>
                <SelectItem value="EMAIL">{tr.settings.templates.channelEmail}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-body">{tr.settings.templates.formBodyLabel}</Label>
            <Textarea
              id="template-body"
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={tr.settings.templates.formBodyPlaceholder}
              rows={6}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">
              {tr.settings.templates.placeholdersLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((placeholder) =>
                placeholder === "{{platform}}" ? (
                  <TooltipProvider key={placeholder}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => insertPlaceholder(placeholder)}
                          className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs hover:bg-muted/70"
                        >
                          {placeholder}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{tr.settings.templates.placeholderPlatformHint}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => insertPlaceholder(placeholder)}
                    className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs hover:bg-muted/70"
                  >
                    {placeholder}
                  </button>
                ),
              )}
            </div>
          </div>
          {optOutMissing ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {tr.settings.templates.optOutWarning}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name.trim() || !body.trim()}
          >
            {tr.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
