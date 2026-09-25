"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/components/api-client";
import { CityCombobox } from "@/components/city-combobox";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { SEARCH_CATEGORY_GROUPS, SEARCH_QUICK_PICKS } from "@/lib/config";
import { DistrictCombobox } from "@/components/district-combobox";
import { useSettingsQuery } from "@/components/settings/use-settings-query";
import { districtsOf } from "@/lib/districts";
import {
  cityCenter,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  CITY_ZOOM,
  SEARCH_RADIUS_MIN_M,
  SEARCH_RADIUS_MAX_M,
  SEARCH_RADIUS_DEFAULT_M,
  nearestCity,
} from "@/lib/geo";
import type { SearchArea } from "@/lib/types";
import { formatRadius } from "@/components/map/format-radius";
import { tr } from "@/lib/tr";

const AreaMap = dynamic(() => import("@/components/map/area-map").then((m) => m.AreaMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-lg sm:h-[360px]" />,
});

interface SearchFormProps {
  disabled: boolean;
  /** Google Maps tarayıcı anahtarı (sunucu sayfasından); yoksa harita kurulum uyarısı gösterir */
  mapsApiKey: string | null;
  onStarted: (jobId: string, city: string, district?: string, area?: SearchArea) => void;
}

const CATEGORY_GROUPS = SEARCH_CATEGORY_GROUPS.map((g) => ({
  label: tr.searches.form.categoryGroups[g.key],
  items: g.items,
}));

export function SearchForm({ disabled, mapsApiKey, onStarted }: SearchFormProps) {
  const { data: settings } = useSettingsQuery();
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [useMapArea, setUseMapArea] = useState(false);
  const [area, setArea] = useState<SearchArea | null>(null);
  const [radiusM, setRadiusM] = useState(SEARCH_RADIUS_DEFAULT_M);

  const cities = settings?.cities ?? [];
  const hasDistricts = districtsOf(city).length > 0;
  const mapCenter = cityCenter(city) ?? DEFAULT_CENTER;
  const mapZoom = city ? CITY_ZOOM : DEFAULT_ZOOM;

  useEffect(() => {
    if (!city && settings && settings.cities.length > 0) {
      setCity(settings.cities[0]);
    }
  }, [settings, city]);

  const mutation = useMutation({
    mutationFn: (input: { query: string; city: string; district?: string; area?: SearchArea }) =>
      apiFetch<{ jobId: string }>("/api/search", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data, variables) => {
      onStarted(data.jobId, variables.city, variables.district, variables.area);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      toast.error(tr.searches.form.categoryRequired);
      return;
    }
    if (useMapArea && !area) {
      toast.error(tr.searches.form.areaNotSelected);
      return;
    }
    if (!effectiveCity) {
      toast.error(tr.searches.form.cityRequired);
      return;
    }
    mutation.mutate({
      query: trimmedCategory,
      city: effectiveCity,
      // ilçe yalnız metin aramasında anlamlı; alan modunda coğrafyayı daire belirler
      district: useMapArea ? undefined : district,
      area: useMapArea && area ? area : undefined,
    });
  }

  // Alan modunda şehir kullanıcıdan istenmez: daire merkezine en yakın şehir kayıt etiketi olur
  // (kullanıcı şehir seçicisinden değiştirebilir). Böylece Business.city ve filtreler anlamlı kalır.
  const areaCity = area ? nearestCity(area, cities.length > 0 ? cities : undefined) : null;
  const effectiveCity = useMapArea ? (areaCity ?? city) : city;

  function handleCityChange(next: string | undefined) {
    setCity(next ?? "");
    setDistrict(undefined);
    setArea(null);
  }

  function handleRadiusChange(next: number) {
    setRadiusM(next);
    setArea((prev) => (prev ? { ...prev, radiusM: next } : prev));
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="search-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={tr.searches.form.categoryPlaceholder}
                disabled={isSubmitDisabled}
              />
              <SearchableCombobox
                groups={CATEGORY_GROUPS}
                value={undefined}
                onChange={(pick) => pick && setCategory(pick)}
                placeholder={tr.searches.form.pickFromList}
                searchPlaceholder={tr.searches.form.categorySearch}
                emptyText={tr.searches.form.categoryEmpty}
                disabled={isSubmitDisabled}
                className="sm:w-48 sm:shrink-0"
                aria-label={tr.searches.form.pickFromList}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SEARCH_QUICK_PICKS.map((pick) => (
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

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <div className="flex flex-col gap-2 sm:w-56">
              <Label htmlFor="search-city">{tr.searches.form.cityLabel}</Label>
              <CityCombobox
                id="search-city"
                cities={cities}
                value={city || undefined}
                onChange={handleCityChange}
                placeholder={tr.searches.form.cityPlaceholder}
                disabled={isSubmitDisabled}
              />
            </div>

            {hasDistricts && !useMapArea ? (
              <div className="flex flex-col gap-2 sm:w-56">
                <Label htmlFor="search-district">{tr.searches.form.districtLabel}</Label>
                <DistrictCombobox
                  id="search-district"
                  city={city || undefined}
                  value={district}
                  onChange={setDistrict}
                  disabled={isSubmitDisabled}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="search-map-toggle"
                checked={useMapArea}
                onCheckedChange={(checked) => setUseMapArea(checked === true)}
                disabled={isSubmitDisabled}
              />
              <Label htmlFor="search-map-toggle" className="cursor-pointer font-normal">
                {tr.searches.form.mapToggleLabel}
              </Label>
            </div>

            {useMapArea ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{tr.searches.form.mapHint}</p>
                <AreaMap
                  apiKey={mapsApiKey}
                  center={mapCenter}
                  zoom={mapZoom}
                  value={area}
                  onChange={setArea}
                  disabled={isSubmitDisabled}
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Label htmlFor="search-radius">{tr.searches.form.radiusLabel}</Label>
                    <span className="text-muted-foreground">{formatRadius(radiusM)}</span>
                  </div>
                  <input
                    id="search-radius"
                    type="range"
                    min={SEARCH_RADIUS_MIN_M}
                    max={SEARCH_RADIUS_MAX_M}
                    step={100}
                    value={radiusM}
                    onChange={(event) => handleRadiusChange(Number(event.target.value))}
                    disabled={isSubmitDisabled}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {areaCity ? (
                  <p className="text-xs text-muted-foreground">
                    {tr.searches.form.areaCityAuto(areaCity)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitDisabled} className="w-fit">
            {mutation.isPending ? tr.searches.form.submitting : tr.searches.form.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
