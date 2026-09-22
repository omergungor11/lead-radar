"use client";

// Aranabilir, KKTC / Türkiye gruplu şehir seçici. Arama formu ve tablo filtresi kullanır.
// Liste DB'deki `Setting.cities`'ten gelir; gruplama `lib/config` sabitlerine göre yapılır.
// `SearchableCombobox`'ın ince sarmalayıcısı.

import { useMemo } from "react";
import { KKTC_CITIES, TURKEY_PROVINCES } from "@/lib/config";
import { tr } from "@/lib/tr";
import { SearchableCombobox } from "@/components/searchable-combobox";

const KKTC = new Set(KKTC_CITIES);
const TURKEY = new Set(TURKEY_PROVINCES);

interface CityComboboxProps {
  cities: readonly string[];
  value: string | undefined;
  onChange: (city: string | undefined) => void;
  /** Verilirse listenin başında "tümü" seçeneği olur (filtre kullanımı) */
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function CityCombobox({
  cities,
  value,
  onChange,
  allLabel,
  placeholder = tr.cityPicker.placeholder,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: CityComboboxProps): React.JSX.Element {
  const groups = useMemo(() => {
    const kktc = cities.filter((c) => KKTC.has(c));
    const turkey = cities.filter((c) => TURKEY.has(c));
    const other = cities.filter((c) => !KKTC.has(c) && !TURKEY.has(c));
    return [
      { label: tr.cityPicker.groupKktc, items: kktc },
      { label: tr.cityPicker.groupTurkey, items: turkey },
      { label: tr.cityPicker.groupOther, items: other },
    ];
  }, [cities]);

  return (
    <SearchableCombobox
      groups={groups}
      value={value}
      onChange={onChange}
      allLabel={allLabel}
      placeholder={placeholder}
      searchPlaceholder={tr.cityPicker.search}
      emptyText={tr.cityPicker.empty}
      disabled={disabled}
      id={id}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
