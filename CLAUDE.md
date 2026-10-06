# Claude — Lab Resource Manager

## Latest coordination checkpoint — 2026-10-06

The five-agent redesign entry point is `docs/ui-redesign/TEAM_PLAN.md`, with
`UI_CONTRACT.md`, `REDESIGN_SPEC.md`, `PROGRESS.md` and per-task prompts.
The user has now authorized publication of the local baseline to main.
Earlier Git/runtime handoff sections below are dated snapshots: verify HEAD
and origin/main rather than assuming their old revisions still apply.
Contributors must use their assigned file allowlist and independent checkout.

Đây là đồ án tốt nghiệp đang được phát triển, không phải dự án mới. Trả lời và
trao đổi với chủ dự án bằng tiếng Việt. Bản bàn giao đầy đủ của **local và GitHub**:
[docs/CLAUDE_PROJECT_CONTEXT_20261006.md](docs/CLAUDE_PROJECT_CONTEXT_20261006.md).

## Bắt đầu mỗi phiên

1. Chạy `git status --short`, `git branch --show-current`, `git worktree list`.
2. Đọc `AGENTS.md` và tuân thủ thứ tự đọc bắt buộc ở đó. Quy tắc áp dụng cho Claude
   cũng như mọi coding agent khác.
3. Đọc bản bàn giao trên, `docs/CURRENT_STATE.md`, `docs/DECISIONS.md`,
   `PRODUCT.md`, `DESIGN.md`; mở code và bằng chứng của phần cần sửa.
4. Phân biệt yêu cầu, quyết định, code hiện có và kết quả đã kiểm chứng. Các báo
   cáo Batch/PR cũ là ảnh chụp tại revision của chúng, không phải trạng thái live.

## Trạng thái bàn giao ngày 2026-10-06

- Thư mục làm việc chính: `C:/Projects/lab-resource-manager`, nhánh local
  `codex/lab-workspace-ui-draft`, HEAD `43b1832`. Có nhiều thay đổi chưa commit;
  không reset, clean, stash hoặc ghi đè chúng để làm cây code sạch.
- GitHub: https://github.com/phung086/lab-resource-manager ; default branch main.
  PR #22 đã merge, main tại `a5472d4`; nhánh remote cũ đã xóa. HEAD local và main
  có cùng cây code đã commit, nhưng working tree local chứa các cải tiến mới.
- Main để so sánh: `C:/Projects/lab-resource-manager-main`, detached `a5472d4`.
  Source UI giữ theo main; package scripts có sửa local để gọi launcher chung.
- Worktree `C:/Users/Admin/.codex/worktrees/ebb8/lab-resource-manager` ở `790727c`
  là bản cũ, không phải bản đang xem ở 5173.
- Không đưa phần chưa commit lên GitHub hoặc tuyên bố đã đồng bộ nếu chưa có
  yêu cầu và bằng chứng. Kiểm tra lại remote trước khi báo trạng thái hiện tại.

## Ranh giới sản phẩm

React/Vite + Node.js/Express + Prisma + PostgreSQL 16. Booking là trục chính:
tìm tài nguyên → kiểm tra lịch/điều kiện → yêu cầu → phê duyệt → bàn giao → trả →
hoàn tất, với lịch sử/audit thật. Backend quyết định quyền, nghiệp vụ và trạng thái.

Giữ đúng role `ADMIN`, `LAB_STAFF`, `LECTURER`, `STUDENT`; giữ canonical enums.
`NO_SHOW` là outcome/event. `Resource.operationalStatus` là trạng thái vật lý;
availability được suy ra. `UserLabAssignment` quyết định phạm vi nhân viên LAB.
Không thay framework, làm lại kiến trúc, sửa applied migrations, dùng `db push`,
nới RBAC, giả success/telemetry/history hoặc tự bắt đầu Batch mới.

## Hướng cải tiến đã được người dùng nêu

Giao diện phải đẹp, có cá tính, tương phản và màu thống nhất, thao tác nhanh,
không mang cảm giác mẫu AI. Tham khảo sản phẩm quản lý hiện đại nhưng giữ nghiệp
vụ và bản sắc LAB. Menu phải đóng/mở được: rail gọn mặc định, drawer tìm kiếm,
ghim tùy chọn trên desktop, thanh ngang ở màn hình hẹp. Giữ VI/EN, bản nháp form,
focus, responsive và trạng thái lỗi thật. Không thay lại thành sidebar luôn mở.

## Runtime local chung

Docker group `lrm-local-review`: một API 8000 + một PostgreSQL + volume
`lrm-local-review_review-data`. Hai frontend 5173/5180 dùng chung dữ liệu; đây là
so sánh frontend với backend nhánh. `npm run dev` chỉ chạy Vite sau health check.
`npm run dev:backend` bật container có sẵn; rebuild chỉ theo nhu cầu rõ ràng.
Không dựng lại bộ Docker theo mỗi branch hoặc mỗi lần chạy. Lệnh/giới hạn chi
tiết nằm trong README và bản bàn giao.

## Cách tiếp tục

Kiểm tra phần liên quan, nêu phạm vi và làm thay đổi có thể review; chạy các
gate phù hợp, kiểm tra diff, ghi bằng chứng và giới hạn. Bảo toàn thay đổi của
agent khác và thống nhất người phụ trách trước khi cùng sửa một file. Không
chuyển khóa, token, mật khẩu thật, `.env` hoặc dump database sang project context.
Không coi việc nạp context là yêu cầu triển khai toàn bộ backlog.

## Claude local workflow — setup 2026-10-06

- Setup only is complete; do not start redesign merely because this section exists.
- Use `/lab-preflight` to verify tools, live runtime and the exact checkout.
- Use `/lab-product-redesign audit`, `implement`, `resume` or `verify` for a requested redesign.
- Workflow/run commands: [.claude/WORKFLOW.md](.claude/WORKFLOW.md).
- Product UI rules: `.claude/rules/frontend-redesign.md`.
- A requested major redesign permits coherent frontend composition/component changes;
  do not reduce it to a color/spacing patch. Keep the canonical stack, contracts and
  required capabilities. Explicit prior UX decisions stay binding unless superseded
  by the user's actual instructions; identify a real conflict, not routine styling.
- After selecting a design direction, record it in `docs/ui-redesign/REDESIGN_SPEC.md`.
  Mark proposed/accepted decisions honestly; update related DESIGN.md/guidelines only
  when the decision is actually authorized. Never create a competing design authority.
- TasteSkill is optional support for public pages/visual quality, not the governing
  system for tables, calendars, operational dashboards or multi-step booking.
- Prefer the existing runtime on 5173/API 8000. Desktop preview or Playwright MCP
  must run locally. A remote VM's localhost is not this machine.
- Project settings retain normal command permissions; deny patterns are guardrails,
  not a sandbox. Never evade them through another shell, script or tool.
