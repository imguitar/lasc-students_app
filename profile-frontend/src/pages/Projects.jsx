import React, { useEffect, useState, useRef } from 'react';
import { projectService, advisorService, studentService, facultyService, departmentService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  FolderKanban, Search, Plus, Download, Edit2, Trash2, AlertCircle, FileText, CheckCircle2, ChevronDown, User, Users, UserRound, Award, Tag, BookOpen, ExternalLink, Calendar
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';
import { Card } from '../components/ui/card';

export const PROJECT_STATUSES = [
  { value: 'draft', label: 'แบบร่าง', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'approved', label: 'อนุมัติหัวข้อแล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'in_progress', label: 'กำลังดำเนินการ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'waiting_defense', label: 'รอสอบความก้าวหน้า/สอบจบ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'passed_defense', label: 'ผ่านการสอบแล้ว', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'completed', label: 'เสร็จสมบูรณ์', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

export const getStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'draft') return { label: 'แบบร่าง', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (s === 'approved') return { label: 'อนุมัติหัวข้อแล้ว', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'in_progress') return { label: 'กำลังดำเนินการ', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (s === 'waiting_defense') return { label: 'รอสอบความก้าวหน้า/สอบจบ', className: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (s === 'passed_defense') return { label: 'ผ่านการสอบแล้ว', className: 'bg-teal-50 text-teal-700 border-teal-200' };
  if (s === 'completed') return { label: 'เสร็จสมบูรณ์', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: status || 'แบบร่าง', className: 'bg-gray-100 text-gray-700 border-gray-200' };
};

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [facultiesList, setFacultiesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [filterDepartmentsList, setFilterDepartmentsList] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    faculty: '',
    department: '',
    year: '',
    status: '',
    has_award: ''
  });

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Details Modal States
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Form states
  const [form, setForm] = useState({
    project_id: '',
    title_th: '',
    title_en: '',
    description: '',
    advisor: '',
    year: '',
    project_type: 'Group', // Default Group
    document_url: '',
    tags: '',
    status: 'Draft',
    faculty: '',
    department: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Members autocomplete states
  const [memberSearch, setMemberSearch] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'advisor' || user.role === 'teacher')) {
      setFilters(prev => ({
        ...prev,
        faculty: user.faculty || '',
        department: user.department || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const res = await facultyService.getAll();
      if (res.success) {
        setFacultiesList(res.data);
      }
    } catch (err) {
      console.error('Error fetching faculties:', err);
    }
  };

  useEffect(() => {
    if (filters.faculty) {
      fetchFilterDepartments(filters.faculty);
    } else {
      setFilterDepartmentsList([]);
    }
  }, [filters.faculty]);

  const fetchFilterDepartments = async (faculty_id) => {
    try {
      const res = await departmentService.getAll({ faculty_id });
      if (res.success) {
        setFilterDepartmentsList(res.data);
      }
    } catch (err) {
      console.error('Error fetching filter departments:', err);
    }
  };

  useEffect(() => {
    if (form.faculty) {
      fetchDepartments(form.faculty);
    } else {
      setDepartmentsList([]);
      setForm(prev => ({ ...prev, department: '', advisor: '' }));
    }
  }, [form.faculty]);

  const fetchDepartments = async (faculty_id) => {
    try {
      const res = await departmentService.getAll({ faculty_id });
      if (res.success) {
        setDepartmentsList(res.data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    if (form.faculty && form.department) {
      fetchAdvisors(form.faculty, form.department);
    } else {
      setAdvisors([]);
      setForm(prev => ({ ...prev, advisor: '' }));
    }
  }, [form.faculty, form.department]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (search) params.search = search;
      const response = await projectService.getAll(params);
      if (response.success) {
        let fetchedProjects = response.data;
        
        // Sort: if user is student or alumni, move projects where user is a member to the top
        if (user && (user.role === 'student' || user.role === 'alumni')) {
          const checkIsMyProject = (project) => {
            return project.members?.some(m => {
              if (user.role === 'student') {
                return m.student_id === user.username;
              } else if (user.role === 'alumni') {
                return m.student_id.toLowerCase() === user.username.replace('alumni_', '').toLowerCase();
              }
              return false;
            });
          };

          fetchedProjects = [...fetchedProjects].sort((a, b) => {
            const aIsMine = checkIsMyProject(a) ? 1 : 0;
            const bIsMine = checkIsMyProject(b) ? 1 : 0;
            return bIsMine - aIsMine; // 1 (mine) comes before 0 (not mine)
          });
        }

        setProjects(fetchedProjects);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลโครงการโปรเจคได้"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisors = async (faculty_id, department_id) => {
    try {
      const response = await advisorService.getAll({ faculty_id, department_id });
      if (response.success) {
        setAdvisors(response.data);
      }
    } catch (error) {
      console.error("Error fetching advisors:", error);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleClearFilters = () => {
    setSearch('');
    if (user && (user.role === 'advisor' || user.role === 'teacher')) {
      setFilters({
        faculty: user.faculty || '',
        department: user.department || '',
        year: '',
        status: '',
        has_award: ''
      });
    } else {
      setFilters({ faculty: '', department: '', year: '', status: '', has_award: '' });
    }
  };

  // Autocomplete student search
  const handleMemberSearchChange = async (e) => {
    const value = e.target.value;
    setMemberSearch(value);

    if (value.length > 1) {
      try {
        const response = await studentService.getAll({ search: value });
        if (response.success) {
          // Filter out already selected members
          const selectedIds = selectedMembers.map(m => m.id);
          const filtered = response.data.filter(s => !selectedIds.includes(s.id));
          setStudentSuggestions(filtered);
          setShowMemberSuggestions(true);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      setShowMemberSuggestions(false);
    }
  };

  const addMember = (student) => {
    setSelectedMembers([...selectedMembers, student]);
    setMemberSearch('');
    setShowMemberSuggestions(false);
  };

  const removeMember = (id) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== id));
  };

  // Validations
  const validateForm = () => {
    const errors = {};

    if (!form.project_id) errors.project_id = 'กรุณากรอกรหัสโปรเจค';
    if (!form.title_th || form.title_th.length < 5) {
      errors.title_th = 'ชื่อโปรเจคภาษาไทยต้องมีความยาวอย่างน้อย 5 ตัวอักษร';
    }
    if (!form.title_en || form.title_en.length < 5) {
      errors.title_en = 'ชื่อโปรเจคภาษาอังกฤษต้องมีความยาวอย่างน้อย 5 ตัวอักษร';
    }
    if (!form.description) errors.description = 'กรุณากรอกรายละเอียดโปรเจค';
    if (!form.faculty) errors.faculty = 'กรุณาเลือกคณะ';
    if (!form.department) errors.department = 'กรุณาเลือกสาขาวิชา';
    if (!form.advisor) errors.advisor = 'กรุณาเลือกอาจารย์ที่ปรึกษา';
    if (!form.year || isNaN(form.year)) errors.year = 'กรุณากรอกปีการศึกษา (พ.ศ.)';
    // Only require members for Group projects
    if (form.project_type === 'Group' && selectedMembers.length === 0) {
      errors.members = 'กรุณาเลือกสมาชิกนักศึกษาอย่างน้อย 1 คน';
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
      setForm(prev => ({ ...prev, faculty: value, department: '', advisor: '' }));
    } else if (name === 'department') {
      setForm(prev => ({ ...prev, department: value, advisor: '' }));
    } else {
      setForm(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleOpenAdd = () => {
    setCurrentProject(null);
    
    let defaultFacultyId = '';
    let defaultDeptId = '';
    let defaultMembers = [];
    
    if (user?.role === 'student' && user?.profile) {
      defaultFacultyId = user.profile.faculty_id ? user.profile.faculty_id.toString() : '';
      defaultDeptId = user.profile.department_id ? user.profile.department_id.toString() : '';
      defaultMembers = [{
        id: user.profile.id,
        student_id: user.profile.profile_id,
        first_name: user.profile.firstname,
        last_name: user.profile.lastname
      }];
    }

    setSelectedMembers(defaultMembers);

    setForm({
      project_id: 'PRJ' + (new Date().getFullYear() + 543) + String(Math.floor(1000 + Math.random() * 9000)),
      title_th: '',
      title_en: '',
      description: '',
      advisor: '',
      year: (new Date().getFullYear() + 543).toString(),
      project_type: 'Group',
      document_url: '',
      tags: '',
      status: 'Draft',
      faculty: defaultFacultyId,
      department: defaultDeptId
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const canEditProject = (project) => {
    if (!project || !user) return false;
    // Admin, student, alumni, advisor, teacher can all edit projects
    if (['admin', 'student', 'alumni', 'advisor', 'teacher'].includes(user.role)) return true;
    return true;
  };

  const handleOpenEdit = (project) => {
    setCurrentProject(project);
    let initialMembers = project.members && project.members.length > 0 ? [...project.members] : [];

    // Fallback: If members list is empty and current user is student, default to current student
    if (initialMembers.length === 0 && user?.role === 'student' && user?.profile) {
      initialMembers = [{
        id: user.profile.id,
        student_id: user.profile.profile_id,
        first_name: user.profile.firstname,
        last_name: user.profile.lastname
      }];
    }
    setSelectedMembers(initialMembers);
    
    let defaultFacultyId = project.advisor?.faculty_id || '';
    let defaultDeptId = project.advisor?.department_id || '';

    // Fallback for student if project has no advisor
    if (!defaultFacultyId && user?.role === 'student' && user?.profile) {
      defaultFacultyId = user.profile.faculty_id ? user.profile.faculty_id.toString() : '';
      defaultDeptId = user.profile.department_id ? user.profile.department_id.toString() : '';
    }

    if (defaultFacultyId) {
      fetchDepartments(defaultFacultyId);
    }
    if (defaultFacultyId && defaultDeptId) {
      fetchAdvisors(defaultFacultyId, defaultDeptId);
    }

    const advisorValue = project.advisor_profile_id || project.advisor_id || project.advisor?.advisor_id || (project.advisor?.id ? project.advisor.id.toString() : '');

    setForm({
      project_id: project.project_id,
      title_th: project.title_th || '',
      title_en: project.title_en || '',
      description: project.description || '',
      advisor: advisorValue,
      year: project.year ? project.year.toString() : (new Date().getFullYear() + 543).toString(),
      project_type: project.project_type || (project.type ? (project.type.toLowerCase() === 'group' ? 'Group' : 'Individual') : 'Group'),
      document_url: project.document_url || '',
      tags: Array.isArray(project.tags)
        ? project.tags.join(', ')
        : (typeof project.tags === 'string'
          ? (project.tags.startsWith('[') ? JSON.parse(project.tags).join(', ') : project.tags)
          : ''),
      status: project.status || 'draft',
      faculty: defaultFacultyId ? defaultFacultyId.toString() : '',
      department: defaultDeptId ? defaultDeptId.toString() : ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedData = {
      ...form,
      year: parseInt(form.year),
      members: selectedMembers.map(m => m.id),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      let response;
      if (currentProject) {
        response = await projectService.update(currentProject.id, formattedData);
      } else {
        response = await projectService.create(formattedData);
      }

      if (response.success) {
        toast({
          title: currentProject ? "แก้ไขโครงงานสำเร็จ" : "ลงทะเบียนโครงงานสำเร็จ",
          description: response.message || "บันทึกข้อมูลโครงงานสำเร็จเรียบร้อยแล้ว"
        });
        setIsAddEditOpen(false);
        fetchProjects();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        description: error.response?.data?.message || "โปรดตรวจสอบความซ้ำซ้อนของชื่อเรื่องในปีการศึกษานี้"
      });
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await projectService.delete(deleteId);
      if (response.success) {
        toast({
          title: "ลบข้อมูลโครงงานสำเร็จ",
          description: "ลบโครงงานนี้ออกจากระบบแล้ว"
        });
        setIsDeleteOpen(false);
        fetchProjects();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้"
      });
    }
  };

  const handleOpenDetails = (project) => {
    setSelectedProjectForDetails(project);
    setIsDetailsOpen(true);
  };

  const handleUpdateStatus = async (projectId, newStatus) => {
    try {
      const res = await projectService.updateStatus(projectId, newStatus);
      if (res.success) {
        toast({
          title: "ปรับปรุงสถานะสำเร็จ",
          description: `เปลี่ยนสถานะโครงงานเป็น "${getStatusBadge(newStatus).label}" เรียบร้อยแล้ว`
        });
        if (selectedProjectForDetails && selectedProjectForDetails.id === projectId) {
          setSelectedProjectForDetails(prev => ({ ...prev, status: newStatus }));
        }
        fetchProjects();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถเปลี่ยนสถานะโครงงานได้"
      });
    }
  };

  // Export Projects
  const handleExport = async (format) => {
    try {
      const params = { ...filters, format };
      if (search) params.search = search;
      
      const response = await api.get('/data/export/projects', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `โปรเจคจบ_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: `ส่งออก ${format.toUpperCase()} สำเร็จ`,
        description: "ดาวน์โหลดไฟล์ผลงานสะสมเสร็จเรียบร้อยแล้ว"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งออกข้อมูลได้"
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="text-purple-600 h-7 w-7" />
            จัดการโปรเจคจบสะสม
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ค้นหา ตรวจสอบข้อมูลผลงานโครงงานระดับปริญญาตรี/วิทยานิพนธ์สะสมของนักศึกษา
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

          {(user?.role === 'admin' || user?.role === 'student' || user?.role === 'alumni') && (
            <Button
              onClick={handleOpenAdd}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1.5 h-10 shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              <span>ลงทะเบียนโปรเจคจบ</span>
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
              placeholder="ค้นหาชื่อโปรเจคภาษาไทย ภาษาอังกฤษ หรือรายละเอียดโครงการ..."
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
              {facultiesList.map((fac) => (
                <option key={fac.id} value={fac.id}>{fac.faculty_name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">สาขาวิชา</Label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-80 disabled:cursor-not-allowed"
              disabled={!filters.faculty}
            >
              <option value="">ทั้งหมด</option>
              {filterDepartmentsList.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.department_name}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">ปีการศึกษา (พ.ศ.)</Label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="">ทั้งหมด</option>
              {[2569, 2568, 2567, 2566, 2565, 2564].map((yr) => (
                <option key={yr} value={yr}>พ.ศ. {yr}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <Label className="text-gray-500 text-xs font-semibold">สถานะโครงงาน</Label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="flex h-10 w-full rounded-xl border border-purple-100/80 bg-white/50 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="">ทุกสถานะ</option>
              {PROJECT_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {(filters.faculty || filters.department || filters.year || filters.status || filters.has_award || search) && (
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

      {/* Grid gallery of Projects */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
          <span className="text-gray-400 text-xs font-medium animate-pulse">กำลังโหลดผลงานโปรเจคจบ...</span>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="border border-purple-100/40 shadow-sm rounded-2xl bg-white hover:shadow-md hover:border-purple-200 transition-all duration-300 overflow-hidden flex flex-col relative group">
              <div 
                onClick={() => handleOpenDetails(project)}
                className="p-5 flex-1 space-y-3 pt-8 cursor-pointer relative"
              >
                {(() => {
                  const isMyProject = user && (user.role === 'student' || user.role === 'alumni') && project.members?.some(m => {
                    if (user.role === 'student') {
                      return m.student_id === user.username;
                    } else if (user.role === 'alumni') {
                      return m.student_id.toLowerCase() === user.username.replace('alumni_', '').toLowerCase();
                    }
                    return false;
                  });

                  return isMyProject && (
                    <div className="absolute top-3 left-3 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm z-10">
                      <FolderKanban size={10} />
                      <span>โปรเจคของฉัน</span>
                    </div>
                  );
                })()}
                <div className="absolute top-3 right-3 z-10">
                  {(() => {
                    const badge = getStatusBadge(project.status);
                    return (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg w-max border border-purple-100/20">
                  <Calendar size={12} />
                  <span>ปีการศึกษา {project.year}</span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-2 leading-snug group-hover:text-purple-600 transition-colors">
                    {project.title_th}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium line-clamp-1 italic leading-tight">{project.title_en}</p>
                </div>

                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed pt-1">
                  {project.description}
                </p>

                {/* Tags */}
                {(() => {
                  let tagsArray = [];
                  if (project.tags) {
                    if (Array.isArray(project.tags)) {
                      tagsArray = project.tags;
                    } else if (typeof project.tags === 'string') {
                      try {
                        const parsed = JSON.parse(project.tags);
                        if (Array.isArray(parsed)) {
                          tagsArray = parsed;
                        } else {
                          tagsArray = project.tags.split(',').map(t => t.trim()).filter(Boolean);
                        }
                      } catch (e) {
                        tagsArray = project.tags.split(',').map(t => t.trim()).filter(Boolean);
                      }
                    }
                  }
                  return tagsArray.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tagsArray.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-500">
                          <Tag size={8} className="mr-1 text-purple-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Team and Advisor Details */}
                <div className="border-t border-purple-50/50 pt-3 space-y-2 text-xs">
                  <div className="flex items-center text-gray-500 font-medium">
                    <User size={12} className="mr-1.5 text-purple-600" />
                    <span className="text-[11px]">อาจารย์ที่ปรึกษา: <strong className="text-gray-700">{project.advisor?.name || '-'}</strong></span>
                  </div>
                  <div className="flex items-start text-gray-500 font-medium">
                    <Users size={12} className="mr-1.5 mt-0.5 text-purple-600" />
                    <div className="text-[11px] flex-1">
                      สมาชิก: {' '}
                      <span className="text-gray-700 font-semibold">
                        {project.members?.map(m => `${m.first_name}`).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions & File buttons */}
              <div className="bg-purple-50/30 border-t border-purple-100/30 px-5 py-3.5 flex items-center justify-between">
                <div>
                  {project.document_url ? (
                    <a 
                      href={project.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1"
                    >
                      <BookOpen size={13} />
                      <span>ดูไฟล์ผลงาน</span>
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-400 font-medium">ยังไม่มีไฟล์ผลงานในระบบ</span>
                  )}
                </div>

                {canEditProject(project) && (
                  <div className="flex items-center space-x-1.5">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(project);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-purple-700 hover:text-purple-900 border-purple-200 hover:bg-purple-50 rounded-xl flex items-center gap-1.5 font-semibold shadow-xs"
                    >
                      <Edit2 size={13} />
                      <span>แก้ไข</span>
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDelete(project.id);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-700 hover:text-rose-900 hover:bg-rose-100/50 rounded-lg"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-purple-100/30 rounded-2xl text-gray-400 shadow-sm">
          <FolderKanban size={40} className="mx-auto text-purple-200 mb-3" />
          <p className="text-base font-bold text-gray-600">ไม่พบรายชื่อโปรเจคจบ</p>
          <p className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนคำค้นหา หรือปรับปรุงตัวกรองของท่าน</p>
        </div>
      )}

      {/* Add / Edit Project Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-purple-900">
              {currentProject ? 'แก้ไขข้อมูลโครงงาน' : 'ลงทะเบียนโครงงานใหม่'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              ระบุรายละเอียดโครงการวิจัย/โปรเจคจบ พร้อมเลือกประเภทโครงงาน ค้นหาสมาชิก และอาจารย์ที่ปรึกษา
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project ID - Auto-generated, read-only */}
              <div className="space-y-1.5">
                <Label htmlFor="project_id" className="text-gray-700 text-xs font-semibold">รหัสโปรเจคจบ</Label>
                <div className="relative">
                  <Input
                    id="project_id"
                    name="project_id"
                    value={form.project_id}
                    readOnly
                    disabled
                    className="border-purple-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-md font-semibold">สร้างอัตโนมัติ</span>
                </div>
              </div>

              {/* Project Type - Toggle between Group and Individual */}
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ประเภทโปรเจคจบ *</Label>
                <div className="flex h-10 w-full items-center rounded-xl border border-purple-100 bg-white p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, project_type: 'Group' }));
                    }}
                    className={`flex-1 h-full rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 ${
                      form.project_type === 'Group'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                  >
                    <Users size={14} />
                    <span>กลุ่ม (Group)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, project_type: 'Individual' }));
                      setSelectedMembers([]);
                      setMemberSearch('');
                      setShowMemberSuggestions(false);
                    }}
                    className={`flex-1 h-full rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 ${
                      form.project_type === 'Individual'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                  >
                    <UserRound size={14} />
                    <span>เดี่ยว (Individual)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Title TH */}
            <div className="space-y-1.5">
              <Label htmlFor="title_th" className="text-gray-700 text-xs font-semibold">ชื่อโครงงาน (ภาษาไทย) *</Label>
              <Input
                id="title_th"
                name="title_th"
                placeholder="ชื่อภาษาไทยอย่างน้อย 5 ตัวอักษร"
                value={form.title_th}
                onChange={handleFormChange}
                className={`border-purple-100 rounded-xl ${formErrors.title_th ? 'border-rose-300' : ''}`}
              />
              {formErrors.title_th && (
                <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.title_th}</p>
              )}
            </div>

            {/* Title EN */}
            <div className="space-y-1.5">
              <Label htmlFor="title_en" className="text-gray-700 text-xs font-semibold">ชื่อโครงงาน (ภาษาอังกฤษ) *</Label>
              <Input
                id="title_en"
                name="title_en"
                placeholder="Project Title in English (at least 5 characters)"
                value={form.title_en}
                onChange={handleFormChange}
                className={`border-purple-100 rounded-xl ${formErrors.title_en ? 'border-rose-300' : ''}`}
              />
              {formErrors.title_en && (
                <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.title_en}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-gray-700 text-xs font-semibold">รายละเอียด/บทคัดย่อโดยย่อ *</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="กรอกรายละเอียดการดำเนินงานหรือบทคัดย่อ..."
                value={form.description}
                onChange={handleFormChange}
                className="flex w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              />
              {formErrors.description && (
                <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Faculty */}
              <div className="space-y-1.5">
                <Label htmlFor="faculty" className="text-gray-700 text-xs font-semibold">คณะผู้จัดทำ *</Label>
                <select
                  id="faculty"
                  name="faculty"
                  value={form.faculty}
                  onChange={handleFormChange}
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none ${formErrors.faculty ? 'border-rose-300' : 'border-purple-100'}`}
                >
                  <option value="">เลือกคณะ</option>
                  {facultiesList.map((fac) => (
                    <option key={fac.id} value={fac.id}>{fac.faculty_name}</option>
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
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none ${formErrors.department ? 'border-rose-300' : 'border-purple-100'} disabled:bg-gray-100 disabled:text-gray-500`}
                >
                  <option value="">เลือกสาขาวิชา</option>
                  {departmentsList.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                  ))}
                </select>
              </div>

              {/* Advisor (Autofilled based on Faculty/Dept) */}
              <div className="space-y-1.5">
                <Label htmlFor="advisor" className="text-gray-700 text-xs font-semibold">อาจารย์ที่ปรึกษาโครงงาน *</Label>
                <select
                  id="advisor"
                  name="advisor"
                  value={form.advisor}
                  onChange={handleFormChange}
                  disabled={!form.department}
                  className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none ${formErrors.advisor ? 'border-rose-300' : 'border-purple-100'}`}
                >
                  <option value="">เลือกอาจารย์</option>
                  {advisors.map((adv) => (
                    <option key={adv.id} value={adv.advisor_id || adv.id}>{adv.name}</option>
                  ))}
                </select>
                {formErrors.advisor && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.advisor}</p>
                )}
              </div>
            </div>

            {/* Members Selector - Only shown for Group projects */}
            {form.project_type === 'Group' ? (
              <div className="bg-purple-50/20 border border-purple-100/50 p-4 rounded-2xl space-y-3 relative animate-in fade-in duration-300">
                <Label className="text-gray-700 text-xs font-bold uppercase">
                  ค้นหาและระบุสมาชิกกลุ่มนักศึกษา *
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="พิมพ์รหัสนักศึกษา หรือชื่อ เพื่อค้นหาสมาชิก..."
                    value={memberSearch}
                    onChange={handleMemberSearchChange}
                    className="h-10 border-purple-100 rounded-xl"
                  />
                  {showMemberSuggestions && studentSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-purple-100 rounded-xl shadow-lg z-50 max-h-32 overflow-y-auto">
                      {studentSuggestions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => addMember(s)}
                          className="px-4 py-2.5 text-xs hover:bg-purple-50 hover:text-purple-900 cursor-pointer text-purple-800 font-semibold border-b border-purple-50 last:border-0"
                        >
                          🧑‍🎓 {s.first_name} {s.last_name} ({s.student_id}) - {s.department}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Members Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedMembers.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-purple-200 text-purple-700 shadow-sm">
                      <span>{m.first_name} {m.last_name} ({m.student_id})</span>
                      <button 
                        type="button" 
                        onClick={() => removeMember(m.id)} 
                        className="w-4 h-4 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-800 flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                {formErrors.members && (
                  <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.members}</p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-2xl space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-amber-600" />
                  <Label className="text-amber-800 text-xs font-bold uppercase">
                    โปรเจคเดี่ยว — ไม่ต้องเพิ่มสมาชิก
                  </Label>
                </div>
                <p className="text-xs text-amber-600/80 leading-relaxed pl-6">
                  ระบบจะบันทึกผู้จัดทำเป็นนักศึกษาผู้ลงทะเบียนโดยอัตโนมัติ ไม่จำเป็นต้องเพิ่มสมาชิกเพิ่มเติม
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Year */}
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-gray-700 text-xs font-semibold">ปีการศึกษาโครงงาน (พ.ศ.) *</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  placeholder="เช่น 2567"
                  value={form.year}
                  onChange={handleFormChange}
                  className={`border-purple-100 rounded-xl ${formErrors.year ? 'border-rose-300' : ''}`}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-gray-700 text-xs font-semibold">สถานะโครงงาน *</Label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none"
                >
                  {PROJECT_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document URL */}
            <div className="space-y-1.5">
              <Label htmlFor="document_url" className="text-gray-700 text-xs font-semibold">ลิงก์แนบไฟล์เอกสารรายงาน (PDF / Drive URL)</Label>
              <Input
                id="document_url"
                name="document_url"
                placeholder="https://drive.google.com/..."
                value={form.document_url}
                onChange={handleFormChange}
                className="border-purple-100 rounded-xl text-xs"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label htmlFor="tags" className="text-gray-700 text-xs font-semibold">แท็กคีย์เวิร์ด (คั่นด้วยจุลภาค , )</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="เช่น Web, AI, React, Mobile"
                value={form.tags}
                onChange={handleFormChange}
                className="border-purple-100 rounded-xl text-xs"
              />
            </div>

            {/* Removed Has Award Section */}

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
                {currentProject ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">ยืนยันการลบประวัติโครงงาน</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              คุณมั่นใจที่จะลบข้อมูลโครงงานวิจัยนี้ใช่หรือไม่? ข้อมูลทั้งหมดรวมถึงประวัติสมาชิกผู้รับผิดชอบโครงการจะถูกลบและไม่สามารถดึงกลับได้
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

      {/* Project Details & Comments Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-purple-100 p-8 bg-white">
          {selectedProjectForDetails && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4 pr-8">
                  {(() => {
                    const badge = getStatusBadge(selectedProjectForDetails.status);
                    return (
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100/20 flex items-center gap-1">
                      <Calendar size={13} />
                      ปีการศึกษา {selectedProjectForDetails.year}
                    </span>
                    {canEditProject(selectedProjectForDetails) && (
                      <Button
                        type="button"
                        onClick={() => {
                          const p = selectedProjectForDetails;
                          setIsDetailsOpen(false);
                          handleOpenEdit(p);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs h-8 flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit2 size={13} />
                        <span>แก้ไขโครงงาน</span>
                      </Button>
                    )}
                  </div>
                </div>
                <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900 mt-3 leading-snug">
                  {selectedProjectForDetails.title_th}
                </DialogTitle>
                <p className="text-sm text-gray-400 font-medium italic mt-1.5 leading-snug">{selectedProjectForDetails.title_en}</p>
              </DialogHeader>

              {/* Status Workflow Progress Tracker */}
              <div className="bg-purple-50/40 border border-purple-100/60 p-4 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-purple-600" />
                    ลำดับขั้นตอนการดำเนินงานโครงงาน (Lifecycle Progress)
                  </h5>
                  {(user?.role === 'admin' || user?.role === 'advisor' || user?.role === 'teacher' || 
                    user?.username === selectedProjectForDetails.advisor_id ||
                    selectedProjectForDetails.members?.some(m => m.student_id === user?.username)) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 font-medium">ปรับปรุงสถานะ:</span>
                      <select
                        value={selectedProjectForDetails.status?.toLowerCase() || 'draft'}
                        onChange={(e) => handleUpdateStatus(selectedProjectForDetails.id, e.target.value)}
                        className="h-8 rounded-lg border border-purple-200 bg-white px-2.5 text-xs text-purple-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                      >
                        {PROJECT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Visual Step Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  {PROJECT_STATUSES.map((step, idx) => {
                    const currentIdx = PROJECT_STATUSES.findIndex(
                      s => s.value === (selectedProjectForDetails.status?.toLowerCase() || 'draft')
                    );
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div 
                        key={step.value} 
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md font-bold'
                            : isDone
                              ? 'bg-purple-100/70 text-purple-800 border-purple-200 font-medium'
                              : 'bg-white text-gray-400 border-gray-100 opacity-60'
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider mb-0.5">ขั้นที่ {idx + 1}</div>
                        <div className="text-xs leading-tight">{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2.5">
                <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider">บทคัดย่อ / รายละเอียดโปรเจค</h5>
                <div className="bg-gray-50/55 border border-purple-50/40 p-5 rounded-xl text-sm text-gray-600 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line">
                  {selectedProjectForDetails.description}
                </div>
              </div>

              {/* Meta Info: Advisor & Members */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                {/* Advisor Info */}
                <div className="space-y-2.5">
                  <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider">อาจารย์ที่ปรึกษา</h5>
                  <div className="bg-purple-50/20 border border-purple-100/30 p-4 rounded-xl space-y-2">
                    <p className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                      <User size={14} className="text-purple-600" />
                      {selectedProjectForDetails.advisor?.name || 'ไม่มีอาจารย์ที่ปรึกษา'}
                    </p>
                    <p className="text-xs text-gray-500 pl-5.5">สาขาวิชา {selectedProjectForDetails.advisor?.department || '-'}</p>
                    {selectedProjectForDetails.advisor?.email && (
                      <p className="text-xs text-gray-400 pl-5.5">Email: {selectedProjectForDetails.advisor.email}</p>
                    )}
                  </div>
                </div>

                {/* Members Info */}
                <div className="space-y-2.5">
                  <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider">ผู้จัดทำ (นักศึกษา)</h5>
                  <div className="bg-purple-50/20 border border-purple-100/30 p-4 rounded-xl space-y-2 max-h-[140px] overflow-y-auto">
                    {selectedProjectForDetails.members && selectedProjectForDetails.members.length > 0 ? (
                      selectedProjectForDetails.members.map(member => (
                        <div key={member.id} className="text-sm text-purple-950 font-medium flex items-center gap-1.5">
                          <Users size={13} className="text-purple-600" />
                          <span>{member.first_name} {member.last_name} ({member.student_id})</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">ไม่มีข้อมูลสมาชิก</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags & Document */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-gray-50">
                <div className="flex flex-wrap gap-1.5">
                  {Array.isArray(selectedProjectForDetails.tags) ? (
                    selectedProjectForDetails.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-semibold border border-purple-100/10">
                        #{tag}
                      </span>
                    ))
                  ) : selectedProjectForDetails.tags && typeof selectedProjectForDetails.tags === 'string' ? (
                    (() => {
                      try {
                        const parsed = JSON.parse(selectedProjectForDetails.tags);
                        return Array.isArray(parsed) ? parsed.map((tag, i) => (
                          <span key={i} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-semibold border border-purple-100/10">
                            #{tag}
                          </span>
                        )) : null;
                      } catch(e) {
                        return null;
                      }
                    })()
                  ) : null}
                </div>
                {selectedProjectForDetails.document_url && (
                  <a 
                    href={selectedProjectForDetails.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-bold"
                  >
                    <BookOpen size={16} />
                    <span>เปิดไฟล์ผลงานสะสม</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Advisor Feedback / Comments Section Removed */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Removed Advisor Comment Specific Dialog */}
    </div>
  );
};

export default Projects;
