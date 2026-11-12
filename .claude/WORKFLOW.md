# Claude LAB — local và ngữ cảnh gọn

## Môi trường

Desktop: Code → Local → C:/Projects/lab-resource-manager,
nhánh hiện tại phải kiểm tra bằng Git (16/10: main). Không chọn worktree cũ/Cloud
và bỏ sót thay đổi chưa commit.
CLI: mở terminal tại checkout trên rồi chạy claude. Launcher:
.claude/Open-LAB-Claude.cmd. Giữ provider/model/quyền công cụ hiện có.

Kiểm tra Git/runtime; /lab-preflight hoặc node .claude/scripts/preflight.mjs.
UI dùng localhost:5173, API chung localhost:8000, readiness /health/ready.
Tái dùng server đang chạy. UI tắt: frontend/npm run dev. API tắt: đọc README
và kiểm tra Docker trước; startup backend có migration/demo seed, không chạy
như bước QA. Không reset/down -v/seed/rebuild theo phản xạ.
Browser/MCP phải truy cập được localhost; dùng context độc lập, không profile
cá nhân. Không bật bypass/always-allow hoặc lách approval.

## Redesign tự chủ — 10/10/2026

Kế hoạch và controller trước đây đã hủy; không còn vòng lặp hoặc queue.
Người dùng giao task trực tiếp. Claude tự chọn design và cách triển khai,
có thể dùng /design, impeccable, ui-ux-pro-max, design-taste-frontend và
frontend-design khi thích hợp. Chỉ đọc skill/reference thực sự cần;
không gọi cả bộ chỉ để chứng minh đã dùng. Skill là trợ giúp, không khóa thẩm mỹ.
Không cần giữ palette, template, sidebar, trình tự rollout hay file ownership cũ.
Các chức năng, hợp đồng nghiệp vụ, RBAC và dữ liệu vẫn theo AGENTS/SRS.
Không tự bắt đầu redesign khi người dùng mới yêu cầu chuẩn bị prompt.

## Token và tiếp tục

Tìm đúng file bằng rg, đọc phạm vi liên quan, theo callers/imports khi cần.
Tái dùng tài liệu chưa đổi; không dump repo/catalog/log hay các checkpoint cũ.
Dùng công cụ xác định thay cho nhiều lượt suy đoán. Chỉ chụp màn hình cần để
ra quyết định hoặc chứng minh kiểm thử. Output tạm lưu ngoài Git.
Checkpoint ngắn ở CURRENT_STATE; /lab-handoff trước /compact khi cần.
Giữ yêu cầu, quyết định, file/symbol, test thật, giới hạn và bước tiếp theo.
Không thay model/provider hoặc tắt suy luận cần thiết để đạt quota hình thức.

## Kiểm chứng

Đọc tác động của test trước khi chạy; một số suite seed/tạo booking.
Không ghi dữ liệu nghiệp vụ hợp lệ vào DB demo trong QA. Chạy gate phù hợp
trong package.json, giữ exit code/failures. Xem UI thật; build không chứng minh UX.
Tái kiểm tra khi có thay đổi/lỗi mới. Báo ngắn kết quả, coverage và giới hạn.
Laptop 1366x768/1440x900, VI/EN và ba role ADMIN/LAB_STAFF/CUSTOMER là ưu tiên;
bảo toàn responsive, matrix mobile deferred, không ghi PASS chưa kiểm.

## Skill

Project giữ lab-task, lab-handoff và lab-preflight. Trong phiên mới kiểm tra
danh sách skill thực sự sẵn có, chỉ đọc skill phù hợp task; số lượng file đã
cài từ một lần audit cũ không chứng minh phiên hiện tại đã nạp chúng.
