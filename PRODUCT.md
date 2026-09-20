# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người dùng ưu tiên của phiên bản đầu là sinh viên, giảng viên và nghiên cứu viên trong môi trường đại học/phòng thí nghiệm. Công việc chính của họ là tìm tài nguyên phù hợp, biết khi nào tài nguyên khả dụng, đáp ứng các điều kiện sử dụng và hoàn tất một booking có thể tin cậy từ đầu đến cuối.

Nhóm vận hành quan trọng thứ hai gồm cán bộ lab và quản trị viên. Họ cần dashboard và workflow riêng để duyệt lịch, quản lý tài nguyên, bảo trì, sự cố, người dùng, policy và lịch sử vận hành.

## Product Purpose

Lab Resource Manager là web app nội bộ giúp phòng thí nghiệm quản lý việc tìm kiếm, đặt lịch, phê duyệt, sử dụng và bàn giao tài nguyên dùng chung như GPU server, Raspberry Pi, UAV, camera, phòng thực hành và thiết bị nghiên cứu.

Booking là trải nghiệm trung tâm của sản phẩm. Một lifecycle hoàn chỉnh gồm:

1. Tìm tài nguyên.
2. Kiểm tra availability.
3. Kiểm tra quyền, quota, training và policy.
4. Tạo yêu cầu đặt lịch.
5. Duyệt nếu tài nguyên yêu cầu approval.
6. Thanh toán nếu policy yêu cầu.
7. Xác nhận booking.
8. QR check-in.
9. Sử dụng tài nguyên.
10. Check-out hoặc bàn giao.
11. Hoàn tất booking.
12. Lưu audit và history.

Sản phẩm thành công khi người dùng có thể hoàn tất lifecycle này rõ ràng, đúng quy tắc và không bị double-booking; đồng thời cán bộ lab có đủ dữ liệu và công cụ để vận hành tài nguyên an toàn.

## Positioning

Sản phẩm kết hợp booking theo policy, vận hành tài nguyên và observability trong một workflow thống nhất dành riêng cho phòng thí nghiệm đại học. Hệ thống không chỉ giữ lịch mà còn kiểm tra điều kiện sử dụng, hỗ trợ approval hoặc payment theo từng tài nguyên, theo dõi check-in/check-out và lưu audit trail xuyên suốt.

AI là lớp decision-support dựa trên dữ liệu thật, không thay thế business rules hay quyết định chịu trách nhiệm của con người. AI có thể gợi ý thiết bị phù hợp, đề xuất slot thay thế, giải thích xung đột, cảnh báo tình trạng thiết bị, hỗ trợ tra cứu SOP/tài liệu và hỗ trợ cán bộ lab ra quyết định.

## Operating Context

- Sản phẩm được sử dụng hằng ngày trong môi trường đại học và phòng thí nghiệm, chủ yếu bằng tiếng Việt.
- Người đặt lịch cần so sánh tài nguyên, availability, điều kiện sử dụng và trạng thái yêu cầu của mình.
- Cán bộ lab và admin xử lý hàng đợi duyệt, bàn giao/hoàn trả, bảo trì, sự cố, người dùng và các ngoại lệ vận hành.
- Approval và payment là policy theo tài nguyên hoặc trường hợp sử dụng; không phải booking nào cũng cần duyệt hoặc thanh toán.
- Telemetry đến từ Prometheus, agent hoặc exporter được cấu hình cho tài nguyên thật. Giao diện không hiển thị telemetry giả khi chưa có dữ liệu.
- Các module Digital Twin, simulation, optimization, Pareto, advanced analytics và nghiên cứu hiện có được giữ lại trong khu vực Advanced/Research hoặc sau feature flag, tách khỏi workflow chính.

## Capabilities and Constraints

