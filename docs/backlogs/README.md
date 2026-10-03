# Prioritized follow-up backlog

Source: [graduation review disposition](../reviews/GRADUATION_REVIEW_FOLLOWUP_20261003.md)
and [PR22 verification](../reviews/PR22_REVIEW_RESPONSE_20261003.md).
These items are deferred, not a new Batch or an implementation commitment.

## Việc còn lại, theo ưu tiên

| Ưu tiên | Việc tiếp theo | Điều kiện kiểm chứng / giới hạn |
|---|---|---|
| P1 | Dependency security và giảm dev dependencies trong runner | Audit hiện có brace-expansion, braces → chokidar → nodemon. npm audit đề xuất hạ major nodemon để hết nhóm cảnh báo; không áp dụng fix --force. Lập thay đổi tooling tương thích, kiểm tra dev watch và migration startup trước khi prune |
| P1 | Session revocation/rotation và chống dò theo account | Thiết kế đồng bộ auth/frontend, test logout/password change/reuse/CSRF và expiry. JWT 8h/localStorage hiện tại chưa giải quyết rủi ro token bị đánh cắp |
| P1 | Regression và benchmark concurrency tái hiện | Test DB riêng, báo chính xác workload, phần cứng, số conflict/commit và p95; không lấy số giả từ UI nghiên cứu |
| P2 | OpenAPI khớp route/error/pagination | Sinh/kiểm tra hợp đồng từ nguồn có kiểm chứng; test drift. Không ghi API dự kiến như đã triển khai |
| P2 | Router và TypeScript tăng dần ở luồng đang dùng | Test direct hash links, role navigation, browser history, unsaved form và VI/EN trước mỗi thay đổi; giữ React/Vite |
| P2 | Đặt tên test theo chức năng, coverage và test runner nếu cần | Giữ npm scripts cũ tương thích; phân biệt gate lõi, integration DB và research; đo coverage trước khi đặt ngưỡng |
| P2 | Logging có cấu trúc, Prettier, dependency alerts | Redact credentials/PII, tránh format lại toàn repo trong thay đổi nghiệp vụ; CI/Dependabot cần cấu hình nhỏ có thể review |
| P3 | Hợp nhất thư mục ảnh/evidence | Rà reference trước khi move/delete; không xóa bằng chứng lịch sử hoặc viết lại Git history để đạt số dung lượng đẹp |

Each implementation must define affected modules, required tests, exclusions and a stop condition before starting.
