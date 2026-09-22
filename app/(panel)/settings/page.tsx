import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PlacesStatusCard } from "@/components/settings/places-status-card";
import { CitiesCard } from "@/components/settings/cities-card";
import { BonusCategoriesCard } from "@/components/settings/bonus-categories-card";
import { TemplatesCard } from "@/components/settings/templates-card";
import { tr } from "@/lib/tr";

export const metadata: Metadata = {
  title: `${tr.settings.title} · ${tr.app.name}`,
};

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title={tr.settings.title} description={tr.settings.description} />
      <div className="flex flex-col gap-6">
        <PlacesStatusCard />
        <CitiesCard />
        <BonusCategoriesCard />
        <TemplatesCard />
      </div>
    </div>
  );
}
