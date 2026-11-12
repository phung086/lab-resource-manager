# Chuẩn bị và kết nối trợ lý AI LAB

Ngày 05/10/2026. Phần chuẩn bị đã triển khai trên local, chưa thêm API key, chưa
push Git và không mở Batch mới. Báo cáo kiểm thử (historical run output; retired)
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

Trong phiên demo đang chạy, mở [ứng dụng local](http://localhost:5173/), đăng
nhập rồi mở Trợ lý LAB. Có thể thử:

1. “Bạn là ai?” → giới thiệu khả năng, không trả thống kê không liên quan.
2. “Tìm thiết bị” → dữ liệu tài nguyên được phép xem.
3. “Cho tôi xem cái thứ hai” → đọc lại lựa chọn tương ứng, tối đa năm lựa chọn.
4. “Tìm lịch trống trong 60 phút” → tối đa năm khung giờ để cân nhắc.
5. “Lấy khung thứ hai” → kiểm tra lại đúng khung giờ trước, không dùng lịch cũ
   làm bằng chứng còn trống.
6. “Hướng dẫn thanh toán” → trạng thái cấu hình thực tế; đọc cấu hình thanh toán của runtime đang dùng.

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
VITE_API_BASE_URL=http://localhost:8000/api
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

## 8. Kết nối tài khoản ChatGPT qua plugin

15/10/2026, ADR-040: kết nối này hiện dùng cho cả ba role. Các tra cứu LAB được
hỗ trợ đọc trực tiếp database, không cần API key và không chờ Work. Staff/admin
thấy gợi ý lịch hôm nay, tồn kho, báo cáo7 ngày và tìm CUSTOMER. Quyền đọc theo
role/assignment hiện tại, không theo ADMIN cấp OAuth. Khi subscription tạm tắt,
lookup local vẫn hoạt động. Câu hỏi mở/phức tạp qua Work vẫn có độ trễ host.
API lưu provenance; dock không còn mục Thông tin phản hồi/About từ ADR-039.

Đọc ADR-036 và AI_ASSISTANT_MCP trước khi bật. Dùng migration forward
`20261013000300_chatgpt_account_bridge` qua `db:migrate`, rồi `db:generate`.
Không chạy migration trên DB nghiệp vụ trong bước review. Cấu hình backend:

```dotenv
CHATGPT_BRIDGE_ENABLED=true
CHATGPT_BRIDGE_PUBLIC_ORIGIN=https://your-approved-backend-domain
CHATGPT_BRIDGE_UI_ORIGIN=https://your-approved-frontend-domain
CHATGPT_BRIDGE_SECRET_KEY=
CHATGPT_BRIDGE_REDIRECT_URIS=https://chatgpt.com/connector_platform_oauth_redirect
```

Các domain trên là chỗ cần thay bằng domain triển khai. SECRET_KEY phải là 32 byte
ngẫu nhiên mã hóa base64, lưu trong secret manager/env backend, giữ nguyên qua
restart. Không dùng key VNPAY/JWT. UI phát triển có thể là loopback HTTP; production
phải HTTPS. Chỉ thêm callback `/connector/oauth/<id>` sau khi xác minh đúng URL
trong ChatGPT, không wildcard. Frontend cần `VITE_ENABLE_AI_ASSISTANT=true`.

Nếu Connect trả `invalid_request`, kiểm tra log `chatgpt_oauth_rejected` theo mã/
trường lỗi; không gửi URL OAuth đầy đủ hoặc token vào log/chat. Authorize/token
bỏ tham số mở rộng chưa hỗ trợ theo RFC6749, còn client/callback/S256/resource/
scope vẫn phải hợp lệ. Sau sửa backend, restart đúng runtime rồi Connect lại để
tạo ticket mới; không mở lại ticket cũ đã hết hạn.

1. Kiểm tra protected-resource/authorization-server discovery và endpoint OAuth
   bằng client MCP; anonymous POST `/mcp/support-bridge` phải 401.
2. Tạo/cài plugin từ gói đã build hoặc Add custom MCP server, OAuth DCR, cả ba
   scope `lab.assistant.read`, `lab.assistant.reply`, `lab.assistant.events`.
3. ADMIN đăng nhập LAB, xem và tự xác nhận quyền tại `/workspace/chatgpt-bridge`.
   Quyền chỉ phục vụ câu hỏi khách; thu hồi ngay tại màn này khi cần.
4. Mở một Work/Cloud chat hỗ trợ, dùng skill customer-support để subscribe
   `lab.assistant.question.created` và tự refresh trước TTL. Có token nhưng chưa
   subscribe thì website chưa thể gửi câu hỏi. Không bật nhiều consumer cạnh tranh.
5. Dùng CUSTOMER kiểm thử: hỏi lịch/giá, follow-up, payment pending, yêu cầu ngoài
   phạm vi, hủy trong lúc chờ và chuyển staff. Kiểm tra reply ở DB/UI, không coi
   webhook 2xx hoặc protocol fixture là bằng chứng GPT đã trả lời thật.
   Chạy bộ 21 tình huống chatgptBridgeEvaluation.json: gồm câu hỏi ngoài LAB,
   dữ kiện cần search, injection và đề xuất đặt lịch/hỗ trợ. Kiểm chứng mở form,
   sửa/đóng draft không ghi nghiệp vụ, gửi xác nhận mới tạo booking/support; thử
   lại khi giá/lịch thay đổi và khi đề xuất quá 5 phút. Không kết luận chất lượng
   model từ pass unit/integration hoặc lời trả lời do fixture sinh ra.

Đổi tài khoản: cài/connect trên ChatGPT mới, ADMIN cho phép grant mới, chạy Work
chat và subscribe lại. Kết nối cũ bị thu hồi. Với domain backend ổn định không cần
đổi source; đổi domain thì phải cập nhật endpoint của kết nối và OAuth audience.
Plugin private của tài khoản cũ không tự xuất hiện trên tài khoản mới. Dùng gói
portable từ `chatgpt-bridge:package` để import lại hoặc đăng ký cùng endpoint
MCP trên tài khoản mới; giữ skill customer-support và context version hiện tại.
Gói portable 0.1.4 chỉ chứa endpoint/skill, không chứa app ID hay credential của
tài khoản. Với Work Cloud, đăng ký custom MCP app trên tài khoản đích trước;
gói app có `.app.json` phải trỏ đúng registered app của tài khoản đó. Có thể build
gói Cloud bằng `CHATGPT_BRIDGE_REGISTERED_APP_ID=asdk_app_<registered-id>` cùng
`CHATGPT_BRIDGE_PUBLIC_ORIGIN`; script tạo thư mục `lab-support-bridge-chatgpt`
trong logs và vẫn kiểm tra discovery/401. Biến này chỉ dùng khi build, không
phải cấu hình runtime hay ID dùng chung cho mọi tài khoản. Khi cập nhật app đã
export, giữ metadata/OAuth/app mapping gốc, chỉ thêm skill/version cần thiết.
Tài khoản ChatGPT phải còn quyền/hạn mức Work Cloud. ADMIN UI báo Đã cấp quyền
khi OAuth xong, Sẵn sàng nhận câu hỏi chỉ khi có subscription còn hiệu lực.
Tunnel thử tạm thời không có cam kết uptime và không thay thế domain production.

Môi trường review có guard `@bridge.test`, đúng DB test và loopback; script
`startChatgptBridgeReview.mjs` không đọc `.env` thật hoặc khởi động scheduler mail/
thanh toán/vận hành. Không dùng script review để triển khai production.
Có thể bật riêng `CHATGPT_BRIDGE_REVIEW_PRICING_ENABLED=true` để thử quote và
pending charge trên DB review; mặc định tắt. VNPAY/SMTP và scheduler vẫn tắt,
không có thanh toán provider hoặc mail thật. Không dùng fixture làm dữ liệu
nghiệp vụ hay tạo lịch sử/audit giả để minh chứng vận hành.

### 8.1. Một plugin chuẩn trên ngrok — local ngày 14/10/2026

Plugin đang dùng: [LAB Support](https://chatgpt.com/plugins/plugin_asdk_app_6acf13e36eec81918a51082417a0e8b7),
Cloud skill 1.0.1; portable source 0.1.4. Chỉ một bộ nhận `Tiếp nhận hỗ trợ LAB`
đang bật. Các bản LAB trùng đã gỡ cài đặt, bộ nhận cũ tạm dừng; không xóa lịch sử
hoặc định nghĩa plugin cũ. Bản đã tích hợp dùng backend8000/UI5173 và database
local chính. ReviewAPI8001/UI5174 và gateway8002/8003 đã dừng.

Ngrok dùng dev domain gắn tài khoản:
`https://projector-blaspheme-angelfish.ngrok-free.dev`. Máy và terminal phải chạy;
không có SLA production. Khởi động bản tích hợp từ checkout chính:

```powershell
Set-Location C:/Projects/lab-resource-manager/frontend
npm.cmd run dev:demo
```

Lệnh build/bật backend Docker có migration, giữ dữ liệu và mở UI5173 với payment,
assistant và monitoring. Khi backend8000 trả health, terminal ngrok riêng:

```powershell
ngrok http http://127.0.0.1:8000 --url=https://projector-blaspheme-angelfish.ngrok-free.dev
```

Không mở hai ngrok cùng domain. Giữ `CHATGPT_BRIDGE_PUBLIC_ORIGIN` đúng domain
này, `CHATGPT_BRIDGE_UI_ORIGIN=http://localhost:5173` trong backend/.env và giữ
nguyên secret key qua restart. OAuth/MCP, API khách và IPN cùng backend8000,
cùng database; không dùng script review/gateway cho demo tích hợp. IPN giữ nguyên
URL/path VNPAY đã cấu hình. Kiểm health/discovery qua domain và anonymous MCP401.
ERR_NGROK_334 nghĩa là đã có tunnel cùng URL: kiểm target tại4040, không bật pooling.
Khi chuyển từ review sang DB chính, chỉ giữ public client registration để ChatGPT
không mất app; không sao chép grant/token/khách/history. ADMIN cấp lại quyền và
pause/resume đúng bộ nhận hiện có để host đăng ký subscription theo grant mới.

Đổi tài khoản ChatGPT mà không sửa code LAB:

1. Trên tài khoản mới, Plugins → Add custom MCP server → cùng URL ngrok
   `/mcp/support-bridge`, OAuth DCR và đúng ba scope đã nêu ở trên.
2. ADMIN LAB cấp quyền cho kết nối mới. Grant/token/subscription cũ bị thu hồi.
3. Giữ skill và reference từ gói nguồn portable. Gói Cloud của tài khoản cũ có
   `.app.json` gắn registered app ID cũ; không import ID đó như app của tài khoản
   mới. Export source app mới, giữ metadata/mapping gốc, thêm skill; hoặc build
   với `CHATGPT_BRIDGE_REGISTERED_APP_ID` mới như hướng dẫn trên.
4. Một Work/Cloud chat đăng ký event `lab.assistant.question.created` qua skill,
   host cấp callback/secret/renew. Chỉ làm một lần cho kết nối mới. Sau đó khách
   hỏi trên LAB → event → GPT đọc context/data → publish về LAB tự động, không
   bấm gửi ở GPT cho từng khách. Installation không tự cấp OAuth hoặc consumer.
5. Test một câu nghiệp vụ và một câu ngoài LAB; đối chiếu reply/queue và thu hồi
   các plugin/consumer LAB cũ, giữ đúng một plugin vận hành.

Prompt bộ nhận: chỉ đọc context mới và dữ liệu cần thiết, trả lời ngắn, kết thúc
khi publish trả ANSWERED. Không gọi thêm tool đọc lại trạng thái hoặc polling.
Tùy chọn batching/debounce không được host cung cấp trong lượt này. Trước ngrok,
câu ngắn sau tối ưu mất43,2giây; ba lượt ngrok mất33,6giây (quy tắc đặt lịch),
48,5giây (owned booking) và105,9giây (toán). Đều có reply thật đúng nội dung,
nhưng chưa đạt mục tiêu vài giây. Cần OpenAI API/streaming được cấu hình riêng nếu yêu cầu độ trễ chat
tức thời có kiểm soát; không dùng cookie/token ChatGPT hay tự động hóa web để
giả một API. Quota/outage phải báo thật, khách vẫn có nút chuyển staff.
