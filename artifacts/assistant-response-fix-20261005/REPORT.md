# Sửa phản hồi sai ý của trợ lý LAB

## Lỗi được xác nhận

Ảnh người dùng cho thấy câu `ban la ai` trả số lượng tài nguyên và thông báo.
Bộ lập kế hoạch trước đó dùng `get_operational_summary` cho mọi câu chưa nhận
diện được. Dữ liệu là dữ liệu thật, nhưng không trả lời câu hỏi của người dùng.

## Thay đổi

- Câu giới thiệu, chào hỏi và hỏi khả năng trả lời đúng về trợ lý bằng VI/EN.
  Các câu này không đọc MCP hay gọi mô hình ngoài.
- Câu chưa hiểu hỏi lại, kèm một ví dụ tìm lịch. Bỏ tổng quan làm phản hồi mặc
  định; chỉ đọc tổng quan khi người dùng yêu cầu rõ.
- Thu hẹp nhận diện lịch trống: từ `trong` nghĩa “ở trong” không còn tự chọn
  tìm lịch. Kiểm thử bao gồm `Tìm thiết bị trong phòng lab`.
- Giữ metadata nguồn hướng dẫn, giới hạn yêu cầu, scope và form xác nhận cũ.
  Không đổi layout, cơ chế quyền, schema, provider hoặc luồng booking/payment.

Với câu trong ảnh, phản hồi mới là:

> Tôi là trợ lý của LAB Resource Manager. Tôi giúp tìm phòng, thiết bị, xem lịch trống, chuẩn bị đặt lịch và hướng dẫn thanh toán. Bạn muốn tôi hỗ trợ việc gì?

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend required | 68 tests đạt: 38 core, 6 security, 24 assistant/transport |
| Backend lint | Đạt |
| Tích hợp MCP thật, DB test riêng | 9 tests đạt; scope và read-only không đổi |
| Frontend required | 2.178 khóa VI/EN, 83 module audit, 8 tests, typecheck và build đạt |
| Frontend lint | 0 lỗi, 9 cảnh báo đã có |
| Browser/API local với ADMIN | 34 checks đạt; câu ảnh gốc, VI/EN, câu chưa hiểu, đọc lịch thật và tổng quan được yêu cầu rõ |
| Ghi nghiệp vụ trong browser test | 0 POST tạo booking/payment; không có lỗi trình duyệt |

Capture cuối ở `verification/identity-vi.png`, `identity-en.png`, `clarify-vi.png`;
payload bằng chứng đã loại token nằm trong `verification/result.json`.
Lỗi phân biệt `trong`/`trống` được phát hiện bằng test, sửa và chạy lại đạt.

## Giới hạn và an toàn

Hiện hệ thống vẫn dùng bộ nhận diện ý định và tra cứu theo luật. Sửa lỗi này
không biến nó thành mô hình hội thoại hiểu mọi câu hay có trí nhớ ngữ nghĩa.
Mô hình ngoài, thanh toán, email và media không được kích hoạt trong task này.
Câu diễn đạt nằm ngoài phạm vi nhận diện sẽ hỏi lại thay vì trả dữ liệu không
liên quan. Form nghiệp vụ vẫn cần người dùng xác nhận.

Nhánh `codex/lab-workspace-ui-draft`; toàn bộ thay đổi trước task được giữ lại.
Có backup/SHA-256 của file sẽ sửa trong thư mục này. Không reset/migrate/seed
database local, không thêm dependency, không mở Batch mới và không push Git.
API đã khởi động lại để nhận code mới, vì vậy phiên JWT demo cũ cần đăng nhập lại.

Tái kiểm thử:

```powershell
npm --prefix backend run test:required
npm --prefix backend run lint
npm --prefix frontend run test:required
node artifacts/assistant-widget-20261005/run-integration.mjs
# Tại frontend/, đặt UX_DEMO_PASSWORD và CHROMIUM_EXECUTABLE_PATH trước:
node test_assistant_response_ui.mjs
```
