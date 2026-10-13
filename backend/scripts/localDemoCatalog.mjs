import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const legacyDescription = "LOCAL DEMO — trạng thái cấu hình minh họa, không phải dữ liệu phần cứng thực tế.";
const rows = [
  ["ROOM-01", "Phòng thực hành điện tử", "ROOM", "ROOM", 0, 24, "Thực hành mạch điện và đo tín hiệu theo nhóm, có khu bàn thao tác và bàn trình diễn.", { area: "72 m²", workstations: 12, power: "Ổ cắm tại bàn thực hành", connectivity: "Wi-Fi, Ethernet", includedAccessories: ["Bảng viết", "Màn hình trình chiếu", "Bàn thực hành"] }],
  ["ROOM-02", "Phòng thực hành chế tạo", "ROOM", "ROOM", 1, 20, "Không gian thực hành lắp ráp và chế tạo mẫu, tách bàn thiết kế khỏi khu thao tác máy.", { area: "90 m²", workstations: 10, ventilation: "Thông gió khu thao tác", includedAccessories: ["Bàn lắp ráp", "Tủ dụng cụ", "Khu chuẩn bị vật liệu"] }],
  ["ROOM-03", "Phòng máy tính & mô phỏng", "ROOM", "ROOM", 0, 30, "Không gian học lập trình, mô phỏng hệ thống và xử lý dữ liệu với các vị trí máy tính riêng.", { area: "80 m²", workstations: 30, connectivity: "Ethernet tại mỗi vị trí", includedAccessories: ["Máy tính thực hành", "Màn hình trình chiếu", "Bảng viết"] }],
  ["ROOM-04", "Phòng thực hành IoT", "ROOM", "ROOM", 0, 18, "Thực hành mạng cảm biến, kết nối thiết bị và thử nghiệm hệ thống nhúng theo nhóm nhỏ.", { area: "54 m²", workstations: 9, connectivity: "Wi-Fi, Ethernet", includedAccessories: ["Bàn chống tĩnh điện", "Nguồn thấp áp", "Tủ linh kiện"] }],
  ["ROOM-05", "Phòng thị giác máy tính", "ROOM", "ROOM", 1, 12, "Không gian bố trí camera và ánh sáng để thực hành thu nhận ảnh, hiệu chỉnh và xử lý hình ảnh.", { area: "48 m²", workstations: 6, lighting: "Khu ánh sáng có thể điều chỉnh", includedAccessories: ["Bàn chụp mẫu", "Phông nền", "Giá đỡ camera"] }],
  ["ROOM-06", "Phòng lắp ráp & tạo mẫu", "ROOM", "ROOM", 1, 16, "Không gian kiểm tra và lắp ráp nguyên mẫu sau chế tạo, phù hợp với đồ án nhóm.", { area: "64 m²", workstations: 8, includedAccessories: ["Bàn lắp ráp", "Tủ dụng cụ", "Kệ lưu mẫu"] }],
  ["EQ-01", "Máy hiện sóng số", "EQUIPMENT", "OTHER", 0, 1, "Quan sát dạng sóng và so sánh tín hiệu trong các bài thực hành điện tử cơ bản.", { bandwidth: "100 MHz", channels: 4, sampleRate: "1 GSa/s", connectivity: "USB", includedAccessories: ["4 đầu dò", "Dây nguồn"] }],
  ["EQ-02", "Đồng hồ vạn năng số", "EQUIPMENT", "OTHER", 0, 1, "Thực hành đo điện áp, điện trở và kiểm tra liên tục; chỉ dùng sau khi hoàn tất hiệu chuẩn.", { display: "6.000 counts", measurement: ["Điện áp", "Điện trở", "Liên tục"], includedAccessories: ["Cặp que đo", "Túi bảo quản"] }],
  ["EQ-03", "Camera quan sát thí nghiệm", "EQUIPMENT", "CAMERA", 1, 1, "Thu hình quá trình thí nghiệm để phân tích sau buổi học; cấu hình mẫu hiện đang ngoại tuyến.", { resolution: "1.920 × 1.080 px", frameRate: "30 fps", connectivity: "Ethernet", includedAccessories: ["Giá đỡ", "Bộ cấp nguồn"] }],
  ["EQ-04", "Bộ nguồn DC lập trình", "EQUIPMENT", "OTHER", 0, 1, "Cấp nguồn thấp áp có giới hạn dòng cho bài thực hành mạch điện và hệ thống nhúng.", { outputVoltage: "0–30 V DC", outputCurrent: "0–5 A", channels: 2, includedAccessories: ["Dây nguồn", "Cặp dây cấp nguồn"] }],
  ["EQ-05", "Máy phân tích logic", "EQUIPMENT", "OTHER", 0, 1, "Ghi nhận tín hiệu số và phân tích giao tiếp UART, I²C, SPI trong bài thực hành hệ thống nhúng.", { channels: 8, sampleRate: "24 MSa/s", protocols: ["UART", "I²C", "SPI"], includedAccessories: ["Bộ kẹp tín hiệu", "Cáp USB"] }],
  ["EQ-06", "Máy tính nhúng Raspberry Pi", "EQUIPMENT", "RASPBERRY_PI", 0, 1, "Thực hành Linux, GPIO và xây dựng ứng dụng IoT trên máy tính nhúng.", { processor: "CPU 4 nhân", memory: "4 GB RAM", storage: "Thẻ nhớ 32 GB", connectivity: "Wi-Fi, Ethernet, GPIO", includedAccessories: ["Bộ nguồn", "Vỏ bảo vệ", "Thẻ nhớ"] }],
  ["EQ-07", "Kính hiển vi số USB", "EQUIPMENT", "CAMERA", 1, 1, "Quan sát bề mặt linh kiện và mẫu vật nhỏ trên màn hình máy tính.", { magnification: "20–200×", resolution: "1.920 × 1.080 px", connectivity: "USB", includedAccessories: ["Giá đỡ", "Thước hiệu chuẩn"] }],
  ["EQ-08", "Máy phát tín hiệu", "EQUIPMENT", "OTHER", 0, 1, "Tạo tín hiệu tham chiếu để khảo sát đáp ứng mạch trong bài thực hành điện tử.", { frequencyRange: "1 µHz–25 MHz", channels: 2, waveforms: ["Sin", "Vuông", "Tam giác"], includedAccessories: ["2 cáp BNC", "Dây nguồn"] }],
  ["EQ-09", "Cân điện tử thực hành", "EQUIPMENT", "OTHER", 1, 1, "Đo khối lượng vật liệu và mẫu thực hành trên bàn cân độc lập.", { measurementRange: "0–2.000 g", accuracy: "0,01 g", includedAccessories: ["Khay cân", "Quả cân kiểm tra"] }],
  ["EQ-10", "Máy trạm GPU xử lý dữ liệu", "EQUIPMENT", "GPU_SERVER", 0, 1, "Thực hành xử lý ảnh và huấn luyện mô hình với dữ liệu học tập đã được phép sử dụng.", { processor: "CPU 12 nhân", memory: "64 GB RAM", graphicsMemory: "16 GB VRAM", storage: "SSD 1 TB", connectivity: "Ethernet", includedAccessories: ["Màn hình", "Bàn phím", "Chuột"] }],
  ["MC-01", "Máy in 3D thực hành", "MACHINE", "OTHER", 1, 1, "Tạo mẫu cơ khí từ bản thiết kế 3D trong buổi thực hành có cán bộ LAB hướng dẫn.", { technology: "FDM", workArea: "220 × 220 × 250 mm", materials: ["PLA"], includedAccessories: ["Bàn in", "Bộ dụng cụ vệ sinh"] }],
  ["MC-02", "Máy khoan bàn thực hành", "MACHINE", "OTHER", 1, 1, "Thực hành gia công lỗ trên mẫu; cấu hình hiện đang bảo trì và chưa sẵn sàng sử dụng.", { workArea: "Bàn gá 200 × 200 mm", power: "500 W", includedAccessories: ["Ê-tô gá mẫu", "Tấm chắn"] }],
  ["MC-03", "Máy CNC tạo mẫu", "MACHINE", "OTHER", 1, 1, "Thực hành quy trình chuẩn bị và gia công mẫu theo hướng dẫn, có giám sát của cán bộ LAB.", { technology: "CNC 3 trục", workArea: "300 × 180 × 45 mm", materials: ["Vật liệu mềm được LAB phê duyệt"], includedAccessories: ["Bộ gá mẫu", "Tấm chắn", "Bộ hút bụi"] }],
  ["MC-04", "Trạm hàn điện tử", "MACHINE", "OTHER", 0, 1, "Lắp ráp và sửa mạch điện tử trong khu thao tác có kiểm soát nhiệt và hút khói.", { temperatureRange: "200–450 °C", power: "75 W", includedAccessories: ["Giá đặt tay hàn", "Bộ hút khói", "Tấm chịu nhiệt"] }],
  ["KIT-01", "Bộ thí nghiệm mạch điện", "EXPERIMENT_KIT", "KIT", 0, 1, "Bộ linh kiện để lắp ráp mạch điện cơ bản và thực hành đọc sơ đồ mạch.", { contents: ["Breadboard", "Điện trở", "LED", "Tụ điện"], power: "Nguồn thấp áp", includedAccessories: ["Hộp phân loại", "Dây nối"] }],
  ["KIT-02", "Bộ thực hành cảm biến", "EXPERIMENT_KIT", "KIT", 1, 1, "Thực hành đọc dữ liệu cảm biến, xử lý tín hiệu và quan sát sự thay đổi theo môi trường.", { contents: ["Cảm biến nhiệt độ", "Cảm biến ánh sáng", "Cảm biến khoảng cách"], connectivity: "GPIO, I²C", includedAccessories: ["Bo điều khiển", "Dây nối", "Cáp USB"] }],
  ["KIT-03", "Bộ thực hành robot di động", "EXPERIMENT_KIT", "KIT", 1, 1, "Thực hành điều khiển chuyển động và đọc cảm biến với robot giáo dục trong khu vực quy định.", { contents: ["Khung robot", "Bo điều khiển", "Cảm biến khoảng cách"], connectivity: "USB, Bluetooth", includedAccessories: ["Bộ pin", "Bộ sạc", "Dụng cụ lắp ráp"] }],
  ["MAT-01", "Bộ dây nối mạch thí nghiệm", "MATERIAL", "MATERIAL", 0, 1, "Bộ dây jumper dùng với breadboard và mô-đun thực hành; kiểm đếm khi nhận và trả.", { contents: ["Dây đực–đực", "Dây đực–cái", "Dây cái–cái"], length: "20 cm", includedAccessories: ["Hộp bảo quản"] }],
  ["MAT-02", "Cuộn nhựa PLA thực hành", "MATERIAL", "MATERIAL", 1, 1, "Vật liệu tạo mẫu dành cho máy in 3D theo cấu hình và định mức được cán bộ LAB phê duyệt.", { diameter: "1,75 mm", netWeight: "1 kg", material: "PLA", storageConditions: "Khô ráo, hộp kín" }],
];

