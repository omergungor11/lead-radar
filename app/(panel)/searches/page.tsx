import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SearchesView } from "@/components/searches/searches-view";
import { getMapsBrowserKey } from "@/lib/env";
import { tr } from "@/lib/tr";

// Harita anahtarı çalışma anında okunur (build'e gömülmesin, .env değişince rebuild gerekmesin).
export const dynamic = "force-dynamic";

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
      <SearchesView mapsApiKey={getMapsBrowserKey()} />
    </div>
  );
}
