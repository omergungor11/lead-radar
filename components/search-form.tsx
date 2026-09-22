"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/components/api-client";
import { CityCombobox } from "@/components/city-combobox";
import { useSettingsQuery } from "@/components/settings/use-settings-query";
import { tr } from "@/lib/tr";

interface SearchFormProps {
  disabled: boolean;
  onStarted: (jobId: string, city: string) => void;
}

export function SearchForm({ disabled, onStarted }: SearchFormProps) {
  const { data: settings } = useSettingsQuery();
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const cities = settings?.cities ?? [];

  useEffect(() => {
    if (!city && settings && settings.cities.length > 0) {
      setCity(settings.cities[0]);
    }
  }, [settings, city]);

  const mutation = useMutation({
    mutationFn: (input: { query: string; city: string }) =>
      apiFetch<{ jobId: string }>("/api/search", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data, variables) => {
      onStarted(data.jobId, variables.city);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedCategory = category.trim();
    if (!trimmedCategory || !city) {
      toast.error(tr.searches.form.validationError);
      return;
    }
    mutation.mutate({ query: trimmedCategory, city });
  }

  const showPlacesWarning =
    settings && !settings.placesKeyConfigured && !settings.placesMock;
  const isSubmitDisabled = disabled || mutation.isPending;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {showPlacesWarning ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-1">
              <span>{tr.searches.form.placesWarning}</span>
              <Link href="/settings" className="w-fit underline underline-offset-4">
                {tr.searches.form.settingsLink}
              </Link>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="search-category">{tr.searches.form.categoryLabel}</Label>
            <Input
              id="search-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={tr.searches.form.categoryPlaceholder}
              disabled={isSubmitDisabled}
            />
            <div className="flex flex-wrap gap-1.5">
              {tr.searches.form.quickPicks.map((pick) => (
                <Button
                  key={pick}
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isSubmitDisabled}
                  onClick={() => setCategory(pick)}
                >
                  {pick}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{tr.searches.form.categoryHint}</p>
          </div>

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="search-city">{tr.searches.form.cityLabel}</Label>
            <CityCombobox
              id="search-city"
              cities={cities}
              value={city || undefined}
              onChange={(c) => setCity(c ?? "")}
              placeholder={tr.searches.form.cityPlaceholder}
              disabled={isSubmitDisabled}
            />
          </div>

          <Button type="submit" disabled={isSubmitDisabled} className="w-fit">
            {mutation.isPending ? tr.searches.form.submitting : tr.searches.form.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
