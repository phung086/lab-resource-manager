# QA — ma trận UI chỉ đọc, 22–23/10/2026

Cập nhật kiểm chứng ngày23/10. Checkout C:/Projects/lab-resource-manager, nhánh codex/claude-qa-20261021, baseline c41b892. Chỉ kiểm thử, sửa harness và ghi báo cáo; chưa sửa mã/cấu hình/contract/schema ứng dụng, chưa commit/push/deploy.

**Kết luận: 18/18 ca shell/navigation/locale smoke PASS; chưa toàn hệ thống PASS.** Hai ca ADMIN1440 do Claude chạy, 16 ca còn lại do Codex chạy khi Claude bị lỗi compact. Không cộng lại các ca desktop đã có sau khi sửa riêng trình tự mobile.

## Bằng chứng và cách ghép lượt chạy

- Harness: frontend/qa_ui_matrix.mjs. Backend GET /api/health và frontend /login trả200 trước lượt Codex.
- Hai ADMIN1440 VI/EN: JSON mới03:58:50Z/04:00:58Z ngày23/10, tool result04:00:59Z; mỗi ca12route.
- Lượt Codex16ca:10desktop PASS,6mobile FAIL ở bước locale sau mở drawer. Đã giữ nguyên JSON FAIL ban đầu, không xóa dấu vết.
- Sau tái hiện và sửa riêng harness:6/6mobile PASS. Desktop không chạy lại vì không đổi assertions hoặc luồng desktop.
- Tập ghép18JSON và54PNG nằm ở C:/Users/Admin/.codex/lab-controller/qa-controller-readonly-20261023/final-results/. coverage.json ghi runner, timestamp, hash từng JSON và hash harness ứng với từng lượt. manifest.json và run.log/mobile-rerun.log ở thư mục cha; initial-results/ giữ6FAIL ban đầu.
- .qa/evidence/summary.json hiện chỉ chứa lượt6mobile cuối, không phải tổng18ca. Không dùng file này để tự kết luận toàn bộ lượt chạy.
- Không đưa credential/token hoặc toàn bộ .qa lên Git. Không seed/reset/cleanup dữ liệu.

## Ma trận hiện tại

| Role | Locale | 1440×900 | 1920×1080 | 390×844 |
|---|---|---|---|---|
| ADMIN | VI | PASS | PASS | PASS |
| ADMIN | EN | PASS | PASS | PASS |
| LAB_STAFF | VI | PASS | PASS | PASS |
| LAB_STAFF | EN | PASS | PASS | PASS |
| CUSTOMER | VI | PASS | PASS | PASS |
| CUSTOMER | EN | PASS | PASS | PASS |

PASS ở đây yêu cầu đăng nhập qua form thật, route overview đúng, shell role đúng, html.lang đúng, đổi ngôn ngữ thành công, không tràn ngang, nav must/mustNot đúng và không ghi nhận console/pageerror trong cửa sổ chạy. Mobile mở và đóng drawer thật trước khi kiểm toggle. Desktop có128 lượt mở route:4caADMIN×12 +4caLAB_STAFF×12 +4caCUSTOMER×8. JSON đã đối chiếu đúng URL và locale của mỗi route, không ghi nhận429.

**Giới hạn:** route smoke kiểm main có nội dung/no404/errors; chưa kiểm chức năng của từng form/bảng, trạng thái dữ liệu, accessibility đầy đủ hoặc RBAC server. Nav ẩn/hiện và shell role không chứng minh quyền API. Không suy ra toàn bộ nghiệp vụ đạt từ18ca này.

## Findings và phân loại

### H-03 — lỗi trình tự của harness mobile, đã xác nhận và sửa

Harness mở menu để đọc data-nav-id rồi bấm toggle ở header khi menu vẫn mở. AppLayout.tsx đặt main inert khi navigationOpen; Sidebar là dialog có scrim và close control. Probe browser thật390px xác nhận mainInertBefore=true, click trial bị chặn; đóng drawer thì mainInertAfter=false và locale đổi sangen. Ảnh/JSON ở mobile-probe/ trong thư mục evidence trên.

