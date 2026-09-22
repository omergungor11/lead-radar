import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { BusinessTable } from "@/components/business-table";
import { Skeleton } from "@/components/ui/skeleton";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.panel.businesses.title} · ${tr.app.name}`,
};

export default function BusinessesPage() {
  return (
    <div>
      <PageHeader title={tr.panel.businesses.title} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BusinessTable />
      </Suspense>
    </div>
  );
}
