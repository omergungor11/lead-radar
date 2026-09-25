"use client";

// Harita ile arama alanı seçimi — Google Maps JavaScript API.
// Yalnızca arama merkezini/yarıçapını seçtirir; mevcut işletme pinleri GÖSTERİLMEZ
// (BusinessListItem'da lat/lng yok, yalnızca BusinessDetail'de var — bu bileşen listeyle çalışmaz).
// Anahtar: GOOGLE_MAPS_BROWSER_KEY — Places anahtarından AYRI, yalnız "Maps JavaScript API" +
// HTTP referrer kısıtlı tarayıcı anahtarı. Sunucu sayfası çalışma anında prop olarak verir
// (NEXT_PUBLIC değil → build çıktısına gömülmez). SSR yok: `next/dynamic({ ssr: false })`.

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { cn } from "@/lib/utils";
import { SEARCH_RADIUS_DEFAULT_M, SEARCH_RADIUS_MAX_M, SEARCH_RADIUS_MIN_M, type LatLng } from "@/lib/geo";
import type { SearchArea } from "@/lib/types";
import { tr } from "@/lib/tr";

const AREA_COLOR = "#2563eb";

// setOptions yalnız ilk importLibrary'den önce bir kez çağrılabilir.
let optionsSet = false;

function clampRadius(radiusM: number): number {
  return Math.round(Math.min(SEARCH_RADIUS_MAX_M, Math.max(SEARCH_RADIUS_MIN_M, radiusM)));
}

export interface AreaMapProps {
  /** Maps JavaScript API tarayıcı anahtarı; yoksa harita yerine kurulum uyarısı gösterilir */
  apiKey: string | null;
  /** Haritanın hedef merkezi — değişince oraya kayar (örn. şehir değişimi) */
  center: LatLng;
  zoom: number;
  /** Seçili alan; `null` → daire gösterilmez */
  value: SearchArea | null;
  onChange: (area: SearchArea) => void;
  disabled?: boolean;
  className?: string;
}

export function AreaMap({ apiKey, center, zoom, value, onChange, disabled, className }: AreaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  valueRef.current = value;
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  // Harita yaşam döngüsü — yalnızca mount/unmount.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !apiKey) return;
    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];

    // Geçersiz/kısıtlı anahtarda Google bu global'i çağırır (aksi halde harita gri kalır, sebep görünmez).
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => setLoadError(true);

    if (!optionsSet) {
      setOptions({ key: apiKey, v: "weekly", language: "tr", region: "TR" });
      optionsSet = true;
    }

    const emit = (lat: number, lng: number, radiusM?: number): void => {
      onChangeRef.current({
        lat,
        lng,
        radiusM: clampRadius(radiusM ?? valueRef.current?.radiusM ?? SEARCH_RADIUS_DEFAULT_M),
      });
    };

    importLibrary("maps")
      .then(({ Map, Circle }) => {
        if (cancelled) return;
        const map = new Map(container, {
          center,
          zoom,
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
          gestureHandling: "greedy",
          draggableCursor: "crosshair",
        });
        mapRef.current = map;
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __areaMap?: google.maps.Map }).__areaMap = map;
        }

        // Daire hem sürüklenebilir (merkez) hem düzenlenebilir (kenardaki tutamaçla yarıçap).
        const circle = new Circle({
          map: null,
          strokeColor: AREA_COLOR,
          strokeWeight: 2,
          fillColor: AREA_COLOR,
          fillOpacity: 0.15,
          draggable: true,
          editable: true,
        });
        circleRef.current = circle;

        const onClick = (event: google.maps.MapMouseEvent): void => {
          if (disabledRef.current || !event.latLng) return;
          emit(event.latLng.lat(), event.latLng.lng());
        };
        listeners.push(map.addListener("click", onClick));
        listeners.push(
          circle.addListener("dragend", () => {
            const c = circle.getCenter();
            if (c) emit(c.lat(), c.lng());
          }),
        );
        // Yarıçap tutamacı bırakılınca tetiklenir; prop'tan gelen setRadius da tetikler →
        // yalnız gerçekten farklıysa yay (döngü olmasın).
        listeners.push(
          circle.addListener("radius_changed", () => {
            const current = valueRef.current;
            const c = circle.getCenter();
            if (!current || !c) return;
            const radiusM = clampRadius(circle.getRadius());
            if (radiusM !== current.radiusM) emit(c.lat(), c.lng(), radiusM);
          }),
        );
        setReady(true);
      })
      .catch((error: unknown) => {
        console.error("[area-map]", error);
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove());
      circleRef.current?.setMap(null);
      circleRef.current = null;
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca mount/unmount; center/zoom/value değişimleri ayrı effect'lerde
  }, [apiKey]);

  // `center`/`zoom` prop'u değişince (örn. şehir seçimi) haritayı oraya kaydır.
  useEffect(() => {
    if (!ready) return;
    mapRef.current?.panTo({ lat: center.lat, lng: center.lng });
    mapRef.current?.setZoom(zoom);
  }, [ready, center.lat, center.lng, zoom]);

  // Seçili alan (veya disabled) değişince daireyi güncelle.
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle || !ready) return;
    if (!value) {
      circle.setMap(null);
      return;
    }
    const c = circle.getCenter();
    if (!c || c.lat() !== value.lat || c.lng() !== value.lng) circle.setCenter({ lat: value.lat, lng: value.lng });
    if (Math.round(circle.getRadius()) !== value.radiusM) circle.setRadius(value.radiusM);
    circle.setOptions({ draggable: !disabled, editable: !disabled });
    if (!circle.getMap()) circle.setMap(mapRef.current);
  }, [ready, value, disabled]);

  useEffect(() => {
    mapRef.current?.setOptions({ draggableCursor: disabled ? "not-allowed" : "crosshair" });
  }, [disabled]);

  const boxClass = cn(
    "h-[260px] w-full overflow-hidden rounded-lg border border-border sm:h-[360px]",
    className,
  );

  if (!apiKey || loadError) {
    return (
      <div className={cn(boxClass, "flex items-center justify-center bg-muted p-4 text-center")}>
        <p className="max-w-md text-sm text-muted-foreground">
          {apiKey ? tr.searches.form.mapLoadError : tr.searches.form.mapKeyMissing}
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={boxClass} />;
}