Sửa chỉ frontend/qa_ui_matrix.mjs: bỏ nuốt lỗi mở drawer, chờ visible thật, đóng bằng nút close và chờ hidden rồi mới toggle. Giữ nguyên assertions role/auth/locale/overflow/errors. node --check PASS;6ca mobile chạy lại PASS. Đây là6FAIL giả do test, chưa phải lỗi locale của sản phẩm. Probe đầu tiên thiếu fixtureJSON và dừng trước login; lần hợp lệ dùng đúng fallback có sẵn của harness, không tạo account/fixture mới.

### A-01 — khả năng thiếu đường vào audit, chưa chốt lỗi sản phẩm

Sidebar khai báo logs nhưng isTabEnabled dùng WORKSPACE_ROUTES và registry không có key logs. Claude đã bỏ logs khỏi expected nav để kiểm hiện trạng. Việc đó không giải quyết yêu cầu audit: SRS dòng338 và ADR-022 cho ADMIN đọc toàn hệ thống, LAB_STAFF đọc theo LAB được phân công. Cần xác minh entrypoint khác/quyết định được duyệt và quyền API thực tế trước khi gọi BUG hoặc N/A. Chưa chọn thêm màn logs hay áp lại rule ADMIN-only cũ. Mức độ và phương án còn chờ đối chiếu/trao đổi.

Bổ sung23/10: API GET /api/audit-events có thật và đã kiểm13 assertion với token hợp lệ/current role xác nhận qua /auth/me. ADMIN đọc được tổng153 event; LAB_STAFF được phân cả2 LAB đọc được148 event,100 dòng trang đầu đều đúng LAB; explicit assigned LAB trả200. CUSTOMER đã đăng nhập trả403; anonymous trả401 được ghi riêng là thiếu xác thực. Không có key password/secret/token/OTP/hash trong beforeState/afterState/metadata của100 event đầu được đọc cho mỗi role. Đây là scan tên key theo mẫu, không chứng minh mọi giá trị lịch sử đã an toàn.

Evidence: audit-reads/result.json và audit-read-check.mjs dưới thư mục evidence cha. Không tạo fixture hoặc mutation nghiệp vụ; chỉ3 login vào account có sẵn và GET audit/identity/assignment. Cross-LAB negative và staff không LAB chưa chạy live vì staff hiện có được phân cả2/2 LAB; không gọi đó là PASS. Source systemAuditService.js:104–123 có fail-closed/no-LAB và scope theo assignment; đây là bằng chứng source riêng, không thay cho test live. Lượt13 assertion ban đầu chỉ đọc trang đầu. Tìm kiếm source frontend hiện chỉ thấy nhãn audit ở Sidebar/AppLayout, không thấy consumer audit API; chưa có quyết định được duyệt để gọi N/A hoặc chứng minh một màn audit bắt buộc riêng. Vì API có quyền đọc, chưa kết luận toàn bộ chức năng audit bị thiếu.

Lượt bổ sung06:00Z kiểm đúng phần pagination còn thiếu,18 assertion PASS API, không chạy lại ma trận UI hoặc13 assertion cũ. Handler audit có cùng hash với source đã review. Dùng cutoff thời gian cố định và đọc hết2 trang: ADMIN100+53=153, staff100+48=148; không trùng ID, đúng tổng, thứ tự thời gian giảm dần. Tập148 ID staff khớp chính xác tập ADMIN thuộc2 LAB được phân;5 event có labId=null chỉ có ở ADMIN. Trang vượt cuối rỗng giữ tổng; page=0 và limit=101 bị400. Scan tên key state/metadata trên toàn bộ tập trả về không thấy mẫu password/secret/token/OTP/hash; không chứng nhận giá trị tùy ý an toàn. Chỉ login2 account có sẵn và GET, không tạo audit fixture. Evidence: audit-reads/pagination-result.json và pagination-check.mjs. Cross-LAB/no-LAB negative live vẫn NOT RUN; đây là kiểm API, chưa chứng nhận UI audit hoặc phân trang các queue khác.

