# UI/UX — nghiệp vụ và khả năng sử dụng

Claude tự quyết visual design và cách triển khai khi người dùng giao redesign.
Không có palette, typography, bố cục, template hoặc rollout cũ bắt buộc.
Tra source/style imports để hiểu UI đang chạy; skill GitHub chỉ nạp khi cần.

- Giữ chức năng theo SRS và API/RBAC; không dùng số liệu hoặc success giả.
- Phân biệt trạng thái vật lý, availability và booking lifecycle.
- Hàng đợi dùng server totals/pagination theo đúng scope; có loading/error/retry.
- Giữ labels, focus, keyboard, Escape/restore và mục tiêu tương tác44px phù hợp.
- VI/EN không làm mất draft, resource, route hoặc query/history.
- Tôn trọng reduced motion; chuyển động dài có pause; nội dung vẫn đọc được.
- Bảo toàn responsive và các action trên laptop; báo rõ viewport/role/locale
  thật đã kiểm, trường hợp thiếu dữ liệu hoặc feature tắt chưa được kiểm.

Hợp đồng chi tiết ở [Frontend guideline](../FRONTEND_GUIDELINE.md),
[SRS](../srs.md) và [Pagination](../WORKSPACE_QUEUE_PAGINATION_20261003.md).
Chạy gate phù hợp và xem UI/flow thật; build không chứng minh UX. Output tạm
ngoài Git; ghi kết quả/giới hạn ngắn trong [CURRENT_STATE](../CURRENT_STATE.md).
