import React from "react";
import { CalendarCheck, Search, ClipboardCheck, ArrowRight } from "lucide-react";

export function AuthIdentity({ registration = false }: { registration?: boolean }) {
  return <div className="auth-panel auth-panel-identity identity-composition">
    <div className="identity-brand"><CalendarCheck size={25} aria-hidden="true" /><strong>LAB RESOURCE MANAGER</strong></div>
    <div className="identity-message"><h1>{registration ? "Bắt đầu buổi thực hành tiếp theo." : "Tài nguyên đúng.\nLịch trình rõ ràng."}</h1><p>Từ tìm phòng, chọn thiết bị đến bàn giao và hoàn trả. Một không gian chung cho học tập, nghiên cứu và vận hành phòng thí nghiệm.</p></div>
    <svg className="lab-plan-illustration" viewBox="0 0 400 150" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="398" height="148" rx="12" stroke="currentColor" />
      <path d="M132 1v148M266 1v148M1 109h398" stroke="currentColor" />
      <rect x="28" y="29" width="76" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M66 79v12M50 91h32M43 43h19M43 53h40M43 63h29" stroke="currentColor" strokeWidth="2" />
      <rect x="166" y="23" width="65" height="66" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M166 45h65M166 67h65M180 34h9M180 56h9M180 78h9" stroke="currentColor" strokeWidth="2" />
      <path d="M315 26h32M320 26v30l-16 28a5 5 0 0 0 4 7h46a5 5 0 0 0 4-7l-16-28V26M313 73h36" stroke="currentColor" strokeWidth="2" />
      <path d="M28 128h76M166 128h65M304 128h54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <ol className="identity-journey"><li><Search size={17} aria-hidden="true" />Tìm tài nguyên<ArrowRight size={14} aria-hidden="true" /></li><li><CalendarCheck size={17} aria-hidden="true" />Đặt lịch<ArrowRight size={14} aria-hidden="true" /></li><li><ClipboardCheck size={17} aria-hidden="true" />Bàn giao</li></ol>
    <footer className="auth-identity-footer">{registration ? "Tài khoản mới có vai trò sinh viên. Vai trò khác do quản trị viên phân công." : "Dành cho sinh viên, giảng viên và cán bộ phòng thí nghiệm."}</footer>
  </div>;
}
