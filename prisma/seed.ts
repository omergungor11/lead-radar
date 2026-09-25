import { PrismaClient } from "@prisma/client";
import { DEFAULT_CITIES, DEFAULT_BONUS_CATEGORIES, SETTING_KEYS } from "../lib/config";

const prisma = new PrismaClient();

const WHATSAPP_TEMPLATE_ID = "tpl-whatsapp-ilk-temas";
const EMAIL_TEMPLATE_ID = "tpl-email-ilk-temas";
const WHATSAPP_SOCIAL_TEMPLATE_ID = "tpl-whatsapp-sosyal";

// Paragraf içinde satır kırma yok — WhatsApp metni olduğu gibi gösterir.
// Şehir eki kullanma ("{{sehir}}'de" → "Lefkoşa'de" ünlü uyumu bozulur); "bölgesinde" nötr.
const WHATSAPP_BODY = [
  "Merhaba, kolay gelsin.",
  "Ben Piton Studios'tan yazıyorum, {{sehir}} bölgesindeki işletmelere web sitesi yapıyoruz. Google'da {{isletme}} sayfanıza denk geldim ama bir web siteniz görünmüyor.",
  "Size uygun olabilecek birkaç örnek göstermemi ister misiniz? Beğenirseniz konuşuruz, zorunluluk yok.",
  "İlgilenmiyorsanız yazmanız yeterli, bir daha rahatsız etmeyeceğim.",
].join("\n\n");

const EMAIL_BODY = [
  "Konu: {{isletme}} web sitesi hakkında",
  "Merhaba,",
  "Ben Piton Studios'tan yazıyorum, {{sehir}} bölgesindeki işletmelere web sitesi hazırlıyoruz. Google'da {{isletme}} sayfanıza denk geldim ve bir web sitenizin olmadığını gördüm.",
  "Müşterilerin çoğu bir yere gitmeden önce internetten bakıyor. Adresinizi, çalışma saatlerinizi, fotoğraflarınızı ve iletişim bilgilerinizi tek bir sayfada bulabilmeleri epey fark yaratıyor. Size uygun olabilecek birkaç örnek göndermemi ister misiniz?",
  "İlgilenmiyorsanız bu e-postaya kısaca yanıt vermeniz yeterli, bir daha rahatsız etmeyeceğim.",
  "İyi çalışmalar,\nPiton Studios",
].join("\n\n");

// Sitesi yerine yalnız sosyal medya / platform profili olan işletmeler için ({{platform}} → "Instagram";
// panel markayı bilmiyorsa "sosyal medya").
const WHATSAPP_SOCIAL_BODY = [
  "Merhaba, kolay gelsin.",
  "Ben Piton Studios'tan yazıyorum, {{sehir}} bölgesindeki işletmelere web sitesi yapıyoruz. Google'da {{isletme}} diye aratınca {{platform}} hesabınız çıkıyor ama kendi web siteniz yok.",
  "{{platform}} hesabınız kalsın, yanına sade bir web sitesi çok iyi gider: Google'da daha kolay bulunursunuz, müşteri de adres, saat ve iletişim bilgilerini tek yerde görür. Birkaç örnek göstermemi ister misiniz?",
  "İlgilenmiyorsanız yazmanız yeterli, bir daha rahatsız etmeyeceğim.",
].join("\n\n");

async function main(): Promise<void> {
  // Setting: mevcut değeri EZME — sadece yoksa oluştur (kullanıcı ayarlardan değiştirmiş olabilir)
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.cities },
    update: {},
    create: { key: SETTING_KEYS.cities, value: JSON.stringify(DEFAULT_CITIES) },
  });

  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.bonusCategories },
    update: {},
    create: {
      key: SETTING_KEYS.bonusCategories,
      value: JSON.stringify(DEFAULT_BONUS_CATEGORIES),
    },
  });

  await prisma.messageTemplate.upsert({
    where: { id: WHATSAPP_TEMPLATE_ID },
    update: {}, // kullanıcı Ayarlar'dan düzenlemiş olabilir — ezme
    create: {
      id: WHATSAPP_TEMPLATE_ID,
      name: "İlk temas — WhatsApp",
      channel: "WHATSAPP",
      body: WHATSAPP_BODY,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { id: EMAIL_TEMPLATE_ID },
    update: {}, // kullanıcı Ayarlar'dan düzenlemiş olabilir — ezme
    create: {
      id: EMAIL_TEMPLATE_ID,
      name: "İlk temas — E-posta",
      channel: "EMAIL",
      body: EMAIL_BODY,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { id: WHATSAPP_SOCIAL_TEMPLATE_ID },
    update: {}, // kullanıcı Ayarlar'dan düzenlemiş olabilir — ezme
    create: {
      id: WHATSAPP_SOCIAL_TEMPLATE_ID,
      name: "İlk temas — Sosyal medyası olan (WhatsApp)",
      channel: "WHATSAPP",
      body: WHATSAPP_SOCIAL_BODY,
    },
  });

  // TASK-105: PLACES_MOCK=1 → mock fixture'daki 17 işletme (OPERATIONAL + kendi sitesi yok; 2'si yalnız
  // sosyal medya / platform linkli) upsert edilir.
  // placeId ile upsert → idempotent; kullanıcının durum/e-posta/notları korunur.
  if (process.env.PLACES_MOCK === "1") {
    const { getMockSavedFixtures } = await import("../lib/places.mock");
    const { upsertBusiness } = await import("../lib/ingest");
    const { db } = await import("../lib/db");
    try {
      const fixtures = getMockSavedFixtures();
      for (const { city, details } of fixtures) {
        await upsertBusiness(details, city, null);
      }
      console.log(`Mock işletmeler yazıldı: ${fixtures.length}`);
    } finally {
      await db.$disconnect();
    }
  }

  const [settingCount, templateCount, businessCount] = await Promise.all([
    prisma.setting.count(),
    prisma.messageTemplate.count(),
    prisma.business.count(),
  ]);

  console.log(
    `Seed tamamlandı — Setting: ${settingCount}, MessageTemplate: ${templateCount}, Business: ${businessCount}`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
