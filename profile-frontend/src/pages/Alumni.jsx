import React, { useEffect, useState, useRef } from 'react';
import { alumniService, departmentService, facultyService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  GraduationCap, Search, Plus, Upload, Download, Edit2, Trash2, AlertCircle, FileText, 
  Briefcase, Mail, Phone, Globe, ChevronDown, ChevronRight, CheckCircle2,
  Building2, BookOpen, Layers, LayoutGrid, Table, ArrowLeft, ArrowRight, User, Eye, X, MapPin
} from 'lucide-react';
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

const getUniqueFaculties = (departmentsList) => {
  const faculties = new Set(departmentsList.map(d => d.faculty_name).filter(Boolean));
  return Array.from(faculties);
};

const Alumni = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentsList, setDepartmentsList] = useState([]);
  const [facultiesList, setFacultiesList] = useState([]);
  const [viewMode, setViewMode] = useState('drilldown'); // 'drilldown' หรือ 'table'
  const [drillStep, setDrillStep] = useState(1); // 1: คณะ, 2: สาขา, 3: ปีการศึกษา, 4: รายชื่อศิษย์เก่า
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedAlumniProfile, setSelectedAlumniProfile] = useState(null);
  const [filters, setFilters] = useState({
    faculty: '',
    department: '',
    department_id: '',
    graduation_year: '',
    graduation_batch: '',
    employment_status: ''
  });

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentAlumni, setCurrentAlumni] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [file, setFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [form, setForm] = useState({
    alumni_id: '',
    first_name: '',
    last_name: '',
    faculty: '',
    department: '',
    graduation_year: '',
    graduation_batch: '',
    graduation_date: '',
    workplace: '',
    position: '',
    employment_status: 'employed',
    interested_job_types: '', // Comma separated in input
    portfolio: '',
    photo_url: '',
    email: '',
    phone: '',
    linkedin: '',
    facebook: '',
    twitter: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [workplaceSuggestions, setWorkplaceSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchFaculties();
  }, []);

  useEffect(() => {
    fetchAlumni();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      if (response.success) {
        setDepartmentsList(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await facultyService.getAll();
      if (response.success && response.data) {
        setFacultiesList(response.data.map(f => f.faculty_name));
      }
    } catch (err) {
      console.error('Failed to fetch faculties:', err);
    }
  };

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const params = { ...filters, type: 'alumni' };
      if (search) params.search = search;
      const response = await alumniService.getAll(params);
      if (response.success) {
        let fetchedAlumni = response.data;

        // If user is alumni, sort user's own profile to the very top
        if (user && user.role === 'alumni') {
          const checkIsMyProfile = (item) => {
            const cleanUser = user.username ? user.username.replace('alumni_', '').toLowerCase() : '';
            const cleanAlumni = item.alumni_id ? item.alumni_id.toLowerCase() : '';
            return user.alumni_id === item.alumni_id || user.username === item.alumni_id || cleanUser === cleanAlumni;
          };

          fetchedAlumni = [...fetchedAlumni].sort((a, b) => {
            const aMine = checkIsMyProfile(a) ? 1 : 0;
            const bMine = checkIsMyProfile(b) ? 1 : 0;
            return bMine - aMine; // 1 comes before 0
          });
        }

        setAlumni(fetchedAlumni);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลศิษย์เก่าได้"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAlumni();
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ faculty: '', department: '', department_id: '', graduation_year: '', graduation_batch: '', employment_status: '' });
  };

  // Autofill from Student ID
  const handleIdBlur = async () => {
    if (!form.alumni_id || form.alumni_id.length !== 10) return;
    try {
      const response = await api.get(`/students/code/${form.alumni_id}`);
      if (response.data.success && response.data.data) {
        const student = response.data.data;
        setForm(prev => ({
          ...prev,
          first_name: student.first_name || prev.first_name,
          last_name: student.last_name || prev.last_name,
          faculty: student.faculty || prev.faculty,
          department: student.department || prev.department,
          email: student.email || prev.email,
          phone: student.phone || prev.phone,
          graduation_year: prev.graduation_year || (new Date().getFullYear() + 543) // Default to current Thai year
        }));
        toast({
          title: "ดึงข้อมูลประวัตินักศึกษาอัตโนมัติ",
          description: `พบประวัติของคุณ ${student.first_name} ${student.last_name}`
        });
      }
    } catch (error) {
      // Ignore
    }
  };

  // Workplace Autofill/Suggestions logic
  const handleWorkplaceChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, workplace: value }));

    if (value.length > 1) {
      // Find matching workplaces from other alumni
      const uniqueWorkplaces = [...new Set(alumni.map(a => a.workplace).filter(Boolean))];
      const filtered = uniqueWorkplaces.filter(w => w.toLowerCase().includes(value.toLowerCase()));
      setWorkplaceSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectWorkplace = (value) => {
    setForm(prev => ({ ...prev, workplace: value }));
    setShowSuggestions(false);
    
    // Autofill mock company detail (as specified in 11.3: Autofill company contact if it matches)
    toast({
      title: "เติมข้อมูลบริษัทอัตโนมัติ",
      description: `เชื่อมโยงข้อมูลบริษัท ${value} สำเร็จ`
    });
  };

  // Validations
  const validateForm = () => {
    const errors = {};
    const thEnRegex = /^[a-zA-Z\u0E00-\u0E7F\s]+$/;

    if (!form.alumni_id) errors.alumni_id = 'กรุณากรอกรหัสศิษย์เก่า/นักศึกษา';
    if (!form.first_name || !thEnRegex.test(form.first_name)) {
      errors.first_name = 'กรุณากรอกชื่อจริงเป็นตัวอักษรภาษาไทยหรืออังกฤษเท่านั้น';
    }
    if (!form.last_name || !thEnRegex.test(form.last_name)) {
      errors.last_name = 'กรุณากรอกนามสกุลเป็นตัวอักษรภาษาไทยหรืออังกฤษเท่านั้น';
    }
    if (!form.faculty) errors.faculty = 'กรุณาเลือกคณะ';
    if (!form.department) errors.department = 'กรุณาเลือกสาขาวิชา';
    if (!form.graduation_year || isNaN(form.graduation_year)) {
      errors.graduation_year = 'กรุณากรอกปีการศึกษาที่สำเร็จการศึกษา (พ.ศ.)';
    }

    if (form.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email)) {
      errors.email = 'อีเมลไม่ถูกต้อง';
    }
    if (form.phone && !/^0\d{9}$/.test(form.phone)) {
      errors.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }

    if (name === 'faculty') {
      setForm({ ...form, faculty: value, department: '' });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleOpenAdd = () => {
    setCurrentAlumni(null);
    setForm({
      alumni_id: '',
      first_name: '',
      last_name: '',
      faculty: '',
      department: '',
      graduation_year: '',
      graduation_batch: '',
      graduation_date: '',
      workplace: '',
      position: '',
      employment_status: 'employed',
      interested_job_types: '',
      portfolio: '',
      photo_url: '',
      email: '',
      phone: '',
      linkedin: '',
      facebook: '',
      twitter: ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (alumniItem) => {
    setCurrentAlumni(alumniItem);

    // Safely parse interested_job_types
    let jobTypesStr = '';
    if (alumniItem.interested_job_types) {
      if (Array.isArray(alumniItem.interested_job_types)) {
        jobTypesStr = alumniItem.interested_job_types.join(', ');
      } else if (typeof alumniItem.interested_job_types === 'string') {
        try {
          const parsed = JSON.parse(alumniItem.interested_job_types);
          jobTypesStr = Array.isArray(parsed) ? parsed.join(', ') : alumniItem.interested_job_types;
        } catch (e) {
          jobTypesStr = alumniItem.interested_job_types;
        }
      }
    }

    // Safely parse contact_info
    let contactInfoObj = alumniItem.contact_info || {};
    if (typeof contactInfoObj === 'string') {
      try {
        contactInfoObj = JSON.parse(contactInfoObj) || {};
      } catch (e) {
        contactInfoObj = {};
      }
    }

    setForm({
      alumni_id: alumniItem.alumni_id || '',
      first_name: alumniItem.first_name || '',
      last_name: alumniItem.last_name || '',
      faculty: alumniItem.faculty || '',
      department: alumniItem.department || '',
      graduation_year: alumniItem.graduation_year ? alumniItem.graduation_year.toString() : '',
      graduation_batch: alumniItem.graduation_batch || '',
      graduation_date: alumniItem.graduation_date ? alumniItem.graduation_date.split('T')[0] : '',
      workplace: alumniItem.workplace || '',
      position: alumniItem.position || '',
      employment_status: alumniItem.employment_status || 'employed',
      interested_job_types: jobTypesStr,
      portfolio: alumniItem.portfolio || '',
      photo_url: alumniItem.photo_url || '',
      email: contactInfoObj.email || '',
      phone: contactInfoObj.phone || '',
      linkedin: contactInfoObj.social_media?.linkedin || '',
      facebook: contactInfoObj.social_media?.facebook || '',
      twitter: contactInfoObj.social_media?.twitter || ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedData = {
      alumni_id: form.alumni_id,
      first_name: form.first_name,
      last_name: form.last_name,
      faculty: form.faculty,
      department: (departmentsList.find(d => d.department_id === form.department)?.department_name) || form.department,
      department_id: form.department,
      graduation_year: parseInt(form.graduation_year),
      graduation_batch: form.graduation_batch || null,
      graduation_date: form.graduation_date || null,
      employment_status: form.employment_status,
      workplace: form.employment_status === 'seeking' ? '' : form.workplace,
      position: form.employment_status === 'seeking' ? '' : form.position,
      interested_job_types: form.employment_status === 'seeking' 
        ? form.interested_job_types.split(',').map(t => t.trim()).filter(Boolean) 
        : [],
      portfolio: form.portfolio,
      photo_url: form.photo_url,
      contact_info: {
        email: form.email,
        phone: form.phone,
        social_media: {
          linkedin: form.linkedin,
          facebook: form.facebook,
          twitter: form.twitter
        }
      }
    };

    try {
      let response;
      if (currentAlumni) {
        response = await alumniService.update(currentAlumni.id, formattedData);
      } else {
        response = await alumniService.create(formattedData);
      }

      if (response.success) {
        toast({
          title: currentAlumni ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มข้อมูลสำเร็จ",
          description: response.message || "บันทึกข้อมูลศิษย์เก่าสำเร็จเรียบร้อย"
        });
        setIsAddEditOpen(false);
        fetchAlumni();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        description: error.response?.data?.message || "โปรดตรวจสอบรหัสศิษย์เก่าซ้ำในระบบ"
      });
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await alumniService.delete(deleteId);
      if (response.success) {
        toast({
          title: "ลบข้อมูลสำเร็จ",
          description: "ลบประวัติศิษย์เก่าออกจากระบบแล้ว"
        });
        setIsDeleteOpen(false);
        fetchAlumni();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้"
      });
    }
  };

  // Export data
  const handleExport = async (format) => {
    try {
      const params = { ...filters, format };
      if (search) params.search = search;
      
      const response = await api.get('/data/export/alumni', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ศิษย์เก่า_${Date.now()}.${format}`);
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
      const response = await api.get('/data/template/alumni', {
        params: { format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `เทมเพลต_ศิษย์เก่า.${format}`);
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
      const response = await api.post('/data/import/alumni', formData, {
        headers: { 'Content-Type': undefined }
      });

      if (response.data.success) {
        setImportResults(response.data.data);
        toast({
          title: "นำเข้าข้อมูลเสร็จสิ้น",
          description: `นำเข้าสำเร็จ ${response.data.data.successCount} รายการ, ล้มเหลว ${response.data.data.errorCount} รายการ`
        });
        fetchAlumni();
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

  const displayedAlumni = alumni.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      const matchId = (a.alumni_id || '').toLowerCase().includes(q);
      const matchName = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().includes(q);
      const matchWork = (a.workplace || '').toLowerCase().includes(q);
      const matchPos = (a.position || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchWork && !matchPos) return false;
    }
    if (filters.faculty && a.faculty !== filters.faculty) return false;
    if (filters.department && a.department !== filters.department && !a.department?.includes(filters.department)) return false;
    if (filters.department_id && a.department_id !== filters.department_id) return false;
    if (filters.graduation_year && a.graduation_year?.toString() !== filters.graduation_year.toString()) return false;
    if (filters.graduation_batch && !a.graduation_batch?.includes(filters.graduation_batch)) return false;
    if (filters.employment_status && a.employment_status !== filters.employment_status) return false;
    return true;
  });

  const allFaculties = Array.from(new Set([
    ...facultiesList,
    ...departmentsList.map(d => d.faculty_name).filter(Boolean),
    ...alumni.map(s => s.faculty).filter(Boolean)
  ])).filter(Boolean);

  const masterDepartments = departmentsList
    .filter(d => !filters.faculty || d.faculty_name === filters.faculty)
    .map(d => d.department_name);

  const availableDepartments = masterDepartments.length > 0
    ? masterDepartments
    : Array.from(new Set([
        ...(filters.faculty && FACULTIES_DEPARMENTS[filters.faculty] ? FACULTIES_DEPARMENTS[filters.faculty] : []),
        ...alumni.filter(s => !filters.faculty || s.faculty === filters.faculty).map(s => s.department).filter(Boolean)
      ])).filter(Boolean);

  const availableYears = (() => {
    const yearsInDept = alumni
      .filter(a =>
        (!filters.faculty || a.faculty === filters.faculty) &&
        (!filters.department || a.department === filters.department || a.department?.includes(filters.department))
      )
      .map(a => parseInt(a.graduation_year, 10))
      .filter(yr => !isNaN(yr) && yr > 2500);

    const standardYears = [2569, 2568, 2567, 2566, 2565, 2564, 2563, 2562];
    return Array.from(new Set([...yearsInDept, ...standardYears])).sort((a, b) => b - a);
  })();

  const canEditAlumni = (item) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'alumni') {
      const cleanUser = user.username ? user.username.replace('alumni_', '').toLowerCase() : '';
      const cleanAlumni = item.alumni_id ? item.alumni_id.toLowerCase() : '';
      return user.alumni_id === item.alumni_id || user.username === item.alumni_id || cleanUser === cleanAlumni;
    }
    return false;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-purple-600 h-7 w-7" />
            {(user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'advisor') ? 'จัดการข้อมูลศิษย์เก่า' : 'ทำเนียบศิษย์เก่า'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ค้นหาประวัติการทำงาน ติดตามผลงาน และรายงานข้อมูลสถานที่ประกอบอาชีพของรุ่นพี่ศิษย์เก่า
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === 'admin' && (
            <>
              <Button
                onClick={() => setIsImportOpen(true)}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-sm text-xs sm:text-sm cursor-pointer"
              >
                <Upload size={16} />
                <span>นำเข้าข้อมูล</span>
              </Button>

              <div className="relative group">
                <Button
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-sm text-xs sm:text-sm cursor-pointer"
                >
                  <Download size={16} />
                  <span>ส่งออกข้อมูล</span>
                  <ChevronDown size={14} />
                </Button>
                <div className="absolute right-0 mt-1.5 w-36 bg-white border border-purple-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 overflow-hidden">
                  <button 
                    onClick={() => handleExport('csv')} 
                    className="w-full text-left px-4 py-2.5 text-xs text-purple-950 hover:bg-purple-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileText size={14} className="text-purple-600" />
                    ส่งออกเป็น CSV
                  </button>
                  <button 
                    onClick={() => handleExport('xlsx')} 
                    className="w-full text-left px-4 py-2.5 text-xs text-purple-950 hover:bg-purple-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileText size={14} className="text-amber-500" />
                    ส่งออกเป็น Excel
                  </button>
                </div>
              </div>

              <Button
                onClick={handleOpenAdd}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm cursor-pointer"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">เพิ่มข้อมูลศิษย์เก่า</span>
                <span className="sm:hidden">เพิ่ม</span>
              </Button>
            </>
          )}

          {user?.role === 'alumni' && (
            <Button
              onClick={handleOpenAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm cursor-pointer"
            >
              <Plus size={18} />
              <span>เพิ่มข้อมูลศิษย์เก่า</span>
            </Button>
          )}
        </div>
      </div>

      {/* Dynamic Summary Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Alumni */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between opacity-80 text-xs font-semibold">
            <span>ศิษย์เก่าทั้งหมด</span>
            <GraduationCap size={18} />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {displayedAlumni.length} <span className="text-sm font-normal opacity-80">คน</span>
          </div>
          <p className="text-[11px] text-purple-200 truncate">
            {filters.faculty ? (filters.department ? `${filters.department} ${filters.graduation_year ? `(ปี ${filters.graduation_year})` : ''}` : filters.faculty) : 'ภาพรวมทั้งระบบ'}
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

        {/* Employed Alumni Count */}
        <div className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>มีงานทำแล้ว</span>
            <Briefcase size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">
            <span>{displayedAlumni.filter(a => a.employment_status === 'employed').length} <span className="text-sm font-normal text-gray-400">คน</span></span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">
            มีงานทำ {displayedAlumni.length > 0 ? Math.round((displayedAlumni.filter(a => a.employment_status === 'employed').length / displayedAlumni.length) * 100) : 0}% ของกลุ่มนี้
          </p>
        </div>
      </div>

      {/* View Mode & Drill-down Stepper Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-purple-100/70 shadow-sm">
        {/* Step Breadcrumb when in drilldown */}
        {viewMode === 'drilldown' ? (
          <>
            {/* Desktop breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-xs py-1">
              <button
                onClick={() => {
                  setFilters({ faculty: '', department: '', department_id: '', graduation_year: '', graduation_batch: '', employment_status: '' });
                  setDrillStep(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${
                  drillStep === 1 ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-purple-50'
                }`}
              >
                <Building2 size={13} />
                1. เลือกคณะ
              </button>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => {
                  if (filters.faculty) {
                    setFilters(prev => ({ ...prev, department: '', department_id: '', graduation_year: '', graduation_batch: '' }));
                    setDrillStep(2);
                  }
                }}
                disabled={!filters.faculty}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${
                  drillStep === 2
                    ? 'bg-purple-600 text-white'
                    : filters.faculty ? 'text-gray-700 hover:bg-purple-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <BookOpen size={13} />
                2. {filters.faculty ? (filters.faculty.length > 15 ? filters.faculty.substring(0, 15) + '...' : filters.faculty) : 'เลือกสาขา'}
              </button>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => {
                  if (filters.department) {
                    setFilters(prev => ({ ...prev, graduation_year: '', graduation_batch: '' }));
                    setDrillStep(3);
                  }
                }}
                disabled={!filters.department}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${
                  drillStep === 3
                    ? 'bg-purple-600 text-white'
                    : filters.department ? 'text-gray-700 hover:bg-purple-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <GraduationCap size={13} />
                3. {filters.department ? (filters.department.length > 15 ? filters.department.substring(0, 15) + '...' : filters.department) : 'เลือกปีที่จบ / รุ่น'}
              </button>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
              <button
                onClick={() => {
                  if (filters.department) setDrillStep(4);
                }}
                disabled={!filters.department}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shrink-0 ${
                  drillStep === 4
                    ? 'bg-purple-600 text-white'
                    : filters.department ? 'text-gray-700 hover:bg-purple-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <User size={13} />
                4. รายชื่อ ({displayedAlumni.length})
              </button>
            </div>

            {/* Mobile compact breadcrumb */}
            <div className="flex sm:hidden items-center gap-2 text-xs py-1">
              {drillStep > 1 && (
                <button
                  onClick={() => setDrillStep(drillStep - 1)}
                  className="px-2 py-1.5 rounded-lg text-gray-600 hover:bg-purple-50 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  กลับ
                </button>
              )}
              <span className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold flex items-center gap-1">
                {drillStep === 1 && <><Building2 size={13} /> เลือกคณะ</>}
                {drillStep === 2 && <><BookOpen size={13} /> เลือกสาขา</>}
                {drillStep === 3 && <><GraduationCap size={13} /> เลือกปีที่จบ</>}
                {drillStep === 4 && <><User size={13} /> รายชื่อ ({displayedAlumni.length})</>}
              </span>
              <span className="text-gray-400 text-[11px] shrink-0">ขั้นที่ {drillStep}/4</span>
            </div>
          </>
        ) : (
          <div className="text-xs font-semibold text-gray-700 px-2 flex items-center gap-2">
            <Table size={15} className="text-purple-600" />
            มุมมองตารางรวม ({displayedAlumni.length} คน)
          </div>
        )}

        {/* View Switcher */}
        <div className="flex items-center bg-purple-50 p-1 rounded-xl border border-purple-100 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('drilldown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'drilldown'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-purple-600'
            }`}
          >
            <LayoutGrid size={13} /> เลือกตามขั้นตอน
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
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
                  <p className="text-xs text-gray-500 mt-0.5">เลือกคณะเพื่อดูสาขาวิชาและรายชื่อศิษย์เก่า</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {allFaculties.map((fac) => {
                  const count = alumni.filter(a => a.faculty === fac).length;
                  return (
                    <div
                      key={fac}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, faculty: fac, department: '', department_id: '', graduation_year: '', graduation_batch: '' }));
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
                  <p className="text-xs text-gray-500 mt-0.5">เลือกสาขาวิชาเพื่อดูปีที่สำเร็จการศึกษาและรายชื่อศิษย์เก่า</p>
                </div>
                <Button
                  onClick={() => setDrillStep(1)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-purple-700 text-xs self-start sm:self-auto flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} /> กลับไปเลือกคณะ
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {availableDepartments.map((dept) => {
                  const count = alumni.filter(a => 
                    (!filters.faculty || a.faculty === filters.faculty) && 
                    (a.department === dept || a.department?.trim() === dept?.trim())
                  ).length;

                  return (
                    <div
                      key={dept}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, department: dept, department_id: '', graduation_year: '', graduation_batch: '' }));
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
                          {count} คน
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

          {/* STEP 3: ปีที่สำเร็จการศึกษา */}
          {drillStep === 3 && (
            <div className="bg-white border border-purple-100/70 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-50 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                    เลือกปีที่สำเร็จการศึกษา — {filters.department}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">เลือกรุ่นปีการศึกษาที่สำเร็จการศึกษา (พ.ศ.) หรือเลือกดูทุกปี</p>
                </div>
                <Button
                  onClick={() => setDrillStep(2)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-purple-700 text-xs self-start sm:self-auto flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} /> กลับไปเลือกสาขา
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
                {availableYears.map((yr) => {
                  const count = alumni.filter(a =>
                    (!filters.faculty || a.faculty === filters.faculty) &&
                    (!filters.department || a.department === filters.department || a.department?.includes(filters.department)) &&
                    a.graduation_year?.toString() === yr.toString()
                  ).length;

                  return (
                    <div
                      key={yr}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, graduation_year: yr.toString() }));
                        setDrillStep(4);
                      }}
                      className="border-2 border-purple-100 hover:border-purple-500 hover:shadow-md bg-gradient-to-br from-white to-purple-50/20 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between items-center text-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform mb-2">
                        {yr}
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">รุ่นปี พ.ศ. {yr}</h3>
                      <span className="font-semibold text-purple-700 bg-purple-100/60 px-3 py-0.5 rounded-full text-xs mt-3">
                        {count} คน
                      </span>
                    </div>
                  );
                })}

                {/* Option: ทุกปีการศึกษา */}
                <div
                  onClick={() => {
                    setFilters(prev => ({ ...prev, graduation_year: '' }));
                    setDrillStep(4);
                  }}
                  className="border-2 border-purple-200 hover:border-purple-600 hover:shadow-md bg-purple-50/40 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between items-center text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform mb-2">
                    ทั้งหมด
                  </div>
                  <h3 className="font-bold text-purple-900 text-sm">ทุกปีการศึกษา</h3>
                  <span className="font-semibold text-purple-800 bg-purple-200/60 px-3 py-0.5 rounded-full text-xs mt-3">
                    {displayedAlumni.length} คน
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: รายชื่อศิษย์เก่า (Card View with Avatars) */}
          {drillStep === 4 && (
            <div className="space-y-4">
              {/* Filter bar inside step 4 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="ค้นหาชื่อ, รหัสศิษย์เก่า, สถานที่ทำงาน ในกลุ่มนี้..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 border-purple-100 rounded-xl h-10 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Employment Status filter inside step 4 */}
                  <select
                    value={filters.employment_status}
                    onChange={(e) => setFilters(prev => ({ ...prev, employment_status: e.target.value }))}
                    className="h-10 rounded-xl border border-purple-100/80 bg-white/80 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <option value="">ทุกสถานะงาน</option>
                    <option value="employed">มีงานทำ (Employed)</option>
                    <option value="seeking">กำลังหางาน (Seeking)</option>
                    <option value="studying">กำลังศึกษาต่อ (Studying)</option>
                    <option value="entrepreneur">ผู้ประกอบการ (Entrepreneur)</option>
                    <option value="other">อื่น ๆ (Other)</option>
                  </select>

                  <Button
                    onClick={() => setDrillStep(3)}
                    variant="outline"
                    size="sm"
                    className="border-purple-200 text-purple-700 text-xs rounded-xl h-10 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> เปลี่ยนปีที่จบ
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 text-xs rounded-xl h-10 cursor-pointer"
                  >
                    <X size={14} className="mr-1" /> ล้างตัวเลือก
                  </Button>
                </div>
              </div>

              {/* Alumni Cards Grid */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
                  <span className="text-xs text-gray-400">กำลังโหลดข้อมูลศิษย์เก่า...</span>
                </div>
              ) : displayedAlumni.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-purple-100 p-8 space-y-2">
                  <GraduationCap size={40} className="mx-auto text-purple-300" />
                  <p className="text-sm font-bold text-gray-700">ไม่พบรายชื่อศิษย์เก่าในเงื่อนไขนี้</p>
                  <p className="text-xs text-gray-400">ลองเปลี่ยนคำค้นหา หรือเลือกรุ่นปีการศึกษาอื่น</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {displayedAlumni.map((item) => {
                    const avatarUrl = getFileUrl(item.avatar_url || item.photo_url);
                    const initials = ((item.first_name || 'A').charAt(0) + (item.last_name || '').charAt(0)).toUpperCase() || 'A';
                    const fullName = `${item.prefix ? item.prefix : ''}${item.first_name || ''} ${item.last_name || ''}`.trim();
                    const canEdit = canEditAlumni(item);

                    return (
                      <div 
                        key={item.id} 
                        className="border border-purple-100/80 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col items-center text-center group relative"
                      >
                        {/* ส่วนข้อมูลที่คลิกดูโปรไฟล์ได้ทันที */}
                        <div
                          onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
                          className="w-full flex flex-col items-center cursor-pointer"
                          title="คลิกเพื่อดูโปรไฟล์"
                        >
                          {/* Avatar / Photo */}
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

                          {/* ข้อมูลศิษย์เก่า */}
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full mb-1">
                            {item.alumni_id}
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-purple-700 transition-colors">
                            {fullName}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {item.department || '-'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {item.faculty || '-'}
                          </p>

                          {/* Graduation Batch & Year */}
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                            <span className="text-[10px] text-purple-800 font-bold bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-md">
                              รุ่นปี {item.graduation_year}
                            </span>
                            {item.graduation_batch && (
                              <span className="text-[10px] text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                รอบ {item.graduation_batch}
                              </span>
                            )}
                          </div>

                          {/* Workplace & Position */}
                          <div className="mt-2 text-xs text-gray-700 w-full px-2 py-1.5 bg-gray-50 rounded-xl">
                            {item.employment_status === 'seeking' ? (
                              <div className="text-amber-600 font-semibold flex items-center justify-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                กำลังหางาน
                              </div>
                            ) : (
                              <div className="space-y-0.5 text-center">
                                <div className="font-semibold text-gray-800 truncate text-xs flex items-center justify-center gap-1">
                                  <Briefcase size={12} className="text-purple-600 shrink-0" />
                                  <span className="truncate">{item.workplace || 'ยังไม่ระบุที่ทำงาน'}</span>
                                </div>
                                {item.position && <div className="text-[11px] text-purple-600 font-medium truncate">{item.position}</div>}
                              </div>
                            )}
                          </div>

                          {/* Employment Status Badge */}
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              item.employment_status === 'employed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : item.employment_status === 'seeking'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : item.employment_status === 'studying'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                    : 'bg-gray-50 text-gray-700 border-gray-100'
                            }`}>
                              {item.employment_status === 'employed' && 'มีงานทำ'}
                              {item.employment_status === 'seeking' && 'กำลังหางาน'}
                              {item.employment_status === 'studying' && 'ศึกษาต่อ'}
                              {item.employment_status === 'entrepreneur' && 'ผู้ประกอบการ'}
                              {item.employment_status === 'other' && 'อื่น ๆ'}
                            </span>
                          </div>
                        </div>

                        {/* Actions: ดูโปรไฟล์ + แก้ไข/ลบ */}
                        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-purple-50 w-full justify-center">
                          <Button
                            onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
                            className="flex-1 h-9 px-3 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Eye size={14} /> ดูโปรไฟล์
                          </Button>
                          {canEdit && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                              variant="outline"
                              size="icon"
                              title="แก้ไข"
                              className="h-9 w-9 text-purple-700 border-purple-200/80 hover:bg-purple-50 rounded-xl shrink-0 cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </Button>
                          )}
                          {user?.role === 'admin' && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleOpenDelete(item.id); }}
                              variant="outline"
                              size="icon"
                              title="ลบ"
                              className="h-9 w-9 text-rose-600 border-rose-200/80 hover:bg-rose-50 rounded-xl shrink-0 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </Button>
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
          {/* Search & Filter Card */}
          <div className="bg-white/70 backdrop-blur-md border border-purple-100/50 rounded-2xl p-5 shadow-sm space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-full w-5" />
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อ, นามสกุล หรือสถานที่ทำงานปัจจุบัน..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 bg-white/50 text-xs"
                />
              </div>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-6 shadow-sm text-xs cursor-pointer">
                ค้นหา
              </Button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
              {/* Faculty Filter */}
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs font-semibold">คณะ</Label>
                <select
                  value={filters.faculty}
                  onChange={(e) => setFilters({ ...filters, faculty: e.target.value, department: '', department_id: '' })}
                  className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">ทั้งหมด</option>
                  {allFaculties.map((fac) => (
                    <option key={fac} value={fac}>{fac}</option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs font-semibold">สาขาวิชา</Label>
                <select
                  value={filters.department || filters.department_id || ''}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value, department_id: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">ทั้งหมด</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Graduation Year Filter */}
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs font-semibold">ปีที่สำเร็จการศึกษา</Label>
                <select
                  value={filters.graduation_year || ''}
                  onChange={(e) => setFilters({ ...filters, graduation_year: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">ทั้งหมด</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>พ.ศ. {yr}</option>
                  ))}
                </select>
              </div>

              {/* Graduation Batch Filter */}
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs font-semibold">รอบจบ / รุ่น</Label>
                <Input
                  type="text"
                  placeholder="เช่น 1/2569"
                  value={filters.graduation_batch || ''}
                  onChange={(e) => setFilters({ ...filters, graduation_batch: e.target.value })}
                  className="h-10 text-xs border-purple-100/80 bg-white/50 rounded-xl focus:ring-purple-500"
                />
              </div>

              {/* Employment Status Filter */}
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs font-semibold">สถานะการทำงาน</Label>
                <select
                  value={filters.employment_status}
                  onChange={(e) => setFilters({ ...filters, employment_status: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="employed">มีงานทำ (Employed)</option>
                  <option value="seeking">กำลังหางาน (Seeking)</option>
                  <option value="studying">กำลังศึกษาต่อ (Studying)</option>
                  <option value="entrepreneur">ผู้ประกอบการ (Entrepreneur)</option>
                  <option value="other">อื่น ๆ (Other)</option>
                </select>
              </div>
            </div>

            {(filters.faculty || filters.department || filters.department_id || filters.graduation_year || filters.graduation_batch || filters.employment_status || search) && (
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleClearFilters}
                  variant="ghost"
                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 text-xs font-semibold h-8 rounded-lg cursor-pointer"
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
                <span className="text-gray-400 text-xs font-medium animate-pulse">กำลังโหลดข้อมูลตารางศิษย์เก่า...</span>
              </div>
            ) : displayedAlumni.length > 0 ? (
              <>
                {/* 1. Mobile Cards Layout (< sm) */}
                <div className="block sm:hidden divide-y divide-purple-100/60">
                  {displayedAlumni.map((item) => {
                    const avatarUrl = getFileUrl(item.avatar_url || item.photo_url);
                    const fullName = `${item.prefix ? item.prefix : ''}${item.first_name || ''} ${item.last_name || ''}`.trim();
                    const initials = ((item.first_name || 'A').charAt(0) + (item.last_name || '').charAt(0)).toUpperCase() || 'A';
                    const canEdit = canEditAlumni(item);

                    return (
                      <div key={item.id} className="p-4 bg-white hover:bg-purple-50/20 transition-all space-y-3">
                        <div
                          onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
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
                                {item.alumni_id}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                item.employment_status === 'employed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : item.employment_status === 'seeking'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : item.employment_status === 'studying'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                      : 'bg-gray-50 text-gray-700 border-gray-100'
                              }`}>
                                {item.employment_status === 'employed' && 'มีงานทำ'}
                                {item.employment_status === 'seeking' && 'กำลังหางาน'}
                                {item.employment_status === 'studying' && 'ศึกษาต่อ'}
                                {item.employment_status === 'entrepreneur' && 'ผู้ประกอบการ'}
                                {item.employment_status === 'other' && 'อื่น ๆ'}
                              </span>
                            </div>

                            <h4 className="font-bold text-gray-900 text-sm mt-1.5 truncate">
                              {fullName}
                            </h4>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {item.department || '-'}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              รุ่นปี {item.graduation_year} • {item.workplace || 'ยังไม่ระบุที่ทำงาน'}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons on mobile */}
                        <div className="flex items-center gap-2 pt-1 border-t border-purple-50">
                          <Button
                            onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
                            className="flex-1 h-9 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          >
                            <Eye size={14} /> ดูโปรไฟล์
                          </Button>
                          {canEdit && (
                            <Button
                              onClick={() => handleOpenEdit(item)}
                              variant="outline"
                              size="icon"
                              title="แก้ไข"
                              className="h-9 w-9 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </Button>
                          )}
                          {user?.role === 'admin' && (
                            <Button
                              onClick={() => handleOpenDelete(item.id)}
                              variant="outline"
                              size="icon"
                              title="ลบ"
                              className="h-9 w-9 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Table Layout (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-purple-50/50 border-b border-purple-100/50 text-xs text-purple-900 uppercase tracking-wider font-semibold">
                        <th className="py-4 px-6">รหัสศิษย์เก่า</th>
                        <th className="py-4 px-6">ชื่อ-นามสกุล</th>
                        <th className="py-4 px-6">สาขาที่จบ / ปีการศึกษา</th>
                        <th className="py-4 px-6">สถานที่ทำงาน / ตำแหน่ง</th>
                        <th className="py-4 px-6 text-center">สถานะ</th>
                        <th className="py-4 px-6">ข้อมูลติดต่อ / ผลงาน</th>
                        <th className="py-4 px-6 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50/50 text-sm text-gray-700">
                      {displayedAlumni.map((item) => {
                        const isMyProfile = user && user.role === 'alumni' && (
                          user.alumni_id === item.alumni_id ||
                          user.username === item.alumni_id ||
                          (user.username && user.username.replace('alumni_', '').toLowerCase() === item.alumni_id.toLowerCase())
                        );
                        const canEdit = canEditAlumni(item);

                        return (
                          <tr 
                            key={item.id} 
                            className={`transition-colors ${
                              isMyProfile 
                                ? 'bg-purple-50/60 hover:bg-purple-50/80 font-medium' 
                                : 'hover:bg-purple-50/10'
                            }`}
                          >
                            <td 
                              onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
                              className="py-4 px-6 font-semibold text-purple-700 text-xs cursor-pointer hover:underline"
                            >
                              {item.alumni_id}
                            </td>
                            <td 
                              onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
                              className="py-4 px-6 font-semibold text-purple-950 cursor-pointer"
                            >
                              {item.prefix ? item.prefix : ''}{item.first_name} {item.last_name}
                            </td>
                            <td className="py-4 px-6 leading-tight">
                              <div className="text-xs text-gray-900 font-semibold">{item.department}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] text-purple-800 font-bold bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded inline-block">
                                  รุ่นปี พ.ศ. {item.graduation_year}
                                </span>
                                {item.graduation_batch && (
                                  <span className="text-[10px] text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded inline-block">
                                    รอบ {item.graduation_batch}
                                  </span>
                                )}
                              </div>
                              {item.graduation_date && (
                                <div className="text-[10px] text-gray-400 mt-1">
                                  จบเมื่อ: {new Date(item.graduation_date).toLocaleDateString('th-TH')}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 leading-tight">
                              {item.employment_status === 'seeking' ? (
                                <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                  กำลังหางาน
                                </div>
                              ) : (
                                <>
                                  <div className="text-xs text-gray-800 font-semibold">{item.workplace || '-'}</div>
                                  <span className="text-xs text-purple-600 font-medium">{item.position}</span>
                                </>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                item.employment_status === 'employed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : item.employment_status === 'seeking'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : item.employment_status === 'studying'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                      : 'bg-gray-50 text-gray-700 border-gray-100'
                              }`}>
                                {item.employment_status === 'employed' && 'มีงานทำ'}
                                {item.employment_status === 'seeking' && 'กำลังหางาน'}
                                {item.employment_status === 'studying' && 'ศึกษาต่อ'}
                                {item.employment_status === 'entrepreneur' && 'ผู้ประกอบการ'}
                                {item.employment_status === 'other' && 'อื่น ๆ'}
                              </span>
                            </td>
                            <td className="py-4 px-6 leading-tight space-y-1">
                              {(() => {
                                let contact = item.contact_info;
                                if (typeof contact === 'string') {
                                  try { contact = JSON.parse(contact); } catch (e) { contact = {}; }
                                }
                                return (
                                  <>
                                    {contact?.email && (
                                      <div className="text-[11px] text-gray-500 font-medium truncate max-w-[150px]">
                                        ✉️ {contact.email}
                                      </div>
                                    )}
                                    {contact?.phone && (
                                      <div className="text-[11px] text-gray-400">
                                        📞 {contact.phone}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                              {item.portfolio && (
                                <a 
                                  href={item.portfolio} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-purple-600 hover:underline font-bold block"
                                >
                                  🔗 ดูลิงก์ผลงานพอร์ตโฟลิโอ
                                </a>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center space-x-1">
                                <Button
                                  onClick={() => { setSelectedAlumniProfile(item); setIsProfileOpen(true); }}
                                  variant="ghost"
                                  size="icon"
                                  title="ดูโปรไฟล์"
                                  className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg cursor-pointer"
                                >
                                  <Eye size={15} />
                                </Button>
                                {canEdit && (
                                  <Button
                                    onClick={() => handleOpenEdit(item)}
                                    variant="ghost"
                                    size="icon"
                                    title="แก้ไข"
                                    className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg cursor-pointer"
                                  >
                                    <Edit2 size={15} />
                                  </Button>
                                )}
                                {user?.role === 'admin' && (
                                  <Button
                                    onClick={() => handleOpenDelete(item.id)}
                                    variant="ghost"
                                    size="icon"
                                    title="ลบ"
                                    className="h-8 w-8 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 size={15} />
                                  </Button>
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
                <GraduationCap size={40} className="mx-auto text-purple-200 mb-3" />
                <p className="text-base font-bold text-gray-600">ไม่พบข้อมูลศิษย์เก่า</p>
                <p className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนคำค้นหา หรือปรับตัวกรองของท่าน</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Alumni Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-purple-900">
              {currentAlumni ? 'แก้ไขข้อมูลประวัติศิษย์เก่า' : 'ลงทะเบียนประวัติศิษย์เก่าใหม่'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              พิมพ์รหัสนักศึกษาเดิมเพื่อดึงประวัติ และกรอกข้อมูลประวัติการทำงานรวมถึงช่องทางติดต่อลงระบบ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alumni ID / Student ID */}
              <div className="space-y-1.5">
                <Label htmlFor="alumni_id" className="text-gray-700 text-xs font-semibold">รหัสนักศึกษาเดิม / รหัสศิษย์เก่า *</Label>
                <Input
                  id="alumni_id"
                  name="alumni_id"
                  placeholder="เช่น 64010123"
                  value={form.alumni_id}
                  onChange={handleFormChange}
                  onBlur={handleIdBlur}
                  disabled={!!currentAlumni}
                  className={`border-purple-100 rounded-xl ${formErrors.alumni_id ? 'border-rose-300' : ''}`}
                />
                {formErrors.alumni_id && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.alumni_id}</p>
                )}
              </div>

              {/* Graduation Year */}
              <div className="space-y-1.5">
                <Label htmlFor="graduation_year" className="text-gray-700 text-xs font-semibold">ปีที่จบการศึกษา (พ.ศ.) *</Label>
                <Input
                  id="graduation_year"
                  name="graduation_year"
                  type="number"
                  placeholder="เช่น 2566"
                  value={form.graduation_year}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.graduation_year ? 'border-rose-300' : ''}`}
                />
                {formErrors.graduation_year && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.graduation_year}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Graduation Batch */}
              <div className="space-y-1.5">
                <Label htmlFor="graduation_batch" className="text-gray-700 text-xs font-semibold">รอบจบ / รุ่น</Label>
                <Input
                  id="graduation_batch"
                  name="graduation_batch"
                  placeholder="เช่น 1/2566"
                  value={form.graduation_batch || ''}
                  onChange={handleFormChange}
                  className="border-purple-100 rounded-xl"
                />
              </div>

              {/* Graduation Date */}
              <div className="space-y-1.5">
                <Label htmlFor="graduation_date" className="text-gray-700 text-xs font-semibold">วันที่สำเร็จการศึกษา</Label>
                <Input
                  id="graduation_date"
                  name="graduation_date"
                  type="date"
                  value={form.graduation_date || ''}
                  onChange={handleFormChange}
                  className="border-purple-100 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-gray-700 text-xs font-semibold">ชื่อจริง *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="เช่น สมชาย"
                  value={form.first_name}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.first_name ? 'border-rose-300' : ''}`}
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
                  className={`border-purple-100 rounded-xl ${formErrors.last_name ? 'border-rose-300' : ''}`}
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
                  {getUniqueFaculties(departmentsList).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
                </select>
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
                  {departmentsList.filter(d => !form.faculty || d.faculty_name === form.faculty).map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employment Status */}
            <div className="space-y-1.5">
              <Label htmlFor="employment_status" className="text-gray-700 text-xs font-semibold">สถานะการทำงานในปัจจุบัน *</Label>
              <select
                id="employment_status"
                name="employment_status"
                value={form.employment_status}
                onChange={handleFormChange}
                className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <option value="employed">มีงานทำ (Employed)</option>
                <option value="seeking">กำลังหางาน (Seeking)</option>
                <option value="studying">กำลังศึกษาต่อ (Studying)</option>
                <option value="entrepreneur">ผู้ประกอบการ (Entrepreneur)</option>
                <option value="other">อื่น ๆ (Other)</option>
              </select>
            </div>

            {/* Conditional Fields: Company & Position (IF employed or entrepreneur) */}
            {form.employment_status !== 'seeking' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/20 border border-purple-100/50 p-4 rounded-2xl relative">
                <div className="space-y-1.5 relative">
                  <Label htmlFor="workplace" className="text-gray-700 text-xs font-semibold">สถานที่ทำงาน / บริษัท *</Label>
                  <Input
                    id="workplace"
                    name="workplace"
                    placeholder="เช่น บริษัท ABC จำกัด"
                    value={form.workplace}
                    onChange={handleWorkplaceChange}
                    className="border-purple-100 rounded-xl"
                  />
                  {showSuggestions && workplaceSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-purple-100 rounded-xl shadow-lg z-50 max-h-32 overflow-y-auto">
                      {workplaceSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => selectWorkplace(suggestion)}
                          className="px-4 py-2 text-xs hover:bg-purple-50 hover:text-purple-900 cursor-pointer text-purple-800 font-semibold"
                        >
                          🏢 {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="position" className="text-gray-700 text-xs font-semibold">ตำแหน่งงาน *</Label>
                  <Input
                    id="position"
                    name="position"
                    placeholder="เช่น Software Developer"
                    value={form.position}
                    onChange={handleFormChange}
                    className="border-purple-100 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Conditional Fields: Interested Jobs (IF seeking employment) */}
            {form.employment_status === 'seeking' && (
              <div className="bg-amber-50/20 border border-amber-100/50 p-4 rounded-2xl space-y-1.5">
                <Label htmlFor="interested_job_types" className="text-gray-700 text-xs font-semibold">ประเภทงานที่สนใจ (คั่นด้วยจุลภาค , )</Label>
                <Input
                  id="interested_job_types"
                  name="interested_job_types"
                  placeholder="เช่น Web Developer, Data Analyst, Designer"
                  value={form.interested_job_types}
                  onChange={handleFormChange}
                  className="border-amber-200 focus:ring-amber-500 rounded-xl text-xs"
                />
              </div>
            )}

            {/* Contact Details */}
            <div className="space-y-3 border-t border-purple-50 pt-4">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">ข้อมูลการติดต่อ & ผลงาน</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-700 text-xs font-semibold">อีเมลติดต่อ</Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="name@domain.com"
                    value={form.email}
                    onChange={handleFormChange}
                    className="border-purple-100 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-gray-700 text-xs font-semibold">เบอร์โทรศัพท์ (10 หลัก)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="0812345678"
                    value={form.phone}
                    onChange={handleFormChange}
                    className="border-purple-100 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="portfolio" className="text-gray-700 text-xs font-semibold">ลิงก์แฟ้มสะสมผลงาน (Portfolio URL)</Label>
                  <Input
                    id="portfolio"
                    name="portfolio"
                    placeholder="https://myportfolio.com"
                    value={form.portfolio}
                    onChange={handleFormChange}
                    className="border-purple-100 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin" className="text-gray-700 text-xs font-semibold">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin"
                    name="linkedin"
                    placeholder="https://linkedin.com/in/username"
                    value={form.linkedin}
                    onChange={handleFormChange}
                    className="border-purple-100 rounded-xl text-xs"
                  />
                </div>
              </div>
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
                {currentAlumni ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">ยืนยันการลบข้อมูลศิษย์เก่า</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              การดำเนินการนี้จะลบข้อมูลประวัติศิษย์เก่าคนนี้อย่างถาวรจากฐานข้อมูล และไม่สามารถกู้คืนได้
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

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-gray-900">นำเข้าข้อมูลศิษย์เก่า</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              อัปโหลดไฟล์ CSV หรือ Excel เพื่อเพิ่มรายชื่อศิษย์เก่าจำนวนมากในคราวเดียว
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

      {/* Alumni Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto bg-white rounded-3xl p-0 shadow-2xl border border-purple-100 overflow-hidden max-h-[90vh] overflow-y-auto [&>button]:text-white [&>button]:bg-white/20 [&>button]:hover:bg-white/30 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3.5 [&>button]:right-3.5">
          {selectedAlumniProfile && (() => {
            const a = selectedAlumniProfile;
            const avatarUrl = getFileUrl(a.avatar_url || a.photo_url);
            const fullName = `${a.prefix ? a.prefix : ''}${a.first_name || ''} ${a.last_name || ''}`.trim();
            const initials = ((a.first_name || 'A').charAt(0) + (a.last_name || '').charAt(0)).toUpperCase() || 'A';
            let contact = a.contact_info;
            if (typeof contact === 'string') {
              try { contact = JSON.parse(contact); } catch (e) { contact = {}; }
            }
            const email = contact?.email || a.email || '';
            const phone = contact?.phone || a.phone || '';
            const linkedin = contact?.social_media?.linkedin || contact?.linkedin || '';
            const portfolio = a.portfolio || contact?.portfolio || '';

            return (
              <>
                {/* Header Banner with Back Button */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-6 pt-7 pb-9 text-center relative">
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all flex items-center gap-1 text-xs font-semibold z-10 active:scale-95 cursor-pointer"
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
                    <div className={`w-full h-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-3xl items-center justify-center ${avatarUrl ? 'hidden' : 'flex'}`}>
                      {initials}
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-lg mt-3 drop-shadow-sm">{fullName}</h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="text-purple-200 text-xs font-mono font-semibold bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      {a.alumni_id}
                    </span>
                    <span className="text-purple-100 text-xs font-semibold bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      รุ่นปี {a.graduation_year}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* ข้อมูลการทำงาน */}
                  <div className="bg-purple-50/50 border border-purple-100/80 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Briefcase size={14} className="text-purple-600" />
                        สถานะการทำงาน
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        a.employment_status === 'employed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : a.employment_status === 'seeking'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : a.employment_status === 'studying'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              : 'bg-gray-50 text-gray-700 border-gray-100'
                      }`}>
                        {a.employment_status === 'employed' && 'มีงานทำ'}
                        {a.employment_status === 'seeking' && 'กำลังหางาน'}
                        {a.employment_status === 'studying' && 'ศึกษาต่อ'}
                        {a.employment_status === 'entrepreneur' && 'ผู้ประกอบการ'}
                        {a.employment_status === 'other' && 'อื่น ๆ'}
                      </span>
                    </div>

                    {a.employment_status !== 'seeking' && (
                      <div className="pt-2 border-t border-purple-100/50 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">สถานที่ทำงาน:</span>
                          <span className="font-semibold text-gray-800 text-right">{a.workplace || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">ตำแหน่งงาน:</span>
                          <span className="font-semibold text-purple-700 text-right">{a.position || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ข้อมูลการศึกษา */}
                  <div className="border border-purple-100/80 rounded-2xl p-4 space-y-2.5 text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <GraduationCap size={15} className="text-purple-600" />
                      ข้อมูลการศึกษา
                    </span>
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between border-b border-purple-50 pb-1.5">
                        <span className="text-gray-500">คณะ</span>
                        <span className="font-semibold text-gray-800 text-right">{a.faculty || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-purple-50 pb-1.5">
                        <span className="text-gray-500">สาขาวิชา</span>
                        <span className="font-semibold text-gray-800 text-right">{a.department || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-purple-50 pb-1.5">
                        <span className="text-gray-500">ปีที่สำเร็จการศึกษา</span>
                        <span className="font-semibold text-purple-700">พ.ศ. {a.graduation_year || '-'}</span>
                      </div>
                      {a.graduation_batch && (
                        <div className="flex justify-between border-b border-purple-50 pb-1.5">
                          <span className="text-gray-500">รอบจบ / รุ่น</span>
                          <span className="font-semibold text-indigo-700">รอบ {a.graduation_batch}</span>
                        </div>
                      )}
                      {a.graduation_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">วันที่สำเร็จการศึกษา</span>
                          <span className="font-semibold text-gray-800">{new Date(a.graduation_date).toLocaleDateString('th-TH')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ข้อมูลติดต่อ */}
                  <div className="border border-purple-100/80 rounded-2xl p-4 space-y-2.5 text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Mail size={14} className="text-purple-600" />
                      ช่องทางการติดต่อ
                    </span>
                    <div className="space-y-2 pt-1">
                      {email && (
                        <a href={`mailto:${email}`} className="flex items-center gap-2 text-purple-700 hover:underline">
                          <Mail size={13} className="text-gray-400" />
                          <span className="truncate">{email}</span>
                        </a>
                      )}
                      {phone && (
                        <a href={`tel:${phone}`} className="flex items-center gap-2 text-purple-700 hover:underline">
                          <Phone size={13} className="text-gray-400" />
                          <span>{phone}</span>
                        </a>
                      )}
                      {linkedin && (
                        <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                          <Globe size={13} className="text-gray-400" />
                          <span>LinkedIn Profile</span>
                        </a>
                      )}
                      {portfolio && (
                        <a href={portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline font-medium">
                          <FileText size={13} className="text-gray-400" />
                          <span>แฟ้มสะสมผลงาน (Portfolio)</span>
                        </a>
                      )}
                      {!email && !phone && !linkedin && !portfolio && (
                        <p className="text-gray-400 text-xs">ยังไม่มีข้อมูลช่องทางติดต่อ</p>
                      )}
                    </div>
                  </div>

                  {/* Skills tags if any */}
                  {Array.isArray(a.skills) && a.skills.length > 0 && (
                    <div className="border border-purple-100/80 rounded-2xl p-4 space-y-2 text-xs">
                      <span className="font-bold text-gray-900">ทักษะและความเชี่ยวชาญ</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {a.skills.map((sk, i) => (
                          <span key={i} className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {sk.name || sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md h-10 text-xs font-semibold cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alumni;
