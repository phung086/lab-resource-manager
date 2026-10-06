# Cải tiến danh mục, chi tiết tài nguyên và hồ sơ — 05/10/2026

Tiếp tục local trên `codex/lab-workspace-ui-draft`, HEAD `43b18328f80a1297c236b69e5496cc8afce86d72`. Chưa commit hoặc push. Không mở Batch mới. Các thay đổi local trước đó được giữ nguyên; bản sao trước lượt sửa này có manifest SHA-256 tại `backup-manifest.json`.

## Thay đổi đã triển khai

- Danh mục desktop chuyển sang các dòng thiết bị thẳng hàng: ảnh, tên, LAB, khả dụng và thao tác. Mẫu Inventory Management Dashboard được áp dụng vào mật độ và cách quét danh sách, thay cho các thẻ cao lặp lại. Thiết bị không có ảnh giữ cùng khung bố trí.
- Tìm kiếm và bộ lọc mở bằng nút. Đóng bộ lọc giữ nguyên lựa chọn; số bộ lọc đang áp dụng và nút xóa vẫn tiếp cận được.
- Bấm tên hoặc “Xem chi tiết” mở hồ sơ tài nguyên. Ảnh cạnh mô tả, điều kiện duyệt và đào tạo giúp quyết định trước khi chuyển sang lịch. Cách nối danh mục → chi tiết → lịch tham khảo luồng Rentaxo. Các thông số, hướng dẫn, lịch và lịch sử vận hành nằm trong mục riêng.
- Sửa lỗi khiến nhân viên ngoài phạm vi LAB không mở được chi tiết: thông tin tài nguyên và lịch sử dụng không còn chờ API lịch sử nội bộ. Lịch sử chỉ được tải khi chọn mục đó. API vẫn trả 403 cho nhân viên ngoài phạm vi; giao diện giải thích trong mục lịch sử, không giả lập thành lịch sử rỗng.
- Hồ sơ chia theo thông tin cá nhân, bảo mật, điều kiện sử dụng và hoạt động, tham khảo cách chia nội dung tài khoản của Maglo. Form giữ bản nháp khi đổi mục/ngôn ngữ. Bỏ mã `SELF_DECLARED_UNVERIFIED` và cách diễn đạt RBAC khỏi nội dung hiển thị; giải thích quyền bằng câu ngắn. “Đã thiết lập mật khẩu” phản ánh cờ hệ thống, không khẳng định độ mạnh mật khẩu.

Tham khảo là cách bố trí, không sao chép tài sản hay tuyên bố tái tạo các lớp Figma không truy cập được. Xem [hướng triển khai](DIRECTION.md) và [nghiên cứu nguồn trước đó](../final-ui-preparation-20261005/REFERENCE_REVIEW.md).

## Kiểm tra

| Kiểm tra | Kết quả và phạm vi |
|---|---|
| Frontend required gates | 2.155 khóa VI/EN khớp, 82 module kiểm tra nội dung, 8 unit tests; lint 0 lỗi và 9 cảnh báo có trước; typecheck và production build đạt. Log: `frontend-required.log`. |
| API thật với 4 role | 133 kiểm tra đạt: đóng/mở và giữ bộ lọc, mở từng mục chi tiết, lịch sử 403 cho staff chưa được phân công và 200 cho các role được phép, lỗi lịch sử 503 và thử lại, chuyển đúng tài nguyên sang lịch, hồ sơ và bản nháp VI/EN. `verification/results.json`. |
| Sau khi sửa bố cục danh mục | 38 kiểm tra staff đạt trên mã cuối: quyền lịch sử, chi tiết/lịch, bộ lọc, bản nháp, nội dung dễ đọc và không tràn ở 1280/375px. `post-fix/results.json`, `post-fix-test.log`. |
| Bàn phím | 7 kiểm tra live đạt: Enter mở/đóng bộ lọc và mở bảo mật, Tab/Shift+Tab giữ focus trong modal, Escape trả focus về đúng thiết bị. Sửa lỗi opener mất focus khi bị disabled trong lúc tải chi tiết. `keyboard-results.json`. |
| Rà soát thiết kế | Review ban đầu yêu cầu thay thẻ cao và sửa căn hàng; lượt chấm lại xác nhận hai mục resolved, `disposition: ship`. Xem `FINISH_REVIEW.md` và `FIX_VERDICT.md`. |
| Detector | Không có finding trong lượt quét các file đích (`detector.json`). Đây không thay thế đánh giá hình ảnh. |

Ảnh danh mục cuối tại `verification/catalog-1440.png`, `catalog-1280.png`, `catalog-375.png` đã cuộn qua toàn trang để kích hoạt ảnh lazy, chờ load/decode rồi chụp. Chi tiết và hồ sơ có ảnh VI/EN trong cùng thư mục. Các lần lỗi kiểm tra trước đó được giữ tại `prior-attempts/`; lỗi chọn lịch ban đầu là đọc select trước khi danh sách tải xong, đã sửa kiểm tra bằng cách chờ và xác nhận đúng tên tài nguyên. Một lần chạy sau đó gặp `ECONNREFUSED` do tiến trình local đã dừng; khởi động lại và lượt kiểm tra sau đạt.

## Runtime và giới hạn

UI: [localhost:15181](http://127.0.0.1:15181/). Danh mục: [Phòng và thiết bị](http://127.0.0.1:15181/#/workspace/tai-nguyen). API: cổng 15005. Đã khởi động lại bằng launcher local hiện có, dùng database demo hiện có; không migrate, reset hoặc seed. Phiên cũ có thể cần đăng nhập lại vì JWT secret được tạo lại khi launcher chạy.

Backend, schema, migrations, vai trò và trạng thái chuẩn không đổi. Test chỉ đăng nhập và đọc, không sửa hồ sơ/mật khẩu, đặt/duyệt lịch, bảo trì hay dữ liệu nghiệp vụ của demo. Đây là kiểm tra cho các phần vừa sửa, không xác nhận toàn bộ luồng nghiệp vụ của dự án.

Ảnh/video tham khảo hiện có vẫn phụ thuộc nguồn bên ngoài và được ghi nguồn trong chi tiết; chưa phải ảnh thiết bị thực tế của đơn vị. Không bổ sung provider upload, SMTP hoặc thanh toán thật trong lượt này. Các màn khác vẫn còn phần cần cải tiến; lượt này hoàn tất danh mục, chi tiết và hồ sơ trong khung header/footer chung.

## Tài liệu và bảo toàn

`DESIGN.md` và `.impeccable/design.json` đã được cập nhật có phạm vi cho danh mục,
chi tiết và hồ sơ. Token frontmatter được giữ nguyên; JSON sidecar hợp lệ.
`docs/FRONTEND_GUIDELINE.md` và `docs/CURRENT_STATE.md` ghi hành vi đã kiểm tra.
12 file backup đều khớp SHA-256; HEAD không đổi và backend diff rỗng.
Xem `DOCUMENTATION_CHECK.md` và `safety-check.json`.
