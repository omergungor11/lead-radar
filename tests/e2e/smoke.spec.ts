import { expect, test } from "@playwright/test";

// TASK-111'de gerçek akışla (giriş → arama → tablo → detay → export) değiştirilecek.
test("uygulama açılıyor", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveTitle(/Lead Radar/);
});
