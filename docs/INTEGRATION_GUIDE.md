# Tích hợp và kiểm tra LAB local

Hướng dẫn hiện hành, cập nhật16/10/2026. Các feature account/OTP/loyalty/bridge
đã nằm trong checkout chính; không cherry-pick lại snapshot hoặc dựng topology review cũ.
Trạng thái và giới hạn ở [CURRENT_STATE](CURRENT_STATE.md); hợp đồng ở SRS/DECISIONS.

## Môi trường dùng chung

C:/Projects/lab-resource-manager; kiểm tra branch/HEAD/status trước khi sửa.
React/Vite5173, Express8000, PostgreSQL16 trong Docker lrm-local-review.
DB lab_resources_local_demo và volume review-data là dữ liệu cần giữ.
Không chép .env/grants/tokens từ worktree khác hoặc tự seed khi restart.

Bật Docker Desktop. Từ frontend/:

```powershell
npm run dev:backend
npm run dev
```

`npm run dev:demo` chuẩn bị backend + frontend với cấu hình demo hiện hành.
Đọc dev-local.mjs và Compose trước đổi runtime; backend startup có migrate deploy
và generate, không phải phép kiểm thử không tác động. Tái dùng server đang chạy.
Không rebuild thường xuyên hoặc tạo stack theo từng worktree để so sánh UI.

## Tích hợp thay đổi mới

1. Đọc AGENTS và context map; xác định thay đổi local có trước.
2. Theo FE caller → API → auth/scope → service → Prisma → tests.
3. Giữ ADMIN/LAB_STAFF/CUSTOMER, booking/physical status và pricing snapshots.
   Paid hold15 phút, owner room access và return release theo ADR-037/038;
   staff account scope không cấp thêm quyền LAB; ChatGPT grant không nâng actor.
4. Schema thay bằng forward migration; giữ nguyên applied SQL/baseline/history.
   Kiểm tra dependency giữa migrations và generated client trước tích hợp.
5. Chạy required tests/lint, locale/typecheck/build và ERD phù hợp phạm vi.
   Migration/integration/UI mutations dùng DB test riêng với guard; không reset
   DB demo hoặc chạy prisma db push. Build không chứng minh UX/provider thật.
6. Kiểm tra diff và cập nhật ngắn CURRENT_STATE. Không tạo AI report/ảnh trong Git.
   Chỉ commit/push/deploy khi được yêu cầu.

## Kiểm tra tự động

```powershell
npm --prefix backend run test:required
npm --prefix backend run lint
npm --prefix backend run docs:erd:check
npm --prefix frontend run test:required
```

Integration account/loyalty/support/bridge/fulfillment/payment có DB/port guards
riêng trong test và scripts/prepare*.mjs. Đọc guard trước tạo database; các DB test
cũ có thể đã được dọn. Tạo lại fixture riêng thay vì dùng database nghiệp vụ.
Không ghi URL chứa password vào log/docs. Xem [SYSTEM_TEST_GUIDE](SYSTEM_TEST_GUIDE.md).

## Tích hợp bên ngoài

- VNPAY: cấu hình merchant/backend, callback chữ ký và thời hạn; browser return
  không settle. Một success NCB Sandbox cũ không chứng minh mọi phương thức/production.
- SMTP: cấu hình backend và kiểm transport/inbox riêng; không giả gửi OTP/email.
- ChatGPT: một origin HTTPS ổn định tới backend có OAuth/MCP/events; ADMIN cấp
  grant và đúng consumer đăng ký subscription. Đổi tài khoản cần quyền mới,
  không copy token/grant. Protocol fixture không là model thật. Không dùng
  gateway8003/API8001/8002/UI5174 của môi trường review cũ cho topology chính.
- Work có quota và độ trễ; source plugin mới không chứng minh cloud đã cập nhật.

Chi tiết ở [AI setup](AI_ASSISTANT_SETUP.md), [MCP contract](AI_ASSISTANT_MCP.md)
và [integration setup](INTEGRATION_SETUP_GUIDE_20261003.md). SMTP thật, phần cứng,
S3, GHN và toàn bộ production cần task/kiểm chứng riêng; không tự mở chúng.
