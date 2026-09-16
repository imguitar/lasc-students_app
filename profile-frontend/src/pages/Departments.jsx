import React, { useEffect, useState } from 'react';
import { departmentService, facultyService } from '../services';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { 
  Building2, Search, UserCheck, Users, Mail, Phone, Shield, 
  FolderKanban, GraduationCap, AlertCircle, ChevronRight, Edit3, 
  X, CheckCircle2, UserX, BarChart3, Layers, Sparkles
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';

const PROJECT_STATUS_LABELS = {
  draft: { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-700' },
  approved: { label: 'อนุมัติหัวข้อ', color: 'bg-indigo-50 text-indigo-700' },
  in_progress: { label: 'กำลังพัฒนา', color: 'bg-blue-50 text-blue-700' },
  waiting_defense: { label: 'รอสอบประเมิน', color: 'bg-amber-50 text-amber-700' },
  passed_defense: { label: 'ผ่านการสอบ', color: 'bg-teal-50 text-teal-700' },
  completed: { label: 'เสร็จสมบูรณ์', color: 'bg-emerald-50 text-emerald-700' }
};

const Departments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [facultiesList, setFacultiesList] = useState([]);

  // Modals
  const [isAssignHeadOpen, setIsAssignHeadOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState(null);
  const [eligibleAdvisors, setEligibleAdvisors] = useState([]);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Detail stats state
  const [deptStats, setDeptStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchFaculties();
  }, [facultyFilter]);

  const fetchFaculties = async () => {
    try {
      const res = await facultyService.getAll();
      if (res.success) {
        setFacultiesList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch faculties:', err);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (facultyFilter) params.faculty_id = facultyFilter;
      const res = await departmentService.getAll(params);
      if (res.success) {
        setDepartments(res.data);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลสาขาวิชาได้"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignHead = async (dept) => {
    setCurrentDept(dept);
    setSelectedHeadId(dept.department_head_id ? dept.department_head_id.toString() : '');
    setIsAssignHeadOpen(true);
    
    // Fetch eligible advisors for this department
    try {
      const res = await departmentService.getById(dept.id);
      if (res.success && res.data?.eligible_advisors) {
        setEligibleAdvisors(res.data.eligible_advisors);
      }
    } catch (err) {
      console.error('Failed to load eligible advisors:', err);
    }
  };

  const handleSaveHead = async (e) => {
    e.preventDefault();
    if (!currentDept) return;
    setAssigning(true);

    try {
      const headIdVal = selectedHeadId === '' ? null : parseInt(selectedHeadId);
      const res = await departmentService.updateHead(currentDept.id, headIdVal);

      if (res.success) {
        toast({
          title: "บันทึกประธานสาขาสำเร็จ",
          description: res.message || "ปรับปรุงข้อมูลประธานสาขาวิชาเรียบร้อยแล้ว"
        });
        setIsAssignHeadOpen(false);
        fetchDepartments();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถแต่งตั้งประธานสาขาได้",
        description: error.response?.data?.message || "โปรดตรวจสอบความถูกต้องของข้อมูลอาจารย์"
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenDetail = async (dept) => {
    setCurrentDept(dept);
    setIsDetailOpen(true);
    setStatsLoading(true);
    setDeptStats(null);

    try {
      const res = await departmentService.getStats(dept.id);
      if (res.success) {
        setDeptStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch department stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const filteredDepartments = departments.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.department_name.toLowerCase().includes(q) ||
      d.department_id.toLowerCase().includes(q) ||
      (d.faculty_name && d.faculty_name.toLowerCase().includes(q)) ||
      (d.department_head?.name && d.department_head.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <Building2 className="text-purple-600 h-8 w-8" />
            ข้อมูลสาขาวิชาและประธานสาขา
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            จัดการและดูข้อมูลสาขาวิชา กำหนดอาจารย์ผู้ดำรงตำแหน่งประธานสาขา และรายงานสรุปสถิตินักศึกษาและโครงงานประจำสาขา
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border border-purple-100/60 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-full w-5" />
          <Input
            type="text"
            placeholder="ค้นหาชื่อสาขา, รหัสสาขา, คณะ หรือชื่อประธานสาขา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 bg-white/50"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-purple-100/80 bg-white px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <option value="">ทุกคณะวิชา</option>
            {facultiesList.map(fac => (
              <option key={fac.id} value={fac.id}>{fac.faculty_name}</option>
            ))}
          </select>
        </div>

        {(search || facultyFilter) && (
          <Button
            variant="ghost"
            onClick={() => { setSearch(''); setFacultyFilter(''); }}
            className="text-purple-600 hover:bg-purple-50 rounded-xl text-xs h-11 px-4"
          >
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
          <span className="text-gray-400 text-xs font-medium animate-pulse">กำลังโหลดข้อมูลสาขาวิชา...</span>
        </div>
      ) : filteredDepartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const hasHead = !!dept.department_head;

            return (
              <Card 
                key={dept.id} 
                className="border border-purple-100/70 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Card Header with Faculty Tag */}
                  <div className="p-5 pb-3 border-b border-purple-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-lg">
                        รหัส {dept.department_id}
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium truncate max-w-[180px]">
                        {dept.faculty_name}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mt-2 line-clamp-1 group-hover:text-purple-700 transition-colors">
                      {dept.department_name}
                    </h3>
                  </div>

                  {/* Department Head Section (11.1 & 11.2) */}
                  <div className="p-5 space-y-3">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>ประธานสาขาวิชา</span>
                    </div>

                    {hasHead ? (
                      <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/40 border border-purple-100/80 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                            {dept.department_head.firstname.charAt(0)}
                          </div>
                          <div className="leading-tight">
                            <div className="font-bold text-sm text-gray-900">
                              {dept.department_head.name}
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200 mt-0.5">
                              <Shield className="w-2.5 h-2.5" /> ประธานสาขา
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-purple-100/50 text-xs text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="truncate">{dept.department_head.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span>{dept.department_head.phone}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-4 text-center space-y-1">
                        <UserX className="w-5 h-5 text-gray-400 mx-auto" />
                        <div className="text-xs font-semibold text-gray-500">
                          ยังไม่ได้กำหนดประธานสาขา
                        </div>
                        <p className="text-[11px] text-gray-400">
                          สามารถแต่งตั้งอาจารย์ในสาขาให้ดำรงตำแหน่งได้
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 pt-0 border-t border-purple-50/60 flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(dept)}
                    className="flex-1 border-purple-100 text-purple-700 hover:bg-purple-50 rounded-xl text-xs h-9 flex items-center justify-center gap-1"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>รายละเอียด & สถิติ</span>
                  </Button>

                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenAssignHead(dept)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 shadow-sm flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{hasHead ? 'เปลี่ยนประธาน' : 'กำหนดประธาน'}</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-purple-100 rounded-2xl p-12 text-center text-gray-400 space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-purple-300" />
          <p className="text-sm font-semibold">ไม่พบข้อมูลสาขาวิชาที่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      )}

      {/* ================================================================= */}
      {/* 11.1 Dialog: กำหนด / เปลี่ยนประธานสาขา (Assign Head Modal) */}
      {/* ================================================================= */}
      <Dialog open={isAssignHeadOpen} onOpenChange={setIsAssignHeadOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100/60">
          <DialogHeader className="pb-3 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              กำหนดประธานสาขาวิชา
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              {currentDept?.department_name} ({currentDept?.faculty_name})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveHead} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">
                เลือกอาจารย์ผู้ดำรงตำแหน่งประธานสาขา *
              </Label>
              <select
                value={selectedHeadId}
                onChange={(e) => setSelectedHeadId(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="">-- ยังไม่ได้กำหนดประธานสาขา (ยกเลิกการแต่งตั้ง) --</option>
                {eligibleAdvisors.map(adv => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name} (รหัสอาจารย์: {adv.profile_id})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">
                * แสดงเฉพาะอาจารย์ที่สังกัดในสาขาวิชานี้และมีสถานะเปิดใช้งานในระบบเท่านั้น (ห้ามเลือกอาจารย์ข้ามสาขา)
              </p>
            </div>

            {currentDept?.department_head && selectedHeadId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <span className="font-bold">หมายเหตุ:</span> ประธานสาขาคนเดิม ({currentDept.department_head.name}) จะถูกเปลี่ยนเป็นตำแหน่งอาจารย์ตามปกติ ข้อมูลประวัติเดิมจะไม่สูญหาย
              </div>
            )}

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAssignHeadOpen(false)}
                className="text-gray-500 hover:bg-gray-100 rounded-xl"
                disabled={assigning}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
                disabled={assigning}
              >
                {assigning ? 'กำลังบันทึก...' : 'บันทึกการแต่งตั้ง'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* 11.2 & 11.6 Dialog: รายละเอียดสาขา & รายงานสถิติ (Detail Modal) */}
      {/* ================================================================= */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-purple-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-lg">
                รหัสสาขา {currentDept?.department_id}
              </span>
              <span className="text-xs text-gray-400">{currentDept?.faculty_name}</span>
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900 mt-1.5">
              {currentDept?.department_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* Section 11.2: ข้อมูลประธานสาขา */}
            <div className="bg-purple-50/40 border border-purple-100/80 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-600" />
                ข้อมูลประธานสาขาวิชา
              </h4>

              {currentDept?.department_head ? (
                <div className="bg-white border border-purple-100 rounded-xl p-4 space-y-2 shadow-sm">
                  <div className="font-bold text-sm text-purple-950">
                    {currentDept.department_head.name}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-purple-50">
                    <div>
                      <span className="font-semibold text-gray-500">อีเมล: </span>
                      <span className="text-purple-700">{currentDept.department_head.email}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">เบอร์โทรศัพท์: </span>
                      <span>{currentDept.department_head.phone}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 border border-dashed border-gray-200 rounded-xl p-3.5 text-center text-xs text-gray-500 font-medium">
                  ยังไม่ได้กำหนดประธานสาขา
                </div>
              )}
            </div>

            {/* Section 11.6: รายงานสรุปสถิติประจำสาขา */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                รายงานสรุปสถิติประจำสาขาวิชา
              </h4>

              {statsLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-gray-400 space-x-2">
                  <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />
                  <span>กำลังโหลดสถิติประจำสาขา...</span>
                </div>
              ) : deptStats ? (
                <div className="space-y-4">
                  {/* Student Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-purple-950">{deptStats.totalStudents}</div>
                      <div className="text-[10px] text-purple-700 font-semibold uppercase">นักศึกษาทั้งหมด</div>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-emerald-950">{deptStats.activeStudents}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase">กำลังศึกษา</div>
                    </div>
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-indigo-950">{deptStats.graduatedStudents}</div>
                      <div className="text-[10px] text-indigo-700 font-semibold uppercase">สำเร็จการศึกษา</div>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 text-center">
                      <div className="text-lg font-black text-rose-950">{deptStats.resignedStudents + deptStats.suspendedStudents + deptStats.otherInactive}</div>
                      <div className="text-[10px] text-rose-700 font-semibold uppercase">พ้นสภาพ / อื่น ๆ</div>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-600" /> จำนวนอาจารย์ในสาขา
                      </span>
                      <span className="text-sm font-bold text-gray-900">{deptStats.totalAdvisors} ท่าน</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> จำนวนศิษย์เก่า
                      </span>
                      <span className="text-sm font-bold text-gray-900">{deptStats.totalAlumni} คน</span>
                    </div>
                  </div>

                  {/* Projects Stats */}
                  <div className="space-y-2 pt-2 border-t border-purple-50">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-purple-600" />
                        สถานะโครงงานและปริญญานิพนธ์
                      </span>
                      <span className="text-purple-700 font-extrabold">{deptStats.totalProjects} โครงงาน</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                        <div key={k} className="border border-purple-100/60 bg-purple-50/20 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-gray-600">{v.label}</span>
                          <span className="text-xs font-bold text-purple-950">
                            {deptStats.projectsByStatus?.[k] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 py-4 text-center">ไม่มีข้อมูลสถิติ</div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-purple-50">
              <Button
                onClick={() => setIsDetailOpen(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md w-full"
              >
                ปิดหน้าต่าง
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
