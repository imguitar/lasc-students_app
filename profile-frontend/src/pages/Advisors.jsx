import React, { useEffect, useState } from 'react';
import { advisorService, departmentService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  UserCircle, Search, Plus, Upload, Download, Edit2, Trash2, AlertCircle, Mail, Phone, BookOpen, Star, ChevronDown, CheckCircle2, Bot
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';
import AITrackAdvisorModal from '../components/AITrackAdvisorModal';

const getUniqueFaculties = (departmentsList) => {
  const faculties = new Set(departmentsList.map(d => d.faculty_name).filter(Boolean));
  return Array.from(faculties);
};
const Advisors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentsList, setDepartmentsList] = useState([]);
  const [filters, setFilters] = useState({
    faculty: '',
    department_id: '',
    isActive: ''
  });

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showAITrack, setShowAITrack] = useState(false);
  const [currentAdvisor, setCurrentAdvisor] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [file, setFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  // Form states
  const [form, setForm] = useState({
    advisor_id: '',
    name: '',
    faculty: '',
    department: '',
    email: '',
    phone: '',
    specialization: '', // Comma separated in input
    isActive: true
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchDepartments();
    fetchAdvisors();
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

  const fetchAdvisors = async () => {
    setLoading(true);
    try {
      const response = await advisorService.getAll(filters);
      if (response.success) {
        // Apply client side search filter
        let data = response.data;
        if (search) {
          data = data.filter(adv => 
            adv.name.toLowerCase().includes(search.toLowerCase()) ||
            adv.advisor_id.includes(search) ||
            adv.specialization?.some(s => s.toLowerCase().includes(search.toLowerCase()))
          );
        }
        setAdvisors(data);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลอาจารย์ที่ปรึกษาได้"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdvisors();
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ faculty: '', department_id: '', isActive: '' });
  };

  // Validations
  const validateForm = () => {
    const errors = {};

    if (!form.advisor_id) errors.advisor_id = 'กรุณากรอกรหัสประจำตัวอาจารย์';
    if (!form.name || form.name.length < 3) errors.name = 'กรุณากรอกชื่อ-นามสกุลอาจารย์';
    if (!form.faculty) errors.faculty = 'กรุณาเลือกคณะ';
    if (!form.department) errors.department = 'กรุณาเลือกสาขาวิชา';
    if (!form.email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email)) {
      errors.email = 'อีเมลไม่ถูกต้อง';
    }
    if (form.phone && !/^0\d{9}$/.test(form.phone)) {
      errors.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }

    if (name === 'faculty') {
      setForm({ ...form, faculty: value, department: '' });
    } else {
      setForm({ ...form, [name]: val });
    }
  };

  const handleOpenAdd = async () => {
    setCurrentAdvisor(null);
    setForm({
      advisor_id: 'กำลังรันรหัส...',
      name: '',
      faculty: '',
      department: '',
      email: '',
      phone: '',
      specialization: '',
      isActive: true
    });
    setFormErrors({});
    setIsAddEditOpen(true);

    try {
      const response = await advisorService.generateNextId();
      if (response.success) {
        setForm(prev => ({ ...prev, advisor_id: response.nextId }));
      } else {
        setForm(prev => ({ ...prev, advisor_id: '' }));
      }
    } catch (error) {
      console.error('Error fetching next advisor ID:', error);
      setForm(prev => ({ ...prev, advisor_id: '' }));
    }
  };

  const handleOpenEdit = (advisor) => {
    setCurrentAdvisor(advisor);
    setForm({
      advisor_id: advisor.advisor_id,
      name: advisor.name,
      faculty: advisor.faculty,
      department: advisor.department,
      email: advisor.email,
      phone: advisor.phone || '',
      specialization: advisor.specialization?.join(', ') || '',
      isActive: advisor.isActive
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedData = {
      ...form,
      department: (departmentsList.find(d => d.department_id === form.department)?.department_name) || form.department,
      department_id: form.department,
      specialization: form.specialization.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      let response;
      if (currentAdvisor) {
        response = await advisorService.update(currentAdvisor.id, formattedData);
      } else {
        response = await advisorService.create(formattedData);
      }

      if (response.success) {
        toast({
          title: currentAdvisor ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มอาจารย์สำเร็จ",
          description: response.message || "บันทึกข้อมูลอาจารย์สำเร็จเรียบร้อยแล้ว"
        });
        setIsAddEditOpen(false);
        fetchAdvisors();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        description: error.response?.data?.message || "โปรดตรวจสอบรหัสประจำตัวอาจารย์ซ้ำในระบบ"
      });
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await advisorService.delete(deleteId);
      if (response.success) {
        toast({
          title: "ลบข้อมูลอาจารย์สำเร็จ",
          description: "ลบประวัติอาจารย์ออกจากระบบแล้ว"
        });
        setIsDeleteOpen(false);
        fetchAdvisors();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้"
      });
    }
  };

  // Download template
  const handleDownloadTemplate = async (format) => {
    try {
      const response = await api.get('/data/template/advisors', {
        params: { format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `เทมเพลต_อาจารย์.${format}`);
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
      const response = await api.post('/data/import/advisors', formData, {
        headers: { 'Content-Type': undefined }
      });

      if (response.data.success) {
        setImportResults(response.data.data);
        toast({
          title: "นำเข้าข้อมูลเสร็จสิ้น",
          description: `นำเข้าสำเร็จ ${response.data.data.successCount} รายการ, ล้มเหลว ${response.data.data.errorCount} รายการ`
        });
        fetchAdvisors();
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
            <UserCircle className="text-purple-600 h-7 w-7" />
            จัดการข้อมูลอาจารย์ที่ปรึกษา
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ลงทะเบียนข้อมูลอาจารย์ ค้นหาตามสาขาวิชา และระบุความเชี่ยวชาญเพื่อจัดคู่โครงการวิจัย
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setShowAITrack(true)}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl flex items-center gap-1.5 h-10 shadow-sm"
            >
              <Bot size={16} />
              <span>AI Track</span>
            </Button>
            <Button
              onClick={() => setIsImportOpen(true)}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl flex items-center gap-1.5 h-10 shadow-sm"
            >
              <Upload size={16} />
              <span>นำเข้าข้อมูล</span>
            </Button>
            <Button
              onClick={handleOpenAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
            >
              <Plus size={18} />
              <span>เพิ่มอาจารย์</span>
            </Button>
          </div>
        )}
      </div>

      {/* Search & Filter Card */}
      <div className="bg-white/70 backdrop-blur-md border border-purple-100/50 rounded-2xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 h-full w-5" />
            <Input
              type="text"
              placeholder="ค้นหาชื่ออาจารย์, รหัสประจำตัว หรือความเชี่ยวชาญเฉพาะทาง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 bg-white/50"
            />
          </div>
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-6 shadow-sm">
            ค้นหา
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {/* Faculty Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">คณะ</Label>
            <select
              value={filters.faculty}
              onChange={(e) => setFilters({ ...filters, faculty: e.target.value, department_id: '' })}
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
            <Label className="text-gray-500 text-xs font-semibold">สาขาวิชา/ภาควิชา</Label>
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

          {/* Status Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">สถานะการปฏิบัติงาน</Label>
            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="true">ปฏิบัติงานอยู่ (Active)</option>
              <option value="false">ไม่ปฏิบัติงาน (Inactive)</option>
            </select>
          </div>
        </div>

        {(filters.faculty || filters.department || filters.isActive || search) && (
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
            <span className="text-gray-400 text-xs font-medium animate-pulse">กำลังโหลดข้อมูลอาจารย์...</span>
          </div>
        ) : advisors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100/50 text-xs text-purple-900 uppercase tracking-wider font-semibold">
                  <th className="py-4 px-6">รหัสประจำตัว</th>
                  <th className="py-4 px-6">ชื่อ-นามสกุล</th>
                  <th className="py-4 px-6">สังกัดคณะ / ภาควิชา</th>
                  <th className="py-4 px-6">ความเชี่ยวชาญ (Specialization)</th>
                  <th className="py-4 px-6">ข้อมูลติดต่อ</th>
                  <th className="py-4 px-6 text-center">สถานะ</th>
                  {user?.role === 'admin' && <th className="py-4 px-6 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50/50 text-sm text-gray-700">
                {advisors.map((adv) => (
                  <tr key={adv.id} className="hover:bg-purple-50/10 transition-colors">
                    <td className="py-4 px-6 font-semibold text-gray-900">{adv.advisor_id}</td>
                    <td className="py-4 px-6 font-medium">
                      {adv.name}
                    </td>
                    <td className="py-4 px-6 leading-tight">
                      <div className="text-xs text-gray-900 font-semibold">{adv.faculty}</div>
                      <span className="text-xs text-gray-400 font-medium">{adv.department}</span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      {adv.specialization?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {adv.specialization.map((spec, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-100/50">
                              <Star size={8} className="mr-1 text-amber-500 fill-amber-500" />
                              {spec}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">ไม่ระบุความเชี่ยวชาญ</span>
                      )}
                    </td>
                    <td className="py-4 px-6 leading-tight space-y-1">
                      <div className="text-xs text-gray-500 font-medium">✉️ {adv.email}</div>
                      {adv.phone && (
                        <div className="text-xs text-gray-400 font-medium">📞 {adv.phone}</div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        adv.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>
                        {adv.isActive ? 'ปฏิบัติงานปกติ' : 'พักการปฏิบัติงาน'}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            onClick={() => handleOpenEdit(adv)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg"
                          >
                            <Edit2 size={15} />
                          </Button>
                          <Button
                            onClick={() => handleOpenDelete(adv.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <UserCircle size={40} className="mx-auto text-purple-200 mb-3" />
            <p className="text-base font-bold text-gray-600">ไม่พบข้อมูลอาจารย์</p>
            <p className="text-xs text-gray-400 mt-1">กรุณาลองปรับเปลี่ยนตัวกรองข้อมูล หรือคำค้นหา</p>
          </div>
        )}
      </div>

      {/* Add / Edit Advisor Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-purple-900">
              {currentAdvisor ? 'แก้ไขข้อมูลอาจารย์ที่ปรึกษา' : 'เพิ่มข้อมูลอาจารย์ใหม่'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              กรอกข้อมูลเพื่อลงทะเบียนอาจารย์ที่ปรึกษาลงสู่ระบบจัดฐานข้อมูล
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Advisor ID */}
              <div className="space-y-1.5">
                <Label htmlFor="advisor_id" className="text-gray-700 text-xs font-semibold">รหัสประจำตัวอาจารย์ *</Label>
                <Input
                  id="advisor_id"
                  name="advisor_id"
                  placeholder="เช่น ADV001"
                  value={form.advisor_id}
                  onChange={handleFormChange}
                  disabled={!!currentAdvisor}
                  className={`border-purple-100 rounded-xl ${formErrors.advisor_id ? 'border-rose-300' : ''}`}
                />
                {!currentAdvisor && (
                  <p className="text-[10px] text-purple-600 font-medium">✨ ระบบรันรหัสอัตโนมัติต่อจากรหัสล่าสุดในระบบให้แล้ว (คุณสามารถแก้ไขได้)</p>
                )}
                {formErrors.advisor_id && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.advisor_id}</p>
                )}
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-gray-700 text-xs font-semibold">ชื่อ-นามสกุล (พร้อมคำนำหน้า) *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="เช่น ผศ.ดร.สมเกียรติ ยอดเยี่ยม"
                  value={form.name}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.name ? 'border-rose-300' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Faculty */}
              <div className="space-y-1.5">
                <Label htmlFor="faculty" className="text-gray-700 text-xs font-semibold">คณะที่สังกัด *</Label>
                <select
                  id="faculty"
                  name="faculty"
                  value={form.faculty}
                  onChange={handleFormChange}
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none ${formErrors.faculty ? 'border-rose-300' : 'border-purple-100'}`}
                >
                  <option value="">เลือกคณะ</option>
                  {getUniqueFaculties(departmentsList).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-gray-700 text-xs font-semibold">ภาควิชา / สาขาวิชา *</Label>
                <select
                  id="department"
                  name="department"
                  value={form.department}
                  onChange={handleFormChange}
                  disabled={!form.faculty}
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none ${formErrors.department ? 'border-rose-300' : 'border-purple-100'}`}
                >
                  <option value="">เลือกภาควิชา</option>
                  {departmentsList.filter(d => !form.faculty || d.faculty_name === form.faculty).map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 text-xs font-semibold">อีเมลติดต่อ *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="เช่น advisor@university.ac.th"
                  value={form.email}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.email ? 'border-rose-300' : ''}`}
                />
                {formErrors.email && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-gray-700 text-xs font-semibold">เบอร์โทรศัพท์ติดต่อ (10 หลัก)</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="เช่น 0812345678"
                  value={form.phone}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.phone ? 'border-rose-300' : ''}`}
                />
                {formErrors.phone && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <Label htmlFor="specialization" className="text-gray-700 text-xs font-semibold">ความเชี่ยวชาญเฉพาะทาง (คั่นด้วยเครื่องหมายจุลภาค , )</Label>
              <Input
                id="specialization"
                name="specialization"
                placeholder="เช่น Artificial Intelligence, Machine Learning, Data Analytics"
                value={form.specialization}
                onChange={handleFormChange}
                className="border-purple-100 rounded-xl text-xs"
              />
            </div>

            {/* IsActive status */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={form.isActive}
                onChange={handleFormChange}
                className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="isActive" className="text-gray-800 text-xs font-bold cursor-pointer">เปิดการทำหน้าที่ปฏิบัติงานปกติ (Active Status)</Label>
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
                {currentAdvisor ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">ยืนยันการลบประวัติอาจารย์</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              การกระทำนี้จะลบข้อมูลอาจารย์ที่ปรึกษาคนนี้อย่างถาวรจากฐานข้อมูล และไม่สามารถกู้คืนกลับมาได้
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
            <DialogTitle className="text-lg font-bold text-gray-900">นำเข้าข้อมูลอาจารย์ที่ปรึกษา</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              อัปโหลดไฟล์ CSV หรือ Excel เพื่อเพิ่มรายชื่ออาจารย์จำนวนมากในคราวเดียว
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

      {/* AI Track Modal */}
      {showAITrack && (
        <AITrackAdvisorModal
          onClose={() => setShowAITrack(false)}
          onImport={() => {
            setShowAITrack(false);
            fetchAdvisors();
          }}
        />
      )}
    </div>
  );
};

export default Advisors;
