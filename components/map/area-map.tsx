"use client";

// Harita ile arama alanı seçimi — anahtarsız/ücretsiz Carto Positron vektör stiliyle MapLibre.
// Yalnızca arama merkezini/yarıçapını seçtirir; mevcut işletme pinleri GÖSTERİLMEZ
// (BusinessListItem'da lat/lng yok, yalnızca BusinessDetail'de var — bu bileşen listeyle çalışmaz).
// SSR yok: `next/dynamic({ ssr: false })` ile yüklenmeli (MapLibre `window` gerektirir).

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import type { GeoJSONSource, LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { SEARCH_RADIUS_DEFAULT_M, type LatLng } from "@/lib/geo";
import type { SearchArea } from "@/lib/types";

// Turbopack, maplibre'nin paket içi module-worker'ını başlatamıyor (işçi sessizce ölüyor, harita boş kalır).
// Worker `public/` altından servis edilir; kopyalar `scripts/copy-maplibre-worker.mjs` ile güncellenir.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const SOURCE_ID = "search-area-circle";
const CIRCLE_STEPS = 64;
const AREA_COLOR = "#2563eb";

interface CirclePolygonFeature {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

interface CircleFeatureCollection {
  type: "FeatureCollection";
  features: CirclePolygonFeature[];
}

const EMPTY_FC: CircleFeatureCollection = { type: "FeatureCollection", features: [] };

/** Metre yarıçaplı çemberi 64 kenarlı çokgene çevirir (enlem düzeltmeli derece dönüşümü). */
function circleFeature(center: LatLng, radiusM: number): CirclePolygonFeature {
  const latRad = (center.lat * Math.PI) / 180;
  const dLat = radiusM / 110_540;
  const dLng = radiusM / (111_320 * Math.cos(latRad));
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_STEPS; i++) {
    const angle = (i / CIRCLE_STEPS) * 2 * Math.PI;
    coordinates.push([center.lng + dLng * Math.cos(angle), center.lat + dLat * Math.sin(angle)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coordinates] },
  };
}

export interface AreaMapProps {
  /** Haritanın hedef merkezi — değişince `flyTo` ile buraya gider (örn. şehir değişimi) */
  center: LatLng;
  zoom: number;
  /** Seçili alan; `null` → daire/işaretçi gösterilmez */
  value: SearchArea | null;
  onChange: (area: SearchArea) => void;
  disabled?: boolean;
  className?: string;
}

export function AreaMap({ center, zoom, value, onChange, disabled, className }: AreaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [ready, setReady] = useState(false);

  valueRef.current = value;
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  // Harita yaşam döngüsü — yalnızca mount/unmount. StrictMode iki kez çalıştırırsa
  // ilk mount temiz `map.remove()` ile kapanır, ikinci mount aynı container'da yeni bir
  // map kurar; `containerRef.current` boşsa (henüz DOM'a bağlanmadıysa) hiçbir şey yapılmaz.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: STYLE_URL,
      center: [center.lng, center.lat] as LngLatLike,
      zoom,
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __areaMap?: MapLibreMap }).__areaMap = map;
    }

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: `${SOURCE_ID}-fill`,
        type: "fill",
        source: SOURCE_ID,
        paint: { "fill-color": AREA_COLOR, "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: `${SOURCE_ID}-line`,
        type: "line",
        source: SOURCE_ID,
        paint: { "line-color": AREA_COLOR, "line-width": 2 },
      });
      setReady(true);
    });

    // Stil/tile hataları sessiz kalmasın (aksi halde harita boş görünür, sebebi görünmez)
    map.on("error", (event) => {
      console.error("[area-map]", event.error?.message ?? event);
    });

    map.on("click", (event) => {
      if (disabledRef.current) return;
      onChangeRef.current({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        radiusM: valueRef.current?.radiusM ?? SEARCH_RADIUS_DEFAULT_M,
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca mount/unmount; center/zoom/disabled değişimleri ayrı effect'lerde ele alınıyor
  }, []);

  // `center`/`zoom` prop'u değişince (örn. şehir seçimi) haritayı oraya uçur.
  useEffect(() => {
    if (!ready) return;
    mapRef.current?.flyTo({ center: [center.lng, center.lat] as LngLatLike, zoom, essential: true });
  }, [ready, center.lat, center.lng, zoom]);

  // Seçili alan (veya disabled durumu) değişince daireyi/işaretçiyi güncelle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;

    if (!value) {
      source?.setData(EMPTY_FC);
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    source?.setData({ type: "FeatureCollection", features: [circleFeature(value, value.radiusM)] });

    if (markerRef.current) {
      markerRef.current.setLngLat([value.lng, value.lat]);
      markerRef.current.setDraggable(!disabled);
    } else {
      const marker = new Marker({ draggable: !disabled, color: AREA_COLOR })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onChangeRef.current({
          lat: lngLat.lat,
          lng: lngLat.lng,
          radiusM: valueRef.current?.radiusM ?? value.radiusM,
        });
      });
      markerRef.current = marker;
    }
  }, [ready, value, disabled]);

  // Devre dışı bırakılınca imleci ve sürüklenebilirliği güncelle.
  useEffect(() => {
    markerRef.current?.setDraggable(!disabled);
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = disabled ? "not-allowed" : "";
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-[260px] w-full overflow-hidden rounded-lg border border-border sm:h-[360px]",
        className,
      )}
    />
  );
}
