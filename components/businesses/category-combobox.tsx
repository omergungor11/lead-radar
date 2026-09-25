"use client";

// Tablo filtresi: kayıtlı işletmelerde geçen kategoriler (Türkçe ad + adet), aranabilir.
// Değer ham `primaryType` kodudur (URL'de `category=cafe`). `SearchableCombobox`'ın ince sarmalayıcısı.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/components/api-client";
import { SearchableCombobox } from "@/components/searchable-combobox";
import { categoryLabel } from "@/lib/categories";
import type { CategoryCount } from "@/lib/types";
import { tr } from "@/lib/tr";

interface CategoryComboboxProps {
  value: string | undefined;
  onChange: (category: string | undefined) => void;
  className?: string;
}

export function CategoryCombobox({ value, onChange, className }: CategoryComboboxProps) {
  const { data } = useQuery({
    queryKey: ["business-categories"],
    queryFn: () => apiFetch<CategoryCount[]>("/api/businesses/categories"),
  });

  const { items, labels } = useMemo(() => {
    const labels = new Map<string, string>();
    const sorted = [...(data ?? [])].sort((a, b) =>
      categoryLabel(a.code).localeCompare(categoryLabel(b.code), "tr"),
    );
    for (const { code, count } of sorted) labels.set(code, `${categoryLabel(code)} (${count})`);
    // URL'deki kategori listede yoksa (ör. o kategoride işletme kalmadı) yine seçili görünsün
    if (value && !labels.has(value)) labels.set(value, categoryLabel(value));
    return { items: [...labels.keys()], labels };
  }, [data, value]);

  return (
    <SearchableCombobox
      groups={[{ items }]}
      value={value}
      onChange={onChange}
      getLabel={(code) => labels.get(code) ?? categoryLabel(code)}
      allLabel={tr.businesses.filters.categoryAll}
      searchPlaceholder={tr.businesses.filters.categoryPlaceholder}
      emptyText={tr.businesses.filters.categoryEmpty}
      aria-label={tr.businesses.filters.categoryLabel}
      className={className}
    />
  );
}
