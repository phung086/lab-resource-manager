# Tài liệu dự án

## Báo cáo đồ án tốt nghiệp

Bản nộp có 68 trang, gồm một trang bìa, hai phiếu nhận xét để điền và
50 trang từ Mở đầu đến Kết luận. Báo cáo có 24 hình và 37 bảng được
đánh số. Chương 4 ghi kết quả ngày 20/11/2026 trên ứng dụng đang chạy
và PostgreSQL kiểm thử riêng. Thay bằng phiếu đã ký và bổ sung biên bản
cùng bản giải trình khi có hồ sơ chính thức.

[Báo cáo Word](submission/Bao-cao-do-an-Lab-Resource-Manager-Ban-nop.docx) ·
[Báo cáo PDF](submission/Bao-cao-do-an-Lab-Resource-Manager-Ban-nop.pdf) ·
[Minh chứng kiểm thử](submission/Minh-chung-kiem-thu-LAB-2026-11-20.zip)

Khi xuất bản báo cáo mới, đối chiếu nội dung và bố cục với bản đang dùng,
kiểm tra cả Word lẫn PDF, rồi cập nhật các liên kết trên và xóa bản đã
được thay thế khỏi thư mục submission.

## Ôn bảo vệ và đọc mã nguồn

[Cẩm nang đọc code và bảo vệ đồ án](Cam-nang-doc-code-va-bao-ve-Lab-Resource-Manager.docx)
dẫn từ màn hình đến API và dữ liệu theo từng luồng, kèm câu hỏi của hội đồng
và bài tự luyện trong VS Code.

## Hồ sơ Word tiếng Việt

Mở theo thứ tự bên dưới hoặc chọn tài liệu theo nội dung cần trình bày.

| STT | Tài liệu |
|---|---|
| 01 | [Lý do và phạm vi đề tài](submission/01-Ly-do-va-pham-vi-de-tai.docx) |
| 02 | [Kế hoạch hoàn thiện và nghiệm thu](submission/02-Ke-hoach-hoan-thien-va-nghiem-thu.docx) |
| 03 | [Đặc tả yêu cầu phần mềm SRS](submission/03-Dac-ta-yeu-cau-phan-mem-SRS.docx) |
| 04 | [Kiến trúc, cấu trúc và thiết kế dữ liệu](submission/04-Kien-truc-cau-truc-va-ERD.docx) |
| 05 | [Quy ước mã nguồn và giao diện](submission/05-Quy-uoc-ma-nguon-va-giao-dien.docx) |
| 06 | [Kiểm thử, bảo mật và kết quả](submission/06-Kiem-thu-bao-mat-va-ket-qua.docx) |
| 07 | [Kịch bản trình bày và demo](submission/07-Kich-ban-trinh-bay-va-demo.docx) |

## Tài liệu kỹ thuật

Các tài liệu Markdown dưới đây là nguồn đối chiếu khi phát triển, kiểm thử và
cập nhật bộ Word. Đọc [trạng thái dự án](CURRENT_STATE.md) để biết kết quả theo
từng mốc. Hai PDF gốc của giảng viên nằm trong [thư mục instructor](instructor/).

| Cần hiểu | Tài liệu |
|---|---|
| Truy từ câu hỏi đến đúng tệp và dòng code | [Bàn giao kỹ thuật và tra cứu mã nguồn](TECHNICAL_HANDOFF.md) |
| Đề tài và phạm vi | [PROJECT_DIRECTION](PROJECT_DIRECTION.md), [SRS](srs.md), [PRODUCT](../PRODUCT.md) |
| Kế hoạch hoàn thiện | [GRADUATION_PLAN](GRADUATION_PLAN.md) |
| Trạng thái và quyết định | [CURRENT_STATE](CURRENT_STATE.md), [DECISIONS](DECISIONS.md) |
| Cấu trúc và quy tắc | [PROJECT_STRUCTURE](PROJECT_STRUCTURE.md), [convention](convention.md), [AGENTS](../AGENTS.md) |
| Frontend/backend | [Frontend](FRONTEND_GUIDELINE.md), [Backend](BACKEND_GUIDELINE.md) |
| ERD | [Core ERD](DB-erd/core-erd.md) |
| UI/UX | [Style guideline](UI-UX-style-guideline/README.md) |
| Hướng triển khai, báo cáo vận hành và mô phỏng | [Đối chiếu](IMPLEMENTATION_DIRECTION_20261005.md) |
| AI | [Setup](AI_ASSISTANT_SETUP.md), [MCP contract](AI_ASSISTANT_MCP.md) |
| API hàng đợi | [Pagination contract](WORKSPACE_QUEUE_PAGINATION_20261003.md) |
| Chạy/tích hợp/kiểm thử | [README](../README.md), [Integration](INTEGRATION_GUIDE.md), [System tests](SYSTEM_TEST_GUIDE.md) |
| Deploy/demo | [Deployment](DEPLOYMENT.md), [Demo](GRADUATION_DEMO_RUNBOOK.md), [Real data](REAL_DATA_RUNBOOK.md) |
| Nhà cung cấp tùy chọn | [Integration setup](INTEGRATION_SETUP_GUIDE_20261003.md) |
| Security và triển khai thật | [Threat model](security/threat-model.md), [Checklist](PRODUCTION_READINESS.md) |
| Việc còn lại | [Backlog](backlogs/README.md) |

Ghi kết quả hoặc giới hạn mới vào tài liệu kỹ thuật tương ứng. Git giữ lịch sử
các kế hoạch và ghi chú QA đã kết thúc. Ảnh và log kiểm thử tạm nằm ngoài bộ hồ sơ.
