# Đề xuất ngôn ngữ và stack dễ học

## Khuyến nghị dùng trong project này

**JavaScript full-stack** là lựa chọn phù hợp nhất cho đề tài:

- Frontend và backend dùng cùng một ngôn ngữ, giảm số thứ phải học.
- React giúp làm dashboard, form đặt lịch, bảng dữ liệu và trạng thái thiết bị dễ đọc, dễ mở rộng.
- Node.js + Express giúp viết API theo route rõ ràng: `/resources`, `/bookings`, `/telemetry`.
- Prisma schema dễ đọc hơn khi trình bày database trong báo cáo.

Stack đã chọn:

| Lớp | Công nghệ | Lý do |
| --- | --- | --- |
| Giao diện | React + Vite + JavaScript | Dễ học, nhiều tài liệu, build nhanh |
| Backend | Node.js + Express | Route/middleware đơn giản, cùng ngôn ngữ với frontend |
| ORM | Prisma | Schema dễ đọc, query dễ hiểu |
| Database | PostgreSQL | Hợp với đặt lịch, quan hệ dữ liệu và constraint chống trùng lịch |
| Monitoring | Prometheus | Chuẩn phổ biến để thu thập metrics CPU/GPU/RAM/disk |

## Các lựa chọn khác

### PHP + Laravel

Dễ học nếu bạn đã quen PHP hoặc làm web truyền thống. Laravel có sẵn auth, routing, migration. Nhược điểm là frontend dashboard realtime/interactive thường vẫn cần thêm JavaScript.

### Python + FastAPI

Rất hợp nếu trọng tâm là telemetry agent, xử lý dữ liệu, AI hoặc script hệ thống. Nhược điểm là bạn phải học song song Python backend và JavaScript frontend.

### Java + Spring Boot

Mạnh cho hệ thống lớn, phân quyền và nghiệp vụ rõ. Tuy nhiên verbose hơn, thời gian build đồ án có thể dài hơn.

## Kết luận

Với mục tiêu đồ án tốt nghiệp cần hệ thống chạy được, dễ đọc code và dễ bảo vệ, nên chọn:

**React + Node.js/Express + Prisma + PostgreSQL + Prometheus**

Hướng này vẫn bám đúng đề xuất ban đầu, nhưng giảm độ khó vì phần lớn code nghiệp vụ nằm trong JavaScript.