Bổ sung23/10 (source-only, chưa có UI audit): xác nhận gap theo3 chiều, không phải suy đoán. (1) `frontend/src/workspaceRoutes.js` không có key `logs` (grep rỗng) ⇒ `isTabEnabled('logs')` trong `frontend/src/config/featureFlags.ts` luôn false ⇒ item "Audit logs" ở `frontend/src/components/Sidebar.tsx:59` (gate `role === 'ADMIN'` tại dòng65) là dead code điều hướng. (2) `frontend/src/App.jsx` không có nhánh `activeTab === 'logs'` (17 nhánh, không có nhánh nào render audit) ⇒ `frontend/src/components/AppLayout.tsx:170` khai báo `tabTitles.logs` cũng không dùng tới. (3) grep path `/audit-events` trên toàn frontend không có consumer nào ⇒ đây là vùng dọc backend duy nhất có 0 consumer. Backend `backend/src/routes/auditEvents.js` đã hoàn chỉnh: strict zod query (page/limit≤100/action/targetType/targetId/actorId/labId/resourceId/from/to), `requireAuth` + `requireRole(ADMIN, LAB_STAFF)`; `backend/src/services/systemAuditService.js` có 16 `AUDIT_ACTIONS`, 7 `AUDIT_TARGET_TYPES`, `sanitizeAuditData` loại key password/secret/token/otp/codeHash/hash, staff scope theo `userLabAssignment`, fail-closed `NO_ASSIGNED_LABS`. Phân loại: backend READY, frontend MISSING (candidate vertical slice) — chưa gọi là BUG sản phẩm vì chưa có quyết định được duyệt về việc audit phải là màn riêng hay chỉ là báo cáo/API. Label: PASS (API read-only + phân trang + RBAC ở tầng API), FAIL/NOT-APPLICABLE-YET (màn UI audit chưa tồn tại), NOT RUN (cross-LAB/no-LAB negative live, UI audit E2E). Không sửa source, không tạo route/render.

### Q-04 — GET resource có thể ghi lazy expiry, cần thu hẹp kết luận chỉ đọc

Đối chiếu source sau lượt catalogue: resources.js:179/249/296 gọi expirePaymentHolds trên GET list/schedule/detail. bookingPaymentHoldService.js:42–53 có thể đổi booking thành CANCELLED, payment pending thành expired, hủy reminder, ghi usage log và notification nếu gặp hold quá hạn chưa thanh toán. Đây là hành vi source xác nhận, chưa phải bug sản phẩm hoặc bằng chứng DB đã bị thay đổi bởi lượt test.

Vì vậy guard chặn POST/PATCH không chứng minh DB không đổi. Kết luận đúng cho18 smoke và2 catalogue scenario là không gửi business mutation request trực tiếp; tác động lazy expiry phía server chưa được kiểm kê và không có snapshot trước/sau để quy cho test. Giữ nguyên JSON/PNG đã ghi; không sửa lịch sử thành PASS về bất biến DB, không cleanup/reset. Dừng các probe resource/schedule/detail mới trên demo cho đến khi xác minh backend+DB QA tách biệt hoặc chứng minh đường đọc không có tác động ghi. Các GET khác cần xem handler trước khi gọi; audit GET ở trên chỉ đọc dữ liệu theo source đã kiểm.

ResourceDTO mới chỉ review source: serializer có allowlist top-level, LAB select giới hạn id/code/name/isActive/labPolicy; booking schedule select không lấy requester/private title, internal maintenance notes/operator không được chọn. LabPolicy/ResourceMedia schema đã đối chiếu. Chưa có live DTO verdict cho mọi dữ liệu/nested value; không gọi PASS privacy chỉ từ tên trường. Evidence và hash source ở audit-reads/source-review.json.

### C-01 — Claude bị chặn bởi context/compaction

Phiên8e58146c dừng Autocompact thrashing04:00:59Z. Một native compact khi đã dừng trả lỗi “summarization produced empty response” lúc04:26:14Z. Không phải lỗi ứng dụng LAB hoặc kết quả QA. Đã lưu checkpoint, không gửi chồng/đổi provider/model/security hay tạo liên phiên. Vòng phản biện với Claude chưa hoàn tất.

Phục hồi23/10: sau human yêu cầu xử lý chủ động, fresh UI và compact_boundary UUID fafc30b2-ffde-402f-961f-f600507059e5 xác nhận compact mới thành công06:30:41Z; controller không bấm compact thêm trong lượt này. Đã gửi đúng một chỉ đạo QA ngắn, receipt d6ed1184-b4ca-4863-9be6-6d0da732fba6 lúc06:37:40Z. Claude thực sự đọc qa-recovery-20261023-0630.md, chạy xác minh branch/HEAD và locate/read auth-session service, có tool results thành công từ06:38:15Z. Đây là bằng chứng tiếp tục thực thi; chưa phải kết quả PASS invariant auth-session hoặc toàn hệ thống. Tiếp tục từng bước nhỏ/evidence riêng, không replay brief hay chạy lại coverage đã có. Nếu context lại không dùng được sau xử lý có giới hạn, lưu checkpoint/handoff và dùng đúng một phiên tiếp tục theo quyền human đã cho, thay vì chỉ lặp blocker; vẫn không đổi model/security hoặc tạo phiên để né lỗi gateway.

