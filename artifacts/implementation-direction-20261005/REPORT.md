# Kiểm chứng tích hợp hướng triển khai

Ngày: 05/10/2026. Nhánh: `codex/lab-workspace-ui-draft`.
HEAD lúc bắt đầu: `43b18328f80a1297c236b69e5496cc8afce86d72`.
Phạm vi là tiếp tục local; chưa commit/push và chưa bắt đầu Batch mới.

## Đã làm

- Đọc toàn bộ nội dung và bảng của `Hướng triển khai.docx`, gồm header/footer.
  Bản trích và thông tin nguồn/SHA256 ở `source-text.txt`, `source.json`.
  File gốc không thay đổi. Không có ảnh nhúng trong tài liệu.
- Đối chiếu với quy tắc dự án, baseline giảng viên, SRS, hợp đồng và báo cáo
  giám sát đã có; kết quả ở
  [hướng tích hợp](../../docs/IMPLEMENTATION_DIRECTION_20261005.md).
- API báo cáo 7/30 ngày, tổng hợp SQL theo phân quyền; UI VI/EN gọn, có mức dùng
  từng tài nguyên và phần cách tính mở theo nhu cầu.
- Sửa tổng lịch đang mở bị lệ thuộc vào danh sách sắp tới tối đa 20 dòng.
- Preview mô phỏng có nhãn riêng, dùng chung quy tắc ngưỡng, không nối vào DB
  hoặc luồng vận hành thật.
- Giữ các thay đổi local trước đó. Các file chính đã sửa có bản sao trong
  `backup/`; manifest ghi SHA256 của các file sao lưu ban đầu.

## Kết quả

| Kiểm tra | Kết quả / bằng chứng |
|---|---|
| Backend required | 86 test PASS: 38 core, 6 security, 38 assistant/transport, 4 report/scenario; `backend-required.log` |
| Report PostgreSQL integration | 3 test PASS trên PostgreSQL 16, DB riêng `lab_resources_assistant_test`; `integration.log` |
| Frontend required | Locale parity/integrity, 8 locale/network test, 84 active-source audit, lint, typecheck, build PASS; `frontend-required.log` |
| Locale | 2.213 key VI/EN, tham số và bản chiếu backend đồng bộ |
| Lint | Backend PASS; frontend 0 lỗi, 9 cảnh báo đã có từ trước |
| Browser | 38 assertion PASS bằng Chrome thật, 1440×1000; `browser/result.json`, `browser.log` |
| Scenario | Kịch bản cố định, cảnh báo ngưỡng, mất kết nối, hồi phục, giới hạn nhịp và clock được kiểm thử; JSON preview và 6 frame playback cách nhau 5 giây |
| Diff | Kiểm tra file mới, so sánh file sửa với backup và `git diff --check` |

Sau chỉnh nhỏ về định dạng đơn vị giờ và cache riêng cho báo cáo, integration,
typecheck/build, lint và browser được chạy lại. Không có lỗi lint mới.

### Những tình huống quan trọng đã chứng minh

- Phiên có lịch dự kiến ngoài kỳ nhưng bàn giao trong kỳ vẫn được tính.
- Thời gian thực tế và dự kiến được cắt đúng ranh giới; lịch chưa duyệt/bị hủy
  không cộng giờ đã duyệt; NO_SHOW vẫn là outcome.
- Phiên hoàn trả đúng đầu kỳ được đếm là kết thúc trong kỳ; thời gian trước kỳ
  không cộng vào giờ sử dụng của kỳ đó.
- Sự cố cũ còn mở được đếm riêng với sự cố mới phát sinh.
- Bảo trì bị hủy không cộng giờ; giờ bảo trì còn lại ghi rõ là theo lịch.
- Với 27 công việc đang mở, danh sách sắp tới có 20 dòng nhưng tổng vẫn là 27;
  bao gồm một bàn giao quá giờ.
- ADMIN có phạm vi toàn hệ thống; nhân viên chỉ có lab được phân công, người
  chưa được phân công nhận rỗng. Thu hồi phân công có hiệu lực ở request sau.
