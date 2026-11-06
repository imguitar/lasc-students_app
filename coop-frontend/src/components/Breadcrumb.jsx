import React, { useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';

/**
 * Route Configuration Dictionary for Thai Breadcrumbs
 * Strictly matching route hierarchy without emojis
 */
const ROUTE_CONFIG = {
  // Admin Routes
  '/admin-dashboard': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
  },
  '/admin-dashboard/students': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'นักศึกษา', path: '/admin-dashboard/students' },
    current: 'รายชื่อนักศึกษา',
  },
  '/admin-dashboard/requests': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'คำร้อง', path: '/admin-dashboard/requests' },
    current: 'คำร้องทั้งหมด',
  },
  '/admin-dashboard/profile': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'ข้อมูลผู้ใช้งาน', path: '/admin-dashboard/profile' },
    current: 'โปรไฟล์',
  },
  '/admin-dashboard/companies': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'สถานประกอบการ', path: '/admin-dashboard/companies' },
    current: 'จัดการสถานประกอบการ',
  },
  '/admin-dashboard/checkins': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'การเข้าฝึกงาน', path: '/admin-dashboard/checkins' },
    current: 'รายงานและการเข้าฝึกงาน',
  },
  '/admin-dashboard/attendance-overview': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'การเข้าฝึกงาน', path: '/admin-dashboard/checkins' },
    current: 'รายงานและการเข้าฝึกงาน',
  },
  '/admin-dashboard/reports': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'รายงาน', path: '/admin-dashboard/reports' },
    current: 'สรุปรายงาน',
  },
  '/admin-dashboard/relocations': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'ย้ายสถานที่ฝึกงาน', path: '/admin-dashboard/relocations' },
    current: 'คำร้องขอย้ายที่ฝึกงาน',
  },
  '/admin-dashboard/home-editor': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'จัดการหน้าแรก', path: '/admin-dashboard/home-editor' },
    current: 'เนื้อหาหน้าแรก',
  },
  '/admin-dashboard/announcements': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'จัดการหน้าแรก', path: '/admin-dashboard/home-editor' },
    current: 'เนื้อหาหน้าแรก',
  },
  '/admin-dashboard/banners': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'จัดการหน้าแรก', path: '/admin-dashboard/home-editor' },
    current: 'เนื้อหาหน้าแรก',
  },
  '/admin-dashboard/notifications': {
    root: { label: 'หน้าหลัก', path: '/admin-dashboard' },
    parent: { label: 'การแจ้งเตือน', path: '/admin-dashboard/notifications' },
    current: 'รายการแจ้งเตือน',
  },

  // Student Routes
  '/dashboard': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
  },
  '/dashboard/profile': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'ข้อมูลผู้ใช้งาน', path: '/dashboard/profile' },
    current: 'โปรไฟล์',
  },
  '/dashboard/new-request': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'คำร้อง', path: '/dashboard/my-requests' },
    current: 'ยื่นคำร้องใหม่',
  },
  '/dashboard/my-requests': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'คำร้อง', path: '/dashboard/my-requests' },
    current: 'คำร้องของฉัน',
  },
  '/dashboard/check-in': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'รายงานประจำวัน', path: '/dashboard/check-in' },
    current: 'รายงานประจำวัน',
  },
  '/dashboard/payment-proof': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'การเงิน', path: '/dashboard/payment-proof' },
    current: 'หลักฐานการชำระออกฝึก',
  },
  '/dashboard/relocation-request': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'ย้ายสถานที่ฝึกงาน', path: '/dashboard/relocation-request' },
    current: 'คำร้องขอย้ายที่ฝึกงาน',
  },
  '/dashboard/notifications': {
    root: { label: 'หน้าหลัก', path: '/dashboard' },
    parent: { label: 'การแจ้งเตือน', path: '/dashboard/notifications' },
    current: 'รายการแจ้งเตือน',
  },

  // Advisor Routes
  '/advisor-dashboard': {
    root: { label: 'หน้าหลัก', path: '/advisor-dashboard' },
  },
  '/advisor-dashboard/students': {
    root: { label: 'หน้าหลัก', path: '/advisor-dashboard' },
    parent: { label: 'นักศึกษา', path: '/advisor-dashboard/students' },
    current: 'นักศึกษาในความดูแล',
  },
  '/advisor-dashboard/supervision': {
    root: { label: 'หน้าหลัก', path: '/advisor-dashboard' },
    parent: { label: 'นิเทศการฝึกงาน', path: '/advisor-dashboard/supervision' },
    current: 'บันทึกการนิเทศ',
  },
  '/advisor-dashboard/relocations': {
    root: { label: 'หน้าหลัก', path: '/advisor-dashboard' },
    parent: { label: 'คำร้องขอย้าย', path: '/advisor-dashboard/relocations' },
    current: 'คำร้องขอย้ายสถานที่ฝึกงาน',
  },
  '/advisor-dashboard/progress': {
    root: { label: 'หน้าหลัก', path: '/advisor-dashboard' },
    parent: { label: 'ความก้าวหน้า', path: '/advisor-dashboard/progress' },
    current: 'ติดตามความก้าวหน้านักศึกษา',
  },
  '/advisor-dashboard/profile': {
    root: { label: 'หน้าหลัก', path: '/advisor-dashboard' },
    parent: { label: 'ข้อมูลผู้ใช้งาน', path: '/advisor-dashboard/profile' },
    current: 'โปรไฟล์',
  },
};

