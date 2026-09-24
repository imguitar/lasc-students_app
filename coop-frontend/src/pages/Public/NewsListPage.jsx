import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  MapPinIcon,
  CalendarIcon,
  NewspaperIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { RotateCcw } from 'lucide-react';

const ALL_DEPARTMENTS = [
  'สาขาวิชาวิทยาการคอมพิวเตอร์',
  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
  'สาขาวิชาสาธารณสุขชุมชน',
  'สาขาวิชาวิทยาศาสตร์การกีฬา',
  'สาขาวิชาเทคโนโลยีการเกษตร',
  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
  'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  'สาขาวิชาวิศวกรรมโลจิสติกส์',
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม',
];

const categoryPill = {
  'รับสมัคร': 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  'ประกาศ': 'bg-purple-100 text-purple-700 border border-purple-200/60',
  'กิจกรรม': 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  'ทั่วไป': 'bg-slate-100 text-slate-600 border border-slate-200/60',
};

const PAGE_SIZE = 9;

const normalizeDept = (s = '') => s.replace(/สาขาวิชา/g, '').replace(/\s+/g, '').trim();

const NewsListPage = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [department, setDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/public/announcements')
      .then(res => setNews(res.data.data || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => [...new Set(news.map(n => n.category).filter(Boolean))],
    [news]
  );

  const hasDepartmentData = useMemo(
    () => news.some(n => n.department || n.major),
    [news]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const normSelectedDept = department === 'all' ? '' : normalizeDept(department);

    let list = news.filter(n => {
      const matchesSearch = !q
        || (n.title || '').toLowerCase().includes(q)
        || (n.content || '').toLowerCase().includes(q);
      const matchesCategory = category === 'all' || n.category === category;
      const newsDept = normalizeDept(n.department || n.major || '');
      const matchesDept = department === 'all'
        || !newsDept
        || newsDept.includes(normSelectedDept)
        || normSelectedDept.includes(newsDept);
      return matchesSearch && matchesCategory && matchesDept;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'pinned') return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? da - db : db - da;
    });

    return list;
  }, [news, search, category, department, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilter = search.trim() !== '' || category !== 'all' || department !== 'all' || sortBy !== 'latest';

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setDepartment('all');
    setSortBy('latest');
    setPage(1);
  };

  const selectClass = 'w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 transition focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 cursor-pointer';
  const chevron = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
      <ChevronDownIcon className="w-4 h-4" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-purple-100/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-purple-700 no-underline transition-colors">
            <ArrowLeftIcon className="w-4 h-4" /> กลับหน้าแรก
          </Link>
          <span className="text-xs font-medium text-slate-400 hidden sm:block">ระบบฝึกประสบการณ์วิชาชีพ</span>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-10 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-fuchsia-400/15 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative">
          <nav className="flex items-center gap-1.5 text-xs text-purple-200/80 mb-4">
            <Link to="/" className="hover:text-white no-underline text-purple-200/80 transition-colors">หน้าแรก</Link>
            <ChevronRightIcon className="w-3.5 h-3.5" />
            <span className="text-white font-medium">ข่าวสารและประกาศ</span>
          </nav>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-purple-200 border border-white/20 backdrop-blur-md mb-3">
            <MegaphoneIcon className="w-3.5 h-3.5" /> ประชาสัมพันธ์
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight m-0 text-white">
            ข่าวสารและประกาศทั้งหมด
          </h1>
          <p className="mt-2 text-purple-100/85 text-sm sm:text-base max-w-2xl font-light m-0">
            ติดตามข่าวสารการรับสมัคร กำหนดการ และประกาศสำคัญเกี่ยวกับการฝึกประสบการณ์วิชาชีพ
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Filter Bar */}
        <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-50 p-5 sm:p-6 -mt-8 relative z-10">
          <div className={`grid grid-cols-1 gap-3.5 ${hasDepartmentData ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="ค้นหาหัวข้อข่าว, เนื้อหา..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-2.5 text-sm font-medium text-gray-700 transition focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <div className="relative">
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setPage(1); }}
                className={selectClass}
              >
                <option value="all">ทุกหมวดหมู่</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {chevron}
            </div>

            {hasDepartmentData && (
              <div className="relative">
                <select
                  value={department}
                  onChange={e => { setDepartment(e.target.value); setPage(1); }}
                  className={selectClass}
                >
                  <option value="all">ทุกสาขาวิชา (12 สาขา)</option>
                  {ALL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {chevron}
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setPage(1); }}
                  className={selectClass}
                >
                  <option value="latest">ล่าสุด</option>
                  <option value="oldest">เก่าที่สุด</option>
                  <option value="pinned">ข่าวปักหมุดก่อน</option>
                </select>
                {chevron}
              </div>
              {hasFilter && (
                <button
                  onClick={resetFilters}
                  title="ล้างตัวกรอง"
                  className="shrink-0 w-[42px] rounded-xl border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 flex items-center justify-center transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400 font-medium">
            พบ <span className="text-purple-700 font-bold">{filtered.length}</span> รายการ
          </div>
        </div>

        {/* News Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            </div>
          ) : pageItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-16 px-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-purple-50 text-purple-300 flex items-center justify-center mb-4">
                <NewspaperIcon className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 m-0 mb-1.5">ไม่พบข่าวสารหรือประกาศที่ตรงกับเงื่อนไข</h3>
              <p className="text-sm text-slate-400 m-0 mb-5">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นเพิ่มเติม</p>
              {hasFilter && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> ล้างการค้นหา
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {pageItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/news/${item.id}`)}
                    className="group rounded-2xl border border-gray-100 bg-white hover:border-purple-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                  >
                    {item.coverImage ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-200/40 rounded-full blur-2xl" />
                        <div className="absolute -bottom-10 -left-6 w-36 h-36 bg-indigo-200/40 rounded-full blur-2xl" />
                        <MegaphoneIcon className="w-10 h-10 text-purple-300 relative" />
                      </div>
                    )}

                    <div className="p-5 flex flex-col gap-2.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold px-3 py-1 rounded-full text-[11px] ${categoryPill[item.category] || categoryPill['ทั่วไป']}`}>
                          {item.category}
                        </span>
                        {item.is_pinned ? (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3" /> ปักหมุด
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserCircleIcon className="w-3.5 h-3.5" />
                          {item.author && item.author.toLowerCase() !== 'admin' ? item.author : 'งานฝึกประสบการณ์วิชาชีพ'}
                        </span>
                      </div>

                      <h3 className="m-0 text-base font-bold text-gray-800 group-hover:text-purple-700 line-clamp-2 leading-snug transition-colors">
                        {item.title}
                      </h3>

                      <p className="m-0 line-clamp-2 text-gray-500 text-sm leading-relaxed flex-1">
                        {item.content}
                      </p>

                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 group-hover:text-purple-800 mt-1 transition-colors">
                        อ่านรายละเอียด <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" /> ย้อนกลับ
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        p === safePage
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 border border-transparent'
                          : 'border border-gray-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ถัดไป <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsListPage;
