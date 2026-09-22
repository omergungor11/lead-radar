"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/components/api-client";
import { TagListEditor } from "./tag-list-editor";
import { SETTINGS_QUERY_KEY, useSettingsQuery } from "./use-settings-query";
import type { SettingsData } from "./types";
import { tr } from "@/lib/tr";

export function CitiesCard() {
  const { data, isLoading, isError } = useSettingsQuery();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (value: string[]) =>
      apiFetch<{ key: string; value: string[] }>("/api/settings/cities", {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });
      const previous = queryClient.getQueryData<SettingsData>(SETTINGS_QUERY_KEY);
      queryClient.setQueryData<SettingsData>(SETTINGS_QUERY_KEY, (old) =>
        old ? { ...old, cities: value } : old
      );
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previous);
      }
      toast.error(tr.settings.cities.updateError);
    },
  });

  function handleAdd(city: string) {
    const current = data?.cities ?? [];
    if (current.includes(city)) {
      toast.error(tr.settings.cities.duplicate);
      return;
    }
    mutation.mutate([...current, city]);
  }

  function handleRemove(city: string) {
    const current = data?.cities ?? [];
    mutation.mutate(current.filter((c) => c !== city));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.settings.cities.title}</CardTitle>
        <CardDescription>{tr.settings.cities.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">{tr.settings.loadError}</p>
        ) : (
          <TagListEditor
            items={data?.cities ?? []}
            onAdd={handleAdd}
            onRemove={handleRemove}
            addLabel={tr.settings.cities.add}
            inputPlaceholder={tr.settings.cities.inputPlaceholder}
            emptyLabel={tr.settings.cities.empty}
            disabled={mutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
