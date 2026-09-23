import React, { useEffect, useState, useRef } from 'react';
import { studentService, departmentService, facultyService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import {
  Users, Search, Plus, Upload, Download, Edit2, Trash2, X, AlertCircle,
  FileText, CheckCircle2, ChevronDown, ChevronRight, Bot, GraduationCap,
  Building2, BookOpen, Layers, LayoutGrid, Table, ArrowLeft, ArrowRight, User,
  Mail, Phone, Eye
} from 'lucide-react';
import AITrackModal from '../components/AITrackModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';

const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
  return `${backendBase}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
};

const FACULTIES_DEPARMENTS = {
  'คณะศิลปศาสตร์และวิทยาศาสตร์': [
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
    'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม'
  ],
};

const Students = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAITrack, setShowAITrack] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('drilldown'); // 'drilldown' หรือ 'table'
  const [drillStep, setDrillStep] = useState(1); // 1: คณะ, 2: สาขา, 3: ชั้นปี, 4: รายชื่อนักศึกษา
  const [facultiesList, setFacultiesList] = useState([]);
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
  // Student Profile Dialog state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
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
    fetchDepartments();
    fetchFaculties();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      if (response.success && response.data) {
        setDepartmentsList(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch departments in Students.jsx:', err);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await facultyService.getAll();
      if (response.success && response.data) {
        setFacultiesList(response.data.map(f => f.faculty_name));
      }
    } catch (err) {
      console.error('Failed to fetch faculties in Students.jsx:', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // ดึงข้อมูลเฉพาะนักศึกษาปัจจุบัน (type: 'current' คือ รหัส 2 ตัวแรก >= 66)
      const params = { ...filters, type: 'current' };
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
      email: (student.email && !student.email.includes('@student.sskru.ac.th'))
        ? student.email
        : `stu${student.student_id}@sskru.ac.th`,
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

  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const res = await facultyService.getAll();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setFacultiesList(res.data.map(f => f.faculty_name));
        } else {
          setFacultiesList(Object.keys(FACULTIES_DEPARMENTS));
        }
      } catch (err) {
        setFacultiesList(Object.keys(FACULTIES_DEPARMENTS));
      }
    };
    fetchFaculties();
  }, []);

  const displayedStudents = students.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      const matchId = (s.student_id || '').toLowerCase().includes(q);
      const matchName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q);
      if (!matchId && !matchName) return false;
    }
    if (filters.faculty && s.faculty !== filters.faculty) return false;
    if (filters.department && s.department !== filters.department) return false;
    if (filters.year && s.year?.toString() !== filters.year.toString()) return false;
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });

  const allFaculties = Array.from(new Set([
    ...facultiesList,
    ...departmentsList.map(d => d.faculty_name).filter(Boolean),
    ...students.map(s => s.faculty).filter(Boolean)
  ])).filter(Boolean);

  // ดึงรายการสาขาวิชาจาก Master list (departmentsList) เป็นหลัก เพื่อให้คงสาขาที่ไม่มีนักศึกษาไว้ (LEFT JOIN logic)
  const masterDepartments = departmentsList
    .filter(d => !filters.faculty || d.faculty_name === filters.faculty)
    .map(d => d.department_name);

  const availableDepartments = masterDepartments.length > 0
    ? masterDepartments
    : Array.from(new Set([
        ...(filters.faculty && FACULTIES_DEPARMENTS[filters.faculty] ? FACULTIES_DEPARMENTS[filters.faculty] : []),
        ...students.filter(s => !filters.faculty || s.faculty === filters.faculty).map(s => s.department).filter(Boolean)
      ])).filter(Boolean);

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
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <Button
              onClick={() => setIsImportOpen(true)}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-sm text-xs sm:text-sm"
            >
              <Upload size={16} />
              <span>นำเข้าข้อมูล</span>
            </Button>

            <div className="relative group">
              <Button
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-sm w-full text-xs sm:text-sm"
              >
                <Download size={16} />
                <span>ส่งออก</span>
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
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm"
            >
              <Bot size={16} />
              <span>AI Track</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">เพิ่มนักศึกษา</span>
              <span className="sm:hidden">เพิ่ม</span>
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

      {/* Dynamic Summary Dashboard Cards (Requirement 5) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
            <span>นักศึกษาทั้งหมด</span>
            <Users size={18} />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {displayedStudents.length} <span className="text-sm font-normal opacity-80">คน</span>
          </div>
          <p className="text-[11px] text-purple-200 truncate">
            {filters.faculty ? (filters.department ? `${filters.department} ${filters.year ? `(ปี ${filters.year})` : ''}` : filters.faculty) : 'ภาพรวมทั้งระบบ'}
          </p>
        </div>

        {/* Faculties Count */}
        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>คณะ</span>
            <Building2 size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 truncate">
            {filters.faculty ? (
              <span className="text-sm font-bold text-purple-700 block truncate" title={filters.faculty}>{filters.faculty}</span>
            ) : (
              <span>{allFaculties.length || 1} <span className="text-sm font-normal text-gray-400">คณะ</span></span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            {filters.faculty ? 'คณะที่เลือก' : 'คณะทั้งหมดในระบบ'}
          </p>
        </div>

        {/* Departments Count */}
        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>สาขาวิชา</span>
            <BookOpen size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 truncate">
            {filters.department ? (
              <span className="text-sm font-bold text-blue-700 block truncate" title={filters.department}>{filters.department}</span>
            ) : (
              <span>{availableDepartments.length || 11} <span className="text-sm font-normal text-gray-400">สาขา</span></span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            {filters.department ? 'สาขาที่เลือก' : (filters.faculty ? `สาขาใน${filters.faculty}` : 'สาขาทั้งหมด')}
          </p>
        </div>

        {/* Years Count */}
        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>ชั้นปี</span>
            <GraduationCap size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            {filters.year ? (
              <span className="text-sm font-bold text-emerald-700">ชั้นปีที่ {filters.year}</span>
            ) : (
              <span>4 <span className="text-sm font-normal text-gray-400">ชั้นปี</span></span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            {filters.year ? 'ชั้นปีที่เลือก' : 'ปี 1 ถึง ปี 4+'}
          </p>
        </div>
      </div>

      {/* View Mode & Drill-down Navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-purple-100/70 shadow-sm">
        {/* Step Breadcrumb when in drilldown */}
        {viewMode === 'drilldown' ? (
          <>
            {/* Desktop breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-xs py-1">
              <button
                onClick={() => {
                  setFilters({ faculty: '', department: '', year: '', status: '' });
                  setDrillStep(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${drillStep === 1 ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-50'
                  }`}
              >
                <Building2 size={13} />
                1. เลือกคณะ
              </button>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => {
                  if (filters.faculty) {
                    setFilters(prev => ({ ...prev, department: '', year: '' }));
                    setDrillStep(2);
                  }
                }}
                disabled={!filters.faculty}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${drillStep === 2
                    ? 'bg-purple-600 text-white'
                    : filters.faculty ? 'text-gray-700 hover:bg-purple-50' : 'text-gray-300 cursor-not-allowed'
                  }`}
              >
                <BookOpen size={13} />
                2. {filters.faculty ? (filters.faculty.length > 15 ? filters.faculty.substring(0, 15) + '...' : filters.faculty) : 'เลือกสาขา'}
              </button>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => {
                  if (filters.department) {
                    setFilters(prev => ({ ...prev, year: '' }));
                    setDrillStep(3);
                  }
                }}
                disabled={!filters.department}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${drillStep === 3
                    ? 'bg-purple-600 text-white'
                    : filters.department ? 'text-gray-700 hover:bg-purple-50' : 'text-gray-300 cursor-not-allowed'
                  }`}
              >
                <GraduationCap size={13} />
                3. {filters.department ? (filters.department.length > 15 ? filters.department.substring(0, 15) + '...' : filters.department) : 'เลือกชั้นปี'}
              </button>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => {
                  if (filters.department) setDrillStep(4);
                }}
                disabled={!filters.department}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${drillStep === 4
                    ? 'bg-purple-600 text-white'
                    : filters.department ? 'text-gray-700 hover:bg-purple-50' : 'text-gray-300 cursor-not-allowed'
                  }`}
              >
                <Users size={13} />
                4. รายชื่อ ({displayedStudents.length})
              </button>
            </div>
            {/* Mobile compact breadcrumb */}
            <div className="flex sm:hidden items-center gap-2 text-xs py-1">
              {drillStep > 1 && (
                <button
                  onClick={() => setDrillStep(drillStep - 1)}
                  className="px-2 py-1.5 rounded-lg text-gray-600 hover:bg-purple-50 flex items-center gap-1 shrink-0"
                >
                  <ArrowLeft size={13} />
                  กลับ
                </button>
              )}
              <span className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold flex items-center gap-1">
                {drillStep === 1 && <><Building2 size={13} /> เลือกคณะ</>}
                {drillStep === 2 && <><BookOpen size={13} /> เลือกสาขา</>}
                {drillStep === 3 && <><GraduationCap size={13} /> เลือกชั้นปี</>}
                {drillStep === 4 && <><Users size={13} /> รายชื่อ ({displayedStudents.length})</>}
              </span>
              <span className="text-gray-400 text-[11px] shrink-0">ขั้นที่ {drillStep}/4</span>
            </div>
          </>
        ) : (
          <div className="text-xs font-semibold text-gray-700 px-2 flex items-center gap-2">
            <Table size={15} className="text-purple-600" />
            มุมมองตารางรวม ({displayedStudents.length} คน)
          </div>
        )}

        {/* View Switcher */}
        <div className="flex items-center bg-purple-50 p-1 rounded-xl border border-purple-100 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('drilldown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'drilldown'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-purple-600'
              }`}
          >
            <LayoutGrid size={13} /> เลือกตามขั้นตอน
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'table'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-purple-600'
              }`}
          >
            <Table size={13} /> ตารางข้อมูล
          </button>
        </div>
      </div>

      {/* ======================= VIEW MODE 1: DRILLDOWN STEP ======================= */}
      {viewMode === 'drilldown' && (
        <div className="space-y-4">
          {/* STEP 1: คณะ */}
          {drillStep === 1 && (
            <div className="bg-white border border-purple-100/70 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-purple-50 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                    เลือกคณะ (Faculty)
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">เลือกคณะเพื่อดูสาขาวิชาและรายชื่อนักศึกษา</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {allFaculties.map((fac) => {
                  const count = students.filter(s => s.faculty === fac).length;
                  return (
                    <div
                      key={fac}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, faculty: fac, department: '', year: '' }));
                        setDrillStep(2);
                      }}
                      className="border-2 border-purple-100 hover:border-purple-500 hover:shadow-md bg-gradient-to-br from-white to-purple-50/30 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                          <Building2 size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors">
                          {fac}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-50 text-xs">
                        <span className="font-semibold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-full">
                          {count} คน
                        </span>
                        <span className="text-purple-600 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          เลือกคณะ &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: สาขาวิชา */}
          {drillStep === 2 && (
            <div className="bg-white border border-purple-100/70 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-50 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                    เลือกสาขาวิชา — {filters.faculty}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">เลือกสาขาวิชาเพื่อดูชั้นปีและรายชื่อนักศึกษา</p>
                </div>
                <Button
                  onClick={() => setDrillStep(1)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-purple-700 text-xs self-start sm:self-auto flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> กลับไปเลือกคณะ
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {availableDepartments.map((dept) => {
                  const count = students.filter(s => 
                    (!filters.faculty || s.faculty === filters.faculty) && 
                    (s.department === dept || s.department?.trim() === dept?.trim())
                  ).length;
                  const displayCount = count === null || count === undefined ? 0 : count;
                  return (
                    <div
                      key={dept}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, department: dept, year: '' }));
                        setDrillStep(3);
                      }}
                      className="border-2 border-purple-100 hover:border-purple-500 hover:shadow-md bg-gradient-to-br from-white to-blue-50/20 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                          <BookOpen size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                          {dept}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-50 text-xs">
                        <span className="font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full">
                          {displayCount} คน
                        </span>
                        <span className="text-blue-600 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          เลือกสาขา &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: ชั้นปี */}
          {drillStep === 3 && (
            <div className="bg-white border border-purple-100/70 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-50 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                    เลือกชั้นปี — {filters.department}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">เลือกชั้นปีที่ต้องการแสดงรายชื่อ</p>
                </div>
                <Button
                  onClick={() => setDrillStep(2)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-purple-700 text-xs self-start sm:self-auto flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> กลับไปเลือกสาขา
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
                {[1, 2, 3, 4].map((yr) => {
                  const count = students.filter(s =>
                    (!filters.faculty || s.faculty === filters.faculty) &&
                    (!filters.department || s.department === filters.department) &&
                    s.year === yr
                  ).length;

                  return (
                    <div
                      key={yr}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, year: yr.toString() }));
                        setDrillStep(4);
                      }}
                      className="border-2 border-purple-100 hover:border-emerald-500 hover:shadow-md bg-gradient-to-br from-white to-emerald-50/20 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between items-center text-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform mb-2">
                        ปี {yr}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">ชั้นปีที่ {yr}</h3>
                      <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-3 py-0.5 rounded-full text-xs mt-3">
                        {count} คน
                      </span>
                    </div>
                  );
                })}

                {/* Option: ทุกชั้นปี */}
                <div
                  onClick={() => {
                    setFilters(prev => ({ ...prev, year: '' }));
                    setDrillStep(4);
                  }}
                  className="border-2 border-purple-200 hover:border-purple-600 hover:shadow-md bg-purple-50/40 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform mb-2">
                    ทั้งหมด
                  </div>
                  <h3 className="font-bold text-purple-900 text-sm">ทุกชั้นปี</h3>
                  <span className="font-semibold text-purple-800 bg-purple-200/60 px-3 py-0.5 rounded-full text-xs mt-3">
                    {displayedStudents.length} คน
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: รายชื่อนักศึกษา (Card View with Avatars) */}
          {drillStep === 4 && (
            <div className="space-y-4">
              {/* Filter bar inside step 4 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="ค้นหาชื่อ, รหัสนักศึกษา ในกลุ่มนี้..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 border-purple-100 rounded-xl h-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setDrillStep(3)}
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-700 text-xs rounded-xl h-10 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> เปลี่ยนชั้นปี
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 text-xs rounded-xl h-10"
                  >
                    <X size={14} className="mr-1" /> ล้างตัวเลือก
                  </Button>
                </div>
              </div>

              {/* Student Cards Grid (Requirement 7) */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                  <span className="text-xs text-gray-400">กำลังโหลดข้อมูลนักศึกษา...</span>
                </div>
              ) : displayedStudents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-purple-100 p-8 space-y-2">
                  <Users size={40} className="mx-auto text-purple-300" />
                  <p className="text-sm font-bold text-gray-700">ไม่พบรายชื่อนักศึกษาในเงื่อนไขนี้</p>
                  <p className="text-xs text-gray-400">ลองเปลี่ยนคำค้นหา หรือเลือกชั้นปีอื่น</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {displayedStudents.map((student) => {
                    const avatarUrl = getFileUrl(student.avatar_url);
                    const initials = ((student.first_name || 'U').charAt(0) + (student.last_name || '').charAt(0)).toUpperCase() || 'U';
                    const fullName = `${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}`.trim();

                    return (
                      <div 
                        key={student.id} 
                        className="border border-purple-100/80 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col items-center text-center group relative"
                      >
                        {/* ส่วนข้อมูลนักศึกษาที่คลิกดูโปรไฟล์ได้ทันที */}
                        <div
                          onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                          className="w-full flex flex-col items-center cursor-pointer"
                          title="คลิกเพื่อดูโปรไฟล์"
                        >
                          {/* รูปนักศึกษา (Avatar with graceful fallback) */}
                          <div className="w-24 h-24 rounded-2xl bg-purple-50 border-2 border-purple-100 overflow-hidden flex items-center justify-center mb-3 shadow-inner relative group-hover:scale-105 transition-transform">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={fullName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xl items-center justify-center ${avatarUrl ? 'hidden' : 'flex'}`}
                            >
                              {initials}
                            </div>
                          </div>

                          {/* ข้อมูลนักศึกษา */}
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full mb-1">
                            {student.student_id}
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-purple-700 transition-colors">
                            {fullName}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {student.department || '-'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {student.faculty || '-'}
                          </p>

                          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-purple-50 w-full text-xs">
                            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                              ชั้นปีที่ {student.year || '1'}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-md ${
                              student.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {student.status === 'Active' ? 'ปกติ' : (student.status || 'ปกติ')}
                            </span>
                          </div>
                        </div>

                        {/* Actions: ดูโปรไฟล์สำหรับทุก Role + แก้ไข/ลบสำหรับ Admin */}
                        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-purple-50 w-full justify-center">
                          <Button
                            onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                            className="flex-1 h-9 px-3 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                          >
                            <Eye size={14} /> ดูโปรไฟล์
                          </Button>
                          {user?.role === 'admin' && (
                            <>
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(student); }}
                                variant="outline"
                                size="icon"
                                title="แก้ไข"
                                className="h-9 w-9 text-purple-700 border-purple-200/80 hover:bg-purple-50 rounded-xl shrink-0"
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleOpenDelete(student.id); }}
                                variant="outline"
                                size="icon"
                                title="ลบ"
                                className="h-9 w-9 text-rose-600 border-rose-200/80 hover:bg-rose-50 rounded-xl shrink-0"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================= VIEW MODE 2: TABLE ======================= */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Table Filters bar */}
          <div className="bg-white/80 backdrop-blur-md border border-purple-100/50 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label className="text-gray-500 text-xs font-semibold">ค้นหา</Label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="ค้นหาชื่อ, รหัส..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 border-purple-100 rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              {/* Faculty Filter */}
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs font-semibold">คณะ</Label>
                <select
                  value={filters.faculty}
                  onChange={(e) => setFilters({ ...filters, faculty: e.target.value, department: '' })}
                  className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">ทุกคณะ</option>
                  {allFaculties.map((fac) => (
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
                >
                  <option value="">ทุกสาขาวิชา</option>
                  {availableDepartments.map((dept) => (
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
                >
                  <option value="">ทุกชั้นปี</option>
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
                  <option value="Active">ปกติ</option>
                  <option value="Graduated">สำเร็จการศึกษา</option>
                  <option value="Suspended">รักษาสภาพ</option>
                  <option value="Dismissed">พ้นสภาพ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Data Table */}
          <div className="bg-white/80 backdrop-blur-md border border-purple-100/50 rounded-2xl shadow-sm overflow-hidden">
            {displayedStudents.length > 0 ? (
              <>
                {/* 1. Mobile Cards Layout (เฉพาะหน้าจอโทรศัพท์ < sm) */}
                <div className="block sm:hidden divide-y divide-purple-100/60">
                  {displayedStudents.map((student) => {
                    const avatarUrl = getFileUrl(student.avatar_url);
                    const fullName = `${student.prefix || student.title_th || ''}${student.first_name || student.first_name_th || ''} ${student.last_name || student.last_name_th || ''}`.trim();
                    const initials = student.first_name ? student.first_name[0] : (student.first_name_th ? student.first_name_th[0] : 'S');

                    return (
                      <div key={student.id} className="p-4 bg-white hover:bg-purple-50/20 transition-all space-y-3">
                        <div 
                          onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                          className="flex items-start gap-3 cursor-pointer"
                          title="แตะเพื่อดูโปรไฟล์"
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={fullName}
                              className="w-12 h-12 rounded-xl object-cover border border-purple-100 shadow-sm shrink-0"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-sm items-center justify-center shadow-sm shrink-0 ${avatarUrl ? 'hidden' : 'flex'}`}
                          >
                            {initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                                {student.student_id}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                student.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : student.status === 'Graduated'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : student.status === 'Suspended'
                                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {student.status === 'Active' ? 'ปกติ' : student.status === 'Graduated' ? 'สำเร็จการศึกษา' : student.status === 'Suspended' ? 'รักษาสภาพ' : student.status === 'Dismissed' ? 'พ้นสภาพ' : (student.status || 'ปกติ')}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm mt-1.5 truncate">
                              {fullName}
                            </h4>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {student.department || '-'}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {student.faculty || '-'} • ชั้นปีที่ {student.year || '1'}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons บน Mobile */}
                        <div className="flex items-center gap-2 pt-1 border-t border-purple-50">
                          <Button
                            onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                            className="flex-1 h-9 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          >
                            <Eye size={14} /> ดูโปรไฟล์
                          </Button>
                          {user?.role === 'admin' && (
                            <div className="flex items-center gap-1">
                              {student.status !== 'Graduated' && (
                                <Button
                                  onClick={() => handleOpenPromote(student)}
                                  variant="outline"
                                  size="icon"
                                  title="จบการศึกษาและปรับเป็นศิษย์เก่า"
                                  className="h-9 w-9 rounded-xl border-purple-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <GraduationCap size={15} />
                                </Button>
                              )}
                              <Button
                                onClick={() => handleOpenEdit(student)}
                                variant="outline"
                                size="icon"
                                title="แก้ไข"
                                className="h-9 w-9 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50"
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                onClick={() => handleOpenDelete(student.id)}
                                variant="outline"
                                size="icon"
                                title="ลบ"
                                className="h-9 w-9 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop/Tablet Table Layout (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-purple-50 bg-purple-50/30 text-purple-900 font-semibold text-xs">
                        <th className="py-3 px-3 sm:px-6">รหัสนักศึกษา</th>
                        <th className="py-3 px-3 sm:px-6">ชื่อ - นามสกุล</th>
                        <th className="py-3 px-6 hidden md:table-cell">คณะ / สาขาวิชา</th>
                        <th className="py-3 px-3 sm:px-6 text-center hidden sm:table-cell">ชั้นปี</th>
                        <th className="py-3 px-6 hidden lg:table-cell">ช่องทางติดต่อ</th>
                        <th className="py-3 px-3 sm:px-6 hidden sm:table-cell">สถานะ</th>
                        <th className="py-3 px-3 sm:px-6 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50/60">
                      {displayedStudents.map((student) => {
                        const avatarUrl = getFileUrl(student.avatar_url);
                        return (
                          <tr key={student.id} className="hover:bg-purple-50/20 transition-colors">
                            <td 
                              onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                              className="py-4 px-3 sm:px-6 font-semibold text-purple-700 text-xs cursor-pointer hover:underline"
                            >
                              {student.student_id}
                            </td>
                            <td 
                              onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                              className="py-4 px-3 sm:px-6 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={student.first_name || student.first_name_th || ''}
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-purple-100 shadow-sm shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold text-xs items-center justify-center shadow-sm shrink-0 ${avatarUrl ? 'hidden' : 'flex'}`}
                                >
                                  {student.first_name ? student.first_name[0] : (student.first_name_th ? student.first_name_th[0] : 'S')}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 text-xs truncate hover:text-purple-700 transition-colors">
                                    {student.prefix || student.title_th ? `${student.prefix || student.title_th} ` : ''}{student.first_name || student.first_name_th || ''} {student.last_name || student.last_name_th || ''}
                                  </div>
                                  {student.first_name_en && (
                                    <p className="text-[11px] text-gray-400 font-normal truncate">
                                      {student.first_name_en} {student.last_name_en}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 leading-tight hidden md:table-cell">
                              <div className="text-xs text-gray-900 font-semibold">{student.faculty}</div>
                              <span className="text-xs text-gray-400 font-medium">{student.department}</span>
                            </td>
                            <td className="py-4 px-3 sm:px-6 text-center hidden sm:table-cell">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-purple-50 border border-purple-100/50 text-purple-700 font-bold text-xs">
                                {student.year}
                              </span>
                            </td>
                            <td className="py-4 px-6 leading-tight space-y-1 hidden lg:table-cell">
                              <div className="text-xs text-gray-500 font-medium">
                                {(student.email && !student.email.includes('@student.sskru.ac.th'))
                                  ? student.email
                                  : `stu${student.student_id}@sskru.ac.th`}
                              </div>
                              {student.phone && (
                                <div className="text-xs text-gray-400 font-medium">📞 {student.phone}</div>
                              )}
                            </td>
                            <td className="py-4 px-3 sm:px-6 hidden sm:table-cell">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${student.status === 'Active'
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
                            <td className="py-4 px-3 sm:px-6">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  onClick={() => { setSelectedStudentProfile(student); setIsProfileOpen(true); }}
                                  variant="ghost"
                                  size="icon"
                                  title="ดูโปรไฟล์"
                                  className="h-8 w-8 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                                >
                                  <Eye size={15} />
                                </Button>
                                {user?.role === 'admin' && (
                                  <>
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
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
      <div className="text-center py-20 text-gray-400">
        <Users size={40} className="mx-auto text-purple-200 mb-3" />
        <p className="text-base font-bold text-gray-600">ไม่พบรายชื่อนักศึกษา</p>
        <p className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนคำค้นหา หรือเปลี่ยนตัวกรองข้อมูล</p>
      </div>
    )}
  </div>
        </div>
      )}

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
      </Dialog >

  {/* Delete Confirmation Dialog */ }
  < Dialog open = { isDeleteOpen } onOpenChange = { setIsDeleteOpen } >
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
      </Dialog >

  {/* Promote to Alumni Confirmation Dialog */ }
  < Dialog open = { isPromoteOpen } onOpenChange = { setIsPromoteOpen } >
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
              onChange={(e) => setPromoteForm({ ...promoteForm, graduation_year: e.target.value })}
              className="border-purple-100 rounded-xl focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 text-xs font-semibold">รอบจบ / รุ่น</Label>
            <Input
              type="text"
              placeholder="เช่น 1/2569"
              value={promoteForm.graduation_batch}
              onChange={(e) => setPromoteForm({ ...promoteForm, graduation_batch: e.target.value })}
              className="border-purple-100 rounded-xl focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-700 text-xs font-semibold">วันที่สำเร็จการศึกษา</Label>
          <Input
            type="date"
            value={promoteForm.graduation_date}
            onChange={(e) => setPromoteForm({ ...promoteForm, graduation_date: e.target.value })}
            className="border-purple-100 rounded-xl focus:ring-purple-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-700 text-xs font-semibold">อีเมลสำหรับบัญชีศิษย์เก่า</Label>
          <Input
            type="email"
            placeholder="เช่น student@alumni.sskru.ac.th"
            value={promoteForm.email || ''}
            onChange={(e) => setPromoteForm({ ...promoteForm, email: e.target.value })}
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
      </Dialog >

  {/* Import Dialog */ }
  < Dialog open = { isImportOpen } onOpenChange = { setIsImportOpen } >
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
      </Dialog >

      {/* Student Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto bg-white rounded-3xl p-0 shadow-2xl border border-purple-100 overflow-hidden max-h-[90vh] overflow-y-auto [&>button]:text-white [&>button]:bg-white/20 [&>button]:hover:bg-white/30 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3.5 [&>button]:right-3.5">
          {selectedStudentProfile && (() => {
            const s = selectedStudentProfile;
            const avatarUrl = getFileUrl(s.avatar_url);
            const fullName = `${s.prefix || ''}${s.first_name || ''} ${s.last_name || ''}`.trim();
            const initials = ((s.first_name || 'U').charAt(0) + (s.last_name || '').charAt(0)).toUpperCase() || 'U';

            return (
              <>
                {/* Profile Header with Back Button */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-6 pt-7 pb-9 text-center relative">
                  {/* ปุ่มย้อนกลับชัดเจนบน Mobile & Desktop */}
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all flex items-center gap-1 text-xs font-semibold z-10 active:scale-95"
                    title="กลับหน้ารายชื่อ"
                  >
                    <ArrowLeft size={14} />
                    <span>กลับ</span>
                  </button>
                  <div className="w-24 h-24 mx-auto rounded-2xl bg-white/20 border-4 border-white/40 overflow-hidden flex items-center justify-center shadow-lg">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full bg-white/10 text-white font-bold text-2xl items-center justify-center ${avatarUrl ? 'hidden' : 'flex'}`}
                    >
                      {initials}
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-lg mt-3">{fullName}</h3>
                  <p className="text-purple-200 text-sm mt-0.5">{s.student_id}</p>
                </div>

                {/* Profile Details */}
                <div className="px-6 py-5 space-y-4 -mt-4">
                  <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 space-y-3">
                    {/* คณะ */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Building2 size={16} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-semibold uppercase">คณะ</p>
                        <p className="text-sm text-gray-900 font-medium break-words">{s.faculty || '-'}</p>
                      </div>
                    </div>
                    {/* สาขาวิชา */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen size={16} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 font-semibold uppercase">สาขาวิชา</p>
                        <p className="text-sm text-gray-900 font-medium break-words">{s.department || '-'}</p>
                      </div>
                    </div>
                    {/* ชั้นปี */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-semibold uppercase">ชั้นปี</p>
                        <p className="text-sm text-gray-900 font-medium">ชั้นปีที่ {s.year || '-'}</p>
                      </div>
                    </div>
                    {/* สถานะ */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 font-semibold uppercase">สถานะ</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-0.5 ${
                          s.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : s.status === 'Graduated'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : s.status === 'Suspended'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {s.status === 'Active' && 'ปกติ'}
                          {s.status === 'Graduated' && 'สำเร็จการศึกษา'}
                          {s.status === 'Suspended' && 'รักษาสภาพ'}
                          {s.status === 'Dismissed' && 'พ้นสภาพ'}
                          {!s.status && 'ปกติ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลติดต่อ */}
                  <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase">ช่องทางติดต่อ</h4>
                    {/* อีเมล */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                        <Mail size={16} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 font-medium truncate">
                          {(s.email && !s.email.includes('@student.sskru.ac.th'))
                            ? s.email
                            : (s.student_id ? `stu${s.student_id}@sskru.ac.th` : s.email || '-')}
                        </p>
                      </div>
                    </div>
                    {/* เบอร์โทร */}
                    {s.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <Phone size={16} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{s.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ชื่ออังกฤษ (if available) */}
                  {(s.first_name_en || s.last_name_en) && (
                    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
                      <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">ชื่อภาษาอังกฤษ</h4>
                      <p className="text-sm text-gray-900 font-medium">
                        {s.first_name_en || ''} {s.last_name_en || ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5">
                  <Button
                    onClick={() => setIsProfileOpen(false)}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md w-full h-10"
                  >
                    ปิด
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div >
  );
};

export default Students;
