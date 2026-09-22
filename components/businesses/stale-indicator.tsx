"use client";

import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { tr } from "@/lib/tr";

export function StaleIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle
            aria-label={tr.businesses.stale}
            className="size-3.5 shrink-0 text-amber-500"
          />
        </TooltipTrigger>
        <TooltipContent>{tr.businesses.staleTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
