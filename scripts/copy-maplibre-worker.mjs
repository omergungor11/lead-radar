// maplibre-gl'in module worker'ını public/ altına kopyalar.
// Neden: Turbopack, paket içindeki `new Worker(new URL(...), { type: "module" })` çağrısını
// çalışır hale getiremiyor — worker sessizce ölüyor ve harita boş kalıyor (tile isteği gitmiyor).
// `components/map/area-map.tsx` içinde `setWorkerUrl("/maplibre-gl-worker.mjs")` bunları kullanır.
// postinstall'da çalışır; public/maplibre-gl-*.mjs gitignore'da (sürüm kayması olmasın).

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public");

// worker, shared chunk'ı relative import eder → ikisi de aynı dizinde olmalı
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await mkdir(to, { recursive: true });
for (const file of FILES) {
  await copyFile(join(from, file), join(to, file));
}
console.log(`maplibre worker kopyalandı: ${FILES.join(", ")}`);
