"use client";

// Şehre göre aranabilir ilçe seçici. İlçe listesi boşsa (KKTC şehirleri) null döner.

import { districtsOf } from "@/lib/districts";
import { tr } from "@/lib/tr";
import { SearchableCombobox } from "@/components/searchable-combobox";

interface DistrictComboboxProps {
  city: string | undefined;
  value: string | undefined;
  onChange: (district: string | undefined) => void;
  /** Varsayılan "Tüm ilçeler" (ilçesiz = tüm il) */
  allLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function DistrictCombobox({
  city,
  value,
  onChange,
  allLabel = tr.cityPicker.districtAll,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: DistrictComboboxProps): React.JSX.Element | null {
  const districts = districtsOf(city);
  if (districts.length === 0) return null;

  return (
    <SearchableCombobox
      groups={[{ items: districts }]}
      value={value}
      onChange={onChange}
      allLabel={allLabel}
      placeholder={tr.cityPicker.districtPlaceholder}
      searchPlaceholder={tr.cityPicker.districtSearch}
      emptyText={tr.cityPicker.districtEmpty}
      disabled={disabled}
      id={id}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
