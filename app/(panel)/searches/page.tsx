import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SearchesView } from "@/components/searches/searches-view";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.panel.searches.title} · ${tr.app.name}`,
};

export default function SearchesPage() {
  return (
    <div>
      <PageHeader
        title={tr.searches.title}
        description={tr.searches.description}
      />
      <SearchesView />
    </div>
  );
}
