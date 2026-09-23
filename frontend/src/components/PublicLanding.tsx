import React, { useState } from "react";
import { ArrowRight, CalendarDays, Check, DoorOpen, FlaskConical, Menu, Microscope, MonitorCheck, Package, ShieldCheck, Users, Wrench, X } from "lucide-react";
import "../styles/public-landing.css";
import { PAYMENT_FEATURES_ENABLED } from "../config/featureFlags";

const categories = [
  { title: "Phòng LAB", description: "Không gian học tập và thực hành theo lịch.", Icon: DoorOpen },
  { title: "Thiết bị", description: "Tra cứu thiết bị đo kiểm và điều kiện sử dụng.", Icon: Microscope },
  { title: "Máy móc", description: "Theo dõi trạng thái trước mỗi phiên vận hành.", Icon: Wrench },
  { title: "Bộ thí nghiệm", description: "Chuẩn bị tài nguyên cho buổi thực hành.", Icon: FlaskConical },
  { title: "Vật tư", description: "Tập trung thông tin vật tư phục vụ thí nghiệm.", Icon: Package },
];
const navigation = [["gioi-thieu", "Giới thiệu"], ["tinh-nang", "Tính năng"], ["quy-trinh", "Quy trình"], ["tai-nguyen", "Tài nguyên"], ["giam-sat", "Giám sát"], ["tro-ly", "AI hỗ trợ"]];

function LabPlan() {
  return <figure className="public-plan">
    <div className="public-plan-title"><FlaskConical size={22} /><strong>Một không gian. Kết nối mọi hoạt động.</strong></div>
    <svg viewBox="0 0 560 350" role="img" aria-label="Sơ đồ minh họa phòng LAB với bàn thực hành, thiết bị và khu vực đặt lịch">
      <rect x="24" y="24" width="512" height="292" rx="16" fill="#fff" stroke="#b7c9e0" strokeWidth="2" />
      <path d="M200 24v90m0 86v116M24 184h90m190 132v-92h232" fill="none" stroke="#b7c9e0" strokeWidth="6" />
      <path d="M114 184v-65a65 65 0 0 1 65 65M304 224v-55a55 55 0 0 1 55 55" fill="none" stroke="#94accb" strokeWidth="2" />
      {[258, 398].map(x => <g key={x}><rect x={x} y="67" width="90" height="106" rx="8" fill="#e8effb" stroke="#8ba9d3" /><rect x={x + 19} y="82" width="51" height="29" rx="4" fill="#fff" stroke="#3666ad" /><path d={`M${x+25} 144h40m-20-12v24`} stroke="#3666ad" strokeWidth="3" /><rect x={x+27} y="182" width="36" height="13" rx="5" fill="#9bb6dc" /></g>)}
      <rect x="57" y="55" width="107" height="59" rx="6" fill="#dceee9" stroke="#6ca68f" />
      <circle cx="88" cy="84" r="13" fill="#fff" stroke="#548974" /><path d="M114 76h29m-29 14h20" stroke="#548974" strokeWidth="3" />
      <rect x="61" y="226" width="106" height="54" rx="6" fill="#edf2fa" stroke="#94accb" /><path d="M80 244h68m-68 12h45" stroke="#94accb" strokeWidth="3" />
      <path d="M222 314v-104h155" fill="none" stroke="#225dba" strokeWidth="3" strokeDasharray="6 6" />
      <circle cx="378" cy="211" r="7" fill="#225dba" />
      <text x="336" y="270" fill="#345475" fontSize="16" fontFamily="sans-serif">KHU THỰC HÀNH</text>
    </svg>
    <figcaption>Sơ đồ minh họa · Không phải dữ liệu giám sát trực tiếp</figcaption>
  </figure>;
}

