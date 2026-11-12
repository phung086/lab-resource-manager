# Kế hoạch commit — review diff 27/10/2026

Trạng thái review: nhánh `codex/claude-qa-20261021`, base commit `c41b892`.
69 file tracked (+1.701/−12.113) và 33 đường dẫn untracked. **Gates chứng nhận
trên đúng cây này 27/10/2026**: `test:required` PASS (91 tests, i18n 3992 keys
parity VI/EN, lint 2 warning cũ có trước, typecheck, build production),
`test:ui:contrast` 22/22 · 0 finding, `test:ui:a11y` PASS 21 lượt (gate mới),
`test:media` 4/4. Không commit gì cho tới khi người dùng duyệt kế hoạch này.

## Đề xuất chia 7 lô commit (theo thứ tự áp dụng)

| Lô | Nội dung | File chính |
|---|---|---|
| 1 | `refactor(ui): gộp CSS global, xoá theme retired` | Xoá 11 CSS cũ (styles.css, lab-*.css, light-redesign, final-workspace, staff-workspace, workspace-shell, project-shell, catalog-profile) + global.css mới + package.json/lock (gỡ @fontsource) |
| 2 | `feat(ui): spectrum design system + shell/home theo vai trò` | spectrum.css, AppLayout/PublicShell/Sidebar/main.jsx, 3 role home + WorkspaceHome (import tĩnh, Tren dsSkeleton), discovery-home.css, home-structure/overview-workflow/workspace-home/customer-journey/staff-journey css, PublicLanding, index.html title |
| 3 | `feat(catalogue): bộ sưu tập + gallery + category art` | ResourceManagementView, ResourceDetailPage, ResourceGallery, ResourceCategoryArt + css, PublicResourceCatalog (heading fixes), resource-catalogue/media/discovery… css |
| 4 | `feat(bookings): Lịch đặt của tôi + chọn giờ 2 bước + access states` | SmartCalendarView, BookingSlotPicker, CustomerBookingCard, BookingOperationsView, BookingAccessPanel, QuickBookingModal, booking-studio.css, my-schedule.css, calendar css, QueuePagination (ẩn total=0), IncidentManagementView (empty copy) |
| 5 | `feat(payments+support): chuẩn vé + trạng thái cửa sổ nhận` | payments.css, support.css, monitoring-workspace.css + MonitoringDashboardPage (utilization), WorkspaceTrends |
| 6 | `feat(audit): nhật ký hệ thống` | features/audit/, AuditLogsPage, auditEvents, types/audit, audit-workspace.css, test_audit_ui.mjs |
| 7 | `test+docs: gates mới, i18n, kế hoạch này` | locales vi/en/manifest, test updates (batch4, product_experience, contrast, calendar_planner, catalogue, login), test_a11y_icon_names.mjs + package.json script, DESIGN.md, docs/CURRENT_STATE.md, docs/COMMIT_PLAN_20261027.md, benefits-poster-original.jpg(+.json) & xoá public/media/poster.jpg |

Lưu ý: locales (vi/en) chứa key của nhiều lô — đặt ở lô 7 để commit cuối đạt
full gates; các commit trước có thể chưa pass `test:i18n` riêng lẻ (bình thường
với cách chia này). Nếu muốn từng commit đều green, dùng `git add -p` tách
chi tiết key theo lô — tốn công hơn, kết quả như nhau.

## KHÔNG commit (artifact làm việc)

- `frontend/probe_manifest_tmp.mjs`, `probe_nav_tmp.mjs`, `src/.ui_b5_tmp.mjs`, `src/.ui_b6_tmp.mjs` — probe tạm, đề nghị xoá.
- `.codex/`, `.impeccable/`, `frontend/.impeccable/`, `.qa/` — cấu hình/evidence công cụ AI; đề nghị thêm vào `.gitignore` (trừ khi người dùng muốn giữ evidence `.qa/`).
- `frontend/playwright.config.ts`, `frontend/qa_ui_matrix.mjs`, `docs/QA_*_2026102*.md` — harness QA 22–23/10; quyết định người dùng: commit vào tests/ hoặc giữ ngoài.
- `docker-compose.local.yml` (RATE_LIMIT_MAX=1000 cho review local) — commit riêng `chore(local)` hoặc bỏ.

## Rủi ro khi commit

- Mỗi lô có thể chưa pass toàn bộ gates riêng lẻ (xem lưu ý locales ở trên).
- `frontend/package.json` nằm lô 1 nhưng script `test:ui:a11y` cần
  `test_a11y_icon_names.mjs` ở lô 7 — chấp nhận hoặc chuyển package.json sang lô 7.
- poster.jpg xoá khỏi public/ chỉ an toàn vì 0 tham chiếu — đã quét toàn repo.

## Đề xuất

Duyệt kế hoạch → tôi thực hiện 7 lô commit theo bảng (không push) → người
dùng review `git log --oneline` + chạy lại gates trên mỗi lô nếu muốn. Có thể
yêu cầu gộp thành ít lô hơn hoặc tách chi tiết hơn.
