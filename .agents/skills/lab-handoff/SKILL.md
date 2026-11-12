---
name: lab-handoff
description: Lưu checkpoint ngắn để tiếp tục LAB sau compact hoặc đổi phiên.
disable-model-invocation: true
---

Dựa trên công việc đã quan sát trong phiên; không thực hiện task mới.

Đọc file trực tiếp từ disk trước khi sửa. Diff so với HEAD có thể là đợt dọn
đã được người dùng duyệt. Không git restore/checkout hoặc chép bản từ HEAD để
"khôi phục" file; chỉ sửa đúng đoạn vừa thay nhầm từ nội dung live đã đọc.

1. Kiểm tra cwd/branch/HEAD/status. Tách thay đổi của task khỏi diff có sẵn.
2. Đọc phần CURRENT_STATE hiện hành. Cập nhật/thay thế checkpoint của đúng task
   và checkout, tối đa khoảng 400 từ; giữ các phần và checkpoint khác.
3. Ghi: thời điểm, checkout/branch/SHA, mục tiêu và phạm vi; file đã sửa; quyết
   định cùng nguồn canonical; lệnh test và kết quả/giới hạn; blockers và bước
   cụ thể tiếp theo, trạng thái quyền mở Batch. Không biến đề xuất thành phê duyệt.
   Kết quả trước khi handoff là bằng chứng cũ, không tự ghi thành PASS mới.
4. Giữ đường dẫn/symbol, không chép source, transcripts, full logs, secrets hay
   runtime samples vào checkpoint. Không tạo report/backup trong repo mỗi phiên.
5. Kiểm tra diff của checkpoint và trả một câu hướng dẫn tiếp tục. Người dùng
   dùng /compact cho cùng task hoặc /clear khi chuyển task sau khi lưu checkpoint.

Phiên tiếp phải kiểm tra Git/runtime thực và đọc hợp đồng liên quan. Checkpoint
không thay SRS, decisions, DB guards hay bằng chứng test mới. Không cam kết giữ
nguyên mọi chi tiết của chat khi compact; thông tin cần thiết được tra lại từ repo.
