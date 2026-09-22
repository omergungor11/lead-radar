import type { ScoreBreakdownItem, ScoreSignal } from "@/lib/scoring";
import { tr } from "@/lib/tr";

const SIGNAL_MAX: Record<ScoreSignal, number> = {
  reviewCount: 30,
  rating: 20,
  photos: 15,
  phone: 15,
  recency: 10,
  category: 10,
};

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownItem[];
  total: number;
}

export function ScoreBreakdown({ breakdown, total }: ScoreBreakdownProps) {
  return (
    <div className="flex flex-col gap-2">
      {breakdown.map((item) => {
        const max = SIGNAL_MAX[item.signal];
        const pct = Math.min(100, Math.round((item.points / max) * 100));
        return (
          <div key={item.signal} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-muted-foreground">
              {tr.scoreSignals[item.signal]}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">
              {item.points} / {max}
            </span>
          </div>
        );
      })}
      <div className="mt-1 flex items-center justify-between border-t pt-2 text-sm font-medium">
        <span>{tr.detail.score.total}</span>
        <span className="tabular-nums">{total} / 100</span>
      </div>
    </div>
  );
}
