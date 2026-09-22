import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);

// E2E ayrı bir SQLite dosyasında (prisma/e2e.db) ve mock Places ile çalışır → dev verisine dokunmaz.
// Değerler process.env'e verildiği için Next'in .env yüklemesi bunları ezmez.
export const E2E_ADMIN_PASSWORD = "e2e-sifre";
const e2eEnv = {
  DATABASE_URL: "file:./e2e.db",
  ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
  SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0000",
  PLACES_MOCK: "1",
  GOOGLE_PLACES_API_KEY: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // migrate deploy yıkıcı değildir; seed idempotent (PLACES_MOCK=1 → 15 işletme)
    command: `pnpm exec prisma migrate deploy && pnpm db:seed && pnpm dev --port ${PORT}`,
    port: PORT,
    // Başka bir sunucuyu (farklı DB / şifre) yanlışlıkla yeniden kullanmamak için kapalı
    reuseExistingServer: false,
    env: e2eEnv,
    timeout: 180_000,
  },
});
