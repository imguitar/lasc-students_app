import React, { useEffect, useState } from 'react';
import { studentService, studentProjectService } from '../services';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { 
  FolderGit2, Search, Plus, Edit2, Trash2, X, AlertCircle, ExternalLink, Eye, EyeOff, Calendar, Tag, Building2, ChevronDown
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '../components/ui/dialog';

const CATEGORIES = ['Coursework', 'Competition', 'Personal', 'Research', 'Internship', 'Other'];

const Portfolio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    title: '', description: '', category: 'Coursework',
    academic_year: '', semester: '1', course_name: '',
    technologies: '', github_url: '', demo_url: '', link_url: '',
    image_url: '', document_url: '', status: 'completed',
    skills_used: '', internship_company: '', is_published: true, year: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [editStudentId, setEditStudentId] = useState(null);

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

  const handleOpenAdd = () => {
    setCurrentProject(null);
    setEditStudentId(user?.student_id || user?.username || null);
    setForm({
      title: '', description: '', category: 'Coursework',
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
    setForm({
      title: project.title || '',
      description: project.description || '',
      category: project.category || 'Coursework',
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
      is_published: project.is_published !== undefined ? project.is_published : true,
      year: project.year?.toString() || ''
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = {
      ...form,
      academic_year: parseInt(form.academic_year) || undefined,
      semester: parseInt(form.semester) || undefined,
      technologies: form.technologies ? form.technologies.split(',').map(t => t.trim()).filter(Boolean) : [],
      skills_used: form.skills_used ? form.skills_used.split(',').map(t => t.trim()).filter(Boolean) : [],
      year: parseInt(form.year) || undefined,
      is_published: form.is_published
    };

    try {
      const studentId = editStudentId || user?.student_id || user?.username;
      let response;
      if (currentProject) {
        response = await studentService.updateProject(studentId, currentProject.id, data);
      } else {
        response = await studentService.createProject(studentId, data);
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

  // Filtered projects for local search
  const filteredProjects = projects.filter(p => {
    if (search) {
      const q = search.toLowerCase();
      const title = (p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const studentName = (p.student?.name || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !studentName.includes(q)) return false;
    }
    return true;
  });

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
            จัดการผลงาน โปรเจกต์ระหว่างเรียน และแฟ้มสะสมผลงานสำหรับ Portfolio / Resume
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'student' || user?.role === 'alumni') && (
          <Button
            onClick={handleOpenAdd}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md flex items-center gap-1.5 h-10"
          >
            <Plus size={16} /> เพิ่มผลงาน
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="ค้นหาผลงาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-purple-100 rounded-xl focus:ring-purple-500 h-10"
          />
        </form>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border border-purple-100 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-purple-500 bg-white h-10"
        >
          <option value="">ทุกประเภท</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || filters.category || filters.academic_year) && (
          <Button onClick={handleClearFilters} variant="ghost" className="text-gray-500 h-10 rounded-xl">
            <X size={14} className="mr-1" /> ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
          <div className="text-gray-500 font-medium animate-pulse text-sm">กำลังโหลดผลงาน...</div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-3 text-gray-400">
          <FolderGit2 size={48} className="text-gray-300" />
          <p className="text-sm font-medium">ไม่พบผลงาน</p>
          <p className="text-xs">ลองเปลี่ยนตัวกรองหรือเพิ่มผลงานใหม่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <div key={project.id} className="border border-purple-100/60 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all p-5 space-y-3 group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{project.title}</h3>
                  {project.student?.name && (
                    <p className="text-xs text-gray-500 mt-0.5">โดย {project.student.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <Button onClick={() => handleOpenDetail(project)} variant="ghost" size="icon" className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg">
                    <Eye size={14} />
                  </Button>
                  {canEdit(project) && (
                    <>
                      <Button onClick={() => handleOpenEdit(project)} variant="ghost" size="icon" className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg">
                        <Edit2 size={14} />
                      </Button>
                      <Button onClick={() => handleOpenDelete(project)} variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg">
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {project.description && (
                <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {project.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                    <Tag size={10} className="mr-1" />{project.category}
                  </span>
                )}
                {project.academic_year && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    <Calendar size={10} className="mr-1" />ปี {project.academic_year}
                  </span>
                )}
                {project.internship_company && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                    <Building2 size={10} className="mr-1" />{project.internship_company}
                  </span>
                )}
                {project.is_published === false && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    <EyeOff size={10} className="mr-1" />ส่วนตัว
                  </span>
                )}
              </div>

              {/* Technologies */}
              {Array.isArray(project.technologies) && project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1">
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

              {/* Links */}
              <div className="flex items-center gap-2 pt-1">
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink size={10} /> GitHub
                  </a>
                )}
                {project.demo_url && (
                  <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink size={10} /> Demo
                  </a>
                )}
                {project.link_url && (
                  <a href={project.link_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink size={10} /> ลิงก์ผลงาน
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-50">
            <DialogTitle className="text-lg font-bold text-gray-900">
              {currentProject ? 'แก้ไขผลงาน' : 'เพิ่มผลงานใหม่'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              กรอกข้อมูลผลงาน โปรเจกต์ หรือกิจกรรมระหว่างเรียน
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">ชื่อผลงาน *</Label>
              <Input name="title" value={form.title} onChange={handleFormChange} placeholder="เช่น ระบบจัดการร้านอาหาร" className={`border-purple-100 rounded-xl ${formErrors.title ? 'border-rose-300' : 'focus:ring-purple-500'}`} />
              {formErrors.title && <p className="text-rose-500 text-[11px] flex items-center gap-1"><AlertCircle size={12} /> {formErrors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">รายละเอียดผลงาน</Label>
              <textarea name="description" value={form.description} onChange={handleFormChange} rows={3} placeholder="อธิบายรายละเอียดผลงาน..." className="w-full border border-purple-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ประเภทผลงาน</Label>
                <select name="category" value={form.category} onChange={handleFormChange} className="w-full border border-purple-100 rounded-xl px-3 py-2 text-sm focus:ring-purple-500 bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ปีที่สร้างผลงาน (พ.ศ.)</Label>
                <Input name="year" type="number" value={form.year} onChange={handleFormChange} placeholder="เช่น 2569" className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ปีการศึกษา</Label>
                <Input name="academic_year" type="number" value={form.academic_year} onChange={handleFormChange} placeholder="2569" className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">เทอม</Label>
                <select name="semester" value={form.semester} onChange={handleFormChange} className="w-full border border-purple-100 rounded-xl px-3 py-2 text-sm focus:ring-purple-500 bg-white">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">ฤดูร้อน</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ชื่อวิชา</Label>
                <Input name="course_name" value={form.course_name} onChange={handleFormChange} placeholder="เช่น Web Development" className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">เทคโนโลยีที่ใช้ (คั่นด้วย ,)</Label>
                <Input name="technologies" value={form.technologies} onChange={handleFormChange} placeholder="React, Node.js, MySQL" className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ทักษะที่ใช้ (คั่นด้วย ,)</Label>
                <Input name="skills_used" value={form.skills_used} onChange={handleFormChange} placeholder="Web Dev, Database Design" className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 text-xs font-semibold">ที่ฝึกงาน (ถ้ามี)</Label>
              <Input name="internship_company" value={form.internship_company} onChange={handleFormChange} placeholder="เช่น บริษัท ABC จำกัด" className="border-purple-100 rounded-xl focus:ring-purple-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">GitHub URL</Label>
                <Input name="github_url" value={form.github_url} onChange={handleFormChange} placeholder="https://github.com/..." className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">Demo URL</Label>
                <Input name="demo_url" value={form.demo_url} onChange={handleFormChange} placeholder="https://..." className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">ลิงก์ผลงาน</Label>
                <Input name="link_url" value={form.link_url} onChange={handleFormChange} placeholder="https://..." className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 text-xs font-semibold">URL เอกสาร</Label>
                <Input name="document_url" value={form.document_url} onChange={handleFormChange} placeholder="https://..." className="border-purple-100 rounded-xl focus:ring-purple-500" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange} className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-xs font-semibold text-gray-700">เผยแพร่ผลงาน (แสดงให้ผู้อื่นเห็น)</span>
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-purple-50 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddEditOpen(false)} className="text-gray-500 hover:bg-gray-100 rounded-xl">
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md">
                {currentProject ? 'อัปเดตผลงาน' : 'บันทึกผลงาน'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 shadow-xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">{detailProject?.title}</DialogTitle>
            {detailProject?.student?.name && (
              <DialogDescription className="text-sm text-gray-500">โดย {detailProject.student.name}</DialogDescription>
            )}
          </DialogHeader>

          {detailProject && (
            <div className="space-y-4 pt-3">
              {detailProject.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1">รายละเอียด</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{detailProject.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {detailProject.category && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-1">ประเภท</h4>
                    <p className="text-sm text-gray-600">{detailProject.category}</p>
                  </div>
                )}
                {detailProject.academic_year && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-1">ปีการศึกษา / เทอม</h4>
                    <p className="text-sm text-gray-600">{detailProject.academic_year} / {detailProject.semester || '-'}</p>
                  </div>
                )}
                {detailProject.course_name && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-1">วิชา</h4>
                    <p className="text-sm text-gray-600">{detailProject.course_name}</p>
                  </div>
                )}
                {detailProject.internship_company && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 mb-1">ที่ฝึกงาน</h4>
                    <p className="text-sm text-gray-600">{detailProject.internship_company}</p>
                  </div>
                )}
              </div>

              {Array.isArray(detailProject.technologies) && detailProject.technologies.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1">เทคโนโลยี</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailProject.technologies.map((tech, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-100 font-medium">{tech}</span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(detailProject.skills_used) && detailProject.skills_used.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1">ทักษะที่ใช้</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailProject.skills_used.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100 font-medium">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {detailProject.github_url && <a href={detailProject.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> GitHub</a>}
                {detailProject.demo_url && <a href={detailProject.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> Demo</a>}
                {detailProject.link_url && <a href={detailProject.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> ลิงก์ผลงาน</a>}
                {detailProject.document_url && <a href={detailProject.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline flex items-center gap-1"><ExternalLink size={12} /> เอกสาร</a>}
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
              คุณแน่ใจหรือไม่ที่จะลบผลงานนี้? การดำเนินการนี้ไม่สามารถกู้คืนได้
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
