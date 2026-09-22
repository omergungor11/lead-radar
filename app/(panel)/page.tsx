import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.panel.dashboard.title} · ${tr.app.name}`,
};

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title={tr.dashboard.title}
        description={tr.dashboard.description}
      />
      <DashboardView />
    </div>
  );
}
