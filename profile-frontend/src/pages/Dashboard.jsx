import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { dashboardService } from '../services';
import { useAuth } from '../context/AuthContext';
import { 
  Users, GraduationCap, FolderKanban, Award, Calendar, Activity, 
  ChevronRight, Briefcase, FolderGit2, CheckCircle2, Clock, Sparkles,
  BookOpen, ArrowUpRight, FileText, Filter, RotateCcw, BarChart3, 
  PieChart, AlertCircle, Layers, UserCheck, UserX
} from 'lucide-react';
import { Link } from 'react-router-dom';
import MonthlyNewsSection from '../components/MonthlyNewsSection';

const PROJECT_STATUS_LABELS = {
  draft: { label: 'แบบร่าง', en: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200', barColor: 'bg-slate-400' },
  approved: { label: 'อนุมัติหัวข้อ', en: 'Approved', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', barColor: 'bg-indigo-500' },
  in_progress: { label: 'กำลังพัฒนา', en: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200', barColor: 'bg-blue-500' },
  waiting_defense: { label: 'รอสอบประเมิน', en: 'Waiting Defense', color: 'bg-amber-50 text-amber-700 border-amber-200', barColor: 'bg-amber-500' },
  passed_defense: { label: 'ผ่านการสอบ', en: 'Passed Defense', color: 'bg-teal-50 text-teal-700 border-teal-200', barColor: 'bg-teal-500' },
  completed: { label: 'เสร็จสมบูรณ์', en: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', barColor: 'bg-emerald-500' }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentAlumni, setRecentAlumni] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feature 4: Student Status Report State
  const [studentReport, setStudentReport] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentFilters, setStudentFilters] = useState({
    faculty: '',
    department_id: '',
    year: ''
  });

  // Feature 5: Project Status Report State
  const [projectReport, setProjectReport] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectFilters, setProjectFilters] = useState({
    faculty: '',
    department_id: '',
    year: '',
    type: '',
    status: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (user?.is_department_head && user?.head_department?.id) {
      setStudentFilters(prev => ({ ...prev, department_id: String(user.head_department.id) }));
      setProjectFilters(prev => ({ ...prev, department_id: String(user.head_department.id) }));
    }
  }, [user]);

  useEffect(() => {
    fetchStudentReport();
  }, [studentFilters]);

  useEffect(() => {
    fetchProjectReport();
  }, [projectFilters]);

  const fetchInitialData = async () => {
    try {
      const [statsRes, recentAlumniRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentAlumni()
      ]);
      setStats(statsRes.data);
      setRecentAlumni(recentAlumniRes.data);
    } catch (error) {
      console.error('Error fetching dashboard initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentReport = async () => {
    setStudentLoading(true);
    try {
      const params = {};
      if (studentFilters.faculty) params.faculty = studentFilters.faculty;
      if (studentFilters.department_id) params.department_id = studentFilters.department_id;
      if (studentFilters.year) params.year = studentFilters.year;
      const res = await dashboardService.getStudentReport(params);
      if (res.success) {
        setStudentReport(res.data);
      }
    } catch (error) {
      console.error('Error fetching student report:', error);
    } finally {
      setStudentLoading(false);
    }
  };

  const fetchProjectReport = async () => {
    setProjectLoading(true);
    try {
      const params = {};
      if (projectFilters.faculty) params.faculty = projectFilters.faculty;
      if (projectFilters.department_id) params.department_id = projectFilters.department_id;
      if (projectFilters.year) params.year = projectFilters.year;
      if (projectFilters.type) params.type = projectFilters.type;
      if (projectFilters.status) params.status = projectFilters.status;
      const res = await dashboardService.getProjectReport(params);
      if (res.success) {
        setProjectReport(res.data);
      }
    } catch (error) {
      console.error('Error fetching project report:', error);
    } finally {
      setProjectLoading(false);
    }
  };

  const resetStudentFilters = () => {
    setStudentFilters({ faculty: '', department_id: '', year: '' });
  };

  const resetProjectFilters = () => {
    setProjectFilters({ faculty: '', department_id: '', year: '', type: '', status: '' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
        <div className="text-gray-500 font-medium animate-pulse text-sm">กำลังโหลดข้อมูลภาพรวมระบบ...</div>
      </div>
    );
  }

  // Student report calculations
  const studentSummary = studentReport?.summary || {
    total: stats?.totalStudents || 0,
    active: stats?.activeStudents || 0,
    graduated: stats?.totalAlumni || 0,
    inactive: 0,
    resigned: 0,
    suspended: 0
  };
  const stuTotal = studentSummary.total || 1;
  const activePct = Math.round((studentSummary.active / stuTotal) * 100);
  const gradPct = Math.round((studentSummary.graduated / stuTotal) * 100);
  const otherPct = Math.max(0, 100 - activePct - gradPct);

  // Project report calculations
  const projTotal = projectReport?.total ?? (stats?.totalProjects || 0);
  const projStatusCounts = projectReport?.byStatus || (stats?.projectsByStatus || {});
  const completedProj = projStatusCounts.completed || 0;
  const completionRate = projTotal > 0 ? Math.round((completedProj / projTotal) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">ภาพรวมระบบ (Dashboard)</h1>
          <p className="text-gray-500 text-sm mt-1">
            สรุปข้อมูลฐานข้อมูลนักศึกษา ศิษย์เก่า รายงานสถานะ โครงงานวิจัย/ปริญญานิพนธ์ และผลงานพอร์ตโฟลิโอ
          </p>
          {user?.is_department_head && user?.head_department ? (
            <div className="mt-3.5 text-xs bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 px-4 py-2.5 rounded-xl border border-amber-200/80 w-max font-semibold flex items-center gap-2.5 shadow-sm">
              <span className="text-base">👑</span>
              <div>
                <span>ท่านดำรงตำแหน่ง <strong>ประธานสาขาวิชา{user.head_department.department_name}</strong></span>
                <span className="ml-2 text-[11px] text-amber-700 font-normal">({user.head_department.faculty_name})</span>
              </div>
            </div>
          ) : (
            (user?.role === 'advisor' || user?.role === 'teacher' || user?.role === 'student' || user?.role === 'alumni') && user?.department && (
              <div className="mt-3.5 text-xs bg-purple-50/80 text-purple-700 px-3.5 py-2 rounded-xl border border-purple-100/60 w-max font-semibold flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span>สาขาวิชา <strong>{user.department}</strong></span>
              </div>
            )
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold bg-white border border-purple-100/80 px-3.5 py-2 rounded-xl text-purple-700 shadow-sm self-start md:self-auto">
          <Activity className="h-4 w-4 animate-pulse text-emerald-500" />
          <span>ข้อมูลเรียลไทม์ล่าสุด</span>
        </div>
      </div>

      {/* Primary KPI Stats Cards - 5-column responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Students */}
        <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500">นักศึกษาทั้งหมด</CardTitle>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900">{stats?.totalStudents ?? 0}</div>
            <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>กำลังศึกษา: <strong>{stats?.activeStudents ?? 0}</strong> คน</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Alumni */}
        <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500">ศิษย์เก่าในระบบ</CardTitle>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900">{stats?.totalAlumni ?? 0}</div>
            <p className="text-[11px] text-gray-500 mt-1">
              อัตราจบการศึกษา: <strong>{stats?.graduationRate ?? 0}%</strong>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Senior Projects */}
        <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500">ปริญญานิพนธ์สะสม</CardTitle>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <FolderKanban className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900">{stats?.totalProjects || 0}</div>
            <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
              <Award className="h-3 w-3" />
              <span>ผลงานดีเด่น: <strong>{stats?.awardedProjects || 0}</strong> โครงการ</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Internships */}
        <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500">การฝึกงาน / สหกิจ</CardTitle>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900">{stats?.totalInternships || 0}</div>
            <p className="text-[11px] text-gray-500 mt-1">
              ประวัติสถานประกอบการ
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Semester Projects / Portfolio */}
        <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500">ผลงาน / Portfolio</CardTitle>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-gray-900">{stats?.totalStudentProjects || 0}</div>
            <p className="text-[11px] text-gray-500 mt-1">
              ชิ้นงานและแฟ้มสะสมผลงาน
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 4: รายงานสรุปสถานะนักศึกษา (Student Status Report) */}
      {/* ========================================================================= */}
      <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-purple-50/80 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-gray-900">
                  รายงานสรุปสถานะนักศึกษา (Student Status Report)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-gray-500 mt-1">
                สรุปจำนวนและสัดส่วนนักศึกษาแยกตามสถานะ (กำลังศึกษา, สำเร็จการศึกษา, พ้นสภาพ/ลาออก) พร้อมตัวกรองตามคณะ สาขาวิชา และชั้นปี
              </CardDescription>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Faculty Filter */}
              <select
                value={studentFilters.faculty}
                onChange={(e) => setStudentFilters({ ...studentFilters, faculty: e.target.value, department_id: '' })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">ทุกคณะ</option>
                {studentReport?.filterOptions?.faculties?.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={studentFilters.department_id}
                onChange={(e) => setStudentFilters({ ...studentFilters, department_id: e.target.value })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-[160px]"
              >
                <option value="">ทุกสาขาวิชา</option>
                {studentReport?.filterOptions?.departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Year Level Filter */}
              <select
                value={studentFilters.year}
                onChange={(e) => setStudentFilters({ ...studentFilters, year: e.target.value })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">ทุกชั้นปี</option>
                <option value="1">ชั้นปีที่ 1</option>
                <option value="2">ชั้นปีที่ 2</option>
                <option value="3">ชั้นปีที่ 3</option>
                <option value="4">ชั้นปีที่ 4</option>
                <option value="5">ชั้นปีที่ 5+</option>
              </select>

              {(studentFilters.faculty || studentFilters.department_id || studentFilters.year) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetStudentFilters}
                  className="h-9 text-xs text-purple-600 hover:bg-purple-50 rounded-xl px-2.5 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้าง</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {studentLoading ? (
            <div className="flex items-center justify-center py-10 space-x-2 text-xs text-gray-400">
              <div className="w-5 h-5 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
              <span>กำลังประมวลผลรายงานนักศึกษา...</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Total */}
                <div className="bg-purple-50/40 border border-purple-100/60 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-gray-500">รวมทั้งหมด</div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-gray-900">{studentSummary.total ?? 0}</span>
                    <span className="text-xs text-gray-400">คน</span>
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">100% ของข้อมูลในตัวกรอง</div>
                </div>

                {/* Active */}
                <div className="bg-emerald-50/50 border border-emerald-100/70 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    กำลังศึกษา (Active)
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-950">{studentSummary.active ?? 0}</span>
                    <span className="text-xs text-emerald-700 font-semibold">{activePct}%</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1">นักศึกษาในสถานะปกติ</div>
                </div>

                {/* Graduated */}
                <div className="bg-indigo-50/50 border border-indigo-100/70 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    สำเร็จการศึกษา (Graduated)
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-indigo-950">{studentSummary.graduated ?? 0}</span>
                    <span className="text-xs text-indigo-700 font-semibold">{gradPct}%</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-1">ปรับเป็นศิษย์เก่าแล้ว</div>
                </div>

                {/* Inactive / Resigned / Suspended */}
                <div className="bg-rose-50/40 border border-rose-100/70 rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-rose-500" />
                    พ้นสภาพ / ลาออก / อื่น ๆ
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-rose-950">{(studentSummary.inactive ?? 0) + (studentSummary.resigned ?? 0) + (studentSummary.suspended ?? 0)}</span>
                    <span className="text-xs text-rose-700 font-semibold">{otherPct}%</span>
                  </div>
                  <div className="text-[11px] text-rose-600 mt-1">
                    ลาออก: {studentSummary.resigned ?? 0} | พักการเรียน: {studentSummary.suspended ?? 0}
                  </div>
                </div>
              </div>

              {/* Status Proportion Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <span>สัดส่วนสถานะนักศึกษา</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> กำลังศึกษา ({activePct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> สำเร็จการศึกษา ({gradPct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> พ้นสภาพ/อื่น ๆ ({otherPct}%)
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  <div style={{ width: `${activePct}%` }} className="bg-emerald-500 transition-all duration-500" title={`กำลังศึกษา ${activePct}%`} />
                  <div style={{ width: `${gradPct}%` }} className="bg-indigo-500 transition-all duration-500" title={`สำเร็จการศึกษา ${gradPct}%`} />
                  <div style={{ width: `${otherPct}%` }} className="bg-rose-400 transition-all duration-500" title={`พ้นสภาพ/อื่น ๆ ${otherPct}%`} />
                </div>
              </div>

              {/* Breakdown Grid: Year Level & Graduation By Year */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-purple-50">
                {/* Year Level Distribution */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>นักศึกษาปัจจุบันแยกตามระดับชั้นปี</span>
                  </div>
                  {studentReport?.byYearLevel && studentReport.byYearLevel.length > 0 ? (
                    <div className="space-y-2">
                      {studentReport.byYearLevel.map(item => {
                        const pct = Math.round((item.count / (studentSummary.active || 1)) * 100);
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-gray-700">
                              <span>{item.label}</span>
                              <span className="text-purple-700">{item.count} คน ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full bg-purple-50 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${pct}%` }} 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 py-4 text-center bg-purple-50/20 rounded-xl">
                      ไม่มีข้อมูลระดับชั้นปีตามตัวกรองนี้
                    </div>
                  )}
                </div>

                {/* Graduated By Year */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>จำนวนผู้สำเร็จการศึกษาแยกตามปี พ.ศ.</span>
                  </div>
                  {studentReport?.graduatedByYear && studentReport.graduatedByYear.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {studentReport.graduatedByYear.map(item => (
                        <div 
                          key={item.year}
                          className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm"
                        >
                          <span className="text-xs font-bold text-indigo-900">พ.ศ. {item.year}</span>
                          <span className="text-xs font-extrabold bg-white text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">
                            {item.count} คน
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 py-4 text-center bg-indigo-50/20 rounded-xl">
                      ไม่มีข้อมูลผู้สำเร็จการศึกษาตามตัวกรองนี้
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* FEATURE 5: รายงานสรุปสถานะโครงงาน (Project Status Report) */}
      {/* ========================================================================= */}
      <Card className="border border-purple-100/60 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-purple-50/80 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-gray-900">
                  รายงานสรุปสถานะโครงงาน (Project Status Report)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-gray-500 mt-1">
                สรุปขั้นตอนการดำเนินงานโครงงานและปริญญานิพนธ์ 6 ลำดับขั้น พร้อมตัวกรองตามคณะ สาขา ปีการศึกษา ประเภท และสถานะ
              </CardDescription>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Faculty Filter */}
              <select
                value={projectFilters.faculty}
                onChange={(e) => setProjectFilters({ ...projectFilters, faculty: e.target.value, department_id: '' })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">ทุกคณะ</option>
                {projectReport?.filterOptions?.faculties?.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={projectFilters.department_id}
                onChange={(e) => setProjectFilters({ ...projectFilters, department_id: e.target.value })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-[150px]"
              >
                <option value="">ทุกสาขาวิชา</option>
                {projectReport?.filterOptions?.departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Year Filter */}
              <select
                value={projectFilters.year}
                onChange={(e) => setProjectFilters({ ...projectFilters, year: e.target.value })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">ทุกปีการศึกษา</option>
                {projectReport?.filterOptions?.years?.map(yr => (
                  <option key={yr} value={yr}>พ.ศ. {yr}</option>
                ))}
              </select>

              {/* Project Type Filter */}
              <select
                value={projectFilters.type}
                onChange={(e) => setProjectFilters({ ...projectFilters, type: e.target.value })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">ทุกประเภท</option>
                <option value="individual">โครงงานเดี่ยว</option>
                <option value="group">โครงงานกลุ่ม</option>
              </select>

              {/* Status Filter */}
              <select
                value={projectFilters.status}
                onChange={(e) => setProjectFilters({ ...projectFilters, status: e.target.value })}
                className="h-9 px-3 text-xs rounded-xl border border-purple-100 bg-purple-50/20 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">ทุกสถานะ</option>
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>

              {(projectFilters.faculty || projectFilters.department_id || projectFilters.year || projectFilters.type || projectFilters.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetProjectFilters}
                  className="h-9 text-xs text-purple-600 hover:bg-purple-50 rounded-xl px-2.5 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้าง</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {projectLoading ? (
            <div className="flex items-center justify-center py-10 space-x-2 text-xs text-gray-400">
              <div className="w-5 h-5 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
              <span>กำลังประมวลผลรายงานโครงงาน...</span>
            </div>
          ) : (
            <>
              {/* Pipeline Cards - 6 Status Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(PROJECT_STATUS_LABELS).map(([key, info], idx) => {
                  const count = projStatusCounts[key] || 0;
                  const percentage = projTotal > 0 ? Math.round((count / projTotal) * 100) : 0;

                  return (
                    <div 
                      key={key} 
                      className={`border p-4 rounded-xl flex flex-col justify-between transition-all hover:shadow-sm ${
                        projectFilters.status === key 
                          ? 'bg-purple-100/70 border-purple-300 ring-2 ring-purple-400' 
                          : 'bg-purple-50/25 border-purple-100/60 hover:bg-purple-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold mb-1">
                          <span>ขั้นที่ {idx + 1}</span>
                          <span className="font-bold text-gray-500">{percentage}%</span>
                        </div>
                        <div className="text-xs font-bold text-gray-800 leading-tight">
                          {info.label}
                        </div>
                        <div className="text-[10px] text-gray-400">{info.en}</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-purple-100/40 flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-purple-900">{count}</span>
                        <span className="text-[10px] text-gray-500">โครงการ</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress and Summary Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>อัตราโครงงานที่เสร็จสมบูรณ์: <strong>{completionRate}%</strong></span>
                    <span className="text-gray-400">({completedProj} จากทั้งหมด {projTotal} โครงการ)</span>
                  </span>
                  <Link 
                    to="/projects" 
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <span>ดูโครงงานทั้งหมด</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  {Object.entries(PROJECT_STATUS_LABELS).map(([key, info]) => {
                    const count = projStatusCounts[key] || 0;
                    const pct = projTotal > 0 ? (count / projTotal) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div 
                        key={key}
                        style={{ width: `${pct}%` }} 
                        className={`${info.barColor} transition-all duration-500`} 
                        title={`${info.label}: ${count} โครงการ (${Math.round(pct)}%)`} 
                      />
                    );
                  })}
                </div>
              </div>

              {/* Projects By Year Breakdown */}
              {projectReport?.byYear && projectReport.byYear.length > 0 && (
                <div className="pt-2 border-t border-purple-50">
                  <div className="text-xs font-bold text-gray-800 flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>จำนวนโครงงานแบ่งตามปีการศึกษา (พ.ศ.)</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {projectReport.byYear.map(item => (
                      <div 
                        key={item.year}
                        className="bg-purple-50/50 border border-purple-100 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm"
                      >
                        <span className="text-xs font-bold text-purple-950">พ.ศ. {item.year}</span>
                        <span className="text-xs font-extrabold bg-white text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100">
                          {item.count} โครงการ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* Tables & Quick Navigation Section */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Updates */}
        <Card className="md:col-span-2 border border-purple-100/40 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50/80 pb-4">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              การอัปเดตโครงงานและผลงานล่าสุด
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              รายชื่อโครงงานและผลงานที่เพิ่งบันทึกหรือปรับปรุงสถานะในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 px-0">
            <div className="divide-y divide-purple-50">
              {recentAlumni.length > 0 ? (
                recentAlumni.map((item) => (
                  <div key={item.id} className="p-4 px-6 hover:bg-purple-50/20 transition-colors flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shadow-sm shrink-0">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-800 line-clamp-1">
                          {item.first_name}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          {item.workplace || 'โครงงาน'} • {item.position || '-'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg shrink-0">
                      {new Date(item.updatedAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <FolderKanban className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <span>ยังไม่มีข้อมูลการอัปเดต</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation Panel */}
        <Card className="md:col-span-1 border border-purple-100/40 shadow-sm rounded-2xl bg-white p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            เมนูด่วนสำหรับคุณ
          </h3>
          <div className="space-y-2.5 text-xs">
            {(user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'advisor') && (
              <Link 
                to="/departments" 
                className="flex items-center justify-between p-3 rounded-xl border border-purple-100/70 hover:bg-purple-50/50 transition-all font-semibold text-gray-700 group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🏛️</span>
                  <span>ข้อมูลสาขาวิชาและประธานสาขา</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            <Link 
              to="/portfolio" 
              className="flex items-center justify-between p-3 rounded-xl border border-purple-100/70 hover:bg-purple-50/50 transition-all font-semibold text-gray-700 group"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span>ผลงานนักศึกษา & Portfolio</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link 
              to="/profile" 
              className="flex items-center justify-between p-3 rounded-xl border border-purple-100/70 hover:bg-purple-50/50 transition-all font-semibold text-gray-700 group"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>จัดการ Resume / CV & ทักษะ</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link 
              to="/projects" 
              className="flex items-center justify-between p-3 rounded-xl border border-purple-100/70 hover:bg-purple-50/50 transition-all font-semibold text-gray-700 group"
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-amber-600" />
                <span>ค้นหาโครงงานและปริญญานิพนธ์</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link 
              to="/alumni" 
              className="flex items-center justify-between p-3 rounded-xl border border-purple-100/70 hover:bg-purple-50/50 transition-all font-semibold text-gray-700 group"
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>เครือข่ายศิษย์เก่า & ข้อมูลการทำงาน</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link 
              to="/students" 
              className="flex items-center justify-between p-3 rounded-xl border border-purple-100/70 hover:bg-purple-50/50 transition-all font-semibold text-gray-700 group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>ทะเบียนประวัตินักศึกษา</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* Monthly News & Events Section */}
      {/* ========================================================================= */}
      <MonthlyNewsSection />
    </div>
  );
};

export default Dashboard;
