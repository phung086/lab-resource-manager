// Manufacturer specifications, verified 2026-11-09. Quantities and rental rates are demo assumptions.
const pi = 'https://www.raspberrypi.com/products/';
const arduino = 'https://docs.arduino.cc/hardware/';
const models = [
  ['PI5', 'Raspberry Pi', 'Raspberry Pi 5 4GB', 'RASPBERRY_PI', { processor: 'BCM2712, Cortex-A76 4 nhân, 2,4 GHz', memory: '4 GB LPDDR4X', connectivity: 'Gigabit Ethernet, Wi-Fi, GPIO 40 chân' }, pi+'raspberry-pi-5/'],
  ['PI4', 'Raspberry Pi', 'Raspberry Pi 4 Model B 4GB', 'RASPBERRY_PI', { memory: '4 GB RAM', display: 'Hai cổng micro-HDMI', connectivity: 'Ethernet, Wi-Fi, GPIO' }, pi+'raspberry-pi-4-model-b/'],
  ['ZERO2', 'Raspberry Pi', 'Raspberry Pi Zero 2 W', 'RASPBERRY_PI', { processor: 'Cortex-A53 4 nhân, 1 GHz', memory: '512 MB SDRAM', dimensions: '65 × 30 mm' }, pi+'raspberry-pi-zero-2-w/'],
  ['PICO', 'Raspberry Pi', 'Raspberry Pi Pico', 'OTHER', { processor: 'RP2040, Arm Cortex-M0+ hai nhân', memory: '264 kB SRAM', programming: 'C / MicroPython' }, pi+'raspberry-pi-pico/'],
  ['UNO', 'Arduino', 'UNO R3', 'OTHER', { platform: 'Bo vi điều khiển Arduino UNO R3', purpose: 'Thực hành điện tử và lập trình nhúng' }, arduino+'uno-rev3/'],
  ['MEGA', 'Arduino', 'Mega 2560 Rev3', 'OTHER', { processor: 'ATmega2560, 16 MHz', digitalPins: 54, analogInputs: 16, serialPorts: 4 }, arduino+'mega-2560/'],
  ['NANO', 'Arduino', 'Nano (classic)', 'OTHER', { connector: 'Mini-B USB', formFactor: 'Bo cắm breadboard có hàng chân' }, arduino+'nano/'],
  ['CAM3', 'Raspberry Pi', 'Camera Module 3 Standard', 'CAMERA', { sensor: 'Sony IMX708, 12 MP', focus: 'Tự động', diagonalFieldOfView: '75°' }, pi+'camera-module-3/'],
  ['HQCAM', 'Raspberry Pi', 'High Quality Camera CS Mount', 'CAMERA', { sensor: 'Sony IMX477R, 12,3 MP', mount: 'C/CS', lens: 'Ống kính mua riêng; không giả định có sẵn' }, pi+'raspberry-pi-high-quality-camera/'],
  ['SCOPE', 'RIGOL', 'DS1054Z', 'OTHER', { bandwidth: '50 MHz', channels: 4, sampleRate: 'Tối đa 1 GSa/s khi dùng một kênh' }, 'https://www.rigolna.com/products/digital-oscilloscopes/1000z/'],
];

export const graduationResources = models.flatMap(([key, manufacturer, model, subtype, technical, sourceUrl], modelIndex) =>
  Array.from({length: 6}, (_, index) => ({
    code: `DEMO26-${key}-${String(index+1).padStart(2,'0')}`,
    name: `${model} · Bộ ${String(index+1).padStart(2,'0')}`,
    manufacturer, model, subtype, category: 'EQUIPMENT', capacity: 1,
    labCode: modelIndex < 7 ? 'LOCAL-LAB-1' : 'LOCAL-LAB-2',
    description: `Tài nguyên minh họa đồ án, không phải kiểm kê tài sản thật. Model ${model}; cấu hình tham khảo theo nhà sản xuất. Mỗi mã là một đơn vị đặt lịch độc lập. Giá thuê là giả định demo.`,
    specs: { environment: 'LOCAL_DEMO', catalogVersion: 'GRADUATION_2026', technical,
      provenance: { sourceUrl, verifiedAt: '2026-11-09', manufacturerSpecifications: true, inventory: 'SIMULATED_INVENTORY', rentalPricing: 'DEMO_ASSUMPTION' },
      usageGuide: { beforeUse: ['Kiểm tra model, phụ kiện và tình trạng khi bàn giao.'], steps: ['Tuân thủ tài liệu nhà sản xuất và hướng dẫn của cán bộ LAB.'], afterUse: ['Ngắt nguồn đúng quy trình, kiểm đếm và bàn giao.'], safetyNotes: 'Danh mục demo không xác nhận tài sản vật lý, hiệu chuẩn hay chứng nhận an toàn.' } },
  })));
