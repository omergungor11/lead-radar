import Link from "next/link";
import type { Status } from "@/lib/status";
import { tr } from "@/lib/tr";

interface PipelineFunnelProps {
  funnel: { status: Status; count: number }[];
}

export function PipelineFunnel({ funnel }: PipelineFunnelProps) {
  const max = Math.max(1, ...funnel.map((row) => row.count));

  return (
    <div className="flex flex-col gap-2.5">
      {funnel.map((row) => {
        const widthPercent = Math.round((row.count / max) * 100);
        return (
          <Link
            key={row.status}
            href={`/businesses?status=${row.status}`}
            className="group flex items-center gap-3 text-sm"
          >
            <span className="w-28 shrink-0 text-muted-foreground group-hover:text-foreground">
              {tr.status[row.status]}
            </span>
            <span className="h-5 flex-1 overflow-hidden rounded-md bg-muted">
              <span
                className="block h-full rounded-md bg-primary/70 transition-all group-hover:bg-primary"
                style={{ width: `${widthPercent}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-medium text-foreground">
              {row.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
