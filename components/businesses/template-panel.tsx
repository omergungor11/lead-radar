"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { apiFetch } from "@/components/api-client";
import { canTransition, requiresConfirmation } from "@/lib/status";
import { renderTemplate, type Template } from "@/lib/templates";
import { waLink } from "@/lib/phone";
import { tr } from "@/lib/tr";
import type { BusinessDetail } from "@/lib/types";
import { patchBusiness } from "./api";

interface TemplatePanelProps {
  business: BusinessDetail;
}

function buildMailto(email: string, text: string): string {
  const lines = text.split("\n");
  const first = lines[0] ?? "";
  const hasSubject = /^konu:/i.test(first);
  const subject = hasSubject ? first.slice(first.indexOf(":") + 1).trim() : undefined;
  const body = hasSubject ? lines.slice(1).join("\n").trimStart() : text;
  const params = subject
    ? `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : `body=${encodeURIComponent(body)}`;
  return `mailto:${email}?${params}`;
}

export function TemplatePanel({ business }: TemplatePanelProps) {
  const queryClient = useQueryClient();
  const { data: templates, isLoading, isError } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiFetch<Template[]>("/api/templates"),
  });

  const [templateId, setTemplateId] = useState<string>("");
  const [text, setText] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);

  const selected = templates?.find((t) => t.id === templateId) ?? null;

  useEffect(() => {
    if (!templateId && templates && templates.length > 0) {
      setTemplateId(templates[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca liste ilk geldiğinde varsayılan seç
  }, [templates]);

  useEffect(() => {
    if (selected) {
      setText(
        renderTemplate(selected.body, {
          isletme: business.name,
          sehir: business.city,
          puan: business.rating,
          yorumSayisi: business.userRatingCount,
        }),
      );
    }
  }, [selected, business.name, business.city, business.rating, business.userRatingCount]);

  const contactMutation = useMutation({
    mutationFn: (confirm?: boolean) =>
      patchBusiness(business.id, { status: "CONTACTED", ...(confirm ? { confirm: true } : {}) }),
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.setQueryData(["business", business.id], detail);
      toast.success(tr.detail.template.statusUpdated, {
        action: { label: tr.detail.template.undo, onClick: handleUndo },
      });
    },
  });

  async function handleUndo() {
    try {
      const detail = await patchBusiness(business.id, { undo: true });
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.setQueryData(["business", business.id], detail);
      toast.success(tr.detail.template.undoSuccess);
    } catch {
      toast.error(tr.detail.template.undoError);
    }
  }

  function maybeMarkContacted() {
    if (!canTransition(business.status, "CONTACTED")) return;
    if (requiresConfirmation(business.status, "CONTACTED")) {
      setPendingConfirm(true);
      return;
    }
    contactMutation.mutate(undefined);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(tr.common.copySuccess);
      maybeMarkContacted();
    } catch {
      toast.error(tr.common.copyError);
    }
  }

  function confirmContact() {
    setPendingConfirm(false);
    contactMutation.mutate(true);
  }

  const canWhatsapp = selected?.channel === "WHATSAPP" && Boolean(business.phoneE164);
  const canEmail = selected?.channel === "EMAIL" && Boolean(business.email);

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{tr.common.loading}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{tr.detail.template.loadError}</p>
      ) : (
        <>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-full" aria-label={tr.detail.template.title}>
              <SelectValue placeholder={tr.detail.template.selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {(templates ?? []).map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-32"
            disabled={!selected}
          />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!selected} onClick={copyToClipboard}>
              {tr.detail.template.copy}
            </Button>
            {canWhatsapp ? (
              <Button
                size="sm"
                onClick={async () => {
                  await copyToClipboard();
                  window.open(waLink(business.phoneE164 as string, text), "_blank", "noreferrer");
                }}
              >
                {tr.detail.template.copyWhatsapp}
              </Button>
            ) : null}
            {canEmail ? (
              <Button
                size="sm"
                onClick={async () => {
                  await copyToClipboard();
                  window.open(buildMailto(business.email as string, text), "_blank", "noreferrer");
                }}
              >
                {tr.detail.template.copyEmail}
              </Button>
            ) : null}
          </div>
        </>
      )}

      <AlertDialog open={pendingConfirm} onOpenChange={setPendingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr.businesses.statusConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tr.statusConfirm.recontact}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmContact}>
              {tr.businesses.statusConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
