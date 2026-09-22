"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, MessageCircle, Phone, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/score-badge";
import { StatusSelect } from "@/components/status-select";
import { Gallery } from "@/components/businesses/gallery";
import { ScoreBreakdown } from "@/components/businesses/score-breakdown";
import { StatusHistory } from "@/components/businesses/status-history";
import { NotesPanel } from "@/components/businesses/notes-panel";
import { TemplatePanel } from "@/components/businesses/template-panel";
import { EditableEmailCell } from "@/components/businesses/editable-email-cell";
import { StaleIndicator } from "@/components/businesses/stale-indicator";
import { WebsiteBadge } from "@/components/website-badge";
import { formatCityDistrict, formatRatingReviews } from "@/components/businesses/format";
import { ApiRequestError, refreshBusiness } from "@/components/businesses/api";
import { useBusinessDetailQuery } from "@/components/businesses/use-business-detail-query";
import { waLink } from "@/lib/phone";
import { categoryLabel } from "@/lib/categories";
import { tr } from "@/lib/tr";

interface BusinessSheetProps {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessSheet({ id, open, onOpenChange }: BusinessSheetProps) {
  const queryClient = useQueryClient();
  const { data: business, isLoading, isError } = useBusinessDetailQuery(id);

  const refreshMutation = useMutation({
    mutationFn: () => refreshBusiness(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", id] });
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success(tr.detail.refresh.success);
    },
    onError: (error) => {
      if (error instanceof ApiRequestError && error.statusCode === 503) {
        toast.error(tr.detail.refresh.unavailable);
      } else {
        toast.error(tr.detail.refresh.error);
      }
    },
  });

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(tr.common.copySuccess);
    } catch {
      toast.error(tr.common.copyError);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        // Toast'a ("Geri al") tıklamak dışarı tıklama sayılıp sheet'i kapatmasın
        onInteractOutside={(event) => {
          if ((event.target as Element | null)?.closest("[data-sonner-toaster]")) event.preventDefault();
        }}
      >
        {!id || isLoading ? (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError || !business ? (
          <div className="p-4">
            <p className="text-sm text-destructive">{tr.detail.loadError}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-4">
            <Gallery photos={business.photos} name={business.name} />

            <SheetHeader className="gap-2 p-0">
              <SheetTitle className="flex items-center gap-2 text-lg">
                {business.name}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {categoryLabel(business.primaryType)} · {formatCityDistrict(business.city, business.district)}
                </span>
                <ScoreBadge score={business.score} band={business.band} />
                <StatusSelect id={business.id} status={business.status} />
                {business.isStale ? <StaleIndicator /> : null}
                <Button
                  size="sm"
                  variant={business.isStale ? "default" : "outline"}
                  disabled={refreshMutation.isPending}
                  onClick={() => refreshMutation.mutate()}
                  className="ml-auto"
                >
                  <RefreshCw className="size-3.5" />
                  {refreshMutation.isPending ? tr.detail.refresh.loading : tr.detail.refresh.button}
                </Button>
              </div>
            </SheetHeader>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.contact.title}</h3>
              <p className="text-sm text-muted-foreground">
                {business.address || tr.detail.contact.addressEmpty}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {business.phone ? (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${business.phoneE164 ?? business.phone}`}>
                        <Phone className="size-3.5" />
                        {tr.detail.contact.call}
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyPhone(business.phone as string)}>
                      {tr.detail.contact.copy}
                    </Button>
                    {business.phoneE164 ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={waLink(business.phoneE164)} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-3.5" />
                          {tr.detail.contact.whatsapp}
                        </a>
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {business.googleMapsUri ? (
                  <Button size="sm" variant="outline" asChild>
                    <a href={business.googleMapsUri} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                      {tr.detail.contact.maps}
                    </a>
                  </Button>
                ) : null}
                {/* Rozet kendisi profile giden link (yeni sekme) */}
                {business.websiteUri ? (
                  <WebsiteBadge websiteUri={business.websiteUri} websiteKind={business.websiteKind} />
                ) : null}
              </div>
              <EditableEmailCell id={business.id} email={business.email} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.overview.title}</h3>
              <p className="text-sm text-muted-foreground">
                {formatRatingReviews(business.rating, business.userRatingCount)}
              </p>
              {business.openingHours.length > 0 ? (
                <ul className="text-sm text-muted-foreground">
                  {business.openingHours.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{tr.detail.overview.hoursEmpty}</p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.reviews.title}</h3>
              {business.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tr.detail.reviews.empty}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {business.reviews.map((review, i) => (
                    <li key={i} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{review.author}</span>
                        {review.rating != null ? (
                          <span className="tabular-nums text-muted-foreground">
                            {review.rating}/5
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-muted-foreground">
                        {review.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.score.title}</h3>
              <ScoreBreakdown breakdown={business.scoreBreakdown} total={business.score} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.template.title}</h3>
              <TemplatePanel business={business} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.history.title}</h3>
              <StatusHistory changes={business.statusChanges} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{tr.detail.notes.title}</h3>
              <NotesPanel id={business.id} notes={business.notes} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
