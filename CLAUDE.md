@AGENTS.md

# Claude — LAB Resource Manager

Giao tiếp bằng tiếng Việt. Đây là đồ án đang phát triển; giữ code chưa commit.
Làm việc tại C:/Projects/lab-resource-manager, claude/lrm-redesign-v2; không sửa
worktree 497f. Kiểm tra Git và runtime thực trước khi làm.

## Yêu cầu hiện hành — 10/10/2026

Người dùng dừng Codex refactor UI và sẽ giao redesign cho Claude khi hồi limit.
Toàn bộ kế hoạch, hàng đợi, brief, allowlist và hướng mỹ thuật cũ đã hủy.
Không tiếp tục R1/R3/R4 hoặc coi checkpoint lịch sử là lệnh triển khai.
Vòng lặp điều phối đã xóa; không tạo lại và không tự khởi động redesign.

Khi người dùng giao redesign, Claude tự quyết hướng thiết kế, kế hoạch, thứ tự
và cách code. Có thể thay đổi bố cục, navigation, component, màu, chữ và motion.
Không có palette/style/rollout cũ bắt buộc hoặc skill LAB thiết kế tự viết.
Giữ khả năng nghiệp vụ, RBAC, dữ liệu thật, kiến trúc và an toàn trong AGENTS/SRS.

## Tiết kiệm token

Theo thứ tự đọc theo phạm vi của AGENTS và .agent/CONTEXT_MAP.md. Tìm bằng rg
trước, đọc đoạn/function/hợp đồng đầy đủ liên quan; tái dùng phần chưa đổi.
Dùng tim-dung-file. Chỉ nạp skill/reference cần cho quyết định hiện tại;
không đọc mọi skill, catalog, source, screenshot hoặc lịch sử chat một lượt.
Giữ output ngắn, lỗi và exit code thật; mở thêm khi cần. Không chạy lại gate
đã pass khi source/điều kiện không đổi. Không tiết kiệm bằng cách bỏ kiểm chứng.
Checkpoint ngắn trong CURRENT_STATE: scope, file/symbol, quyết định, test/limits,
blocker và bước tiếp theo. Lưu checkpoint trước compact; không chép log/source.

Runtime, lệnh và hạn chế: .claude/WORKFLOW.md. Không đổi model/provider/quyền
hoặc in secrets để tối ưu. Không commit/push/merge/deploy nếu chưa được yêu cầu.
