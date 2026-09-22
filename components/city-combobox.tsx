"use client";

// Aranabilir, KKTC / Türkiye gruplu şehir seçici. Arama formu ve tablo filtresi kullanır.
// Liste DB'deki `Setting.cities`'ten gelir; gruplama `lib/config` sabitlerine göre yapılır.

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KKTC_CITIES, TURKEY_PROVINCES } from "@/lib/config";
import { tr } from "@/lib/tr";
import { cn } from "@/lib/utils";

const FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c", â: "a", î: "i", û: "u" };

/** "İstanbul" ~ "istanbul" ~ "ISTANBUL", "Muğla" ~ "mugla" */
function fold(value: string): string {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ışğüöçâîû]/g, (ch) => FOLD[ch] ?? ch);
}

function filterCity(value: string, search: string): number {
  return fold(value).includes(fold(search)) ? 1 : 0;
}

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
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const kktc = cities.filter((c) => KKTC.has(c));
    const turkey = cities.filter((c) => TURKEY.has(c));
    const other = cities.filter((c) => !KKTC.has(c) && !TURKEY.has(c));
    return [
      { label: tr.cityPicker.groupKktc, items: kktc },
      { label: tr.cityPicker.groupTurkey, items: turkey },
      { label: tr.cityPicker.groupOther, items: other },
    ].filter((g) => g.items.length > 0);
  }, [cities]);

  function select(city: string | undefined): void {
    onChange(city);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ?? allLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
        <Command filter={filterCity}>
          <CommandInput placeholder={tr.cityPicker.search} />
          <CommandList>
            <CommandEmpty>{tr.cityPicker.empty}</CommandEmpty>
            {allLabel && (
              <>
                <CommandGroup>
                  <CommandItem value={allLabel} onSelect={() => select(undefined)}>
                    {allLabel}
                    <Check className={cn("ml-auto", value ? "opacity-0" : "opacity-100")} />
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((city) => (
                  <CommandItem key={city} value={city} onSelect={() => select(city)}>
                    {city}
                    <Check className={cn("ml-auto", value === city ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
