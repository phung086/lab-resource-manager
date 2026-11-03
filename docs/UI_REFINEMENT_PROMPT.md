# Master prompt cho Claude — tinh chỉnh UI LAB Resource Manager

Sao chép phần dưới vào Claude đang làm việc tại `C:/Projects/lab-resource-manager`.
Đây là brief triển khai tiếp, không phải báo cáo nghiệm thu hoặc quyền đổi nghiệp vụ.

---

Bạn phụ trách thiết kế sản phẩm và phát triển frontend cho LAB Resource Manager.
Hãy trực tiếp tinh chỉnh UI toàn hệ thống trên mã hiện tại, đưa nó thành một sản
phẩm vận hành chuyên nghiệp, có cá tính và dễ dùng. Không dừng ở đề xuất, tài liệu,
thay vài border hoặc font. Không coi đây là yêu cầu viết lại dự án.

## 0. Yêu cầu mới nhất — chỉ rút gọn câu chữ

Người dùng đã yêu cầu trả bố cục về trước lượt rút gọn 30/10. Ý muốn là ít
chữ hơn, không phải bỏ các thẻ, thông tin hay điều hướng. Giữ bố cục, màu sắc,
mascot, header/footer, hero, metrics và các khối nghiệp vụ hiện có. Chỉ biên tập
nhãn/mô tả ngắn, rõ; không tự chuyển phần đang hiển thị sang disclosure hoặc
ẩn khối rỗng. Không lược bỏ điều kiện, lỗi, cảnh báo và hạn thanh toán.

## 1. Đọc hiện trạng trước khi sửa

- Kiểm tra cwd, branch, HEAD và toàn bộ diff; giữ công việc của người khác.
- Đọc AGENTS.md, ba governance docs theo thứ tự bắt buộc, PRODUCT.md, các phần
  SRS/DECISIONS liên quan, FRONTEND_GUIDELINE và checkpoint mới trong CURRENT_STATE.
- Dùng source, import/caller, API contract và test hiện hành làm căn cứ. Tài liệu
  AI cũ và ảnh chụp không chứng minh trạng thái runtime hiện tại.
- Xem giao diện thật trước khi quyết định; phân biệt dữ liệu live với HTTP fixture.
  Dùng skill frontend phù hợp đang có, đọc SKILL.md trước khi áp dụng.
- Tự giải quyết các lựa chọn mỹ thuật thông thường; không hỏi lại những điều đã
  rõ trong brief. Hoàn tất lượt tinh chỉnh đã chọn, rồi nêu bước tiếp theo.

## 2. Ý đồ thiết kế đã được người dùng chọn

Người dùng thích giao diện sáng, đa sắc tinh tế, background đẹp, điểm nhấn rõ,
chuyển động có chất lượng. Hình dashboard tím–hồng được gửi chỉ để tham khảo
cách phối màu, phân cấp và bố cục; không sao chép nguyên xi, không thêm nghiệp
vụ chấm công hoặc các thông số không thuộc LAB.

- Giữ landing ảnh LAB và glass hero hiện tại. Người dùng đã từ chối hướng
  landing tối giản, nhạt và khô. Footer cần nhẹ, hài hòa; không đổi thành mảng
  tím/đen nặng phủ toàn chiều ngang.
- Violet hiện tại #6040ce là màu nhận diện. Mint, peach, blue và rose dùng có
  mục đích theo tác vụ; được tinh chỉnh sắc độ nếu cả hệ thống hợp lý hơn.
- Phân biệt màu thương hiệu với màu trạng thái: lỗi đỏ, cảnh báo amber, thành
  công xanh. Trạng thái phải có chữ/icon, không chỉ khác màu.
- Mỗi màn có một điểm nhấn chính. Giữ các khối bảng/form nền rõ, tĩnh và dễ đọc;
  không biến mọi card thành gradient hoặc glass. Nền có chiều sâu vừa đủ, không
  tranh với nội dung. Có thể thêm motif LAB bằng CSS/SVG hiện có khi hữu ích.
- Giữ typography nhất quán với hệ chữ đang tải. Chỉnh cỡ chữ, dòng, độ dài,
  khoảng cách và mật độ thông tin trước khi nghĩ đến thêm font/thư viện.
