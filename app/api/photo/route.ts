// Fotoğraf proxy'si: anahtar sunucuda kalır, istemci anahtarsız googleusercontent URL'sine 302 ile gider.
// Dosya indirilmez / saklanmaz (Places ToS). Mock modda dışarı çıkmadan deterministik SVG döner.

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getPlacesClient, isPlacesMock } from "@/lib/places";
import { tr } from "@/lib/tr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REAL_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const MOCK_NAME = /^mock\/photo-\d+$/;
const MIN_WIDTH = 64;
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = 400;
const CACHE_CONTROL = "private, max-age=3600";

function parseWidth(raw: string | null): number | null {
  if (raw === null || raw === "") return DEFAULT_WIDTH;
  if (!/^\d+$/.test(raw)) return null;
  const w = Number(raw);
  return w >= MIN_WIDTH && w <= MAX_WIDTH ? w : null;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mockPhotoSvg(name: string, width: number): string {
  const height = Math.round(width * 0.75);
  const h = hash(name);
  const hue = h % 360;
  const hue2 = (hue + 40) % 360;
  const r = Math.round(Math.min(width, height) * 0.18);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="hsl(${hue} 55% 55%)"/><stop offset="1" stop-color="hsl(${hue2} 60% 35%)"/>`,
    `</linearGradient></defs>`,
    `<rect width="100%" height="100%" fill="url(#g)"/>`,
    `<circle cx="${Math.round(width / 2)}" cy="${Math.round(height / 2)}" r="${r}" fill="hsl(${hue} 70% 85% / 0.6)"/>`,
    `</svg>`,
  ].join("");
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const width = parseWidth(url.searchParams.get("w"));
  const mock = isPlacesMock();

  const validName = REAL_NAME.test(name) || (mock && MOCK_NAME.test(name));
  if (!validName || width === null) {
    return apiError(400, "VALIDATION_ERROR", tr.errors.invalidPhotoName);
  }

  if (mock) {
    return new Response(mockPhotoSvg(name, width), {
      status: 200,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": CACHE_CONTROL },
    });
  }

  const client = getPlacesClient();
  if (!client) return apiError(503, "PLACES_NOT_CONFIGURED", tr.errors.placesNotConfigured);

  let photoUri: string;
  try {
    photoUri = await client.getPhotoUri(name, width);
  } catch {
    return apiError(502, "PHOTO_UNAVAILABLE", tr.errors.photoUnavailable);
  }

  const response = NextResponse.redirect(photoUri, 302);
  response.headers.set("Cache-Control", CACHE_CONTROL);
  return response;
}