- Chưa đăng nhập, tài khoản tắt và vai trò giảng viên/sinh viên bị từ chối.
  Filter sai, trùng tham số hoặc laboratoryId chèn thêm trả 400.
- Đổi kỳ nhanh không hiển thị lại số liệu cũ; lỗi tải ẩn metrics cũ và có thử lại.
  Phiên VI/EN không lộ key dịch, không có lỗi JavaScript hoặc tràn ngang desktop.

Các fixture DB trong integration có nhãn `Isolated` và mã riêng theo lần chạy;
chỉ chúng được dọn khi test kết thúc. Không migrate/reset DB hoặc seed business
data vào `lab_resources_local_demo`. Có một lần fixture bị DB từ chối do thiếu
outcomeAt của NO_SHOW; fixture được sửa đúng constraint. Constraint được giữ nguyên.
Unit dashboard cũ cũng được cập nhật stub để kiểm tra truy vấn tổng hợp mới.

### Ảnh kiểm tra

`browser/admin-vi.png`, `admin-en.png`, `staff-vi.png`, `staff-en.png` dùng API demo
local thực tế. Demo chưa có bàn giao nên báo cáo đúng là không có giờ sử dụng.
`browser/isolated-fixture-ranking.png` dùng kết quả SQL đã ghi từ fixture trong DB
test, được đưa vào riêng phiên browser để kiểm tra biểu đồ và phần chi tiết.
Ảnh này không phải số liệu của demo local hay bằng chứng đo phần cứng.

## Chạy lại

```text
cd backend
npm run test:required
npm run lint
npm run demo:monitoring-scenario
npm run demo:monitoring-scenario -- --play
```

Integration dùng `OPERATIONS_REPORT_TEST_DATABASE_URL`, chỉ chấp nhận loopback
và tên `lab_resources_assistant_test`, xác nhận current_database trước khi tạo
fixture. `node artifacts/implementation-direction-20261005/run-integration.mjs`
từ gốc repo dùng kết nối local hiện có, giữ bí mật credential và tạo snapshot
fixture phục vụ kiểm tra UI.

Frontend: `npm run test:required` trong `frontend/`. Browser:
`node test_operations_report_ui.mjs`, với `UX_DEMO_PASSWORD` và
`CHROMIUM_EXECUTABLE_PATH`; cần snapshot từ integration và API/UI local đang chạy.
Không ghi mật khẩu/provider key vào báo cáo hay code.

## Giới hạn và rủi ro còn lại

- Chưa tích hợp simulator với ingestion/UI, chưa kiểm chứng cảm biến thật,
  WebSocket/SSE hay nút demo sự cố trên dashboard.
- Chưa gọi provider AI; dự báo hỏng/nhu cầu chưa có bộ dữ liệu và đánh giá.
- Giờ đã dùng là thời gian bàn giao đến hoàn trả. Người dùng quên hoàn trả có
  thể làm số giờ tăng; báo cáo không khẳng định thiết bị chạy liên tục.
- Kỳ 7/30 ngày là cửa sổ lùi, không phải tuần/tháng lịch. Lịch hủy/NO_SHOW được
  phân theo thời gian dự kiến, không theo thời điểm bấm hủy/phát hiện.
- SQL trả một hàng mỗi tài nguyên; chưa đo hiệu năng trên dữ liệu lớn. Không
  suy diễn downtime từ trạng thái vật lý hiện tại hoặc thời gian sửa chữa từ
  kế hoạch bảo trì. API `utilization` cũ vẫn giữ tương thích, không còn được dùng
  để trình bày tỷ lệ sử dụng theo giờ mở cửa ở giao diện báo cáo mới.
- Các suite lịch sử Batch 2–8, Linux production-like demo và toàn bộ UI ngoài
  phần báo cáo không được chạy lại trong lần này. Không tuyên bố full release QA.

Ứng dụng local đang chạy tại `http://127.0.0.1:15181/`, API `15005`; ADMIN và
nhân viên có thể mở menu Bảng điều khiển vận hành (`#/workspace/van-hanh`).
Backend được khởi động lại để nhận code; JWT demo đổi nên phiên cũ cần đăng nhập lại.