- Viết tiếng Việt ngắn, cụ thể, đúng thao tác; không slogan AI, câu rỗng,
  nhãn viết hoa tràn lan hoặc giải thích kỹ thuật không giúp người dùng quyết định.
- Ảnh thiết bị dùng tài sản/API thật. Khi thiếu ảnh, dùng category art đúng;
  không lấy ảnh thiết bị khác rồi ngụ ý đó là tài nguyên đang cho thuê.

## 3. Phạm vi cần kiểm tra thống nhất

Lấy `frontend/src/workspaceRoutes.js`, route guards và feature flags làm danh mục.
Kiểm tra public: landing, danh mục/chi tiết, kiểm tra lịch, quy trình, đăng nhập,
đăng ký và 404. Workspace: tổng quan của cả ba vai trò; danh mục/chi tiết/chọn
nhiều tài nguyên; planner, review và guest booking; lịch đặt/bàn giao/hoàn trả;
thanh toán, biên nhận và bản in; bảo trì, sự cố, kho vật tư, báo cáo vận hành;
người dùng, quyền/phân công LAB, chính sách; hồ sơ/bảo mật; thông báo; nhật ký;
kết nối ChatGPT và giao diện giám sát khi được cấu hình.

Xem cả form mở, modal/drawer, tab, bộ lọc, pagination, hồ sơ đang chọn, danh sách
trống, loading, thiếu cấu hình, lỗi máy chủ, validation, thành công và hạn thanh
toán. Không chỉ chỉnh màn đầu hoặc chỉ kiểm tra trạng thái có dữ liệu đẹp.
Giữ trạng thái tìm kiếm/bộ lọc/tài nguyên khi đi tới chi tiết, đặt lịch hoặc bảo trì.
Giữ nội dung nhập khi lỗi; không thêm hạ tầng bản nháp mới trong lượt mỹ thuật.

Không phục hồi teaching/research route đã ngừng dùng. Tính năng ẩn chưa được
cấu hình không phải lý do để bật flag, bịa dữ liệu hoặc hạ quyền truy cập.

## 4. Chỗ cần sửa đúng và tránh phình CSS

Đọc và tái sử dụng lớp hiện tại:

- `styles/spectrum.css`: palette, accent theo data-workspace-view, header và
  bề mặt dùng chung; `styles/global.css`: cấu trúc legacy đang dùng.
- `styles/liquid-glass.css`: landing; `styles/workspace-command.css`: tổng quan.
- `styles/feedback-visibility.css`: lỗi/cảnh báo; các stylesheet của feature
  resource, planner, operations, materials, users, account, audit, support/payment.
- `AppLayout.tsx`, `WorkspaceHome.tsx`, `CustomerHome.tsx`, `AdminUserConsole.tsx`.

Ưu tiên sửa rule sở hữu thành phần. Kiểm tra specificity/import order và xóa
trùng lặp trong phạm vi đã hiểu; không nối thêm nhiều lớp override để thắng nhau.
Không thêm design system/router/store thứ hai. Không đổi React/Vite,
Express/Prisma/PostgreSQL hoặc cấu trúc nguồn chỉ vì template tham khảo.

Màn người dùng hiện đã dùng một heading của AccessUserManagement; thống kê vai
trò nằm trong disclosure dưới danh sách. Không đưa lại nhiều tầng tiêu đề trước
khi người dùng tiếp cận thao tác. Form tạo tài khoản có field groups và hướng dẫn 12–128
ký tự; không dùng nhầm hướng dẫn 8 ký tự của luồng đổi mật khẩu.

## 5. Motion và hiệu năng

Dùng chuyển động để giải thích mở/đóng, chọn, đổi trạng thái hoặc chuyển ngữ cảnh.
Ưu tiên transform/opacity khoảng 160–320ms; có thể dùng một entrance ngắn ở vùng
chính. Không rải stagger cho mọi dòng bảng, không chạy background/mascot liên tục,
không lạm dụng blur, filter, box-shadow lớn hoặc will-change trên nhiều phần tử.
Tôn trọng prefers-reduced-motion, bàn phím và thiết bị cảm ứng. Không làm
hover thành cách duy nhất để xem thông tin hoặc tự chuyển tab khi rê chuột.

