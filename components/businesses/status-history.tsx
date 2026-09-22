import { tr } from "@/lib/tr";
import type { Status } from "@/lib/status";
import type { StatusChangeDto } from "@/lib/types";
import { formatDateTime } from "./format";

interface StatusHistoryProps {
  changes: StatusChangeDto[];
}

export function StatusHistory({ changes }: StatusHistoryProps) {
  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground">{tr.detail.history.empty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {changes.map((change) => (
        <li key={change.id} className="flex items-center justify-between text-sm">
          <span>
            {tr.status[change.from as Status] ?? change.from} {tr.detail.history.arrow}{" "}
            <span className="font-medium">{tr.status[change.to as Status] ?? change.to}</span>
          </span>
          <span className="text-muted-foreground">{formatDateTime(change.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
