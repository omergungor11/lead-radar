# Phase 0: Project Setup

## TASK-001: Repo + Tooling Init
**Agent**: devops | **Complexity**: S | **Status**: PENDING | **Dependencies**: -

### Acceptance Criteria
- [ ] Package manager initialized
- [ ] Workspace/monorepo config (gerekiyorsa)
- [ ] Root package.json with scripts

---

## TASK-002: Meta Directories Dolduruldu
**Agent**: docs | **Complexity**: S | **Status**: PENDING | **Dependencies**: -

### Acceptance Criteria
- [ ] `lead-config/tech-stack.md` proje ozelinde dolduruldu
- [ ] `lead-config/conventions.md` proje ozelinde gozden gecirildi
- [ ] `lead-docs/MEMORY.md` proje bilgisiyle baslatildi

---

## TASK-003: Claude Code Setup
**Agent**: devops | **Complexity**: M | **Status**: PENDING | **Dependencies**: TASK-001

### Acceptance Criteria
- [ ] Hook'lar executable (`chmod +x .claude/hooks/*.sh`)
- [ ] settings.local.json'a projeye ozel izinler eklendi
- [ ] `.claude/agents/` scope dizinleri (CUSTOMIZE satirlari) projeye gore guncellendi

---

## TASK-004: CLAUDE.md Konfigurasyonu
**Agent**: docs | **Complexity**: M | **Status**: PENDING | **Dependencies**: TASK-002

### Acceptance Criteria
- [ ] Placeholder kalmadi (proje adi, aciklama, workspace, komutlar)
- [ ] Referans tablolari dogru prefix'i gosteriyor

---

## TASK-005: Docker Dev Environment — İPTAL (D-003: SQLite, Docker gerekmez)
**Agent**: devops | **Complexity**: M | **Status**: PENDING | **Dependencies**: TASK-001

### Acceptance Criteria
- [ ] docker-compose.yml (DB, cache vb.)
- [ ] Health check + port dokumantasyonu
- [ ] Volume mount'lar

---

## TASK-006: Lint, Format, TypeScript Config
**Agent**: devops | **Complexity**: S | **Status**: PENDING | **Dependencies**: TASK-001

### Acceptance Criteria
- [ ] Linter + formatter konfigure
- [ ] TypeScript strict mode
- [ ] Paylasilan tsconfig base (monorepo ise)

---

## TASK-007: Git Repo Init + First Commit
**Agent**: devops | **Complexity**: S | **Status**: PENDING | **Dependencies**: TASK-001..006

### Acceptance Criteria
- [ ] .gitignore (node_modules, .env, dist, .next, .turbo, coverage, .DS_Store)
- [ ] Ilk commit: `chore: project scaffold with Claude Code workflow`
- [ ] Remote bagli + push (varsa)
