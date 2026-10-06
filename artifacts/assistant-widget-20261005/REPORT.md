# Trợ lý LAB ở góc dưới phải

Ngày kiểm tra: 05/10/2026. Nhánh `codex/lab-workspace-ui-draft`, tiếp tục local
từ HEAD `43b18328f80a1297c236b69e5496cc8afce86d72`. Không mở Batch mới, không push.
Các file sắp sửa được sao lưu cùng SHA-256 trong `backup/` và `backup-hashes.json`.

## Đã triển khai

- Nút **Trợ lý LAB** ở góc dưới phải trong workspace sau đăng nhập. Chat gọn,
  không phủ nền hoặc khóa cuộn trang. Chọn phòng/thiết bị/thời gian, nguồn dữ liệu
  và trạng thái mô hình nằm trong mục mở rộng. Có VI/EN và hiệu ứng mở ngắn, tôn
  trọng cấu hình giảm chuyển động của trình duyệt.
- Thu nhỏ giữ câu hỏi đang nhập, ngữ cảnh và tối đa 10 lượt hỏi đáp trong bộ nhớ.
  Đổi trang trong workspace vẫn giữ hội thoại; tải lại/đăng xuất xóa lịch sử.
  Thu nhỏ hoặc đổi ngôn ngữ hủy yêu cầu đang chạy. Escape trả focus về nút mở.
  Chat thu nhỏ khi focus bàn phím ở phía sau bị che hoặc một dialog khác mở.
- Yêu cầu đặt lịch đọc lịch trống qua MCP thật, theo chính sách LAB, lịch đặt,
  bảo trì và quyền tài khoản hiện tại. Chỉ gợi ý đủ điều kiện mới có nút mở form.
  Form chuẩn nhận đúng tài nguyên và giờ Việt Nam; người dùng kiểm tra rồi gửi.
  Backend vẫn kiểm tra lại quyền, đào tạo, chính sách, xung đột và giá khi gửi.
- Câu hỏi có ngày/giờ mà bộ lập kế hoạch chưa giải được yêu cầu chọn cửa sổ thời
  gian rõ ràng. Hai trường thời gian phải cùng được điền hoặc cùng để trống.
  Nếu không chọn thời gian, trợ lý công khai phạm vi tìm mặc định 7 ngày tới.
- Hướng dẫn thanh toán phân biệt chức năng bị tắt, chưa có nhà cung cấp sẵn sàng,
  và đã cấu hình. Có nút sang lịch đã đặt; không tạo giao dịch, tự mở URL thanh
  toán do mô hình sinh ra hoặc xác nhận đã trả tiền. Lịch chờ duyệt chưa thể trả
  phí; lịch miễn phí không cần thanh toán.

## Cấu hình thực tế và giới hạn

Runtime hiện báo `LOCAL_GROUNDED` trong `runtime-capabilities.json`: tra cứu thật
và hướng dẫn theo bộ luật; chưa dùng mô hình ngoài. Cấu hình mô hình tùy chọn đã
có trong backend qua `OPENAI_API_KEY` và `OPENAI_MODEL`; task này không nhập hoặc
kích hoạt khóa dịch vụ. Mô hình hiện có chức năng tổng hợp dữ liệu đã đọc,
không phải bộ điều khiển tự do hay bộ nhớ hội thoại dài hạn.

Thanh toán trực tuyến vẫn tắt trong demo. Không tuyên bố đã kiểm thử giao dịch
merchant, chất lượng mô hình ngoài, email hoặc lưu media trong phạm vi này.
Không tự tạo/duyệt/hủy lịch, bàn giao hoặc thanh toán. Đây là ranh giới của
SRS LAB-AI-01: gợi ý quay về form nghiệp vụ có xác nhận, quyền được kiểm tra ở
backend. Kết quả lịch trống là ảnh chụp tại thời điểm hỏi; người khác có thể đặt
trước khi người dùng gửi form, nên bước kiểm tra lại là cần thiết.

Không đổi tool scope/RBAC, schema, migration, dependency hay tài khoản demo.
Không reset/seed database local. Bộ tích hợp chỉ ghi fixture được đánh dấu trong
database riêng `lab_resources_assistant_test`; bộ browser không gửi POST tạo
booking/payment. Đăng nhập kiểm thử vẫn dùng luồng xác thực thật.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend bắt buộc | 66 tests: 38 core, 6 security, 22 assistant/transport đạt |
| Tích hợp MCP thật, DB test riêng | 9 tests đạt; bốn vai trò, phạm vi LAB/object, read-only, slot, hủy, timeout, rate/concurrency |
| Frontend bắt buộc | 2.176 khóa VI/EN; 83 module audit; 8 tests; typecheck/build đạt |
| Lint | Backend đạt; frontend 0 lỗi, 9 cảnh báo đã có |
| Browser bốn vai trò | 98 checks đạt; lịch thật, prefill, thu nhỏ, ngôn ngữ, thanh toán tắt, không booking/payment POST |
| Bổ sung student | 37 checks đạt, gồm focus bị che, Escape, lỗi dịch vụ và hủy yêu cầu; fixture lỗi chỉ thuộc harness |
| Giao diện | 1440, 1280 và 390 px; review độc lập `ship` cho phạm vi trợ lý |
| Diff/documentation | Diff whitespace đạt; DESIGN/sidecar chỉ thêm ngoại lệ chức năng cho chat có mục đích |

Lỗi focus khi mở lần đầu đã được phát hiện và sửa: đóng chat luôn trả về nút
launcher ổn định. Capture đầu tiên chụp trong lúc hiệu ứng mở chưa kết thúc đã
được thay bằng ảnh đã ổn định. File chứng cứ cuối ở `verification/`,
`keyboard-verification/`, `FINISH_REVIEW.md` và `DOCUMENTATION_CHECK.md`.

Lệnh tái kiểm thử, tại thư mục dự án:

```powershell
npm --prefix backend run test:required
npm --prefix backend run lint
npm --prefix frontend run test:required
node artifacts/assistant-widget-20261005/run-integration.mjs
# Browser: tại frontend/, với UX_DEMO_PASSWORD và CHROMIUM_EXECUTABLE_PATH đã đặt.
node test_assistant_widget_ui.mjs
```

`run-integration.mjs` chỉ chạy khi database test đúng tên đã tồn tại; không tạo,
drop hoặc migrate database. UI đang chạy tại http://127.0.0.1:15181/; API 15005.
Khởi động lại API thay khóa JWT demo, nên phiên cũ cần đăng nhập lại.