export function PublicLanding({ children, onRegister }: { children: React.ReactNode; onRegister: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="public-site" id="dau-trang">
    <a className="public-skip" href="#noi-dung">Đến nội dung chính</a>
    <header className="public-header">
      <a className="public-brand" href="#dau-trang" aria-label="Lab Resource Manager — trang đầu"><FlaskConical /><span>LAB<span>Resource Manager</span></span></a>
      <button className="public-menu" aria-expanded={menuOpen} aria-controls="public-nav" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="public-nav" className={menuOpen ? "is-open" : ""} aria-label="Điều hướng trang giới thiệu">
        {navigation.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
        <button className="public-register" onClick={onRegister}>Đăng ký sinh viên</button>
      </nav>
      <a className="public-login" href="#dang-nhap" onClick={() => setMenuOpen(false)}>Đăng nhập <ArrowRight size={16} /></a>
    </header>
    <main id="noi-dung">
      <section className="public-hero public-container" id="gioi-thieu">
        <div><h1>Đặt lịch và giám sát tài nguyên phòng thí nghiệm<br /><span>trên một nền tảng thống nhất.</span></h1>
          <p>Hệ thống web nội bộ giúp sinh viên, giảng viên đặt lịch sử dụng tài nguyên; cán bộ LAB quản lý bàn giao, hoàn trả; nhà trường theo dõi trạng thái vận hành.</p>
          <div className="public-actions"><a className="public-primary" href="#tai-nguyen">Tra cứu tài nguyên <ArrowRight size={18} /></a><a className="public-secondary" href="#dang-nhap">Đăng nhập hệ thống</a></div>
          <p className="public-small"><ShieldCheck size={16} /> Phân quyền rõ ràng. Quy trình có thể theo dõi.</p>
        </div><LabPlan />
      </section>
      <div className="public-capabilities" aria-label="Các năng lực của hệ thống"><span><CalendarDays /> Lịch đặt tập trung</span><span><ShieldCheck /> Phê duyệt theo quyền</span><span><MonitorCheck /> Giám sát theo nguồn dữ liệu</span><span><Users /> Bốn vai trò phối hợp</span></div>
      <section className="public-section public-container public-editorial" id="tinh-nang">
        <div><h2>Từ thông tin rời rạc<br />đến công việc liền mạch.</h2><p>Lịch trùng, trạng thái thiết bị chưa rõ và yêu cầu chờ duyệt khiến việc chuẩn bị cho một buổi thực hành mất thêm thời gian.</p><p>Lab Resource Manager đưa thông tin tài nguyên và từng bước xử lý về cùng một nơi.</p></div>
        <div className="public-feature-list">
          <article><CalendarDays /><div><h3>Lập lịch với đầy đủ ngữ cảnh</h3><p>Xem lịch theo tài nguyên, kiểm tra thời gian và chính sách trước khi gửi yêu cầu. Hệ thống kiểm tra xung đột khi đặt lịch.</p></div></article>
          <article><ShieldCheck /><div><h3>Biết ai xử lý, biết bước tiếp theo</h3><p>Theo dõi phê duyệt, bàn giao, hoàn trả và hoàn tất. Thông báo hỗ trợ người dùng nắm các thay đổi của lịch đặt.</p></div></article>
          <article><Wrench /><div><h3>Vận hành có trách nhiệm</h3><p>Ghi nhận sự cố, theo dõi bảo trì và trạng thái vận hành. Nhân viên xử lý trong phạm vi LAB được phân công.</p></div></article>
        </div>
      </section>
      <section className="public-resources public-section" id="tai-nguyen"><div className="public-container"><div className="public-section-heading"><h2>Tài nguyên dùng chung<br />cho học tập và nghiên cứu.</h2><p>Phòng thực hành, thiết bị, máy móc, bộ thí nghiệm và vật tư thuộc phòng LAB. Xem thông tin, lịch khả dụng và chính sách trước khi gửi yêu cầu sử dụng.</p></div><div className="public-category-list">{categories.map(({ title, description, Icon }) => <article key={title}><div className="public-category-art"><Icon strokeWidth={1.3} /></div><h3>{title}</h3><p>{description}</p></article>)}</div><a className="public-secondary" href="#dang-nhap">Đăng nhập để tra cứu lịch khả dụng <ArrowRight size={16} /></a></div></section>
      <section className="public-section public-container" id="quy-trinh"><div className="public-section-heading"><h2>Mỗi buổi thực hành<br />đều có một quy trình rõ ràng.</h2><p>Yêu cầu cần phê duyệt ở trạng thái Chờ duyệt cho đến khi người có quyền quyết định. Nếu chính sách không yêu cầu duyệt, lịch hợp lệ được xác nhận trực tiếp.</p></div><ol className="public-workflow">{[["Tra cứu", "Xem chi tiết tài nguyên, lịch khả dụng và chính sách LAB."], ["Gửi yêu cầu", "Chọn thời gian, nêu mục đích học tập, giảng dạy hoặc nghiên cứu."], ["Duyệt khi cần", "Cán bộ có quyền xét duyệt; người đặt theo dõi kết quả qua thông báo."], ["Bàn giao & sử dụng", "Ghi nhận tình trạng trước khi bàn giao; lịch chuyển sang Đang sử dụng."], ["Hoàn trả", "Ghi nhận tình trạng sau sử dụng; lịch chuyển sang Đã hoàn trả."], ["Hoàn tất & theo dõi", "Cán bộ xác nhận hoàn tất; lịch sử và bảng tổng quan phản ánh kết quả."]].map(([title, description], i) => <li key={title}><span>{i + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
      <section className="public-roles public-section" id="vai-tro"><div className="public-container"><h2>Đúng công việc.<br />Đúng vai trò.</h2><div>{[["Sinh viên", "Chủ động chuẩn bị buổi học", "Tìm tài nguyên, gửi lịch đặt và theo dõi yêu cầu của mình."], ["Giảng viên", "Tổ chức hoạt động học thuật", "Chuẩn bị tài nguyên cho giảng dạy và theo dõi lịch sử dụng của mình."], ["Nhân viên LAB", "Giữ hoạt động thông suốt", "Duyệt yêu cầu, bàn giao, xử lý sự cố và theo dõi LAB được phân công."], ["Quản trị viên", "Quản lý hệ thống tập trung", "Quản lý tài khoản, tài nguyên và cấu hình vận hành theo quyền."]].map(([role, title, description]) => <article key={role}><h3>{role}</h3><p>{title}</p><p>{description}</p></article>)}</div></div></section>
      <section className="public-section public-container public-editorial" id="giam-sat"><div className="public-monitor-visual"><MonitorCheck size={64} strokeWidth={1} /><h3>Dữ liệu cần có nguồn.</h3><p>Chưa kết nối phần cứng thực tế</p><span>PENDING REAL HARDWARE</span></div><div><h2>Giám sát tài nguyên.<br />Hỗ trợ vận hành LAB.</h2><p>Theo dõi trạng thái vận hành, bảo trì, hiệu chuẩn, sự cố và cảnh báo trong phạm vi được phân công. Sức khỏe nguồn telemetry được phân biệt với trạng thái vật lý của tài nguyên.</p><p>Nhiệt độ, độ ẩm chỉ hiển thị khi có mẫu được chấp nhận. Chưa có dữ liệu là NO_DATA; camera chưa cấu hình là NOT_CONFIGURED.</p><p>NON-CERTIFIED · NOT A FIRE ALARM — cảnh báo hỗ trợ không thay thế hệ thống an toàn và quy trình phòng thí nghiệm.</p></div></section>
      <section className="public-section public-container public-extras" id="tro-ly"><article><h2>Trợ lý tra cứu và tư vấn<br />dữ liệu phòng thí nghiệm.</h2><p>Tìm tài nguyên, khung giờ khả dụng, lịch đặt của mình; giải thích xung đột, chính sách và trạng thái tài nguyên từ dữ liệu được phép truy cập.</p><ul><li><Check /> Công cụ MCP chỉ đọc dữ liệu</li><li><Check /> Gợi ý khung giờ để bạn kiểm tra trong form đặt lịch</li><li><Check /> Không tự đặt, phê duyệt hoặc đổi trạng thái</li></ul></article><article id="do-an"><h2>Phục vụ hoạt động<br />phòng thí nghiệm nội bộ.</h2><p id="muc-tieu">Đồ án tập trung vào đặt lịch sử dụng, quản lý quy trình bàn giao và giám sát tài nguyên dùng chung của trường đại học.</p><p id="kien-truc">Giao diện web kết nối API; máy chủ kiểm tra quyền, chính sách và lưu dữ liệu trong PostgreSQL.</p><p id="cong-nghe">Công nghệ: React/Vite · Node.js/Express · Prisma · PostgreSQL.</p>{PAYMENT_FEATURES_ENABLED && <details id="thanh-toan"><summary>Khả năng tích hợp mở rộng</summary><p className="public-notice">Optional / Sandbox integration — VNPAY/VietQR được giữ để trình diễn kỹ thuật với khoản thu gắn lịch đặt LAB khi quản trị viên cấu hình. Thanh toán không thuộc quy trình đặt lịch mặc định; không tự tạo khoản thu khi đặt lịch. VietQR chưa tự xác nhận tiền về.</p></details>}</article></section>
      <section className="public-final public-container"><div><h2>Sẵn sàng cho buổi thực hành tiếp theo?</h2><p>Đăng nhập để xem tài nguyên và bắt đầu với lịch đặt của bạn.</p></div><div className="public-actions"><a className="public-primary" href="#dang-nhap">Đăng nhập hệ thống <ArrowRight size={18} /></a><button className="public-secondary" onClick={onRegister}>Đăng ký sinh viên</button></div></section>
      <section id="dang-nhap" className="public-auth" aria-label="Đăng nhập vào không gian làm việc">{children}</section>
    </main>
    <footer className="public-footer public-container"><div><a className="public-brand" href="#dau-trang"><FlaskConical /><span>LAB<span>Resource Manager</span></span></a><p>Hệ thống đặt lịch và giám sát tài nguyên phòng thí nghiệm nội bộ.</p></div><div><strong>Hệ thống</strong><a href="#gioi-thieu">Giới thiệu</a><a href="#tai-nguyen">Tài nguyên</a><a href="#quy-trinh">Quy trình đặt lịch</a><a href="#giam-sat">Giám sát</a></div><div><strong>Truy cập</strong><a href="#dang-nhap">Đăng nhập</a><button onClick={onRegister}>Đăng ký sinh viên</button><a href="#vai-tro">Vai trò & trách nhiệm</a></div><div><strong>Đồ án</strong><a href="#muc-tieu">Mục tiêu</a><a href="#kien-truc">Kiến trúc</a><a href="#cong-nghe">Công nghệ</a></div><p className="public-footer-note">Lab Resource Manager · Đồ án tốt nghiệp · Thông tin trên trang mô tả chức năng, không phải số liệu vận hành trực tiếp.</p></footer>
  </div>;
}
