# Hướng triển khai và hợp đồng báo cáo vận hành

Đối chiếu đề xuất Hướng triển khai.docx với đề tài và các quyết định hiện hành.
Cập nhật16/10/2026; đây là hợp đồng được duy trì, không phải báo cáo một lượt chạy.

## Phạm vi bắt buộc

Hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm: phòng, GPU server,
Raspberry Pi, UAV, camera và tài nguyên dùng chung. Hai năng lực là điều phối
sử dụng có lịch sử và giám sát có nguồn xác thực. UI đẹp không thay nghiệp vụ.
Giữ React/Vite, Express/Prisma và PostgreSQL16; không đổi sang Python hoặc tạo
thêm Session/SensorLog/Alert song song chỉ vì đề xuất Word nêu ví dụ khác.

Vai trò hiện hành ADMIN/LAB_STAFF/CUSTOMER theo ADR-033, thay bốn actor cũ.
Lịch miễn phí xác nhận tự động sau đủ checks; có phí giữ chỗ15 phút rồi xác
nhận bằng payment/IPN hợp lệ. Duyệt thủ công chỉ legacy không paymentDueAt.
Nhận/trả, room access, slot release và inspection theo ADR-037/038; không lấy
flow duyệt trong tài liệu05/10 làm hợp đồng mới. SRS/DECISIONS chứa chi tiết.

## Giám sát, vận hành và AI

- Resource.operationalStatus là trạng thái vật lý; availability suy từ booking,
  maintenance, policy. Alert/AI không tự sửa physical state hoặc vượt RBAC.
- TelemetrySource, TelemetrySample, MonitoringAlert, Incident và UsageLog đã có;
  dùng identity/scope/freshness/episode hiện hành. Thiếu nguồn phải báo unavailable.
- Workload/occupancy do operator khai báo, thời gian server và actual handover/
  return là bằng chứng vận hành; không phải nhiệt độ, CPU/GPU, điện năng hoặc
  số người được cảm biến đo. Không hiển thị KPI giả hoặc số0 cho unknown.
- User12/10 bác bỏ simulator/kịch bản cũ. Không phục hồi preview, fake hardware
  hoặc migration cũ chỉ vì Word từng cho phép demo mô phỏng. Applied migrations
  giữ bất biến; phần cứng thật cần môi trường và kiểm chứng riêng.
- Trợ lý tra tài nguyên/slot và tóm tắt dữ liệu được phân quyền. Fast lookup và
  ChatGPT Work giữ provenance/actor scope; đề xuất chỉ thành ghi nghiệp vụ sau
  xác nhận qua API thường. Không cam kết model latency từ timing fixture.
- Dự báo bảo trì chỉ triển khai khi có dataset, baseline và đánh giá theo thời
  gian; ngưỡng quy tắc không được gọi là ML. Không tự thêm Digital Twin/NSGA-II.

## Báo cáo7/30 ngày

Endpoint/service hiện hành kiểm ADMIN hoặc LAB_STAFF với UserLabAssignment.
Toàn bộ tổng hợp theo scope trước giới hạn preview; khoảng báo cáo là
[now-days,now). Không đếm một queue page để đưa ra tổng toàn LAB.

| Chỉ số | Ý nghĩa |
|---|---|
| Lịch đặt | Khoảng dự kiến có giao với kỳ; số booking riêng, không nhân theo chi tiết join. |
| Hủy/không đến nhận | Status/outcome hiện tại của lịch dự kiến có giao với kỳ, không là số thao tác hủy trong kỳ. |
| Giờ đã dùng | Phần giao actualStartAt–actualEndAt với kỳ; đang CHECKED_OUT đến thời điểm đọc. |
| Sự cố phát sinh | detectedAt trong kỳ. |
| Sự cố đang xử lý | Sự cố đang mở trong scope, kể cả từ trước kỳ. |
| Bảo trì theo lịch | Phần giao cửa sổ không hủy với kỳ, không phải giờ sửa chữa đo thực tế. |
| Tài nguyên có dùng | Có thời gian bàn giao/hoàn trả dương trong kỳ. |

Không suy ra motor/CPU runtime hoặc hiệu suất năng lượng từ giờ giữ tài nguyên.
Không suy giờ dùng của phụ kiện chỉ được yêu cầu kèm mà chưa bàn giao riêng.
Muốn tỷ lệ sử dụng cần định nghĩa giờ mở cửa/mẫu số; không mặc định24/7.

## Kiểm chứng và tiếp tục

[CURRENT_STATE](CURRENT_STATE.md) phân biệt code hiện hành, kết quả cũ/mới và
provider/hardware chưa kiểm. Dùng tests hiện có, DB test riêng và fixtures có nhãn;
không ghi telemetry/audit/history giả vào DB demo. Kho, học phần, hỗ trợ, email,
loyalty và payment đã được phê duyệt được giữ, không mở rộng chỉ để thêm màn hình.
