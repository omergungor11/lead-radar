"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DatalistOption {
  value: string;
  label: string;
}

interface TagListEditorProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  addLabel: string;
  inputPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  datalistId?: string;
  datalistOptions?: DatalistOption[];
  renderChipLabel?: (value: string) => ReactNode;
}

export function TagListEditor({
  items,
  onAdd,
  onRemove,
  addLabel,
  inputPlaceholder,
  emptyLabel,
  disabled,
  datalistId,
  datalistOptions,
  renderChipLabel,
}: TagListEditorProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <Badge key={item} variant="secondary" className="h-auto gap-1 py-1 pr-1">
              {renderChipLabel ? renderChipLabel(item) : item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                disabled={disabled}
                aria-label={item}
                className="ml-1 rounded-full p-0.5 hover:bg-foreground/10 disabled:opacity-50"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          disabled={disabled}
          list={datalistId}
          className="max-w-xs"
        />
        {datalistId && datalistOptions ? (
          <datalist id={datalistId}>
            {datalistOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        ) : null}
        <Button type="button" variant="outline" onClick={submit} disabled={disabled}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
