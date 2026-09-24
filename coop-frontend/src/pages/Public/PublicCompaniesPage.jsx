import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import logo from '../../assets/LASC-SSKRU-1.png';
import StatusBadge from '../../components/StatusBadge';
import {
  Building2,
  MapPin,
  Briefcase,
  Sparkles,
  Search,
  Phone,
  Mail,
  Globe,
  X,
  ArrowLeft,
  GraduationCap,
  Users,
  ChevronDown,
  RotateCcw,
  Loader2,
} from 'lucide-react';

const ALL_DEPARTMENTS = [
  'สาขาวิชาวิทยาการคอมพิวเตอร์',
  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
  'สาขาวิชาสาธารณสุขชุมชน',
  'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
  'สาขาวิชาวิทยาศาสตร์การกีฬา',
  'สาขาวิชาเทคโนโลยีการเกษตร',
  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
  'สาขาวิชาวิศวกรรมโลจิสติกส์',
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม',
];

const SHORT_DEPT_LABELS = {
  'สาขาวิชาวิทยาการคอมพิวเตอร์': 'วิทยาการคอมพิวเตอร์',
  'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล': 'เทคโนโลยีคอมฯ',
  'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์': 'วิศวกรรมซอฟต์แวร์ / AI',
  'สาขาวิชาสาธารณสุขชุมชน': 'สาธารณสุขชุมชน',
  'สาขาวิชาอาชีวอนามัยและความปลอดภัย': 'อาชีวอนามัยฯ',
  'สาขาวิชาวิทยาศาสตร์การกีฬา': 'วิทย์การกีฬา',
  'สาขาวิชาเทคโนโลยีการเกษตร': 'เทคโนโลยีการเกษตร',
  'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร': 'นวัตกรรมอาหาร',
  'สาขาวิชาวิศวกรรมโลจิสติกส์': 'วิศวกรรมโลจิสติกส์',
  'สาขาวิชาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม': 'วิศวกรรมอุตสาหการฯ',
  'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ': 'การออกแบบผลิตภัณฑ์ฯ',
  'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม': 'เทคโนโลยีโยธาฯ',
};

const SORT_OPTIONS = [
  { value: 'students', label: 'นักศึกษาฝึกงานมากที่สุด' },
  { value: 'name', label: 'ชื่อบริษัท (ก-ฮ)' },
  { value: 'latest', label: 'ล่าสุด' },
];

