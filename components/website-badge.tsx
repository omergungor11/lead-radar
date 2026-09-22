"use client";

// Google `websiteUri`'sini sınıflandırıp küçük bir rozet + dış link olarak gösterir.
// NONE → hiçbir şey. SOCIAL/PLATFORM → nötr rozet. WEBSITE → uyarı tonlu rozet
// (yenilemede kendi sitesini edinmiş işletme; artık lead olmayabilir).

import { AtSign, ExternalLink, Store, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { classifyWebsite, type WebsiteKind } from "@/lib/website";
import { tr } from "@/lib/tr";

interface WebsiteBadgeProps {
  websiteUri: string | null;
  websiteKind: WebsiteKind;
  className?: string;
}

const ICON_BY_KIND: Record<Exclude<WebsiteKind, "NONE">, LucideIcon> = {
  SOCIAL: AtSign,
  PLATFORM: Store,
  WEBSITE: TriangleAlert,
};

export function WebsiteBadge({ websiteUri, websiteKind, className }: WebsiteBadgeProps) {
  if (websiteKind === "NONE" || !websiteUri) return null;

  const label = classifyWebsite(websiteUri).label ?? tr.website.kinds[websiteKind];
  const Icon = ICON_BY_KIND[websiteKind];
  const isWarning = websiteKind === "WEBSITE";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            asChild
            variant={isWarning ? "destructive" : "secondary"}
            className={cn("max-w-32 cursor-pointer gap-1", className)}
          >
            <a
              href={websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              <Icon className="size-3 shrink-0" />
              <span className="truncate">{label}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{websiteUri}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