Workspace đang dùng data panels không backdrop blur; landing giữ glass hero
với ngân sách nhỏ hơn trên mobile. Giữ lợi ích đó khi làm đẹp thêm. Không thêm
polling, request hoặc dependency chỉ để trang trí. Đo bundle trước/sau và quan
sát request/animation; không suy ra hiệu năng backend từ mock hoặc số read vốn
biến động vì StrictMode. Không tuyên bố không overload khi chưa đo tải thật.

## 6. Hợp đồng không được phá

- Backend quyết định RBAC, ownership và LAB scope; route hiding chỉ là UX.
- Giữ ADMIN/LAB_STAFF/CUSTOMER và các enum canonical theo AGENTS/SRS.
- PENDING_APPROVAL + paymentDueAt là chờ thanh toán, không phải nhân viên duyệt.
  Hạn là min(paymentDueAt,startAt), không gia hạn khi reload/retry. Browser return
  không chứng minh trả tiền; chỉ server xác minh. Thanh toán trễ không khôi phục
  lịch đã hủy. Biên nhận phải giữ cảnh báo đối soát và disclaimer hóa đơn thuế.
- Không fake availability, booking, email SENT, telemetry, số liệu hoặc audit.
- Không thêm telemetry giả, mock success hay nới validation để giao diện đẹp.
- Không sửa schema/migrations, reset dữ liệu, db push, gửi mail/giao dịch thật,
  push/merge/deploy hoặc thay cấu hình dịch vụ ngoài trong lượt UI này.
- Không đưa password/OTP/token/key vào screenshot, log, prompt hoặc báo cáo.

## 7. Nghiệm thu và cách bàn giao

Xem trực tiếp trước–sau, tối thiểu 1440/1024/390px và VI/EN. Kiểm tra zoom 200%,
keyboard/Tab/Escape, focus khi lỗi và đóng modal, touch targets, tương phản chữ,
long text, table scroll có chủ đích và không tràn toàn trang. Cảnh báo chính
sách/xung đột/hạn thanh toán phải nhìn thấy ngay tại nơi cần xử lý.

Chạy gate phù hợp trong frontend/package.json. Gate bắt buộc:
`npm run test:required`. Các suite UI có sẵn gồm `test:ui:system-presentation`,
`test:ui:workspace-command`, `test:ui:catalogue`, `test:ui:customer-accessibility`,
`test:ui:shared-form-drafts`, `test:ui:payment-checkout`,
`test:ui:support-payment-experience`, `test:ui:operations-workbench` và
`test:ui:resource-care-experience`. Đọc guard trước khi chạy; một số suite khác
cần PostgreSQL QA riêng. Không chạy các test DB vào database dùng chung.
Care UI suite có cờ test riêng trong browser Vite và intercept toàn bộ API;
đó không phải bằng chứng telemetry/hardware hoặc backend đã hoạt động.

Giữ preview hiện có 5173 nếu đang chạy. Mascot chatbot là thành phần người dùng
muốn giữ: không tự ẩn hoặc bỏ nó khi tối ưu. Launcher local chuẩn bật
VITE_ENABLE_AI_ASSISTANT=true; nếu mở Vite trực tiếp để QA, giữ đúng cờ đó
trong phiên bàn giao và không nhầm trạng thái thiếu backend với việc ẩn nút. Kiểm tra cổng/API/Docker thực tế; không
khẳng định live-ready từ build hoặc screenshot fixture. Khi không có backend,
vẫn hoàn tất phần frontend có thể kiểm thử, ghi chính xác phần chưa nghiệm thu.
Không tự mở các stack/worktree/tunnel mới để né cấu hình chưa sẵn sàng.

Đọc checkpoint mới nhất trong CURRENT_STATE để biết kết quả thực tế. Cập nhật
ngắn vào tài liệu hiện có, không tạo hàng loạt báo cáo. Bàn giao: những thay đổi
nhìn thấy được; màn/vai trò/trạng thái đã kiểm tra; ảnh trước–sau với nhãn QA/live;
kết quả build/kiểm thử/hiệu năng; giới hạn còn lại và một bước tiếp theo cụ thể.
Không gọi một lượt polish là chứng nhận production hay đã kiểm mọi ngoại lệ.
