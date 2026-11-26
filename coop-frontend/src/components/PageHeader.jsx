/**
 * Page Header มาตรฐานของทุกบทบาท (วางนอกการ์ดเนื้อหา)
 * ไอคอน + ชื่อหน้า + คำอธิบาย ด้านซ้าย และป้ายผู้ใช้ (pill) ด้านขวา
 * เส้นคั่นใต้หัวมาจาก .unified-card-head ใน index.css (border-b slate-200/80)
 */
const PageHeader = ({ icon: Icon, title, subtitle, pill }) => (
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
    {pill && (
      <div className="unified-card-user">
        <span className="unified-card-dot" aria-hidden="true" />
        <span className="truncate">{pill}</span>
      </div>
    )}
  </header>
);

export default PageHeader;
