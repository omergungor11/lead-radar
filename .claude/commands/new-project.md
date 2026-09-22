Yeni proje kurulumu (interaktif). Bu template kopyalanmis durumda — dosyalar zaten burada.
Icerik SIFIRDAN uretilmez; mevcut sablon dosyalari ozellestirilir (tek kaynak ilkesi).

## Adim 1: Bilgi Topla (AskUserQuestion, TEK SEFERDE)

1. **Proje Adi** — "Projenin adi ne?" (Other serbest)
2. **Prefix** — "Meta dizin prefix'i? (ornek: myapp → myapp-tasks/)" — lowercase kebab-case
3. **Proje Boyutu** — "Kac phase planlansin?"
   - 3 phase: Setup + Core + Frontend (kucuk)
   - 5 phase: Setup + Core + Business + Frontend + Deploy (orta)
   - 8 phase: Setup + Core + Business + Advanced + Channels + Frontend + Test + Deploy (buyuk)

NOT: Tech stack SORULMAZ — `lead-config/tech-stack.md` proje ozelinde sonradan doldurulur.

## Adim 2: Rename + Placeholder Doldurma

1. `./setup.sh "<Proje Adi>" <prefix>` calistir (varsa).
   setup.sh silinmisse ayni islemi elle yap: `lead-tasks/ lead-docs/ lead-config/ lead-plans/` dizinlerini
   `<prefix>-*` olarak rename et, tum .md/.json dosyalarindaki `lead-tasks/` vb. referanslari ve
   `Lead Radar` placeholder'ini guncelle.
2. `CLAUDE.md`'de kalan placeholder'lari doldur (proje aciklamasi kullanicidan alinan bilgiyle).

## Adim 3: Phase Iskeleti

Secilen phase sayisina gore `<prefix>-tasks/task-index.md` dashboard tablosunu genislet
(Phase 0 zaten 7 task ile hazir; diger phase'ler bos satir olarak eklenir).
Phase detay dosyalari icin `<prefix>-tasks/templates/task-template.md` kullanilir.

## Adim 4: Izinler

Kullanicinin paket yoneticisine gore `.claude/settings.local.json` permissions'a ekle:
- pnpm: `"Bash(pnpm:*)"`, `"Bash(npx:*)"`
- npm: `"Bash(npm:*)"`, `"Bash(npx:*)"`
- bun: `"Bash(bun:*)"`, `"Bash(bunx:*)"`

## Adim 5: Temizlik + Dogrulama

1. `rm -f setup.sh README.md` (template yardimcilari)
2. Hook'lar executable mi: `chmod +x .claude/hooks/*.sh`
3. `find . -type f -not -path './.git/*' | sort` ile yapiyi goster
4. Kapanis mesaji:
   - "Proje yapisi hazir."
   - Siradaki: tech-stack.md + conventions.md doldur, git init + ilk commit, /cold-start

## Kurallar

- HICBIR placeholder kalmasin (Lead Radar vb.)
- Commit mesajlarina attribution satiri ekleme
- Hata olursa kullaniciya bildir ve dur
