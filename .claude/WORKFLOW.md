# Claude LAB — cách dùng lâu dài

## Mở đúng môi trường
PowerShell: `cd C:\Projects\lab-resource-manager` rồi `claude`.
Desktop: tab Code, môi trường Local, folder trên; không chọn Cloud hoặc một worktree
khác nếu cần giữ UI chưa commit. Chat/Cowork không tương đương phiên Code local.
Không cần đổi nhà cung cấp để sửa file local. Giữ cấu hình gateway/model hiện có;
tên model do proxy đặt không chứng minh danh tính model thực.

## Kiểm tra trước khi làm
Gõ `/lab-preflight`. CLI độc lập: `node .claude/scripts/preflight.mjs`.
Trong Claude, `/mcp` phải thấy playwright. Skill chỉ xuất hiện sau khi mở phiên mới
nếu phiên cũ chưa nhận thư mục mới. Kiểm tra `/help` trước khi dùng lệnh bổ sung;
workflow không phụ thuộc /goal, /verify hoặc /doctor prompt-audit.

## Runtime
- UI: http://localhost:5173; API: http://localhost:8000/health/ready.
- Nếu UI đang hoạt động, mở trực tiếp bằng Browser/MCP; không launch server thứ hai.
- Nếu chỉ UI tắt: `cd frontend` rồi `npm run dev`.
- Desktop launch.json gọi đúng script frontend, giữ 5173 (CORS không tự đổi theo cổng).
- Nếu API tắt: xem Docker Desktop và README. Lệnh hiện có `npm run dev:backend`
  trong frontend khởi động nhóm lrm-local-review; startup container có migration và
  demo seed nên kiểm tra môi trường đích trước. Không reset, down -v hoặc rebuild
  theo phản xạ. Database và backend dùng chung với bản so sánh main 5180.

## Công cụ trình duyệt
Playwright MCP ghim 0.0.83, Chrome local, headless, isolated profile. Nó xem được
localhost và chụp ảnh mà không dùng profile Chrome cá nhân. Dùng Browser tích hợp
nếu Desktop hỗ trợ; đừng coi API/proxy key là đăng nhập Chrome extension.
Quyền MCP vẫn do Claude quản lý; không bật bypass hoặc tự cấp quyền mọi tool.
Ảnh mới lưu dưới logs/claude-browser, không đưa token/storage-state vào báo cáo.

## Redesign
1. `/lab-product-redesign audit`: khảo sát, hai hướng, chọn hướng, lập spec đề xuất;
   không sửa source ứng dụng. Có thể chọn Plan mode khi muốn chỉ đọc hoàn toàn.
2. Khi sẵn sàng: `/lab-product-redesign implement` và nêu rõ hướng/phạm vi đã duyệt.
3. Phiên sau: `/lab-product-redesign resume`.
4. Kết thúc: `/lab-product-redesign verify`.

Spec và progress do Claude tạo từ khảo sát thực, không được điền sẵn như đã phê duyệt.
Giữ task scope, canonical contracts và chức năng bắt buộc. TasteSkill chỉ bổ trợ
landing/visual quality; không ép landing patterns lên calendar/table/operations.
Settings mặc định acceptEdits; lệnh shell chưa cho phép vẫn có thể hỏi. Deny patterns
chỉ là rào chắn bổ sung, không chặn mọi biến thể shell/script; không lách chúng.

## Xác minh
Frontend: npm run lint, npm run typecheck, npm run test:i18n, npm run build.
Đọc test trước khi chạy: một số test UI tạo booking hoặc seed database.
Demo users và giới hạn nằm trong docs/LOCAL_DEMO_REVIEW_20260930.md.
Không gửi .env hoặc khoá nhà cung cấp vào chat/project instructions.

## Phạm vi setup
Đã thêm hướng dẫn/skills/rules/preview/preflight; không cài lại TasteSkill,
không đổi proxy/model, không sửa application source hoặc tự bắt đầu redesign.
Backup CLAUDE.md ban đầu và bảng hash trước setup nằm trong
C:/Users/Admin/.claude/backups/lab-setup-20261006-210644.

## Mở nhanh
Nhấp `.claude/Open-LAB-Claude.cmd` để mở Claude tại đúng repository, hoặc chạy
`.claude\Open-LAB-Claude.cmd` từ PowerShell. Script không gửi prompt và không tự
khởi động redesign. Frontend có thể chạy từ preview launcher hoặc npm run dev.
