import React from 'react';
import { BookOpen, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { useLocale } from '../providers/LocaleProvider';
import '../styles/resource-media.css';

export type UsageGuide = {
  beforeUse?: string[];
  steps?: string[];
  afterUse?: string[];
  safetyNotes?: string;
};

export function ResourceUsageGuide({ guide }: { guide?: UsageGuide }) {
  const { t } = useLocale();
  const sections = [
    { key: 'beforeUse', title: t('Trước khi nhận thiết bị', 'Before handover'), rows: guide?.beforeUse },
    { key: 'steps', title: t('Các bước sử dụng', 'Operating steps'), rows: guide?.steps },
    { key: 'afterUse', title: t('Trước khi hoàn trả', 'Before returning'), rows: guide?.afterUse }
  ];
  const hasGuide = sections.some(section => Array.isArray(section.rows) && section.rows.length) || Boolean(guide?.safetyNotes);
  return <section className="resource-usage-guide" aria-label={t('Hướng dẫn sử dụng', 'Usage guide')}>
    <div className="resource-guide-heading"><BookOpen size={20} aria-hidden="true" /><h4>{t('Hướng dẫn sử dụng', 'Usage guide')}</h4></div>
    {hasGuide ? <>
      <p className="resource-guide-note">{t('Hướng dẫn do đơn vị quản lý cung cấp. Chứng chỉ và phê duyệt vẫn được kiểm tra khi đặt lịch.', 'Instructions supplied by the managing unit. Training and approval are still checked when booking.')}</p>
      {sections.map(section => Array.isArray(section.rows) && section.rows.length > 0 && <details key={section.key} open>
        <summary>{section.title}<span>{section.rows.length} {t('bước', 'steps')}</span></summary>
        <ol>{section.rows.map((step, index) => <li key={index}>{step}</li>)}</ol>
      </details>)}
      {guide?.safetyNotes && <div className="resource-guide-safety"><ShieldAlert size={18} aria-hidden="true" /><div><strong>{t('Lưu ý an toàn', 'Safety notes')}</strong><p>{guide.safetyNotes}</p></div></div>}
    </> : <p className="resource-guide-note">{t('Chưa có hướng dẫn vận hành cho thiết bị này. Đề nghị cán bộ LAB hướng dẫn trực tiếp trước khi sử dụng.', 'Operating instructions have not been published for this resource. Ask LAB staff for an induction before use.')}</p>}
    <details className="resource-guide-workflow">
      <summary><ClipboardCheck size={17} aria-hidden="true" />{t('Quy trình mượn & hoàn trả', 'Borrowing & return process')}</summary>
      <ol>
        <li>{t('Chọn lịch, kiểm tra chứng chỉ và gửi mục đích sử dụng. Chờ xác nhận nếu tài nguyên cần duyệt.', 'Choose a time, check training and submit your purpose. Wait for confirmation when approval is required.')}</li>
        <li>{t('Khi nhận: cùng cán bộ kiểm tra phụ kiện, tình trạng và ghi nhận bàn giao trước khi vận hành.', 'At handover: check accessories and condition with staff and record the handover before operating.')}</li>
        <li>{t('Trong khi dùng: làm theo hướng dẫn của thiết bị. Nếu có dấu hiệu bất thường, dừng thao tác và báo cán bộ LAB.', 'During use: follow the equipment instructions. Stop and inform LAB staff if anything is abnormal.')}</li>
        <li>{t('Hoàn trả đúng hạn, ghi nhận tình trạng và phụ kiện. Thiết bị cần cán bộ xác nhận hoàn trả; khai báo của người mượn không thay thế kiểm tra.', 'Return on time and record condition and accessories. Equipment returns require staff confirmation; a borrower declaration does not replace inspection.')}</li>
      </ol>
    </details>
  </section>;
}
