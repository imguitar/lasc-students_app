import { useSearchParams } from 'react-router-dom';
import { CalendarRange, CalendarClock, CalendarDays, CalendarCheck, ChevronDown } from 'lucide-react';
import AdminInternshipRoundsModal from './AdminInternshipRoundsModal';
import AdminHolidaysPanel from './AdminHolidaysPanel';
import AdminEvaluationRoundsModal from './AdminEvaluationRoundsModal';

// แท็บทั้งหมด — ค่า key ตรงกับ ?tab=... บน URL
const TABS = [
  { key: 'rounds', label: 'กำหนดรอบปฏิทินฝึกงาน', shortLabel: 'รอบฝึกงาน', Icon: CalendarRange },
  { key: 'holidays', label: 'จัดการวันหยุด', shortLabel: 'วันหยุด', Icon: CalendarDays },
  { key: 'evaluations', label: 'กำหนดรอบการประเมิน นศ.', shortLabel: 'การประเมิน', Icon: CalendarCheck },
];
const TAB_KEYS = TABS.map((t) => t.key);

/**
 * หน้า จัดการกำหนดการและปฏิทิน — รวมงานกำหนดเวลาของแอดมินไว้ที่เดียว
 * สถานะแท็บอยู่บน URL (?tab=rounds | holidays | evaluations) เพื่อให้ลิงก์และการกดย้อนกลับทำงานได้
 */
const AdminSchedulesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const activeKey = TAB_KEYS.includes(requested) ? requested : 'rounds';

  const selectTab = (key) => {
    setSearchParams(key === 'rounds' ? {} : { tab: key }, { replace: true });
  };

  const onTabKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    selectTab(TABS[next].key);
    document.getElementById(`sched-tab-${TABS[next].key}`)?.focus();
  };

  return (
    <main className="admin-main sched-page">
      <section className="sched-card sched-unified">
      <header className="sched-header">
        <span className="sched-header-icon" aria-hidden="true"><CalendarClock className="w-5 h-5" /></span>
        <div className="min-w-0">
          <h1 className="sched-title">จัดการกำหนดการและปฏิทิน</h1>
          <p className="sched-desc">กำหนดรอบการฝึกงาน วันหยุดนักขัตฤกษ์ และกรอบเวลาการประเมินผลของระบบ</p>
        </div>
      </header>

      <div className="sched-tab-select-wrap">
        <select
          id="sched-tab-select"
          className="sched-tab-select"
          value={activeKey}
          onChange={(e) => selectTab(e.target.value)}
          aria-label="หมวดกำหนดการ"
        >
          {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <ChevronDown className="sched-tab-select-icon" aria-hidden="true" />
      </div>

      <div className="sched-tabs" role="tablist" aria-label="หมวดกำหนดการ">
        {TABS.map((t, index) => {
          const selected = t.key === activeKey;
          const TabIcon = t.Icon;
          return (
            <button
              key={t.key}
              id={`sched-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="sched-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(t.key)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={`sched-tab ${selected ? 'is-active' : ''}`}
            >
              <TabIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="sched-tab-label sm:hidden">{t.shortLabel}</span>
              <span className="sched-tab-label hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div id="sched-panel" role="tabpanel" aria-labelledby={`sched-tab-${activeKey}`} className="sched-body">
        {activeKey === 'rounds' && <AdminInternshipRoundsModal embedded open onClose={() => {}} />}
        {activeKey === 'holidays' && <AdminHolidaysPanel />}
        {activeKey === 'evaluations' && <AdminEvaluationRoundsModal embedded open onClose={() => {}} />}
      </div>
      </section>
    </main>
  );
};

export default AdminSchedulesPage;
