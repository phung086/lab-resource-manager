import React, { useState } from 'react';
import {
  Layers,
  Users,
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Edit3,
  Trash2,
  TrendingUp,
  Settings,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';

export interface AdminResourceManagementViewProps {
  initialTab?: 'resources' | 'users' | 'ledger';
}

interface ResourceItem {
  id: string;
  name: string;
  code: string;
  category: 'lab_room' | 'gpu_cluster' | 'workstation';
  capacity: string;
  hourlyRate: number;
  status: 'active' | 'maintenance' | 'reserved';
  utilizationRate: number;
  location: string;
}

interface UserQuotaItem {
  id: string;
  name: string;
  email: string;
  role: 'Giảng viên' | 'NCS / Lab Lead' | 'Sinh viên tài năng' | 'Doanh nghiệp R&D';
  quotaUsedHours: number;
  quotaMaxHours: number;
  reputationScore: number;
  noShowCount: number;
  status: 'active' | 'warning' | 'restricted';
}

interface LedgerItem {
  id: string;
  bookingRef: string;
  userName: string;
  resourceName: string;
  timeSlot: string;
  amountVnd: number;
  paymentMethod: 'VietQR Napas247' | 'Hạn ngạch R&D' | 'Ví Escrow';
  status: 'paid' | 'pending' | 'refunded';
  timestamp: string;
}

export const AdminResourceManagementView: React.FC<AdminResourceManagementViewProps> = ({
  initialTab = 'resources'
}) => {
  const [activeTab, setActiveTab] = useState<'resources' | 'users' | 'ledger'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Resource state
  const [resources, setResources] = useState<ResourceItem[]>([
    {
      id: 'res-1',
      name: 'Cụm GPU NVIDIA DGX H100 SXM5',
      code: 'NODE-DGX-01',
      category: 'gpu_cluster',
      capacity: '8x H100 80GB',
      hourlyRate: 180000,
      status: 'active',
      utilizationRate: 92,
      location: 'Phòng Máy Chủ AI Tầng 4'
    },
    {
      id: 'res-2',
      name: 'Phòng Hội Thảo & Lab AI Immersive',
      code: 'ROOM-IMM-301',
      category: 'lab_room',
      capacity: '24 chỗ ngồi',
      hourlyRate: 250000,
      status: 'active',
      utilizationRate: 78,
      location: 'Tòa Nhà R&D Tầng 3'
    },
    {
      id: 'res-3',
      name: 'Trạm L40S Enterprise Workstation',
      code: 'WS-L40S-04',
      category: 'workstation',
      capacity: '4x L40S 48GB',
      hourlyRate: 95000,
      status: 'active',
      utilizationRate: 85,
      location: 'Lab Thị Giác Máy Tính 202'
    },
    {
      id: 'res-4',
      name: 'Cụm Thử Nghiệm Edge Jetson AGX Orin',
      code: 'EDGE-ORIN-02',
      category: 'workstation',
      capacity: '12 Node Mạng Cảm Biến',
      hourlyRate: 60000,
      status: 'maintenance',
      utilizationRate: 40,
      location: 'Lab Robotics & UAV'
    },
    {
      id: 'res-5',
      name: 'Studio Bản Sao Số & Drone Docking Lab',
      code: 'LAB-DRONE-01',
      category: 'lab_room',
      capacity: '10 Nhà nghiên cứu',
      hourlyRate: 320000,
      status: 'reserved',
      utilizationRate: 95,
      location: 'Sân bay mô phỏng tầng thượng'
    }
  ]);

  // Users state
  const [users, setUsers] = useState<UserQuotaItem[]>([
    {
      id: 'usr-1',
      name: 'TS. Nguyễn Văn Hùng',
      email: 'hung.nv@lab-ai.edu.vn',
      role: 'Giảng viên',
      quotaUsedHours: 42,
      quotaMaxHours: 60,
      reputationScore: 99,
      noShowCount: 0,
      status: 'active'
    },
    {
      id: 'usr-2',
      name: 'Lê Hoàng Long',
      email: 'long.lh@lab-ai.edu.vn',
      role: 'NCS / Lab Lead',
      quotaUsedHours: 58,
      quotaMaxHours: 80,
      reputationScore: 97,
      noShowCount: 0,
      status: 'active'
    },
    {
      id: 'usr-3',
      name: 'Phạm Minh Khôi',
      email: 'khoi.pm@student.hust.edu.vn',
      role: 'Sinh viên tài năng',
      quotaUsedHours: 28,
      quotaMaxHours: 30,
      reputationScore: 88,
      noShowCount: 1,
      status: 'warning'
    },
    {
      id: 'usr-4',
      name: 'VinAI Robotics Team',
      email: 'partner.rnd@vinai.io',
      role: 'Doanh nghiệp R&D',
      quotaUsedHours: 120,
      quotaMaxHours: 200,
      reputationScore: 100,
      noShowCount: 0,
      status: 'active'
    },
    {
      id: 'usr-5',
      name: 'Trần Gia Huy',
      email: 'huy.tg@student.hust.edu.vn',
      role: 'Sinh viên tài năng',
      quotaUsedHours: 30,
      quotaMaxHours: 30,
      reputationScore: 74,
      noShowCount: 2,
      status: 'restricted'
    }
  ]);

  // Ledger state
  const [ledgers] = useState<LedgerItem[]>([
    {
      id: 'TXN-2026-0910-001',
      bookingRef: 'BK-9921',
      userName: 'VinAI Robotics Team',
      resourceName: 'Cụm GPU NVIDIA DGX H100',
      timeSlot: '13:00 - 17:00 (4h)',
      amountVnd: 720000,
      paymentMethod: 'VietQR Napas247',
      status: 'paid',
      timestamp: '10/09/2026 09:12'
    },
    {
      id: 'TXN-2026-0910-002',
      bookingRef: 'BK-9922',
      userName: 'TS. Nguyễn Văn Hùng',
      resourceName: 'Phòng Hội Thảo Immersive 301',
      timeSlot: '09:00 - 11:00 (2h)',
      amountVnd: 500000,
      paymentMethod: 'Hạn ngạch R&D',
      status: 'paid',
      timestamp: '10/09/2026 08:30'
    },
    {
      id: 'TXN-2026-0910-003',
      bookingRef: 'BK-9923',
      userName: 'Lê Hoàng Long',
      resourceName: 'Trạm L40S Workstation 04',
      timeSlot: '14:00 - 16:00 (2h)',
      amountVnd: 190000,
      paymentMethod: 'VietQR Napas247',
      status: 'paid',
      timestamp: '09/09/2026 18:45'
    },
    {
      id: 'TXN-2026-0910-004',
      bookingRef: 'BK-9924',
      userName: 'Phạm Minh Khôi',
      resourceName: 'Trạm L40S Workstation 04',
      timeSlot: '19:00 - 21:00 (2h)',
      amountVnd: 190000,
      paymentMethod: 'VietQR Napas247',
      status: 'pending',
      timestamp: '10/09/2026 09:20'
    },
    {
      id: 'TXN-2026-0909-089',
      bookingRef: 'BK-9918',
      userName: 'Trần Gia Huy',
      resourceName: 'Cụm Edge Orin 02',
      timeSlot: '08:00 - 10:00 (2h)',
      amountVnd: 120000,
      paymentMethod: 'Ví Escrow',
      status: 'refunded',
      timestamp: '09/09/2026 14:10'
    }
  ]);

  // Actions
  const toggleResourceStatus = (id: string) => {
    setResources(prev =>
      prev.map(item => {
        if (item.id === id) {
          const nextStatus = item.status === 'active' ? 'maintenance' : 'active';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const addQuotaHours = (userId: string, hours: number) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          return { ...u, quotaMaxHours: u.quotaMaxHours + hours, status: 'active' };
        }
        return u;
      })
    );
  };

  const resetNoShow = (userId: string) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          return { ...u, noShowCount: 0, reputationScore: 98, status: 'active' };
        }
        return u;
      })
    );
  };

  const exportLedgerCsv = () => {
    const headers = 'Ma Giao Dich,Ma Dat Cho,Khach Hang,Tai Nguyen,Khung Gio,So Tien (VND),Phuong Thuc,Trang Thai,Thoi Gian\n';
    const rows = ledgers
      .map(
        l =>
          `"${l.id}","${l.bookingRef}","${l.userName}","${l.resourceName}","${l.timeSlot}",${l.amountVnd},"${l.paymentMethod}","${l.status}","${l.timestamp}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `so-cai-doanh-thu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Sub-Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
              Quản Trị Hệ Thống & Phân Bổ Tài Nguyên
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#00E5FF',
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                padding: '3px 10px',
                borderRadius: '100px',
                letterSpacing: '0.05em'
              }}
            >
              ADMIN 2026
            </span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: '6px 0 0 0' }}>
            Thiết lập danh mục tài nguyên, quản lý hạn ngạch tín nhiệm & giám sát sổ cái dòng tiền VietQR.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div
          style={{
            display: 'inline-flex',
            padding: '4px',
            background: 'rgba(18, 22, 34, 0.8)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <button
            onClick={() => setActiveTab('resources')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'resources' ? '#00E5FF' : 'transparent',
              color: activeTab === 'resources' ? '#08090D' : '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <Layers size={15} />
            Danh Mục Tài Nguyên ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'users' ? '#00E5FF' : 'transparent',
              color: activeTab === 'users' ? '#08090D' : '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <Users size={15} />
            Hạn Ngạch Người Dùng ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: activeTab === 'ledger' ? '#00E5FF' : 'transparent',
              color: activeTab === 'ledger' ? '#08090D' : '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <CreditCard size={15} />
            Sổ Cái VietQR ({ledgers.length})
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DANH MỤC TÀI NGUYÊN & PHÒNG                       */}
      {/* ======================================================== */}
      {activeTab === 'resources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '12px' }}>
                <span>Tổng Tài Nguyên Sẵn Có</span>
                <Layers size={16} color="#00E5FF" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                {resources.length} Node/Phòng
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>
                ● 4 Sẵn sàng hoạt động
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '12px' }}>
                <span>Hiệu Suất Sử Dụng Trung Bình</span>
                <TrendingUp size={16} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                84.5%
              </div>
              <div style={{ fontSize: '11px', color: '#00E5FF', marginTop: '4px' }}>
                ↑ +6.2% so với tháng trước
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '12px' }}>
                <span>Doanh Thu Trung Bình / Giờ</span>
                <DollarSign size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                181.000 ₫
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                Áp dụng bảng giá linh động
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94A3B8', fontSize: '12px' }}>
                <span>Cần Bảo Trì Định Kỳ</span>
                <AlertTriangle size={16} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                1 Cụm Edge
              </div>
              <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px' }}>
                Dự kiến hoàn tất trong 4h
              </div>
            </div>
          </div>

          {/* Resources Table */}
          <div className="card-glass-2026" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã thiết bị..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: '36px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  style={{
                    width: '180px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}
                >
                  <option value="all">Tất cả phân loại</option>
                  <option value="gpu_cluster">Cụm GPU Cluster</option>
                  <option value="lab_room">Phòng Lab & Hội thảo</option>
                  <option value="workstation">Máy Trạm Chuyên Dụng</option>
                </select>
              </div>

              <button
                onClick={() => alert('Chức năng thêm mới phòng / cụm tài nguyên đang sẵn sàng trong phiên bản kế tiếp.')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00E5FF, #3B82F6)',
                  color: '#08090D',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                <Plus size={16} />
                Thêm Tài Nguyên Mới
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', height: '40px' }}>
                    <th>TÀI NGUYÊN & MÃ NODE</th>
                    <th>PHÂN LOẠI</th>
                    <th>CẤU HÌNH / SỨC CHỨA</th>
                    <th>ĐƠN GIÁ / GIỜ</th>
                    <th>TỶ LỆ KHAI THÁC</th>
                    <th>TRẠNG THÁI</th>
                    <th style={{ textAlign: 'right' }}>THAO TÁC QUẢN TRỊ</th>
                  </tr>
                </thead>
                <tbody>
                  {resources
                    .filter(
                      r =>
                        (filterCategory === 'all' || r.category === filterCategory) &&
                        (r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.code.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map(r => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          height: '56px',
                          color: '#F8FAFC'
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                            {r.code} • {r.location}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background:
                                r.category === 'gpu_cluster'
                                  ? 'rgba(139, 92, 246, 0.15)'
                                  : r.category === 'lab_room'
                                  ? 'rgba(0, 229, 255, 0.15)'
                                  : 'rgba(16, 185, 129, 0.15)',
                              color:
                                r.category === 'gpu_cluster'
                                  ? '#A78BFA'
                                  : r.category === 'lab_room'
                                  ? '#38EDFF'
                                  : '#34D399'
                            }}
                          >
                            {r.category === 'gpu_cluster'
                              ? 'GPU High-Compute'
                              : r.category === 'lab_room'
                              ? 'Phòng Lab Thông Minh'
                              : 'Trạm Làm Việc'}
                          </span>
                        </td>
                        <td style={{ color: '#CBD5E1' }}>{r.capacity}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#00E5FF' }}>
                          {r.hourlyRate.toLocaleString('vi-VN')} ₫/h
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '70px',
                                height: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${r.utilizationRate}%`,
                                  height: '100%',
                                  background: r.utilizationRate > 85 ? '#8B5CF6' : '#00E5FF'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                              {r.utilizationRate}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              padding: '3px 10px',
                              borderRadius: '100px',
                              background:
                                r.status === 'active'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : r.status === 'maintenance'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(0, 229, 255, 0.12)',
                              color:
                                r.status === 'active'
                                  ? '#10B981'
                                  : r.status === 'maintenance'
                                  ? '#F59E0B'
                                  : '#00E5FF',
                              border: `1px solid ${
                                r.status === 'active'
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : r.status === 'maintenance'
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : 'rgba(0, 229, 255, 0.3)'
                              }`
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background:
                                  r.status === 'active'
                                    ? '#10B981'
                                    : r.status === 'maintenance'
                                    ? '#F59E0B'
                                    : '#00E5FF'
                              }}
                            />
                            {r.status === 'active'
                              ? 'Hoạt động'
                              : r.status === 'maintenance'
                              ? 'Bảo trì'
                              : 'Đặt kín'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => toggleResourceStatus(r.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background:
                                r.status === 'active' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: r.status === 'active' ? '#F59E0B' : '#10B981',
                              border: '1px solid rgba(255,255,255,0.08)'
                            }}
                          >
                            {r.status === 'active' ? 'Chuyển Bảo Trì' : 'Kích Hoạt Lại'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HẠN NGẠCH NGƯỜI DÙNG & TÍN NHIỆM                   */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px' }}>
                <span>Tổng Tài Khoản Kích Hoạt</span>
                <Users size={16} color="#00E5FF" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                148 Tài khoản
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>
                ● 142 Không vi phạm chính sách
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px' }}>
                <span>Điểm Tín Nhiệm Trung Bình</span>
                <ShieldCheck size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                96.4 / 100
              </div>
              <div style={{ fontSize: '11px', color: '#00E5FF', marginTop: '4px' }}>
                Đánh giá dựa trên tỷ lệ Check-in QR
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px' }}>
                <span>Cảnh Báo No-Show (Vắng mặt)</span>
                <AlertTriangle size={16} color="#F59E0B" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                2 Trường hợp
              </div>
              <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                Bị tạm khóa quyền ưu tiên giờ cao điểm
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="card-glass-2026" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc email nghiên cứu sinh..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      paddingLeft: '36px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                Chính sách: Vắng mặt không hủy trước 2h sẽ bị trừ 10 điểm tín nhiệm.
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', height: '40px' }}>
                    <th>THÀNH VIÊN</th>
                    <th>VAI TRÒ</th>
                    <th>HẠN NGẠCH THÁNG</th>
                    <th>ĐIỂM TÍN NHIỆM</th>
                    <th>NO-SHOW</th>
                    <th>TRẠNG THÁI</th>
                    <th style={{ textAlign: 'right' }}>ĐIỀU PHỐI HẠN NGẠCH</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(
                      u =>
                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(u => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          height: '56px',
                          color: '#F8FAFC'
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{u.email}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(255,255,255,0.06)',
                              color: '#CBD5E1'
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            <span style={{ color: u.quotaUsedHours >= u.quotaMaxHours ? '#EF4444' : '#00E5FF', fontWeight: 600 }}>
                              {u.quotaUsedHours}h
                            </span>{' '}
                            / {u.quotaMaxHours}h
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${u.reputationScore}%`,
                                  height: '100%',
                                  background: u.reputationScore >= 90 ? '#10B981' : u.reputationScore >= 80 ? '#F59E0B' : '#EF4444'
                                }}
                              />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600 }}>
                              {u.reputationScore}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: u.noShowCount === 0 ? '#10B981' : '#EF4444'
                            }}
                          >
                            {u.noShowCount === 0 ? '0 vi phạm' : `${u.noShowCount} lần vắng`}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              background:
                                u.status === 'active'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : u.status === 'warning'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                u.status === 'active'
                                  ? '#10B981'
                                  : u.status === 'warning'
                                  ? '#F59E0B'
                                  : '#EF4444'
                            }}
                          >
                            {u.status === 'active'
                              ? 'Bình thường'
                              : u.status === 'warning'
                              ? 'Cảnh báo'
                              : 'Bị giới hạn'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => addQuotaHours(u.id, 10)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                background: 'rgba(0, 229, 255, 0.1)',
                                color: '#00E5FF',
                                border: '1px solid rgba(0, 229, 255, 0.2)'
                              }}
                            >
                              +10 Giờ
                            </button>
                            {u.noShowCount > 0 && (
                              <button
                                onClick={() => resetNoShow(u.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10B981',
                                  border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}
                              >
                                Reset Phạt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SỔ CÁI VIETQR & LỊCH SỬ ĐẶT CHỖ                    */}
      {/* ======================================================== */}
      {activeTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Revenue Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px' }}>
                <span>Tổng Doanh Thu Tháng 09</span>
                <DollarSign size={16} color="#10B981" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                48.500.000 ₫
              </div>
              <div style={{ fontSize: '11px', color: '#00E5FF', marginTop: '4px' }}>
                VietQR Napas247 tự động đối soát tức thì
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px' }}>
                <span>Tỷ Lệ Thanh Toán Thành Công</span>
                <CheckCircle2 size={16} color="#00E5FF" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                98.6%
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>
                Trung bình xác nhận: 1.8 giây
              </div>
            </div>

            <div className="card-glass-2026" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px' }}>
                <span>Tổng Giờ Phòng / Compute Đã Thu</span>
                <Clock size={16} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                320 Giờ
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                12 giao dịch hoàn tất hôm nay
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="card-glass-2026" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#F8FAFC' }}>
                  Lịch Sử Giao Dịch VietQR & Phân Bổ
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}
                >
                  Sync Online
                </span>
              </div>

              <button
                onClick={exportLedgerCsv}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#F8FAFC',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <Download size={15} />
                Xuất Báo Cáo Sổ Cái (CSV)
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748B', height: '40px' }}>
                    <th>MÃ GIAO DỊCH</th>
                    <th>KHÁCH HÀNG / LAB</th>
                    <th>TÀI NGUYÊN & KHUNG GIỜ</th>
                    <th>SỐ TIỀN THANH TOÁN</th>
                    <th>PHƯƠNG THỨC</th>
                    <th>TRẠNG THÁI</th>
                    <th style={{ textAlign: 'right' }}>THỜI GIAN</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.map(l => (
                    <tr
                      key={l.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        height: '56px',
                        color: '#F8FAFC'
                      }}
                    >
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#00E5FF' }}>
                          {l.id}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                          Ref: {l.bookingRef}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.userName}</div>
                      </td>
                      <td>
                        <div style={{ color: '#CBD5E1' }}>{l.resourceName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{l.timeSlot}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981' }}>
                          {l.amountVnd.toLocaleString('vi-VN')} ₫
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{l.paymentMethod}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            background:
                              l.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : l.status === 'pending'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              l.status === 'paid'
                                ? '#10B981'
                                : l.status === 'pending'
                                ? '#F59E0B'
                                : '#EF4444',
                            border: `1px solid ${
                              l.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : l.status === 'pending'
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)'
                            }`
                          }}
                        >
                          {l.status === 'paid'
                            ? 'Đã khớp lệnh'
                            : l.status === 'pending'
                            ? 'Chờ chuyển khoản'
                            : 'Đã hoàn tiền'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748B', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        {l.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