### Q-05 — mật khẩu fixture demo xuất hiện trong output QA

Đã xác nhận tool result c44908e8-bb34-4ef1-b452-c55dd6962189 lúc07:13:49Z của lệnh tìm literal trong seed có in mật khẩu fixture demo. Không lặp lại giá trị ở đây. Đây là vi phạm quy trình giữ credential ngoài log/prompt, chưa phải bug sản phẩm. Probe cuối đọc credential trong memory và artifact không chứa password/token; việc đó không xóa được sự cố ở tool output trước đó. Giữ nguyên hiện trạng/log, không tự reset/rotate/cleanup hoặc sửa bảo mật. Chỉ đạo sửa báo cáo và cấm cat/grep credential đã chuẩn bị; chưa gửi do Computer Use không activate/xác minh được đúng cửa sổ Claude. Provenance/giới hạn ở session-reads/codex-review.json.

Cập nhật lượt08:07Z: cửa sổ131268 đã activate thành công; fresh UI xác minh đúng URI local_5f918287, project/branch/title và nội dung bàn giao. Blocker UI trước đó đã hết. Claude đang compact một yêu cầu mới của human về đề xuất UI/chức năng trong vài tuần còn lại; controller không gửi chồng và đã release lease. Follow-up Q-05/coverage/isolation vẫn chưa gửi, chờ final mới để gộp đúng delta. Đề xuất chat08:06 chưa phải evidence lỗi sản phẩm: nhận xét mobile navigation bị lỗi mâu thuẫn với kết quả H-03 và6mobile PASS sau sửa harness, cần được phản biện trước khi chọn phương án. Mốc/giới hạn ở claude-progress-0807.json.

## Auth-session GET23/10 — invariant không kéo dài idle expiry

Claude final thật07:27:18Z, UUID2f0cc14d-3aa6-4cc3-8083-917b1a8c7d4e; probe Node foreground đã kết thúc. Codex review evidence.json/probe.mjs và source auth.js:153–158, authTokens.js:39–60, requireAuth. Chấp nhận PASS giới hạn một session ADMIN có sẵn: login200,3 GET /auth/session200, audit GET200; lastActiveAt/idleExpiresAt là timestamp hợp lệ, không null và không đổi qua gap4s và sau audit GET. Không POST /auth/activity hoặc GET resource. Login tạo một AuthSession row, là hiệu ứng auth-session đã được cho phép; không suy ra DB bất biến tuyệt đối.

Evidence: session-reads/evidence.json, probe.mjs, FINAL.md, err.log rỗng và codex-review.json cùng thư mục evidence cha; có hash artifact. Chưa kiểm các role còn lại, idle/absolute timeout boundary, explicit activity extension, logout/credential revocation hoặc races. Verdict của probe cần hardening non-null/date và audit-status gate ở phiên bản harness sau; dữ liệu lượt hiện tại đã được Codex kiểm độc lập nên giữ PASS giới hạn, không sửa artifact đã chạy. Gap UI1440/1920/mobile trong final Claude bị stale:18/18 smoke đã có, không rerun hoặc đổi thành NOT RUN. Phản biện Q-05 và kế hoạch QA isolation tiếp theo đã chuẩn bị nhưng chưa dispatch do lỗi activate/focus UI; shared lease đã release, không bypass kênh khác.

## Functional reads danh mục23/10 — phạm vi CUSTOMER

Đã kiểm2 kịch bản CUSTOMER: VI1440×900 và EN1920×1080, mỗi kịch bản10 kiểm tra có dữ liệu thật. Nhóm mặc định Thiết bị hiển thị17 tài nguyên đúng loại; chọn Tất cả hiển thị25, khớp tập code từ API. Search theo code trả đúng1; query không khớp trả0 và không báo lỗi; xóa search phục hồi25. Lọc ROOM trả6 đúng category; kết hợp LAB trả3 đúng LAB; xóa bộ lọc chi tiết giữ nhóm Phòng đang chọn, rồi chọn Tất cả phục hồi25. Sắp xếp code và overflow được đối chiếu bằng DOM, không chỉ đếm ký tự trang.

