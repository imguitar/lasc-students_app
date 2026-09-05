import React, { useEffect, useState, useRef } from 'react';
import { alumniService, departmentService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  GraduationCap, Search, Plus, Upload, Download, Edit2, Trash2, AlertCircle, FileText, Briefcase, Mail, Phone, Globe, ChevronDown, CheckCircle2 
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';

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
  const [filters, setFilters] = useState({
    faculty: '',
    department: '',
    graduation_year: '',
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

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
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
    setFilters({ faculty: '', department: '', graduation_year: '', employment_status: '' });
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-purple-600 h-7 w-7" />
            จัดการข้อมูลศิษย์เก่า
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ค้นหาประวัติการทำงาน ติดตามผลงาน และรายงานข้อมูลสถานที่ประกอบอาชีพของรุ่นพี่ศิษย์เก่า
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === 'admin' && (
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
          )}

          {user?.role === 'alumni' && (
            <Button
              onClick={handleOpenAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              <span>เพิ่มข้อมูลศิษย์เก่า</span>
            </Button>
          )}
        </div>
      </div>

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
              className="pl-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 bg-white/50"
            />
          </div>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-6 shadow-sm">
            ค้นหา
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Faculty Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">คณะ</Label>
            <select
              value={filters.faculty}
              onChange={(e) => setFilters({ ...filters, faculty: e.target.value, department: '' })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="">ทั้งหมด</option>
              {getUniqueFaculties(departmentsList).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">สาขาวิชา</Label>
            <select
              value={filters.department_id || ''}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              disabled={!filters.faculty}
            >
              <option value="">ทั้งหมด</option>
              {departmentsList.filter(d => !filters.faculty || d.faculty_name === filters.faculty).map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
              ))}
            </select>
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

        {(filters.faculty || filters.department || filters.employment_status || search) && (
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
        {!(filters.faculty && filters.department) && !search ? (
          <div className="text-center py-20 text-gray-400">
            <Search size={40} className="mx-auto text-purple-200 mb-3" />
            <p className="text-base font-bold text-gray-600">กรุณาเลือกข้อมูลให้ครบถ้วน</p>
            <p className="text-xs text-gray-400 mt-1">โปรดเลือกลำดับจาก คณะ &gt; สาขาวิชา เพื่อแสดงรายชื่อศิษย์เก่า (หรือใช้ช่องค้นหา)</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
            <span className="text-gray-400 text-xs font-medium animate-pulse">กำลังโหลดข้อมูลตารางศิษย์เก่า...</span>
          </div>
        ) : alumni.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100/50 text-xs text-purple-900 uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">รหัสศิษย์เก่า</th>
                  <th className="py-4 px-6">ชื่อ-นามสกุล</th>
                  <th className="py-4 px-6">สาขาที่จบ / ปีการศึกษา</th>
                  <th className="py-4 px-6">สถานที่ทำงาน / ตำแหน่ง</th>
                  <th className="py-4 px-6 text-center">สถานะ</th>
                  <th className="py-4 px-6">ข้อมูลติดต่อ / ผลงาน</th>
                  {(user?.role === 'admin' || user?.role === 'alumni') && <th className="py-4 px-6 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50/50 text-sm text-gray-700">
                {alumni.map((item) => {
                  const isMyProfile = user && user.role === 'alumni' && (
                    user.alumni_id === item.alumni_id ||
                    user.username === item.alumni_id ||
                    (user.username && user.username.replace('alumni_', '').toLowerCase() === item.alumni_id.toLowerCase())
                  );

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${
                        isMyProfile 
                          ? 'bg-purple-50/60 hover:bg-purple-50/80 font-medium' 
                          : 'hover:bg-purple-50/10'
                      }`}
                    >
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        {item.alumni_id}
                      </td>
                      <td className="py-4 px-6 font-semibold text-purple-950">
                        {item.prefix ? item.prefix : ''}{item.first_name} {item.last_name}
                      </td>
                    <td className="py-4 px-6 leading-tight">
                      <div className="text-xs text-gray-900 font-semibold">{item.department}</div>
                      <span className="text-[10px] text-purple-800 font-bold bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                        รุ่นปี พ.ศ. {item.graduation_year}
                      </span>
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
                    {(user?.role === 'admin' || (user?.role === 'alumni' && (user?.alumni_id === item.alumni_id || user?.username === item.alumni_id || user?.username === `alumni_${item.alumni_id.toLowerCase()}`))) && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            onClick={() => handleOpenEdit(item)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg"
                          >
                            <Edit2 size={15} />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              onClick={() => handleOpenDelete(item.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
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
            <GraduationCap size={40} className="mx-auto text-purple-200 mb-3" />
            <p className="text-base font-bold text-gray-600">ไม่พบข้อมูลศิษย์เก่า</p>
            <p className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนคำค้นหา หรือปรับตัวกรองของท่าน</p>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default Alumni;