const resolveBreadcrumbItems = (rawPath) => {
  // Strip basename /coop prefix if present, and trim trailing slashes
  let clean = rawPath.replace(/^\/coop/, '').replace(/\/$/, '') || '/';

  // 1. Direct configuration match
  if (ROUTE_CONFIG[clean]) {
    const cfg = ROUTE_CONFIG[clean];
    const items = [
      {
        label: cfg.root.label,
        path: cfg.root.path,
        isRoot: true,
        isCurrent: !cfg.parent && !cfg.current,
      },
    ];
    if (cfg.parent) {
      items.push({
        label: cfg.parent.label,
        path: cfg.parent.path,
        isParent: true,
        isCurrent: false,
      });
    }
    if (cfg.current) {
      items.push({
        label: cfg.current,
        path: clean,
        isCurrent: true,
      });
    }
    return items;
  }

  // 2. Specific prefix-based route matching (e.g. details pages with IDs)
  if (clean.startsWith('/admin-dashboard/relocations/')) {
    return [
      { label: 'หน้าหลัก', path: '/admin-dashboard', isRoot: true, isCurrent: false },
      { label: 'ย้ายสถานที่ฝึกงาน', path: '/admin-dashboard/relocations', isParent: true, isCurrent: false },
      { label: 'รายละเอียดคำร้องขอย้าย', path: clean, isCurrent: true },
    ];
  }

  if (clean.startsWith('/admin-dashboard/requests/')) {
    return [
      { label: 'หน้าหลัก', path: '/admin-dashboard', isRoot: true, isCurrent: false },
      { label: 'คำร้อง', path: '/admin-dashboard/requests', isParent: true, isCurrent: false },
      { label: 'รายละเอียดคำร้อง', path: clean, isCurrent: true },
    ];
  }

  if (clean.startsWith('/dashboard/edit-request/')) {
    return [
      { label: 'หน้าหลัก', path: '/dashboard', isRoot: true, isCurrent: false },
      { label: 'คำร้อง', path: '/dashboard/my-requests', isParent: true, isCurrent: false },
      { label: 'แก้ไขคำร้อง', path: clean, isCurrent: true },
    ];
  }

  // 3. Dynamic segment breakdown fallback
  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 0) {
    return [{ label: 'หน้าหลัก', path: '/', isRoot: true, isCurrent: true }];
  }

  const rootPath = `/${segments[0]}`;
  const items = [{ label: 'หน้าหลัก', path: rootPath, isRoot: true, isCurrent: segments.length === 1 }];

  if (segments.length > 1) {
    const parentSegment = segments[1];
    const parentPath = `${rootPath}/${parentSegment}`;
    const segmentMap = {
      students: { parent: 'นักศึกษา', current: 'รายชื่อนักศึกษา' },
      requests: { parent: 'คำร้อง', current: 'คำร้องทั้งหมด' },
      profile: { parent: 'ข้อมูลผู้ใช้งาน', current: 'โปรไฟล์' },
      companies: { parent: 'สถานประกอบการ', current: 'จัดการสถานประกอบการ' },
      checkins: { parent: 'การเข้าฝึกงาน', current: 'รายงานและการเข้าฝึกงาน' },
      reports: { parent: 'รายงาน', current: 'สรุปรายงาน' },
      relocations: { parent: 'ย้ายสถานที่ฝึกงาน', current: 'คำร้องขอย้ายที่ฝึกงาน' },
      'home-editor': { parent: 'จัดการหน้าแรก', current: 'เนื้อหาหน้าแรก' },
      notifications: { parent: 'การแจ้งเตือน', current: 'รายการแจ้งเตือน' },
    };

    const mapped = segmentMap[parentSegment];
    if (mapped) {
      items.push({ label: mapped.parent, path: parentPath, isParent: true, isCurrent: false });
      items.push({
        label: segments.length === 2 ? mapped.current : 'รายละเอียด',
        path: clean,
        isCurrent: true,
      });
    } else {
      items.push({ label: parentSegment, path: clean, isCurrent: true });
    }
  }

  return items;
};

