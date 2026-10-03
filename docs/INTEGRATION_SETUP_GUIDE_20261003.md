# Hướng dẫn cấu hình thanh toán, media, email và vận chuyển

Ngày đối chiếu: 03/10/2026. Code: PR #22, commit `66e744473c940515548048d448019beb3d311e9b`.

Đây là hướng dẫn cấu hình và phát triển các phần còn thiếu. Chưa nhập credential, tạo tài khoản nhà cung cấp, bật tích hợp hoặc thực hiện giao dịch/gửi email thực trong đợt viết hướng dẫn.

## 1. Phần nào cấu hình được ngay?

| Phần | Code hiện tại | Sau khi cấu hình |
| --- | --- | --- |
| VNPAY | Tạo checkout, nhận IPN có chữ ký, return hiển thị, đối soát ngoại lệ | Có thể thử merchant sandbox; cần HTTPS công khai cho IPN |
| VietQR | Tạo QR, chưa có xác nhận chuyển tiền tự động | Không tự đánh dấu đã trả tiền sau khi quét/chuyển khoản |
| Ảnh/video | S3-compatible upload, HEAD xác minh metadata, gallery, xóa | Có thể nối R2/S3 và kiểm PUT/HEAD/GET/DELETE thực |
| Email OTP khách | Nodemailer SMTP và fail-closed khi gửi lỗi | Có thể gửi OTP thật sau khi SMTP/sender hoạt động |
| Email duyệt lịch/nhắc lịch/sự cố | Có hàm/template email nhưng không có caller nghiệp vụ đang hoạt động | Cần nối sự kiện, worker/outbox, retry và template VI/EN |
| Vận chuyển | Có `ShipmentOrder`/`ShipmentStatus` trong Prisma; không có API/adapter hiện hành | Cần phát triển workflow, quyền, xác nhận bàn giao và callback |

`Notification.sentAt` hiện là thời điểm thông báo được phát hành trong ứng dụng. Nó không phải chứng cứ SMTP đã gửi hoặc người dùng đã nhận email. Demo launcher tắt reminder scheduler. Thêm SMTP không làm hai điều này thay đổi.

## 2. Bộ dịch vụ và thông tin cần chuẩn bị

Đề xuất cho lần tích hợp đầu: VNPAY sandbox + Cloudflare R2 + Brevo SMTP. Nếu chỉ thử email và chưa có domain, có thể dùng Gmail App Password khi tài khoản cho phép. Vận chuyển cần xác định điều chuyển nội bộ hay giao ngoài; hướng dẫn bên dưới bao gồm cả hai.

| Dịch vụ | Thông tin cần lấy | Nơi lưu |
| --- | --- | --- |
| VNPAY sandbox | Merchant/TmnCode, HashSecret, thông tin test, URL IPN được đăng ký | Backend env |
| R2 | Account ID/endpoint, bucket, Access Key ID, Secret Access Key, public media URL | Backend env |
| Brevo | SMTP login, SMTP key, sender đã xác minh, domain đã xác thực | Backend env |
| GHN nếu giao ngoài | Token, Shop ID/kho lấy hàng, tài khoản staging, webhook config | Secret của backend khi adapter được triển khai |
| Staging | Domain HTTPS cho ứng dụng/API; domain media riêng nếu dùng production | DNS/reverse proxy |

Không gửi key/mật khẩu trong chat và không đặt trong biến `VITE_*`: biến Vite có thể xuất hiện trong JavaScript được tải xuống trình duyệt. Có thể cho agent biết tên dịch vụ, domain và tên file env đã điền, không cần cung cấp giá trị secret qua tin nhắn.

Các domain `.example` và giá trị `THAY_...` ở đây là chỗ điền, không phải credential hoặc địa chỉ dùng được. Không ghi đè DATABASE_URL/JWT_SECRET hiện có khi bổ sung tích hợp.

## 3. Chọn đúng file env và cách khởi động

### Local đang xem trên máy này

- UI: `http://127.0.0.1:15181`.
- API: `http://127.0.0.1:15005`.
- Khi chạy từ thư mục `backend`, cấu hình được đọc từ `backend/.env`.
- Nếu chạy frontend riêng từ thư mục `frontend`, cấu hình Vite đọc từ `frontend/.env` hoặc môi trường tiến trình.
- Khi dùng `startLocalDemo.mjs`, launcher chuyển biến môi trường sang cả hai tiến trình. Vì vậy đặt flag Vite cho phiên demo trong `backend/.env` cũng có hiệu lực.

