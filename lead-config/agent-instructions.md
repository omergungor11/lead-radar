# Agent Orchestration Rules

> Agent tanımlarının kendisi `.claude/agents/` altında (backend, frontend, database, devops, docs).
> Bu dosya ORKESTRASYON ve MODEL DAĞILIMI kurallarını tutar.

## 0. Model Dağılımı

Ana oturum (orchestrator) **Fable**'da çalışır — kullanıcı `/model` ile seçer, agent'lar değiştiremez.
Alt işler maliyete göre devredilir; model `.claude/agents/*.md` frontmatter'ında sabittir.

| Rol | Model | Neden |
|---|---|---|
| Orchestrator (ana oturum) | Fable | Mimari karar, task sıralama, paket kurulumu, çakışma çözümü, son review |
| `backend` | opus | En çok mantık ve hata riski burada (Places entegrasyonu, SSE, skorlama) |
| `frontend` | sonnet | Spesifikasyon net, iş büyük ama mekanik |
| `database` | sonnet | Şema PROMPT.md'de hazır; migration/seed disiplin ister |
| `devops` | haiku | Config dosyaları, tekrarlayan iş |
| `docs` | haiku | Markdown güncellemeleri, tablo sayıları |

Ek kurallar:
- Tek dosyalık ufak iş → devretme, orchestrator direkt yapar (subagent context maliyeti daha yüksek).
- Toplu/tekrarlayan iş (çok dosyada arama, formatlama, log ayıklama) → `haiku`.
- Bir agent kendi modelinin altında kaldığını düşünüyorsa (örn. sonnet frontend'de karmaşık state
  sorunu) durur ve orchestrator'a raporlar; orchestrator ya kendisi çözer ya opus'a devreder.
- Orchestrator devrettiğinde hangi agent'a ve modele verdiğini kullanıcıya söyler.

## 1. Scope Tablosu (Dizin İzolasyonu)

Her agent yalnızca kendi dizininde dosya oluşturur/düzenler:

| Agent | İzinli Dizin | Yasak |
|-------|--------------|-------|
| backend | `app/api/**`, `lib/**`, `middleware.ts`, `tests/*.test.ts` | `app/(panel)`, `components/`, `prisma/` |
| frontend | `app/(panel)/**`, `app/(auth)/**`, `app/layout.tsx`, `app/globals.css`, `components/**`, `tests/e2e/**` | `app/api/`, `lib/` (import serbest, düzenleme yasak) |
| database | `prisma/**`, `lib/db.ts` | Diğer tüm dizinler |
| devops | `*.config.*`, `tsconfig*.json`, lint/format config, `.env.example`, `.github/**`, `package.json` script'leri | Uygulama kodu, dependency ekleme |
| docs | `*.md` | Kod dosyaları |

### Süreç / port kuralları (2026-09-22 olayı sonrası)
- Bu makinede BAŞKA projelerin dev server'ları çalışır (örn. `re-state-start` :3000). **`pkill`, `killall`, desenli `kill` YASAK.**
- Kendi başlattığın süreci yalnızca PID ile kapat: `lsof -ti:<kendi portun>` → o PID'in cwd'si bu repo mu kontrol et → `kill <pid>`.
- Her agent'a ayrı port verilir (3200+); 3000'e dokunulmaz.
- `pnpm build` `.next`'i ezer — başka bir agent dev server çalıştırıyorsa build'i orchestrator'a bırak.

## 2. Paylaşılan Dosyalar

| Dosya | Strateji |
|-------|----------|
| `lib/tr.ts` (arayüz metinleri) | frontend ve backend ikisi de anahtar ekler → Read → Edit; "modified since read" → yeniden oku, tekrar dene (max 3), sonra dur ve raporla |
| `lib/config.ts` (şehirler, bonus kategoriler, maliyet sabitleri) | Sadece backend düzenler; frontend import eder |
| `package.json` dependencies / `pnpm-lock.yaml` | Sadece orchestrator paket kurar |
| `components/ui/*` (shadcn) | Sadece orchestrator `npx shadcn add` çalıştırır |

## 3. Sıralama

```
Bağımsız task'lar → paralel (farklı dizinler)
Bağımlı task'lar  → sıralı (blocker bitince)
Paket kurulumu    → sadece orchestrator
```

Phase 1 için önerilen paralel gruplar (`lead-tasks/phases/phase-1.md`):

```
Grup A (sıralı, temel):    TASK-101 → TASK-102 → TASK-103
Grup B (paralel, A sonra): TASK-104 [backend] ‖ TASK-110 ayarlar UI iskeleti [frontend]
Grup C (paralel, B sonra): TASK-105 [backend] ‖ TASK-106 tablo UI (mock veriyle) [frontend]
Grup D (sıralı):           TASK-107 → TASK-108 → TASK-109 → TASK-111
```

## 4. Orchestrator Sorumlulukları

**Agent'ları başlatmadan önce:**
1. Paket kurulumlarını yap (`pnpm add …`, `npx shadcn add …`)
2. Gerekli dizinleri oluştur
3. Task dependency'lerini kontrol et — blocked task başlatma
4. Her agent'a scope dizinini ve `lead-plans/PROMPT.md`'deki ilgili bölüm numarasını prompt'ta açıkça belirt

**Agent'lar bitince:**
1. Paylaşılan dosyaları doğrula (`lib/tr.ts` çift anahtar var mı)
2. Repo genelinde `pnpm typecheck && pnpm lint && pnpm test`
3. Task tracking güncelle (docs agent'a haiku ile devret veya kendin yap)
4. Çakışma raporu ver (kaç tane, nasıl çözüldü)
5. `grep -r "AIza" .next/static` → boş olmalı (anahtar sızıntısı kontrolü)
