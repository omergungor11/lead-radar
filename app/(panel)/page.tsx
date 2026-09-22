import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.panel.dashboard.title} · ${tr.app.name}`,
};

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title={tr.panel.dashboard.title} />
      <p className="text-sm text-muted-foreground">
        {tr.panel.dashboard.placeholder}
      </p>
    </div>
  );
}
