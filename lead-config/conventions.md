# Code Conventions

> CUSTOMIZE: Asagidaki bolumleri projenin gercek convention'lariyla degistir.

## TypeScript
- Strict mode her zaman acik
- `any` yasak (`unknown` + type guard kullan)
- Object shape'ler icin interface, union/intersection icin type
- Export edilen fonksiyonlarda explicit return type

## File Naming
- Tum dosyalar `kebab-case`
- Backend: `.service.ts`, `.controller.ts`, `.module.ts`, `.dto.ts`
- Test: `.spec.ts` (source ile ayni dizinde)

## API Design
- RESTful: `/api/{resource}`
- Pagination: `?page=1&limit=20`
- Response: `{ data, meta? }` — Error: `{ error: { statusCode, code, message } }`
- Status kodlari: 200, 201, 400, 401, 403, 404, 409, 500

## Frontend
- Server Components varsayilan; client sadece gerekince
- Server state icin data-fetching kutuphanesi, UI state icin hafif store

## Database
- PascalCase model, camelCase field
- Uygun yerlerde soft delete

## Testing
- Happy path + error case minimum
- Harici servisler mock'lanir
