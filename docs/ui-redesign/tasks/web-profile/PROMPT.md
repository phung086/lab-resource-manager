Bạn là ChatGPT web 3, thực hiện DUY NHẤT task `web-profile` của cuộc redesign LRM năm 2026-10-06. Bắt đầu triển khai, không chỉ đề xuất.

Repo: https://github.com/phung086/lab-resource-manager. Tạo branch được chỉ định từ main mới nhất chứa docs/ui-redesign; ghi BASE_SHA trước sửa. Đừng dùng revision cũ a5472d4/43b1832 hoặc cuộc chat Cowork làm baseline. Các skills cá nhân trên Windows không tồn tại trong môi trường web: đọc portable project skill và contract trong Git, áp dụng nguyên tắc tương đương. Nếu có tool frontend/browser hữu dụng thì dùng; connector GitHub đọc-only không tự trở thành môi trường code.

Mục tiêu: Thiết kế lại bố cục ProfilePage: định danh và thông tin liên hệ dễ thấy; nhóm thiết lập và form có hierarchy rõ; tiết lộ thông tin phụ có chủ đích và thao tác mobile thuận tiện. Giữ toàn bộ trường, section, API/validation, đổi mật khẩu, dữ liệu tài khoản và callbacks. Không biến profile thành trang pricing/upsell; không che capability bắt buộc. Form draft, lỗi và feedback thành công phải giữ đúng hành vi thật.

Branch: `codex/lrm-ui-web-profile`. Scope class: `lrm-profile-redesign`.
CHỈ được sửa các file sau:
- `frontend/src/pages/ProfilePage.tsx`
- `frontend/src/styles/redesign/profile.css`
- `docs/ui-redesign/tasks/web-profile/REPORT.md`

Hướng chung: modern academic LAB, light neutral + navy, IBM Plex, hierarchy Swiss và bố cục có cá tính; landing editorial, nghiệp vụ gọn và đọc được. Tránh mẫu AI với dãy card đồng dạng, gradient/glow trang trí, bo tròn quá mức và số liệu giả. Dùng đúng token --lab-* hiện có và UI_CONTRACT; không tự tạo theme riêng.

Trước sửa: xác nhận repo/HEAD/branch và trạng thái Git. Đọc AGENTS.md cùng tài liệu bắt buộc theo thứ tự; sau đó đọc TEAM_PLAN.md, UI_CONTRACT.md, REDESIGN_SPEC.md, PROGRESS.md, assignments.json và BRIEF.md của task tại docs/ui-redesign/. Đọc .agents/skills/lrm-team-design/SKILL.md. Checkpoint giúp tránh audit lặp lại, không thay việc đọc bắt buộc của phiên mới. Sau đó chỉ đọc source/caller/tests cần cho task, không quét lại toàn dự án hoặc mọi báo cáo cũ.

Giữ React/Vite, API/RBAC, dữ liệu và nghiệp vụ; exports/props, callbacks, refs/test hooks, timezone, VI/EN, loading/empty/error, keyboard/focus và bản nháp form. Không chỉnh backend, schema, migration, dependencies, global CSS, main.jsx/App.jsx, shared shell/brand, locale/manifest hoặc tài liệu chung. Label mới cần gửi đề xuất VI/EN trong REPORT, không dùng key chưa có. Chỉ chỉnh đúng allowlist; thay đổi dùng chung gửi yêu cầu trong REPORT.

Import một stylesheet task từ component được phép; mọi selector thường phải nằm dưới scope class task. Giữ class/hook cũ cần thiết. Không body/html/:root/global selector, !important hoặc định nghĩa lại --lab-*. Chỉnh bố cục/JSX trong phạm vi để redesign có tác dụng thực tế, không chồng override vô hạn.

Kiểm tra diff và chạy scope gate từ root với base là commit main đã bắt đầu task; ghi lại BASE_SHA. Khi có npm môi trường, chạy npm ci tại frontend nếu cần rồi npm run test:required. Nếu có browser/runtime thật, kiểm tra 1440/1280/768/390/375, VI/EN, focus và tương tác/trạng thái liên quan. Không truy cập được localhost Windows từ web thì ghi rõ; build không phải bằng chứng visual. Không reset DB, seed lại, reset/clean/stash, nới RBAC, fake success hay tự sửa ngoài scope cho test xanh.

Viết riêng docs/ui-redesign/tasks/web-profile/REPORT.md: baseline SHA, files, thay đổi, kiểm tra thật, giới hạn visual/runtime, shared requests và rủi ro. Hoàn thành phần được giao, tạo commit/PR vào main nếu có môi trường Git ghi được; không merge/push trực tiếp main, không force push hoặc bắt đầu task khác. Nếu chỉ có connector đọc GitHub, trả patch đầy đủ kèm report và nói rõ chưa tạo PR. Không tuyên bố skill/tool/test đã chạy khi không có bằng chứng.

Scope gate: `node scripts/check-redesign-scope.mjs --task web-profile --base BASE_SHA` (thay BASE_SHA bằng commit đã xác minh, không phải literal).
