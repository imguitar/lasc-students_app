import React, { useEffect, useState, useRef } from 'react';
import { projectService, advisorService, studentService, facultyService, departmentService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  FolderKanban, Search, Plus, Download, Edit2, Trash2, AlertCircle, FileText, CheckCircle2, ChevronDown, User, Users, UserRound, Award, Tag, BookOpen, ExternalLink, Calendar, CheckCircle, XCircle, Clock, Send, Eye, ShieldCheck, ArrowRight, RotateCcw,
  Mail, Check, FileEdit, Activity
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';
import { Card } from '../components/ui/card';

export const PROJECT_LIFECYCLE_STEPS = [
  { key: 'draft', label: 'แบบร่าง', en: 'Draft', icon: FileEdit },
  { key: 'pending_approval', label: 'รออนุมัติ', en: 'Pending Approval', icon: Mail },
  { key: 'approved', label: 'อนุมัติแล้ว', en: 'Approved', icon: CheckCircle2 },
  { key: 'in_progress', label: 'กำลังดำเนินการ', en: 'In Progress', icon: Activity },
  { key: 'waiting_defense', label: 'รอสอบปริญญานิพนธ์', en: 'Waiting Defense', icon: Calendar },
  { key: 'passed_defense', label: 'ผ่านการสอบปริญญานิพนธ์', en: 'Passed Defense', icon: Award },
  { key: 'completed', label: 'เสร็จสมบูรณ์', en: 'Completed', icon: CheckCircle }
];

export const getProjectLifecycleIndex = (project) => {
  if (!project) return 0;
  const appStatus = (project.approval_status || 'draft').toLowerCase();
  if (appStatus === 'draft') return 0;
  if (appStatus === 'pending_approval') return 1;
  if (appStatus === 'rejected') return 0;
  
  const s = (project.status || 'approved').toLowerCase();
  if (s === 'draft' || s === 'approved') return 2;
  if (s === 'in_progress') return 3;
  if (s === 'waiting_defense') return 4;
  if (s === 'passed_defense') return 5;
  if (s === 'completed') return 6;
  return 2;
};

export const PROJECT_STATUSES = [
  { value: 'draft', label: 'แบบร่าง', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'approved', label: 'อนุมัติแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'in_progress', label: 'กำลังดำเนินการ', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'waiting_defense', label: 'รอสอบปริญญานิพนธ์', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'passed_defense', label: 'ผ่านการสอบแล้ว', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'completed', label: 'เสร็จสมบูรณ์', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

export const getDisplayBadge = (project) => {
  if (!project) return { label: 'แบบร่าง', className: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  const appStatus = (project.approval_status || 'draft').toLowerCase();

  if (appStatus === 'pending_approval') {
    return { label: 'รออาจารย์อนุมัติ', className: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-500' };
  }
  if (appStatus === 'rejected') {
    return { label: 'ไม่อนุมัติ', className: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' };
  }
  if (appStatus === 'draft') {
    return { label: 'แบบร่าง', className: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  }

  // Approved -> show progress stage
  const s = String(project.status || '').toLowerCase();
  if (s === 'in_progress') return { label: 'กำลังดำเนินการ', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
  if (s === 'waiting_defense') return { label: 'รอสอบปริญญานิพนธ์', className: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
  if (s === 'passed_defense') return { label: 'ผ่านการสอบแล้ว', className: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
  if (s === 'completed') return { label: 'เสร็จสมบูรณ์', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  return { label: 'อนุมัติแล้ว', className: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
};

export const getStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'draft') return { label: 'แบบร่าง', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  if (s === 'approved') return { label: 'อนุมัติแล้ว', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (s === 'in_progress') return { label: 'กำลังดำเนินการ', className: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'waiting_defense') return { label: 'รอสอบปริญญานิพนธ์', className: 'bg-purple-50 text-purple-700 border-purple-200' };
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
    approval_status: '',
    has_award: ''
  });

  // Tab state for Advisor/Admin: 'all' vs 'approval_requests'
  const [activeTab, setActiveTab] = useState('all');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject Modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingProject, setRejectingProject] = useState(null);

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
    status: 'draft',
    faculty: '',
    department: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Multiple Advisors states (Main & Co-advisors)
  const [selectedCoAdvisors, setSelectedCoAdvisors] = useState([]);
  const [statusUpdating, setStatusUpdating] = useState(false);

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
    setSelectedCoAdvisors([]);

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

  const handleAddCoAdvisor = (adv) => {
    const advKey = adv.advisor_id || adv.id.toString();
    if (advKey === form.advisor) {
      toast({
        variant: "destructive",
        title: "อาจารย์ซ้ำ",
        description: "อาจารย์ท่านนี้ถูกเลือกเป็นที่ปรึกษาหลักแล้ว"
      });
      return;
    }
    if (selectedCoAdvisors.some(c => (c.advisor_id || c.id.toString()) === advKey)) {
      toast({
        variant: "destructive",
        title: "อาจารย์ซ้ำ",
        description: "อาจารย์ท่านนี้ถูกเลือกเป็นที่ปรึกษาร่วมแล้ว"
      });
      return;
    }
    setSelectedCoAdvisors(prev => [...prev, adv]);
  };

  const handleRemoveCoAdvisor = (advId) => {
    setSelectedCoAdvisors(prev => prev.filter(c => (c.advisor_id || c.id.toString()) !== advId.toString()));
  };

  const fetchPendingApprovals = async () => {
    if (user?.role !== 'advisor' && user?.role !== 'teacher' && user?.role !== 'admin') return;
    setPendingLoading(true);
    try {
      const res = await projectService.getPendingApprovals();
      if (res.success) {
        setPendingApprovals(res.data);
      }
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'advisor' || user.role === 'teacher' || user.role === 'admin')) {
      fetchPendingApprovals();
    }
  }, [user]);

  const isMyProject = (project) => {
    if (!project || !user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'student') {
      const isCreator = project.created_by_profile_id === user.username;
      const isMember = project.members?.some(m => m.student_id === user.username || m.id === user.profile?.id);
      return isCreator || isMember;
    }
    if (user.role === 'alumni') {
      const cleanUsername = user.username.replace('alumni_', '').toLowerCase();
      const isCreator = project.created_by_profile_id?.toLowerCase() === cleanUsername;
      const isMember = project.members?.some(m => m.student_id?.toLowerCase() === cleanUsername);
      return isCreator || isMember;
    }
    return false;
  };

  const isAdvisorOfProject = (project) => {
    if (!project || !user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'advisor' && user.role !== 'teacher') return false;
    const myId = user.profile?.profile_id || user.username;
    return (
      project.advisor_profile_id === myId ||
      project.advisor?.advisor_id === myId ||
      project.main_advisor?.advisor_id === myId ||
      project.advisors?.some(a => a.advisor_id === myId || a.profile_id === myId)
    );
  };

  const canEditProject = (project) => {
    if (!project || !user) return false;
    if (user.role === 'admin') return true;
    // Advisors FORBIDDEN from editing student project data directly in approval flow
    if (user.role === 'advisor' || user.role === 'teacher') return false;
    // Students can edit only their own project AND only when not pending approval
    if (user.role === 'student' || user.role === 'alumni') {
      if (!isMyProject(project)) return false;
      if (project.approval_status === 'pending_approval') return false;
      return true; // DRAFT or REJECTED
    }
    return false;
  };

  const handleSubmitApproval = async (projectId) => {
    setActionLoading(true);
    try {
      const res = await projectService.submitApproval(projectId);
      if (res.success) {
        toast({
          title: "ส่งคำขออนุมัติสำเร็จ",
          description: "ส่งคำขออนุมัติโครงงานไปยังอาจารย์ที่ปรึกษาเรียบร้อยแล้ว"
        });
        if (selectedProjectForDetails && selectedProjectForDetails.id === projectId) {
          setSelectedProjectForDetails(res.data);
        }
        fetchProjects();
        fetchPendingApprovals();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการส่งคำขออนุมัติ",
        description: error.response?.data?.message || "ไม่สามารถส่งคำขออนุมัติได้"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (projectId) => {
    setActionLoading(true);
    try {
      const res = await projectService.approve(projectId);
      if (res.success) {
        toast({
          title: "อนุมัติโครงงานสำเร็จ",
          description: "อนุมัติโครงงานวิจัยของนักศึกษาเรียบร้อยแล้ว"
        });
        if (selectedProjectForDetails && selectedProjectForDetails.id === projectId) {
          setSelectedProjectForDetails(res.data);
        }
        fetchProjects();
        fetchPendingApprovals();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการอนุมัติ",
        description: error.response?.data?.message || "ไม่สามารถอนุมัติโครงงานได้"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (project) => {
    setRejectingProject(project);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "กรุณาระบุเหตุผล",
        description: "กรุณาระบุเหตุผลกรณีไม่อนุมัติโครงงานเพื่อให้นักศึกษานำไปปรับปรุงแก้ไข"
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await projectService.reject(rejectingProject.id, { rejection_reason: rejectionReason.trim() });
      if (res.success) {
        toast({
          title: "บันทึกการไม่อนุมัติสำเร็จ",
          description: "แจ้งผลการไม่อนุมัติพร้อมเหตุผลแก่นักศึกษาเรียบร้อยแล้ว"
        });
        setIsRejectModalOpen(false);
        if (selectedProjectForDetails && selectedProjectForDetails.id === rejectingProject.id) {
          setSelectedProjectForDetails(res.data);
        }
        fetchProjects();
        fetchPendingApprovals();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถบันทึกการไม่อนุมัติได้"
      });
    } finally {
      setActionLoading(false);
    }
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
    
    // Co-advisors
    const coAdvList = project.co_advisors || (project.advisors ? project.advisors.filter(a => a.role === 'co') : []);
    setSelectedCoAdvisors(coAdvList);
    
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

    const advisorValue = project.main_advisor?.advisor_id || project.advisor_profile_id || project.advisor_id || project.advisor?.advisor_id || (project.advisor?.id ? project.advisor.id.toString() : '');

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
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      co_advisors: selectedCoAdvisors.map(c => c.advisor_id || c.id)
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
        description: error.response?.data?.message || "โปรดตรวจสอบความถูกต้องของข้อมูล"
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
    setStatusUpdating(true);
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
        title: "เกิดข้อผิดพลาดในการปรับปรุงสถานะ",
        description: error.response?.data?.message || "ไม่สามารถเปลี่ยนสถานะโครงงานได้"
      });
    } finally {
      setStatusUpdating(false);
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

      {/* Tabs for Advisor / Admin: All Projects vs Approval Requests */}
      {(user?.role === 'advisor' || user?.role === 'teacher' || user?.role === 'admin') && (
        <div className="flex items-center gap-2 border-b border-purple-100/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-purple-100 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <FolderKanban size={15} />
            <span>โครงงานทั้งหมด</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'all' ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700'}`}>
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approval_requests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'approval_requests'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-purple-100 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Clock size={15} />
            <span>คำขออนุมัติโครงการ</span>
            {pendingApprovals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white animate-pulse">
                {pendingApprovals.length} รออนุมัติ
              </span>
            )}
          </button>
        </div>
      )}

      {/* VIEW 1: Advisor / Admin Dedicated Approval Requests View */}
      {activeTab === 'approval_requests' ? (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  รายการคำขออนุมัติโครงการ ({pendingApprovals.length} รายการ)
                </h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  แสดงเฉพาะโครงงานที่ท่านเป็นอาจารย์ที่ปรึกษาที่นักศึกษาส่งคำขออนุมัติเข้ามา ตรวจสอบรายละเอียดแบบ Read-Only และพิจารณาอนุมัติ
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingApprovals}
              disabled={pendingLoading}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 rounded-xl text-xs h-9 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RotateCcw size={13} className={pendingLoading ? 'animate-spin' : ''} />
              <span>รีเฟรชคำขอ</span>
            </Button>
          </div>

          {pendingLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-purple-200 border-t-purple-600 animate-spin" />
              <span className="text-xs text-gray-400">กำลังโหลดคำขออนุมัติ...</span>
            </div>
          ) : pendingApprovals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingApprovals.map((project) => (
                <Card
                  key={project.id}
                  onClick={() => handleOpenDetails(project)}
                  className="bg-white border-2 border-amber-200/80 hover:border-amber-400 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                        {project.project_id}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock size={11} />
                        รออนุมัติ
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                        {project.title_th}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-1 italic mt-0.5">{project.title_en}</p>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    <div className="bg-purple-50/30 border border-purple-100/50 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-gray-600">
                        <Users size={13} className="text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-gray-800">นักศึกษา / ผู้จัดทำ:</span>
                          <div className="text-[11px] text-gray-700 font-medium mt-0.5">
                            {project.members && project.members.length > 0
                              ? project.members.map(m => `${m.first_name} ${m.last_name} (${m.student_id})`).join(', ')
                              : project.created_by_profile_id || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={13} className="text-purple-600 shrink-0" />
                        <span className="text-[11px]">
                          สาขาวิชา: <strong className="text-gray-800">{project.main_advisor?.department || project.advisor?.department || '-'}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <UserRound size={13} className="text-purple-600 shrink-0" />
                        <span className="text-[11px]">
                          อาจารย์ที่ปรึกษา: <strong className="text-gray-800">{project.main_advisor?.name || project.advisor?.name || '-'}</strong>
                        </span>
                      </div>

                      {project.approval_requested_at && (
                        <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px] pt-1.5 border-t border-purple-100/40">
                          <Calendar size={12} className="text-amber-600" />
                          <span>วันที่ส่งคำขอ: {new Date(project.approval_requested_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50/50 border-t border-amber-100 p-3.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                      <AlertCircle size={12} />
                      ข้อมูลแบบ Read-Only
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetails(project);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-8 px-3 shadow-xs flex items-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>ดูรายละเอียด</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-purple-100/50 rounded-2xl p-6 text-gray-400">
              <CheckCircle size={44} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-base font-bold text-gray-700">ไม่มีคำขออนุมัติโครงการที่ค้างอยู่</p>
              <p className="text-xs text-gray-400 mt-1">โครงงานทั้งหมดได้รับการพิจารณาเรียบร้อยแล้ว หรือยังไม่มีคำขอใหม่ส่งเข้ามา</p>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: All Projects Gallery */
        <>
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
                  <option value="draft">แบบร่าง (Draft)</option>
                  <option value="pending_approval">รออนุมัติ (Pending Approval)</option>
                  <option value="approved">อนุมัติแล้ว (Approved)</option>
                  <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
                  <option value="waiting_defense">รอสอบปริญญานิพนธ์ (Waiting Defense)</option>
                  <option value="passed_defense">ผ่านการสอบแล้ว (Passed Defense)</option>
                  <option value="completed">เสร็จสมบูรณ์ (Completed)</option>
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
                    {isMyProject(project) && (
                      <div className="absolute top-3 left-3 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm z-10">
                        <FolderKanban size={10} />
                        <span>โปรเจคของฉัน</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 z-10">
                      {(() => {
                        const badge = getDisplayBadge(project);
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

                    {/* Rejection Alert Note on Card if rejected */}
                    {project.approval_status === 'rejected' && project.rejection_reason && (
                      <div className="bg-rose-50/90 border border-rose-200 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1 font-bold text-[11px] text-rose-700">
                          <XCircle size={12} />
                          <span>เหตุผลที่ไม่อนุมัติ:</span>
                        </div>
                        <p className="text-[11px] text-rose-800 line-clamp-2">{project.rejection_reason}</p>
                      </div>
                    )}

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
                      <div className="flex items-start text-gray-500 font-medium">
                        <User size={12} className="mr-1.5 mt-0.5 text-purple-600 shrink-0" />
                        <div className="text-[11px] flex-1">
                          <div>
                            ที่ปรึกษาหลัก: <strong className="text-gray-700">{project.main_advisor?.name || project.advisor?.name || '-'}</strong>
                          </div>
                          {project.co_advisors && project.co_advisors.length > 0 && (
                            <div className="text-purple-600 text-[10px] font-medium mt-0.5">
                              ที่ปรึกษาร่วม: {project.co_advisors.map(c => c.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start text-gray-500 font-medium">
                        <Users size={12} className="mr-1.5 mt-0.5 text-purple-600 shrink-0" />
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
                  <div className="bg-purple-50/30 border-t border-purple-100/30 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
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

                    <div className="flex items-center space-x-1.5">
                      {/* Student Request Approval actions on card */}
                      {(user?.role === 'student' || user?.role === 'alumni') && isMyProject(project) && (
                        <>
                          {project.approval_status === 'draft' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitApproval(project.id);
                              }}
                              disabled={actionLoading}
                              size="sm"
                              className="h-8 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1 font-semibold shadow-xs"
                            >
                              <Send size={12} />
                              <span>ขออนุมัติ</span>
                            </Button>
                          )}
                          {project.approval_status === 'rejected' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubmitApproval(project.id);
                              }}
                              disabled={actionLoading}
                              size="sm"
                              className="h-8 px-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1 font-semibold shadow-xs"
                            >
                              <RotateCcw size={12} />
                              <span>ขออนุมัติใหม่</span>
                            </Button>
                          )}
                          {project.approval_status === 'approved' && (project.status?.toLowerCase() === 'approved' || project.status?.toLowerCase() === 'draft') && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(project.id, 'in_progress');
                              }}
                              disabled={statusUpdating}
                              size="sm"
                              className="h-8 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1 font-semibold shadow-xs"
                              title="เริ่มดำเนินการโครงงาน"
                            >
                              <Activity size={12} className="animate-pulse" />
                              <span>เริ่มดำเนินการ</span>
                            </Button>
                          )}
                        </>
                      )}

                      {/* Advisor quick review actions on card */}
                      {(user?.role === 'advisor' || user?.role === 'teacher') && isAdvisorOfProject(project) && project.approval_status === 'pending_approval' && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(project.id);
                            }}
                            disabled={actionLoading}
                            size="sm"
                            className="h-8 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1 font-semibold shadow-xs"
                          >
                            <CheckCircle size={12} />
                            <span>อนุมัติ</span>
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRejectModal(project);
                            }}
                            disabled={actionLoading}
                            size="sm"
                            className="h-8 px-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1 font-semibold shadow-xs"
                          >
                            <XCircle size={12} />
                            <span>ไม่อนุมัติ</span>
                          </Button>
                        </>
                      )}

                      {/* Edit Button for Student (own project, not pending) or Admin */}
                      {canEditProject(project) && (
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
                      )}

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
        </>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Advisors Section (Main & Co-Advisors) */}
            <div className="bg-purple-50/20 border border-purple-100/50 p-4 rounded-2xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Advisor */}
                <div className="space-y-1.5">
                  <Label htmlFor="advisor" className="text-gray-700 text-xs font-semibold flex items-center gap-1.5">
                    <User size={13} className="text-purple-600" />
                    อาจารย์ที่ปรึกษาหลัก *
                  </Label>
                  <select
                    id="advisor"
                    name="advisor"
                    value={form.advisor}
                    onChange={handleFormChange}
                    disabled={!form.department}
                    className={`flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-xs focus-visible:outline-none ${formErrors.advisor ? 'border-rose-300' : 'border-purple-100'}`}
                  >
                    <option value="">เลือกอาจารย์ที่ปรึกษาหลัก</option>
                    {advisors.map((adv) => (
                      <option key={adv.id} value={adv.advisor_id || adv.id}>{adv.name}</option>
                    ))}
                  </select>
                  {formErrors.advisor && (
                    <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.advisor}</p>
                  )}
                </div>

                {/* Add Co-Advisor */}
                <div className="space-y-1.5">
                  <Label htmlFor="coAdvisorSelect" className="text-gray-700 text-xs font-semibold flex items-center gap-1.5">
                    <Users size={13} className="text-purple-600" />
                    เพิ่มอาจารย์ที่ปรึกษาร่วม (ถ้ามี)
                  </Label>
                  <select
                    id="coAdvisorSelect"
                    value=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const advObj = advisors.find(a => (a.advisor_id || a.id.toString()) === selectedId);
                      if (advObj) handleAddCoAdvisor(advObj);
                    }}
                    disabled={!form.department}
                    className="flex h-10 w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs focus-visible:outline-none"
                  >
                    <option value="">+ เลือกอาจารย์ที่ปรึกษาร่วมเพื่อเพิ่ม</option>
                    {advisors
                      .filter(adv => (adv.advisor_id || adv.id.toString()) !== form.advisor && !selectedCoAdvisors.some(c => (c.advisor_id || c.id.toString()) === (adv.advisor_id || adv.id.toString())))
                      .map((adv) => (
                        <option key={adv.id} value={adv.advisor_id || adv.id}>{adv.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Selected Co-advisors chips */}
              {selectedCoAdvisors.length > 0 && (
                <div className="pt-2 border-t border-purple-100/40 space-y-1.5">
                  <span className="text-[11px] font-semibold text-purple-900 block">รายชื่ออาจารย์ที่ปรึกษาร่วม:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCoAdvisors.map((coAdv) => (
                      <span key={coAdv.advisor_id || coAdv.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-indigo-200 text-indigo-800 shadow-xs">
                        <span>{coAdv.name}</span>
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded font-normal">ร่วม</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveCoAdvisor(coAdv.advisor_id || coAdv.id)} 
                          className="w-4 h-4 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px]"
                          title="ลบอาจารย์ร่วม"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                    const badge = getDisplayBadge(selectedProjectForDetails);
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
                        <span>แก้ไขโครงการ</span>
                      </Button>
                    )}
                  </div>
                </div>
                <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900 mt-3 leading-snug">
                  {selectedProjectForDetails.title_th}
                </DialogTitle>
                <p className="text-sm text-gray-400 font-medium italic mt-1.5 leading-snug">{selectedProjectForDetails.title_en}</p>
              </DialogHeader>

              {/* Requirement 3 & 4: Approval Status Banner & Action Boxes */}
              {(() => {
                const appStatus = (selectedProjectForDetails.approval_status || 'draft').toLowerCase();
                const isAdvisor = isAdvisorOfProject(selectedProjectForDetails);
                const isStudentOwner = isMyProject(selectedProjectForDetails) && (user?.role === 'student' || user?.role === 'alumni');
                const isAdmin = user?.role === 'admin';

                // Advisor Action Bar when Pending Approval
                if ((isAdvisor || isAdmin) && appStatus === 'pending_approval') {
                  return (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Clock size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-amber-950">คำขออนุมัติโครงงานจากนักศึกษา</span>
                          <p className="text-[11px] text-amber-800">
                            ส่งคำขอเมื่อ {selectedProjectForDetails.approval_requested_at ? new Date(selectedProjectForDetails.approval_requested_at).toLocaleString('th-TH') : '-'} • หน้าต่างนี้เป็นโหมดอ่านอย่างเดียว (Read Only)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleOpenRejectModal(selectedProjectForDetails)}
                          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs h-9 px-3.5 shadow-sm font-semibold flex items-center gap-1.5"
                        >
                          <XCircle size={14} />
                          <span>✕ ไม่อนุมัติ</span>
                        </Button>
                        <Button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleApprove(selectedProjectForDetails.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-4 shadow-sm font-semibold flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} />
                          <span>✓ อนุมัติโครงการ</span>
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Student / General Status Banners
                if (appStatus === 'pending_approval') {
                  return (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Clock size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-amber-900">🟡 รออาจารย์อนุมัติโครงการ</span>
                          <p className="text-[11px] text-amber-700">
                            ส่งคำขออนุมัติแล้วเมื่อ {selectedProjectForDetails.approval_requested_at ? new Date(selectedProjectForDetails.approval_requested_at).toLocaleString('th-TH') : '-'} กำลังอยู่ระหว่างการพิจารณา ห้ามแก้ไขข้อมูล
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (appStatus === 'rejected') {
                  return (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertCircle size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-rose-900">🔴 ไม่อนุมัติโครงการ</span>
                            <div className="mt-1.5 text-xs text-rose-900 bg-white/90 p-3 rounded-xl border border-rose-200 font-medium">
                              <span className="font-bold text-rose-950">เหตุผลที่ไม่อนุมัติ: </span>
                              <span>"{selectedProjectForDetails.rejection_reason || 'ไม่มีการระบุเหตุผล'}"</span>
                            </div>
                            <p className="text-[11px] text-rose-600 mt-1.5">
                              พิจารณาโดย {selectedProjectForDetails.rejected_by || 'อาจารย์ที่ปรึกษา'} เมื่อ {selectedProjectForDetails.rejected_at ? new Date(selectedProjectForDetails.rejected_at).toLocaleString('th-TH') : '-'}
                            </p>
                          </div>
                        </div>
                        {canEditProject(selectedProjectForDetails) && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              onClick={() => {
                                const p = selectedProjectForDetails;
                                setIsDetailsOpen(false);
                                handleOpenEdit(p);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-rose-200 text-rose-800 hover:bg-rose-100 rounded-xl text-xs h-9 px-3"
                            >
                              <Edit2 size={13} className="mr-1" />
                              แก้ไขโครงการ
                            </Button>
                            <Button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleSubmitApproval(selectedProjectForDetails.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 px-3.5 shadow-sm font-semibold flex items-center gap-1.5"
                            >
                              <Send size={13} />
                              ขออนุมัติใหม่
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (appStatus === 'draft') {
                  return (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800">โครงงานนี้อยู่ในสถานะ: แบบร่าง (Draft)</span>
                          <p className="text-[11px] text-slate-500">กรุณาตรวจสอบข้อมูลให้ครบถ้วนก่อนส่งขออนุมัติจากอาจารย์ที่ปรึกษา</p>
                        </div>
                      </div>
                      {canEditProject(selectedProjectForDetails) && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => {
                              const p = selectedProjectForDetails;
                              setIsDetailsOpen(false);
                              handleOpenEdit(p);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs h-9 px-3"
                          >
                            <Edit2 size={13} className="mr-1" />
                            แก้ไขโครงการ
                          </Button>
                          <Button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleSubmitApproval(selectedProjectForDetails.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 px-3.5 shadow-sm font-semibold flex items-center gap-1.5"
                          >
                            <Send size={13} />
                            ขออนุมัติโครงการ
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                }

                if (appStatus === 'approved') {
                  const isAdvisorOfProject = (user?.role === 'advisor' || user?.role === 'teacher') && (
                    selectedProjectForDetails.advisor_profile_id === user?.username ||
                    selectedProjectForDetails.advisor?.advisor_id === user?.username ||
                    selectedProjectForDetails.main_advisor?.advisor_id === user?.username ||
                    selectedProjectForDetails.advisors?.some(a => a.advisor_id === user?.username || a.profile_id === user?.username)
                  );
                  const isStudentOwner = isMyProject(selectedProjectForDetails);
                  const canChangeStatus = user?.role === 'admin' || isAdvisorOfProject || isStudentOwner;
                  const isWaitingStart = selectedProjectForDetails.status?.toLowerCase() === 'approved' || selectedProjectForDetails.status?.toLowerCase() === 'draft';

                  return (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-900">🟢 โครงงานได้รับการอนุมัติแล้ว</span>
                          <p className="text-[11px] text-emerald-700">
                            อนุมัติโดย {selectedProjectForDetails.approved_by || 'อาจารย์ที่ปรึกษา'} เมื่อ {selectedProjectForDetails.approved_at ? new Date(selectedProjectForDetails.approved_at).toLocaleString('th-TH') : '-'}
                          </p>
                        </div>
                      </div>
                      {canChangeStatus && isWaitingStart && (
                        <Button
                          size="sm"
                          disabled={statusUpdating}
                          onClick={() => handleUpdateStatus(selectedProjectForDetails.id, 'in_progress')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 h-8 px-3.5 transition-all shrink-0"
                        >
                          <Activity size={14} className="animate-pulse" />
                          <span>{statusUpdating ? 'กำลังบันทึก...' : 'เริ่มดำเนินการโครงงาน (In Progress)'}</span>
                        </Button>
                      )}
                    </div>
                  );
                }

                return null;
              })()}

              {/* Status Workflow Progress Tracker */}
              <div className="bg-purple-50/40 border border-purple-100/60 p-4 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-purple-600" />
                    ลำดับขั้นตอนการดำเนินงานโครงงาน (Lifecycle Progress)
                  </h5>
                  {(() => {
                    // ปรับปรุงสถานะ: แสดงเฉพาะ Admin หรือ อาจารย์ที่ปรึกษา (Role นักศึกษาจะใช้การกดเริ่มทำผ่าน Stepper)
                    const isAdvisorOfProject = (user?.role === 'advisor' || user?.role === 'teacher') && (
                      selectedProjectForDetails.advisor_profile_id === user?.username ||
                      selectedProjectForDetails.advisor?.advisor_id === user?.username ||
                      selectedProjectForDetails.main_advisor?.advisor_id === user?.username ||
                      selectedProjectForDetails.advisors?.some(a => a.advisor_id === user?.username || a.profile_id === user?.username)
                    );
                    const canShowDropdown = user?.role === 'admin' || isAdvisorOfProject;

                    if (!canShowDropdown) return null;

                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 font-medium">ปรับปรุงสถานะ:</span>
                        <select
                          disabled={statusUpdating}
                          value={selectedProjectForDetails.status?.toLowerCase() || 'draft'}
                          onChange={(e) => handleUpdateStatus(selectedProjectForDetails.id, e.target.value)}
                          className="h-8 rounded-lg border border-purple-200 bg-white px-2.5 text-xs text-purple-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm disabled:opacity-50"
                        >
                          {PROJECT_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {statusUpdating && <div className="w-3.5 h-3.5 rounded-full border-2 border-purple-300 border-t-purple-600 animate-spin" />}
                      </div>
                    );
                  })()}
                </div>

                {/* Visual Step Bar (Linear Stepper matching Image 2 & Interactive) */}
                <div className="overflow-x-auto py-2">
                  <div className="min-w-[620px] max-w-3xl mx-auto">
                    <div className="relative pt-1 pb-1">
                      {/* Connecting Line */}
                      {(() => {
                        const currentIdx = getProjectLifecycleIndex(selectedProjectForDetails);
                        const isAdvisorOfProject = (user?.role === 'advisor' || user?.role === 'teacher') && (
                          selectedProjectForDetails.advisor_profile_id === user?.username ||
                          selectedProjectForDetails.advisor?.advisor_id === user?.username ||
                          selectedProjectForDetails.main_advisor?.advisor_id === user?.username ||
                          selectedProjectForDetails.advisors?.some(a => a.advisor_id === user?.username || a.profile_id === user?.username)
                        );
                        const isStudentOwner = isMyProject(selectedProjectForDetails);
                        const isApproved = selectedProjectForDetails.approval_status === 'approved';
                        const canChangeStatus = user?.role === 'admin' || isAdvisorOfProject || (isStudentOwner && isApproved);
                        const isAdvisorOrAdmin = user?.role === 'admin' || isAdvisorOfProject;
                        const isWaitingStart = isApproved && (selectedProjectForDetails.status?.toLowerCase() === 'approved' || selectedProjectForDetails.status?.toLowerCase() === 'draft');

                        return (
                          <>
                            <div className="absolute top-[21px] -translate-y-1/2 left-[7.14%] right-[7.14%] h-[7px] bg-[#e5e7eb] rounded-full z-0 overflow-hidden pointer-events-none">
                              <div
                                className="h-full bg-[#6b7280] rounded-full transition-all duration-500 ease-in-out"
                                style={{
                                  width: `${(currentIdx / (PROJECT_LIFECYCLE_STEPS.length - 1)) * 100}%`
                                }}
                              />
                            </div>

                            <div className="relative z-10 grid grid-cols-7 gap-2">
                              {PROJECT_LIFECYCLE_STEPS.map((step, idx) => {
                                const isDone = idx < currentIdx;
                                const isCurrent = idx === currentIdx;
                                const StepIcon = step.icon;

                                // Specifically for "กำลังดำเนินการ" (In Progress):
                                const isNextInProgress = step.key === 'in_progress' && isWaitingStart && canChangeStatus;
                                const isClickableStep = (isAdvisorOrAdmin && isApproved && step.key !== 'draft' && step.key !== 'pending_approval' && !isCurrent) || isNextInProgress;

                                return (
                                  <div
                                    key={step.key}
                                    onClick={() => {
                                      if (isClickableStep && !statusUpdating) {
                                        handleUpdateStatus(selectedProjectForDetails.id, step.key);
                                      }
                                    }}
                                    className={`flex flex-col items-center text-center select-none ${isClickableStep ? 'cursor-pointer group' : ''}`}
                                    title={isNextInProgress ? 'คลิกเพื่อเริ่มดำเนินการโครงงาน (เปลี่ยนเป็นกำลังดำเนินการ)' : isClickableStep ? `คลิกเพื่อเปลี่ยนสถานะเป็น "${step.label}"` : step.label}
                                  >
                                    <div
                                      className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all bg-white relative ${
                                        isCurrent
                                          ? 'border-[2.5px] border-[#111111] text-[#111111] ring-4 ring-gray-900/15 scale-110 shadow-md font-bold'
                                          : isNextInProgress
                                            ? 'border-[2.5px] border-blue-600 text-blue-600 bg-blue-50 ring-4 ring-blue-400/40 scale-110 shadow-md animate-pulse hover:bg-blue-100 hover:scale-115'
                                            : isDone
                                              ? 'border-2 border-[#6b7280] text-[#374151] font-bold'
                                              : isClickableStep
                                                ? 'border-2 border-purple-300 text-purple-600 hover:border-purple-600 hover:scale-105 hover:bg-purple-50'
                                                : 'border-2 border-[#d1d5db] text-[#9ca3af] opacity-60'
                                      }`}
                                    >
                                      {isDone ? (
                                        <Check className="w-5 h-5 stroke-[2.5] text-[#374151]" />
                                      ) : (
                                        <StepIcon className={`w-5 h-5 ${isCurrent ? 'stroke-[2.2] text-[#111111]' : isNextInProgress ? 'stroke-[2.2] text-blue-600' : 'stroke-[1.8]'}`} />
                                      )}
                                    </div>

                                    <span className={`mt-2 text-xs font-semibold leading-tight text-center max-w-[85px] break-words ${
                                      isCurrent
                                        ? 'text-[#111111] font-bold'
                                        : isNextInProgress
                                          ? 'text-blue-700 font-bold'
                                          : isDone
                                            ? 'text-[#374151]'
                                            : 'text-gray-400'
                                    }`}>
                                      {step.label}
                                    </span>

                                    {/* Prominent Action Button directly on "กำลังดำเนินการ" */}
                                    {isNextInProgress && (
                                      <button
                                        type="button"
                                        disabled={statusUpdating}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(selectedProjectForDetails.id, 'in_progress');
                                        }}
                                        className="mt-1.5 px-2 py-0.5 text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md flex items-center gap-1 transition-all hover:scale-105 active:scale-95 whitespace-nowrap animate-bounce"
                                      >
                                        <span>▶ กดเริ่มทำ</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
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
                  <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={15} className="text-purple-600" />
                    อาจารย์ที่ปรึกษา ({1 + (selectedProjectForDetails.co_advisors?.length || 0)} ท่าน)
                  </h5>
                  <div className="bg-purple-50/20 border border-purple-100/30 p-4 rounded-xl space-y-3">
                    {/* Main Advisor */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600 text-white shadow-xs">
                          ที่ปรึกษาหลัก
                        </span>
                        <span className="text-sm font-bold text-purple-950">
                          {selectedProjectForDetails.main_advisor?.name || selectedProjectForDetails.advisor?.name || 'ยังไม่ระบุ'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 pl-1 mt-1">สาขาวิชา {selectedProjectForDetails.main_advisor?.department || selectedProjectForDetails.advisor?.department || '-'}</p>
                    </div>

                    {/* Co-advisors */}
                    {selectedProjectForDetails.co_advisors && selectedProjectForDetails.co_advisors.length > 0 && (
                      <div className="border-t border-purple-100/50 pt-2.5 space-y-2">
                        <span className="text-xs font-semibold text-purple-800">อาจารย์ที่ปรึกษาร่วม:</span>
                        {selectedProjectForDetails.co_advisors.map((coAdv, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white/70 p-2 rounded-lg border border-purple-100/50">
                            <div>
                              <span className="font-semibold text-gray-800">{coAdv.name}</span>
                              <span className="text-gray-400 text-[11px] block">{coAdv.department}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              ที่ปรึกษาร่วม
                            </span>
                          </div>
                        ))}
                      </div>
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

              {/* Requirement 9: Approval History & Audit Log */}
              <div className="space-y-3 pt-3 border-t border-purple-50">
                <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-600" />
                  ประวัติการพิจารณาและการขออนุมัติ (Approval History & Audit Log)
                </h5>
                {selectedProjectForDetails.approval_history && selectedProjectForDetails.approval_history.length > 0 ? (
                  <div className="space-y-2.5 bg-purple-50/20 border border-purple-100/40 p-4 rounded-2xl max-h-52 overflow-y-auto">
                    {selectedProjectForDetails.approval_history.map((log, idx) => {
                      const isSubmit = log.action === 'SUBMIT_APPROVAL';
                      const isApprove = log.action === 'APPROVE';
                      const isReject = log.action === 'REJECT';
                      return (
                        <div key={idx} className="flex items-start gap-3 text-xs bg-white p-3 rounded-xl border border-purple-50 shadow-xs">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isApprove ? 'bg-emerald-100 text-emerald-700' :
                            isReject ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {isApprove ? <CheckCircle size={14} /> : isReject ? <XCircle size={14} /> : <Send size={14} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-gray-800">
                                {isApprove ? 'อนุมัติโครงงาน' : isReject ? 'ไม่อนุมัติโครงงาน' : 'ยื่นขออนุมัติโครงงาน'}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {log.acted_at ? new Date(log.acted_at).toLocaleString('th-TH') : '-'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              ดำเนินการโดย: <span className="font-medium text-gray-700">{log.acted_by}</span>
                            </p>
                            {log.rejection_reason && (
                              <p className="mt-1.5 text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100 font-medium">
                                เหตุผล: {log.rejection_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic bg-purple-50/20 p-3.5 rounded-xl border border-purple-50">
                    ยังไม่มีประวัติการขออนุมัติโครงงานนี้
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Requirement 4: Rejection Reason Modal */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              ไม่อนุมัติโครงงาน
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              กรุณาระบุเหตุผลและข้อเสนอแนะในการไม่อนุมัติโครงงาน เพื่อให้นักศึกษานำไปปรับปรุงแก้ไขก่อนยื่นขออนุมัติใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="rejectionReason" className="text-xs font-semibold text-gray-700">
              เหตุผลในการไม่อนุมัติ / ข้อเสนอแนะในการปรับปรุง *
            </Label>
            <textarea
              id="rejectionReason"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="เช่น ขอบเขตของโครงงานยังกว้างเกินไป กรุณาระบุกลุ่มเป้าหมายและเทคโนโลยีที่จะใช้ให้ชัดเจน..."
              className="w-full rounded-xl border border-purple-100 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRejectModalOpen(false)}
              className="text-gray-500 hover:bg-gray-100 rounded-xl text-xs"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={actionLoading || !rejectionReason.trim()}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md text-xs font-semibold"
            >
              {actionLoading ? 'กำลังบันทึก...' : 'ยืนยันไม่อนุมัติ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