Thêm/cập nhật hai giá trị để launcher tiếp tục dùng cổng của phiên hiện tại:

```dotenv
LOCAL_DEMO_API_PORT=15005
LOCAL_DEMO_UI_PORT=15181
```

Sau khi nhập cấu hình, dừng đúng phiên demo cũ trước khi chạy lại. Không chạy hai phiên cùng cổng và không dùng lệnh tắt toàn bộ Node trên máy. Với Node 22 đang có:

```powershell
Set-Location C:\Projects\lab-resource-manager\backend
node --env-file=.env scripts/startLocalDemo.mjs
```

Launcher yêu cầu DB demo có tên `lab_resources_local_demo` và chạy migration/seed được bảo vệ trước khi mở server. Không sửa DB sang môi trường thật để dùng launcher này. Các biến đã có trong shell có thể ưu tiên hơn file env; dùng terminal mới khi thử cấu hình để tránh flag cũ.

### Docker production/staging

File `.env.production` nằm ở root. Template chính thức nằm ở `.env.production.example`. Backend SMTP/VNPAY/media và build args payment UI đã được map trong `docker-compose.prod.yml`.

Chỉ tạo file mới khi chưa có, rồi điền các giá trị hạ tầng bắt buộc trong `docs/DEPLOYMENT.md`. Trước khi khởi động:

```powershell
Set-Location C:\Projects\lab-resource-manager
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
```

Sau khi hoàn tất cấu hình host, HTTPS và database theo runbook triển khai:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Flag Vite được chốt lúc build; restart container frontend cũ không thay được flag payment. Compose hiện phục vụ HTTP ở APP_PORT, không tự cấp SSL: cần reverse proxy hoặc tunnel ổn định để cung cấp HTTPS. Nginx frontend proxy `/api/` đến backend; có thể dùng một domain cho cả UI/API.

## 4. Email tự động: cấu hình SMTP trước

### 4.1 Brevo với domain của bạn

1. Tạo tài khoản Brevo và hoàn tất điều kiện kích hoạt giao dịch của tài khoản.
2. Trong Settings → Senders, Domains, IPs → Domains, thêm domain gửi mail do bạn kiểm soát.
3. Xác thực domain theo bảng DNS riêng Brevo cung cấp: Brevo code, DKIM và DMARC. Nhập đúng tên/type/value; với CNAME dùng DNS-only nếu DNS provider có chức năng proxy. Không thay bản ghi email hiện có một cách tùy tiện, không tạo hai bản ghi SPF/DMARC cho cùng tên.
4. Chờ trạng thái xác thực thành công; tạo/xác minh sender, ví dụ `no-reply@lab.example` sau khi thay domain thật.
5. Trong SMTP & API → SMTP, lấy **SMTP login** và tạo **SMTP key**. SMTP key khác API key và khác mật khẩu đăng nhập Brevo.
6. Bổ sung vào backend env:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=THAY_BANG_SMTP_LOGIN_TU_DASHBOARD
SMTP_PASS="THAY_BANG_SMTP_KEY"
EMAIL_FROM="LAB Resource Manager <no-reply@lab.example>"
```

Code hiện dùng `secure=false` với 587, chuyển sang TLS khi SMTP hỗ trợ STARTTLS; dùng `secure=true` với 465. Không có biến `SMTP_SECURE` được code đọc. SMTP nhận thư thành công chưa chứng minh thư đã vào inbox; kiểm tra Transactional logs, inbox và spam.

Nguồn: [Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP), [xác thực domain](https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC), [Nodemailer SMTP](https://nodemailer.com/smtp).

### 4.2 Gmail để thử khi chưa có domain

Bật 2-Step Verification trên tài khoản của bạn, tạo App Password nếu tùy chọn này có sẵn. Google có thể không cho tạo với tài khoản trường/tổ chức, Advanced Protection hoặc một số cách thiết lập 2FA. Không dùng mật khẩu đăng nhập Gmail.

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=THAY_BANG_GMAIL_CUA_BAN
SMTP_PASS="THAY_BANG_APP_PASSWORD"
EMAIL_FROM="LAB Resource Manager <THAY_BANG_GMAIL_CUA_BAN>"
```

