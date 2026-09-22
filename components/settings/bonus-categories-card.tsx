"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/components/api-client";
import { TagListEditor } from "./tag-list-editor";
import { SETTINGS_QUERY_KEY, useSettingsQuery } from "./use-settings-query";
import type { SettingsData } from "./types";
import { categoryLabel, CATEGORY_LABELS } from "@/lib/categories";
import { tr } from "@/lib/tr";

const DATALIST_ID = "bonus-category-suggestions";

export function BonusCategoriesCard() {
  const { data, isLoading, isError } = useSettingsQuery();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (value: string[]) =>
      apiFetch<{ key: string; value: string[] }>("/api/settings/bonusCategories", {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });
      const previous = queryClient.getQueryData<SettingsData>(SETTINGS_QUERY_KEY);
      queryClient.setQueryData<SettingsData>(SETTINGS_QUERY_KEY, (old) =>
        old ? { ...old, bonusCategories: value } : old
      );
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previous);
      }
      toast.error(tr.settings.bonusCategories.updateError);
    },
  });

  const rescoreMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ updated: number }>("/api/businesses/rescore", { method: "POST" }),
    onSuccess: (result) => {
      toast.success(tr.settings.bonusCategories.rescoreSuccess(result.updated));
    },
    onError: () => toast.error(tr.settings.bonusCategories.rescoreError),
  });

  const current = data?.bonusCategories ?? [];

  function handleAdd(category: string) {
    if (current.includes(category)) {
      toast.error(tr.settings.bonusCategories.duplicate);
      return;
    }
    updateMutation.mutate([...current, category]);
  }

  function handleRemove(category: string) {
    updateMutation.mutate(current.filter((c) => c !== category));
  }

  const datalistOptions = Object.entries(CATEGORY_LABELS)
    .filter(([value]) => !current.includes(value))
    .map(([value, label]) => ({ value, label }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.settings.bonusCategories.title}</CardTitle>
        <CardDescription>{tr.settings.bonusCategories.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{tr.settings.loadError}</p>
        ) : (
          <TagListEditor
            items={current}
            onAdd={handleAdd}
            onRemove={handleRemove}
            addLabel={tr.settings.bonusCategories.add}
            inputPlaceholder={tr.settings.bonusCategories.inputPlaceholder}
            emptyLabel={tr.settings.bonusCategories.empty}
            disabled={updateMutation.isPending}
            datalistId={DATALIST_ID}
            datalistOptions={datalistOptions}
            renderChipLabel={(value) => (
              <span className="flex items-center gap-1">
                {categoryLabel(value)}
                <span className="text-[10px] text-muted-foreground">({value})</span>
              </span>
            )}
          />
        )}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => rescoreMutation.mutate()}
          disabled={rescoreMutation.isPending}
        >
          {tr.settings.bonusCategories.rescoreButton}
        </Button>
      </CardFooter>
    </Card>
  );
}
