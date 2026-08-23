import { PrismaClient } from "@prisma/client";
import { ingestDocument } from "../src/services/ragService.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Knowledge Base Documents for RAG...");

  const dgxServer = await prisma.resource.findFirst({ where: { code: "GPU-NODE-01" } });

  // 1. DGX A100 Manual
  await ingestDocument({
    resourceId: dgxServer?.id,
    title: "Hướng dẫn Vận hành & Thông số Kỹ thuật NVIDIA DGX A100",
    sourceType: "manual",
    fileName: "nvidia-dgx-a100-manual-v2.pdf",
    version: "2.1",
    content: `Tài liệu Hướng dẫn Vận hành Hệ thống NVIDIA DGX A100 Workstation.
NVIDIA DGX A100 tích hợp 8 card đồ họa NVIDIA A100 Tensor Core 80GB GPU với tổng cộng 640GB VRAM high-bandwidth memory (HBM2e).
Hệ thống sử dụng bộ vi xử lý kép AMD EPYC 7742 128 lõi, 1TB RAM DDR4 và 15TB ổ cứng NVMe SSD tốc độ cao.
Quy định vận hành an toàn:
1. Nhiệt độ môi trường phòng server phải duy trì từ 18°C đến 22°C, độ ẩm 45-55%.
2. Người sử dụng chỉ được chạy công việc huấn luyện (training job) thông qua Docker/Apptainer container. Không cài trực tiếp driver trên host system.
3. Khi tải trọng GPU vượt quá 95% liên tục trong 12 giờ, hệ thống cảnh báo tự động sẽ gửi thông báo cho Lab Staff.
4. Công suất tiêu thụ điện tối đa của DGX A100 là 6.5 kW. Cần đảm bảo bộ lưu điện UPS kết nối ổn định.`
  });

  // 2. UAV Safety SOP
  const uav = await prisma.resource.findFirst({ where: { type: "uav" } });
  await ingestDocument({
    resourceId: uav?.id,
    title: "Quy trình Thao tác Chuẩn (SOP) Bay An toàn cho Drone/UAV Công nghiệp",
    sourceType: "sop",
    fileName: "uav-safety-sop-2026.pdf",
    version: "1.0",
    content: `Quy trình Thao tác Chuẩn (SOP) cho Thiết bị Bay Không Người Lái (UAV/Drone).
Yêu cầu cấp phép và an toàn bay:
1. Người điều khiển phải sở hữu Chứng chỉ Vận hành UAV (UAV-PILOT-201) còn hạn hiệu lực.
2. Kiểm tra dung lượng pin sạc tối thiểu 90% trước khi cất cánh. Không bay khi pin dưới 25%.
3. Độ cao bay tối đa cho phép là 120 mét so với mặt đất (AGL). Không bay vào khu vực cấm bay hoặc vùng cận sân bay.
4. Tốc độ gió tối đa cho phép vận hành là 12 m/s. Khi thời tiết mưa hoặc sương mù dầy đặc, lập tức hủy chuyến bay và hạ cánh an toàn.
5. Luôn duy trì tầm nhìn thẳng (VLOS - Visual Line of Sight) với thiết bị bay.`
  });

  console.log("✅ RAG Knowledge Base seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Knowledge base seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
