# Việc còn lại

Các mục chưa hoàn thành; không tự bắt đầu triển khai khi chỉ đọc backlog.

1. Simulator demo có provenance, nguồn xác thực, ingestion và lưu alert/history;
   tách môi trường/dữ liệu tổng hợp khỏi số đo phần cứng thực tế.
2. Đánh giá AI tìm lịch/tài nguyên phù hợp và tóm tắt vận hành với dữ liệu được
   phân quyền; kiểm chứng VI/EN, dẫn nguồn, lỗi provider và không có write.
3. Chuẩn bị danh mục demo theo đề tài; booking/history phải tạo qua nghiệp vụ
   có nhãn. Dự báo chỉ làm sau khi đủ dataset và tiêu chí đánh giá.
4. Kiểm tra lại UI/locale và lifecycle trong DB test riêng. Không coi build hoặc
   mở form là kiểm chứng đầy đủ bàn giao/hoàn trả.
5. Auth revocation/rotation, guest recovery, dependency security và OpenAPI drift
   theo phạm vi nhỏ; không audit fix --force hoặc đổi framework.

Căn cứ: [phạm vi](../PROJECT_DIRECTION.md), [SRS](../srs.md),
[trạng thái và giới hạn](../CURRENT_STATE.md).
