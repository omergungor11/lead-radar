// Tüm arayüz metinleri. Sadece Türkçe, i18n altyapısı yok (PROMPT "Kapsam dışı").
// Paylaşılan dosya: frontend ve backend anahtar ekler → Read → Edit, çakışmada yeniden oku (max 3).
// Her task kendi bölümünü ekler; mevcut anahtarları yeniden adlandırma.

export const tr = {
  app: {
    name: "Lead Radar",
    tagline: "Web sitesi olmayan işletmeleri bulun",
  },
  nav: {
    dashboard: "Dashboard",
    businesses: "İşletmeler",
    searches: "Aramalar",
    settings: "Ayarlar",
    logout: "Çıkış",
  },
  common: {
    save: "Kaydet",
    cancel: "Vazgeç",
    delete: "Sil",
    loading: "Yükleniyor…",
    error: "Bir hata oluştu",
  },
  errors: {
    unauthorized: "Oturum gerekli",
    validation: "Geçersiz istek",
    notFound: "Kayıt bulunamadı",
    internal: "Sunucu hatası",
    invalidPassword: "Şifre hatalı",
    missingEnv: "Zorunlu ortam değişkeni eksik veya geçersiz",
  },
  auth: {
    subtitle: "Devam etmek için şifreyi girin",
    passwordLabel: "Şifre",
    passwordPlaceholder: "Şifrenizi girin",
    submit: "Giriş yap",
    submitting: "Giriş yapılıyor…",
    genericError: "Giriş yapılamadı, tekrar deneyin",
  },
} as const;
