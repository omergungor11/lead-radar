// Harita alanı yarıçapını okunur biçime çevirir (tr-TR).
// components/search-form.tsx, components/searches/* paylaşır.

export function formatRadius(radiusM: number): string {
  if (radiusM < 1000) return `${radiusM} m`;
  const km = radiusM / 1000;
  const decimals = Number.isInteger(km) ? 0 : 1;
  return `${km.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} km`;
}
