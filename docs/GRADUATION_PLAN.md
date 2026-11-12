# Kế hoạch hoàn thiện và nghiệm thu đồ án

Kế hoạch áp dụng cho đồ án cá nhân Lab Resource Manager tại mốc rà ngày
12/11/2026. Các hàng là thứ tự chuẩn bị nghiệm thu. Ngày nộp và các mốc
báo cáo theo lịch giảng viên xác nhận.

| Mốc | Công việc và đầu ra | Điều kiện hoàn thành |
| --- | --- | --- |
| 1. Chốt phạm vi | Đối chiếu phiếu giao đề tài, nguồn IOC, SRS, ADR và runtime. Chốt đặt lịch và giám sát là hai năng lực bắt buộc. | Có thể chỉ ra nguồn của mỗi yêu cầu chính và mức bằng chứng hiện tại. |
| 2. Chốt chất lượng mã | Kiểm tra imports, cấu hình, mã trùng và tệp sinh ra. Dùng chung formatter, locale, serializer và mã trạng thái ở nơi có cùng hợp đồng. | Diff có phạm vi rõ, build/typecheck/lint chạy được, ERD khớp schema. |
| 3. Nghiệm thu lõi | Chạy test PostgreSQL 16 riêng cho phân quyền, đặt trùng, nhận/trả, lịch sử, bảo trì và giám sát. Mở giao diện theo vai trò và kiểm các lỗi liên quan. | Ghi lệnh, môi trường, ca đạt/lỗi/bỏ qua. Có kết quả riêng cho từng nhóm nghiệp vụ. |
| 4. Chuẩn bị trình bày | Tập theo runbook, dùng ba phiên trình duyệt và một lịch demo. Mở nguồn đo Windows và kịch bản có nhãn mô phỏng. | Có thể lần theo mã lịch, trạng thái, bản ghi bàn giao, mẫu giám sát, cảnh báo và nhật ký. |
| 5. Bàn giao hồ sơ | Đóng gói lý do chọn đề tài, kế hoạch, SRS, cấu trúc và ma trận kiểm chứng thành Word/PDF. | Hai định dạng cùng nội dung. Tài liệu ghi phạm vi, nguồn, giới hạn và việc còn lại. |

## Các việc phụ thuộc điều kiện

- Kiểm chứng GPU server, Raspberry Pi, UAV hoặc camera theo thiết bị hiện có.
  Ghi nguồn đo, phiên bản bộ thu, thời điểm, các chỉ số thật và tình trạng
  thiếu dữ liệu theo từng thiết bị.
- Kiểm Google, OTP/SMTP, cổng thanh toán, lưu trữ ảnh/video và mô hình AI khi
  có cấu hình được cấp. Ghi rõ kiểm thử cô lập, Sandbox hay giao dịch thật.
- Chốt quy tắc trả sớm với giảng viên hoặc chủ đề tài nếu cần đổi yêu cầu.
  Đối chiếu ADR-037, FR-OPS-08 và ca hồi quy trước khi đổi.
- Dùng kết quả kiểm thử cục bộ để chuẩn bị nghiệm thu. Đánh giá tải, bảo mật
  và vận hành môi trường thật theo tiêu chí triển khai riêng.

## Tài liệu làm việc

- [Phạm vi và lý do chọn đề tài](PROJECT_DIRECTION.md)
- [SRS và use case](srs.md)
- [Cấu trúc thư mục](PROJECT_STRUCTURE.md) và [quy ước mã](convention.md)
- [ERD](DB-erd/core-erd.md) và [hướng dẫn UI/UX](UI-UX-style-guideline/README.md)
- [Kiểm thử hệ thống](SYSTEM_TEST_GUIDE.md) và [kịch bản demo](GRADUATION_DEMO_RUNBOOK.md)
- [Backlog](backlogs/README.md) và [trạng thái xác minh](CURRENT_STATE.md)
