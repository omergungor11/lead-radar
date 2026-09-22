import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "../../playwright.config";

// DoD smoke: giriş → arama (mock) → tablo → detay → export.

test("oturumsuz kullanıcı giriş sayfasına yönlenir", async ({ page }) => {
  await page.goto("/businesses");
  await expect(page).toHaveURL(/\/login\?next=%2Fbusinesses/);
});

test("giriş → arama → tablo → detay → şablon → export", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Giriş (önce yanlış şifre)
  await page.goto("/login");
  await page.getByLabel("Şifre").fill("yanlis-sifre");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByText("Şifre hatalı")).toBeVisible();
  await page.getByLabel("Şifre").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Arama (mock Places, SSE ilerleme)
  await page.getByRole("link", { name: "Aramalar" }).click();
  await page.getByRole("button", { name: "berber" }).click();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Lefkoşa" }).click();
  await page.getByRole("button", { name: "Tara" }).click();
  const results = page.getByRole("link", { name: "Sonuçları gör" });
  await expect(results).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/\d+ tarandı · \d+ sitesiz · \d+ kaydedildi/)).toBeVisible();

  // Tablo — şehir filtresi URL'de
  await results.click();
  await expect(page).toHaveURL(/\/businesses\?city=Lefko/);
  // Skeleton satırlarında checkbox yok → yalnız gerçek veri satırları
  const rows = page.locator("tbody tr").filter({ has: page.getByRole("checkbox") });
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(3);

  // Tüm liste: mock seed 15 sitesiz işletme (arama yeni kayıt eklemez, upsert eder)
  await page.goto("/businesses");
  await expect(rows).toHaveCount(15);

  // Detay sheet
  const firstRowText = await rows.first().innerText();
  await rows.first().getByRole("button").filter({ hasText: /\S/ }).first().click();
  await expect(page).toHaveURL(/[?&]id=/);
  const sheet = page.getByRole("dialog");
  const title = sheet.locator('[data-slot="sheet-title"]');
  await expect(title).not.toBeEmpty();
  expect(firstRowText).toContain((await title.innerText()).trim());
  await expect(sheet.getByText("Skor kırılımı")).toBeVisible();
  await expect(sheet.getByText("Mesaj şablonu")).toBeVisible();

  // Şablon → panoya kopyala → durum "Temas edildi" (StatusChange geçmişte görünür)
  await sheet.getByRole("combobox", { name: "Mesaj şablonu" }).click();
  await page.getByRole("option", { name: /WhatsApp/ }).first().click();
  await sheet.getByRole("button", { name: "Kopyala", exact: true }).last().click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("Piton Studios");
  expect(clip).not.toContain("{{");
  await expect(sheet.getByText(/→\s*Temas edildi/).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  // Export
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Filtreli listeyi Excel'e aktar" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^lead-radar-\d{4}-\d{2}-\d{2}\.xlsx$/);
});
