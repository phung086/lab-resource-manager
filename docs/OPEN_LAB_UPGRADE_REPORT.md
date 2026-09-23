# Open LAB upgrade — báo cáo triển khai và bàn giao

Cập nhật: 2026-09-23. Trạng thái: **đang triển khai, chưa phải bản final**.

## Phạm vi được người dùng chốt

- LAB phục vụ nội bộ và người ngoài; thu phí tùy tài nguyên/mục đích.
- Đặt nhanh từ trang công khai, nhập thông tin liên hệ và chọn địa chỉ hành chính Việt Nam; xác minh email OTP, tạo hoặc tái sử dụng tài khoản. Không dùng số điện thoại làm mật khẩu.
- Hiển thị phí trước khi gửi; nếu cần duyệt thì duyệt trước thanh toán. VNPAY gắn với booking; trạng thái thanh toán tách khỏi BookingStatus.
- Chủ booking phòng ROOM tự hoàn trả, giải phóng phần thời gian còn lại. Thiết bị cần nhân viên tiếp nhận/kiểm tra; hỏng hóc gắn với lịch sử và thông tin người mượn.
- ADMIN và LAB_STAFF được phân công nhận thông báo vận hành; người đặt nhận kết quả.
- URL phản ánh màn hình; tổng quan vận hành và telemetry có mục đích riêng.
- Loyalty và tích hợp vận chuyển là hướng sau, chưa triển khai trong đợt này.

## Tiến trình

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| Khảo sát trạng thái local và hợp đồng hiện tại | Đã đọc | Có nhiều thay đổi chưa commit từ các pass trước; giữ nguyên |
| URL dashboard / back / refresh | Đang triển khai | App hiện chỉ dùng activeTab |
| Tách vận hành / telemetry | Đang triển khai | Hai tab hiện render cùng component |
| Thông báo quản trị theo sự kiện booking | Chờ triển khai | Hiện chỉ chủ booking nhận duyệt/từ chối |
| Tự trả phòng và giải phóng lịch | Chờ triển khai | API hiện chỉ cho nhân viên RETURNED/COMPLETED |
| Bảng giá, phí booking, hạn thanh toán VNPAY | Chưa hoàn thành | Tích hợp thanh toán trước đó chưa phải luồng tự tính phí |
| Đặt nhanh, danh tính ngoài trường, email OTP | Chưa hoàn thành | Cần hợp đồng quyền và persistence riêng |
| Chọn địa chỉ Việt Nam có nguồn/version | Chưa hoàn thành | Không dùng dataset cũ không kiểm chứng |
| Kiểm thử nâng cấp | Chưa chạy | Kết quả pass trước không chứng minh luồng mới |

## Quy tắc bàn giao giữa các agent

1. Đọc AGENTS.md, tài liệu bắt buộc và báo cáo này trước khi sửa.
2. Kiểm tra git diff; không reset hoặc ghi đè công việc local. Không seed lại dữ liệu người dùng đã thao tác để làm test xanh.
3. Cập nhật trạng thái theo kết quả thực, ghi lệnh kiểm thử và giới hạn. Không gọi bản này là final.
4. Không đổi enum vai trò âm thầm; danh tính ngoài trường cần thay đổi hợp đồng được ghi rõ, không gán giả STUDENT.
5. Không chạy db push; migration mới phải additive, thử trên DB cô lập trước.
6. OTP phải gửi qua SMTP thực; thiếu cấu hình phải báo lỗi, không trả mock success. Callback thanh toán phải kiểm chữ ký, số tiền và idempotency.

## Cấu hình bên ngoài cần xác minh

- SMTP để gửi OTP, tên miền gửi thư và khả năng nhận thư thực.
- VNPAY sandbox/merchant, secret, URL callback/IPN truy cập được.
- Nguồn địa chỉ hành chính hiện hành và dịch vụ gợi ý địa chỉ chi tiết.

Không ghi secret hoặc dữ liệu liên hệ thật vào báo cáo.