Bằng chứng: functional-resources/verified-coverage.json,2JSON, script và8PNG trong thư mục evidence cha nêu trên. Kết quả cuối PASS_FUNCTIONAL_READS; không console/pageerror, không business mutation request. Sau login, guard test chỉ cho GET/HEAD/OPTIONS và POST /api/auth/activity sẵn có (một request/kịch bản để duy trì đúng phiên khi người dùng thao tác); không đổi auth/RBAC hoặc tạo tài khoản.

Các probe trước sai giả định về nhóm mặc định/nhóm độc lập với bộ lọc và chặn cả auth activity nên được giữ riêng ở first-attempt/, second-attempt/, group-assumption-diagnostic.json. Không tính chúng là lỗi sản phẩm; test cuối đã kiểm đúng trình tự/fixture/contract hiện hành. Catalogue này không phân trang; queue pagination chưa được kiểm. Chưa kiểm functional ADMIN/STAFF, toàn bộ trường DTO public-safe, pricing/schedule/detail hoặc nghiệp vụ ghi. Hai kịch bản này không cộng vào18case smoke như một lượt full-system mới.

## Support API reads23/10 — phạm vi lịch sử và quyền đọc

Đã kiểm handler/dependency trước khi gọi: supportService.js:21–38,63–96 chỉ đọc metadata/list/detail; transaction RepeatableRead không gọi dispatch hoặc ghi presence. Theo SRS Appendix F/LAB-CHAT-04, ADMIN đọc toàn bộ, staff theo conversation và LAB hiện hành, CUSTOMER chỉ của mình. Không gọi assistant-context hoặc POST presence/request/send/close/requeue.

Lượt30 assertion PASS API: ba role có login/current identity hợp lệ; metadata2 LAB, poll2s/heartbeat15s và5 quick-reply key đúng. ADMIN đọc2 conversation, staff đọc1, CUSTOMER hiện có0. Tập staff khớp current LAB/handler scope; tập CUSTOMER khớp owned subset nhưng chưa có positive populated history của account này. ADMIN và staff đọc được detail có6/8 message, sequence tăng và cursor đúng; không xuất nội dung chat/PII vào evidence. ADMIN200 cùng object làm positive control cho CUSTOMER404 ở conversation khác chủ và staff404 ở conversation không được phân. Fingerprint không xuất hiện trong list/detail; query page0/pageSize101/status lạ trả400; anonymous401 được tách khỏi RBAC đã xác thực.

Lượt11 assertion mới PASS cho pagination/filter lịch sử ADMIN: pageSize1 trả2 trang1+1, ID không trùng, đúng ordinal/tổng; trang vượt cuối rỗng. CLOSED1, CANCELLED1, mỗi LAB1 và status+LAB1 khớp chính xác ID/total từ tập global. Không tạo thêm conversation. Evidence: support-reads/result.json, pagination-filters-result.json và2 script trong thư mục evidence cha. Không cộng41 assertion API này vào18case UI smoke.

Giới hạn: chỉ2 conversation CLOSED/CANCELLED có sẵn; chưa có WAITING/ACTIVE live test, lịch sử CUSTOMER populated, message cursor qua100 dòng, cross-LAB staff không được phân, đổi assignment trong lúc chạy hoặc UI VI/EN support. Presence/dispatch/concurrency/send/close/cancel/requeue vẫn chưa chạy live vì tác động ghi. Không suy ra toàn bộ support PASS.

## Coverage còn thiếu