Nguồn: [Google App Password](https://support.google.com/accounts/answer/185833). Gmail phù hợp thử nghiệm tài khoản cá nhân cho stack SMTP hiện tại; trước khi vận hành trường học cần chọn phương thức gửi và chính sách tài khoản được đơn vị chấp nhận.

### 4.3 Kiểm kết nối mà chưa gửi thư

Từ thư mục backend, sau khi điền `.env`, chạy PowerShell:

```powershell
@'
import nodemailer from 'nodemailer';
for (const name of ['SMTP_HOST','SMTP_USER','SMTP_PASS','EMAIL_FROM']) {
  if (!process.env[name]) throw new Error('Missing ' + name);
}
const port = Number(process.env.SMTP_PORT || 587);
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000
});
try {
  await transport.verify();
  console.log('SMTP connection/auth OK; no email sent.');
} finally { transport.close(); }
'@ | node --env-file=.env --input-type=module
```

`verify()` xác nhận kết nối/xác thực; chưa xác nhận sender được chấp nhận hoặc thư đến inbox.

### 4.4 Kiểm OTP thực

1. Khởi động lại backend với cấu hình mới.
2. Ở landing, mở đặt lịch nhanh cho khách; dùng địa chỉ email thực bạn kiểm soát, yêu cầu OTP.
3. Kiểm inbox/spam và log provider; dùng mã nhận được trên đúng email.
4. Chuyển VI/EN rồi yêu cầu lại sau cooldown để kiểm template theo ngôn ngữ.
5. Trên staging thử sai mật khẩu SMTP; yêu cầu phải báo lỗi gửi, không trả thành công giả.

Endpoint hiện có là `POST /api/guest-booking/otp`, body `{ "email": "email của bạn", "fullName": "tên của bạn" }`, response dự kiến 202. 202 chỉ là SMTP đã chấp nhận gửi theo luồng, vẫn cần bằng chứng nhận thư. Các tài khoản demo `@lrm.local` không phải hộp thư thực.

### 4.5 Để duyệt lịch/nhắc trả/sự cố cũng gửi email

Phần này **cần code thêm**. `sendBookingStatusEmail` và `sendIncidentAlertEmail` có sẵn nhưng chưa được gọi trong route/service nghiệp vụ hiện hành. `dispatchDueNotifications` chỉ cập nhật thông báo trong app. Template booking legacy cũng cần sửa để nhận canonical BookingStatus và dùng catalog VI/EN.

Đề xuất triển khai:

1. Giao dịch booking/incidents/maintenance tạo thông báo và yêu cầu gửi email bền vững trong DB cùng transaction.
2. Worker đọc yêu cầu đến hạn, kiểm người nhận/ngôn ngữ/booking còn hợp lệ rồi gửi SMTP.
3. Lưu trạng thái gửi riêng: chờ, provider chấp nhận, lỗi; message ID, số lần thử và thời điểm thử lại. Dedupe theo sự kiện + người nhận + kênh.
4. Retry có giới hạn, không gửi lại mail đã được xác nhận; xử lý timeout không chắc chắn và lỗi lâu dài để staff/admin theo dõi.
5. Trước email nhắc lịch/nhắc trả, kiểm lại booking đã hủy, đã trả hoặc lịch bị đổi để không gửi thông tin cũ.
6. Email OTP vẫn phải có xử lý gửi lỗi rõ; không dùng console/Ethereal làm bằng chứng delivery thực.

Ngưỡng hiện có cho thông báo trong app:

```dotenv
REMINDER_SCHEDULER_ENABLED=true
BOOKING_UPCOMING_REMINDER_MINUTES=60
RETURN_REMINDER_MINUTES=15
```

Demo launcher cố định scheduler=false; muốn chạy lịch tự động cần chạy backend bình thường hoặc staging, hoặc phát triển cấu hình launcher rõ ràng. Các biến trên chưa biến thông báo trong app thành email.

## 5. Lưu ảnh/video với Cloudflare R2

### 5.1 Tạo bucket và key

1. Mở Cloudflare → Storage & databases → R2 → Create bucket. Đặt tên riêng cho staging, ví dụ `lab-resource-media-staging`.
2. Manage API Tokens → Create Account/User API token → chọn **Object Read & Write**, scope đúng bucket này.
3. Lưu Access Key ID, Secret Access Key và S3 endpoint chính xác từ dashboard. Key cần đủ quyền PUT, HEAD và DELETE mà ứng dụng đang dùng. Không dùng Cloudflare global API key thay cho cặp S3 key.
4. Backend đã có AWS SDK; không cần cài framework hoặc đổi nơi lưu binary sang PostgreSQL.

Nguồn: [Cloudflare R2 S3](https://developers.cloudflare.com/r2/get-started/s3/).

### 5.2 Tạo URL để trình duyệt xem media

Code hiện lưu URL công khai vào `ResourceMedia.url`, chưa sinh signed GET riêng cho người xem.

- Demo: bucket → Settings → Public Development URL → Enable, lấy URL `https://pub-....r2.dev`.
- Vận hành thực: Settings → Custom Domains → Add, gắn `media.lab.example` sau khi thay domain thật, chờ Active; domain phải được cấu hình trong tài khoản Cloudflare phù hợp.
- `r2.dev` dành cho phát triển, có giới hạn; không tự CNAME đến r2.dev để thay cho custom domain.

Bucket này dành cho ảnh/video công khai của tài nguyên. Chứng từ cá nhân, ảnh học sinh, hồ sơ sự cố hoặc biên bản riêng tư cần bucket/private access riêng và luồng signed GET có RBAC; không đưa chúng vào bucket gallery công khai. CORS không làm dữ liệu công khai trở thành riêng tư.

Nguồn: [public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).

### 5.3 Điền backend env

```dotenv
MEDIA_S3_ENDPOINT=https://THAY_ACCOUNT_ID.r2.cloudflarestorage.com
MEDIA_S3_BUCKET=lab-resource-media-staging
MEDIA_S3_REGION=auto
MEDIA_S3_ACCESS_KEY_ID="THAY_ACCESS_KEY_ID"
MEDIA_S3_SECRET_ACCESS_KEY="THAY_SECRET_ACCESS_KEY"
MEDIA_PUBLIC_BASE_URL=https://THAY_PUBLIC_MEDIA_DOMAIN
MEDIA_EXTERNAL_HOSTS=upload.wikimedia.org,commons.wikimedia.org
```

S3 endpoint dùng ký upload và thao tác server. PUBLIC_BASE_URL dùng tải media trên browser. Chúng là hai URL khác nhau; endpoint S3 không phải URL public. Lấy endpoint thực từ dashboard, kể cả trường hợp dùng jurisdiction endpoint riêng. PUBLIC_BASE_URL không có `/resources`, query, hash hoặc tên file; backend tự thêm đường dẫn object. Allowlist EXTERNAL_HOSTS chỉ áp dụng cách thêm link bên ngoài, không phải quyền truy cập bucket.

### 5.4 CORS cho bucket

Bucket → Settings → CORS Policy → Add → JSON. Thay origin staging bằng URL UI thực hoặc bỏ origin đó nếu chỉ thử local:

```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:15181",
      "http://localhost:15181",
      "https://lab-staging.example"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Origin là scheme + host + port, không có đường dẫn hay dấu `/` cuối. `127.0.0.1` khác `localhost`. Browser cần PUT để upload; DELETE được backend thực hiện nên không cần mở DELETE cho browser. Presigned PUT vẫn cần CORS. `AllowedHeaders=*` không cấp quyền ghi; quyền ghi phụ thuộc chữ ký có thời hạn.

Nguồn: [CORS R2](https://developers.cloudflare.com/r2/buckets/cors/), [presigned URL](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

### 5.5 Kiểm qua UI và API

1. Restart backend, đăng nhập ADMIN hoặc staff được phân công lab.
2. Vào quản lý tài nguyên, mở mục Ảnh/video tài nguyên; chọn đúng phòng/thiết bị.
3. Chọn upload, ảnh JPEG/PNG/WebP tối đa 10 MiB hoặc video MP4/WebM tối đa 100 MiB; nhập tiêu đề và mô tả truy cập.
4. Thử ảnh thật nhỏ trước, rồi video ngắn; không đổi tên đuôi file để giả MIME. Kho này lưu file, chưa có transcoding/streaming thích ứng nên codec vẫn cần tương thích browser.
5. Kiểm bằng DevTools Network và bucket:
   - `POST /api/resources/:id/media/upload` trả ticket key/uploadUrl.
   - `PUT` đến signed S3 URL thành công trong hạn 600 giây.
   - `POST /api/resources/:id/media/complete` trả 201 sau HEAD xác minh Content-Type/Length.
   - Object tồn tại trong bucket; public URL mở được; gallery hiển thị/phát sau reload.
6. Thử xóa trong UI, kiểm metadata đã xóa **và object thực đã mất**. Code hiện gỡ DB trước rồi thử xóa object; lỗi storage cleanup bị catch, vì vậy UI xóa thành công chưa chứng minh object đã mất.
7. Thử staff ngoài lab, student/lecturer, file quá giới hạn và khóa sai; không được lưu trái quyền hoặc báo thành công giả.

`GET /api/resources/:id/media/config` chỉ kiểm đủ tên biến và cho biết missing; uploadConfigured=true không phải health check S3. File PUT thành công nhưng bước complete lỗi có thể để lại object chưa được gắn DB; cần tác vụ cleanup dựa trên DB, không đặt lifecycle xóa toàn bộ ảnh còn đang sử dụng.

## 6. Thanh toán VNPAY sandbox

### 6.1 Đăng ký merchant test

1. Dùng [trang đăng ký sandbox VNPAY](https://sandbox.vnpayment.vn/devreg/) và nhận bộ credential dành cho tài khoản test của bạn.
2. Lấy TmnCode/HashSecret; code hiện yêu cầu TmnCode 8 ký tự chữ/số. Không copy bộ credential ví dụ từ tutorial.
3. Chuẩn bị URL HTTPS công khai để VNPAY gọi IPN. `127.0.0.1` của máy bạn không truy cập được từ server VNPAY.
4. Đăng ký URL IPN với VNPAY qua kênh dashboard/hỗ trợ được cấp cho merchant. Ghi VNPAY_IPN_URL trong env không tự đăng ký endpoint với nhà cung cấp.

Nguồn: [tài liệu VNPAY 2.1.0](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). IPN dùng GET và SSL; return chỉ kiểm checksum/hiển thị, không cập nhật kết quả giao dịch.

### 6.2 Domain ổn định hoặc tunnel local

Ưu tiên staging có domain HTTPS ổn định, proxy `/api/` về backend. Để test local, sau khi cài cloudflared theo hướng dẫn chính thức có thể chạy:

```powershell
cloudflared tunnel --url http://127.0.0.1:15005
```

Lấy URL HTTPS được in ra để điền return/IPN và đăng ký IPN. Quick Tunnel là môi trường test, hostname đổi khi tạo lại; mỗi lần đổi cần cập nhật env, restart và đăng ký lại URL. Không bật email login/Cloudflare Access/challenge tương tác trên endpoint IPN vì callback là server-to-server. Dùng xác minh chữ ký của provider để xác thực callback.

Nguồn: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

### 6.3 Env cần đủ cả backend và UI

```dotenv
PAYMENTS_ENABLED=true
VNPAY_ENABLED=true
VNPAY_TMN_CODE=THAY_MERCHANT_CODE_8_KY_TU
VNPAY_HASH_SECRET="THAY_HASH_SECRET_SANDBOX"
VNPAY_VERSION=2.1.0
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://THAY_PUBLIC_API_HOST/api/payments/vnpay/return
VNPAY_IPN_URL=https://THAY_PUBLIC_API_HOST/api/payments/vnpay/ipn
PAYMENT_APP_URL=http://127.0.0.1:15181
VITE_ENABLE_PAYMENT_FEATURES=true
```

PAYMENT_APP_URL là UI người dùng sẽ quay về. Với staging thay bằng HTTPS UI thật; return/IPN có thể cùng domain UI nếu reverse proxy đã map `/api/`. Không có hash route `#/workspace` trong URL IPN/return gửi cho VNPAY. Code tự tạo link quay về khu vực thanh toán.

Nếu chạy Vite riêng, đặt VITE_ENABLE_PAYMENT_FEATURES=true trong môi trường frontend và restart/build. Với demo launcher, cả PAYMENTS_ENABLED và flag UI phải true; thiếu một trong hai sẽ tắt payment ở phiên demo. Thay các placeholder trước khi chạy; nếu chưa có credential, giữ false.

### 6.4 Tạo giao dịch đúng nghiệp vụ

1. ADMIN đặt bảng giá cho tài nguyên/mục đích; API hiện có `PUT /api/booking-pricing/:resourceId` với `purposeCode`, `label`, `hourlyRateVnd` nguyên không âm.
2. Người đặt chọn thời gian/mục đích và chấp nhận quote. Số tiền được server chốt trong booking; thay bảng giá không tự đổi phí lịch cũ.
3. Nếu phải duyệt, booking ở PENDING_APPROVAL. Staff/admin duyệt đúng scope để thành CONFIRMED.
4. Với phí dương và booking CONFIRMED, code tạo khoản thu theo phí đã chốt; người sở hữu chọn thanh toán VNPAY. Booking miễn phí không cần giao dịch giả và không cần tạo khoản thu thủ công lại.
5. VNPAY nhận số tiền theo đơn vị nhân 100 trong tham số vnp_Amount; code đã làm bước này. Không nhân thêm khi nhập hourlyRateVnd.
6. Thanh toán bằng kênh/test instrument được VNPAY cấp/hỗ trợ cho merchant. Code hiện yêu cầu hosted checkout VNPAYQR; không tự suy ra thẻ test NCB trong tài liệu sẽ đi qua được nhánh QR này. Nếu merchant sandbox không hỗ trợ QR, cần lựa chọn kênh test được provider chấp nhận và điều chỉnh cấu hình/code minh bạch.
7. Chờ IPN hợp lệ; kiểm payment success/paidAt, đúng số tiền, merchant và txnRef. Return có thể đến trước IPN; quay về UI không đồng nghĩa đã thanh toán.
8. Lịch có phí dương phải có payment success khớp phí trước khi checkout; bàn giao vẫn do người có quyền làm và ghi tình trạng thiết bị.

Khoản thuê, tiền cọc, phí vận chuyển và tiền COD là các nghĩa vụ khác nhau. Model phí booking hiện tại chưa biểu diễn đầy đủ cọc/phí giao hai chiều/hoàn tiền; không nhét thêm tiền vào một khoản thu tùy ý vì createCharge hiện bắt khớp booking fee snapshot.

### 6.5 Điều kiện nghiệm thu payment

- Lịch tính phí đúng, chưa duyệt không được thanh toán; staff không vượt scope.
- Return không settle; IPN đúng chữ ký/số tiền mới settle.
- IPN lặp không thu/ghi lịch sử trùng; success không bị callback thất bại muộn ghi đè.
- Session hết hạn được xử lý; retry không tạo nhiều phiên active trái quy tắc.
- Booking đã hủy nhận success muộn vào manual_review, không khôi phục booking.
- Sau kiểm sandbox, lưu bằng chứng provider, txnRef/amount/status; che secret/token, không ghi toàn URL checkout vào tài liệu công khai.

VietQR hiện chỉ hỗ trợ tạo QR, providerAvailability báo confirmation NOT_CONFIGURED; QR không chứng minh chuyển tiền. VNPAY QueryDr/refund chưa tích hợp đầy đủ; thao tác resolve reconciliation nội bộ không hoàn tiền qua ngân hàng. `vnpayMode` hiện còn cố định SANDBOX: trước production cần chỉnh hiển thị theo môi trường, dùng merchant production được cấp và nghiệm thu live riêng. Đổi endpoint trong env một mình không chứng nhận sẵn sàng thu tiền thực.

## 7. Vận chuyển thiết bị: cấu hình nhà cung cấp và phát triển luồng

### 7.1 Trạng thái hiện tại

Prisma có ShipmentOrder và ShipmentStatus (`pending`, `picking`, `delivering`, `delivered`, `cancelled`, `returned`). Code active không có shipment route, service/adapter GHN hay webhook. Thành phần AI/research cũ có hiển thị thông tin vận đơn không chứng minh có giao hàng thực. Không phục hồi mock/research integration để dùng cho vận hành.

Vì chưa có adapter đọc biến GHN, nhập một biến GHN_TOKEN lúc này không bật chức năng. Có thể chuẩn bị tài khoản/provider trước; phần còn lại cần đợt triển khai được xác định rõ, migration forward nếu cần và kiểm RBAC/concurrency.

### 7.2 Điều chuyển giữa các phòng/lab

Không cần gọi hãng giao hàng. Workflow đề xuất:

1. Staff lab nguồn yêu cầu điều chuyển một thiết bị có định danh/serial sang lab đích, ghi lý do và thời gian dự kiến.
2. Kiểm lịch đang dùng/tương lai và bảo trì; giải quyết xung đột trước khi điều phối.
3. Admin duyệt điều chuyển qua ranh giới lab; nhân viên nguồn không tự có quyền quản lý lab đích.
4. Người bàn giao kiểm phụ kiện/tình trạng và ký nhận giao; người được phân công nhận ở lab đích xác nhận tiếp nhận/kiểm tra.
5. Sau xác nhận phù hợp mới cập nhật lab/vị trí và lịch sử tài sản. Nhu cầu chặn đặt trong thời gian điều chuyển cần rule availability/transaction riêng; không tự đổi physical status để giả một trạng thái vận chuyển chưa có.
6. Sai phụ kiện/hư hỏng/không nhận được mở exception/incident, không đóng lệnh là thành công.

Trạng thái điều chuyển là trạng thái nghiệp vụ riêng được thiết kế thêm; không thêm IN_TRANSIT vào BookingStatus/OperationalStatus. Phạm vi lab, nhận bàn giao và cập nhật vị trí phải thực thi ở server.

### 7.3 Giao ngoài qua GHN

Chuẩn bị [tài khoản/token theo GHN](https://developer.ghn.vn/vi/docs/token/get-token), Shop ID/kho lấy hàng, token staging riêng và API base `https://dev-online-gateway.ghn.vn`. Production là `https://online-gateway.ghn.vn`. Header Token/ShopId; cân nặng gram, kích thước centimet, tiền VND. [Tổng quan GHN](https://developer.ghn.vn/vi/docs/getting-started/overview).

Đề xuất triển khai service thực trong backend:

1. Chỉ cho tài nguyên được phép mang ra ngoài; không ship ROOM hoặc máy cố định. MATERIAL tiêu hao đi theo ledger xuất kho; thiết bị mượn phải theo tài sản và booking.
2. Người mượn chọn giao ngoài, cung cấp người nhận/SĐT/địa chỉ; staff xác minh điều kiện mượn và lab scope. Admin quyết định chính sách/các ngoại lệ.
3. Lấy master data địa chỉ của provider, tính phí/thời gian và kiểm khả năng phục vụ; không gán trực tiếp mã phường nội bộ sang mã hãng. Tài liệu GHN có các API địa chỉ cũ/mới; chọn theo endpoint/account hợp lệ, không hardcode dữ liệu hành chính.
4. Chốt phí giao đi/giao về, cọc nếu có và khoảng chiếm dụng gồm vận chuyển, sử dụng, kiểm nhận. Đây là policy/model mới, không tự giả định lịch hiện tại đã cộng buffer.
5. Staff đóng gói, ghi serial/phụ kiện/ảnh tình trạng; tạo đơn với mã tham chiếu nội bộ ổn định. Khi tạo đơn timeout, tra cứu bằng mã của shop trước khi retry để tránh hai vận đơn.
6. Ghi ai giao cho carrier và bằng chứng custody; xử lý checkout theo hợp đồng bàn giao được duyệt. Carrier báo delivered chỉ cập nhật shipment, không tự chứng nhận người dùng đã kiểm đủ/safe hoặc đổi booking thành COMPLETED.
7. Có quy trình thu hồi chiều về. Carrier báo returned chưa phải nghiệm thu trả thiết bị; cán bộ kiểm nhận thực mới làm RETURNED/COMPLETED theo workflow của booking.
8. Xử lý delivery_fail/lost/damage/return_fail rõ, giữ lịch sử, hỗ trợ incident và tài sản chưa trả.

Để tránh thu hai lần, lần đầu nên dùng trả trước khoản thuê theo payment riêng, không tự đưa khoản đó vào COD. Chỉ triển khai COD khi có ledger đối soát và quy tắc phân biệt tiền thu hộ/phí vận chuyển/cọc.

### 7.4 Webhook GHN sau khi endpoint được triển khai

Trong Developer Portal → cấu hình webhook → Order, đăng ký HTTPS URL. URL dự kiến có thể là `/api/shipments/ghn/webhook`, nhưng **route này chưa tồn tại ở dự án**. Staging và production cấu hình riêng. GHN hỗ trợ custom header; dùng secret webhook riêng kiểm ở backend, đối chiếu ShopID/order sở hữu và khi cần tra cứu server-to-server. Không coi client gửi Status=delivered là bằng chứng của hãng.

Worker/webhook phải xử lý callback lặp, đến sai thứ tự, trạng thái hãng chưa map, phí thay đổi và timeout. Lưu event bền vững rồi phản hồi phù hợp; tránh log token, địa chỉ/SĐT công khai. Shipment state không đồng bộ máy móc sang BookingStatus hay trạng thái vật lý.

Nguồn: [tạo đơn GHN](https://developer.ghn.vn/vi/docs/order/create), [callback GHN](https://developer.ghn.vn/vi/docs/webhook/callback-order-status).

## 8. Lỗi cấu hình thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| SMTP auth lỗi | SMTP login/key; không dùng API key; port/TLS; key/account được kích hoạt |
| SMTP verify OK, không có thư | Sender/domain, spam, provider logs/bounce; verify không gửi email |
| OTP nhận, không có mail duyệt lịch | Luồng status chưa nối email; cần phát triển worker, không phải lỗi credential |
| Nhắc lịch không chạy trong demo | Launcher cố định scheduler=false; sentAt không phải email receipt |
| UploadConfigured=true nhưng upload lỗi | Chỉ đủ biến; endpoint/bucket/key/CORS/clock/chữ ký thực chưa được xác minh |
| PUT lỗi CORS/403 | Origin đúng port/hostname, PUT allowed, headers, key permission, ticket hết hạn; không chỉ nhìn CORS khi server thực trả auth error |
| PUT OK, complete MEDIA_UPLOAD_MISSING | HEAD sai endpoint/bucket, object/key không đúng, credential thiếu quyền đọc |
| Gallery URL lỗi | Nhầm S3 endpoint với public URL, public/custom domain chưa Active, codec video hoặc cache |
| UI xóa media nhưng object còn | Backend catch lỗi cleanup; kiểm quyền DELETE và cần cơ chế retry cleanup |
| /api/payments trả 404 | PAYMENTS_ENABLED=false hoặc demo thiếu flag UI, chưa restart backend |
| Payment button chưa xuất hiện | Flag Vite chưa restart/build, booking chưa confirmed hoặc phí bằng 0 |
| Callback payment thành công giả ở browser | Chờ IPN đã đăng ký, HTTPS công khai, chữ ký đúng; return không settle |
| IPN không tới | URL cũ/tunnel dừng, firewall/Access challenge, chưa đăng ký merchant; không dùng localhost cho IPN |
| VNPAY unavailable | Merchant code/secret/host/version/return/IPN; đối chiếu môi trường sandbox/production |
| Điền token GHN không có UI | Adapter/route/workflow chưa triển khai, schema không tạo tích hợp tự động |

## 9. Thứ tự thực hiện

1. Chốt môi trường staging hoặc local + tunnel; chuẩn bị tài khoản/domain.
2. SMTP: verify rồi OTP inbox thực VI/EN.
3. R2: ảnh nhỏ → video ngắn → reload → xóa DB/object; kiểm quyền từng vai trò.
4. VNPAY sandbox: cấu hình hai flag, IPN đăng ký, bảng giá, booking confirmed, giao dịch/callback thực.
5. Phát triển email nghiệp vụ có outbox/retry/dedupe và trạng thái delivery riêng.
6. Chốt điều chuyển/giao ngoài; phát triển shipping API, rule chiếm dụng và custody; kiểm staging GHN.
7. Nghiệm thu riêng trước production. Giữ ranh giới triển khai từng phần; không diễn giải cấu hình đủ biến hoặc test fixture thành tích hợp live đã thành công.

## 10. Mã nguồn đã đối chiếu

- `.env.example`, `.env.production.example`, `docker-compose.prod.yml`: biến cấu hình và mapping container/build.
- `backend/scripts/startLocalDemo.mjs`: port, flag payment/UI, scheduler off, env propagation.
- `backend/src/services/emailService.js`, `guestBookingService.js`: SMTP và OTP fail-closed.
- `backend/src/services/notificationService.js`: in-app sentAt và scheduler.
- `backend/src/services/resourceMediaService.js`, `routes/resourceMedia.js`: MIME/size, signed PUT/HEAD/DELETE, config check, scope.
- `frontend/src/components/ResourceMediaEditor.tsx`: flow upload/gallery metadata.
- `backend/src/services/paymentProviders.js`, `paymentService.js`, `bookingPricingService.js`, `routes/payments.js`: sandbox mode, QR, IPN, return, session, charge rules.
- `backend/prisma/schema.prisma`: ShipmentOrder/ShipmentStatus chỉ là persistence foundation.
- `docs/QA_WORKFLOW_REPORT_20261003.md`: kết quả thử nghiệm và tích hợp live còn chưa kiểm.
