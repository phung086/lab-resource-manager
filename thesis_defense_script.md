# KỊCH BẢN 15 PHÚT BẢO VỆ ĐỒ ÁN TỐT NGHIỆP TRƯỚC HỘI ĐỒNG (THESIS DEFENSE SCRIPT V2)

**Đề tài**: AI-Assisted Multi-Objective Resource Orchestration Platform for Smart Research Labs  
*(Hệ thống điều phối tài nguyên phòng thí nghiệm nghiên cứu thông minh dựa trên tối ưu đa mục tiêu, bản sao số và trợ lý AI)*  
**Thời lượng**: 15 phút trình bày chính thức + 15 phút trả lời câu hỏi phản biện của Hội đồng  

---

## ⏱️ PHÂN BỔ THỜI GIAN TRÌNH BÀY (15-MINUTE MASTER AGENDA)

```
 [00:00 - 01:30]  1. Đặt Vấn Đề & 5 Câu Hỏi Cốt Lõi
 [01:30 - 03:00]  2. Kiến Trúc Mục Tiêu & Trục Golden Flow
 [03:00 - 05:00]  3. Demo Golden Flow: Requirement -> Matching -> NSGA-II -> Allocation
 [05:00 - 07:30]  4. Không Gian Pareto & Giải Trình Quyết Định (Decision Explainability)
 [07:30 - 09:30]  5. Mạch Phản Hồi Bản Sao Số (Digital Twin Feedback Loop)
 [09:30 - 11:00]  6. Xử Lý Sự Cố & Chuyển Tải Giả Lập (Timed Failover Recovery: T0 -> T5)
 [11:00 - 12:30]  7. Studio Thử Nghiệm Kịch Bản Giả Định (What-If Counterfactuals)
 [12:30 - 14:00]  8. Bằng Chứng Thực Nghiệm Khoa Học (N=30 Statistics & 250 Concurrency)
 [14:00 - 15:00]  9. Kết Luận & Khẳng Định Đóng Góp Khoa Học (Thesis Statement)
```

---

## 🎙️ LỜI THOẠI CHI TIẾT THEO TỪNG PHÚT