const getDepartments = (comp) => {
  if (Array.isArray(comp.departments) && comp.departments.length > 0) return comp.departments;
  if (comp.department) return comp.department.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

const shortDept = (dept) => SHORT_DEPT_LABELS[dept] || String(dept || '').replace('สาขาวิชา', '');

const formatDateThai = (val) => {
  if (!val) return '-';
  try { return new Date(val).toLocaleDateString('th-TH'); } catch { return '-'; }
};

const selectClass =
  'w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 transition focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 cursor-pointer';

const FilterSelect = ({ value, onChange, children }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className={selectClass}>
      {children}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
      <ChevronDown className="w-4 h-4" />
    </div>
  </div>
);

const PublicCompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('students');
  const [selectedCompanyModal, setSelectedCompanyModal] = useState(null);
  const [interns, setInterns] = useState([]);
  const [internsLoading, setInternsLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/public/companies')
      .then((res) => setCompanies(res.data.data || []))
      .catch((err) => console.error('Failed to load companies:', err))
      .finally(() => setLoading(false));
  }, []);

  const openCompanyModal = (comp) => {
    setSelectedCompanyModal(comp);
    setInterns([]);
    if ((comp.studentCount || 0) > 0) {
      setInternsLoading(true);
      api.get(`/public/companies/${encodeURIComponent(comp.name)}/students`)
        .then((res) => setInterns(res.data.data || []))
        .catch(() => setInterns([]))
        .finally(() => setInternsLoading(false));
    }
  };

  const closeCompanyModal = () => {
    setSelectedCompanyModal(null);
    setInterns([]);
    setInternsLoading(false);
  };

  const provincesList = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.province && c.province.trim()) set.add(c.province.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  const businessTypesList = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.businessType && c.businessType.trim()) set.add(c.businessType.trim());
    });
    return Array.from(set).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    const list = companies.filter((c) => {
      const matchSearch =
        !s ||
        c.name?.toLowerCase().includes(s) ||
        c.businessType?.toLowerCase().includes(s) ||
        c.positions?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s) ||
        c.province?.toLowerCase().includes(s) ||
        c.department?.toLowerCase().includes(s);

      const matchProvince =
        selectedProvince === 'all' ||
        (c.province && c.province.includes(selectedProvince)) ||
        (c.address && c.address.includes(selectedProvince));

      const matchType = selectedType === 'all' || c.businessType === selectedType;

      let matchDept = selectedDepartment === 'all';
      if (!matchDept) {
        const norm = (v) => String(v || '').replace(/สาขาวิชา|สาขา/g, '').replace(/\s+/g, '');
        const target = norm(selectedDepartment);
        matchDept = getDepartments(c).some((d) => {
          const dd = norm(d);
          return dd === target || dd.includes(target) || target.includes(dd);
        });
      }

      return matchSearch && matchProvince && matchType && matchDept;
    });

    if (sortBy === 'students') {
      list.sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0) || String(a.name).localeCompare(String(b.name), 'th'));
    } else if (sortBy === 'name') {
      list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'th'));
    }
    return list;
  }, [companies, searchTerm, selectedProvince, selectedType, selectedDepartment, sortBy]);

  const hasActiveFilter =
    searchTerm.trim() !== '' || selectedDepartment !== 'all' || selectedProvince !== 'all' || selectedType !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedProvince('all');
    setSelectedType('all');
    setSortBy('students');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center shrink-0" aria-label="LASC Home">
            <img src={logo} alt="LASC Logo" className="h-10 w-auto object-contain" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 px-3.5 py-2 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าแรก
          </Link>
        </div>
      </header>

      {/* Hero Section — Purple Gradient */}
      <section className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white">
        {/* Glow decorations */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-purple-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute top-10 right-1/4 w-40 h-40 rounded-full bg-fuchsia-400/15 blur-2xl" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-12 pb-20 md:pt-16 md:pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-purple-200 border border-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold mb-5">
            <Sparkles className="w-4 h-4" />
            รวบรวมจากประสบการณ์จริงของรุ่นพี่
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white m-0">
            ค้นหาสถานประกอบการแนะนำ
          </h1>
          <p className="text-purple-200/90 text-sm md:text-base max-w-2xl mx-auto mt-3 mb-0 leading-relaxed">
            สำรวจสถานที่ฝึกงานจริงจากรุ่นพี่ทุกสาขาวิชา ดูรายชื่อนักศึกษาที่เคยฝึก ข้อมูลติดต่อ และตำแหน่งงานที่เปิดรับ
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 pb-14">
        {/* Filter Card — overlaps hero */}
        <div className="bg-white rounded-3xl shadow-xl shadow-purple-950/5 border border-purple-50 p-5 md:p-6 -mt-8 md:-mt-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {/* Search */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-purple-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อบริษัท, ตำแหน่ง, ที่อยู่..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-11 pr-4 py-2.5 text-sm font-medium text-gray-700 placeholder:text-gray-400 transition focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            {/* Department */}
            <FilterSelect value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
              <option value="all">ทุกสาขาวิชา ({ALL_DEPARTMENTS.length} สาขา)</option>
              {ALL_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </FilterSelect>

            {/* Province */}
            <FilterSelect value={selectedProvince} onChange={(e) => setSelectedProvince(e.target.value)}>
              <option value="all">ทุกจังหวัด</option>
              {provincesList.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </FilterSelect>

            {/* Sort + Reset */}
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="ล้างตัวกรองทั้งหมด"
                  className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center justify-center transition border-none cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Business type — secondary row, shown only if data has types */}
          {businessTypesList.length > 0 && (
            <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-400 shrink-0">ประเภทธุรกิจ:</span>
              <div className="relative flex-1 max-w-xs">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 pr-9 text-xs font-medium text-gray-600 transition focus:border-purple-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/10 cursor-pointer"
                >
                  <option value="all">ทุกประเภท ({businessTypesList.length})</option>
                  {businessTypesList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mt-7 mb-5">
          <h2 className="text-lg font-extrabold text-slate-800 m-0">
            พบ <span className="text-purple-600">{filteredCompanies.length}</span> สถานประกอบการ
          </h2>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline transition cursor-pointer border-none bg-transparent"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        {/* Company Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-xs font-medium text-slate-400 mt-3 m-0">กำลังโหลดข้อมูลสถานประกอบการ...</p>
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCompanies.map((comp, idx) => {
              const depts = getDepartments(comp);
              return (
                <div
                  key={comp.id || idx}
                  onClick={() => openCompanyModal(comp)}
                  className="rounded-2xl bg-white border border-gray-100 hover:border-purple-200 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group cursor-pointer flex flex-col"
                >
                  {/* Icon + badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        comp.isOfficial
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-violet-50 text-violet-600 border border-violet-100'
                      }`}>
                        {comp.isOfficial ? 'เปิดรับทางการ' : 'จากรุ่นพี่'}
                      </span>
                      {(comp.studentCount || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                          <Users className="w-3 h-3" />
                          มีรุ่นพี่ฝึกงาน {comp.studentCount} คน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="m-0 mb-1.5 text-base font-extrabold text-slate-900 leading-snug line-clamp-1">
                    {comp.name}
                  </h3>
                  <p className="m-0 mb-4 text-xs text-slate-400 line-clamp-1">
                    {comp.businessType || 'ไม่ระบุประเภทธุรกิจ'}
                  </p>

                  {/* Meta */}
                  <div className="flex flex-col gap-2 text-xs text-slate-500 mb-4 flex-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">
                        {comp.province || (comp.address ? comp.address.slice(0, 40) : 'ประเทศไทย')}
                      </span>
                    </div>

                    {depts.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {depts.slice(0, 2).map((dept, dIdx) => (
                            <span
                              key={dIdx}
                              className="text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-md whitespace-nowrap"
                            >
                              {shortDept(dept)}
                            </span>
                          ))}
                          {depts.length > 2 && (
                            <span className="text-[10px] font-bold text-purple-500 self-center">
                              +{depts.length - 2} สาขา
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {comp.positions && (
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate text-purple-600 font-semibold">{comp.positions}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-auto pt-4 border-t border-gray-50">
                    <div className="w-full text-center text-xs font-bold text-purple-700 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white rounded-xl py-2.5 transition-colors">
                      {(comp.studentCount || 0) > 0 ? 'ดูรายชื่อรุ่นพี่ที่เคยฝึกงาน →' : 'ดูข้อมูลและติดต่อ →'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-gray-100 py-16 px-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center text-purple-300 mb-5">
              <Building2 className="w-10 h-10" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 m-0">ไม่พบสถานประกอบการที่ตรงกับเงื่อนไข</h3>
            <p className="text-sm text-slate-400 mt-2 mb-6 max-w-sm">
              ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสาขาวิชาอื่นเพิ่มเติม
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition border-none cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </main>

      {/* Company Detail Modal */}
      {selectedCompanyModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={closeCompanyModal}
        >
          <div
            className="bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shrink-0">
              <button
                type="button"
                onClick={closeCompanyModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition border-none cursor-pointer"
                aria-label="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-wrap items-center gap-2 mb-2 pr-10">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  selectedCompanyModal.isOfficial ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-300/30' : 'bg-white/15 text-purple-100 border border-white/20'
                }`}>
                  {selectedCompanyModal.isOfficial ? 'สถานประกอบการทางการ' : 'จากรุ่นพี่ที่ฝึกงาน'}
                </span>
                {selectedCompanyModal.province && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20">
                    {selectedCompanyModal.province}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-white m-0 pr-10 leading-snug">{selectedCompanyModal.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-purple-200 text-xs">
                {(selectedCompanyModal.studentCount || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-white">
                    <Users className="w-3.5 h-3.5" />
                    นักศึกษาฝึกงาน {selectedCompanyModal.studentCount} คน
                  </span>
                )}
                {selectedCompanyModal.address && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{selectedCompanyModal.address}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {/* Interns table */}
              {(selectedCompanyModal.studentCount || 0) > 0 && (
                <div className="border border-purple-100 rounded-2xl overflow-hidden">
                  <div className="bg-purple-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-purple-800 inline-flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      รายชื่อนักศึกษาที่ฝึกงานที่นี่
                    </span>
                    <span className="text-[11px] font-bold bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                      {internsLoading ? '...' : `${interns.length} คน`}
                    </span>
                  </div>
                  {internsLoading ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-xs">กำลังโหลดรายชื่อนักศึกษา...</span>
                    </div>
                  ) : interns.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80">
                            {['รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'สาขาวิชา', 'ตำแหน่ง', 'ระยะเวลา', 'สถานะ'].map((h) => (
                              <th key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2.5 px-3 border-b border-slate-100 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {interns.map((st, i) => (
                            <tr key={st.requestId || i} className="border-b border-slate-50 hover:bg-purple-50/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">{st.studentId || '-'}</td>
                              <td className="py-2.5 px-3 text-xs font-semibold text-slate-800 whitespace-nowrap">{st.studentName}</td>
                              <td className="py-2.5 px-3 text-xs text-slate-500 min-w-[120px]">{shortDept(st.department)}</td>
                              <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">{st.position}</td>
                              <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                                {st.startDate || st.endDate ? `${formatDateThai(st.startDate)} - ${formatDateThai(st.endDate)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap"><StatusBadge status={st.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">ไม่พบข้อมูลรายชื่อนักศึกษา</div>
                  )}
                </div>
              )}

              {/* Departments */}
              {getDepartments(selectedCompanyModal).length > 0 && (
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4">
                  <div className="text-[11px] font-extrabold text-purple-700 mb-2 inline-flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> สาขาวิชาที่เกี่ยวข้อง / รุ่นพี่ที่เคยฝึกงาน
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {getDepartments(selectedCompanyModal).map((dept, dIdx) => (
                      <span key={dIdx} className="text-xs font-bold bg-white text-purple-600 border border-purple-200 px-2.5 py-1 rounded-lg">
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCompanyModal.businessType && (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">ประเภทธุรกิจ</div>
                    <div className="text-sm font-semibold text-slate-700">{selectedCompanyModal.businessType}</div>
                  </div>
                )}
                {selectedCompanyModal.positions && (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">ตำแหน่งที่เปิดรับ</div>
                    <div className="text-sm font-semibold text-purple-700 inline-flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />{selectedCompanyModal.positions}
                    </div>
                  </div>
                )}
                {selectedCompanyModal.benefits && (
                  <div className="bg-slate-50 rounded-2xl p-4 sm:col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">สวัสดิการ / เบี้ยเลี้ยง</div>
                    <div className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-500" />{selectedCompanyModal.benefits}
                    </div>
                  </div>
                )}
                {selectedCompanyModal.address && (
                  <div className="bg-slate-50 rounded-2xl p-4 sm:col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">ที่ตั้งสถานประกอบการ</div>
                    <div className="text-sm text-slate-700 inline-flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                      {selectedCompanyModal.address}{selectedCompanyModal.province ? ` จ.${selectedCompanyModal.province}` : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
                <div className="text-xs font-extrabold text-purple-800 mb-2.5">ข้อมูลการติดต่อ</div>
                <div className="flex flex-col gap-2 text-sm">
                  {(selectedCompanyModal.contactPerson || selectedCompanyModal.contact_person) && (
                    <div className="text-slate-700"><span className="font-semibold">ผู้ประสานงาน:</span> {selectedCompanyModal.contactPerson || selectedCompanyModal.contact_person}</div>
                  )}
                  {(selectedCompanyModal.phone || selectedCompanyModal.contactPhone || selectedCompanyModal.contact_phone) && (
                    <a href={`tel:${selectedCompanyModal.phone || selectedCompanyModal.contactPhone || selectedCompanyModal.contact_phone}`} className="inline-flex items-center gap-2 text-purple-700 font-semibold no-underline hover:text-purple-900">
                      <Phone className="w-4 h-4" />{selectedCompanyModal.phone || selectedCompanyModal.contactPhone || selectedCompanyModal.contact_phone}
                    </a>
                  )}
                  {(selectedCompanyModal.email || selectedCompanyModal.contactEmail || selectedCompanyModal.contact_email) && (
                    <a href={`mailto:${selectedCompanyModal.email || selectedCompanyModal.contactEmail || selectedCompanyModal.contact_email}`} className="inline-flex items-center gap-2 text-purple-700 font-semibold no-underline hover:text-purple-900 break-all">
                      <Mail className="w-4 h-4 shrink-0" />{selectedCompanyModal.email || selectedCompanyModal.contactEmail || selectedCompanyModal.contact_email}
                    </a>
                  )}
                  {selectedCompanyModal.website && (
                    <a
                      href={selectedCompanyModal.website.startsWith('http') ? selectedCompanyModal.website : `https://${selectedCompanyModal.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-purple-700 font-semibold hover:text-purple-900"
                    >
                      <Globe className="w-4 h-4" />เยี่ยมชมเว็บไซต์
                    </a>
                  )}
                  {!(selectedCompanyModal.contactPerson || selectedCompanyModal.contact_person) && !(selectedCompanyModal.phone || selectedCompanyModal.contactPhone || selectedCompanyModal.contact_phone) && !(selectedCompanyModal.email || selectedCompanyModal.contactEmail || selectedCompanyModal.contact_email) && !selectedCompanyModal.website && (
                    <div className="text-slate-400 text-xs">ยังไม่มีข้อมูลการติดต่อ</div>
                  )}
                </div>
              </div>

              {selectedCompanyModal.note && (
                <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                  <span className="font-bold">หมายเหตุ:</span> {selectedCompanyModal.note}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={closeCompanyModal}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition border-none cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer */}
      <footer className="footer mt-auto">
        <p>&copy; 2026 ระบบคำร้องฝึกงานวิชาชีพ. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicCompaniesPage;
