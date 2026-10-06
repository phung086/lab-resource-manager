# Chuẩn bị và kết nối trợ lý AI LAB

Ngày 05/10/2026. Phần chuẩn bị đã triển khai trên local, chưa thêm API key, chưa
push Git và không mở Batch mới. [Báo cáo kiểm thử](../artifacts/assistant-api-preparation-20261005/REPORT.md)
ghi rõ phần đã xác minh. [Hợp đồng kỹ thuật](AI_ASSISTANT_MCP.md) mô tả API và MCP.

## 1. Những gì đã sẵn sàng

- Trợ lý ở góc dưới phải, dùng chung VI/EN và ngữ cảnh workspace.
- Hội thoại nối tiếp bằng ID do server cấp, tối đa 10 lượt. Có nút mở cuộc trò
  chuyện mới; giữ bản nháp khi hết hạn hoặc gặp lỗi.
- Backend có bộ định tuyến AI cho hội thoại thông thường, làm rõ yêu cầu,
  hướng dẫn thanh toán và tra cứu LAB.
- Tra cứu chạy bằng MCP thật, với quyền của tài khoản đang đăng nhập. Kết quả
  cũ được kiểm tra lại trước khi dùng cho lượt tiếp theo.
- Đặt lịch mở form hiện có để người dùng kiểm tra và gửi. Hệ thống tiếp tục
  kiểm tra quyền, lịch trùng, chính sách và đào tạo an toàn ở backend.
- Có kiểm tra cấu hình, timeout, hủy yêu cầu, giới hạn lượt và phục hồi khi
  mô hình lỗi. Không có key thì tiếp tục tra cứu local theo các mẫu hỗ trợ.

Sau khi thêm key **và chọn model phù hợp**, AI có thể trả lời tự nhiên theo
ngữ cảnh và trò chuyện ngoài lề. Chất lượng diễn đạt, phân tích ngày giờ và khả
năng làm theo yêu cầu vẫn cần kiểm thử với model thật. Hiện chưa có tìm kiếm
Internet, thanh toán tự động, gửi email, duyệt lịch hay thay đổi dữ liệu bằng AI.

## 2. Kiểm tra hiện tại, chưa cần key

Từ `C:\Projects\lab-resource-manager`:

```powershell
npm --prefix backend run assistant:check
```

Nếu terminal kế thừa `LOG_FORMAT=json`, cấu hình hiện tại sẽ từ chối giá trị
này. Trong phiên PowerShell local, đặt `$env:LOG_FORMAT='dev'` rồi chạy lại;
production dùng giá trị hợp lệ như `combined`. Không cần sửa DB hay bí mật.

Lệnh chỉ đọc cấu hình, in trạng thái và tên tool; không gọi nhà cung cấp, không
truy vấn DB và không in bí mật. `MISSING_KEY`/`MISSING_MODEL` là trạng thái dự
kiến trước khi kết nối. `CONFIGURED_UNVERIFIED` chỉ nói đã có hai giá trị cấu hình.

