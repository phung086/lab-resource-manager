# web-operations — ChatGPT web 2

Thiết kế lại BookingOperationCard và BookingWorkflowTimeline: thứ tự tài nguyên/thời gian/người dùng/trạng thái/hành động rõ ràng, timeline dễ đọc, phân biệt bước hiện tại và lịch sử thật. Xử lý trạng thái kết thúc, lý do dài, lịch sử rỗng và thẻ dùng ở nhiều màn hình. Giữ exports/props, permission gates, handlers, điều kiện hành động và canonical statuses. Không sửa BookingOperationsView hoặc quy trình chuyển trạng thái.

Scope class: `lrm-operation-redesign`. Branch: `codex/lrm-ui-web-operations`.

Exact editable paths:
- `frontend/src/components/features/operations/BookingOperationCard.tsx`
- `frontend/src/components/features/operations/BookingWorkflowTimeline.tsx`
- `frontend/src/styles/redesign/operations.css`
- `docs/ui-redesign/tasks/web-operations/REPORT.md`

Use existing tokens and behavior; see UI_CONTRACT and TEAM_PLAN for gates.
