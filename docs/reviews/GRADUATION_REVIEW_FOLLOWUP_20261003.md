# Nhận xét đồ án: hướng xử lý và kiểm chứng

Ngày: 03/10/2026. Nhánh: `codex/lab-workspace-ui-draft`, tiếp tục draft PR #22.
HEAD trước chỉnh sửa: `66e744473c940515548048d448019beb3d311e9b`.
Đầu vào: toàn bộ `Lab_Resource_Manager_Nhan_xet_va_de_xuat.docx` người dùng cung
cấp (65 đoạn, một bảng lộ trình). Tài liệu tự nêu chưa chạy ứng dụng/kiểm thử.
Nhận xét là đầu vào đánh giá; assignment, instructor và hợp đồng đã duyệt vẫn
là nguồn quyết định. Không mở Batch mới, đổi framework hoặc sửa migration.

## Quyết định

Hướng tăng độ tin cậy của luồng LAB và hồ sơ bảo vệ là phù hợp. Một số nhận xét
đã được xử lý trước đó (phân trang booking/incident, test locale/network frontend,
feature flags nghiên cứu). Không áp dụng toàn bộ lộ trình như một lần viết lại:
các thay đổi router, toàn bộ TypeScript, session/cookie, test runner và OpenAPI
cần phạm vi hồi quy riêng. Các tính năng kho, nhóm học phần, media và song ngữ
đã được người dùng duyệt được giữ nguyên.

## Đã triển khai trong lần tiếp tục này

| Đề xuất / vấn đề | Thực hiện và bằng chứng |
|---|---|
| Tránh code trùng/mock gây hiểu nhầm | Kiểm tra import/export/dynamic import từ mã Git-tracked; xóa 13 JSX không được tham chiếu có bản TSX đang dùng và 2 store/mock không được tham chiếu. Giữ registry, TSX và các JSX nghiên cứu còn dùng; frontend build/typecheck vẫn qua |
| Đưa truy vấn ra service, kiểm tra đầu vào | Legacy booking read dùng service và Zod, giữ mảng tối đa 100 để tương thích; status sai/array filter trả 400; role/lab/owner vẫn quyết định từ server. Paged resource filter nhận ID chuỗi có giới hạn để không loại bản ghi cũ hợp lệ |
| Đóng lỗi chuyển lịch bảo trì QA-01 | Form lấy `editing.resource.id` trước flat fallback. Browser mở bản ghi API thật, đổi giờ/lý do và VI/EN, xem impact rồi lưu đúng tài nguyên mà không chọn lại |
| ERD/use case/quyền có căn cứ | SRS v1.2 bổ sung use case và ma trận bốn vai trò. ERD chọn 20 model lõi và phần mở rộng kho/nhóm từ Prisma DMMF, so khớp schema; CI kiểm tra tài liệu bị stale |
| Tài liệu dễ tra cứu | Thêm docs index, thay placeholder UI/UX bằng token/interaction hiện có; đánh dấu gap analysis là lịch sử; giữ đường dẫn/bằng chứng Batch cũ |
| Metrics và container | Production metrics yêu cầu bearer riêng; chưa cấu hình trả 503, sai/missing token trả 401. Token query không cấp quyền. Image chạy UID 1000, tạo data directory có quyền ghi |
| Giảm dịch vụ chạy mặc định | Production Prometheus/Node Exporter thuộc profile observability; Prometheus loopback và file secret. Không restart hoặc xóa container/dữ liệu đang dùng |
| Đánh giá bảo mật trung thực | Threat model sửa các tuyên bố cũ về role, write AI, idempotency, limiter và benchmark. Ghi rõ session hiện stateless/localStorage cùng các giới hạn còn lại |
| Screenshot và dữ liệu phát sinh | Ignore output browser/test mới và `.secrets/`; giữ ảnh/báo cáo đã tracked và toàn bộ thay đổi local có trước. Không viết lại lịch sử Git |

## Kiểm chứng mới trên working tree

Môi trường Windows, Node 22, PostgreSQL 16, Chrome headless; DB riêng
`lab_resources_queue_pagination_test`, API 15015/UI 15185. Có 160 booking,
86 incident và các account/tài nguyên fixture; không dùng dữ liệu demo chính.

| Kiểm tra | Kết quả |
|---|---|
| Backend lint, production config, ERD check | PASS |
| Backend `test:required` | 63/63: core 38, release/security 6, assistant 19 |
| Queue PostgreSQL integration | 5/5: dữ liệu vượt cap, totals, scope/owner/revocation, input/legacy ID |
| Browser PostgreSQL | 54 checks PASS, gồm queue/keyboard/retry/late response, VI/EN 375/1440 và maintenance rescheduling |
| Frontend required gate | PASS: 7 locale/network tests, 2.122 khóa, lint 0 lỗi/9 cảnh báo còn lại, TypeScript và build |
| ERD sinh từ schema | PASS: semantic schema match và output exact check; không thay schema |
| Production Compose | PASS config --quiet cả mặc định và profile observability |
| Production Docker runner | Build PASS; UID 1000, ghi/xóa file thử /app/data, Prisma read 160 booking/86 incident và canonical migration deploy trên DB thử PASS |
| Backend dependency audit | Full audit: 4 high; production-only (--omit=dev): 0. Chi tiết dưới đây |

Browser results/screenshots: `logs/queue-pagination-20261003/browser/` (ignored,
giữ để kiểm tra local). Các lệnh tái hiện queue và DB guard nằm trong
[queue report](../WORKSPACE_QUEUE_PAGINATION_20261003.md). Kết quả mới bổ sung cho
snapshot 60/4/51 trước đó, không đổi bằng chứng lịch sử thành một lần chạy mới.
Đã dừng đúng hai process thử API/UI theo PID và command line, xác nhận fixture
rồi xóa riêng DB thử; đã bỏ tag image Docker tạm. Server/database/container
local đang dùng được giữ nguyên. Build cache và báo cáo local được giữ lại.

Không chạy lại toàn bộ ma trận nghiệp vụ lịch sử hoặc chứng nhận production.
CI mới được cấu hình, chưa có kết quả GitHub cho thay đổi local. Windows
`db:generate` bị EPERM do DLL engine đang được server khác sử dụng; không dừng
server đó. Schema/client hiện có đã so khớp, và generate trong Docker build qua.
Production Prometheus scrape với secret/domain thật chưa chạy; lần này kiểm tra
Compose và cơ chế HTTP authorization, không khởi động stack production đang dùng.

## Việc còn lại

Xem [backlog ưu tiên](../backlogs/README.md). Các mục này chưa được triển khai.

Resource list còn cap 250 và stock history 100; phân trang hai nơi này không nằm
trong thay đổi queue hiện tại. Offset pagination đảm bảo snapshot từng response,
không đóng băng kết quả giữa các lần chuyển trang. SMTP/VNPAY/storage/hardware
và vận chuyển thực cần cấu hình/tài khoản/bằng chứng riêng; lần này không cấp
merchant, gửi email hoặc tạo giao dịch/vận đơn bên ngoài.

Bản ghi lịch sử cho revision `7424957`. Kết quả CI và chỉnh sửa tiếp theo nằm
trong [báo cáo đối chiếu PR22](PR22_REVIEW_RESPONSE_20261003.md).
