# Tech Stack

> Versiyonlar ilk kurulumda (`TASK-101`) `package.json`'dan buraya yazılır.
> Büyük versiyon yükseltmeleri `lead-docs/DECISIONS.md`'ye kaydedilir.

## Runtime
- Node.js 22 LTS
- pnpm 9

## Uygulama (tek Next.js projesi — monorepo değil)
- Next.js 15 (App Router, Route Handlers, Server Components)
- TypeScript 5 strict
- zod — tüm API body doğrulaması
- libphonenumber-js — E.164 normalize (`wa.me` linkleri için)

## Frontend
- Tailwind CSS 4
- shadcn/ui (Table, Sheet, Badge, Select, Dialog, Input, Button, Card, Tabs)
- TanStack Query 5 — liste/detay cache
- lucide-react — ikonlar

## Veri
- Prisma 6 + SQLite (`prisma/dev.db`) — MVP. Postgres'e geçiş: `provider` değişimi + enum/JSON tipleri
- exceljs — `.xlsx` export

## Dış servisler
- Google Places API (New): Text Search, Place Details, Place Photos
  - Field mask zorunlu; maliyet sabitleri `lib/config.ts`
  - `PLACES_MOCK=1` → `lib/places.mock.ts` (15 fixture), anahtar gerekmez

## Test
- Vitest — `lib/scoring`, `lib/status`, `lib/phone`, `lib/export`
- Playwright — 1 smoke (giriş → arama (mock) → tablo → detay → export)

## Altyapı
- Docker yok (MVP)
- Deploy hedefi: VPS'te `pnpm build && pnpm start` veya Vercel (SQLite için Turso/LibSQL'e geçiş gerekir — Phase 4)
- CI: GitHub Actions — typecheck + lint + test (iskelet `TASK-101`'de)

## Kapsam dışı (bilinçli)
- Redis / BullMQ — arama işi senkron + SSE
- i18n framework — sadece Türkçe, `lib/tr.ts`
- Auth kütüphanesi — tek şifre + httpOnly cookie
