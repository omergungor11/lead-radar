"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsQuery } from "./use-settings-query";
import { tr } from "@/lib/tr";

export function PlacesStatusCard() {
  const { data, isLoading, isError } = useSettingsQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tr.settings.places.title}</CardTitle>
        <CardDescription>{tr.settings.places.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <Skeleton className="h-6 w-48" />
        ) : isError ? (
          <p className="text-sm text-destructive">{tr.settings.loadError}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={data?.placesKeyConfigured ? "default" : "destructive"}>
              {data?.placesKeyConfigured
                ? tr.settings.places.configured
                : tr.settings.places.notConfigured}
            </Badge>
            {data?.placesMock ? (
              <Badge variant="outline">{tr.settings.places.mockMode}</Badge>
            ) : null}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{tr.settings.places.note}</p>
      </CardContent>
    </Card>
  );
}
