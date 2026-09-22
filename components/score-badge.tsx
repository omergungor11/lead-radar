"use client";

import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ScoreBand } from "@/lib/scoring";
import { tr } from "@/lib/tr";

const BAND_STYLES: Record<ScoreBand, string> = {
  HOT: "bg-red-500/15 text-red-600 ring-1 ring-inset ring-red-500/30 dark:text-red-400",
  WARM: "bg-amber-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400",
  COLD: "bg-sky-500/15 text-sky-600 ring-1 ring-inset ring-sky-500/30 dark:text-sky-400",
};

interface ScoreBadgeProps {
  score: number;
  band: ScoreBand;
  className?: string;
}

export function ScoreBadge({ score, band, className }: ScoreBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex h-6 min-w-9 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums",
              BAND_STYLES[band],
              className,
            )}
          >
            {score}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {tr.scoreBands[band]} · {score}/100
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
