# Kịch bản demo toàn dự án Lab Resource Manager

**Khoảng 25–35 phút**, tính theo giờ Việt Nam. Dùng ba phiên trình duyệt riêng
cho ADMIN, LAB_STAFF và CUSTOMER. Mở ứng dụng tại [localhost:5173](http://localhost:5173/).
Tài khoản demo có sẵn dùng để đăng nhập. Tạo tài nguyên và lịch ngay trong
buổi trình bày, chọn thời gian theo giờ thực tế lúc thao tác.

**Lời mở đầu.** “Em sẽ đi theo một lượt sử dụng phòng thí nghiệm, từ lúc quản
trị viên thiết lập quyền và tài nguyên, khách hàng chọn giờ, cán bộ bàn giao
và hoàn trả, đến lúc hệ thống giám sát và lưu lại lịch sử.”

## 1. ADMIN thiết lập quyền và tài nguyên · 5 phút

1. Mở **Quản trị người dùng**, chọn một tài khoản LAB_STAFF để xem phân công.
   Nếu muốn minh họa thao tác ghi, tạo một tài khoản LAB_STAFF dùng riêng
   trong buổi demo, phân công vào đúng một LAB và đăng nhập bằng tài khoản đó.
   Chỉ ra LAB đã chọn trên hồ sơ và phạm vi cán bộ nhìn thấy sau khi đăng nhập.
2. Mở **Quản trị tài nguyên → Hồ sơ tài nguyên → Thêm tài nguyên**. Tạo một phòng mẫu
   với mã mới, loại **Phòng**, LAB vừa chọn, vị trí và sức chứa. Chọn trạng
   thái sẵn sàng và cho phép đặt. Kiểm tra phòng xuất hiện trong danh mục.
3. Mở **Bảng giá thuê** trong quản trị tài nguyên. Chọn phòng vừa tạo,
   đặt giá **0 đ/giờ**, thời lượng tối đa **60 phút** rồi lưu. CUSTOMER sẽ
   thấy chính giá và giới hạn đó ở lượt đặt chính.

**Nói với giảng viên.** “Quản trị viên quyết định ai vận hành LAB nào và
cấu hình dịch vụ đặt lịch. Cán bộ xử lý các lượt sử dụng trong phạm vi được
giao.” Đây là chỗ thể hiện khác biệt về quyền, trước khi chuyển sang vận hành.

## 2. CUSTOMER tra cứu, đặt lịch và thấy kết quả · 5 phút

1. Từ trang công khai, mở danh mục và lịch. Chỉ cách tìm theo tên hoặc mã,
   lọc theo loại, xem thông số, giá, điều kiện và khung bận. Lịch công khai
   chỉ hiển thị thông tin khả dụng. Có thể mở một thiết bị mẫu để xem nguồn
   thông số hãng. Danh mục demo có 60 đơn vị mẫu thuộc 10 model.
2. Đăng nhập CUSTOMER. Tìm phòng vừa tạo, chọn thời lượng **30 hoặc 60 phút**
   và khung trống gần nhất vẫn đáp ứng thời gian báo trước. Xem kết quả
   kiểm tra, điền liên hệ demo, xem lại báo giá và xác nhận. Ghi nhớ tiêu đề
   hoặc mã lịch vừa tạo để hai vai trò cùng tìm. Mở **Lịch đặt của tôi** để
   thấy trạng thái **Đã xác nhận**, sau đó mở **Thông báo**.
3. Quay lại lịch của cùng phòng, chỉ khung vừa đặt đã bị chiếm. Nếu màn hình
   chặn chọn ngay từ đầu, đó là kết quả mong đợi. Có thể mở lịch bằng phiên
   khách thứ hai để chứng minh họ thấy khung bận nhưng không xem được hồ sơ
   riêng của chủ lịch.

**Canh giờ nhận.** Tạo lịch cần báo trước tối thiểu 30 phút, hoặc lâu hơn
theo LAB. Bàn giao mở từ 30 phút trước giờ bắt đầu và đóng khi tới giờ kết
thúc. Ví dụ nếu thao tác lúc 14:05, chọn khung **14:45–15:15** nếu còn trống,
thì có thể bàn giao từ **14:15**. Làm phần giám sát tiếp theo trong thời gian
chờ. Nếu buổi demo không tới giờ bàn giao, mở hồ sơ và chỉ mốc được nhận.
Các bước nhận, trả và hoàn tất phía dưới dùng khi cửa sổ nhận đã mở.

## 3. LAB_STAFF giám sát, xử lý cảnh báo và bảo trì · 7–9 phút

1. Vào **Giám sát tài nguyên → Nguồn cảm biến → Thiết lập mô phỏng**. Chọn
   một nguồn thử nghiệm phù hợp và bấm **Chạy 5 phút** ngay trong demo.
   Kịch bản **Tăng nhiệt → mất kết nối → phục hồi** đi qua bình thường, tải cao, quá nhiệt, mất kết nối
   rồi phục hồi. Mở hồ sơ nguồn và chỉ biểu đồ, nhãn **Mô phỏng**, mẫu mới
   nhất và các ngưỡng. Phiên có tối đa 60 mẫu, cách khoảng 5 giây.
2. Khi cảnh báo mở, xác nhận đã tiếp nhận nếu nút còn khả dụng. Mở sự cố liên
   kết trong **Sự cố tài nguyên**, xem nguồn và mẫu gây cảnh báo, ghi nhận
   cách xử lý theo trạng thái trên màn hình. Khi số đo hồi phục, mở phần
   cảnh báo đã kết thúc để xem thời điểm phục hồi. Sự cố tiếp tục theo quy
   trình xử lý của cán bộ.
3. Mở **Bảo trì và hiệu chuẩn**. Chọn một tài nguyên demo khác hoặc một khung
   về sau, xem tác động tới lịch, lưu khoảng bảo trì nếu muốn minh họa việc
   ghi. Quay sang lịch để chỉ đúng khoảng bị chặn. Chừa nguyên khung của phòng
   đang dùng cho bước bàn giao.
4. Đối chiếu nguồn máy tính Windows nếu giảng viên hỏi về thiết bị thật.
   Hồ sơ `DEMO-HOST-PC` có CPU, RAM và đĩa đã đo. Có thể chạy bộ thu trong
   lúc trình bày bằng `node backend/scripts/monitorLocalComputer.mjs --duration=300`
   từ thư mục gốc để có số đo mới. Giao diện hiển thị nguồn đo và nguồn mô
   phỏng theo nhãn tương ứng.

**Nói với giảng viên.** “Cảnh báo lấy từ số đo và ngưỡng. Giờ sử dụng phòng
được ghi theo bàn giao và hoàn trả. Hai dữ liệu này trả lời hai câu hỏi
khác nhau về tài nguyên.”

## 4. LAB_STAFF bàn giao và CUSTOMER đối chiếu · 5 phút

1. Mở **Lịch đặt và bàn giao → Chờ bàn giao**, tìm lịch vừa tạo. Khi đến
   giờ nhận, nhập tình trạng trước khi dùng và xác nhận bàn giao. Chỉ trạng
   thái **Đang sử dụng** của lịch và trạng thái vật lý của phòng.
2. Mở cùng lịch ở CUSTOMER để đối chiếu cập nhật. Sau đó quay lại LAB_STAFF,
   ghi tình trạng khi trả, xác nhận trả rồi hoàn tất sau kiểm tra. Chỉ lịch
   sử thao tác và trạng thái **Hoàn tất**. Nếu tài nguyên đang được ghi nhận
   hỏng hoặc bảo trì, hoàn trả giữ trạng thái vật lý đó.
3. Nếu cần minh họa thêm quyền của khách đặt phòng, có thể chọn luồng **khách
   tự nhận/trả phòng** thay cho thao tác nhận/trả của cán bộ. Sau khi khách
   khai báo trả, cán bộ kiểm tra và hoàn tất. Chỉ chọn một luồng nhận/trả
   cho cùng một lịch.

## 5. ADMIN kiểm toán và chốt phạm vi · 4–6 phút

1. Mở **Nhật ký kiểm toán**, lọc theo hành động hoặc loại đối tượng vừa
   thao tác. Chỉ người thực hiện, hành động và thời điểm. Mở **Bảng điều khiển
   vận hành** để xem tổng hợp trong phạm vi toàn hệ thống.
2. Nếu trình bày thanh toán, ADMIN cấu hình giá dương cho **phòng vừa tạo**
   sau khi đã kết thúc lượt miễn phí. CUSTOMER đặt một khung khác, xem
   **Chờ thanh toán** và hạn giữ chỗ. Lịch miễn phí trước đó giữ giá đã chốt.
   Chỉ thực hiện giao dịch qua cổng khi môi trường Sandbox sẵn sàng. Có thể
   mở biên lai đã xác minh để giải thích đường đi của giao dịch. Ở bản local
   đã kiểm tra. VNPAY dùng Sandbox; VietQR cần tài khoản nhận và webhook SePay đã xác minh.
3. Kết luận bằng sơ đồ hoặc hồ sơ đã mở. “Một tài nguyên có hồ sơ, lịch,
   trạng thái sử dụng và lịch sử. Cùng một lượt đặt có thể theo dõi từ lúc
   xác nhận đến bàn giao, hoàn trả và kiểm toán. Giám sát lưu nguồn, số đo,
   cảnh báo và liên kết sự cố.”

## Các nhánh khi giảng viên hỏi

| Chủ đề | Thao tác ngắn |
| --- | --- |
| Đăng ký và bảo mật | Mở đăng ký bằng email. Giải thích khách mới nhận CUSTOMER. Google và OTP phụ thuộc cấu hình. Cho thấy tài khoản khách chỉ đọc được dữ liệu của mình. |
| Điều phối lịch | LAB_STAFF chọn một lịch còn hợp lệ, mở đổi lịch, chỉ kiểm tra khung trống và lý do. Chủ lịch nhận cập nhật khi thay đổi được lưu. |
| Kho vật tư | LAB_STAFF mở sổ nhập/xuất của vật tư và xem số dư. ADMIN có quyền điều chỉnh kiểm kê có lý do. Trình bày kho như phần hỗ trợ vận hành. |
| Hỗ trợ trực tuyến | CUSTOMER gửi yêu cầu trong **Hỗ trợ trực tuyến**. LAB_STAFF vào ca, nhận và trả lời. Lịch sử giữ nội dung và người xử lý. |
| Chatbot tra cứu | CUSTOMER bấm mascot, gõ **“Xem lịch đặt của tôi”** và bấm gửi. Câu này đã chạy trên Chrome với API local và trả lời bằng công cụ tra cứu lịch của tài khoản. Trình bày đây là chế độ tra cứu nội bộ của chatbot. |
| Giải thích bằng AI | Mở trợ lý phân tích trong hồ sơ nguồn để xem bằng chứng. Bản local đã kiểm tra trả dữ liệu và trạng thái mô hình chưa cấu hình. Quy tắc cảnh báo và quyền nghiệp vụ được áp dụng tại backend. |
| Phạm vi quản trị | ADMIN phân công LAB, đổi vai trò, cấu hình giá và chính sách, quản lý nguồn và ngưỡng giám sát, xem nhật ký toàn hệ thống. LAB_STAFF có quyền vận hành theo LAB và hỗ trợ quản lý tài khoản CUSTOMER. |

[Đặc tả nghiệp vụ](srs.md#4-functional-requirements) ·
[Sơ đồ cơ sở dữ liệu](DB-erd/core-erd.md) · [Kết quả kiểm chứng](CURRENT_STATE.md)
