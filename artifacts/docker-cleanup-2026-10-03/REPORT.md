# Báo cáo dọn Docker — 03/10/2026

## Kết quả

Đã dừng và xóa các môi trường LAB kiểm thử/giao diện cũ. Website local và database đang dùng vẫn hoạt động. Các container và dữ liệu của dự án đặt vé phim được giữ nguyên.

| Tài nguyên | Trước | Sau |
| --- | ---: | ---: |
| Container tổng | 39 | 4 |
| Container đang chạy | 35 | 2 |
| Image | 46 | 5 |
| Volume | 29 | 6 |
| Network | 14 | 5 |
| Build cache | 356 bản ghi | 0 |

Đã xóa **35 container, 23 volume, 9 network và 41 image**. Image gồm 38 image build LAB cũ và 3 image công cụ không dùng: Mailpit, Prometheus, node-exporter. Lệnh dọn cache báo **26,45 GB**; số này không được cộng với dung lượng image vì có layer dùng chung.

Dung lượng Docker báo sau dọn: image **2,954 GB**, volume **1,514 GB**, build cache **0 B**. Dung lượng image trước dọn là 28,44 GB và volume là 5,169 GB. Đã bổ sung bước thu gọn VHDX: file Docker từ 37,69 xuống 9,51 GiB, giảm 28,18 GiB; xem [DISK_AUDIT.md](C:/Projects/lab-resource-manager/artifacts/docker-cleanup-2026-10-03/DISK_AUDIT.md) để xem số liệu ổ Windows. Giá trị reclaimable của image sau dọn do Docker trả về âm nên không dùng để tính dung lượng đã giải phóng.

## Tài nguyên giữ lại

- PostgreSQL LAB: `lab-resource-manager-postgres-1`, cổng 5432, volume `lab-resource-manager_postgres-data`, healthy. Database đang có kết nối API là `lab_resources_local_demo`.
- Website: [frontend local](http://127.0.0.1:15181/) và [API readiness](http://127.0.0.1:15005/health/ready), chạy bằng Node trên Windows.
- Dự án khác: `movie_ticket_mysql` vẫn chạy/healthy ở cổng 3307; frontend/backend movie giữ trạng thái dừng như trước.
- Hai image PostgreSQL 16: Alpine phục vụ LAB hiện tại; image Debian được giữ để có thể khôi phục các bản sao volume kiểm thử dùng image này.
- Bốn volume vô danh không có bằng chứng đáng tin về dự án chủ quản, tổng dung lượng khoảng 231,4 MB. Ba volume có cấu trúc PostgreSQL 16. Chúng không có container sử dụng và không tạo tác vụ chạy nền; được giữ để tránh mất dữ liệu của dự án khác.

Danh sách container giữ lại, volume chưa rõ nguồn và kết quả kiểm tra có trong [SUMMARY.json](C:/Projects/lab-resource-manager/artifacts/docker-cleanup-2026-10-03/SUMMARY.json).

## Sao lưu và kiểm tra

- Thư mục bản sao: [backups](C:/Projects/lab-resource-manager/logs/docker-cleanup-20261003/backups).
- **23 archive volume**: nén sau khi container sử dụng đã dừng. Đã giải nén luồng để kiểm CRC gzip, ghi dung lượng và SHA-256; hash được kiểm lại trước khi xóa nguồn.
- **83 file logic** của PostgreSQL chính: 82 database dạng custom dump và một file globals. Từng dump kiểm được bằng `pg_restore --list`.
- Tổng dung lượng bản sao khoảng **491.2 MB**. Các file nằm trong `logs/` đã được Git ignore, có thể chứa dữ liệu tài khoản và hash mật khẩu, không được đưa vào PR.
- Đã thử khôi phục archive volume QA vào volume mới, mạng tách biệt: PostgreSQL khởi động được.
- Đã khôi phục dump `lab_resources_local_demo` vào database riêng: 4 người dùng, 11 tài nguyên, 0 booking và 16 migration, khớp bản đang dùng. Container/volume thử khôi phục đã được xóa sau kiểm tra.
- Phạm vi khôi phục thực: một archive vật lý và một database logic; không tuyên bố đã khôi phục thử toàn bộ archive.

## Cách khôi phục khi cần

1. Tra file volume tương ứng trong [volume-backups.json](C:/Projects/lab-resource-manager/logs/docker-cleanup-20261003/volume-backups.json); tra dump database chính trong [main-backup.json](C:/Projects/lab-resource-manager/logs/docker-cleanup-20261003/main-backup.json). Các file này chứa tên, dung lượng và SHA-256.
2. Với dump logic, tạo một database mới trên PostgreSQL 16 rồi dùng `pg_restore --no-owner --no-privileges --exit-on-error`; cấp lại owner/quyền cần thiết sau khi kiểm dữ liệu. File globals dành cho việc khôi phục role có kiểm soát, không nạp thẳng vào PostgreSQL đang dùng.
3. Với archive vật lý, tạo volume mới có tên khác, giải nén bằng tar với quyền root để giữ ownership, rồi khởi động đúng PostgreSQL 16 của môi trường nguồn. Dùng [plan.json](C:/Projects/lab-resource-manager/logs/docker-cleanup-20261003/plan.json) để tra image ID và mount gốc. PostgreSQL Alpine và Debian có môi trường hệ thống khác nhau; ưu tiên đúng image ID của nguồn. Image PostgreSQL Debian giữ lại: `sha256:a3b7f434b2dc57ce85a67e171163eb8ab1a1ebcb39d27484661f26b1dfbe30d6`.
4. Khởi động thử với `--network none`, không mở port và kiểm tra bằng Unix socket trong container. Xác nhận dữ liệu trước khi cho môi trường khôi phục kết nối ứng dụng.
5. Giữ volume PostgreSQL chính hoạt động trong quá trình kiểm tra phục hồi. Ví dụ phục hồi thực đã chạy nằm ở nhánh `restore-check` trong [cleanup.cjs](C:/Projects/lab-resource-manager/logs/docker-cleanup-20261003/cleanup.cjs).

## Kiểm tra cuối

- PASS — Protected container unchanged: lab-resource-manager-postgres-1
- PASS — Protected container unchanged: movie_ticket_frontend
- PASS — Protected container unchanged: movie_ticket_backend
- PASS — Protected container unchanged: movie_ticket_mysql
- PASS — API database readiness (HTTP 200)
- PASS — Frontend responds (HTTP 200)
- PASS — Public resource catalog uses database (HTTP 200), 11 tài nguyên
- PASS — Public resource detail (HTTP 200)
- PASS — Bookings require authentication (HTTP 401)
- PASS — Backup restore: physical and logical
- PASS — Every deleted volume has verified archive

Source ứng dụng, schema, migration và cấu hình tài khoản bên ngoài giữ nguyên trong lần dọn này. Thanh toán VNPAY, lưu media R2, SMTP và vận chuyển thực chưa được kích hoạt; hướng dẫn cấu hình hiện có ở [INTEGRATION_SETUP_GUIDE_20261003.md](C:/Projects/lab-resource-manager/docs/INTEGRATION_SETUP_GUIDE_20261003.md).
