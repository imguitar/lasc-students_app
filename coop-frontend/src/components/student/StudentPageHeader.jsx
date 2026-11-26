import { useMemo } from 'react';

/**
 * Page Header มาตรฐานของหน้านักศึกษา (วางนอกการ์ดเนื้อหา)
 * ไอคอน + ชื่อหน้า + คำอธิบาย ด้านซ้าย และป้ายผู้ใช้ "ชื่อ-นามสกุล (รหัสนักศึกษา)" ด้านขวา
 * เส้นคั่นใต้หัวมาจาก .unified-card-head ใน index.css (border-b slate-200/80)
 */
const readIdentity = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null') || {};
    const code = String(u.student_code || u.studentId || u.username || '').trim();
    const name = String(u.full_name || u.name || '').trim() || code || 'นักศึกษา';
    return { name, code };
  } catch {
    return { name: 'นักศึกษา', code: '' };
  }
};

const StudentPageHeader = ({ icon: Icon, title, subtitle }) => {
  const { name, code } = useMemo(() => readIdentity(), []);
  const label = code && name !== code ? `${name} (${code})` : name;

  return (
    <header className="unified-card-head">
      <div className="unified-card-title-wrap">
        <span className="unified-card-icon">
          {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h1 className="unified-card-title">{title}</h1>
          {subtitle && <p className="unified-card-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="unified-card-user">
        <span className="unified-card-dot" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
    </header>
  );
};

export default StudentPageHeader;
