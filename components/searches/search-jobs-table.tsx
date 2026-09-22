// Geçmiş arama işleri tablosu. `/searches` ve dashboard tarafından paylaşılır.
// Veri çekme sorumluluğu çağırana ait; bu bileşen yalnızca render eder.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCityDistrict } from "@/components/businesses/format";
import type { SearchJobDto } from "@/lib/types";
import { tr } from "@/lib/tr";

interface SearchJobsTableProps {
  jobs: SearchJobDto[];
  isLoading?: boolean;
  emptyLabel?: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "—";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} dk ${seconds} sn` : `${seconds} sn`;
}

function formatCost(value: number): string {
  return `$${value.toFixed(3)}`;
}

function statusBadge(status: SearchJobDto["status"]) {
  if (status === "RUNNING") {
    return <Badge variant="outline">{tr.searches.table.statusRunning}</Badge>;
  }
  if (status === "FAILED") {
    return <Badge variant="destructive">{tr.searches.table.statusFailed}</Badge>;
  }
  return <Badge variant="secondary">{tr.searches.table.statusDone}</Badge>;
}

export function SearchJobsTable({ jobs, isLoading, emptyLabel }: SearchJobsTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyLabel ?? tr.searches.history.empty}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tr.searches.table.query}</TableHead>
          <TableHead>{tr.searches.table.city}</TableHead>
          <TableHead>{tr.searches.table.status}</TableHead>
          <TableHead className="text-right">{tr.searches.table.scanned}</TableHead>
          <TableHead className="text-right">{tr.searches.table.withoutWebsite}</TableHead>
          <TableHead className="text-right">{tr.searches.table.saved}</TableHead>
          <TableHead className="text-right">{tr.searches.table.cost}</TableHead>
          <TableHead>{tr.searches.table.startedAt}</TableHead>
          <TableHead>{tr.searches.table.duration}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.query}</TableCell>
            <TableCell>{formatCityDistrict(job.city, job.district)}</TableCell>
            <TableCell>{statusBadge(job.status)}</TableCell>
            <TableCell className="text-right">{job.scanned}</TableCell>
            <TableCell className="text-right">{job.withoutWebsite}</TableCell>
            <TableCell className="text-right">{job.saved}</TableCell>
            <TableCell className="text-right">{formatCost(job.estimatedCost)}</TableCell>
            <TableCell>{formatDateTime(job.startedAt)}</TableCell>
            <TableCell>{formatDuration(job.startedAt, job.finishedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
