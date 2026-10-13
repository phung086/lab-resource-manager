# Backend — LAB

Theo [root AGENTS](../AGENTS.md) và thứ tự đọc theo phạm vi. Giữ Express/Prisma/
PostgreSQL 16. Đọc [backend guideline](../docs/BACKEND_GUIDELINE.md) và SRS liên quan.

| Nhu cầu | Điểm vào trong backend/ |
|---|---|
| Wiring/runtime | `src/server.js`, `src/app.js`, `src/config.js`, `src/db.js` |
| HTTP | `src/routes/` |
| Active user/RBAC/lab scope/errors | `src/middleware/auth.js`, `src/middleware/labScope.js`, `src/middleware/errors.js` |
| Transactions/business | Service tương ứng trong `src/services/`; theo imports thật |
| Canonical codes | `src/constants/` |
| Trợ lý/MCP | `src/assistant/`, `src/routes/assistant.js`, AI_ASSISTANT_MCP/SETUP |
| Locale projection | `src/locales/`, sinh từ frontend sync, không import FE runtime |
| Persistence | `prisma/schema.prisma`, immutable `prisma/migrations/`, `prisma/baseline/` |
| Kiểm chứng | `package.json`, test liên quan trong `test/`, script/guard trong `scripts/` |

Theo route → middleware → service → Prisma và tests của tính năng. Kiểm tra
active user, role, ownership, UserLabAssignment; staff chưa phân lab fail closed.
Giữ overlap lock, transaction/history, physical state và error/API contract.
Đổi response/field/status phải kiểm tra FE callers. DB task đọc schema, ADR-021
và guarded migration workflow; không db push/reset hoặc sửa migration đã áp dụng.
Thiếu provider/hardware/DB phải hiện thất bại hoặc unavailable, không fake success.

App changes: `npm run test:required`, `npm run lint`; thêm integration đúng scope
với DB test và guards đã đọc. Tách required core khỏi optional/legacy failures.
Docs-only cần link/diff checks. API 8000/DB dùng chung: kiểm tra môi trường, không
khởi động nodemon hay Docker stack thứ hai theo worktree. Runtime xem README.