const Breadcrumb = () => {
  const location = useLocation();

  useEffect(() => {
    document.body.classList.add('has-subnav');
    return () => {
      document.body.classList.remove('has-subnav');
    };
  }, []);

  const items = useMemo(() => {
    return resolveBreadcrumbItems(location.pathname);
  }, [location.pathname]);

  return (
    <nav
      aria-label="การนำทางตามเส้นทาง (Breadcrumbs)"
      className="site-breadcrumb w-full h-8 md:h-9 flex items-center select-none"
    >
      <div className="w-full h-full flex items-center px-4 sm:px-6 md:px-8 lg:pl-[292px] overflow-x-auto whitespace-nowrap scrollbar-none">
        <ol className="flex items-center gap-1.5 sm:gap-2 list-none m-0 p-0 text-xs md:text-sm font-medium">
          {items.map((item, index) => {
            return (
              <li key={`${item.path}-${index}`} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="text-purple-300/40 select-none text-xs font-light px-0.5"
                  >
                    /
                  </span>
                )}

                {item.isCurrent ? (
                  <span
                    className="text-white font-semibold text-xs md:text-sm flex items-center gap-1.5"
                    aria-current="page"
                  >
                    {item.isRoot && <Home className="w-3.5 h-3.5 shrink-0 text-purple-200" />}
                    <span>{item.label}</span>
                  </span>
                ) : item.isRoot ? (
                  <Link
                    to={item.path}
                    className="text-purple-200/80 hover:text-white hover:underline transition-colors text-xs md:text-sm font-medium flex items-center gap-1.5"
                  >
                    <Home className="w-3.5 h-3.5 shrink-0 text-purple-200" />
                    <span className="hidden min-[400px]:inline">{item.label}</span>
                  </Link>
                ) : item.isParent ? (
                  <Link
                    to={item.path}
                    className="text-purple-200/80 hover:text-white hover:underline transition-colors text-xs md:text-sm font-medium flex items-center gap-1.5"
                  >
                    <span className="hidden min-[400px]:inline">{item.label}</span>
                    <span className="inline min-[400px]:hidden text-purple-300/60 font-normal">...</span>
                  </Link>
                ) : (
                  <Link
                    to={item.path}
                    className="text-purple-200/80 hover:text-white hover:underline transition-colors text-xs md:text-sm font-medium flex items-center gap-1.5"
                  >
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default Breadcrumb;

