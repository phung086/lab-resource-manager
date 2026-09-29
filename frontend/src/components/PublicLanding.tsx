import React, { useState } from 'react';
import { ArrowRight, CalendarDays, FlaskConical, Menu, ShieldCheck, X, Wrench, GraduationCap } from 'lucide-react';
import { PublicResourceCatalog } from './PublicResourceCatalog';
import { useLocale } from '../providers/LocaleProvider';
import '../styles/public-landing.css';

type Props = {
  children?: React.ReactNode; scheduleContent?: React.ReactNode; userName?: string;
  onLocaleChange: (locale: string) => void; onRegister: () => void;
  onViewSchedule: (id: string) => void; onGuestBookingComplete?: (result: any) => void;
  onWorkspace?: () => void; onLogout?: () => void;
};
export function PublicLanding({ children, scheduleContent, userName, onLocaleChange, onRegister, onViewSchedule, onGuestBookingComplete, onWorkspace, onLogout }: Props) {
  const { locale, t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = [['tai-nguyen', t('Phòng & thiết bị', 'Rooms & equipment')], ['kiem-tra-lich', t('Kiểm tra lịch', 'Check schedule')], ['quy-trinh', t('Quy trình sử dụng', 'How it works')]];
  const steps = [
    [t('Chọn tài nguyên', 'Find your resource'), t('Xem thông số, tư liệu và điều kiện sử dụng của phòng hoặc thiết bị.', 'Review the room or equipment, its media, specifications and access requirements.')],
    [t('Kiểm tra & đặt lịch', 'Check availability & book'), t('Chọn thời gian, nêu mục đích. Lịch được kiểm tra theo chính sách và xét duyệt khi cần.', 'Choose a time and purpose. Requests are checked against policy and reviewed when required.')],
    [t('Bàn giao & thực hành', 'Handover & practice'), t('Kiểm tra điều kiện sử dụng và ghi nhận tình trạng khi nhận tài nguyên.', 'Verify access requirements and record the condition when receiving the resource.')],
    [t('Hoàn trả & hoàn tất', 'Return & complete'), t('Ghi nhận tình trạng sau sử dụng, xử lý sự cố và lưu lịch sử của buổi thực hành.', 'Record the condition after use, follow up on incidents and retain the session history.')]
  ];
  return <div className="public-site lab-public" id="dau-trang">
    <a className="public-skip" href="#noi-dung">{t('Đến nội dung chính', 'Skip to main content')}</a>
    <header className="public-header">
      <a className="public-brand" href="#dau-trang" aria-label="LAB Resource Manager"><FlaskConical aria-hidden="true" /><span>LAB<span>Resource Manager</span></span></a>
      <button className="public-menu" aria-expanded={menuOpen} aria-controls="public-nav" aria-label={t('Bật/tắt điều hướng', 'Toggle navigation')} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="public-nav" className={menuOpen ? 'is-open' : ''} aria-label={t('Điều hướng chính', 'Main navigation')}>
        {navigation.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}
      </nav>
      <div className="public-account-actions"><div className="public-language" role="group" aria-label={t('Ngôn ngữ', 'Language')}>{(['vi', 'en'] as const).map(value => <button key={value} aria-pressed={value === locale} lang={value} onClick={() => onLocaleChange(value)}>{value.toUpperCase()}</button>)}</div>
        {userName ? <button className="public-login" onClick={onWorkspace}>{t('Không gian làm việc', 'Workspace')} <ArrowRight size={16} aria-hidden="true" /></button> : <a className="public-login" href="#dang-nhap">{t('Đăng nhập', 'Sign in')} <ArrowRight size={16} aria-hidden="true" /></a>}
      </div>
    </header>
    <main id="noi-dung">
      <section className="public-hero public-container" id="gioi-thieu">
        <div className="lab-hero-copy"><h1>{t('Không gian cho', 'Make room for')}<br /><span>{t('thực nghiệm.', 'discovery.')}</span></h1>
          <p>{t('Phòng thực hành, thiết bị và lịch sử dụng — kết nối trong một quy trình rõ ràng, từ lúc chuẩn bị đến khi hoàn trả.', 'Laboratory rooms, equipment and schedules — connected in one clear workflow, from preparation to return.')}</p>
          <div className="public-actions"><a className="public-primary" href="#tai-nguyen">{t('Khám phá tài nguyên', 'Explore resources')} <ArrowRight size={18} aria-hidden="true" /></a><a className="public-secondary" href="#kiem-tra-lich"><CalendarDays size={18} aria-hidden="true" />{t('Kiểm tra lịch', 'Check schedule')}</a></div>
          <p className="public-small"><ShieldCheck size={17} aria-hidden="true" />{t('Đúng tài nguyên. Đúng thời điểm. Đúng điều kiện.', 'The right resource, time and access requirements.')}</p>
        </div>
        <figure className="lab-process-plate" aria-label={t('Quy trình sử dụng LAB', 'LAB access workflow')}>
          <div className="lab-plate-heading"><FlaskConical size={26} aria-hidden="true" /><strong>{t('Từ ý tưởng đến buổi thực hành.', 'From an idea to a practical session.')}</strong></div>
          <ol>{steps.map(([title], i) => <li key={title}><span className="lab-step-number">0{i + 1}</span><span>{title}</span><ArrowRight size={18} aria-hidden="true" /></li>)}</ol>
          <figcaption>{t('Lịch đặt · Điều kiện sử dụng · Bàn giao · Lịch sử', 'Scheduling · Access requirements · Handover · History')}</figcaption>
        </figure>
      </section>
      <section className="public-resources public-section" id="tai-nguyen"><div className="public-container"><div className="public-section-heading"><h2>{t('Chọn nơi bắt đầu.', 'Choose where to begin.')}</h2><p>{t('Tra cứu phòng và thiết bị, xem tư liệu và điều kiện sử dụng trước khi chọn lịch. Trạng thái thiết bị và lịch trống là hai thông tin riêng.', 'Browse rooms and equipment, review media and access requirements, then choose a time. Physical condition and calendar availability are separate.')}</p></div><PublicResourceCatalog onViewSchedule={onViewSchedule} onGuestBookingComplete={onGuestBookingComplete} /></div></section>
      <section className="public-section public-container lab-schedule-section" id="kiem-tra-lich" aria-labelledby="schedule-heading"><div className="public-section-heading"><h2 id="schedule-heading">{t('Kiểm tra lịch', 'Check schedule')}</h2><p>{t('Theo dõi việc cần xử lý và lịch đã xác nhận. Giờ hiển thị theo Việt Nam (UTC+07:00).', 'Review pending tasks and confirmed sessions. Times are shown in Vietnam time (UTC+07:00).')}</p></div>
        {scheduleContent || <div className="lab-schedule-signin"><CalendarDays size={32} aria-hidden="true" /><div><h3>{t('Lịch và công việc của bạn', 'Your schedule and tasks')}</h3><p>{t('Đăng nhập để xem lịch riêng và công việc theo vai trò. Bạn vẫn có thể xem khung giờ bận trong chi tiết tài nguyên phía trên.', 'Sign in for your personal schedule and role-specific tasks. Public busy times remain available in resource details above.')}</p></div><a className="public-primary" href="#dang-nhap">{t('Đăng nhập để xem lịch', 'Sign in to view schedule')} <ArrowRight size={17} aria-hidden="true" /></a></div>}
      </section>
      <section className="public-section lab-workflow-section" id="quy-trinh"><div className="public-container"><div className="public-section-heading"><h2>{t('Chuẩn bị rõ ràng.', 'Prepare with clarity.')}<br />{t('Thực hành chủ động.', 'Work with confidence.')}</h2><p>{t('Mỗi bước có người chịu trách nhiệm. Yêu cầu chỉ trở thành lịch xác nhận khi đáp ứng chính sách của LAB.', 'Each step has a responsible person. Requests become confirmed sessions only when laboratory policies are met.')}</p></div><ol className="public-workflow">{steps.map(([title, description], i) => <li key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol></div></section>
      <section className="public-section public-container lab-responsibilities" id="vai-tro"><div><h2>{t('Phối hợp trong LAB.', 'Work together in the LAB.')}</h2><p>{t('Rõ người phụ trách, rõ phạm vi công việc.', 'Clear responsibilities and access boundaries.')}</p></div><div className="public-feature-list">
        <article><GraduationCap aria-hidden="true" /><div><h3>{t('Sinh viên & giảng viên', 'Students & lecturers')}</h3><p>{t('Sinh viên gửi hoạt động thực hành theo lớp học phần. Giảng viên theo dõi và nhận xét trong nhóm được phân công; việc xét duyệt tài nguyên vẫn do cán bộ LAB thực hiện.', 'Students submit practical activities to their course groups. Assigned lecturers review learning goals; LAB staff remain responsible for resource approval.')}</p></div></article>
        <article><Wrench aria-hidden="true" /><div><h3>{t('Cán bộ LAB', 'LAB staff')}</h3><p>{t('Duyệt lịch, bàn giao, nhập xuất vật tư và lên lịch bảo trì trong LAB được phân công. Kiểm tra lịch bị ảnh hưởng trước khi thay đổi kế hoạch.', 'Approve bookings, manage handovers, record stock movements and schedule maintenance in assigned laboratories. Review affected bookings before changing plans.')}</p></div></article>
        <article><ShieldCheck aria-hidden="true" /><div><h3>{t('Quản trị viên', 'Administrator')}</h3><p>{t('Quản lý toàn bộ tài nguyên, kho vật tư, tài khoản, phân công LAB và lớp học phần trên hệ thống.', 'Manage resources, inventory, accounts, laboratory assignments and course groups across the system.')}</p></div></article>
      </div></section>
      {children && <section id="dang-nhap" className="public-auth" aria-label={t('Đăng nhập', 'Sign in')}>{children}</section>}
    </main>
    <footer className="public-footer public-container"><div><a className="public-brand" href="#dau-trang"><FlaskConical aria-hidden="true" /><span>LAB<span>Resource Manager</span></span></a><p>{t('Quản lý tài nguyên cho học tập và thực nghiệm.', 'Shared resources for learning and experimentation.')}</p></div><div><strong>{t('Khám phá', 'Explore')}</strong><a href="#tai-nguyen">{t('Phòng & thiết bị', 'Rooms & equipment')}</a><a href="#kiem-tra-lich">{t('Kiểm tra lịch', 'Check schedule')}</a><a href="#quy-trinh">{t('Quy trình sử dụng', 'How it works')}</a></div><div><strong>{t('Tài khoản', 'Account')}</strong>{userName ? <><button onClick={onWorkspace}>{userName}</button><button onClick={onLogout}>{t('Đăng xuất', 'Sign out')}</button></> : <><a href="#dang-nhap">{t('Đăng nhập', 'Sign in')}</a><button onClick={onRegister}>{t('Đăng ký tài khoản', 'Create account')}</button></>}<a href="#vai-tro">{t('Vai trò & trách nhiệm', 'Roles & responsibilities')}</a></div><p className="public-footer-note">Lab Resource Manager · {t('Đồ án tốt nghiệp. Tư liệu tham khảo có ghi nguồn; trạng thái giám sát chỉ có khi kết nối nguồn dữ liệu.', 'Graduation project. Reference media is attributed; monitoring requires a connected data source.')}</p></footer>
  </div>;
}
