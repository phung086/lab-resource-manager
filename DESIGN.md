---
name: LAB Resource Manager
description: Một hệ LAB Studio cho workspace, public, đăng nhập/đăng ký, modal và assistant.
colors:
  studio-primary: "#2563eb"
  studio-primary-hover: "#1d4ed8"
  studio-wash: "#edf3ff"
  studio-canvas: "#f5f7fc"
  studio-ink: "#202c47"
  studio-muted: "#596980"
  studio-line: "#dfe6f2"
  studio-control-line: "#aebed6"
  studio-soft: "#fbfdff"
  studio-selected: "#e6efff"
  studio-selected-ink: "#2456a0"
  surface: "#ffffff"
typography:
  studio-heading: {fontFamily: "Onest, sans-serif", fontSize: "27px", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-.025em"}
  studio-hero: {fontFamily: "Onest, sans-serif", fontSize: "28px", fontWeight: 600, lineHeight: 1.35}
  studio-body: {fontFamily: "Onest, sans-serif", fontSize: "14px", fontWeight: 400, lineHeight: 1.65}
  studio-control: {fontFamily: "Onest, sans-serif", fontSize: "13px", fontWeight: 500, lineHeight: 1.5}
  public-display: {fontFamily: "Onest, sans-serif", fontSize: "clamp(38px, 4.4vw, 62px)", fontWeight: 500, lineHeight: 1.12, letterSpacing: "-.035em"}
  auth-heading: {fontFamily: "Onest, sans-serif", fontSize: "28px", fontWeight: 500, lineHeight: 1.35}
  modal-heading: {fontFamily: "Onest, sans-serif", fontSize: "21px", fontWeight: 500, lineHeight: 1.4}
  mono: {fontFamily: "JetBrains Mono, ui-monospace, monospace"}
rounded: {studio-panel: "16px", studio-control: "10px", studio-hero: "18px", public-glass: "28px", modal: "18px"}
spacing: {compact: "12px", section: "24px", hero: "28px"}
components:
  studio-primary: {backgroundColor: "{colors.studio-primary}", textColor: "{colors.surface}", rounded: "{rounded.studio-control}"}
  studio-primary-hover: {backgroundColor: "{colors.studio-primary-hover}"}
  studio-secondary: {backgroundColor: "{colors.surface}", rounded: "{rounded.studio-control}"}
  studio-input: {rounded: "{rounded.studio-control}"}
  studio-panel: {textColor: "{colors.studio-ink}", rounded: "{rounded.studio-panel}"}
  studio-heading: {backgroundColor: "transparent", textColor: "{colors.studio-ink}"}
  public-glass: {textColor: "{colors.studio-ink}", rounded: "{rounded.public-glass}"}
  studio-modal: {backgroundColor: "{colors.surface}", textColor: "{colors.studio-ink}", rounded: "{rounded.modal}"}
---
# Design System: LAB Resource Manager

## Overview

**Creative North Star: "LAB Studio: rõ tác vụ, chiều sâu nhẹ"**

Studio dùng xanh dương, trắng và nền xanh/lavender nhạt cho mọi nhóm màn. Workspace, public, authentication, shared modal và assistant cùng palette nhưng giữ bố cục, ảnh và vật liệu phù hợp tác vụ. Public vẫn có ảnh, glass, floating card, marquee và motion hiện có; mở rộng Studio không đồng nghĩa xóa các đặc trưng này.

**Key Characteristics:**

- Một hệ tương tác cho ADMIN, LAB_STAFF và CUSTOMER, không thêm role từ ảnh tham khảo.
- Panel bo mềm, chiều sâu nổi/lõm nhẹ, ảnh LAB hiện có và từng bố cục theo tác vụ.
- Dữ liệu/metric từ server; không thêm avatar, trend, chart hay telemetry hư cấu.

Nguồn: `frontend/src/styles/lab-studio.css`, các shell và component thật. Main giữ global → spectrum → liquid-glass → lab-motion → feedback-visibility → lab-workflows rồi studio. AppLayout/PublicShell, AuthLogin/Register và assistant portal dùng lab-studio; BaseModal2026 dùng lab-studio-modal. Phạm vi là mọi nhóm màn đang bật, không chỉ home/workspace. Xem `docs/CURRENT_STATE.md` cho kiểm chứng giao diện; chưa chứng minh DB E2E hoặc người dùng đã duyệt thị giác.

## Colors

Primary/hover dùng cho action; wash/selected/selected-ink cho tab và vùng chọn; canvas/surface/soft cho nền dữ liệu. Ink/muted/line/control-line giữ hierarchy và nhận diện trường nhập. Public, auth, modal và secondary workbench dùng cùng hướng xanh; gradient/veil giữ màu phụ nhẹ theo source, không còn hợp đồng loại public/auth khỏi Studio.

**The Semantic Status Rule.** Màu trang trí, nhóm catalogue và lane board không thay canonical role/category/status; luôn giữ nhãn và ý nghĩa cảnh báo, thanh toán, lỗi.

## Typography

Giữ Onest và JetBrains Mono tự host, weight 400/500/600/700, unicode-range VI/Latin. Workspace heading 27px/mobile 23px, hero 28px/mobile 24px, body 14px, bảng/control chủ yếu 13px. Public display theo token/mobile 38px; auth heading 28px/mobile 25px; modal 21px/mobile 19px. Auth/modal/assistant input 16px, workspace input thường 14px và mobile 16px. Mono dành cho mã. Các nhãn 10–11px hiện có không thành scale nội dung mới.

## Layout

Desktop từ 1100px dùng thanh bên 104px khi thu gọn và 264px khi mở rộng. Nút ở rail mở rộng thanh bên ngay trong bố cục, nút cạnh logo thu gọn lại. Dưới 1100px brand chuyển lên header và menu mở dạng trượt với focus trap. Heading và action workspace wrap theo không gian, không ép mọi route vào dashboard giống nhau.
WorkspaceHero dùng ảnh LAB và ba lối đi theo role. Customer hiển thị hero → metrics; phiên có anchor ưu tiên trước agenda/resource body. Finder/empty session ở sau body; native details/summary giữ form. Staff/admin giữ queue/chart riêng. Directory, catalogue ALL + ROOM/EQUIPMENT/OTHER và năm category canonical được giữ. Lịch đặt dùng lưới thẻ hồ sơ, bộ lọc trạng thái và phân trang server. Hồ sơ đã chọn nằm cạnh lưới trên desktop và nối bên dưới trên mobile.
Public giữ glass hero cùng ảnh/veil/floating/marquee và các route service/catalogue. AuthIdentity dùng ảnh LAB trang trí sẵn có bên cạnh form; mobile thu gọn thành banner ảnh80×92, header một hàng và giữ locale ở header thay cho bộ trùng trong form. Shared modal giữ editor trước summary, draft disclosure, focus/close contract; assistant portal có skin riêng nhưng dùng cùng type/control. Calendar có disclosure bộ lọc nâng cao.

## Elevation & Depth

Panel dùng cặp bóng sáng/tối nhẹ; search/selected/session dùng inset. Secondary workbench và tab dùng cùng palette, trạng thái giữ màu cục bộ. Header có blur nhẹ/hairline; public glass chuyển nền kính xanh sáng mà giữ blur/saturation và fallback/reduced motion gốc. Auth có chiều sâu trên khung split và input inset. Modal dùng backdrop blur 5px, bóng nổi và vùng heading/body/footer phân cấp; assistant giữ panel portal rõ ràng. Không tăng tương phản/bóng đồng loạt chỉ để tạo cảm giác nổi.

## Shapes

Panel 16px, control 10px, hero/modal 18px; public glass giữ 28px. Auth, search, tab và responsive có ngoại lệ theo source. Modal mobile 16px. Không áp một loại radius hoặc một mẫu card lên mọi vùng.

## Components

- Primary xanh/chữ trắng, hover đậm hơn; secondary trắng. Workspace focus ring 2px/offset 3px; auth/modal input ring 2px/offset 2px. Search wrapper giữ một vòng focus, input bên trong trong suốt và không lồng viền.
- Navigation/tab giữ aria-current/aria-pressed. Support/materials/care/resource detail/account/inbox dùng token Studio và inset chọn; bảng không đổi dữ liệu/cột/thao tác thật.
- Directory dùng chữ đầu từ tên/email thật. Metrics lấy summary server, chart dùng nguồn hiện có; thiếu dữ liệu vẫn báo thật.
- Hành động trong hồ sơ lịch đặt mở BookingActionModal, kiểm canOpenBookingAction và tải lại sau khi API xác nhận. PENDING_PAYMENT và HISTORY là bộ lọc nhóm trên các trạng thái hiện có.
- Modal/assistant giữ drafts, validation, VI/EN, RBAC và focus. Ảnh hiện có không chứng minh lab vật lý/production; giữ lỗi media/fallback. Action hero Studio phản hồi ngắn; public giữ zoom/marquee/pause/hover/visibility và reduced-motion fallback.

## Do's and Don'ts

### Do:

- **Do** áp Studio theo opt-in surface/portal và kiểm cascade khi route lazy tải.
- **Do** giữ bố cục theo tác vụ, ba role chuẩn, ảnh và dữ liệu/permission thật.
- **Do** giữ server paging, xác nhận hành động, VI/EN, drafts, bàn phím và focus.

### Don't:

- **Don't** loại public/auth/modal/assistant khỏi hệ thống hoặc xóa glass/motion chỉ để đồng màu.
- **Don't** bịa avatar/metric/trend, đổi API/RBAC/category/status hoặc bật lại feature đang ẩn.
- **Don't** coi build, fixture hay screenshot là DB E2E hoặc duyệt thiết kế cuối.

## Action depth — 05/11/2026

CTA cobalt có cạnh đáy 4px, highlight và bóng màu; hover nâng 3px, active lún 3px. Dashboard dùng cobalt/teal/indigo cho ba lối đi. Secondary có cạnh 3px, tab chọn nền cobalt. Disabled bỏ bóng và chuyển động; reduced-motion giữ màu/độ nổi tĩnh. Đây là yêu cầu tăng độ nổi của người dùng, thay quy tắc action phẳng trước đó.