- Giao diện ưu tiên tiếng Việt và có thể duy trì English/i18n.
- Phân quyền phải được thực thi ở backend theo role; ẩn hoặc hiện UI không được xem là cơ chế authorization.
- Dữ liệu nghiệp vụ thật phải được lưu trong PostgreSQL và quản lý qua Prisma.
- Production không được fallback sang mock data, mock authentication hoặc fake success khi API hay database lỗi.
- Booking phải chống overlap và double-booking ở database level, kể cả khi có concurrent requests.
- Mọi hành động quan trọng phải có validation, authorization và audit trail.
- Availability phải phản ánh booking, trạng thái tài nguyên, maintenance window và các policy liên quan.
- Quota, training/certification, quyền truy cập, approval và payment là các điều kiện có thể được policy áp dụng trước khi booking được xác nhận.
- Telemetry chỉ được hiển thị khi có dữ liệu thật từ Prometheus/agent/exporter; trạng thái thiếu dữ liệu phải được thể hiện trung thực.
- UI phải responsive, accessible và phù hợp cho công việc lặp lại hằng ngày.
- Không ưu tiên hiệu ứng hoặc showcase hơn tính đúng đắn nghiệp vụ.
- Không xóa các advanced module hiện có; tổ chức lại, feature-flag hoặc chuyển chúng vào khu vực Advanced/Research.
- Thứ tự ưu tiên khi có xung đột quyết định: Correctness > Security > Business Rules > UX > AI > Optimization > IoT.

## Brand Commitments

- Tên sản phẩm hiện tại: Lab Resource Manager.
- Ngôn ngữ giao diện ưu tiên: tiếng Việt; English/i18n có thể được duy trì.
- Sản phẩm phải mang cảm giác của một công cụ vận hành đáng tin cậy cho môi trường học thuật, không phải một bản trình diễn công nghệ.

## Evidence on Hand

- Định hướng và phạm vi đã được ghi lại tại `docs/PROJECT_DIRECTION.md`.
- Yêu cầu triển khai, dữ liệu thật và vận hành có trong `README.md`, `docs/REAL_DATA_RUNBOOK.md`, `docs/DEPLOYMENT.md` và `docs/PRODUCTION_READINESS.md`.
- Threat model hiện có tại `docs/security/threat-model.md`.
- Mẫu inventory có tại `data/resource-inventory.template.csv` và `data/ai-lab-inventory.realistic.csv`.
- Repository đã có frontend React/Vite, backend Express, Prisma/PostgreSQL, các workflow booking, telemetry, dashboard và nhiều ảnh chụp giao diện trong `images/`.
- Các artifact hiện có là bằng chứng về phạm vi và ý tưởng đã triển khai, không tự động chứng minh production readiness hoặc tính đúng đắn của hành vi runtime.
- Chưa có testimonial, benchmark vận hành thực tế hoặc số liệu sử dụng đã được xác minh; công việc tương lai không được tự tạo các bằng chứng này.

## Product Principles

1. Booking là trục chính: mọi màn hình cốt lõi phải giúp người dùng tiến tới hoặc vận hành lifecycle booking.
2. Trung thực với trạng thái hệ thống: lỗi, thiếu dữ liệu, xung đột và điều kiện chưa đạt phải được hiển thị rõ ràng, không giả lập thành công.
3. Policy được thực thi, không chỉ được trình bày: business rules, authorization và concurrency protection phải tồn tại ở backend và database.
4. AI hỗ trợ quyết định: AI giải thích và đề xuất dựa trên dữ liệu thật nhưng không vượt qua policy hoặc thay thế trách nhiệm phê duyệt.
5. Nâng cao mà không làm loãng: Advanced/Research features được bảo tồn và tách khu vực để workflow hằng ngày luôn rõ ràng.

## Accessibility & Inclusion

- Giao diện phải responsive và hỗ trợ sử dụng bằng bàn phím.
- Các trạng thái, cảnh báo và hành động quan trọng không được truyền đạt chỉ bằng màu sắc.
- Nội dung tiếng Việt phải rõ ràng, nhất quán và dễ hiểu với sinh viên, giảng viên, nghiên cứu viên và cán bộ lab.
- Các control, form, modal và bảng dữ liệu phải có nhãn, focus state và thông báo lỗi phù hợp cho công nghệ hỗ trợ.