| Phạm vi | Trạng thái hiện tại | Giới hạn/next step |
|---|---|---|
| Shell, nav role, locale, overflow; route smoke desktop | PASS smoke |18case,128route visits; không thay thế functional assertions |
| Catalogue search/filter/reset/sort | PASS bounded reads |CUSTOMER VI1440/EN1920,10check/kịch bản; chưa bao phủ mọi role hoặc mọi màn |
| Support API metadata/history/detail, auth scope, pagination/filter | PASS bounded API reads |30+11 assertion, ADMIN2/staff1/CUSTOMER0; không browser support, WAITING/ACTIVE hoặc nghiệp vụ ghi PASS |
| Queue pagination nghiệp vụ khác, dữ liệu report và các form khác | NOT RUN functional |Review handler trước mọi GET để loại trừ tác động ghi; chỉ dùng target an toàn |
| Audit API auth/role, assigned-LAB reads và pagination | PASS bounded |13 assertion ban đầu +18 assertion pagination/API; staff hiện có được phân2/2 LAB. Cross-LAB/no-LAB negative live vẫn NOT RUN |
| Session/audit GET không kéo dài idle expiry | PASS bounded live API |1 ADMIN session/gap4s/3 snapshot hợp lệ; không expiry boundary/activity/logout/all-role PASS |
| RBAC/LAB scope khác, session expiry/refresh, negative auth khác | NOT RUN trong lượt UI này |Generic401 do token rỗng từ MODULE_NOT_FOUND /tmp/l2.json không có giá trị PASS |
| ResourceDTO public-safe; GET lazy expiry impact | SOURCE REVIEW / impact UNVERIFIED |Không có snapshot DB trước/sau; chưa live DTO PASS, không coi GET là bảo đảm không ghi |
| Booking đơn/nhóm, conflicts/concurrency/idempotency/partial outcomes, payment/receipt/access, handover/return/checklist và các nghiệp vụ ghi khác | BLOCKED cho live UI writes |Chưa xác minh backend+DB QA tách biệt thực sự cho browser; không ghi vào demo8000 |
| Fault injection429/offline/recovery, upload, live provider/callback/email | NOT RUN/BLOCKED theo tác động |Tránh rate limit không chứng minh phục hồi429; thao tác ngoài hệ thống cần đúng scope |
| Backend25suite release-integration | Bằng chứng cũ22/10, không chạy lại |Giữ riêng với lượt UI; không suy ra UI end-to-end đạt |
| Deploy/merge hoặc sửa sản phẩm | N/A |Chưa được phép triển khai |

Báo cáo22/10 cũ có kết luận18PASS/0errors/0blocker trước khi sửa gates và thu errors cuối case; kết luận đó bị thay thế bởi bằng chứng mới ở trên. Bản trước khi review được lưu cục bộ trong report-before-20261023-review.md. Dữ liệu overview là demo, không phải production. Hai account test đã được tạo trên demo ở lượt trước; không xóa/reset/seed hoặc suy ra tác động khác đã được kiểm kê đủ.

## Bước tiếp theo — chưa triển khai

1. Tiếp tục phần chưa có evidence sau khi kiểm handler thực sự chỉ đọc; không chạy lại ma trận đã đạt. Resource/schedule/detail mới trên demo dừng do lazy expiry cho tới khi xác minh QA isolation/tác động an toàn.
2. Xác minh isolated QA backend/DB trước các test ghi; giữ BLOCKED nếu chưa chứng minh được đích thật.
3. Chờ yêu cầu compact/đề xuất hiện tại của human trong Claude kết thúc; sau final thật, gộp đúng một delta coverage/Q-05/isolation và phản biện phương án theo contract/evidence, thời gian còn lại, acceptance/regression và rủi ro. Không gửi chồng, rerun ma trận cũ hoặc coi đề xuất là bug đã xác nhận. Chưa có đồng thuận triển khai và chưa toàn hệ thống PASS.

## QA isolation23/10 — gate hiện tại chưa đạt

Kiểm metadata runtime trong lượt08:07Z: lrm-qa-postgres (aa675e0e9f62, PostgreSQL16) đã exited từ22/10 lúc13:18:14Z; host không có listener25439. Backend8000 và Postgres của lrm-local-review đang chạy, nhưng review này chưa fingerprint actual Prisma connection/current database/cluster để chứng minh một backend QA tách biệt. Không dùng tên DB, port cấu hình hoặc25suite lịch sử làm isolation PASS.

Source runReleaseIntegration.mjs:70 tạo database và:92 chạy migration preparation; runner này không phải lệnh kiểm isolation chỉ đọc, không được chạy trong lượt này. phaseFDatabase.js kiểm tên/host test cũng chưa chứng minh đích runtime/storage độc lập. Chưa start/restart container, kết nối DB, migration, seed/reset/cleanup, rerun test hoặc gửi business request. Gate và hash source ở isolation-review/gate.json: cần đối chiếu kết nối thật của backend QA với container/storage/cluster và shared demo trước test ghi; giữ dừng resource GET trên demo theo Q-04.
