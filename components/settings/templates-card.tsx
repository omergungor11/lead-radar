"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/components/api-client";
import { TemplateFormDialog } from "./template-form-dialog";
import type { Template } from "./types";
import { tr } from "@/lib/tr";

const TEMPLATES_QUERY_KEY = ["templates"] as const;
const SNIPPET_LENGTH = 120;

function snippet(body: string): string {
  return body.length > SNIPPET_LENGTH ? `${body.slice(0, SNIPPET_LENGTH)}…` : body;
}

export function TemplatesCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: TEMPLATES_QUERY_KEY,
    queryFn: () => apiFetch<Template[]>("/api/templates"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY });
      toast.success(tr.settings.templates.deleteSuccess);
    },
    onError: () => toast.error(tr.settings.templates.deleteError),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.settings.templates.title}</CardTitle>
        <CardDescription>{tr.settings.templates.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{tr.settings.templates.loadError}</p>
        ) : data && data.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.map((template) => (
              <li
                key={template.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{template.name}</span>
                    <Badge variant="outline">
                      {template.channel === "WHATSAPP"
                        ? tr.settings.templates.channelWhatsapp
                        : tr.settings.templates.channelEmail}
                    </Badge>
                    {!template.hasOptOut ? (
                      <Badge variant="destructive">
                        {tr.settings.templates.optOutMissingBadge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{snippet(template.body)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <TemplateFormDialog
                    mode="edit"
                    template={template}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        {tr.settings.templates.editButton}
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm">
                        {tr.settings.templates.deleteButton}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {tr.settings.templates.deleteConfirmTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {tr.settings.templates.deleteConfirmDescription}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{tr.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(template.id)}>
                          {tr.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{tr.settings.templates.empty}</p>
        )}
        <div>
          <TemplateFormDialog
            mode="create"
            trigger={<Button type="button">{tr.settings.templates.newButton}</Button>}
          />
        </div>
      </CardContent>
    </Card>
  );
}