### 1. ĐẶT VẤN ĐỀ & 5 CÂU HỎI CỐT LÕI (0:00 - 1:30)
> *"Kính thưa Thầy/Cô Chủ tịch và các Thầy/Cô trong Hội đồng chấm Đồ án Tốt nghiệp,*
>
> *Tại các trường đại học và viện nghiên cứu, việc quản lý các tài nguyên tính toán đắt đỏ (GPU H100/L40S, thiết bị đo kiểm, UAV) hiện đang gặp 3 bất cập lớn: **Xung đột đặt trùng lịch**, **Lãng phí điện năng giờ cao điểm**, và **Sự thiếu công bằng (Fair-share) giữa các nghiên cứu sinh và sinh viên**.*
>
> *Đề tài của em giải quyết trọn vẹn **5 câu hỏi điều phối cốt lõi**:*
> 1. *Ai cần tài nguyên? (Đặc tả nhu cầu qua ResourceRequirement)*
> 2. *Tài nguyên nào phù hợp nhất? (Đánh giá qua Resource Readiness Score)*
> 3. *Thời gian nào tối ưu nhất? (Thuật toán NSGA-II tìm nghiệm trong không gian Pareto)*
> 4. *Phân bổ đó có công bằng, tiết kiệm và an toàn không? (Đo bằng Jain's Fairness Index, Biểu giá điện EVN 3 giá, và Ràng buộc An toàn)*
> 5. *Nếu trạng thái thực tế thay đổi, hệ thống có tự điều chỉnh được không? (Mạch phản hồi Digital Twin $\to$ Re-Optimization).*"

---

### 2. KIẾN TRÚC MỤC TIÊU & TRỤC GOLDEN FLOW (1:30 - 3:00)
> *"Khác với các phần mềm CRUD đặt lịch truyền thống, hệ thống được thiết kế theo trục xương sống duy nhất:**
>
> $$\text{Requirement} \longrightarrow \text{Resource Matching} \longrightarrow \text{NSGA-II} \longrightarrow \text{Allocation} \longrightarrow \text{Digital Twin Feedback} \longrightarrow \text{Re-Optimization}$$
>
> *Mô hình toán học của bộ giải được phân định rõ ràng giữa **Hard Constraints** và **Soft Objectives**:*
> - * **Hard Constraints (Bắt buộc không vi phạm)**:
>   - Không trùng lịch trên cùng thiết bị vật lý: $[t_i, t_i + d_i) \cap [t_j, t_j + d_j) = \emptyset$ (Bảo đảm ở cấp cơ sở dữ liệu qua **PostgreSQL GiST Exclusion Constraint** và `SELECT FOR UPDATE`).
>   - Đáp ứng năng lực phần cứng: $\text{Capability}(r_i) \ge \text{Requirement}_i$ (VRAM, CUDA, Kiến trúc).
>   - Ràng buộc chứng chỉ an toàn phòng lab: $\text{Certification}(u_i, r_i) = \text{VALID}$.
> - * **Soft Multi-Objectives (Tối ưu hóa Pareto)**:
>   - $\min f_1(x) = \text{WaitingTime}$ (Thời gian chờ).
>   - $\min f_2(x) = \text{EnergyCost}$ (Tiền điện theo Biểu giá EVN 3 giá: Thấp điểm 1.100 đ, Tiêu chuẩn 1.685 đ, Cao điểm 3.190 đ/kWh).
>   - $\min f_3(x) = \text{ThermalDegradation}$ (Hạn chế hao mòn phần cứng do nhiệt độ cao).
>   - $\max f_4(x) = \mathcal{J}(x)$ (Tối đa hóa chỉ số công bằng Jain's Fairness Index).*"

---

### 3. DEMO GOLDEN FLOW: TỪ NHU CẦU ĐẾN PHÂN BỔ (3:00 - 5:00)
*(Thao tác trên màn hình: Mở tab **🎯 Điều Phối Tài Nguyên**)*
> *"Em xin phép thực hiện quy trình điều phối thực tế:*
> - *Bước 1: Sinh viên nhập yêu cầu: Cần cụm GPU $\ge 24\text{ GB VRAM}$ trong 3 giờ để làm Đồ án tốt nghiệp.*
> - *Bước 2: Hệ thống kích hoạt **Policy Engine** kiểm tra chứng chỉ an toàn, tìm kiếm ứng viên phần cứng phù hợp, và chuyển bài toán sang bộ giải **NSGA-II**.*
> - *Bước 3: Thuật toán NSGA-II tự động xếp job vào khung giờ tối ưu (ví dụ ca 22:00 giờ Xanh off-peak), bóc tách điểm giải trình rõ ràng và lưu vết **Decision Provenance**.*
> - *Bước 4: Người dùng bấm 'Xác nhận', hệ thống thực hiện transaction với cơ chế khoá dòng `SELECT FOR UPDATE`, tạo lịch chính thức và đảm bảo triệt tiêu xung đột."*

---

### 4. KHÔNG GIAN PARETO & GIẢI TRÌNH QUYẾT ĐỊNH (5:00 - 7:30)
*(Thao tác trên màn hình: Mở tab **🧬 Thuật Toán Di Truyền**)*
> *"Hội đồng có thể quan sát thấy tập nghiệm không bị chi phối (**Pareto Frontier**) được trích xuất sau 25 thế hệ tiến hóa.*
>
> *Hệ thống không đánh đồng các mục tiêu thành một hàm trọng số mù mờ (Weighted Sum), mà tìm ra các điểm thỏa hiệp tối ưu (Trade-offs). Mỗi quyết định phân bổ đều kèm theo bảng **Factor Decomposition Explainability**: Đóng góp ưu tiên $+92\text{ pts}$, Tiết kiệm giờ xanh $+25\text{ pts}$, Điểm công bằng $+12\text{ pts}$ và Giải trình tự nhiên giúp người quản lý hiểu rõ lý do thuật toán lựa chọn."*

---

### 5. MẠCH PHẢN HỒI BẢN SAO SỐ (DIGITAL TWIN FEEDBACK LOOP) (7:30 - 9:30)
*(Thao tác trên màn hình: Mở tab **🌐 Bản Sao Số & Heatmap**)*
> *"Điểm quan trọng: Bản sao số của hệ thống không chỉ là dashboard hiển thị số liệu mà là **mạch phản hồi điều khiển (Feedback Loop)**:*
>
> $$\text{Sensor Telemetry } (T > 85^\circ\text{C}) \longrightarrow \text{Health Index } (85 \to 35) \longrightarrow \text{Readiness Score } (91 \to 35) \longrightarrow \text{Optimizer Penalty} \longrightarrow \text{Allocation Shift}$$
>
> *Khi cảm biến phát hiện GPU H100-01 tăng nhiệt quá mức, điểm sẵn sàng **Resource Readiness Score** tụt giảm. Thuật toán tối ưu hóa tự động áp trọng số phạt hao mòn và tự động điều phối các job tiếp theo sang cụm máy chủ L40S mát hơn."*

---

### 6. XỬ LÝ SỰ CỐ & CHUYỂN TẢI GIẢ LẬP CÓ ĐO LƯỜNG (9:30 - 11:00)
*(Thao tác trên màn hình: Mở tab **🛠️ Chẩn Đoán Lỗi AI**)*
> *"Khi xảy ra sự cố phần cứng đột ngột, quy trình chuyển tải phục hồi được ghi nhận log tuần tự chính xác:*
> - *$T_0$: Phát hiện lỗi chập nguồn / quá nhiệt qua Telemetry.*
> - *$T_1$: Tự động cách ly thiết bị (Quarantine).*
> - *$T_2$: Quét tìm các tài nguyên khả dụng thay thế.*
> - *$T_3$: Tái tối ưu hóa phân bổ (Re-Optimization).*
> - *$T_4$: Cam kết giao dịch chuyển tải an toàn.*
> - *$T_5$: Phục hồi tiến trình chạy.*
>
> *Tổng thời gian chuyển tải giả lập đo lường trong thử nghiệm: $T_{\text{recovery}} = T_5 - T_0 = 3.5\text{ giây}$."*

---

### 7. STUDIO THỬ NGHIỆM KỊCH BẢN GIẢ ĐỊNH (WHAT-IF STUDIO) (11:00 - 12:30)
*(Thao tác trên màn hình: Mở tab **🔮 Mô Phỏng What-If**)*
> *"Hệ thống cung cấp công cụ quy hoạch năng lực cho Ban Giám hiệu và Trưởng Lab qua 4 kịch bản What-If:*
> 1. *Nếu đầu tư thêm +2 cụm GPU H100? $\to$ Thời gian chờ trung bình giảm 1.8 giờ, chỉ số công bằng tăng $+0.08$.*
> 2. *Nếu 1 máy chủ chủ lực gặp sự cố? $\to$ Hệ thống tái phân bổ duy trì 0 xung đột.*
> 3. *Nếu nhu cầu sinh viên tăng gấp đôi ($2\times$ Demand mùa đồ án)? $\to$ Hệ thống tự động kích hoạt ca đêm.*
> 4. *Nếu giá điện cao điểm EVN tăng $+30\%$? $\to$ Tự động dịch chuyển 85% tác vụ sang giờ thấp điểm.*
>
> *Bảng so sánh đối kháng xuất ma trận chênh lệch $\Delta$ chi tiết cho từng chỉ số."*

---

### 8. BẰNG CHỨNG THỰC NGHIỆM KHOA HỌC & STATISTICAL SIGNIFICANCE (12:30 - 14:00)
*(Mở file [thesis_defense_tables.md](file:///c:/Users/Admin/OneDrive/Tài%20liệu/New%20project/lab-resource-manager/research/results/thesis_defense_tables.md) và [evidence_matrix.md](file:///c:/Users/Admin/OneDrive/Tài%20liệu/New%20project/lab-resource-manager/research/evidence_matrix.md))*
> *"Em xin báo cáo 4 kết quả thực nghiệm khoa học cốt lõi đã được kiểm định thống kê độc lập:*
> 1. * **Thực nghiệm Concurrency CONC-250**: Dưới áp lực 250 requests đồng thời đặt cùng 1 slot, hệ thống ghi nhận **duy nhất 1 đơn thành công, 249 đơn từ chối an toàn, và 0 đơn trùng lặp (Double-booking = 0)**.*
> 2. * **So sánh Thuật toán EXP-01**: NSGA-II duy trì thời gian chờ thấp ($1.94\text{h}$), tiết kiệm chi phí điện năng ($49.702\text{ đ}$) và bảo toàn chỉ số công bằng Jain cao ($0.83$).*
> 3. * **Ablation Study ABL-04**: Chứng minh từng tầng mục tiêu đều đóng góp thiết thực.*
> 4. * **Kiểm định Thống kê $N=30$ Lần Chạy**: Kiểm định Paired t-test cho thấy mức giảm chi phí điện năng có ý nghĩa thống kê cao với $p < 0.001$ và khoảng tin cậy $95\%\text{ CI}$."*

---

### 9. KẾT LUẬN & THESIS STATEMENT (14:00 - 15:00)
> *"Kính thưa Hội đồng,*
>
> *Đóng góp khoa học và kỹ thuật cốt lõi của đề tài là:*
>
> **'Hệ thống kết hợp điều phối tài nguyên theo yêu cầu với tối ưu hóa đa mục tiêu NSGA-II, trạng thái sức khỏe từ Bản sao số (Digital Twin) và cơ chế tái tối ưu hóa khi trạng thái thay đổi. Hệ thống không chỉ xác định một lịch khả thi, mà lựa chọn phương án phân bổ tối ưu đồng thời theo Thời gian chờ, Chi phí năng lượng, Tính công bằng và Hao mòn thiết bị; đồng thời toàn bộ quyết định được lưu vết Provenance và kiểm chứng qua Benchmark, Ablation và Stress-test 250 concurrent requests.'**
>
> *Em xin chân thành cảm ơn Quý Thầy/Cô đã chú ý lắng nghe. Em xin sẵn sàng tiếp nhận các câu hỏi phản biện từ Hội đồng!"*

---

## 🎯 BỘ 10 CÂU HỎI PHẢN BIỆN KHÓ NHẤT VÀ CÂU TRẢ LỜI MẪU (TOP 10 DEFENSE Q&A)

### Câu 1: Tại sao em dùng NSGA-II mà không dùng FIFO, Greedy hoặc ILP (Quy hoạch nguyên tuyến tính)?
> **Trả lời**:  
> - *FIFO và Greedy* chỉ tối ưu một chiều theo thời gian đến hoặc điểm ưu tiên, dẫn đến chi phí điện năng tăng cao vào giờ cao điểm và gây bất công cho sinh viên có độ ưu tiên thấp.  
> - *ILP (Integer Linear Programming)* tìm được nghiệm tối ưu toàn cục nhưng thời gian tính toán tăng theo cấp số mũ ($NP$-hard), không phù hợp cho điều phối thời gian thực khi quy mô lab lên đến hàng trăm requests.  
> - *NSGA-II* có độ phức tạp thuật toán thấp $\mathcal{O}(M \cdot N^2)$, trích xuất được toàn bộ đường biên Pareto trong vài chục mili-giây và cho phép người quản trị linh hoạt lựa chọn nghiệm cân bằng.

### Câu 2: Bốn objective của em là gì và tại sao em lại chọn 4 mục tiêu đó?
> **Trả lời**:  
> 1. $\min(\text{WaitingTime})$: Đảm bảo hiệu suất nghiên cứu và kịp deadline nộp bài.  
> 2. $\min(\text{EnergyCost})$: Tận dụng biểu giá điện EVN 3 giá để tiết kiệm ngân sách phòng lab.  
> 3. $\min(\text{ThermalDegradation})$: Hạn chế chạy quá tải kéo dài ở nhiệt độ cao gây hỏng hóc GPU đắt tiền.  
> 4. $\max(\text{Jain's Fairness Index})$: Ngăn chặn tình trạng độc chiếm tài nguyên của nhóm nghiên cứu lớn (Starvation problem).

### Câu 3: Khác biệt giữa Hard Constraint và Soft Objective trong hệ thống của em là gì?
> **Trả lời**:  
> - **Hard Constraint** là ràng buộc tuyệt đối không được vi phạm (Vi phạm = Loại bỏ). Ví dụ: Không thể có 2 người cùng dùng 1 GPU ở cùng 1 thời điểm; người dùng chưa học an toàn không được bật thiết bị.  
> - **Soft Objective** là các mục tiêu tối ưu có thể chấp nhận đánh đổi (Trade-off) trong không gian Pareto. Ví dụ: Chấp nhận đợi thêm 30 phút để chuyển sang giờ điện giá rẻ (tiết kiệm 65% tiền điện).

### Câu 4: Cơ chế Pareto Dominance và Crowding Distance hoạt động như thế nào?
> **Trả lời**:  
> - Giải pháp $A$ chi phối (dominate) giải pháp $B$ nếu $A$ không tệ hơn $B$ ở mọi mục tiêu và tốt hơn $B$ ở ít nhất 1 mục tiêu.  
> - Fast Non-dominated Sorting chia quần thể thành các tầng (Rank 1, Rank 2,...).  
> - **Crowding Distance** đo lường mật độ phân bố của các nghiệm xung quanh trên cùng một tầng Pareto, ưu tiên giữ lại các nghiệm ở vùng thưa để đảm bảo tính đa dạng (Diversity) của quần thể giải pháp.

### Câu 5: Tính công bằng được đo bằng gì và chỉ số Jain's Fairness Index có ý nghĩa ra sao?
> **Trả lời**:  
> - Đo bằng **Jain's Fairness Index**: $\mathcal{J}(x) = \frac{(\sum x_i)^2}{n \sum x_i^2}$, với $x_i$ là số giờ tài nguyên được cấp cho người dùng $i$.  
> - Giá trị $\mathcal{J}(x) \in [\frac{1}{n}, 1.0]$. Nếu tất cả mọi người được cấp thời gian công bằng như nhau thì $\mathcal{J} = 1.0$. Nếu tài nguyên bị dồn hết cho 1 người duy nhất thì $\mathcal{J} \to \frac{1}{n}$.

### Câu 6: Làm thế nào em chứng minh thuật toán của em tốt hơn các baseline?
> **Trả lời**:  
> Em chứng minh qua **Thực nghiệm EXP-01 và Kiểm định thống kê $N=30$ runs**: Cùng một bộ dữ liệu workload phát sinh ngẫu nhiên theo phân phối chuẩn, NSGA-II giảm trung bình 15.0% chi phí điện năng so với FIFO, duy trì 0 xung đột và tăng chỉ số công bằng Jain từ 0.812 lên 0.830 với ý nghĩa thống kê $p < 0.001$.

### Câu 7: 30 lần chạy thực nghiệm có thể tái lập (Reproducible) được không?
> **Trả lời**:  
> Hoàn toàn tái lập được $100\%$. Bộ sinh dữ liệu Workload sử dụng thuật toán LCG với dải Random Seed cố định từ $42 \to 71$. Mỗi thí nghiệm đều xuất ra mã băm **SHA-256 Dataset Hash** và lưu manifest chi tiết trong thư mục `research/manifests/`.

### Câu 8: Nếu GPU đang được chọn nhưng cảm biến IoT báo quá nhiệt thì hệ thống xử lý ra sao?
> **Trả lời**:  
> Đây chính là sức mạnh của **Mạch phản hồi Digital Twin**: Khi Telemetry ghi nhận $T > 85^\circ\text{C}$, điểm **Resource Readiness Score** của GPU đó sẽ tụt dốc. Trong vòng lặp tối ưu hóa tiếp theo, thuật toán tự động phạt nặng điểm suy giảm phần cứng và chuyển hướng yêu cầu sang thiết bị khác mà không cần can thiệp thủ công.

### Câu 9: Trợ lý AI có thể tự ý hủy lịch (Cancel Booking) hay xóa thiết bị không?
> **Trả lời**:  
> **Tuyệt đối không.** Hệ thống tuân thủ nghiêm ngặt nguyên tắc **AI Safety & Human-in-the-loop**: AI chỉ đóng vai trò phân tích, trích xuất nhu cầu và Đề xuất (Recommendation). Mọi hành động có tính chất thay đổi trạng thái (Giao dịch, Duyệt, Hủy, Bảo trì) bắt buộc phải qua xác thực quyền hạn (RBAC) và hộp thoại xác nhận của con người trước khi commit xuống Database.

### Câu 10: Điểm mới về mặt khoa học của Đề tài là gì?
> **Trả lời**:  
> *"Điểm mới của đề tài là kết hợp điều phối tài nguyên theo yêu cầu với tối ưu đa mục tiêu NSGA-II, trạng thái sức khỏe từ Bản sao số (Digital Twin) và cơ chế tái tối ưu hóa khi trạng thái thay đổi. Hệ thống không chỉ xác định một lịch khả thi mà lựa chọn phương án phân bổ theo đồng thời thời gian chờ, chi phí năng lượng, tính công bằng và mức độ suy giảm thiết bị; đồng thời toàn bộ quyết định được lưu vết Provenance và kiểm chứng chặt chẽ thông qua Benchmark, Ablation và Stress-test."*
