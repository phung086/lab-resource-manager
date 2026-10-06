# web-calendar — ChatGPT web 1

Thiết kế lại trải nghiệm xem lịch trong ba component được giao: toolbar có nhóm lọc và điều hướng thời gian rõ ràng; event đọc nhanh tên, giờ và trạng thái. Kiểm tra compact/full event, day/week/month đang hỗ trợ, lịch dày, nhãn dài và màn hình hẹp. Giữ event click, chọn ô lịch, filter, pagination nếu có, timezone Việt Nam và phân biệt bảo trì/booking. Không thay thư viện lịch, thuật toán availability hoặc API.

Scope class: `lrm-calendar-redesign`. Branch: `codex/lrm-ui-web-calendar`.

Exact editable paths:
- `frontend/src/components/SmartCalendarView.tsx`
- `frontend/src/components/calendar/CalendarToolbar.tsx`
- `frontend/src/components/calendar/CalendarEventCard.tsx`
- `frontend/src/styles/redesign/calendar.css`
- `docs/ui-redesign/tasks/web-calendar/REPORT.md`

Use existing tokens and behavior; see UI_CONTRACT and TEAM_PLAN for gates.
