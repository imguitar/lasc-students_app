import React, { useState, useEffect, useCallback } from 'react';
import {
  userManagementService,
  departmentService,
  facultyService,
  advisorService
} from '../services';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import {
  Users,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  BookOpen,
  UserX,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Ban,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  Mail,
  User,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  FileText,
  Filter
} from 'lucide-react';

const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const backendBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : '';
  return `${backendBase}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
};

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    subLabel: 'ผู้ดูแลระบบ',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-600'
  },
  advisor: {
    label: 'Teacher',
    subLabel: 'อาจารย์',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-600'
  },
  student: {
    label: 'Student',
    subLabel: 'นักศึกษา',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-600'
  },
  alumni: {
    label: 'Alumni',
    subLabel: 'ศิษย์เก่า',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500'
  }
};

const AUDIT_ACTION_CONFIG = {
  CREATE_USER: {
    label: 'สร้างบัญชีผู้ใช้',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  UPDATE_USER: {
    label: 'แก้ไขข้อมูลผู้ใช้',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  CHANGE_ROLE: {
    label: 'เปลี่ยนสิทธิ์ (Role)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  SUSPEND_USER: {
    label: 'ระงับบัญชีผู้ใช้',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  ACTIVATE_USER: {
    label: 'เปิดใช้งานบัญชี',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  RESET_PASSWORD: {
    label: 'รีเซ็ตรหัสผ่าน',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  DELETE_USER: {
    label: 'ลบบัญชีผู้ใช้',
    badgeClass: 'bg-red-100 text-red-800 border-red-200'
  }
};

const formatThaiDateTime = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return '-';
  }
};

const generateClientSecurePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!%*?&';
  const all = upper + lower + digits + special;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const arr = [pick(upper), pick(lower), pick(digits), pick(special)];
  for (let i = 4; i < 12; i++) arr.push(pick(all));
  return arr.sort(() => Math.random() - 0.5).join('');
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Tabs: 'users' | 'audit'
  const [activeTab, setActiveTab] = useState('users');

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    teacherCount: 0,
    studentCount: 0,
    alumniCount: 0,
    suspendedCount: 0,
    activeCount: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Reference Data
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Users Table State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    faculty_id: 'all',
    department_id: 'all',
    sortBy: 'username',
    sortOrder: 'asc',
    page: 1,
    limit: 15
  });
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 15
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    action: 'all',
    search: '',
    page: 1,
    limit: 20
  });
  const [auditPagination, setAuditPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1
  });

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [createForm, setCreateForm] = useState({
    role: 'student',
    prefix: 'นาย',
    first_name: '',
    last_name: '',
    student_id: '',
    username: '',
    email: '',
    faculty_id: '',
    department_id: '',
    phone: '',
    graduation_year: '',
    passwordMode: 'auto', // 'auto' | 'custom'
    password: '',
    must_change_password: true
  });
  const [createErrors, setCreateErrors] = useState({});

  // Edit User Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    prefix: '',
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    role: 'student',
    faculty_id: '',
    department_id: '',
    phone: '',
    isActive: true
  });
  const [editErrors, setEditErrors] = useState({});

  // Status Toggle Modal State
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState(null);
  const [resetMode, setResetMode] = useState('auto'); // 'auto' | 'custom'
  const [resetCustomPassword, setResetCustomPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetMustChange, setResetMustChange] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResultPassword, setResetResultPassword] = useState(null);
  const [copiedReset, setCopiedReset] = useState(false);

  // Delete User Modal State
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [deleteUserDetails, setDeleteUserDetails] = useState(null);
  const [loadingDeleteDetails, setLoadingDeleteDetails] = useState(false);
  const [deleteMode, setDeleteMode] = useState('soft'); // 'soft' | 'account_only'
  const [deleting, setDeleting] = useState(false);

  // Load Reference Data (Faculties & Departments)
  useEffect(() => {
    const loadRefData = async () => {
      try {
        const [facRes, deptRes] = await Promise.all([
          facultyService.getAll(),
          departmentService.getAll()
        ]);
        if (facRes?.success && Array.isArray(facRes.data)) {
          setFaculties(facRes.data);
        }
        if (deptRes?.success && Array.isArray(deptRes.data)) {
          setDepartments(deptRes.data);
        }
      } catch (err) {
        console.error('Error loading faculties/departments:', err);
      }
    };
    loadRefData();
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await userManagementService.getStats();
      if (res?.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userManagementService.getAll(filters);
      if (res?.success) {
        setUsers(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้';
      setError(msg);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: msg
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await userManagementService.getAuditLogs(auditFilters);
      if (res?.success) {
        setAuditLogs(res.data || []);
        if (res.pagination) {
          setAuditPagination(res.pagination);
        }
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดประวัติการดำเนินการได้'
      });
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // Search debounce or form submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput.trim(), page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      faculty_id: 'all',
      department_id: 'all',
      sortBy: 'username',
      sortOrder: 'asc',
      page: 1,
      limit: 15
    });
  };

  const handleCardQuickFilter = (roleValue, statusValue = 'all') => {
    setActiveTab('users');
    setFilters((prev) => ({
      ...prev,
      role: roleValue,
      status: statusValue,
      page: 1
    }));
  };

  const toggleSort = (field) => {
    setFilters((prev) => {
      if (prev.sortBy === field) {
        return {
          ...prev,
          sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
          page: 1
        };
      }
      return { ...prev, sortBy: field, sortOrder: 'asc', page: 1 };
    });
  };

  // ==========================================
  // Create User Handlers
  // ==========================================
  const handleOpenCreateModal = async () => {
    const defaultFac = faculties[0]?.id ? String(faculties[0].id) : '';
    const defaultDept = departments.find((d) => String(d.faculty_id) === defaultFac)?.id || departments[0]?.id || '';
    setCreatedCredentials(null);
    setCopiedCredential(false);
    setCreateErrors({});
    setCreateForm({
      role: 'student',
      prefix: 'นาย',
      first_name: '',
      last_name: '',
      student_id: '',
      username: '',
      email: '',
      faculty_id: defaultFac ? String(defaultFac) : '',
      department_id: defaultDept ? String(defaultDept) : '',
      phone: '',
      graduation_year: '',
      passwordMode: 'auto',
      password: generateClientSecurePassword(),
      must_change_password: true
    });
    setIsCreateOpen(true);
  };

  const handleCreateRoleChange = async (newRole) => {
    setCreateErrors({});
    const updates = { role: newRole };

    if (newRole === 'advisor') {
      updates.prefix = 'อ.';
      try {
        const nextIdRes = await advisorService.generateNextId();
        if (nextIdRes?.success && nextIdRes.nextId) {
          updates.username = nextIdRes.nextId;
          updates.student_id = nextIdRes.nextId;
          updates.email = `${nextIdRes.nextId.toLowerCase()}@sskru.ac.th`;
        }
      } catch (_) {
        // Ignore if next-id fails
      }
    } else if (newRole === 'admin') {
      updates.prefix = 'คุณ';
      updates.student_id = '';
    } else if (newRole === 'student' || newRole === 'alumni') {
      updates.prefix = 'นาย';
      updates.username = '';
      updates.student_id = '';
      updates.email = '';
    }

    setCreateForm((prev) => ({ ...prev, ...updates }));
  };

  const handleStudentIdChangeInCreate = (val) => {
    const clean = val.trim();
    setCreateForm((prev) => {
      const next = { ...prev, student_id: clean, username: clean };
      if (prev.role === 'student' && clean) {
        next.email = `stu${clean}@sskru.ac.th`;
      } else if (prev.role === 'alumni' && clean && (!prev.email || prev.email.includes('@alumni.sskru.ac.th') || prev.email.includes('stu'))) {
        next.email = `${clean}@alumni.sskru.ac.th`;
      }
      return next;
    });
    if (createErrors.student_id || createErrors.username) {
      setCreateErrors((prev) => ({ ...prev, student_id: null, username: null }));
    }
  };

  const validateCreateForm = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!createForm.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง';
    if (!createForm.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล';

    if (createForm.role === 'student' || createForm.role === 'alumni') {
      if (!createForm.student_id.trim()) {
        errs.student_id = 'กรุณากรอกรหัสนักศึกษา';
      } else if (!/^\d{8,13}$/.test(createForm.student_id.trim())) {
        errs.student_id = 'รหัสนักศึกษาต้องเป็นตัวเลข 8-13 หลัก';
      }
    }

    const effectiveUsername = (createForm.username || createForm.student_id).trim();
    if (!effectiveUsername) {
      errs.username = 'กรุณากรอก Username';
    } else if (effectiveUsername.length > 13 && createForm.role !== 'admin') {
      errs.username = 'Username / รหัสประจำตัวต้องไม่เกิน 13 ตัวอักษร';
    }

    if (!createForm.email.trim()) {
      errs.email = 'กรุณากรอกอีเมล';
    } else if (!emailRegex.test(createForm.email.trim())) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (['advisor', 'student', 'alumni'].includes(createForm.role)) {
      if (!createForm.department_id) {
        errs.department_id = 'กรุณาเลือกสาขาวิชา';
      }
    }

    if (createForm.passwordMode === 'custom') {
      if (!createForm.password || createForm.password.trim().length < 6) {
        errs.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      }
    }

    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setCreating(true);
    try {
      const effectiveUsername = (createForm.username || createForm.student_id).trim();
      const payload = {
        role: createForm.role,
        prefix: createForm.prefix,
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        student_id: createForm.student_id.trim() || effectiveUsername,
        username: effectiveUsername,
        email: createForm.email.trim(),
        faculty_id: createForm.faculty_id || undefined,
        department_id: createForm.department_id || undefined,
        phone: createForm.phone.trim(),
        graduation_year: createForm.graduation_year || undefined,
        auto_generate_password: createForm.passwordMode === 'auto',
        password: createForm.passwordMode === 'custom' ? createForm.password : undefined,
        must_change_password: createForm.must_change_password
      };

      const res = await userManagementService.create(payload);
      if (res?.success) {
        toast({
          title: 'สร้างบัญชีผู้ใช้งานสำเร็จ',
          description: `เพิ่มบัญชี ${res.data.full_name} (${res.data.username}) เรียบร้อยแล้ว`
        });

        const finalPass = res.data.generatedPassword || createForm.password;
        setCreatedCredentials({
          username: res.data.username,
          email: res.data.email,
          fullName: res.data.full_name,
          roleLabel: res.data.role_label,
          password: finalPass
        });

        fetchStats();
        fetchUsers();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'ไม่สามารถสร้างบัญชีผู้ใช้งานได้';
      const field = err.response?.data?.field;
      if (field) {
        setCreateErrors((prev) => ({ ...prev, [field]: msg }));
      }
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถสร้างบัญชีได้',
        description: msg
      });
    } finally {
      setCreating(false);
    }
  };

  // ==========================================
  // Edit User Handlers
  // ==========================================
  const handleOpenEditModal = (u) => {
    setEditingUser(u);
    setEditErrors({});
    setEditForm({
      prefix: u.prefix || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      username: u.username || '',
      email: u.email || '',
      role: u.role || 'student',
      faculty_id: u.faculty_id ? String(u.faculty_id) : '',
      department_id: u.department_id ? String(u.department_id) : '',
      phone: u.phone || '',
      isActive: u.isActive
    });
    setIsEditOpen(true);
  };

  const validateEditForm = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง';
    if (!editForm.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล';
    if (!editForm.username.trim()) errs.username = 'กรุณากรอก Username';
    if (!editForm.email.trim() || !emailRegex.test(editForm.email.trim())) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser || !validateEditForm()) return;

    setUpdating(true);
    try {
      const res = await userManagementService.update(editingUser.id, {
        prefix: editForm.prefix,
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        faculty_id: editForm.faculty_id || undefined,
        department_id: editForm.department_id || undefined,
        phone: editForm.phone.trim(),
        isActive: editForm.isActive
      });

      if (res?.success) {
        toast({
          title: 'บันทึกข้อมูลสำเร็จ',
          description: `อัปเดตข้อมูลของ ${res.data.full_name} เรียบร้อยแล้ว`
        });
        setIsEditOpen(false);
        setEditingUser(null);
        fetchStats();
        fetchUsers();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล';
      const field = err.response?.data?.field;
      if (field) {
        setEditErrors((prev) => ({ ...prev, [field]: msg }));
      }
      toast({
        variant: 'destructive',
        title: 'แก้ไขข้อมูลไม่สำเร็จ',
        description: msg
      });
    } finally {
      setUpdating(false);
    }
  };

  // ==========================================
  // Activate / Suspend Account Handlers
  // ==========================================
  const handleOpenStatusModal = (u) => {
    setStatusModalUser(u);
    setStatusReason('');
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusModalUser) return;
    setTogglingStatus(true);
    try {
      const nextStatus = !statusModalUser.isActive;
      const res = await userManagementService.updateStatus(
        statusModalUser.id,
        nextStatus,
        statusReason
      );
      if (res?.success) {
        toast({
          title: nextStatus ? 'เปิดใช้งานบัญชีสำเร็จ' : 'ระงับบัญชีสำเร็จ',
          description: res.message
        });
        setStatusModalUser(null);
        fetchStats();
        fetchUsers();
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'ดำเนินการไม่สำเร็จ',
        description: err.response?.data?.message || 'ไม่สามารถเปลี่ยนสถานะบัญชีได้'
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  // ==========================================
  // Reset Password Handlers
  // ==========================================
  const handleOpenResetModal = (u) => {
    setResetModalUser(u);
    setResetMode('auto');
    setResetCustomPassword('');
    setShowResetPassword(false);
    setResetMustChange(true);
    setResetResultPassword(null);
    setCopiedReset(false);
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser) return;

    if (resetMode === 'custom' && (!resetCustomPassword || resetCustomPassword.trim().length < 6)) {
      toast({
        variant: 'destructive',
        title: 'รหัสผ่านไม่ถูกต้อง',
        description: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
      return;
    }

    setResettingPassword(true);
    try {
      const res = await userManagementService.resetPassword(resetModalUser.id, {
        autoGenerate: resetMode === 'auto',
        newPassword: resetMode === 'custom' ? resetCustomPassword.trim() : undefined,
        mustChangePassword: resetMustChange
      });

      if (res?.success) {
        const finalPass = res.data.temporaryPassword || resetCustomPassword.trim();
        setResetResultPassword(finalPass);
        toast({
          title: 'รีเซ็ตรหัสผ่านสำเร็จ',
          description: `รีเซ็ตรหัสผ่านของ ${resetModalUser.username} เรียบร้อยแล้ว`
        });
        fetchUsers();
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'รีเซ็ตรหัสผ่านไม่สำเร็จ',
        description: err.response?.data?.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
      });
    } finally {
      setResettingPassword(false);
    }
  };

  // ==========================================
  // Delete User Handlers
  // ==========================================
  const handleOpenDeleteModal = async (u) => {
    setDeleteModalUser(u);
    setDeleteUserDetails(null);
    setDeleteMode('soft');
    setLoadingDeleteDetails(true);
    try {
      const res = await userManagementService.getById(u.id);
      if (res?.success) {
        setDeleteUserDetails(res.data);
        if (res.data.relations?.totalRelatedRecords > 0) {
          setDeleteMode('soft');
        } else {
          setDeleteMode('account_only');
        }
      }
    } catch (_) {
      // Fallback
    } finally {
      setLoadingDeleteDetails(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setDeleting(true);
    try {
      const res = await userManagementService.delete(deleteModalUser.id, deleteMode);
      if (res?.success) {
        toast({
          title: 'ดำเนินการสำเร็จ',
          description: res.message
        });
        setDeleteModalUser(null);
        setDeleteUserDetails(null);
        fetchStats();
        fetchUsers();
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'ไม่สามารถลบบัญชีได้',
        description: err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน'
      });
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (_) {
      // ignore
    }
  };

  // Security guard on frontend (in addition to PrivateRoute & Backend middleware)
  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p className="text-sm text-slate-600 mt-2">
            เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเข้าถึงและใช้งานระบบจัดการผู้ใช้งานได้
          </p>
        </div>
      </div>
    );
  }

  const filteredDepartmentsForFilter =
    filters.faculty_id && filters.faculty_id !== 'all'
      ? departments.filter((d) => String(d.faculty_id) === String(filters.faculty_id))
      : departments;

  const filteredDepartmentsForCreate =
    createForm.faculty_id
      ? departments.filter((d) => String(d.faculty_id) === String(createForm.faculty_id))
      : departments;

  const filteredDepartmentsForEdit =
    editForm.faculty_id
      ? departments.filter((d) => String(d.faculty_id) === String(editForm.faculty_id))
      : departments;

  const summaryCards = [
    {
      title: 'ผู้ใช้งานทั้งหมด',
      value: stats.totalUsers,
      subtitle: `เปิดใช้งาน ${stats.activeCount || 0} บัญชี`,
      icon: Users,
      color: 'from-purple-600 to-indigo-600',
      lightBg: 'bg-purple-50 text-purple-700 border-purple-100',
      onClick: () => handleCardQuickFilter('all', 'all'),
      active: filters.role === 'all' && filters.status === 'all'
    },
    {
      title: 'ผู้ดูแลระบบ (Admin)',
      value: stats.adminCount,
      subtitle: 'สิทธิ์บริหารจัดการระบบ',
      icon: ShieldCheck,
      color: 'from-violet-600 to-purple-600',
      lightBg: 'bg-violet-50 text-violet-700 border-violet-100',
      onClick: () => handleCardQuickFilter('admin', 'all'),
      active: filters.role === 'admin'
    },
    {
      title: 'อาจารย์ (Teacher)',
      value: stats.teacherCount,
      subtitle: 'อาจารย์ที่ปรึกษาและผู้สอน',
      icon: BookOpen,
      color: 'from-blue-600 to-cyan-600',
      lightBg: 'bg-blue-50 text-blue-700 border-blue-100',
      onClick: () => handleCardQuickFilter('advisor', 'all'),
      active: filters.role === 'advisor'
    },
    {
      title: 'นักศึกษา (Student)',
      value: stats.studentCount,
      subtitle: 'นักศึกษาปัจจุบันในระบบ',
      icon: UserCheck,
      color: 'from-emerald-600 to-teal-600',
      lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      onClick: () => handleCardQuickFilter('student', 'all'),
      active: filters.role === 'student'
    },
    {
      title: 'ศิษย์เก่า (Alumni)',
      value: stats.alumniCount,
      subtitle: 'สำเร็จการศึกษาแล้ว',
      icon: GraduationCap,
      color: 'from-amber-500 to-orange-500',
      lightBg: 'bg-amber-50 text-amber-700 border-amber-100',
      onClick: () => handleCardQuickFilter('alumni', 'all'),
      active: filters.role === 'alumni'
    },
    {
      title: 'บัญชีที่ถูกระงับ',
      value: stats.suspendedCount,
      subtitle: 'ระงับการใช้งานชั่วคราว',
      icon: UserX,
      color: 'from-rose-600 to-red-600',
      lightBg: 'bg-rose-50 text-rose-700 border-rose-100',
      onClick: () => handleCardQuickFilter('all', 'suspended'),
      active: filters.status === 'suspended'
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-purple-800/30">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-medium text-purple-200">
              <ShieldCheck size={14} className="text-amber-400" />
              <span>Admin Control Center • ระบบบริหารจัดการบัญชีและสิทธิ์ผู้ใช้งาน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              จัดการผู้ใช้งานระบบ <span className="text-purple-300 font-semibold text-xl sm:text-2xl">(User Management)</span>
            </h1>
            <p className="text-sm text-purple-200/80 max-w-2xl">
              บริหารจัดการบัญชีผู้ใช้งาน กำหนดสิทธิ์ตามบทบาท (Admin, Teacher, Student, Alumni) ควบคุมสถานะการใช้งาน และตรวจสอบประวัติการดำเนินการ (Audit Log)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                fetchStats();
                if (activeTab === 'users') fetchUsers();
                else fetchAuditLogs();
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
            >
              <RefreshCw size={16} className="mr-2" />
              รีเฟรชข้อมูล
            </Button>
            <Button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 rounded-xl px-5"
            >
              <Plus size={18} className="mr-1.5 stroke-[2.5]" />
              เพิ่มผู้ใช้งาน
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Dashboard Cards (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={card.onClick}
              className={`text-left group relative overflow-hidden rounded-2xl bg-white p-4 border transition-all duration-200 hover:shadow-md ${
                card.active
                  ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                  : 'border-slate-200/80 hover:border-purple-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 truncate">{card.title}</p>
                  <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {statsLoading ? (
                      <span className="inline-block w-12 h-7 bg-slate-100 animate-pulse rounded-md" />
                    ) : (
                      Number(card.value || 0).toLocaleString()
                    )}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${card.lightBg}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">{card.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            <span>รายชื่อผู้ใช้งานทั้งหมด</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">
              {Number(pagination.totalItems || 0).toLocaleString()}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-purple-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={16} />
            <span>ประวัติการดำเนินการ (Audit Log)</span>
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="text-xs text-slate-500">
            แสดงผลรายการที่{' '}
            <span className="font-semibold text-slate-800">
              {users.length === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1}
            </span>{' '}
            ถึง{' '}
            <span className="font-semibold text-slate-800">
              {(pagination.currentPage - 1) * pagination.limit + users.length}
            </span>{' '}
            จากทั้งหมด{' '}
            <span className="font-bold text-purple-700">
              {Number(pagination.totalItems || 0).toLocaleString()}
            </span>{' '}
            บัญชี
          </div>
        )}
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Box */}
              <form onSubmit={handleSearchSubmit} className="md:col-span-4 flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="ค้นหาชื่อ-นามสกุล, Username, Email, รหัสนักศึกษา..."
                    className="pl-9 rounded-xl border-slate-200 text-sm h-10"
                  />
                </div>
                <Button type="submit" className="rounded-xl bg-purple-600 hover:bg-purple-700 h-10 px-4">
                  ค้นหา
                </Button>
              </form>

              {/* Role Filter */}
              <div className="md:col-span-2">
                <select
                  value={filters.role}
                  onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value, page: 1 }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="all">ทุก Role (ทั้งหมด)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  <option value="advisor">Teacher (อาจารย์)</option>
                  <option value="student">Student (นักศึกษา)</option>
                  <option value="alumni">Alumni (ศิษย์เก่า)</option>
                </select>
              </div>

              {/* Account Status Filter */}
              <div className="md:col-span-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="all">ทุกสถานะบัญชี</option>
                  <option value="active">เปิดใช้งาน (Active)</option>
                  <option value="suspended">ถูกระงับ (Suspended)</option>
                </select>
              </div>

              {/* Department Filter */}
              <div className="md:col-span-2">
                <select
                  value={filters.department_id}
                  onChange={(e) => setFilters((prev) => ({ ...prev, department_id: e.target.value, page: 1 }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="all">ทุกสาขาวิชา</option>
                  {filteredDepartmentsForFilter.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort & Reset */}
              <div className="md:col-span-2 flex gap-2">
                <select
                  value={`${filters.sortBy}:${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split(':');
                    setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
                  }}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="createdAt:desc">สร้างล่าสุด</option>
                  <option value="createdAt:asc">สร้างเก่าสุด</option>
                  <option value="name:asc">ชื่อ ก-ฮ</option>
                  <option value="name:desc">ชื่อ ฮ-ก</option>
                  <option value="username:asc">Username A-Z</option>
                  <option value="role:asc">เรียงตาม Role</option>
                  <option value="status:asc">เรียงตามสถานะ</option>
                </select>
                {(filters.search ||
                  filters.role !== 'all' ||
                  filters.status !== 'all' ||
                  filters.department_id !== 'all') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearFilters}
                    className="h-10 px-3 rounded-xl text-xs text-slate-600 shrink-0"
                  >
                    ล้างตัวกรอง
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between text-rose-700">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUsers} className="border-rose-300 text-rose-700">
                ลองใหม่
              </Button>
            </div>
          )}

          {/* Users Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[1050px]">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-purple-700"
                      >
                        <span>ผู้ใช้งาน (ชื่อ-นามสกุล)</span>
                        <ArrowUpDown size={13} />
                      </button>
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('username')}
                        className="inline-flex items-center gap-1 hover:text-purple-700"
                      >
                        <span>Username / Email</span>
                        <ArrowUpDown size={13} />
                      </button>
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">รหัสนักศึกษา</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('role')}
                        className="inline-flex items-center gap-1 hover:text-purple-700"
                      >
                        <span>Role</span>
                        <ArrowUpDown size={13} />
                      </button>
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">สาขาวิชา / คณะ</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1 hover:text-purple-700"
                      >
                        <span>สถานะบัญชี</span>
                        <ArrowUpDown size={13} />
                      </button>
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('createdAt')}
                        className="inline-flex items-center gap-1 hover:text-purple-700"
                      >
                        <span>วันที่สร้าง / ผู้สร้าง</span>
                        <ArrowUpDown size={13} />
                      </button>
                    </th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-200" />
                            <div className="space-y-1.5">
                              <div className="w-32 h-4 bg-slate-200 rounded" />
                              <div className="w-20 h-3 bg-slate-100 rounded" />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="w-28 h-4 bg-slate-200 rounded mb-1.5" />
                          <div className="w-36 h-3 bg-slate-100 rounded" />
                        </td>
                        <td className="py-4 px-4"><div className="w-24 h-4 bg-slate-100 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-20 h-6 bg-slate-200 rounded-full" /></td>
                        <td className="py-4 px-4"><div className="w-36 h-4 bg-slate-100 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-20 h-6 bg-slate-200 rounded-full" /></td>
                        <td className="py-4 px-4"><div className="w-28 h-4 bg-slate-100 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-28 h-8 bg-slate-100 rounded-lg ml-auto" /></td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-3">
                          <Users size={26} />
                        </div>
                        <p className="text-base font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไข</p>
                        <p className="text-xs text-slate-500 mt-1">
                          ลองเปลี่ยนคำค้นหา หรือกดปุ่มล้างตัวกรองเพื่อแสดงผู้ใช้งานทั้งหมด
                        </p>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const roleInfo = ROLE_CONFIG[u.role] || ROLE_CONFIG.student;
                      const isSelf = currentUser?.id === u.id;
                      const initials = (
                        (u.first_name ? u.first_name.charAt(0) : u.username.charAt(0)) +
                        (u.last_name ? u.last_name.charAt(0) : '')
                      ).toUpperCase();

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-purple-50/30 transition-colors ${
                            !u.isActive ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          {/* Avatar + Full Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {u.avatar_url ? (
                                <img
                                  src={getFileUrl(u.avatar_url)}
                                  alt={u.full_name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-800 font-bold text-xs flex items-center justify-center border border-purple-200/60 shrink-0">
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate">{u.full_name}</span>
                                  {isSelf && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-600 text-white">
                                      คุณ
                                    </span>
                                  )}
                                  {u.is_department_head && (
                                    <span
                                      className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                                      title={`ประธานสาขา: ${u.head_of_department}`}
                                    >
                                      👑 ประธานสาขา
                                    </span>
                                  )}
                                </div>
                                {u.phone && (
                                  <div className="text-xs text-slate-500 mt-0.5">โทร: {u.phone}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Username & Email */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-semibold text-xs text-purple-900 bg-purple-50/80 border border-purple-100 px-2 py-0.5 rounded-md inline-block">
                              {u.username}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 truncate max-w-[220px]" title={u.email}>
                              {u.email}
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {u.role === 'student' || u.role === 'alumni' ? (
                              <span className="font-mono text-xs font-medium text-slate-700">
                                {u.student_id || u.username}
                              </span>
                            ) : u.role === 'advisor' ? (
                              <span className="text-xs text-slate-500 font-mono">
                                รหัสอาจารย์: {u.username}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${roleInfo.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${roleInfo.dotClass}`} />
                              {roleInfo.label} ({roleInfo.subLabel})
                            </span>
                          </td>

                          {/* Department / Faculty */}
                          <td className="py-3.5 px-4">
                            {u.department_name && u.department_name !== '-' ? (
                              <div className="max-w-[220px]">
                                <div className="text-xs font-semibold text-slate-800 truncate" title={u.department_name}>
                                  {u.department_name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate" title={u.faculty_name}>
                                  {u.faculty_name}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>

                          {/* Account Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                เปิดใช้งาน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                ถูกระงับ
                              </span>
                            )}
                          </td>

                          {/* Created Date & Creator */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-xs font-medium text-slate-700">
                              {formatThaiDateTime(u.createdAt)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[160px]" title={u.created_by}>
                              โดย: {u.created_by}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditModal(u)}
                                className="h-8 px-2.5 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                                title="แก้ไขข้อมูลผู้ใช้งาน"
                              >
                                <Edit2 size={15} />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenResetModal(u)}
                                className="h-8 px-2.5 text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg"
                                title="รีเซ็ตรหัสผ่าน"
                              >
                                <KeyRound size={15} />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => handleOpenStatusModal(u)}
                                className={`h-8 px-2.5 rounded-lg ${
                                  u.isActive
                                    ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                } disabled:opacity-30`}
                                title={
                                  isSelf
                                    ? 'ไม่สามารถระงับบัญชีตัวเองได้'
                                    : u.isActive
                                    ? 'ระงับการใช้งานบัญชีชั่วคราว'
                                    : 'เปิดใช้งานบัญชีอีกครั้ง'
                                }
                              >
                                {u.isActive ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => handleOpenDeleteModal(u)}
                                className="h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg disabled:opacity-30"
                                title={isSelf ? 'ไม่สามารถลบบัญชีตัวเองได้' : 'ลบบัญชีผู้ใช้งาน'}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>แสดงหน้าละ</span>
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      limit: parseInt(e.target.value, 10),
                      page: 1
                    }))
                  }
                  className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>รายการ • หน้า {pagination.currentPage} จาก {pagination.totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  className="h-8 px-3 rounded-lg text-xs"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  ก่อนหน้า
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(pagination.totalPages, prev.page + 1)
                    }))
                  }
                  className="h-8 px-3 rounded-lg text-xs"
                >
                  ถัดไป
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={auditFilters.search}
                  onChange={(e) =>
                    setAuditFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))
                  }
                  placeholder="ค้นหาชื่อผู้ดำเนินการ หรือบัญชีเป้าหมาย..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <select
                value={auditFilters.action}
                onChange={(e) =>
                  setAuditFilters((prev) => ({ ...prev, action: e.target.value, page: 1 }))
                }
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
              >
                <option value="all">ทุกประเภทการดำเนินการ</option>
                <option value="CREATE_USER">สร้างบัญชีผู้ใช้</option>
                <option value="UPDATE_USER">แก้ไขข้อมูลผู้ใช้</option>
                <option value="CHANGE_ROLE">เปลี่ยนสิทธิ์ (Role)</option>
                <option value="SUSPEND_USER">ระงับบัญชี</option>
                <option value="ACTIVATE_USER">เปิดใช้งานบัญชี</option>
                <option value="RESET_PASSWORD">รีเซ็ตรหัสผ่าน</option>
                <option value="DELETE_USER">ลบบัญชี</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              บันทึกทั้งหมด{' '}
              <span className="font-bold text-purple-700">
                {Number(auditPagination.totalItems || 0).toLocaleString()}
              </span>{' '}
              รายการ
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3.5 px-4">วันและเวลา</th>
                    <th className="py-3.5 px-4">การดำเนินการ</th>
                    <th className="py-3.5 px-4">ผู้ดำเนินการ (Admin)</th>
                    <th className="py-3.5 px-4">บัญชีเป้าหมาย</th>
                    <th className="py-3.5 px-4">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                        กำลังโหลดประวัติการดำเนินการ...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center">
                        <History size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">ยังไม่มีประวัติการดำเนินการ</p>
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const actionInfo = AUDIT_ACTION_CONFIG[log.action] || {
                        label: log.action,
                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
                      };
                      const d = log.details || {};
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {formatThaiDateTime(log.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${actionInfo.badgeClass}`}
                            >
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs font-bold text-slate-800">
                              {log.actor_name || log.actor_username}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              @{log.actor_username}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-xs font-bold text-slate-800">
                              {log.target_name || log.target_username}
                            </div>
                            <div className="text-[11px] font-mono text-purple-700">
                              @{log.target_username}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {log.action === 'CREATE_USER' && (
                              <span>
                                สร้างบัญชีสิทธิ์ <b>{d.roleLabel || d.role}</b> ({d.email})
                                {d.department ? ` • ${d.department}` : ''}
                              </span>
                            )}
                            {log.action === 'CHANGE_ROLE' && (
                              <span>
                                เปลี่ยน Role จาก <b>{d.oldRoleLabel || d.oldRole}</b> เป็น{' '}
                                <b className="text-purple-700">{d.newRoleLabel || d.newRole}</b>
                              </span>
                            )}
                            {log.action === 'UPDATE_USER' && (
                              <span>
                                แก้ไขข้อมูลผู้ใช้งาน{' '}
                                {d.changes ? `(${Object.keys(d.changes).join(', ')})` : ''}
                              </span>
                            )}
                            {(log.action === 'SUSPEND_USER' || log.action === 'ACTIVATE_USER') && (
                              <span>
                                เปลี่ยนสถานะเป็น <b>{d.newStatus}</b>
                                {d.reason ? ` • เหตุผล: ${d.reason}` : ''}
                              </span>
                            )}
                            {log.action === 'RESET_PASSWORD' && (
                              <span>
                                รีเซ็ตรหัสผ่าน ({d.method === 'auto_generated_secure' ? 'สุ่มรหัสผ่านปลอดภัย' : 'กำหนดรหัสใหม่'})
                                {d.mustChangePassword ? ' • บังคับเปลี่ยนรหัสเมื่อเข้าสู่ระบบ' : ''}
                              </span>
                            )}
                            {log.action === 'DELETE_USER' && (
                              <span>
                                {d.reason || d.note || `โหมด: ${d.deleteMode}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: CREATE USER (+ เพิ่มผู้ใช้งาน)
         ===================================================================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Plus size={20} />
              </div>
              <span>เพิ่มบัญชีผู้ใช้งานใหม่</span>
            </DialogTitle>
            <DialogDescription>
              เลือกประเภทผู้ใช้งาน (Role) และกรอกข้อมูลให้ครบถ้วน รหัสผ่านทั้งหมดจะถูกเข้ารหัสด้วย bcrypt ก่อนบันทึกลงฐานข้อมูล
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="space-y-4 py-3">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                  <span>สร้างบัญชีผู้ใช้งานเรียบร้อยแล้ว!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  กรุณาคัดลอกข้อมูลบัญชีและรหัสผ่านเริ่มต้นด้านล่างเพื่อแจ้งให้ผู้ใช้งานทราบ (ระบบจะไม่แสดงรหัสผ่านนี้อีก)
                </p>
                <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ชื่อ-นามสกุล:</span>
                    <span className="font-bold text-slate-900">{createdCredentials.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ประเภทบัญชี (Role):</span>
                    <span className="font-semibold text-purple-700">{createdCredentials.roleLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Username:</span>
                    <span className="font-mono font-bold text-slate-900">{createdCredentials.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-800">{createdCredentials.email}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500">รหัสผ่านเริ่มต้น:</span>
                    <div className="flex items-center gap-2">
                      <code className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono font-bold">
                        {createdCredentials.password}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(
                            `Username: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`,
                            setCopiedCredential
                          )
                        }
                        className="h-8 rounded-lg text-xs"
                      >
                        {copiedCredential ? (
                          <>
                            <Check size={14} className="mr-1 text-emerald-600" /> คัดลอกแล้ว
                          </>
                        ) : (
                          <>
                            <Copy size={14} className="mr-1" /> คัดลอก
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenCreateModal}
                  className="rounded-xl"
                >
                  เพิ่มผู้ใช้งานคนถัดไป
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  เสร็จสิ้น
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Role Selection Pills */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase">
                  1. เลือกประเภทบัญชีผู้ใช้งาน (Role) <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'student', title: 'Student', desc: 'นักศึกษา' },
                    { key: 'alumni', title: 'Alumni', desc: 'ศิษย์เก่า' },
                    { key: 'advisor', title: 'Teacher', desc: 'อาจารย์' },
                    { key: 'admin', title: 'Admin', desc: 'ผู้ดูแลระบบ' }
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => handleCreateRoleChange(r.key)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        createForm.role === r.key
                          ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20'
                          : 'bg-white border-slate-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-500">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Name */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold">คำนำหน้า</Label>
                  <select
                    value={createForm.prefix}
                    onChange={(e) => setCreateForm((p) => ({ ...p, prefix: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="นาง">นาง</option>
                    <option value="อ.">อ.</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ผศ.">ผศ.</option>
                    <option value="ผศ.ดร.">ผศ.ดร.</option>
                    <option value="รศ.ดร.">รศ.ดร.</option>
                    <option value="คุณ">คุณ</option>
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs font-semibold">
                    ชื่อจริง <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={createForm.first_name}
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, first_name: e.target.value }));
                      if (createErrors.first_name) setCreateErrors((p) => ({ ...p, first_name: null }));
                    }}
                    placeholder="เช่น สมชาย"
                    className="rounded-xl"
                  />
                  {createErrors.first_name && (
                    <p className="text-xs text-rose-600">{createErrors.first_name}</p>
                  )}
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-xs font-semibold">
                    นามสกุล <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={createForm.last_name}
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, last_name: e.target.value }));
                      if (createErrors.last_name) setCreateErrors((p) => ({ ...p, last_name: null }));
                    }}
                    placeholder="เช่น ใจดี"
                    className="rounded-xl"
                  />
                  {createErrors.last_name && (
                    <p className="text-xs text-rose-600">{createErrors.last_name}</p>
                  )}
                </div>
              </div>

              {/* Dynamic ID & Username & Email by Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(createForm.role === 'student' || createForm.role === 'alumni') && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      รหัสนักศึกษา <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={createForm.student_id}
                      onChange={(e) => handleStudentIdChangeInCreate(e.target.value)}
                      placeholder="เช่น 6612345678"
                      maxLength={13}
                      className="rounded-xl font-mono"
                    />
                    {createErrors.student_id && (
                      <p className="text-xs text-rose-600">{createErrors.student_id}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    Username สำหรับเข้าสู่ระบบ <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={createForm.username}
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, username: e.target.value.trim() }));
                      if (createErrors.username) setCreateErrors((p) => ({ ...p, username: null }));
                    }}
                    placeholder={
                      createForm.role === 'advisor'
                        ? 'เช่น AD015'
                        : createForm.role === 'admin'
                        ? 'เช่น admin_staff'
                        : 'ซิงก์จากรหัสนักศึกษาอัตโนมัติ'
                    }
                    className="rounded-xl font-mono"
                  />
                  {createErrors.username && (
                    <p className="text-xs text-rose-600">{createErrors.username}</p>
                  )}
                </div>

                <div className={createForm.role === 'student' || createForm.role === 'alumni' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                  <Label className="text-xs font-semibold">
                    อีเมล (Email) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, email: e.target.value }));
                      if (createErrors.email) setCreateErrors((p) => ({ ...p, email: null }));
                    }}
                    placeholder="example@sskru.ac.th"
                    className="rounded-xl"
                  />
                  {createErrors.email && (
                    <p className="text-xs text-rose-600">{createErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Faculty & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    คณะ {createForm.role !== 'admin' && <span className="text-rose-500">*</span>}
                  </Label>
                  <select
                    value={createForm.faculty_id}
                    onChange={(e) => {
                      const facId = e.target.value;
                      const firstDept = departments.find((d) => String(d.faculty_id) === String(facId));
                      setCreateForm((p) => ({
                        ...p,
                        faculty_id: facId,
                        department_id: firstDept ? String(firstDept.id) : ''
                      }));
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">-- เลือกคณะ --</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.faculty_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">
                    สาขาวิชา {createForm.role !== 'admin' && <span className="text-rose-500">*</span>}
                  </Label>
                  <select
                    value={createForm.department_id}
                    onChange={(e) => {
                      setCreateForm((p) => ({ ...p, department_id: e.target.value }));
                      if (createErrors.department_id) {
                        setCreateErrors((p) => ({ ...p, department_id: null }));
                      }
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">-- เลือกสาขาวิชา --</option>
                    {filteredDepartmentsForCreate.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                  {createErrors.department_id && (
                    <p className="text-xs text-rose-600">{createErrors.department_id}</p>
                  )}
                </div>
              </div>

              {/* Optional Phone & Graduation Year for Alumni */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">เบอร์โทรศัพท์ (ถ้ามี)</Label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="เช่น 0812345678"
                    className="rounded-xl"
                  />
                </div>

                {createForm.role === 'alumni' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">ปีการศึกษาที่จบ (พ.ศ.)</Label>
                    <Input
                      type="number"
                      value={createForm.graduation_year}
                      onChange={(e) => setCreateForm((p) => ({ ...p, graduation_year: e.target.value }))}
                      placeholder="เช่น 2568 (คำนวณอัตโนมัติได้)"
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Password Configuration */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <Label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <KeyRound size={14} className="text-purple-600" />
                  <span>ตั้งค่ารหัสผ่านเริ่มต้น (เข้ารหัสด้วย bcrypt)</span>
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm((p) => ({ ...p, passwordMode: 'auto' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      createForm.passwordMode === 'auto'
                        ? 'bg-purple-50 border-purple-600 font-bold text-purple-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-600" />
                      <span>สุ่มรหัสผ่านที่ปลอดภัยอัตโนมัติ (แนะนำ)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm((p) => ({ ...p, passwordMode: 'custom', password: '' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      createForm.passwordMode === 'custom'
                        ? 'bg-purple-50 border-purple-600 font-bold text-purple-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Lock size={14} className="text-purple-600" />
                      <span>กำหนดรหัสผ่านเริ่มต้นด้วยตนเอง</span>
                    </div>
                  </button>
                </div>

                {createForm.passwordMode === 'custom' && (
                  <div className="space-y-1">
                    <div className="relative">
                      <Input
                        type={showCreatePassword ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm((p) => ({ ...p, password: e.target.value }))
                        }
                        placeholder="กรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร"
                        className="rounded-xl pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {createErrors.password && (
                      <p className="text-xs text-rose-600">{createErrors.password}</p>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.must_change_password}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, must_change_password: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span>กำหนดให้ผู้ใช้งานเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</span>
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6"
                >
                  {creating ? 'กำลังสร้างบัญชี...' : 'บันทึกและสร้างบัญชี'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 2: EDIT USER (แก้ไขข้อมูลผู้ใช้งานและสิทธิ์)
         ===================================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit2 size={18} className="text-purple-600" />
              <span>แก้ไขข้อมูลบัญชีผู้ใช้งาน</span>
            </DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลส่วนตัว อีเมล สิทธิ์การใช้งาน (Role) และสังกัดคณะ/สาขาวิชา
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3 space-y-1">
                <Label className="text-xs font-semibold">คำนำหน้า</Label>
                <Input
                  value={editForm.prefix}
                  onChange={(e) => setEditForm((p) => ({ ...p, prefix: e.target.value }))}
                  placeholder="นาย/น.ส./อ."
                  className="rounded-xl"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold">ชื่อจริง *</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                  className="rounded-xl"
                />
                {editErrors.first_name && (
                  <p className="text-xs text-rose-600">{editErrors.first_name}</p>
                )}
              </div>
              <div className="sm:col-span-5 space-y-1">
                <Label className="text-xs font-semibold">นามสกุล *</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                  className="rounded-xl"
                />
                {editErrors.last_name && (
                  <p className="text-xs text-rose-600">{editErrors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Username *</Label>
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                  className="rounded-xl font-mono"
                />
                {editErrors.username && (
                  <p className="text-xs text-rose-600">{editErrors.username}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="rounded-xl"
                />
                {editErrors.email && (
                  <p className="text-xs text-rose-600">{editErrors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">สิทธิ์ผู้ใช้งาน (Role) *</Label>
                <select
                  value={editForm.role}
                  disabled={editingUser?.id === currentUser?.id}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm disabled:bg-slate-100"
                >
                  <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  <option value="advisor">Teacher (อาจารย์)</option>
                  <option value="student">Student (นักศึกษา)</option>
                  <option value="alumni">Alumni (ศิษย์เก่า)</option>
                </select>
                {editingUser?.id === currentUser?.id && (
                  <p className="text-[11px] text-amber-700">
                    ไม่สามารถลดสิทธิ์ (Role) ของบัญชีตัวเองได้
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">เบอร์โทรศัพท์</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">คณะ</Label>
                <select
                  value={editForm.faculty_id}
                  onChange={(e) => {
                    const facId = e.target.value;
                    const firstDept = departments.find((d) => String(d.faculty_id) === String(facId));
                    setEditForm((p) => ({
                      ...p,
                      faculty_id: facId,
                      department_id: firstDept ? String(firstDept.id) : ''
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="">-- เลือกคณะ --</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.faculty_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">สาขาวิชา</Label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, department_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="">-- เลือกสาขาวิชา --</option>
                  {filteredDepartmentsForEdit.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={updating}
                className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6"
              >
                {updating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 3: ACTIVATE / SUSPEND ACCOUNT
         ===================================================================== */}
      <Dialog open={!!statusModalUser} onOpenChange={(open) => !open && setStatusModalUser(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {statusModalUser?.isActive ? (
                <>
                  <Ban size={20} className="text-rose-600" />
                  <span>ยืนยันการระงับบัญชีผู้ใช้งาน</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} className="text-emerald-600" />
                  <span>ยืนยันการเปิดใช้งานบัญชี</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {statusModalUser?.isActive
                ? `เมื่อระงับบัญชี ผู้ใช้ "${statusModalUser?.full_name}" (${statusModalUser?.username}) จะไม่สามารถเข้าสู่ระบบได้ชั่วคราว จนกว่า Admin จะเปิดใช้งานอีกครั้ง`
                : `เปิดสิทธิ์ให้ "${statusModalUser?.full_name}" (${statusModalUser?.username}) กลับมาเข้าสู่ระบบได้ตามปกติ`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">หมายเหตุ / เหตุผล (บันทึกใน Audit Log)</Label>
            <Input
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="ระบุเหตุผลเพิ่มเติม (ถ้ามี)..."
              className="rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusModalUser(null)}
              className="rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={togglingStatus}
              onClick={handleConfirmStatusToggle}
              className={`rounded-xl ${
                statusModalUser?.isActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {togglingStatus
                ? 'กำลังดำเนินการ...'
                : statusModalUser?.isActive
                ? 'ยืนยันการระงับบัญชี'
                : 'ยืนยันการเปิดใช้งาน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 4: RESET PASSWORD (รีเซ็ตรหัสผ่านอย่างปลอดภัย)
         ===================================================================== */}
      <Dialog open={!!resetModalUser} onOpenChange={(open) => !open && setResetModalUser(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <KeyRound size={20} className="text-amber-600" />
              <span>รีเซ็ตรหัสผ่านผู้ใช้งาน</span>
            </DialogTitle>
            <DialogDescription>
              รีเซ็ตรหัสผ่านสำหรับ <b>{resetModalUser?.full_name}</b> (@{resetModalUser?.username}) โดยระบบจะไม่แสดงรหัสผ่านเดิมเพื่อความปลอดภัย
            </DialogDescription>
          </DialogHeader>

          {resetResultPassword ? (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                <div className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>รีเซ็ตรหัสผ่านเรียบร้อยแล้ว</span>
                </div>
                <p className="text-xs text-amber-800">
                  กรุณาคัดลอกรหัสผ่านใหม่ด้านล่างเพื่อส่งให้เจ้าของบัญชี:
                </p>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200">
                  <code className="font-mono font-bold text-base text-slate-900">
                    {resetResultPassword}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(resetResultPassword, setCopiedReset)}
                    className="h-8 rounded-lg text-xs"
                  >
                    {copiedReset ? (
                      <>
                        <Check size={14} className="mr-1 text-emerald-600" /> คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1" /> คัดลอก
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl w-full"
                >
                  ปิดหน้าต่าง
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">เลือกรูปแบบการรีเซ็ตรหัสผ่าน</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetMode('auto')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      resetMode === 'auto'
                        ? 'bg-purple-50 border-purple-600 font-bold text-purple-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-purple-600" />
                      <span>สร้างรหัสผ่านชั่วคราวที่ปลอดภัยอัตโนมัติ (แนะนำ)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetMode('custom')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      resetMode === 'custom'
                        ? 'bg-purple-50 border-purple-600 font-bold text-purple-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-purple-600" />
                      <span>กำหนดรหัสผ่านใหม่ด้วยตนเอง</span>
                    </div>
                  </button>
                </div>
              </div>

              {resetMode === 'custom' && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</Label>
                  <div className="relative">
                    <Input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetCustomPassword}
                      onChange={(e) => setResetCustomPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่..."
                      className="rounded-xl pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetMustChange}
                  onChange={(e) => setResetMustChange(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600"
                />
                <span>บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</span>
              </label>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetModalUser(null)}
                  className="rounded-xl"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={resettingPassword}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
                >
                  {resettingPassword ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ตรหัสผ่าน'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL 5: DELETE USER CONFIRMATION (ตรวจสอบความสัมพันธ์และป้องกันข้อมูลหาย)
         ===================================================================== */}
      <Dialog open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle size={20} className="text-rose-600" />
              <span>ยืนยันการจัดการลบบัญชีผู้ใช้งาน</span>
            </DialogTitle>
            <DialogDescription>
              ตรวจสอบความสัมพันธ์ของบัญชี <b>{deleteModalUser?.full_name}</b> (@{deleteModalUser?.username}) ก่อนดำเนินการ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {loadingDeleteDetails ? (
              <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
                กำลังตรวจสอบความสัมพันธ์กับข้อมูลนักศึกษา โครงงาน และผลงาน...
              </div>
            ) : (
              deleteUserDetails?.relations && (
                <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileText size={15} />
                    <span>ผลการตรวจสอบข้อมูลที่เชื่อมโยงกับผู้ใช้งานนี้:</span>
                  </div>
                  <ul className="list-disc list-inside text-amber-800 space-y-1">
                    <li>
                      ข้อมูลโปรไฟล์ในฐานข้อมูล:{' '}
                      <b>{deleteUserDetails.relations.hasProfile ? 'มีข้อมูลโปรไฟล์' : 'ไม่มี'}</b>
                    </li>
                    <li>
                      โครงงานจบ / ที่ปรึกษาโครงงาน:{' '}
                      <b>
                        {deleteUserDetails.relations.projectsCreatedCount +
                          deleteUserDetails.relations.projectMembershipsCount +
                          deleteUserDetails.relations.projectAdvisingCount}{' '}
                        รายการ
                      </b>
                    </li>
                    <li>
                      ผลงานนักศึกษา (Portfolio) และประวัติฝึกงาน:{' '}
                      <b>
                        {deleteUserDetails.relations.studentProjectsCount +
                          deleteUserDetails.relations.internshipsCount}{' '}
                        รายการ
                      </b>
                    </li>
                  </ul>
                  <p className="text-[11px] text-amber-700 pt-1">
                    * ระบบป้องกันไม่ให้ลบข้อมูลนักศึกษา โครงงาน หรือผลงานที่เกี่ยวข้องโดยไม่ตั้งใจ
                  </p>
                </div>
              )
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">เลือกรูปแบบการดำเนินการ:</Label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setDeleteMode('soft')}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    deleteMode === 'soft'
                      ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">
                    1. Soft Delete — ระงับการใช้งานบัญชีถาวร (แนะนำ)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ปิดสิทธิ์การเข้าสู่ระบบทันที โดยเก็บประวัติบัญชี ข้อมูลนักศึกษา โครงงาน และผลงานไว้ครบถ้วน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteMode('account_only')}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    deleteMode === 'account_only'
                      ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs text-rose-800">
                    2. ลบบัญชีเข้าสู่ระบบ (คงข้อมูลนักศึกษา โครงงาน และผลงานไว้)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ลบบัญชีออกจากตารางผู้ใช้งาน (User) แต่ไม่ลบข้อมูลนักศึกษา โครงงาน หรือผลงานในระบบ
                  </div>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalUser(null)}
              className="rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              {deleting
                ? 'กำลังดำเนินการ...'
                : deleteMode === 'soft'
                ? 'ยืนยัน Soft Delete'
                : 'ยืนยันลบบัญชีผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;

