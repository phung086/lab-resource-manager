# Frontend — LAB

Theo [root AGENTS](../AGENTS.md) và thứ tự đọc theo phạm vi. Giữ React/Vite.
Đọc các phần [frontend guideline](../docs/FRONTEND_GUIDELINE.md) liên quan;
UI giữ nghiệp vụ trong PRODUCT/SRS; người dùng đã hủy hướng/rollout cũ.
Claude tự quyết redesign, dùng skill GitHub cần thiết theo từng bước.

| Nhu cầu | Điểm vào trong frontend/ |
|---|---|
| Bootstrap, workspace, navigation | `src/main.jsx`, `src/App.jsx`, `src/workspaceRoutes.js` |
| Shell/public/role home | `src/components/AppLayout.tsx`, `src/components/PublicShell.tsx`, `src/pages/WorkspaceHome.tsx`, `src/components/features/workspace/` |
| Calendar/booking/operations | `src/components/SmartCalendarView.tsx`, `src/components/calendar/`, `src/pages/operations/` |
| Profile/maintenance/course/stock | `src/pages/ProfilePage.tsx`, `src/pages/MaintenancePage.tsx`, `src/pages/LabWorkspace.tsx` |
| API, queue | `src/api.js`, `src/services/`, `src/hooks/useQueuePage.ts` |
| Locale/shared UI/styles | `src/providers/LocaleProvider.tsx`, `src/locales/`, `src/components/base/`, CSS imports thật trong main/components |
| Checks/runtime | `package.json`, `scripts/`, `test_*.mjs`, `test-utils/` |

Theo imports của tính năng. Backend quyết định quyền và nghiệp vụ. Giữ VI/EN,
draft form, focus, cancellation/deadline, privacy, server totals và lỗi thật.
Đổi API cần đọc BE caller/route/service tương ứng. 
pm run i18n:sync` ghi cả
backend projection: xem diff liên vùng. Không tạo router/store/locale song song.

App changes: chạy gate phù hợp trong package.json; 
pm run test:required`
gồm locale/API tests, lint, typecheck/build. Đọc guard và tác động dữ liệu trước
test UI/DB. Build không chứng minh UX hoặc E2E; docs-only cần kiểm tra link/diff.
Tái dùng UI 5173, bản so sánh 5180 và API chung 8000 theo README; kiểm tra thực
tế trước khi báo readiness. Không khởi động stack mới theo worktree.
