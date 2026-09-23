import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  User, Mail, Shield, Phone, Save, KeyRound, FileText, Download, Edit, 
  Plus, Trash2, Code2, Briefcase, FolderGit2, Award, ExternalLink, 
  CheckCircle2, BookOpen, Sparkles, Building2, Calendar, Layers, Star, 
  Clock, Globe, ArrowRight, RefreshCw, X, AlertCircle, Camera, UploadCloud, Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';
import { studentService, skillService, uploadService, projectService } from '../services';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';

const SKILL_LEVEL_BADGES = {
  beginner: { label: 'เริ่มต้น (Beginner)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  intermediate: { label: 'ปานกลาง (Intermediate)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  advanced: { label: 'เชี่ยวชาญ (Advanced)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const SKILL_CATEGORIES = [
  { id: 'programming', label: 'ภาษาโปรแกรมมิ่ง (Programming)' },
  { id: 'framework', label: 'เฟรมเวิร์ก & ไลบรารี (Framework/Library)' },
  { id: 'database', label: 'ฐานข้อมูล (Database)' },
  { id: 'tools', label: 'เครื่องมือและ DevOps (Tools & DevOps)' },
  { id: 'soft_skills', label: 'ทักษะด้านการทำงาน (Soft Skills)' },
  { id: 'language', label: 'ภาษาต่างประเทศ (Languages)' },
  { id: 'other', label: 'ทักษะอื่นๆ (Other)' }
];

const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
  return `${backendBase}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Avatar upload states
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview'); // overview, skills, projects, internship, thesis
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeSubmitLoading, setResumeSubmitLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Resume full data from backend
  const [resumeData, setResumeData] = useState(null);
  const [skillsList, setSkillsList] = useState([]);
  const [internshipsList, setInternshipsList] = useState([]);
  const [studentProjectsList, setStudentProjectsList] = useState([]);
  const [thesisProject, setThesisProject] = useState(null);
  const [masterSkills, setMasterSkills] = useState([]);

  // Dialog Controls
  const [isEditResumeOpen, setIsEditResumeOpen] = useState(false);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isAddInternshipOpen, setIsAddInternshipOpen] = useState(false);
  const [isEditThesisOpen, setIsEditThesisOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);

  // Forms
  const [resumeForm, setResumeForm] = useState({
    phone: '',
    first_name_en: '',
    last_name_en: '',
    bio: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: ''
  });

  const [skillForm, setSkillForm] = useState({
    skill_id: '',
    skill_name: '',
    category: 'programming',
    level: 'intermediate'
  });

  const [projectForm, setProjectForm] = useState({
    title: '',
    course_name: '',
    category: 'Coursework',
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
    description: '',
    technologies: '',
    github_url: '',
    demo_url: ''
  });

  const [editProjectForm, setEditProjectForm] = useState({
    title: '',
    course_name: '',
    category: 'Coursework',
    academic_year: new Date().getFullYear() + 543,
    semester: 1,
    description: '',
    technologies: '',
    github_url: '',
    demo_url: ''
  });

  const [thesisForm, setThesisForm] = useState({
    title_th: '',
    title_en: '',
    description: '',
    document_url: '',
    tags: ''
  });

  const [internshipForm, setInternshipForm] = useState({
    company_name: '',
    position: '',
    department: '',
    address: '',
    start_date: '',
    end_date: '',
    hours: '400',
    description: '',
    evaluation_status: 'passed'
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  });

  const [profileLoading, setProfileLoading] = useState(false);

  const studentIdentifier = user?.student_id || user?.username;

  useEffect(() => {
    if (user) {
      setResumeForm({
        phone: user.phone && user.phone !== user.username ? user.phone : '',
        first_name_en: user.first_name_en || '',
        last_name_en: user.last_name_en || '',
        bio: user.bio || user.objective || '',
        linkedin_url: user.linkedin || '',
        github_url: user.github || '',
        portfolio_url: user.portfolio_url || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && (user.role === 'student' || user.role === 'alumni')) {
      fetchFullStudentData();
      fetchMasterSkills();
    }
  }, [user]);

  const fetchFullStudentData = async () => {
    if (!studentIdentifier) return;
    setResumeLoading(true);
    try {
      const res = await studentService.getResume(studentIdentifier);
      if (res.success && res.data) {
        const data = res.data;
        setResumeData(data);
        setSkillsList(data.skills || []);
        setInternshipsList(data.internships || []);
        setStudentProjectsList(data.student_projects || []);
        setThesisProject(data.thesis_project || null);

        setResumeForm(prev => ({
          ...prev,
          phone: data.profile?.phone || prev.phone,
          first_name_en: data.profile?.first_name_en || prev.first_name_en,
          last_name_en: data.profile?.last_name_en || prev.last_name_en,
          bio: data.profile?.bio || prev.bio,
          linkedin_url: data.profile?.linkedin_url || prev.linkedin_url,
          github_url: data.profile?.github_url || prev.github_url,
          portfolio_url: data.profile?.portfolio_url || prev.portfolio_url
        }));
      }
    } catch (error) {
      console.error('Error fetching resume/student profile data:', error);
    } finally {
      setResumeLoading(false);
    }
  };

  const fetchMasterSkills = async () => {
    try {
      const res = await skillService.getMasterSkills();
      if (res.success && res.data) {
        setMasterSkills(res.data);
      }
    } catch (e) {
      // ignore
    }
  };

  // Password update
  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (passwordForm.password && passwordForm.password !== passwordForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน"
      });
      return;
    }

    setProfileLoading(true);
    try {
      const response = await api.put('/auth/profile', {
        password: passwordForm.password
      });

      if (response.data.success) {
        toast({
          title: "สำเร็จ",
          description: "อัปเดตรหัสผ่านเรียบร้อยแล้ว"
        });
        setPasswordForm({ password: '', confirmPassword: '' });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถอัปเดตรหัสผ่านได้"
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Resume / Bio update
  const handleSubmitResumeInfo = async (e) => {
    e.preventDefault();
    setResumeSubmitLoading(true);
    try {
      const response = await studentService.updateResume(studentIdentifier, {
        phone: resumeForm.phone,
        first_name_en: resumeForm.first_name_en,
        last_name_en: resumeForm.last_name_en,
        bio: resumeForm.bio,
        linkedin_url: resumeForm.linkedin_url,
        github_url: resumeForm.github_url,
        portfolio_url: resumeForm.portfolio_url
      });

      if (response.success) {
        toast({
          title: "สำเร็จ",
          description: "อัปเดตข้อมูลประวัติและช่องทางติดต่อเรียบร้อยแล้ว"
        });
        setIsEditResumeOpen(false);
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถอัปเดตข้อมูลได้"
      });
    } finally {
      setResumeSubmitLoading(false);
    }
  };

  // Add Skill
  const handleAddSkill = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        skill_id: skillForm.skill_id ? parseInt(skillForm.skill_id) : undefined,
        skill_name: !skillForm.skill_id ? skillForm.skill_name : undefined,
        category: skillForm.category,
        level: skillForm.level
      };

      const res = await studentService.addSkill(studentIdentifier, payload);
      if (res.success) {
        toast({
          title: "เพิ่มทักษะสำเร็จ",
          description: `เพิ่มทักษะเข้าสู่โปรไฟล์เรียบร้อยแล้ว`
        });
        setIsAddSkillOpen(false);
        setSkillForm({ skill_id: '', skill_name: '', category: 'programming', level: 'intermediate' });
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถเพิ่มทักษะได้",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Delete Skill
  const handleDeleteSkill = async (skillId) => {
    try {
      const res = await studentService.deleteSkill(studentIdentifier, skillId);
      if (res.success) {
        toast({
          title: "ลบทักษะสำเร็จ",
          description: "นำทักษะออกจากโปรไฟล์แล้ว"
        });
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Add Semester Project
  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const techArray = typeof projectForm.technologies === 'string'
        ? projectForm.technologies.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const payload = {
        ...projectForm,
        technologies: techArray,
        academic_year: parseInt(projectForm.academic_year),
        semester: parseInt(projectForm.semester)
      };

      const res = await studentService.createProject(studentIdentifier, payload);
      if (res.success) {
        toast({
          title: "บันทึกผลงานสำเร็จ",
          description: "เพิ่มผลงานโครงการระหว่างภาคเรียนเข้าสู่พอร์ตโฟลิโอแล้ว"
        });
        setIsAddProjectOpen(false);
        setProjectForm({
          title: '',
          course_name: '',
          category: 'Coursework',
          academic_year: new Date().getFullYear() + 543,
          semester: 1,
          description: '',
          technologies: '',
          github_url: '',
          demo_url: ''
        });
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถบันทึกผลงานได้",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Delete Semester Project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('คุณต้องการลบผลงานโครงการนี้ใช่หรือไม่?')) return;
    try {
      const res = await studentService.deleteProject(studentIdentifier, projectId);
      if (res.success) {
        toast({ title: "ลบผลงานสำเร็จ" });
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Open Edit Semester Project Modal
  const handleOpenEditProject = (project) => {
    setEditingProject(project);
    let techStr = '';
    if (Array.isArray(project.technologies)) {
      techStr = project.technologies.join(', ');
    } else if (typeof project.technologies === 'string') {
      try {
        const parsed = JSON.parse(project.technologies);
        techStr = Array.isArray(parsed) ? parsed.join(', ') : project.technologies;
      } catch (e) {
        techStr = project.technologies;
      }
    }

    setEditProjectForm({
      title: project.title || '',
      course_name: project.course_name || '',
      category: project.category || 'Coursework',
      academic_year: project.academic_year || new Date().getFullYear() + 543,
      semester: project.semester || 1,
      description: project.description || '',
      technologies: techStr,
      github_url: project.github_url || '',
      demo_url: project.demo_url || ''
    });
    setIsEditProjectOpen(true);
  };

  // Submit Update Semester Project
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      const techArray = typeof editProjectForm.technologies === 'string'
        ? editProjectForm.technologies.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const payload = {
        ...editProjectForm,
        technologies: techArray,
        academic_year: parseInt(editProjectForm.academic_year),
        semester: parseInt(editProjectForm.semester)
      };

      const res = await studentService.updateProject(studentIdentifier, editingProject.id, payload);
      if (res.success) {
        toast({
          title: "แก้ไขผลงานสำเร็จ",
          description: "ปรับปรุงข้อมูลผลงานโครงการเรียบร้อยแล้ว"
        });
        setIsEditProjectOpen(false);
        setEditingProject(null);
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถแก้ไขผลงานได้",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Open Edit Senior Project (Thesis)
  const handleOpenEditThesis = () => {
    if (!thesisProject) return;
    let tagStr = '';
    if (Array.isArray(thesisProject.tags)) {
      tagStr = thesisProject.tags.join(', ');
    } else if (typeof thesisProject.tags === 'string') {
      try {
        const parsed = JSON.parse(thesisProject.tags);
        tagStr = Array.isArray(parsed) ? parsed.join(', ') : thesisProject.tags;
      } catch (e) {
        tagStr = thesisProject.tags;
      }
    }

    setThesisForm({
      title_th: thesisProject.title_th || '',
      title_en: thesisProject.title_en || '',
      description: thesisProject.description || '',
      document_url: thesisProject.document_url || '',
      tags: tagStr
    });
    setIsEditThesisOpen(true);
  };

  // Submit Update Senior Project (Thesis)
  const handleUpdateThesis = async (e) => {
    e.preventDefault();
    if (!thesisProject) return;
    try {
      const tagArray = typeof thesisForm.tags === 'string'
        ? thesisForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const payload = {
        title_th: thesisForm.title_th,
        title_en: thesisForm.title_en,
        description: thesisForm.description,
        document_url: thesisForm.document_url,
        tags: tagArray
      };

      const res = await projectService.update(thesisProject.id, payload);
      if (res.success) {
        toast({
          title: "แก้ไขโปรเจคจบสำเร็จ",
          description: "ปรับปรุงข้อมูลโครงงานปริญญานิพนธ์เรียบร้อยแล้ว"
        });
        setIsEditThesisOpen(false);
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถแก้ไขโครงงานได้",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Add Internship
  const handleAddInternship = async (e) => {
    e.preventDefault();
    try {
      const res = await studentService.createInternship(studentIdentifier, internshipForm);
      if (res.success) {
        toast({
          title: "บันทึกข้อมูลการฝึกงานสำเร็จ",
          description: "เพิ่มประวัติการฝึกงานเรียบร้อยแล้ว"
        });
        setIsAddInternshipOpen(false);
        setInternshipForm({
          company_name: '',
          position: '',
          department: '',
          address: '',
          start_date: '',
          end_date: '',
          hours: '400',
          description: '',
          evaluation_status: 'passed'
        });
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถบันทึกข้อมูลได้",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Delete Internship
  const handleDeleteInternship = async (internshipId) => {
    if (!window.confirm('ต้องการลบรายการฝึกงานนี้หรือไม่?')) return;
    try {
      const res = await studentService.deleteInternship(studentIdentifier, internshipId);
      if (res.success) {
        toast({ title: "ลบรายการฝึกงานสำเร็จ" });
        fetchFullStudentData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || error.message
      });
    }
  };

  // Print PDF for Resume
  const handlePrintCSS = () => {
    const printContent = document.getElementById('resume-pdf-content').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Resume - ${resumeData?.profile?.full_name_th || user?.profile?.firstname || user?.firstName || 'Student'}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: 'Sarabun', sans-serif;
              background-color: white;
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              padding: 12mm 15mm;
              box-sizing: border-box;
            }
            @media print {
              body {
                padding: 12mm 15mm;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="w-full h-full flex flex-col justify-between">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'ผู้ดูแลระบบ (Admin)';
      case 'teacher':
      case 'advisor': return 'อาจารย์ (Teacher / Advisor)';
      case 'student': return 'นักศึกษา (Student)';
      case 'alumni': return 'ศิษย์เก่า (Alumni)';
      default: return role;
    }
  };

  const userFullName = resumeData?.profile?.full_name_th
    || (user?.profile?.firstname ? `${user.profile.prefix ? user.profile.prefix + ' ' : ''}${user.profile.firstname} ${user.profile.lastname || ''}`.trim() : '')
    || (user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '')
    || user?.name
    || user?.username
    || '-';

  const avatarInitials = ((user?.profile?.firstname || user?.firstName || user?.username || 'U').charAt(0) +
    (user?.profile?.lastname || user?.lastName || '').charAt(0)).toUpperCase() || 'U';

  const currentAvatarUrl = resumeData?.profile?.avatar_url || user?.profile?.avatar_url || user?.avatar_url;

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "ประเภทไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์ภาพประเภท JPG, PNG หรือ WebP เท่านั้น"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "ไฟล์มีขนาดใหญ่เกินไป",
        description: "ขนาดรูปภาพต้องไม่เกิน 5 MB"
      });
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
      const profileId = user?.profile?.profile_id || user?.student_id || user?.username;
      const res = await uploadService.uploadAvatar(profileId, avatarFile);
      if (res.success) {
        const newAvatarUrl = res.data?.avatar_url;
        toast({
          title: "อัปโหลดรูปโปรไฟล์สำเร็จ",
          description: "เปลี่ยนรูปประจำตัวเรียบร้อยแล้ว"
        });
        if (resumeData?.profile) {
          setResumeData(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              avatar_url: newAvatarUrl
            }
          }));
        }
        if (updateUser) {
          updateUser({
            avatar_url: newAvatarUrl,
            profile: {
              ...user?.profile,
              avatar_url: newAvatarUrl
            }
          });
        }
        setIsAvatarOpen(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: err.response?.data?.message || "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้"
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarLoading(true);
    try {
      const profileId = user?.profile?.profile_id || user?.student_id || user?.username;
      const res = await uploadService.deleteAvatar(profileId);
      if (res.success) {
        toast({
          title: "ลบรูปโปรไฟล์สำเร็จ",
          description: "รีเซ็ตรูปประจำตัวเป็นรูปเริ่มต้นแล้ว"
        });
        if (resumeData?.profile) {
          setResumeData(prev => ({
            ...prev,
            profile: {
              ...prev.profile,
              avatar_url: null
            }
          }));
        }
        if (updateUser) {
          updateUser({
            avatar_url: null,
            profile: {
              ...user?.profile,
              avatar_url: null
            }
          });
        }
        setIsAvatarOpen(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: err.response?.data?.message || "ไม่สามารถลบรูปโปรไฟล์ได้"
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      <style>{`
        #resume-pdf-content, #resume-pdf-content * {
          font-family: 'Sarabun', sans-serif !important;
        }
      `}</style>

      {/* Header Profile Hero */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Avatar with edit overlay */}
            <div className="relative group/avatar cursor-pointer" onClick={() => setIsAvatarOpen(true)}>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-xl text-3xl font-extrabold text-purple-200 relative">
                {currentAvatarUrl ? (
                  <img 
                    src={getFileUrl(currentAvatarUrl)} 
                    alt={userFullName} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span>{avatarInitials}</span>
                )}
                {/* Hover overlay with camera icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 backdrop-blur-xs">
                  <Camera className="w-5 h-5" />
                  <span>เปลี่ยนรูป</span>
                </div>
              </div>
              <button 
                type="button" 
                className="absolute -bottom-1 -right-1 bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded-full border-2 border-white shadow-md transition-transform group-hover/avatar:scale-110"
                title="อัปโหลดรูปโปรไฟล์"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {userFullName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 font-medium">
                  {getRoleLabel(user?.role)}
                </span>
              </div>

              {resumeData?.profile?.full_name_en && (
                <p className="text-purple-200 text-sm italic font-medium mt-0.5">
                  {resumeData.profile.full_name_en}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-purple-200/90 mt-2">
                <span>รหัส: <strong>{studentIdentifier}</strong></span>
                {resumeData?.education?.department && (
                  <span>สาขาวิชา: <strong>{resumeData.education.department}</strong></span>
                )}
                {resumeData?.education?.faculty && (
                  <span>คณะ: <strong>{resumeData.education.faculty}</strong></span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAvatarOpen(true)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl h-10 px-4 text-xs font-semibold backdrop-blur-sm"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              เปลี่ยนรูปโปรไฟล์
            </Button>
            {(user?.role === 'student' || user?.role === 'alumni') && (
              <>
                <Button
                  onClick={() => setIsEditResumeOpen(true)}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl h-10 px-4 text-xs font-semibold backdrop-blur-sm"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  แก้ไขข้อมูล Bio
                </Button>
                <Button
                  onClick={() => setIsResumeOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 h-10 px-4 text-xs font-bold"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  ดู & ส่งออก Resume
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Banner for Students */}
        {(user?.role === 'student' || user?.role === 'alumni') && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-purple-200/70 block">ทักษะที่บันทึก</span>
              <span className="text-xl font-bold text-white mt-1 block">{skillsList.length} ทักษะ</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-purple-200/70 block">ผลงานระหว่างภาคเรียน</span>
              <span className="text-xl font-bold text-white mt-1 block">{studentProjectsList.length} โครงการ</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-purple-200/70 block">ประวัติการฝึกงาน</span>
              <span className="text-xl font-bold text-white mt-1 block">{internshipsList.length} แห่ง</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <span className="text-purple-200/70 block">โครงงานปริญญานิพนธ์</span>
              <span className="text-sm font-semibold text-white mt-1.5 block truncate">
                {thesisProject ? thesisProject.status : 'ยังไม่จดทะเบียน'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      {(user?.role === 'student' || user?.role === 'alumni') ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-purple-100/60">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            ข้อมูลส่วนตัว & รหัสผ่าน
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'skills'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            ทักษะความเชี่ยวชาญ ({skillsList.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            ผลงานระหว่างภาคเรียน ({studentProjectsList.length})
          </button>
          <button
            onClick={() => setActiveTab('internship')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'internship'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            การฝึกงาน ({internshipsList.length})
          </button>
          <button
            onClick={() => setActiveTab('thesis')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'thesis'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-600 hover:bg-purple-50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            ปริญญานิพนธ์ (Thesis)
          </button>
        </div>
      ) : null}

      {/* Tab 1: Overview & Password */}
      {(activeTab === 'overview' || (!user?.role || (user.role !== 'student' && user.role !== 'alumni'))) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-purple-100/50 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                ข้อมูลช่องทางติดต่อ
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center text-gray-700">
                  <Mail className="w-4 h-4 text-purple-600 mr-2.5 shrink-0" />
                  <span className="font-medium truncate">{user?.email || '-'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Phone className="w-4 h-4 text-purple-600 mr-2.5 shrink-0" />
                  <span>{resumeData?.profile?.phone || user?.phone || 'ยังไม่ได้ระบุ'}</span>
                </div>
                {resumeData?.profile?.linkedin_url && (
                  <div className="flex items-center text-gray-700">
                    <Globe className="w-4 h-4 text-blue-600 mr-2.5 shrink-0" />
                    <a href={resumeData.profile.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                      LinkedIn
                    </a>
                  </div>
                )}
                {resumeData?.profile?.github_url && (
                  <div className="flex items-center text-gray-700">
                    <Globe className="w-4 h-4 text-gray-800 mr-2.5 shrink-0" />
                    <a href={resumeData.profile.github_url} target="_blank" rel="noreferrer" className="text-purple-700 hover:underline truncate">
                      GitHub
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Bio Card */}
            {resumeData?.profile?.bio && (
              <div className="bg-purple-50/40 rounded-2xl border border-purple-100/60 p-5 space-y-2">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  เกี่ยวกับฉัน (Bio / Objective)
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed italic whitespace-pre-line">
                  "{resumeData.profile.bio}"
                </p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Academic Detail Card */}
            <div className="bg-white rounded-2xl border border-purple-100/50 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                ข้อมูลสังกัดและสถานะทางการศึกษา
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-1">รหัสประจำตัว</span>
                  <span className="font-bold text-gray-800 text-sm">{studentIdentifier}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">ชื่อ-นามสกุล</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {userFullName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">คณะ</span>
                  <span className="font-semibold text-gray-700">{resumeData?.education?.faculty || user?.profile?.faculty?.faculty_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">สาขาวิชา</span>
                  <span className="font-semibold text-gray-700">{resumeData?.education?.department || user?.profile?.department?.department_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">ปีที่เข้าศึกษา</span>
                  <span className="font-semibold text-gray-700">
                    {resumeData?.education?.entry_year || (user?.username ? '25' + user.username.substring(0,2) : '-')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-1">สถานะปัจจุบัน</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {user?.isActive ? 'ปกติ / กำลังศึกษา (Active)' : 'พ้นสภาพ (Inactive)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-purple-100/50 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider mb-4 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-600" />
                ความปลอดภัยบัญชี (เปลี่ยนรหัสผ่าน)
              </h3>
              <form onSubmit={handleSubmitPassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs text-gray-600">รหัสผ่านใหม่</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      autoComplete="new-password"
                      value={passwordForm.password} 
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} 
                      className="border-purple-100 rounded-xl text-xs h-9"
                      placeholder="กรอกรหัสผ่านใหม่ (หากต้องการเปลี่ยน)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs text-gray-600">ยืนยันรหัสผ่านใหม่</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword} 
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                      className="border-purple-100 rounded-xl text-xs h-9"
                      placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={profileLoading || !passwordForm.password}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs px-5 h-9"
                  >
                    {profileLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Skills Management */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100/50 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ทักษะและความเชี่ยวชาญ (Skills & Competencies)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                เลือกทักษะจากคลังกลางของระบบ หรือสร้างทักษะใหม่พร้อมระบุระดับความชำนาญ
              </p>
            </div>
            <Button
              onClick={() => setIsAddSkillOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มทักษะใหม่</span>
            </Button>
          </div>

          {skillsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skillsList.map((s) => {
                const badgeInfo = SKILL_LEVEL_BADGES[s.level] || SKILL_LEVEL_BADGES.intermediate;
                return (
                  <div 
                    key={s.id} 
                    className="bg-white border border-purple-100/70 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-800">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeInfo.color}`}>
                          {badgeInfo.label}
                        </span>
                        {s.category && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            {SKILL_CATEGORIES.find(c => c.id === s.category)?.label || s.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSkill(s.id)}
                      className="text-gray-300 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50"
                      title="ลบทักษะนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-purple-50/30 border border-dashed border-purple-200 rounded-2xl p-12 text-center">
              <Code2 className="w-10 h-10 text-purple-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-700">ยังไม่มีข้อมูลทักษะในโปรไฟล์</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                กดปุ่ม "เพิ่มทักษะใหม่" ด้านบนเพื่อเพิ่มเทคโนโลยี ภาษาโปรแกรม หรือทักษะที่คุณถนัด
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Course Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100/50 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ผลงานระหว่างภาคเรียน (Course Projects & Mini Projects)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                รวบรวมชิ้นงาน โปรเจกต์ประจำวิชา และผลงานเสริมเพื่อนำไปสร้างพอร์ตและเรซูเม่อัตโนมัติ
              </p>
            </div>
            <Button
              onClick={() => setIsAddProjectOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผลงานโครงการ</span>
            </Button>
          </div>

          {studentProjectsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {studentProjectsList.map((p) => (
                <div key={p.id} className="bg-white border border-purple-100/70 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-lg">
                        ภาคเรียนที่ {p.semester}/{p.academic_year}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditProject(p)}
                          className="text-gray-400 hover:text-purple-600 transition-colors p-1 rounded-lg hover:bg-purple-50"
                          title="แก้ไขโครงการนี้"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p.id)}
                          className="text-gray-300 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50"
                          title="ลบโครงการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-gray-900 leading-snug">{p.title}</h4>
                      {p.course_name && (
                        <p className="text-xs text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          วิชา: {p.course_name}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {p.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </p>

                    {/* Technologies Tags */}
                    {p.technologies && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(Array.isArray(p.technologies) ? p.technologies : JSON.parse(p.technologies || '[]')).map((t, i) => (
                          <span key={i} className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* External links */}
                  <div className="flex items-center gap-3 pt-3 border-t border-purple-50 text-xs">
                    {p.github_url && (
                      <a href={p.github_url} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span>Source Code (GitHub)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {p.demo_url && (
                      <a href={p.demo_url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        <span>ดูผลงาน (Live Demo)</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-purple-50/30 border border-dashed border-purple-200 rounded-2xl p-12 text-center">
              <FolderGit2 className="w-10 h-10 text-purple-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-700">ยังไม่มีข้อมูลผลงานระหว่างเทอม</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                เพิ่มงานที่ทำในรายวิชาต่างๆ เพื่อให้เรซูเม่และแฟ้มผลงานของคุณโดดเด่นยิ่งขึ้น
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Internship */}
      {activeTab === 'internship' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100/50 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">ประวัติการฝึกงานและสหกิจศึกษา (Internship / Co-op)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                บันทึกสถานประกอบการ ตำแหน่งงาน และช่วงเวลาการฝึกงานเพื่อใช้ประเมินและแนบเรซูเม่
              </p>
            </div>
            <Button
              onClick={() => setIsAddInternshipOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกข้อมูลการฝึกงาน</span>
            </Button>
          </div>

          {internshipsList.length > 0 ? (
            <div className="space-y-4">
              {internshipsList.map((item) => (
                <div key={item.id} className="bg-white border border-purple-100/70 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                        <Building2 className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-gray-900">{item.company_name}</h4>
                        <p className="text-xs text-purple-600 font-semibold">{item.position} {item.department && `• แผนก ${item.department}`}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 ml-auto">
                        {item.evaluation_status === 'passed' ? 'ผ่านการประเมินแล้ว' : 'กำลังดำเนินการ'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-purple-50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-500" />
                        <span>
                          ช่วงเวลา: {item.start_date ? new Date(item.start_date).toLocaleDateString('th-TH') : '-'} ถึง {item.end_date ? new Date(item.end_date).toLocaleDateString('th-TH') : '-'}
                        </span>
                      </div>
                      {item.hours && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          <span>จำนวนชั่วโมงฝึกงาน: {item.hours} ชม.</span>
                        </div>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-gray-600 leading-relaxed italic bg-purple-50/20 p-3 rounded-xl">
                        "{item.description}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-start">
                    <button
                      onClick={() => handleDeleteInternship(item.id)}
                      className="text-gray-300 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-purple-50/30 border border-dashed border-purple-200 rounded-2xl p-12 text-center">
              <Briefcase className="w-10 h-10 text-purple-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-700">ยังไม่มีข้อมูลการฝึกงาน</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                กดปุ่ม "บันทึกข้อมูลการฝึกงาน" เพื่อบันทึกประวัติการฝึกประสบการณ์วิชาชีพของคุณ
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Thesis Project */}
      {activeTab === 'thesis' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-purple-100/50 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">โครงงานปริญญานิพนธ์ / โปรเจคจบ (Senior Project)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ข้อมูลโครงงานจบที่ลงทะเบียนในระบบ พร้อมสถานะกระบวนการสอบและอาจารย์ที่ปรึกษา
              </p>
            </div>
            {thesisProject && (
              <Button
                onClick={handleOpenEditThesis}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูลโปรเจคจบ</span>
              </Button>
            )}
          </div>

        {thesisProject ? (
          <div className="bg-white border border-purple-100/70 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-50 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-xl">
                  ปีการศึกษา {thesisProject.year}
                </span>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full uppercase">
                  สถานะ: {thesisProject.status}
                </span>
              </div>
              <Button
                onClick={handleOpenEditThesis}
                variant="outline"
                size="sm"
                className="text-purple-700 border-purple-200 hover:bg-purple-50 rounded-xl text-xs h-8 flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูล</span>
              </Button>
            </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-snug">{thesisProject.title_th}</h3>
                <p className="text-sm text-gray-400 italic mt-1 font-medium">{thesisProject.title_en}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">บทคัดย่อ / สรุปโครงการ</h4>
                <div className="bg-purple-50/20 p-4 rounded-xl text-xs text-gray-600 leading-relaxed whitespace-pre-line border border-purple-50">
                  {thesisProject.description || 'ไม่มีรายละเอียด'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-700 pt-2 border-t border-purple-50">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span><strong>อาจารย์ที่ปรึกษา:</strong> {thesisProject.advisor || 'ไม่ระบุ'}</span>
                </div>
                {thesisProject.has_award && (
                  <div className="flex items-center gap-2 text-amber-600 font-bold">
                    <Award className="w-4 h-4" />
                    <span>ได้รับรางวัลโครงงานดีเด่น</span>
                  </div>
                )}
              </div>

              {thesisProject.document_url && (
                <div className="pt-2">
                  <a
                    href={thesisProject.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-bold"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>เปิดเอกสารรายงานฉบับสมบูรณ์</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-purple-50/30 border border-dashed border-purple-200 rounded-2xl p-12 text-center">
              <Award className="w-10 h-10 text-purple-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-700">ยังไม่พบข้อมูลโครงงานจบในระบบ</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                เมื่อคุณหรืออาจารย์ที่ปรึกษาลงทะเบียนโครงงานที่เมนู "โครงงาน/ปริญญานิพนธ์" โครงการจะเชื่อมโยงกับโปรไฟล์ของคุณโดยอัตโนมัติ
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 1: Add Skill Dialog */}
      {/* ========================================================================= */}
      <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-purple-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-600" />
              เพิ่มทักษะความเชี่ยวชาญ (Add Skill)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              เลือกจากรายการทักษะมาตรฐาน หรือพิมพ์ชื่อทักษะใหม่
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSkill} className="space-y-4 pt-3">
            {/* Master Skills Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="masterSkill" className="text-xs text-gray-700 font-semibold">เลือกจากรายการทักษะมาตรฐาน</Label>
              <select
                id="masterSkill"
                value={skillForm.skill_id}
                onChange={(e) => {
                  const val = e.target.value;
                  setSkillForm(prev => ({
                    ...prev,
                    skill_id: val,
                    skill_name: val ? '' : prev.skill_name
                  }));
                }}
                className="flex h-9 w-full rounded-xl border border-purple-100 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- หรือพิมพ์ระบุทักษะเองด้านล่าง --</option>
                {masterSkills.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Skill Name if not in master */}
            {!skillForm.skill_id && (
              <div className="space-y-1.5">
                <Label htmlFor="skill_name" className="text-xs text-gray-700 font-semibold">ชื่อทักษะ (Custom Skill Name) *</Label>
                <Input
                  id="skill_name"
                  placeholder="เช่น Tailwind CSS, Docker, Figma..."
                  value={skillForm.skill_name}
                  onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                  required={!skillForm.skill_id}
                />
              </div>
            )}

            {/* Category */}
            {!skillForm.skill_id && (
              <div className="space-y-1.5">
                <Label htmlFor="skillCategory" className="text-xs text-gray-700 font-semibold">หมวดหมู่ทักษะ</Label>
                <select
                  id="skillCategory"
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                  className="flex h-9 w-full rounded-xl border border-purple-100 bg-white px-3 text-xs focus:outline-none"
                >
                  {SKILL_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Proficiency Level */}
            <div className="space-y-1.5">
              <Label htmlFor="level" className="text-xs text-gray-700 font-semibold">ระดับความชำนาญ *</Label>
              <select
                id="level"
                value={skillForm.level}
                onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}
                className="flex h-9 w-full rounded-xl border border-purple-100 bg-white px-3 text-xs focus:outline-none"
              >
                <option value="beginner">เริ่มต้น (Beginner)</option>
                <option value="intermediate">ปานกลาง (Intermediate)</option>
                <option value="advanced">เชี่ยวชาญ (Advanced)</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddSkillOpen(false)} className="text-xs rounded-xl h-9">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9">
                เพิ่มทักษะ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: Add Semester Project Dialog */}
      {/* ========================================================================= */}
      <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-purple-600" />
              เพิ่มผลงานโครงการระหว่างภาคเรียน
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              ผลงานชิ้นนี้จะปรากฏในแฟ้มสะสมงานและเรซูเม่ของคุณโดยอัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddProject} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="projTitle" className="text-xs text-gray-700 font-semibold">ชื่อผลงาน / โครงงาน *</Label>
              <Input
                id="projTitle"
                placeholder="เช่น ระบบจองคิวออนไลน์ร้านตัดผม..."
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="courseName" className="text-xs text-gray-700 font-semibold">ชื่อวิชาที่สร้างผลงาน</Label>
                <Input
                  id="courseName"
                  placeholder="เช่น การพัฒนาเว็บขั้นสูง..."
                  value={projectForm.course_name}
                  onChange={(e) => setProjectForm({ ...projectForm, course_name: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="academicYear" className="text-xs text-gray-700 font-semibold">ปีการศึกษา</Label>
                  <Input
                    id="academicYear"
                    type="number"
                    value={projectForm.academic_year}
                    onChange={(e) => setProjectForm({ ...projectForm, academic_year: e.target.value })}
                    className="rounded-xl border-purple-100 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="semester" className="text-xs text-gray-700 font-semibold">ภาคเรียน</Label>
                  <select
                    id="semester"
                    value={projectForm.semester}
                    onChange={(e) => setProjectForm({ ...projectForm, semester: e.target.value })}
                    className="flex h-9 w-full rounded-xl border border-purple-100 bg-white px-2 text-xs focus:outline-none"
                  >
                    <option value="1">เทอม 1</option>
                    <option value="2">เทอม 2</option>
                    <option value="3">ฤดูร้อน</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="technologies" className="text-xs text-gray-700 font-semibold">เทคโนโลยีที่ใช้ (คั่นด้วยจุลภาค ,)</Label>
              <Input
                id="technologies"
                placeholder="เช่น React, Node.js, Tailwind CSS, MySQL"
                value={projectForm.technologies}
                onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="projDesc" className="text-xs text-gray-700 font-semibold">คำอธิบายสรุปผลงาน</Label>
              <textarea
                id="projDesc"
                rows={3}
                placeholder="อธิบายฟังก์ชันเด่น ปัญหาที่แก้ไข และบทบาทหน้าที่ในการพัฒนา..."
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                className="flex w-full rounded-xl border border-purple-100 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="githubUrl" className="text-xs text-gray-700 font-semibold">ลิงก์ GitHub / Repository</Label>
                <Input
                  id="githubUrl"
                  placeholder="https://github.com/..."
                  value={projectForm.github_url}
                  onChange={(e) => setProjectForm({ ...projectForm, github_url: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demoUrl" className="text-xs text-gray-700 font-semibold">ลิงก์ Demo / Website</Label>
                <Input
                  id="demoUrl"
                  placeholder="https://myproject.vercel.app"
                  value={projectForm.demo_url}
                  onChange={(e) => setProjectForm({ ...projectForm, demo_url: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddProjectOpen(false)} className="text-xs rounded-xl h-9">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9">
                บันทึกผลงาน
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2.1: Edit Semester Project Dialog */}
      {/* ========================================================================= */}
      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-purple-600" />
              แก้ไขผลงานโครงการระหว่างภาคเรียน
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              ปรับปรุงรายละเอียดผลงาน โปรเจกต์ หรือโครงงานย่อยที่คุณพัฒนาในรายวิชา
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProject} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="editProjTitle" className="text-xs text-gray-700 font-semibold">ชื่อโครงงาน / ชิ้นงาน *</Label>
              <Input
                id="editProjTitle"
                placeholder="เช่น ระบบจองคิวออนไลน์..."
                value={editProjectForm.title}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, title: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editCourseName" className="text-xs text-gray-700 font-semibold">ชื่อวิชาที่สร้างผลงาน</Label>
                <Input
                  id="editCourseName"
                  placeholder="เช่น การพัฒนาเว็บขั้นสูง..."
                  value={editProjectForm.course_name}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, course_name: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="editAcademicYear" className="text-xs text-gray-700 font-semibold">ปีการศึกษา</Label>
                  <Input
                    id="editAcademicYear"
                    type="number"
                    value={editProjectForm.academic_year}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, academic_year: e.target.value })}
                    className="rounded-xl border-purple-100 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editSemester" className="text-xs text-gray-700 font-semibold">ภาคเรียน</Label>
                  <select
                    id="editSemester"
                    value={editProjectForm.semester}
                    onChange={(e) => setEditProjectForm({ ...editProjectForm, semester: e.target.value })}
                    className="flex h-9 w-full rounded-xl border border-purple-100 bg-white px-2 text-xs focus:outline-none"
                  >
                    <option value="1">เทอม 1</option>
                    <option value="2">เทอม 2</option>
                    <option value="3">ฤดูร้อน</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editTechnologies" className="text-xs text-gray-700 font-semibold">เทคโนโลยีที่ใช้ (คั่นด้วยจุลภาค ,)</Label>
              <Input
                id="editTechnologies"
                placeholder="เช่น React, Node.js, Tailwind CSS, MySQL"
                value={editProjectForm.technologies}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, technologies: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editProjDesc" className="text-xs text-gray-700 font-semibold">คำอธิบายสรุปผลงาน</Label>
              <textarea
                id="editProjDesc"
                rows={3}
                placeholder="อธิบายฟังก์ชันเด่น ปัญหาที่แก้ไข และบทบาทหน้าที่ในการพัฒนา..."
                value={editProjectForm.description}
                onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                className="flex w-full rounded-xl border border-purple-100 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editGithubUrl" className="text-xs text-gray-700 font-semibold">ลิงก์ GitHub / Repository</Label>
                <Input
                  id="editGithubUrl"
                  placeholder="https://github.com/..."
                  value={editProjectForm.github_url}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, github_url: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editDemoUrl" className="text-xs text-gray-700 font-semibold">ลิงก์ Demo / Website</Label>
                <Input
                  id="editDemoUrl"
                  placeholder="https://myproject.vercel.app"
                  value={editProjectForm.demo_url}
                  onChange={(e) => setEditProjectForm({ ...editProjectForm, demo_url: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditProjectOpen(false)} className="text-xs rounded-xl h-9">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9">
                บันทึกการแก้ไข
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2.2: Edit Senior Project / Thesis Dialog */}
      {/* ========================================================================= */}
      <Dialog open={isEditThesisOpen} onOpenChange={setIsEditThesisOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              แก้ไขข้อมูลโครงงานจบ (Senior Project)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              แก้ไขชื่อเรื่อง บทคัดย่อ และลิงก์เอกสารรายงานโครงงานปริญญานิพนธ์
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateThesis} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="thesisTitleTh" className="text-xs text-gray-700 font-semibold">ชื่อโครงงาน (ภาษาไทย) *</Label>
              <Input
                id="thesisTitleTh"
                placeholder="ชื่อโครงงานภาษาไทย..."
                value={thesisForm.title_th}
                onChange={(e) => setThesisForm({ ...thesisForm, title_th: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thesisTitleEn" className="text-xs text-gray-700 font-semibold">ชื่อโครงงาน (ภาษาอังกฤษ)</Label>
              <Input
                id="thesisTitleEn"
                placeholder="Senior Project Title in English..."
                value={thesisForm.title_en}
                onChange={(e) => setThesisForm({ ...thesisForm, title_en: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thesisTags" className="text-xs text-gray-700 font-semibold">คำสำคัญ / เทคโนโลยี (คั่นด้วยจุลภาค ,)</Label>
              <Input
                id="thesisTags"
                placeholder="เช่น AI, Machine Learning, Python, FastAPI"
                value={thesisForm.tags}
                onChange={(e) => setThesisForm({ ...thesisForm, tags: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thesisDesc" className="text-xs text-gray-700 font-semibold">บทคัดย่อ / สรุปโครงการ</Label>
              <textarea
                id="thesisDesc"
                rows={4}
                placeholder="ระบุวัตถุประสงค์ ขอบเขต และผลลัพธ์ของโครงงาน..."
                value={thesisForm.description}
                onChange={(e) => setThesisForm({ ...thesisForm, description: e.target.value })}
                className="flex w-full rounded-xl border border-purple-100 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thesisDocUrl" className="text-xs text-gray-700 font-semibold">ลิงก์เอกสารรายงานฉบับสมบูรณ์ (PDF / Google Drive)</Label>
              <Input
                id="thesisDocUrl"
                placeholder="https://..."
                value={thesisForm.document_url}
                onChange={(e) => setThesisForm({ ...thesisForm, document_url: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditThesisOpen(false)} className="text-xs rounded-xl h-9">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9">
                บันทึกการแก้ไข
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: Add Internship Dialog */}
      {/* ========================================================================= */}
      <Dialog open={isAddInternshipOpen} onOpenChange={setIsAddInternshipOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" />
              บันทึกประวัติการฝึกงานและสหกิจศึกษา
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              ระบุข้อมูลสถานประกอบการและหน้าที่ความรับผิดชอบ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddInternship} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="compName" className="text-xs text-gray-700 font-semibold">ชื่อสถานประกอบการ / บริษัท *</Label>
              <Input
                id="compName"
                placeholder="เช่น บริษัท อโกด้า เซอร์วิสเซส จำกัด..."
                value={internshipForm.company_name}
                onChange={(e) => setInternshipForm({ ...internshipForm, company_name: e.target.value })}
                className="rounded-xl border-purple-100 text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pos" className="text-xs text-gray-700 font-semibold">ตำแหน่งงาน *</Label>
                <Input
                  id="pos"
                  placeholder="เช่น Web Developer Intern..."
                  value={internshipForm.position}
                  onChange={(e) => setInternshipForm({ ...internshipForm, position: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dept" className="text-xs text-gray-700 font-semibold">แผนก / ฝ่าย</Label>
                <Input
                  id="dept"
                  placeholder="เช่น แผนกเทคโนโลยีสารสนเทศ..."
                  value={internshipForm.department}
                  onChange={(e) => setInternshipForm({ ...internshipForm, department: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs text-gray-700 font-semibold">วันเริ่มต้น</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={internshipForm.start_date}
                  onChange={(e) => setInternshipForm({ ...internshipForm, start_date: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs text-gray-700 font-semibold">วันสิ้นสุด</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={internshipForm.end_date}
                  onChange={(e) => setInternshipForm({ ...internshipForm, end_date: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hours" className="text-xs text-gray-700 font-semibold">จำนวนชั่วโมง</Label>
                <Input
                  id="hours"
                  type="number"
                  placeholder="เช่น 400"
                  value={internshipForm.hours}
                  onChange={(e) => setInternshipForm({ ...internshipForm, hours: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intDesc" className="text-xs text-gray-700 font-semibold">หน้าที่ความรับผิดชอบและผลงานที่ฝึกปฏิบัติ</Label>
              <textarea
                id="intDesc"
                rows={3}
                placeholder="ระบุโปรเจกต์ที่ได้รับมอบหมายหรือเทคโนโลยีที่ได้ฝึกปฏิบัติจริง..."
                value={internshipForm.description}
                onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })}
                className="flex w-full rounded-xl border border-purple-100 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddInternshipOpen(false)} className="text-xs rounded-xl h-9">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9">
                บันทึกการฝึกงาน
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 4: Edit Bio & Socials Dialog */}
      {/* ========================================================================= */}
      <Dialog open={isEditResumeOpen} onOpenChange={setIsEditResumeOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
              <Edit className="w-4 h-4 text-purple-600" />
              แก้ไขข้อมูลประวัติและช่องทางติดต่อสำหรับ Resume
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              ข้อมูลเหล่านี้จะถูกแสดงบนหัวกระดาษเรซูเม่เพื่อการสมัครงาน
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResumeInfo} className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fnameEn" className="text-xs text-gray-700 font-semibold">First Name (English)</Label>
                <Input
                  id="fnameEn"
                  placeholder="e.g. Somsak"
                  value={resumeForm.first_name_en}
                  onChange={(e) => setResumeForm({ ...resumeForm, first_name_en: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lnameEn" className="text-xs text-gray-700 font-semibold">Last Name (English)</Label>
                <Input
                  id="lnameEn"
                  placeholder="e.g. Jaidee"
                  value={resumeForm.last_name_en}
                  onChange={(e) => setResumeForm({ ...resumeForm, last_name_en: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="resPhone" className="text-xs text-gray-700 font-semibold">เบอร์โทรศัพท์</Label>
                <Input
                  id="resPhone"
                  placeholder="08X-XXX-XXXX"
                  value={resumeForm.phone}
                  onChange={(e) => setResumeForm({ ...resumeForm, phone: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resLinkedin" className="text-xs text-gray-700 font-semibold">LinkedIn URL</Label>
                <Input
                  id="resLinkedin"
                  placeholder="https://linkedin.com/in/..."
                  value={resumeForm.linkedin_url}
                  onChange={(e) => setResumeForm({ ...resumeForm, linkedin_url: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resGithub" className="text-xs text-gray-700 font-semibold">GitHub URL</Label>
                <Input
                  id="resGithub"
                  placeholder="https://github.com/..."
                  value={resumeForm.github_url}
                  onChange={(e) => setResumeForm({ ...resumeForm, github_url: e.target.value })}
                  className="rounded-xl border-purple-100 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resBio" className="text-xs text-gray-700 font-semibold">เป้าหมายในการทำงาน / แนะนำตัวย่อ (Career Objective / Summary)</Label>
              <textarea
                id="resBio"
                rows={4}
                placeholder="ระบุเป้าหมายในการทำงาน ความเชี่ยวชาญ และความมุ่งมั่นของคุณ..."
                value={resumeForm.bio}
                onChange={(e) => setResumeForm({ ...resumeForm, bio: e.target.value })}
                className="flex w-full rounded-xl border border-purple-100 bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditResumeOpen(false)} className="text-xs rounded-xl h-9">
                ยกเลิก
              </Button>
              <Button type="submit" disabled={resumeSubmitLoading} className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl h-9">
                {resumeSubmitLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 5: Master Full Resume Preview & A4 Print Export */}
      {/* ========================================================================= */}
      <Dialog open={isResumeOpen} onOpenChange={setIsResumeOpen}>
        <DialogContent className="sm:max-w-4xl bg-gray-100 rounded-2xl p-6 shadow-2xl border border-purple-100 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-200/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-bold text-purple-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                แฟ้มสะสมงานและประวัติย่อ (Resume & Portfolio CV)
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1">
                สร้างอัตโนมัติจากข้อมูลนักศึกษา ผลงานโครงงานจบ ผลงานระหว่างเทอม และทักษะที่บันทึกในระบบ
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-end">
              <Button
                onClick={handlePrintCSS}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลด PDF / พิมพ์
              </Button>
            </div>
          </DialogHeader>

          {resumeLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
              <span className="text-xs text-gray-500 font-medium">กำลังเตรียมเอกสาร Resume...</span>
            </div>
          ) : (
            <div className="flex justify-center p-2 bg-gray-300/60 rounded-xl max-h-[65vh] overflow-y-auto shadow-inner">
              {/* The A4 Sheet */}
              <div 
                id="resume-pdf-content" 
                className="w-[210mm] min-h-[297mm] bg-white text-slate-800 p-[12mm_15mm] shadow-2xl flex flex-col justify-between text-xs leading-relaxed"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                <div>
                  {/* Header */}
                  <div className="border-b-2 border-purple-700 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                          {userFullName}
                        </h1>
                        {resumeData?.profile?.full_name_en && (
                          <p className="text-gray-500 font-bold text-xs mt-0.5">
                            {resumeData.profile.full_name_en}
                          </p>
                        )}
                        <p className="text-purple-700 font-bold text-xs mt-1">
                          {resumeData?.education?.department || 'สาขาวิชาวิศวกรรมซอฟต์แวร์'} • {resumeData?.education?.faculty || 'คณะศิลปศาสตร์และวิทยาศาสตร์'}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-gray-600 space-y-0.5">
                        <p><strong>รหัสนักศึกษา:</strong> {studentIdentifier}</p>
                        <p><strong>อีเมล:</strong> {resumeData?.profile?.email || user?.email}</p>
                        {resumeData?.profile?.phone && <p><strong>โทรศัพท์:</strong> {resumeData.profile.phone}</p>}
                        {resumeData?.profile?.github_url && <p><strong>GitHub:</strong> {resumeData.profile.github_url}</p>}
                        {resumeData?.profile?.linkedin_url && <p><strong>LinkedIn:</strong> {resumeData.profile.linkedin_url}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Career Objective */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-0.5">
                      เป้าหมายในการทำงาน (Career Objective)
                    </h3>
                    <p className="text-xs text-gray-700 leading-relaxed text-justify pt-1">
                      {resumeData?.profile?.bio || 'มุ่งมั่นที่จะนำความรู้ด้านการวิเคราะห์ ออกแบบ และการพัฒนาซอฟต์แวร์ที่ได้รับจากการศึกษา ตลอดจนทักษะในการพัฒนาโครงงานจบมาประยุกต์ใช้เพื่อแก้ไขปัญหาและส่งมอบนวัตกรรมซอฟต์แวร์ที่มีคุณภาพให้กับองค์กร'}
                    </p>
                  </div>

                  {/* Education */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-0.5">
                      ประวัติการศึกษา (Education)
                    </h3>
                    <div className="pt-1 flex justify-between items-start text-xs">
                      <div>
                        <p className="font-bold text-slate-900">มหาวิทยาลัยราชภัฏศรีสะเกษ (Sisaket Rajabhat University)</p>
                        <p className="text-gray-600">{resumeData?.education?.faculty || 'คณะศิลปศาสตร์และวิทยาศาสตร์'}</p>
                        <p className="text-purple-700 font-semibold">{resumeData?.education?.department || 'สาขาวิชาวิศวกรรมซอฟต์แวร์'}</p>
                      </div>
                      <div className="text-right text-gray-500 text-[11px]">
                        <p>ปีที่เข้าศึกษา: {resumeData?.education?.entry_year || '-'}</p>
                        <p className="font-semibold text-gray-700">{resumeData?.education?.status || 'กำลังศึกษา'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-0.5">
                      ทักษะและความเชี่ยวชาญ (Technical & Professional Skills)
                    </h3>
                    <div className="pt-1.5 flex flex-wrap gap-1.5">
                      {skillsList.length > 0 ? (
                        skillsList.map((s, idx) => (
                          <span key={idx} className="bg-purple-50 border border-purple-200 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded">
                            {s.name} ({s.level})
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs italic">ไม่มีข้อมูลทักษะ</span>
                      )}
                    </div>
                  </div>

                  {/* Senior Thesis Project */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-0.5">
                      โครงงานปริญญานิพนธ์ (Senior Thesis Project)
                    </h3>
                    {thesisProject ? (
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-900 text-xs">{thesisProject.title_th}</h4>
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            ปีการศึกษา {thesisProject.year}
                          </span>
                        </div>
                        {thesisProject.title_en && (
                          <p className="text-[11px] text-gray-500 italic">{thesisProject.title_en}</p>
                        )}
                        <p className="text-xs text-gray-600 leading-relaxed text-justify">
                          {thesisProject.description}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          <strong>อาจารย์ที่ปรึกษา:</strong> {thesisProject.advisor || '-'}
                          {thesisProject.has_award && <span className="text-amber-600 font-bold ml-2">🏆 ได้รับรางวัลโครงงานดีเด่น</span>}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic pt-1">ไม่มีข้อมูลโครงงานจบ</p>
                    )}
                  </div>

                  {/* Course Projects / Portfolio */}
                  {studentProjectsList.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-0.5">
                        ผลงานระหว่างภาคเรียน (Course Projects & Portfolio)
                      </h3>
                      <div className="pt-1 space-y-2">
                        {studentProjectsList.slice(0, 3).map((p) => (
                          <div key={p.id} className="text-xs space-y-0.5">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-800">{p.title}</span>
                              <span className="text-[10px] text-gray-500">ภาคเรียนที่ {p.semester}/{p.academic_year}</span>
                            </div>
                            {p.course_name && <p className="text-[11px] text-purple-700 font-medium">วิชา: {p.course_name}</p>}
                            <p className="text-[11px] text-gray-600 text-justify">{p.description}</p>
                            {p.github_url && <p className="text-[10px] text-gray-400">GitHub: {p.github_url}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Internships */}
                  {internshipsList.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider border-b border-purple-100 pb-0.5">
                        ประวัติการฝึกงาน (Internship Experience)
                      </h3>
                      <div className="pt-1 space-y-1.5">
                        {internshipsList.map((item) => (
                          <div key={item.id} className="text-xs">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-800">{item.company_name} — {item.position}</span>
                              <span className="text-[10px] text-gray-500">
                                {item.start_date ? new Date(item.start_date).toLocaleDateString('th-TH') : ''} - {item.end_date ? new Date(item.end_date).toLocaleDateString('th-TH') : ''}
                              </span>
                            </div>
                            {item.description && <p className="text-[11px] text-gray-600 text-justify">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 pt-2 text-[9px] text-gray-400 flex justify-between items-center mt-6">
                  <span>มหาวิทยาลัยราชภัฏศรีสะเกษ (Sisaket Rajabhat University) — เอกสารออกโดยระบบฐานข้อมูลนักศึกษาและโครงงาน</span>
                  <span>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avatar Upload Dialog */}
      <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Camera className="text-purple-600 w-5 h-5" />
              อัปโหลดรูปประจำตัว (Profile Photo)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              อัปโหลดรูปประจำตัวของคุณเพื่อแสดงในระบบและหน้าทำเนียบ
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            {/* Preview Box */}
            <div className="w-36 h-36 rounded-2xl bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center overflow-hidden relative shadow-inner">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : currentAvatarUrl ? (
                <img src={getFileUrl(currentAvatarUrl)} alt="Current" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="flex flex-col items-center justify-center text-purple-300">
                  <User size={48} />
                  <span className="text-[10px] text-gray-400 mt-1">ยังไม่มีรูป</span>
                </div>
              )}
            </div>

            {/* Validation information */}
            <div className="text-center text-xs text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-700">รองรับไฟล์ JPG, JPEG, PNG หรือ WebP</p>
              <p className="text-[11px] text-gray-400">ขนาดไฟล์ไม่เกิน 5 MB (แนะนำรูปภาพจัตุรัส 1:1)</p>
            </div>

            {/* File input */}
            <input 
              type="file" 
              ref={avatarInputRef} 
              onChange={handleAvatarFileSelect} 
              accept="image/jpeg,image/png,image/webp,image/jpg" 
              className="hidden" 
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
                className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs rounded-xl h-9 flex items-center gap-1.5"
              >
                <UploadCloud size={14} /> เลือกรูปจากอุปกรณ์
              </Button>

              {currentAvatarUrl && !avatarPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDeleteAvatar}
                  disabled={avatarLoading}
                  className="text-rose-600 hover:bg-rose-50 text-xs rounded-xl h-9"
                >
                  <Trash2 size={14} className="mr-1" /> ลบรูปเดิม
                </Button>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-purple-50 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAvatarOpen(false);
                setAvatarFile(null);
                setAvatarPreview(null);
              }}
              className="text-gray-500 rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleUploadAvatar}
              disabled={!avatarFile || avatarLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5"
            >
              {avatarLoading ? 'กำลังอัปโหลด...' : 'บันทึกรูปโปรไฟล์'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
