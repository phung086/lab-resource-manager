# Phạm vi thực hiện đề tài

## Nguồn yêu cầu

**Xây dựng hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm**.
Phiếu giao đề tài và dòng 19 người dùng cung cấp yêu cầu quản lý GPU server,
Raspberry Pi, UAV, camera và tài nguyên dùng chung; đặt lịch/phê duyệt, phân
quyền, online/offline, nhật ký, thông báo và giám sát CPU/GPU/RAM/dung lượng.

Đã đọc hai nguồn giảng viên trong `docs/instructor/` và Hướng triển khai.docx
người dùng cung cấp ngày 07/10/2026. IOC yêu cầu tài liệu có ích trực tiếp cho
phát triển: SRS/use case, convention, backlog, ERD, UI/UX và kiến trúc. Tài liệu
không phục vụ triển khai có thể lược bỏ. File Word cho phép demo mô phỏng khi
thiếu thiết bị; không thay thế đề tài gốc hay tự đổi framework/bộ trạng thái.

## Hai năng lực bắt buộc

1. Điều phối sử dụng: tìm tài nguyên, kiểm tra lịch/điều kiện, yêu cầu, duyệt,
   bàn giao, sử dụng, trả, hoàn tất và lịch sử có trách nhiệm.
2. Giám sát: nguồn được xác thực, chỉ số CPU/GPU/RAM/disk/online khi có nguồn,
   lịch sử mẫu, dashboard, ngưỡng, cảnh báo/sự cố và Prometheus.

Thiếu phần cứng không phải lý do bỏ giám sát. Người dùng ngày 12/10 đã bác bỏ
màn kịch bản/simulator cũ; không khôi phục chỉ vì Word từng đề xuất. Hiện giữ
vận hành tài nguyên theo booking, workload/occupancy khai báo và giờ server;
telemetry chỉ là số đo thật khi có nguồn xác thực. Không tự đổi trạng thái vật lý.

## Hỗ trợ và phần mở rộng

AI tập trung tìm lịch/tài nguyên phù hợp và tóm tắt vận hành có bằng chứng; không
quyết định quyền, trạng thái hay phê duyệt. Cần đánh giá hai luồng với provider
thật trước khi tuyên bố đã hoàn thành. Dự báo bảo trì chỉ làm khi đủ dataset.

Kho vật tư, nhóm học phần, VI/EN, guest OTP, pricing/payment, hỗ trợ, loyalty,
fulfillment và ChatGPT bridge đã được người dùng chấp thuận; giữ hợp đồng hiện
có theo ADR hiện hành, không coi chúng là trọng tâm mới. Ba role hiện tại là
ADMIN, LAB_STAFF, CUSTOMER (ADR-033); paid hold theo ADR-038 thay tự xác nhận
lịch có phí, không tự quay lại quy trình/role trong đề xuất Word cũ.
QR demo, NSGA-II/Pareto, fair-share, tối ưu điện năng, chargeback, stress
showcase và bản sao số 3D cũ không phải điều kiện của đề tài. Code nghiên cứu
đã bị ngừng dùng được loại khỏi runtime và xóa theo allowlist đã kiểm tra; không
khôi phục để làm test legacy xanh. Firmware ESP32 là adapter tùy chọn,
không phải yêu cầu phần cứng bắt buộc.

## Cấu trúc và kiểm chứng

Giữ React/Vite, Express, Prisma, PostgreSQL 16. `frontend/` và `backend/` ánh
xạ logic với `code/frontend/` và `code/backend/` của giảng viên; không đổi
framework hoặc di chuyển toàn source chỉ để giống ví dụ. Xem PROJECT_STRUCTURE.

Schema/baseline/applied migrations và dữ liệu nghiệp vụ phải được bảo toàn.
Bảng mang lịch sử migration không phải database dư để drop thủ công.
AI report/screenshot/output tạm không phải tài liệu giao việc lâu dài.
SRS, guideline, CURRENT_STATE và DECISIONS là nguồn context được duy trì.

Xem [CURRENT_STATE](CURRENT_STATE.md) để phân biệt code hiện có, việc còn thiếu,
kết quả đã kiểm chứng và giới hạn. Việc dọn không bắt đầu Batch/tính năng mới.
