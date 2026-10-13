---
name: lab-task
description: Bắt đầu hoặc tiếp tục một task LAB với ngữ cảnh đúng phạm vi.
argument-hint: "[FE|BE|DB|ops|docs] [mục tiêu hoặc checkpoint]"
disable-model-invocation: true
---

Thực hiện task người dùng đã yêu cầu: $ARGUMENTS

1. Xác định cwd, branch, HEAD và diff hiện có. Giữ công việc khác; checkpoint
   ở checkout khác là tham khảo, không phải trạng thái hiện tại.
2. Theo root AGENTS và .agent/CONTEXT_MAP.md. Đọc ba governance docs và các
   phần canonical/area guide/decisions/checkpoint liên quan; tái dùng phần chưa đổi.
3. Tìm bằng rg trong phạm vi rồi theo imports/callers và test thật. Đọc trọn
   hợp đồng/function cần sửa; mở rộng nếu có dependency liên vùng. Không dump repo.
4. Hoàn thành scope được giao, chạy kiểm tra phù hợp, xem diff. Giữ quyền công
   cụ hiện hành và shared runtime; không tự cài MCP, mở Batch hoặc push/merge.
5. Báo thay đổi, kiểm chứng và giới hạn ngắn. Nếu cần tiếp tục qua phiên mới,
   cập nhật checkpoint của task trong CURRENT_STATE: checkout/branch/SHA, scope,
   changed files, quyết định, test/limits, blocker, bước tiếp theo.

Với log/test lớn, giữ exit code thật; trả summary và phần lỗi liên quan, mở
thêm log khi cần. Không dùng pipeline làm mất exit code hay lọc mất failures.
Đường dẫn thường đủ để tìm file; @file sẽ đính kèm nội dung nên dùng khi cần.
