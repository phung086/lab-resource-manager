Bạn là Antigravity, thực hiện DUY NHẤT task `ag-landing` của cuộc redesign LRM năm 2026-10-06. Bắt đầu triển khai, không chỉ đề xuất.

Làm tại C:/Projects/lrm-redesign-antigravity trên branch đã chuẩn bị; không mở primary checkout để sửa. Khởi tạo phiên mới trong IDE để skills được discovery. Dùng lab-preflight/lab-product-redesign cùng impeccable, design-system và ui-ux-pro-max đúng phần cần; design-taste-frontend chỉ hỗ trợ landing. Nếu IDE không thấy skill, kiểm tra Customizations và file SKILL.md; không nói đã gọi thành công. Skills nằm ở C:/Users/Admin/.gemini/config/skills/, portable project skill nằm ở .agents/skills/.

UI primary5173 và API8000 đang có thể chạy nhưng xác minh lại. Để xem source của worktree này, frontend npm ci nếu chưa có node_modules, đặt VITE_API_BASE_URL=http://localhost:8000, chạy npx vite --host 127.0.0.1 --port 5180 --strictPort nếu cổng trống. Nếu cổng bị chiếm, báo coordinator để phân cổng và kiểm tra CORS; không tự dừng process hoặc coi mọi cổng khác đều được API cho phép. Xem .env.example ở root và frontend/src/api.js để xác minh biến cấu hình trước chạy. Không tự dựng/reset Docker. Browser phải thực sự trỏ preview worktree này.

Mục tiêu: Thiết kế lại bố cục landing công khai: hero có bản sắc LAB và điểm nhấn editorial; tài nguyên, quy trình và lời mời khám phá rõ thứ tự. Thay đổi JSX/hierarchy có chủ đích, không chỉ thêm màu. Giữ CTA, điều hướng, filter/resource callbacks, nội dung thật và mọi luồng hiện có; không thêm navbar riêng hoặc KPI/testimonial giả.

Branch: `codex/lrm-ui-ag-landing`. Scope class: `lrm-public-redesign`.
CHỈ được sửa các file sau:
- `frontend/src/components/PublicLanding.tsx`
- `frontend/src/styles/redesign/public-landing.css`
- `docs/ui-redesign/tasks/ag-landing/REPORT.md`

Hướng chung: modern academic LAB, light neutral + navy, IBM Plex, hierarchy Swiss và bố cục có cá tính; landing editorial, nghiệp vụ gọn và đọc được. Tránh mẫu AI với dãy card đồng dạng, gradient/glow trang trí, bo tròn quá mức và số liệu giả. Dùng đúng token --lab-* hiện có và UI_CONTRACT; không tự tạo theme riêng.

Trước sửa: xác nhận repo/HEAD/branch và trạng thái Git. Đọc AGENTS.md cùng tài liệu bắt buộc theo thứ tự; sau đó đọc TEAM_PLAN.md, UI_CONTRACT.md, REDESIGN_SPEC.md, PROGRESS.md, assignments.json và BRIEF.md của task tại docs/ui-redesign/. Đọc .agents/skills/lrm-team-design/SKILL.md. Checkpoint giúp tránh audit lặp lại, không thay việc đọc bắt buộc của phiên mới. Sau đó chỉ đọc source/caller/tests cần cho task, không quét lại toàn dự án hoặc mọi báo cáo cũ.

Giữ React/Vite, API/RBAC, dữ liệu và nghiệp vụ; exports/props, callbacks, refs/test hooks, timezone, VI/EN, loading/empty/error, keyboard/focus và bản nháp form. Không chỉnh backend, schema, migration, dependencies, global CSS, main.jsx/App.jsx, shared shell/brand, locale/manifest hoặc tài liệu chung. Label mới cần gửi đề xuất VI/EN trong REPORT, không dùng key chưa có. Chỉ chỉnh đúng allowlist; thay đổi dùng chung gửi yêu cầu trong REPORT.

Import một stylesheet task từ component được phép; mọi selector thường phải nằm dưới scope class task. Giữ class/hook cũ cần thiết. Không body/html/:root/global selector, !important hoặc định nghĩa lại --lab-*. Chỉnh bố cục/JSX trong phạm vi để redesign có tác dụng thực tế, không chồng override vô hạn.

Kiểm tra diff và chạy scope gate từ root với base là commit main đã bắt đầu task; ghi lại BASE_SHA. Khi có npm môi trường, chạy npm ci tại frontend nếu cần rồi npm run test:required. Nếu có browser/runtime thật, kiểm tra 1440/1280/768/390/375, VI/EN, focus và tương tác/trạng thái liên quan. Không truy cập được localhost Windows từ web thì ghi rõ; build không phải bằng chứng visual. Không reset DB, seed lại, reset/clean/stash, nới RBAC, fake success hay tự sửa ngoài scope cho test xanh.

Viết riêng docs/ui-redesign/tasks/ag-landing/REPORT.md: baseline SHA, files, thay đổi, kiểm tra thật, giới hạn visual/runtime, shared requests và rủi ro. Hoàn thành phần được giao, tạo commit/PR vào main nếu có môi trường Git ghi được; không merge/push trực tiếp main, không force push hoặc bắt đầu task khác. Nếu chỉ có connector đọc GitHub, trả patch đầy đủ kèm report và nói rõ chưa tạo PR. Không tuyên bố skill/tool/test đã chạy khi không có bằng chứng.

Scope gate: `node scripts/check-redesign-scope.mjs --task ag-landing --base BASE_SHA` (thay BASE_SHA bằng commit đã xác minh, không phải literal).
