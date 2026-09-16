import React, { useEffect, useState, useRef } from 'react';
import { studentService, departmentService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  Users, Search, Plus, Upload, Download, Edit2, Trash2, X, AlertCircle, FileText, CheckCircle2, ChevronDown, Bot, GraduationCap 
} from 'lucide-react';
import AITrackModal from '../components/AITrackModal';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';

const FACULTIES_DEPARMENTS = {
  'คณะศิลปศาสตร์และวิทยาศาสตร์': ['วิทยาการคอมพิวเตอร์', 'เทคโนโลยีคอมพิวเตอร์และดิจิทัล', 'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์', 'วิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม', 'วิทยาศาสตร์การกีฬา', 'เทคโนโลยีการเกษตร', 'วิศวกรรมโลจิสติกส์', 'นวัตกรรมวัสดุและการออกแบบผลิตภัณฑ์', 'เทคโนโลยีโยธาและสถาปัตยกรรม', 'อาชีวอนามัยและความปลอดภัย', 'สาธารณสุขชุมชน'],
};

const Students = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAITrack, setShowAITrack] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    faculty: '',
    department: '',
    year: '',
    status: ''
  });

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteStudent, setPromoteStudent] = useState(null);
  const [promoting, setPromoting] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [promoteForm, setPromoteForm] = useState({
    graduation_year: '',
    graduation_batch: '',
    graduation_date: ''
  });

  // Form states
  const [form, setForm] = useState({
    student_id: '',
    prefix: '',
    first_name: '',
    last_name: '',
    faculty: '',
    department: '',
    year: '1',
    email: '',
    phone: '',
    status: 'Active'
  });

  const [formErrors, setFormErrors] = useState({});

  // Import states
  const [file, setFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (search) params.search = search;
      const response = await studentService.getAll(params);
      if (response.success) {
        let fetchedStudents = response.data;

        // If user is student, sort user's own profile to the very top
        if (user && user.role === 'student') {
          const checkIsMyProfile = (item) => {
            return user.student_id === item.student_id || user.username === item.student_id;
          };

          fetchedStudents = [...fetchedStudents].sort((a, b) => {
            const aMine = checkIsMyProfile(a) ? 1 : 0;
            const bMine = checkIsMyProfile(b) ? 1 : 0;
            return bMine - aMine; // 1 comes before 0
          });
        }

        setStudents(fetchedStudents);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลนักศึกษาได้"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ department_id: '', year: '', status: '' });
  };

  // Form validations
  const validateForm = () => {
    const errors = {};
    const thEnRegex = /^[a-zA-Z\u0E00-\u0E7F\s]+$/;

    if (!/^\d{10}$/.test(form.student_id)) {
      errors.student_id = 'รหัสนักศึกษาต้องเป็นตัวเลข 10 หลักเท่านั้น';
    }
    if (!form.first_name || !thEnRegex.test(form.first_name)) {
      errors.first_name = 'กรุณากรอกชื่อจริงเป็นตัวอักษรภาษาไทยหรืออังกฤษเท่านั้น';
    }
    if (!form.last_name || !thEnRegex.test(form.last_name)) {
      errors.last_name = 'กรุณากรอกนามสกุลเป็นตัวอักษรภาษาไทยหรืออังกฤษเท่านั้น';
    }
    if (!form.faculty) errors.faculty = 'กรุณาเลือกคณะ';
    if (!form.department) errors.department = 'กรุณาเลือกสาขาวิชา';
    if (!form.year || form.year < 1 || form.year > 5) {
      errors.year = 'ชั้นปีต้องอยู่ระหว่าง 1 - 5';
    }
    if (!form.email || form.email !== `stu${form.student_id}@sskru.ac.th`) {
      errors.email = `อีเมลต้องอยู่ในรูปแบบ stu${form.student_id || '[รหัสนักศึกษา]'}@sskru.ac.th เท่านั้น`;
    }
    if (form.phone && !/^0\d{9}$/.test(form.phone)) {
      errors.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }

    if (name === 'student_id') {
      setForm(prev => ({
        ...prev,
        student_id: value,
        email: value ? `stu${value}@sskru.ac.th` : ''
      }));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleOpenAdd = () => {
    setCurrentStudent(null);
    setForm({
      student_id: '',
      prefix: '',
      first_name: '',
      last_name: '',
      faculty: '',
      department: '',
      year: '1',
      email: '',
      phone: '',
      status: 'Active'
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (student) => {
    setCurrentStudent(student);
    setForm({
      student_id: student.student_id,
      prefix: student.prefix || '',
      first_name: student.first_name,
      last_name: student.last_name,
      faculty: student.faculty,
      department: student.department,
      year: student.year.toString(),
      email: student.email,
      phone: student.phone || '',
      status: student.status
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const data = { ...form, year: parseInt(form.year) };
      let response;
      if (currentStudent) {
        response = await studentService.update(currentStudent.id, data);
      } else {
        response = await studentService.create(data);
      }

      if (response.success) {
        toast({
          title: currentStudent ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ",
          description: response.message || "บันทึกข้อมูลเรียบร้อยแล้ว"
        });
        setIsAddEditOpen(false);
        fetchStudents();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        description: error.response?.data?.message || "โปรดตรวจสอบข้อมูลอีกครั้ง (อีเมล หรือ รหัสนักศึกษาอาจซ้ำกันในระบบ)"
      });
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await studentService.delete(deleteId);
      if (response.success) {
        toast({
          title: "ลบข้อมูลสำเร็จ",
          description: "ลบประวัตินักศึกษาออกจากระบบเรียบร้อยแล้ว"
        });
        setIsDeleteOpen(false);
        fetchStudents();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้"
      });
    }
  };

  const handleOpenPromote = (student) => {
    setPromoteStudent(student);
    const currentThaiYear = new Date().getFullYear() + 543;
    setPromoteForm({
      graduation_year: currentThaiYear.toString(),
      graduation_batch: `1/${currentThaiYear}`,
      graduation_date: '',
      email: student.email || `${student.student_id || student.profile_id}@alumni.sskru.ac.th`
    });
    setIsPromoteOpen(true);
  };

  const handlePromote = async () => {
    if (!promoteStudent) return;
    setPromoting(true);
    try {
      const payload = {
        graduation_year: parseInt(promoteForm.graduation_year) || new Date().getFullYear() + 543,
        graduation_batch: promoteForm.graduation_batch || null,
        graduation_date: promoteForm.graduation_date || null,
        email: promoteForm.email?.trim() || null
      };
      const response = await api.post(`/students/${promoteStudent.id}/promote`, payload);
      if (response.data.success) {
        toast({
          title: "อัปเดตเป็นศิษย์เก่าสำเร็จ",
          description: `เปลี่ยนสถานะคุณ ${promoteStudent.first_name} ${promoteStudent.last_name} เป็นศิษย์เก่าเรียบร้อยแล้ว`
        });
        setIsPromoteOpen(false);
        fetchStudents();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถอัปเดตสถานะเป็นศิษย์เก่าได้"
      });
    } finally {
      setPromoting(false);
    }
  };

  // Export Data
  const handleExport = async (format) => {
    try {
      const params = { ...filters, format };
      if (search) params.search = search;
      
      const response = await api.get('/data/export/students', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `นักศึกษา_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: `ส่งออก ${format.toUpperCase()} สำเร็จ`,
        description: "ดาวน์โหลดไฟล์เรียบร้อยแล้ว"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งออกไฟล์ได้"
      });
    }
  };

  // Download template
  const handleDownloadTemplate = async (format) => {
    try {
      const response = await api.get('/data/template/students', {
        params: { format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `เทมเพลต_นักศึกษา.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดาวน์โหลดเทมเพลตได้"
      });
    }
  };

  // Import file
  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    setImportResults(null);

    try {
      const response = await api.post('/data/import/students', formData, {
        headers: { 'Content-Type': undefined }
      });

      if (response.data.success) {
        setImportResults(response.data.data);
        toast({
          title: "นำเข้าข้อมูลเสร็จสิ้น",
          description: `นำเข้าสำเร็จ ${response.data.data.successCount} รายการ, ล้มเหลว ${response.data.data.errorCount} รายการ`
        });
        fetchStudents();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "นำเข้าข้อมูลไม่สำเร็จ",
        description: error.response?.data?.message || "กรุณาตรวจสอบโครงสร้างไฟล์ให้ถูกต้อง"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-purple-600 h-7 w-7" />
            {(user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'advisor') ? 'จัดการข้อมูลนักศึกษา' : 'ทำเนียบนักศึกษา'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {(user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'advisor') 
              ? 'ค้นหา นำเข้า นำออก และจัดการข้อมูลประวัตินักศึกษาปัจจุบันในมหาวิทยาลัย'
              : 'ค้นหาและดูข้อมูลรายชื่อประวัตินักศึกษาปัจจุบันในภาควิชา'}
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setIsImportOpen(true)}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center gap-1.5 h-10 shadow-sm"
            >
              <Upload size={16} />
              <span>นำเข้าข้อมูล</span>
            </Button>
            
            <div className="relative group">
              <Button
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center gap-1.5 h-10 shadow-sm"
              >
                <Download size={16} />
                <span>ส่งออกข้อมูล</span>
                <ChevronDown size={14} />
              </Button>
              <div className="absolute right-0 mt-1.5 w-36 bg-white border border-purple-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 overflow-hidden">
                <button 
                  onClick={() => handleExport('csv')} 
                  className="w-full text-left px-4 py-2.5 text-xs text-purple-950 hover:bg-purple-50 flex items-center gap-2 font-medium"
                >
                  <FileText size={14} className="text-purple-600" />
                  ส่งออกเป็น CSV
                </button>
                <button 
                  onClick={() => handleExport('xlsx')} 
                  className="w-full text-left px-4 py-2.5 text-xs text-purple-950 hover:bg-purple-50 flex items-center gap-2 font-medium"
                >
                  <FileText size={14} className="text-amber-500" />
                  ส่งออกเป็น Excel
                </button>
              </div>
            </div>

            <Button
              onClick={() => setShowAITrack(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl flex items-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all"
            >
              <Bot size={16} />
              <span>AI Track</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              <span>เพิ่มนักศึกษา</span>
            </Button>
          </div>
        )}
      </div>

      {/* AI Track Modal */}
      {showAITrack && (
        <AITrackModal
          onClose={() => setShowAITrack(false)}
          onImport={() => { setShowAITrack(false); fetchStudents(); }}
        />
      )}

      {/* Search & Filter Card */}
      <div className="bg-white/70 backdrop-blur-md border border-purple-100/50 rounded-2xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-full w-5" />
            <Input
              type="text"
              placeholder="ค้นหาด้วยรหัสนักศึกษา, ชื่อ หรือนามสกุล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 bg-white/50"
            />
          </div>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-6 shadow-sm">
            ค้นหา
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Faculty Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">คณะ</Label>
            <select
              value={filters.faculty}
              onChange={(e) => setFilters({ ...filters, faculty: e.target.value, department: '' })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="">ทั้งหมด</option>
              {Object.keys(FACULTIES_DEPARMENTS).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">สาขาวิชา</Label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              disabled={!filters.faculty}
            >
              <option value="">ทั้งหมด</option>
              {filters.faculty && FACULTIES_DEPARMENTS[filters.faculty]?.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">ชั้นปี</Label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              disabled={!filters.department}
            >
              <option value="">ทั้งหมด</option>
              <option value="1">ชั้นปี 1</option>
              <option value="2">ชั้นปี 2</option>
              <option value="3">ชั้นปี 3</option>
              <option value="4">ชั้นปี 4</option>
              <option value="5">ชั้นปี 5</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">สถานะ</Label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="Active">ปกติ (Active)</option>
              <option value="Graduated">สำเร็จการศึกษา (Graduated)</option>
              <option value="Suspended">รักษาสภาพ (Suspended)</option>
              <option value="Dismissed">พ้นสภาพ (Dismissed)</option>
            </select>
          </div>
        </div>

        {(filters.department_id || filters.year || filters.status || search) && (
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleClearFilters}
              variant="ghost"
              className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 text-xs font-semibold h-8 rounded-lg"
            >
              ล้างตัวกรองทั้งหมด
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-purple-100/40 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
            <span className="text-gray-400 text-xs font-medium animate-pulse">กำลังโหลดข้อมูลตารางนักศึกษา...</span>
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100/50 text-xs text-purple-900 uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">รหัสนักศึกษา</th>
                  <th className="py-4 px-6">ชื่อ-นามสกุล</th>
                  <th className="py-4 px-6">คณะ / สาขาวิชา</th>
                  <th className="py-4 px-6 text-center">ชั้นปี</th>
                  <th className="py-4 px-6">ข้อมูลติดต่อ</th>
                  <th className="py-4 px-6">สถานะ</th>
                  {user?.role === 'admin' && <th className="py-4 px-6 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50/50 text-sm text-gray-700">
                {students.map((student) => {
                  const isMyProfile = user && user.role === 'student' && (
                    user.student_id === student.student_id || user.username === student.student_id
                  );

                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-colors ${
                        isMyProfile 
                          ? 'bg-purple-50/60 hover:bg-purple-50/80 font-medium' 
                          : 'hover:bg-purple-50/10'
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        {student.student_id}
                      </td>
                    <td className="py-4 px-6 font-medium">
                      {student.prefix ? student.prefix : ''}{student.first_name} {student.last_name}
                    </td>
                    <td className="py-4 px-6 leading-tight">
                      <div className="text-xs text-gray-900 font-semibold">{student.faculty}</div>
                      <span className="text-xs text-gray-400 font-medium">{student.department}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-purple-50 border border-purple-100/50 text-purple-700 font-bold text-xs">
                        {student.year}
                      </span>
                    </td>
                    <td className="py-4 px-6 leading-tight space-y-1">
                      <div className="text-xs text-gray-500 font-medium">{student.email}</div>
                      {student.phone && (
                        <div className="text-xs text-gray-400 font-medium">📞 {student.phone}</div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        student.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : student.status === 'Graduated'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : student.status === 'Suspended'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {student.status === 'Active' && 'ปกติ'}
                        {student.status === 'Graduated' && 'สำเร็จการศึกษา'}
                        {student.status === 'Suspended' && 'รักษาสภาพ'}
                        {student.status === 'Dismissed' && 'พ้นสภาพ'}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-1">
                          {student.status !== 'Graduated' && (
                            <Button
                              onClick={() => handleOpenPromote(student)}
                              variant="ghost"
                              size="icon"
                              title="จบการศึกษาและปรับเป็นศิษย์เก่า"
                              className="h-8 w-8 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg"
                            >
                              <GraduationCap size={15} />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleOpenEdit(student)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg"
                          >
                            <Edit2 size={15} />
                          </Button>
                          <Button
                            onClick={() => handleOpenDelete(student.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <Users size={40} className="mx-auto text-purple-200 mb-3" />
            <p className="text-base font-bold text-gray-600">ไม่พบรายชื่อนักศึกษา</p>
            <p className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนคำค้นหา หรือเปลี่ยนตัวกรองข้อมูล</p>
          </div>
        )}
      </div>

      {/* Add / Edit Student Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-purple-900">
              {currentStudent ? 'แก้ไขประวัตินักศึกษา' : 'เพิ่มนักศึกษาใหม่'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              กรุณากรอกข้อมูลนักศึกษาตามเงื่อนไขที่กำหนดให้ครบถ้วน เพื่อทำการบันทึกลงฐานข้อมูล
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student ID */}
              <div className="space-y-1.5">
                <Label htmlFor="student_id" className="text-gray-700 text-xs font-semibold">รหัสนักศึกษา (10 หลัก) *</Label>
                <Input
                  id="student_id"
                  name="student_id"
                  placeholder="เช่น 6617796101"
                  value={form.student_id}
                  onChange={handleFormChange}
                  disabled={!!currentStudent}
                  className={`border-purple-100 rounded-xl ${formErrors.student_id ? 'border-rose-300 focus:ring-rose-500' : 'focus:ring-purple-500'}`}
                />
                {formErrors.student_id && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.student_id}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-gray-700 text-xs font-semibold">สถานะนักศึกษา *</Label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="Active">ปกติ (Active)</option>
                  <option value="Graduated">สำเร็จการศึกษา (Graduated)</option>
                  <option value="Suspended">รักษาสภาพ (Suspended)</option>
                  <option value="Dismissed">พ้นสภาพ (Dismissed)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-4">
              {/* Prefix */}
              <div className="space-y-1.5">
                <Label htmlFor="prefix" className="text-gray-700 text-xs font-semibold">คำนำหน้า</Label>
                <select
                  id="prefix"
                  name="prefix"
                  value={form.prefix}
                  onChange={handleFormChange}
                  className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">- เลือก -</option>
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="ดร.">ดร.</option>
                  <option value="ผศ.ดร.">ผศ.ดร.</option>
                  <option value="รศ.ดร.">รศ.ดร.</option>
                  <option value="ศ.ดร.">ศ.ดร.</option>
                </select>
              </div>

              {/* First Name */}
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-gray-700 text-xs font-semibold">ชื่อจริง *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="เช่น สมชาย"
                  value={form.first_name}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.first_name ? 'border-rose-300 focus:ring-rose-500' : 'focus:ring-purple-500'}`}
                />
                {formErrors.first_name && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.first_name}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-gray-700 text-xs font-semibold">นามสกุล *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="เช่น แสนดี"
                  value={form.last_name}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.last_name ? 'border-rose-300 focus:ring-rose-500' : 'focus:ring-purple-500'}`}
                />
                {formErrors.last_name && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Faculty */}
              <div className="space-y-1.5">
                <Label htmlFor="faculty" className="text-gray-700 text-xs font-semibold">คณะ *</Label>
                <select
                  id="faculty"
                  name="faculty"
                  value={form.faculty}
                  onChange={handleFormChange}
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${formErrors.faculty ? 'border-rose-300' : 'border-purple-100'}`}
                >
                  <option value="">เลือกคณะ</option>
                  {Object.keys(FACULTIES_DEPARMENTS).map((fac) => (
                    <option key={fac} value={fac}>{fac}</option>
                  ))}
                </select>
                {formErrors.faculty && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.faculty}</p>
                )}
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-gray-700 text-xs font-semibold">สาขาวิชา *</Label>
                <select
                  id="department"
                  name="department"
                  value={form.department}
                  onChange={handleFormChange}
                  disabled={!form.faculty}
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${formErrors.department ? 'border-rose-300' : 'border-purple-100'}`}
                >
                  <option value="">เลือกสาขาวิชา</option>
                  {form.faculty && FACULTIES_DEPARMENTS[form.faculty]?.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {formErrors.department && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.department}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Year */}
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-gray-700 text-xs font-semibold">ชั้นปี *</Label>
                <select
                  id="year"
                  name="year"
                  value={form.year}
                  onChange={handleFormChange}
                  className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="1">ปี 1</option>
                  <option value="2">ปี 2</option>
                  <option value="3">ปี 3</option>
                  <option value="4">ปี 4</option>
                  <option value="5">ปี 5</option>
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-gray-700 text-xs font-semibold">เบอร์โทรศัพท์ (10 หลัก)</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="เช่น 0812345678"
                  value={form.phone}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.phone ? 'border-rose-300 focus:ring-rose-500' : 'focus:ring-purple-500'}`}
                />
                {formErrors.phone && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 text-xs font-semibold">อีเมลมหาวิทยาลัย (เช่น stu[รหัสนักศึกษา]@sskru.ac.th) *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="เช่น stu6610014101@sskru.ac.th"
                value={form.email}
                onChange={handleFormChange}
                className={`border-purple-100 rounded-xl ${formErrors.email ? 'border-rose-300 focus:ring-rose-500' : 'focus:ring-purple-500'}`}
              />
              {formErrors.email && (
                <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.email}</p>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-purple-50 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddEditOpen(false)}
                className="text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
              >
                {currentStudent ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">ยืนยันการลบข้อมูล</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              คุณแน่ใจหรือไม่ที่จะลบข้อมูลนักศึกษาคนนี้? การดำเนินการนี้จะลบข้อมูลออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md"
            >
              ยืนยันการลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote to Alumni Confirmation Dialog */}
      <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="text-purple-600 h-6 w-6" />
              <span>ยืนยันการจบการศึกษา</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              คุณต้องการเปลี่ยนสถานะของนักศึกษา <strong>{promoteStudent?.first_name} {promoteStudent?.last_name} ({promoteStudent?.student_id})</strong> เป็นสำเร็จการศึกษา (Graduated) และสร้างประวัติเข้าสู่ทำเนียบศิษย์เก่าโดยอัตโนมัติใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ปีที่สำเร็จการศึกษา (พ.ศ.) *</Label>
                <Input
                  type="number"
                  placeholder="เช่น 2569"
                  value={promoteForm.graduation_year}
                  onChange={(e) => setPromoteForm({...promoteForm, graduation_year: e.target.value})}
                  className="border-purple-100 rounded-xl focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">รอบจบ / รุ่น</Label>
                <Input
                  type="text"
                  placeholder="เช่น 1/2569"
                  value={promoteForm.graduation_batch}
                  onChange={(e) => setPromoteForm({...promoteForm, graduation_batch: e.target.value})}
                  className="border-purple-100 rounded-xl focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">วันที่สำเร็จการศึกษา</Label>
              <Input
                type="date"
                value={promoteForm.graduation_date}
                onChange={(e) => setPromoteForm({...promoteForm, graduation_date: e.target.value})}
                className="border-purple-100 rounded-xl focus:ring-purple-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">อีเมลสำหรับบัญชีศิษย์เก่า</Label>
              <Input
                type="email"
                placeholder="เช่น student@alumni.sskru.ac.th"
                value={promoteForm.email || ''}
                onChange={(e) => setPromoteForm({...promoteForm, email: e.target.value})}
                className="border-purple-100 rounded-xl focus:ring-purple-500"
              />
              <p className="text-[11px] text-gray-500">
                หากปล่อยว่าง ระบบจะใช้อีเมลเดิมหรือสร้างให้อัตโนมัติ (เช่น {promoteStudent?.student_id || promoteStudent?.profile_id}@alumni.sskru.ac.th)
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPromoteOpen(false)}
              className="text-gray-500 hover:bg-gray-100 rounded-xl"
              disabled={promoting}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handlePromote}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
              disabled={promoting}
            >
              {promoting ? 'กำลังบันทึก...' : 'ปรับเป็นศิษย์เก่า'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-gray-900">นำเข้าข้อมูลนักศึกษา</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              อัปโหลดไฟล์ CSV หรือ Excel เพื่อเพิ่มรายชื่อนักศึกษาจำนวนมากในคราวเดียว
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            {/* Download Templates */}
            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-purple-900">ดาวน์โหลดเทมเพลตไฟล์ตัวอย่าง</h4>
                <p className="text-[11px] text-purple-700 mt-0.5">โปรดกรอกข้อมูลให้ตรงกับหัวคอลัมน์และรูปแบบในเทมเพลต</p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button 
                  onClick={() => handleDownloadTemplate('csv')} 
                  variant="outline" 
                  size="sm" 
                  className="border-purple-200 text-purple-700 hover:bg-purple-100/80 rounded-lg text-xs"
                >
                  .CSV
                </Button>
                <Button 
                  onClick={() => handleDownloadTemplate('xlsx')} 
                  variant="outline" 
                  size="sm" 
                  className="border-purple-200 text-purple-700 hover:bg-purple-100/80 rounded-lg text-xs"
                >
                  .XLSX
                </Button>
              </div>
            </div>

            {/* File Drop/Selection */}
            <form onSubmit={handleImport} className="space-y-4">
              <div 
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-purple-200 hover:border-purple-500 hover:bg-purple-50/20 rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                <Upload size={32} className="mx-auto text-purple-400 mb-2" />
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">ขนาด: {(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-700">คลิกเพื่อเลือกไฟล์ที่ต้องการนำเข้า</p>
                    <p className="text-[10px] text-gray-400 mt-1">รองรับเฉพาะไฟล์ CSV หรือ Excel (.xlsx, .xls) เท่านั้น</p>
                  </div>
                )}
              </div>

              {file && !importResults && (
                <Button 
                  type="submit" 
                  disabled={importing}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md h-10"
                >
                  {importing ? 'กำลังนำเข้าข้อมูล...' : 'เริ่มการนำเข้าข้อมูล'}
                </Button>
              )}
            </form>

            {/* Import Results Display */}
            {importResults && (
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-gray-700">ผลการประมวลผลไฟล์</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                    <div>
                      <div className="text-lg font-bold text-emerald-950">{importResults.successCount}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase">สำเร็จ (คน)</div>
                    </div>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-3">
                    <AlertCircle size={24} className="text-rose-600" />
                    <div>
                      <div className="text-lg font-bold text-rose-950">{importResults.errorCount}</div>
                      <div className="text-[10px] text-rose-700 font-semibold uppercase">ล้มเหลว (คน)</div>
                    </div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="border border-rose-100 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-rose-50/50 text-rose-900 border-b border-rose-100/50 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">รหัส</th>
                          <th className="py-2 px-3">สาเหตุที่ล้มเหลว</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50/50 text-[11px] text-rose-700">
                        {importResults.errors.map((err, idx) => (
                          <tr key={idx} className="bg-rose-50/10">
                            <td className="py-2 px-3 font-semibold">{err.student_id || 'ไม่ระบุ'}</td>
                            <td className="py-2 px-3">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="border-t border-purple-50 pt-4">
              <Button
                onClick={() => {
                  setIsImportOpen(false);
                  setFile(null);
                  setImportResults(null);
                }}
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

export default Students;
