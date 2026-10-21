# Việc còn lại

Các mục chưa hoàn thành; không tự bắt đầu triển khai khi chỉ đọc backlog.

1. Kiểm chứng nguồn telemetry/phần cứng thật khi có thiết bị; giữ provenance,
   freshness và alert/history. Không khôi phục simulator đã bị bác bỏ ngày12/10.
2. Đánh giá AI tìm lịch/tài nguyên phù hợp và tóm tắt vận hành với dữ liệu được
   phân quyền; kiểm chứng VI/EN, dẫn nguồn, lỗi provider và không có write.
3. Chuẩn bị danh mục demo theo đề tài; booking/history phải tạo qua nghiệp vụ
   có nhãn. Dự báo chỉ làm sau khi đủ dataset và tiêu chí đánh giá.
4. Kiểm tra lại UI/locale và lifecycle trong DB test riêng. Không coi build hoặc
   mở form là kiểm chứng đầy đủ bàn giao/hoàn trả.
5. Kiểm chứng authVersion/revocation hiện có; guest recovery, dependency security và OpenAPI drift
   theo phạm vi nhỏ; không audit fix --force hoặc đổi framework.

## Chức năng thực tế được nghiên cứu —19/10/2026

Đánh giá dưới đây là suy luận từ source/contracts hiện có, chưa triển khai các
mục mới trong bảng và không phải cam kết tiến độ. Đã triển khai trong lượt này:
phiên có thu hồi/hết hạn, booking preflight+xem lại và transport phản hồi chat
từng phần. Ưu tiên vận hành/đúng dữ liệu trước tính năng trình diễn.

| Ứng viên | Giá trị và mức khả thi | Điều kiện nghiệm thu |
|---|---|---|
| Xuất lịch cá nhân ICS | Cao, độ phức tạp thấp; dùng booking/giờ đã có, không cần OAuth Google | RFC5545 UID ổn định/DTSTART/DTEND, escape/fold text, UTC hoặc timezone đúng; chỉ owner tải. Pending phải TENTATIVE hoặc chặn xuất; đổi/hủy phải có cách cập nhật, không đưa mã phòng/phone vào file |
| Báo khi khung giờ vừa trống | Cao, độ phức tạp vừa; tận dụng expiry/cancel và outbox | Opt-in, dedupe, TTL, unsubscribe, quota theo người/LAB; chỉ thông báo ứng viên, không tự giữ chỗ hay đặt lịch; worker và delivery thật phải được kiểm tra |
| Passkey/MFA cho ADMIN/LAB_STAFF | Giá trị bảo mật cao, độ phức tạp vừa–cao | HTTPS/WebAuthn challenge dùng một lần, origin/RP ID chính xác, enrollment sau re-auth, nhiều khóa/thu hồi, recovery không yếu hơn đăng nhập; không tuyên bố OTP đổi mật khẩu hiện tại là MFA đăng nhập |
| QR tham chiếu lịch để bàn giao | Cao, độ phức tạp vừa; staff mở nhanh booking đúng LAB | QR chỉ là ID/URL tham chiếu, không phải quyền/mã cửa. Staff đăng nhập và API kiểm role/LAB/payment/time/current state như thường; không tự ghi CHECKED_OUT khi quét |

Nguồn: [RFC5545](https://www.rfc-editor.org/rfc/rfc5545.html),
[OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html),
[OWASP passkey](https://cheatsheetseries.owasp.org/cheatsheets/Passkey_Security_Cheat_Sheet.html).

Căn cứ: [phạm vi](../PROJECT_DIRECTION.md), [SRS](../srs.md),
[trạng thái và giới hạn](../CURRENT_STATE.md).
