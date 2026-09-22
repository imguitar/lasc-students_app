import React, { useEffect, useState, useRef } from 'react';
import { studentService, studentProjectService, uploadService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  FolderGit2, Search, Plus, Edit2, Trash2, X, AlertCircle, ExternalLink, 
  Eye, EyeOff, Calendar, Tag, Building2, ChevronDown, ChevronRight,
  Paperclip, FileText, Image as ImageIcon, File, UploadCloud, LayoutGrid, Layers, Download
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';

// หมวดหมู่ผลงานมาตรฐานภาษาไทย
export const CATEGORIES = [
  { value: 'ผลงานระหว่างเทอม', label: 'ผลงานระหว่างเทอม', aliases: ['Coursework', 'coursework'] },
  { value: 'โครงงาน / ปริญญานิพนธ์', label: 'โครงงาน / ปริญญานิพนธ์', aliases: ['Project', 'Thesis', 'thesis', 'Senior Project'] },
  { value: 'กิจกรรม', label: 'กิจกรรม', aliases: ['Activity', 'activity'] },
  { value: 'การแข่งขัน', label: 'การแข่งขัน', aliases: ['Competition', 'competition'] },
  { value: 'ใบประกาศ / Certificate', label: 'ใบประกาศ / Certificate', aliases: ['Certificate', 'certificate'] },
  { value: 'การฝึกงาน', label: 'การฝึกงาน', aliases: ['Internship', 'internship'] },
  { value: 'ผลงานด้าน Programming', label: 'ผลงานด้าน Programming', aliases: ['Programming', 'programming'] },
  { value: 'ผลงานด้าน AI', label: 'ผลงานด้าน AI', aliases: ['AI', 'ai'] },
  { value: 'ผลงานอื่น ๆ', label: 'ผลงานอื่น ๆ', aliases: ['Personal', 'Research', 'Other', 'other'] },
];

export const getCategoryLabel = (cat) => {
  if (!cat) return 'ผลงานอื่น ๆ';
  const found = CATEGORIES.find(c => c.value === cat || c.label === cat || (c.aliases && c.aliases.includes(cat)));
  return found ? found.label : cat;
};

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const backendBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
  return `${backendBase}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Portfolio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' หรือ 'grouped'
  const [filters, setFilters] = useState({
    category: '',
    academic_year: '',
  });

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteStudentId, setDeleteStudentId] = useState(null);
  const [detailProject, setDetailProject] = useState(null);

  // Form for the project being edited
  const [form, setForm] = useState({
    title: '', description: '', category: 'ผลงานระหว่างเทอม',
    academic_year: '', semester: '1', course_name: '',
    technologies: '', github_url: '', demo_url: '', link_url: '',
    image_url: '', document_url: '', status: 'completed',
    skills_used: '', internship_company: '', is_published: true, year: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [editStudentId, setEditStudentId] = useState(null);

  // Attached files state
  const [existingFiles, setExistingFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (search) params.search = search;
      
      // If user is student/alumni, fetch their own projects
      if (user?.role === 'student' || user?.role === 'alumni') {
        const profileId = user.student_id || user.username;
        const response = await studentService.getProjects(profileId);
        if (response.success) {
          setProjects(response.data.map(p => ({
            ...p,
            student: { student_id: profileId, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() }
          })));
        }
      } else {
        // Admin/advisor: get all projects
        const response = await studentProjectService.getAll(params);
        if (response.success) {
          setProjects(response.data);
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลผลงานได้"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilters({ category: '', academic_year: '' });
  };

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'กรุณากรอกชื่อผลงาน';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null });
    if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Validate file sizes (max 20MB per file)
    const validFiles = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "ไฟล์มีขนาดใหญ่เกินกำหนด",
          description: `ไฟล์ ${file.name} มีขนาดเกิน 20 MB`
        });
      } else {
        validFiles.push(file);
      }
    }
    setNewFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingFile = async (fileId) => {
    try {
      await uploadService.deleteProjectFile(fileId);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: "ลบไฟล์สำเร็จ", description: "ลบไฟล์แนบออกจากผลงานเรียบร้อยแล้ว" });
      fetchProjects();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถลบไฟล์ได้"
      });
    }
  };

  const handleOpenAdd = () => {
    setCurrentProject(null);
    setEditStudentId(user?.student_id || user?.username || null);
    setExistingFiles([]);
    setNewFiles([]);
    setForm({
      title: '', description: '', category: 'ผลงานระหว่างเทอม',
      academic_year: (new Date().getFullYear() + 543).toString(), semester: '1', course_name: '',
      technologies: '', github_url: '', demo_url: '', link_url: '',
      image_url: '', document_url: '', status: 'completed',
      skills_used: '', internship_company: '', is_published: true, year: (new Date().getFullYear() + 543).toString()
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (project) => {
    setCurrentProject(project);
    setEditStudentId(project.student?.student_id || project.profile_id);
    setExistingFiles(project.files || []);
    setNewFiles([]);
    setForm({
      title: project.title || '',
      description: project.description || '',
      category: getCategoryLabel(project.category),
      academic_year: project.academic_year?.toString() || '',
      semester: project.semester?.toString() || '1',
      course_name: project.course_name || '',
      technologies: Array.isArray(project.technologies) ? project.technologies.join(', ') : '',
      github_url: project.github_url || '',
      demo_url: project.demo_url || '',
      link_url: project.link_url || '',
      image_url: project.image_url || '',
      document_url: project.document_url || '',
      status: project.status || 'completed',
      skills_used: Array.isArray(project.skills_used) ? project.skills_used.join(', ') : '',
      internship_company: project.internship_company || '',
      is_published: project.is_published !== undefined ? Boolean(project.is_published) : true,
      year: project.year?.toString() || ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setUploadingFiles(true);
    const data = {
      ...form,
      category: form.category,
      academic_year: parseInt(form.academic_year) || undefined,
      semester: parseInt(form.semester) || undefined,
      technologies: form.technologies ? form.technologies.split(',').map(t => t.trim()).filter(Boolean) : [],
      skills_used: form.skills_used ? form.skills_used.split(',').map(t => t.trim()).filter(Boolean) : [],
      year: parseInt(form.year) || undefined,
      is_published: Boolean(form.is_published)
    };

    try {
      const studentId = editStudentId || user?.student_id || user?.username;
      let projectId;
      let response;

      if (currentProject) {
        projectId = currentProject.id;
        response = await studentService.updateProject(studentId, projectId, data);
      } else {
        response = await studentService.createProject(studentId, data);
        projectId = response.data?.id;
      }

      // Upload pending files if any
      if (projectId && newFiles.length > 0) {
        for (const file of newFiles) {
          try {
            await uploadService.uploadProjectFile(projectId, file);
          } catch (uploadErr) {
            console.error('File upload error:', uploadErr);
          }
        }
      }

      if (response.success) {
        toast({
          title: currentProject ? "แก้ไขผลงานสำเร็จ" : "เพิ่มผลงานสำเร็จ",
          description: response.message || "บันทึกข้อมูลผลงานเรียบร้อยแล้ว"
        });
        setIsAddEditOpen(false);
        fetchProjects();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        description: error.response?.data?.message || "โปรดตรวจสอบข้อมูลอีกครั้ง"
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleOpenDelete = (project) => {
    setDeleteId(project.id);
    setDeleteStudentId(project.student?.student_id || project.profile_id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      const studentId = deleteStudentId || user?.student_id || user?.username;
      const response = await studentService.deleteProject(studentId, deleteId);
      if (response.success) {
        toast({ title: "ลบผลงานสำเร็จ", description: "ลบข้อมูลผลงานเรียบร้อยแล้ว" });
        setIsDeleteOpen(false);
        fetchProjects();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบผลงานได้" });
    }
  };

  const handleOpenDetail = (project) => {
    setDetailProject(project);
    setIsDetailOpen(true);
  };

  const canEdit = (project) => {
    if (user?.role === 'admin') return true;
    const studentId = project.student?.student_id || project.profile_id;
    return studentId === (user?.student_id || user?.username);
  };

  // Filtered projects for local search & filters
  const filteredProjects = projects.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      const title = (p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const studentName = (p.student?.name || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !studentName.includes(q)) return false;
    }
    if (filters.category) {
      const label = getCategoryLabel(p.category);
      if (label !== filters.category && p.category !== filters.category) return false;
    }
    return true;
  });

  // Grouped projects by Category for Category View
  const groupedProjects = CATEGORIES.map(cat => {
    const items = filteredProjects.filter(p => getCategoryLabel(p.category) === cat.label);
    return {
      category: cat.label,
      items
    };
  }).filter(group => group.items.length > 0);

  // Any projects that didn't match the standard categories
  const otherItems = filteredProjects.filter(p => {
    const label = getCategoryLabel(p.category);
    return !CATEGORIES.some(cat => cat.label === label);
  });
  if (otherItems.length > 0) {
    groupedProjects.push({
      category: 'ผลงานอื่น ๆ',
      items: otherItems
    });
  }

  const renderProjectCard = (project) => {
    const isOwner = canEdit(project);
    const hasFiles = project.files && project.files.length > 0;
    const firstImageFile = project.files?.find(f => f.file_type?.startsWith('image/'));
    const bannerImage = project.image_url || (firstImageFile ? getFileUrl(firstImageFile.file_path) : null);

    return (
      <div key={project.id} className="border border-purple-100/70 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between group">
        <div className="space-y-3">
          {/* Optional banner image */}
          {bannerImage && (
            <div className="w-full h-36 rounded-xl overflow-hidden bg-purple-50 border border-purple-100/50 relative">
              <img 
                src={bannerImage} 
                alt={project.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
                {project.title}
              </h3>
              {project.student?.name && (
                <p className="text-xs text-gray-500 mt-0.5">โดย {project.student.name}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button onClick={() => handleOpenDetail(project)} variant="ghost" size="icon" className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg" title="ดูรายละเอียด">
                <Eye size={14} />
              </Button>
              {isOwner && (
                <>
                  <Button onClick={() => handleOpenEdit(project)} variant="ghost" size="icon" className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg" title="แก้ไข">
                    <Edit2 size={14} />
                  </Button>
                  <Button onClick={() => handleOpenDelete(project)} variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg" title="ลบ">
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{project.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
              <Tag size={10} className="mr-1" />{getCategoryLabel(project.category)}
            </span>
            {project.academic_year && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <Calendar size={10} className="mr-1" />ปี {project.academic_year}
              </span>
            )}
            {hasFiles && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Paperclip size={10} className="mr-1" />{project.files.length} ไฟล์แนบ
              </span>
            )}
            {project.internship_company && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                <Building2 size={10} className="mr-1" />{project.internship_company}
              </span>
            )}
            {project.is_published === false ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                <EyeOff size={10} className="mr-1" />ไม่แสดงใน Portfolio
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                <Eye size={10} className="mr-1" />แสดงใน Portfolio
              </span>
            )}
          </div>

          {/* Technologies */}
          {Array.isArray(project.technologies) && project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {project.technologies.slice(0, 4).map((tech, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                  {tech}
                </span>
              ))}
              {project.technologies.length > 4 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">
                  +{project.technologies.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Links & Action Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-purple-50 text-[11px]">
          <div className="flex items-center gap-2">
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline flex items-center gap-0.5">
                <ExternalLink size={11} /> GitHub
              </a>
            )}
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                <ExternalLink size={11} /> Demo
              </a>
            )}
            {project.link_url && (
              <a href={project.link_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline flex items-center gap-0.5">
                <ExternalLink size={11} /> ลิงก์
              </a>
            )}
          </div>
          <Button 
            onClick={() => handleOpenDetail(project)} 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[11px] text-purple-700 hover:bg-purple-50 px-2 rounded-md"
          >
            ดูผลงาน &rarr;
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderGit2 className="text-purple-600 h-7 w-7" />
            ผลงาน / แฟ้มสะสมผลงาน (Portfolio)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            จัดการผลงาน โปรเจกต์ระหว่างเรียน แนบไฟล์ผลงาน และเลือกผลงานที่จะแสดงใน Portfolio
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'student' || user?.role === 'alumni') && (
          <Button
            onClick={handleOpenAdd}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md flex items-center gap-1.5 h-10 px-4"
          >
            <Plus size={16} /> เพิ่มผลงานใหม่
          </Button>
        )}
      </div>

      {/* Search, Filter & View Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="ค้นหาชื่อผลงาน, รายละเอียด, ผู้จัดทำ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 border-purple-100 rounded-xl focus:ring-purple-500 h-10 bg-white"
            />
          </form>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border border-purple-100 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-purple-500 bg-white h-10"
          >
            <option value="">ทุกหมวดหมู่ ({filteredProjects.length})</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {(search || filters.category || filters.academic_year) && (
            <Button onClick={handleClearFilters} variant="ghost" className="text-gray-500 h-10 rounded-xl">
              <X size={14} className="mr-1" /> ล้างตัวกรอง
            </Button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-purple-50/80 p-1 rounded-xl border border-purple-100 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-500 hover:text-purple-600'
            }`}
          >
            <LayoutGrid size={14} /> ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grouped' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-gray-500 hover:text-purple-600'
            }`}
          >
            <Layers size={14} /> แยกตามหมวดหมู่
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
          <div className="text-gray-500 font-medium animate-pulse text-sm">กำลังโหลดผลงาน...</div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-3 text-gray-400 bg-white rounded-2xl border border-dashed border-purple-100 p-8">
          <FolderGit2 size={48} className="text-purple-300" />
          <p className="text-sm font-semibold text-gray-700">ไม่พบผลงานที่ค้นหา</p>
          <p className="text-xs text-gray-400">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มผลงานใหม่" เพื่อบันทึกผลงานแรกของคุณ</p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Category View */
        <div className="space-y-8">
          {groupedProjects.map((group) => (
            <div key={group.category} className="space-y-4 bg-white/60 p-5 rounded-2xl border border-purple-100/60 shadow-sm">
              <div className="flex items-center justify-between border-b border-purple-100/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <h2 className="text-base font-bold text-gray-900">{group.category}</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                    {group.items.length} รายการ
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map(project => renderProjectCard(project))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Regular Flat Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => renderProjectCard(project))}
        </div>
      )}

      {/* Add / Edit Project Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-3xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FolderGit2 className="text-purple-600 h-5 w-5" />
              {currentProject ? 'แก้ไขข้อมูลผลงาน' : 'เพิ่มผลงานใหม่'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              กรอกข้อมูลผลงาน โครงงาน กิจกรรม และแนบไฟล์เอกสาร/รูปภาพผลงานของคุณ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">ชื่อผลงาน *</Label>
              <Input 
                name="title" 
                value={form.title} 
                onChange={handleFormChange} 
                placeholder="เช่น ระบบฐานข้อมูลนักศึกษาและแฟ้มสะสมผลงาน" 
                className={`border-purple-100 rounded-xl ${formErrors.title ? 'border-rose-300' : 'focus:ring-purple-500'}`} 
              />
              {formErrors.title && (
                <p className="text-rose-500 text-[11px] flex items-center gap-1">
                  <AlertCircle size={12} /> {formErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">รายละเอียดผลงาน</Label>
              <textarea 
                name="description" 
                value={form.description} 
                onChange={handleFormChange} 
                rows={3} 
                placeholder="อธิบายรายละเอียด บทบาทหน้าที่ วัตถุประสงค์ หรือผลลัพธ์ของผลงานนี้..." 
                className="w-full border border-purple-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none" 
              />
            </div>

            {/* Category & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">หมวดหมู่ผลงาน (Category) *</Label>
                <select 
                  name="category" 
                  value={form.category} 
                  onChange={handleFormChange} 
                  className="w-full border border-purple-100 rounded-xl px-3 py-2 text-sm focus:ring-purple-500 bg-white"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ปีที่สร้างผลงาน (พ.ศ.)</Label>
                <Input 
                  name="year" 
                  type="number" 
                  value={form.year} 
                  onChange={handleFormChange} 
                  placeholder="เช่น 2569" 
                  className="border-purple-100 rounded-xl focus:ring-purple-500" 
                />
              </div>
            </div>

            {/* Academic Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ปีการศึกษา</Label>
                <Input 
                  name="academic_year" 
                  type="number" 
                  value={form.academic_year} 
                  onChange={handleFormChange} 
                  placeholder="2569" 
                  className="border-purple-100 rounded-xl focus:ring-purple-500" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ภาคเรียน / เทอม</Label>
                <select 
                  name="semester" 
                  value={form.semester} 
                  onChange={handleFormChange} 
                  className="w-full border border-purple-100 rounded-xl px-3 py-2 text-sm focus:ring-purple-500 bg-white"
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                  <option value="3">ภาคฤดูร้อน</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ชื่อวิชา / กิจกรรม</Label>
                <Input 
                  name="course_name" 
                  value={form.course_name} 
                  onChange={handleFormChange} 
                  placeholder="เช่น Software Engineering" 
                  className="border-purple-100 rounded-xl focus:ring-purple-500" 
                />
              </div>
            </div>

            {/* Technologies & Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">เทคโนโลยีที่ใช้ (คั่นด้วยเครื่องหมายจุลภาค ,)</Label>
                <Input 
                  name="technologies" 
                  value={form.technologies} 
                  onChange={handleFormChange} 
                  placeholder="React, Node.js, Express, MySQL" 
                  className="border-purple-100 rounded-xl focus:ring-purple-500" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ทักษะที่ใช้ (คั่นด้วยเครื่องหมายจุลภาค ,)</Label>
                <Input 
                  name="skills_used" 
                  value={form.skills_used} 
                  onChange={handleFormChange} 
                  placeholder="Full-stack Development, API Design" 
                  className="border-purple-100 rounded-xl focus:ring-purple-500" 
                />
              </div>
            </div>

            {/* Internship Company */}
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">หน่วยงาน / สถานประกอบการ (ถ้าเกี่ยวข้องกับการฝึกงาน)</Label>
              <Input 
                name="internship_company" 
                value={form.internship_company} 
                onChange={handleFormChange} 
                placeholder="เช่น บริษัท ศูนย์นวัตกรรมเทคโนโลยี จำกัด" 
                className="border-purple-100 rounded-xl focus:ring-purple-500" 
              />
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">GitHub URL</Label>
                <Input 
                  name="github_url" 
                  value={form.github_url} 
                  onChange={handleFormChange} 
                  placeholder="https://github.com/..." 
                  className="border-purple-100 rounded-xl focus:ring-purple-500 text-xs" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Demo URL</Label>
                <Input 
                  name="demo_url" 
                  value={form.demo_url} 
                  onChange={handleFormChange} 
                  placeholder="https://demo..." 
                  className="border-purple-100 rounded-xl focus:ring-purple-500 text-xs" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ลิงก์ผลงานภายนอก</Label>
                <Input 
                  name="link_url" 
                  value={form.link_url} 
                  onChange={handleFormChange} 
                  placeholder="https://..." 
                  className="border-purple-100 rounded-xl focus:ring-purple-500 text-xs" 
                />
              </div>
            </div>

            {/* ===================== FEATURE 1: แนบไฟล์ผลงาน ===================== */}
            <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-purple-600" /> แนบรูปภาพหรือไฟล์ผลงาน
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    รองรับรูปภาพ (JPG, PNG, WebP), ไฟล์เอกสาร PDF, DOC, DOCX (ขนาดไม่เกิน 20 MB ต่อไฟล์)
                  </p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  multiple 
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden" 
                />
                <Button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline" 
                  size="sm" 
                  className="bg-white border-purple-200 text-purple-700 hover:bg-purple-100 text-xs rounded-xl flex items-center gap-1"
                >
                  <UploadCloud size={14} /> เลือกไฟล์แนบ
                </Button>
              </div>

              {/* Existing files list (if editing) */}
              {existingFiles.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-purple-100">
                  <p className="text-[11px] font-semibold text-gray-700">ไฟล์ที่แนบอยู่ในระบบ ({existingFiles.length} ไฟล์):</p>
                  <div className="space-y-1">
                    {existingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-purple-100 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {file.file_type?.startsWith('image/') ? (
                            <ImageIcon size={14} className="text-purple-500 shrink-0" />
                          ) : (
                            <FileText size={14} className="text-blue-500 shrink-0" />
                          )}
                          <span className="font-medium text-gray-800 truncate">{file.original_name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">({formatFileSize(file.file_size)})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={getFileUrl(file.file_path)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-purple-600 hover:text-purple-800 p-1"
                            title="เปิดดูไฟล์"
                          >
                            <Download size={13} />
                          </a>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteExistingFile(file.id)} 
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="ลบไฟล์"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Newly selected files pending upload */}
              {newFiles.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-purple-100">
                  <p className="text-[11px] font-semibold text-purple-800">ไฟล์ที่เลือกใหม่ พร้อมอัปโหลดเมื่อบันทึก ({newFiles.length} ไฟล์):</p>
                  <div className="space-y-1">
                    {newFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-purple-100/50 px-3 py-1.5 rounded-lg text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip size={13} className="text-purple-600 shrink-0" />
                          <span className="font-medium text-purple-950 truncate">{file.name}</span>
                          <span className="text-[10px] text-purple-600 shrink-0">({formatFileSize(file.size)})</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveNewFile(idx)} 
                          className="text-gray-400 hover:text-rose-600 p-1"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ===================== FEATURE 2: แสดงใน Portfolio ===================== */}
            <div className="border border-purple-200/80 rounded-xl p-4 bg-purple-50/20">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="is_published" 
                  checked={form.is_published} 
                  onChange={handleFormChange} 
                  className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 mt-0.5" 
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    แสดงใน Portfolio
                  </span>
                  <p className="text-xs text-gray-500">
                    หากเลือก ผลงานนี้จะปรากฏในหน้ารวมแฟ้มสะสมผลงาน (Portfolio) ของนักศึกษา
                  </p>
                  <p className="text-[11px] text-purple-600 italic">
                    * หากไม่เลือก ผลงานและไฟล์แนบทั้งหมดยังคงบันทึกอยู่ในระบบอย่างปลอดภัย โดยไม่ถูกลบออกจากฐานข้อมูล
                  </p>
                </div>
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-purple-50 gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsAddEditOpen(false)} 
                className="text-gray-500 hover:bg-gray-100 rounded-xl"
                disabled={uploadingFiles}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md px-5"
                disabled={uploadingFiles}
              >
                {uploadingFiles ? 'กำลังบันทึกและอัปโหลดไฟล์...' : (currentProject ? 'อัปเดตผลงาน' : 'บันทึกผลงาน')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {getCategoryLabel(detailProject?.category)}
              </span>
              {detailProject?.is_published === false && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                  ส่วนตัว (ไม่แสดงใน Portfolio)
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 mt-2">{detailProject?.title}</DialogTitle>
            {detailProject?.student?.name && (
              <DialogDescription className="text-xs text-gray-500">
                เจ้าของผลงาน: {detailProject.student.name} {detailProject.student.student_id ? `(${detailProject.student.student_id})` : ''}
              </DialogDescription>
            )}
          </DialogHeader>

          {detailProject && (
            <div className="space-y-4 pt-3">
              {/* Optional Banner Image */}
              {detailProject.image_url && (
                <div className="w-full max-h-60 rounded-xl overflow-hidden bg-purple-50 border border-purple-100">
                  <img src={detailProject.image_url} alt={detailProject.title} className="w-full h-full object-cover" />
                </div>
              )}

              {detailProject.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1">รายละเอียด</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{detailProject.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-purple-50/30 p-4 rounded-xl border border-purple-100/50">
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-0.5">หมวดหมู่</h4>
                  <p className="text-xs text-gray-600">{getCategoryLabel(detailProject.category)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-0.5">ปีการศึกษา / ภาคเรียน</h4>
                  <p className="text-xs text-gray-600">{detailProject.academic_year || '-'} / {detailProject.semester || '-'}</p>
                </div>
                {detailProject.course_name && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-0.5">วิชา</h4>
                    <p className="text-xs text-gray-600">{detailProject.course_name}</p>
                  </div>
                )}
                {detailProject.internship_company && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-0.5">สถานที่ฝึกงาน</h4>
                    <p className="text-xs text-gray-600">{detailProject.internship_company}</p>
                  </div>
                )}
              </div>

              {/* Technologies */}
              {Array.isArray(detailProject.technologies) && detailProject.technologies.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1">เทคโนโลยีที่ใช้</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailProject.technologies.map((tech, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-100 font-medium">{tech}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Files List */}
              {Array.isArray(detailProject.files) && detailProject.files.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-purple-600" /> ไฟล์แนบผลงาน ({detailProject.files.length} ไฟล์)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailProject.files.map((file) => {
                      const isImg = file.file_type?.startsWith('image/');
                      return (
                        <div key={file.id} className="border border-purple-100 rounded-xl p-3 bg-white hover:border-purple-300 transition-colors flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isImg ? (
                              <ImageIcon size={16} className="text-purple-600 shrink-0" />
                            ) : (
                              <FileText size={16} className="text-blue-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate" title={file.original_name}>
                                {file.original_name}
                              </p>
                              <p className="text-[10px] text-gray-400">{formatFileSize(file.file_size)}</p>
                            </div>
                          </div>
                          <a 
                            href={getFileUrl(file.file_path)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download 
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
                          >
                            <Download size={12} /> ดาวน์โหลด
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* External Links */}
              <div className="flex flex-wrap gap-3 pt-2">
                {detailProject.github_url && <a href={detailProject.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> ดูโค้ดบน GitHub</a>}
                {detailProject.demo_url && <a href={detailProject.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> ทดลองใช้งาน (Demo)</a>}
                {detailProject.link_url && <a href={detailProject.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> ลิงก์ภายนอก</a>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">ยืนยันการลบผลงาน</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              คุณแน่ใจหรือไม่ที่จะลบผลงานนี้? การดำเนินการนี้จะลบไฟล์ที่แนบทั้งหมดและไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(false)} className="text-gray-500 hover:bg-gray-100 rounded-xl">
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md">
              ยืนยันการลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Portfolio;
