"use client";

// Genel aranabilir, gruplu seçici. Türkçe karakter duyarsız filtre uygular.
// `CityCombobox` ve `DistrictCombobox` bunun üzerine ince sarmalayıcıdır.

import { useState } from "react";
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

function filterItem(value: string, search: string): number {
  return fold(value).includes(fold(search)) ? 1 : 0;
}

export interface SearchableComboboxGroup {
  label?: string;
  items: readonly string[];
}

interface SearchableComboboxProps {
  groups: SearchableComboboxGroup[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  /** Verilirse listenin başında "tümü" seçeneği olur (filtre kullanımı) */
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchableCombobox({
  groups,
  value,
  onChange,
  allLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  id,
  className,
  "aria-label": ariaLabel,
}: SearchableComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  function select(item: string | undefined): void {
    onChange(item);
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
        <Command filter={filterItem}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
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
            {visibleGroups.map((group, i) => (
              <CommandGroup key={group.label ?? i} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem key={item} value={item} onSelect={() => select(item)}>
                    {item}
                    <Check className={cn("ml-auto", value === item ? "opacity-100" : "opacity-0")} />
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
