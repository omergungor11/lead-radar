import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  href?: string;
}

export function StatCard({ title, value, icon: Icon, href }: StatCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full transition-colors",
        href ? "hover:border-primary/50 hover:bg-muted/40" : undefined,
      )}
    >
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{title}</span>
          <span className="text-xl font-semibold text-foreground">{value}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