Trong phiên demo đang chạy, mở [ứng dụng local](http://127.0.0.1:15181/), đăng
nhập rồi mở Trợ lý LAB. Có thể thử:

1. “Bạn là ai?” → giới thiệu khả năng, không trả thống kê không liên quan.
2. “Tìm thiết bị” → dữ liệu tài nguyên được phép xem.
3. “Cho tôi xem cái thứ hai” → đọc lại lựa chọn tương ứng, tối đa năm lựa chọn.
4. “Tìm lịch trống trong 60 phút” → tối đa năm khung giờ để cân nhắc.
5. “Lấy khung thứ hai” → kiểm tra lại đúng khung giờ trước, không dùng lịch cũ
   làm bằng chứng còn trống.
6. “Hướng dẫn thanh toán” → trạng thái cấu hình thực tế; demo hiện tắt thanh toán.

Với ngày cụ thể, điền cả hai mốc trong “Chọn phòng, thiết bị và thời gian”. Khi
chưa có AI, câu như “ngày mai lúc 9 giờ” cần các trường này; local planner chưa
tự phân tích đầy đủ ngày giờ trong văn bản. Staff demo chưa được phân công LAB
có thể nhận danh sách rỗng đúng phạm vi. Không nới quyền để làm demo đẹp hơn.

Launcher demo hiện bật trợ lý riêng qua biến môi trường. Vì vậy preflight đọc
`backend/.env` có thể báo `assistantEnabled:false` trong khi phiên demo đang bật.
Nếu vừa restart demo và gặp phiên đăng nhập không hợp lệ, đăng nhập lại vì
launcher tạo JWT secret mới cho mỗi lần chạy.

## 3. Vị trí cấu hình đúng

| Cách chạy | Cấu hình backend | Cấu hình frontend |
|---|---|---|
| Node/Vite trực tiếp | `backend/.env` hoặc biến môi trường của tiến trình | `frontend/.env.local` hoặc biến môi trường Vite |
| Docker Compose dev | `.env` ở thư mục gốc, được Compose truyền vào container | Các biến Vite của service frontend |
| Compose production | Bí mật server hoặc `.env.production` qua `--env-file` | Build args từ file Compose; cần build lại khi đổi flag Vite |

Không chép file mẫu đè lên `.env` đang dùng. Giữ nguyên DB, JWT và cấu hình hiện
có. Biến môi trường tiến trình có thể ưu tiên hơn giá trị trong file. Mỗi cách
chạy phải kiểm tra đúng môi trường, tránh vô tình chạy hai API trên hai DB khác nhau.

Các giá trị chuẩn bị của backend:

```env
MCP_ASSISTANT_ENABLED=true
ASSISTANT_CONVERSATION_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=
ASSISTANT_MAX_CONCURRENT=4
ASSISTANT_TIMEOUT_MS=30000
ASSISTANT_TOOL_TIMEOUT_MS=10000
ASSISTANT_RATE_LIMIT_PER_MINUTE=6
ASSISTANT_MODEL_FAILURE_THRESHOLD=3
ASSISTANT_MODEL_COOLDOWN_MS=30000
```

Frontend chỉ cần flag và URL của API đang dùng, ví dụ phiên local hiện tại:

```env
VITE_ENABLE_AI_ASSISTANT=true
VITE_API_BASE_URL=http://127.0.0.1:15005/api
```

Giữ key ở backend; không tạo biến `VITE_OPENAI_API_KEY`, không đưa key vào code,
Git, localStorage hoặc nội dung chat. Không cần cài MCP desktop, mở port mới ra
Internet, thay schema, chạy migration hay seed DB để thêm key. SDK đã có sẵn.

## 4. Khi sẵn sàng thêm key

1. Tạo key cho project API của bạn, có khả năng gọi Responses API và hạn mức phù
   hợp. Cấu hình ngân sách/cảnh báo tại tài khoản nhà cung cấp.
2. Chọn model mà tài khoản được phép dùng, hỗ trợ Responses API và Structured
   Outputs dạng JSON schema strict. Điền ID model thật vào `OPENAI_MODEL`.
   Không dùng một ID mẫu chưa được xác nhận.
3. Điền `OPENAI_API_KEY` ở môi trường backend tương ứng. Frontend không nhận key.
4. Restart đúng API hiện có. Với launcher local đang dùng, khởi động lại launcher
   sau khi cập nhật `backend/.env`; giữ DB demo hiện tại. Không chạy seed/reset.
   Nếu chạy Node riêng, restart tiến trình `npm --prefix backend run dev` hiện có.
5. Nếu mới bật flag frontend, restart Vite; production cần build lại frontend.
   Đổi key/model backend đơn thuần không đòi build lại frontend.
6. Chạy lại preflight. Nó cần báo có key và model; sau đó thực hiện kiểm thử thật
   bên dưới để xác minh kết nối. Không xem việc có key là bằng chứng đã hoạt động.

Với Compose production đã cấu hình đầy đủ, có thể kiểm tra mà không in toàn bộ
môi trường/bí mật:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run assistant:check
```

Các lệnh trên giả định container đã chạy; không tự triển khai hay bật provider.
Hướng dẫn triển khai tổng thể vẫn nằm ở [DEPLOYMENT](DEPLOYMENT.md).

## 5. Kiểm thử sau khi có model thật

Thử ít câu mỗi lượt vì mặc định giới hạn sáu yêu cầu chat/mở hội thoại mới mỗi
phút cho một tài khoản. Với câu LAB, có thể có một lần AI lập kế hoạch và một
lần AI diễn đạt kết quả; hội thoại ngoài lề thường chỉ có một lần lập kế hoạch.

| Thử | Kết quả cần đạt |
|---|---|
| “Bạn là ai?” | Giới thiệu thân thiện, đúng khả năng đang hỗ trợ |
| “Tôi hơi mệt vì làm đồ án” rồi “Nên làm gì trước?” | Hiểu câu sau liên quan câu trước, không trả thống kê LAB |
| Đổi VI/EN giữa hội thoại | Câu trả lời mới theo ngôn ngữ đã chọn; câu hỏi gốc được giữ |
| Tìm thiết bị rồi “cái thứ hai” | Đọc lại đúng tài nguyên trong quyền hiện tại |
| “Ngày mai phòng nào trống từ 9 đến 11?” | Hiểu theo giờ Việt Nam hoặc hỏi lại nếu thiếu/không rõ |
| Chọn lịch được gợi ý | Mở form chuẩn, chưa tạo booking; thời gian/tài nguyên phải đúng |
| Staff mất phân công LAB | Không dùng tên/kết quả cũ làm bằng chứng; đề nghị chọn lại |
| “Thanh toán giúp tôi” | Hướng dẫn trạng thái thực tế, chưa thực hiện giao dịch |
| Câu hỏi thời sự bên ngoài LAB | Nói rõ hạn chế cập nhật; không bịa nguồn/link tra cứu |
| Key/model sai, hết hạn mức hoặc timeout | Lỗi có phục hồi local, không báo AI đã trả lời thành công |

Trong “Thông tin phản hồi” có nguồn phản hồi và các tra cứu thực tế. Hội thoại
AI thông thường phải được phân biệt với dữ liệu LAB đã kiểm tra. Chất lượng
ngôn ngữ chỉ được chấp nhận sau khi xem các câu trả lời thật này.

## 6. Xử lý các trạng thái thường gặp

| Trạng thái | Việc cần kiểm tra |
|---|---|
| Không thấy nút trợ lý | Flag frontend; phiên đã đăng nhập; build/Vite đã nhận flag chưa |
| API trợ lý 404 | API đang chạy có `MCP_ASSISTANT_ENABLED=true` và đúng URL chưa |
| `MISSING_KEY` / `MISSING_MODEL` | Còn thiếu giá trị backend; kiểm tra đúng tiến trình/file |
| `MODEL_UNAVAILABLE` | Key, quyền model, hạn mức, mạng outbound HTTPS và phản hồi provider; không in key ra log |
| `CIRCUIT_OPEN` | Chờ cooldown mặc định 30 giây rồi thử một câu; giải quyết lỗi provider trước |
| `INPUT_TOO_LARGE` | Mở hội thoại mới hoặc hỏi phạm vi ngắn hơn; không tăng vô hạn ngân sách |
| `ASSISTANT_RATE_LIMITED` | Chờ thời gian retry trong phản hồi; không retry liên tục |
| `ASSISTANT_CONVERSATION_EXPIRED` | Mở cuộc trò chuyện mới; bản nháp được giữ |
| `MCP_UNAVAILABLE` / timeout | Kiểm tra API/MCP local, DB và deadline; không báo lịch còn trống khi chưa đọc được |
| Staff không thấy tài nguyên | Kiểm tra phân công LAB hiện tại bằng luồng admin chuẩn |

## 7. Dữ liệu và giới hạn còn lại

Server giữ tạm tối đa 10 lượt và 12 KB lịch sử, 30 phút không sử dụng, 200 hội
thoại mỗi tiến trình. Hội thoại mới/đăng xuất xóa ngữ cảnh tương ứng. Tải lại
trang mở hội thoại mới; ngữ cảnh server cũ hết hạn sau đó. Restart API xóa bộ
nhớ; chưa có đồng bộ nhiều replica hoặc lịch sử chat lưu lâu dài.

Khi bật model, câu hỏi, lịch sử hội thoại đã giới hạn, role, ngữ cảnh lựa chọn
và kết quả LAB được phép tra cứu có thể được gửi tới provider. Không gửi JWT
của người dùng tới OpenAI. Tool prose của lượt cũ không được đưa vào lịch sử;
câu hỏi gốc do người dùng viết vẫn được giữ. `store:false` đã đặt trên Responses,
nhưng chính sách lưu giữ của provider cần đánh giá riêng trước production.

Giữ giới hạn và xác nhận ở form hiện có. Cần thiết kế riêng nếu sau này muốn AI
thật sự tạo/đổi/hủy lịch, trả tiền, gửi mail hoặc tổ chức vận chuyển. Phần chuẩn
bị này không cấp các quyền đó. Không có cam kết AI luôn đúng; dữ liệu và nghiệp
vụ cuối cùng vẫn do backend xác minh.

Tham khảo chính thức: [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state),
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Tool calling](https://developers.openai.com/api/docs/guides/function-calling).
