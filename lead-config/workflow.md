# Workflow Rules

## Task Workflow

### Pre-Task
1. `task-index.md` oku — proje durumu
2. Phase dosyasindan task detayini oku
3. Tum dependency'ler COMPLETED mi kontrol et
4. Status → IN_PROGRESS yap

### During Task
- Acceptance criteria'ya sadik kal
- Her degisiklikten sonra typecheck + lint
- Task scope'unun disina cikma

### Post-Task
1. Tum acceptance criteria'yi dogrula
2. Validation komutlarini calistir
3. Status → REVIEW (dogrulama bekliyorsa) veya COMPLETED
4. `task-index.md` dashboard sayilarini guncelle
5. `lead-docs/CHANGELOG.md` guncelle
6. Commit: `feat(TASK-XXX): title`
7. BLOCKED task'lari kontrol et, acilanlari PENDING'e cevir

## Task Durumlari

```
PENDING → IN_PROGRESS → REVIEW → COMPLETED
                      → BLOCKED
```

REVIEW opsiyonel — solo hizli iste atlanabilir.

## Commit Conventions

```
feat(TASK-XXX): description     # Yeni ozellik
fix(TASK-XXX): description      # Bug fix
refactor(TASK-XXX): description # Refactoring
docs(TASK-XXX): description     # Dokumantasyon
chore(TASK-XXX): description    # Tooling/config
test(TASK-XXX): description     # Test
```

Attribution satiri (Co-Authored-By vb.) EKLENMEZ.

## Branch Strategy

- `main` — production-ready
- `feat/TASK-XXX-description` — feature branch'leri
- `develop` — opsiyonel integration branch

## Validation Commands

```bash
# CUSTOMIZE: projenin komutlari
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
