import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.panel.businesses.title} · ${tr.app.name}`,
};

export default function BusinessesPage() {
  return (
    <div>
      <PageHeader title={tr.panel.businesses.title} />
      <p className="text-sm text-muted-foreground">
        {tr.panel.businesses.placeholder}
      </p>
    </div>
  );
}
