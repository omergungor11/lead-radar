import { PrismaClient } from "@prisma/client";
import { DEFAULT_CITIES, DEFAULT_BONUS_CATEGORIES, SETTING_KEYS } from "../lib/config";

const prisma = new PrismaClient();

const WHATSAPP_TEMPLATE_ID = "tpl-whatsapp-ilk-temas";
const EMAIL_TEMPLATE_ID = "tpl-email-ilk-temas";
const WHATSAPP_SOCIAL_TEMPLATE_ID = "tpl-whatsapp-sosyal";

// Paragraf içinde satır kırma yok — WhatsApp metni olduğu gibi gösterir.
// Şehir eki kullanma ("{{sehir}}'de" → "Lefkoşa'de" ünlü uyumu bozulur); "bölgesinde" nötr.
const WHATSAPP_BODY = [
  "Merhaba, ben Piton Studios'tan yazıyorum.",
  "{{isletme}} işletmenizi Google Haritalar'da inceledim — {{sehir}} bölgesinde {{puan}} puan ve {{yorumSayisi}} yorumla gerçekten güçlü bir izleniminiz var. Ama bir web siteniz olmadığını fark ettim; yani bu puanı ve yorumları, sizi internette arayan müşterilere gösterecek bir vitrininiz yok.",
  "Size özel, mobil uyumlu ve hızlı bir web sitesi hazırlamak isteriz. Kısa bir görüşmeyle ihtiyacınızı konuşabilir miyiz?",
  "Bu tür mesajlar almak istemiyorsanız \"istemiyorum\" yazmanız yeterli, bir daha rahatsız etmeyeceğim.",
].join("\n\n");

const EMAIL_BODY = [
  "Konu: {{isletme}} için web sitesi teklifi",
  "Merhaba,",
  "Piton Studios'tan yazıyorum. {{isletme}} işletmenizi Google Haritalar üzerinde inceledim — {{sehir}} bölgesinde {{puan}} puan ve {{yorumSayisi}} yorumla dikkat çekici bir müşteri memnuniyetiniz var. Ancak bir web siteniz bulunmuyor; bu da potansiyel müşterilerin sizi internette bulmasını zorlaştırıyor.",
  "Size özel, mobil uyumlu ve hızlı yüklenen bir web sitesi hazırlayabiliriz. Uygun olduğunuzda kısa bir görüşme ayarlayabilir miyiz?",
  "Bu tür e-postalar almak istemiyorsanız bu mesaja \"istemiyorum\" yazarak yanıt vermeniz yeterli, bir daha rahatsız etmeyeceğim.",
].join("\n\n");

// Sitesi yerine yalnız sosyal medya / platform profili olan işletmeler için ({{platform}} → "Instagram";
// panel markayı bilmiyorsa "sosyal medya").
const WHATSAPP_SOCIAL_BODY = [
  "Merhaba, ben Piton Studios'tan yazıyorum.",
  "{{isletme}} işletmenizin {{platform}} hesabını gördüm — {{sehir}} bölgesinde {{puan}} puan ve {{yorumSayisi}} yorumla gerçekten güçlü bir izleniminiz var. Ama müşterileriniz sizi Google'da aradığında karşılarına çıkacak kendi web siteniz yok.",
  "Sosyal medyanızı bırakmanıza gerek yok; onu tamamlayan, hızlı ve mobil uyumlu bir web sitesi hazırlamak isteriz. Kısa bir görüşmeyle ihtiyacınızı konuşabilir miyiz?",
  "Bu tür mesajlar almak istemiyorsanız \"istemiyorum\" yazmanız yeterli, bir daha rahatsız etmeyeceğim.",
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