function usageGuide(category) {
  return {
    beforeUse: ["Đọc điều kiện đặt lịch và xác nhận với cán bộ LAB trước khi nhận bàn giao.", "Kiểm tra tình trạng, số lượng và phụ kiện cùng cán bộ; ghi nhận mọi bất thường."],
    steps: category === "ROOM"
      ? ["Sử dụng đúng không gian và mục đích đã được duyệt.", "Giữ lối đi thông thoáng; thiết bị trong phòng cần được đặt riêng nếu quy định yêu cầu."]
      : ["Thao tác theo hướng dẫn của cán bộ và tài liệu đúng model thực tế.", "Dừng sử dụng và báo cán bộ ngay khi có bất thường; không tự sửa hoặc thay đổi cấu hình an toàn."],
    afterUse: ["Kết thúc đúng giờ, vệ sinh khu vực và kiểm đếm các hạng mục bàn giao.", "Cùng cán bộ kiểm tra khi trả; khai báo sự cố nếu có."],
    safetyNotes: "Hướng dẫn và thông số LOCAL DEMO chỉ để minh họa giao diện. Khi dùng tài nguyên thật, phải xác minh model, quy trình an toàn và yêu cầu đào tạo với cán bộ LAB.",
  };
}

export const localDemoCatalog = rows.map(([suffix, name, category, subtype, labIndex, capacity, description, technical]) => ({
  code: `LOCAL-${suffix}`, name, category, subtype, labIndex, capacity,
  description: `${description} Dữ liệu mẫu LOCAL DEMO; không đại diện cho tài sản thật.`,
  specs: { environment: "LOCAL_DEMO", technical, usageGuide: usageGuide(category) },
}));

// Only enrich records created by the guarded local demo. Never reset business state.
export async function seedLocalDemoCatalog(tx, labs) {
  for (const { labIndex, ...profile } of localDemoCatalog) {
    const existing = await tx.resource.findUnique({ where: { code: profile.code } });
    if (!existing) {
      await tx.resource.create({ data: {
        id: randomUUID(), ...profile, laboratoryId: labs[labIndex].id,
        location: labs[labIndex].name, ownerTeam: "LOCAL DEMO", capacity: profile.capacity,
        operationalStatus: "AVAILABLE", status: "available", requiresApproval: false, bookingState: "bookable",
      } });
      continue;
    }
    if (existing.ownerTeam !== "LOCAL DEMO" || existing.specs?.environment !== "LOCAL_DEMO") {
      throw new Error(`Refusing to overwrite a non-demo resource: ${profile.code}`);
    }
    const specs = { ...profile.specs, ...existing.specs };
    const description = existing.description === legacyDescription ? profile.description : existing.description;
    if (!isDeepStrictEqual(specs, existing.specs) || description !== existing.description) {
      await tx.resource.update({ where: { id: existing.id }, data: { specs, description, version: { increment: 1 } } });
    }
  }
}
