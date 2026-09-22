import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.panel.searches.title} · ${tr.app.name}`,
};

export default function SearchesPage() {
  return (
    <div>
      <PageHeader title={tr.panel.searches.title} />
      <p className="text-sm text-muted-foreground">
        {tr.panel.searches.placeholder}
      </p>
    </div>
  );
}
