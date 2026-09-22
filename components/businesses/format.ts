// Tarih/sayı biçimlendirme yardımcıları (tr-TR). Sadece bu component ağacında kullanılır.

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ratingFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const countFormatter = new Intl.NumberFormat("tr-TR");

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatRatingReviews(
  rating: number | null,
  count: number | null,
): string {
  if (rating == null && count == null) return "—";
  const ratingText = rating == null ? "—" : ratingFormatter.format(rating);
  const countText = count == null ? "0" : countFormatter.format(count);
  return `${ratingText} · ${countText}`;
}
