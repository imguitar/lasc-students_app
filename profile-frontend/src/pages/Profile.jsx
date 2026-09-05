import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import { User, Mail, Shield, Phone, Save, KeyRound, FileText, Download, Edit } from 'lucide-react';
import api from '../services/api';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '../components/ui/dialog';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(false);
  const [resumeSubmitLoading, setResumeSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    skills: '',
    objective: '',
    experience: '',
    linkedin: '',
    github: ''
  });

  const [studentData, setStudentData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isEditResumeOpen, setIsEditResumeOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        skills: user.skills || '',
        objective: user.objective || '',
        experience: user.experience || '',
        linkedin: user.linkedin || '',
        github: user.github || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchResumeData = async () => {
      if (user && (user.role === 'student' || user.role === 'alumni')) {
        setResumeLoading(true);
        try {
          let studentId = null;
          let stdData = null;

          if (user.role === 'student') {
            const studentRes = await api.get(`/students/code/${user.username}`);
            if (studentRes.data.success && studentRes.data.data) {
              stdData = studentRes.data.data;
              setStudentData(stdData);
              studentId = stdData.id;
            }
          } else if (user.role === 'alumni') {
            const alumniRes = await api.get('/alumni');
            if (alumniRes.data.success && alumniRes.data.data) {
              const matchedAlumni = alumniRes.data.data.find(
                a => a.alumni_id === user.username || a.userId === user.id
              );
              if (matchedAlumni) {
                stdData = {
                  ...matchedAlumni,
                  student_id: matchedAlumni.alumni_id,
                  year: matchedAlumni.graduation_year,
                  status: matchedAlumni.employment_status || 'Alumni'
                };
                setStudentData(stdData);
                
                try {
                  const studentRes = await api.get(`/students/code/${matchedAlumni.alumni_id}`);
                  if (studentRes.data.success && studentRes.data.data) {
                    studentId = studentRes.data.data.id;
                  }
                } catch (e) {
                  // ignore
                }
              }
            }
          }

          if (studentId) {
            const projectRes = await api.get(`/projects/student/${studentId}`);
            if (projectRes.data.success && projectRes.data.data && projectRes.data.data.length > 0) {
              setProjectData(projectRes.data.data[0]);
            }
          }
        } catch (error) {
          console.error("Error loading resume data:", error);
        } finally {
          setResumeLoading(false);
        }
      }
    };

    fetchResumeData();
  }, [user]);

  const loadHtml2Pdf = () => {
    return new Promise((resolve, reject) => {
      if (window.html2pdf) {
        resolve(window.html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve(window.html2pdf);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handlePrintCSS = () => {
    const printContent = document.getElementById('resume-pdf-content').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Resume - ${user.firstName} ${user.lastName}</title>
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
              height: 297mm;
              margin: 0;
              padding: 15mm;
              box-sizing: border-box;
            }
            @media print {
              body {
                padding: 15mm;
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
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
        password: formData.password
      });

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        toast({
          title: "สำเร็จ",
          description: "อัปเดตรหัสผ่านเรียบร้อยแล้ว"
        });
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        // Refresh page to get new user data context
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถอัปเดตข้อมูลได้"
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSubmitResume = async (e) => {
    e.preventDefault();
    setResumeSubmitLoading(true);
    try {
      const response = await api.put('/auth/profile', {
        phone: formData.phone && formData.phone !== user?.username ? formData.phone : null,
        skills: formData.skills,
        objective: formData.objective,
        experience: formData.experience,
        linkedin: formData.linkedin,
        github: formData.github
      });

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        toast({
          title: "สำเร็จ",
          description: "อัปเดตข้อมูลประวัติย่อ (Resume / CV) เรียบร้อยแล้ว"
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || "ไม่สามารถอัปเดตข้อมูลประวัติย่อได้"
      });
    } finally {
      setResumeSubmitLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'ผู้ดูแลระบบ (Admin)';
      case 'teacher':
      case 'advisor': return 'อาจารย์ (Teacher)';
      case 'student': return 'นักศึกษา (Student)';
      case 'alumni': return 'ศิษย์เก่า (Alumni)';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <style>{`
        #resume-pdf-content, #resume-pdf-content * {
          font-family: 'Sarabun', sans-serif !important;
        }
      `}</style>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">ข้อมูลส่วนตัว</h1>
          <p className="text-gray-500 text-sm mt-1">จัดการโปรไฟล์และรหัสผ่านของคุณ</p>
        </div>
        {(user?.role === 'student' || user?.role === 'alumni') && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsEditResumeOpen(true)}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl shadow-sm h-10 px-4 flex items-center gap-1.5"
            >
              <Edit className="w-4 h-4 text-purple-600" />
              <span>แก้ไข Resume / CV</span>
            </Button>
            <Button
              onClick={() => setIsResumeOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 h-10 px-4 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>ดาวน์โหลด Resume / CV</span>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-purple-100/50 p-6 shadow-sm text-center">
            <div className="w-24 h-24 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <span className="text-4xl font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500 mb-4">{user?.username}</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100">
              <Shield className="w-3 h-3 mr-1" />
              {getRoleLabel(user?.role)}
            </div>
          </div>
          
          <div className="bg-purple-50/50 rounded-2xl border border-purple-100/50 p-5 space-y-4">
            <div className="flex items-center text-sm">
              <Mail className="w-4 h-4 text-purple-600 mr-3" />
              <span className="text-slate-800 font-medium">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Details and Password Form */}
        <div className="md:col-span-2 space-y-8">
          {/* Card 1: ข้อมูลส่วนตัว (Read-only from DB) */}
          <div className="bg-white rounded-2xl border border-purple-100/50 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
              <User className="w-5 h-5 text-purple-600 mr-2" />
              ข้อมูลรายละเอียด
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm mb-8">
              {(user?.role === 'student' || user?.role === 'alumni') ? (
                <>
                  <div><span className="text-gray-500 block mb-1">รหัสนักศึกษา</span><div className="font-semibold text-slate-800">{user?.username || '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">ชื่อ-นามสกุลเต็ม</span><div className="font-semibold text-slate-800">{user?.profile?.prefix || ''}{user?.profile?.firstname || ''} {user?.profile?.lastname || ''}</div></div>
                  <div><span className="text-gray-500 block mb-1">อีเมล</span><div className="font-semibold text-slate-800">{user?.email || '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">สถานะนักศึกษา</span><div className="font-semibold text-slate-800">{user?.isActive ? 'กำลังศึกษา (Active)' : 'พ้นสภาพ (Inactive)'}</div></div>
                  <div><span className="text-gray-500 block mb-1">คณะ</span><div className="font-semibold text-slate-800">{user?.profile?.faculty?.faculty_name || '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">สาขาวิชา</span><div className="font-semibold text-slate-800">{user?.profile?.department?.department_name || '-'} (รหัส: {user?.profile?.department?.department_id || '-'})</div></div>
                  <div><span className="text-gray-500 block mb-1">ปีที่เข้าศึกษา</span><div className="font-semibold text-slate-800">{user?.username ? '25' + user.username.substring(0,2) : '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">ชั้นปีที่</span><div className="font-semibold text-slate-800">{user?.username ? (parseInt(new Date().getFullYear() + 543) - parseInt('25' + user.username.substring(0,2)) + 1 || 1) : '-'}</div></div>
                  <div className="md:col-span-2"><span className="text-gray-500 block mb-1">ที่อยู่</span><div className="font-semibold text-slate-800">{user?.profile?.address || '-'}</div></div>
                </>
              ) : (
                <>
                  <div><span className="text-gray-500 block mb-1">รหัสบุคลากร</span><div className="font-semibold text-slate-800">{user?.username || '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">ชื่อ-นามสกุลเต็ม</span><div className="font-semibold text-slate-800">{user?.profile?.prefix || ''}{user?.profile?.firstname || ''} {user?.profile?.lastname || ''}</div></div>
                  <div><span className="text-gray-500 block mb-1">อีเมล</span><div className="font-semibold text-slate-800">{user?.email || '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">ประเภทบุคลากร</span><div className="font-semibold text-slate-800">{getRoleLabel(user?.role)}</div></div>
                  <div><span className="text-gray-500 block mb-1">คณะ</span><div className="font-semibold text-slate-800">{user?.profile?.faculty?.faculty_name || '-'}</div></div>
                  <div><span className="text-gray-500 block mb-1">สาขาวิชา</span><div className="font-semibold text-slate-800">{user?.profile?.department?.department_name || '-'} (รหัส: {user?.profile?.department?.department_id || '-'})</div></div>
                  <div><span className="text-gray-500 block mb-1">สถานะการทำงาน</span><div className="font-semibold text-slate-800">{user?.isActive ? 'ปฏิบัติงาน (Active)' : 'ลาออก (Inactive)'}</div></div>
                  <div><span className="text-gray-500 block mb-1">วันที่เริ่มทำงาน</span><div className="font-semibold text-slate-800">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}</div></div>
                </>
              )}
            </div>

            <hr className="border-purple-50" />

            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center pt-6">
              <KeyRound className="w-5 h-5 text-purple-600 mr-2" />
              เปลี่ยนรหัสผ่าน
            </h3>

            <form onSubmit={handleSubmitProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่านใหม่</Label>
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    autoComplete="new-password"
                    value={formData.password} 
                    onChange={handleChange} 
                    className="focus-visible:ring-purple-500"
                    placeholder="กรอกรหัสผ่านใหม่ (หากต้องการเปลี่ยน)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                  <Input 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    type="password" 
                    autoComplete="new-password"
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    className="focus-visible:ring-purple-500"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={profileLoading || !formData.password}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6"
                >
                  {profileLoading ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      กำลังบันทึก...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      บันทึกรหัสผ่านใหม่
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Resume Dialog */}
      <Dialog open={isEditResumeOpen} onOpenChange={setIsEditResumeOpen}>
        <DialogContent className="sm:max-w-3xl bg-white rounded-2xl p-6 shadow-2xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-200/30">
            <DialogTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              แก้ไขข้อมูลประวัติย่อ (Resume / CV)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              แก้ไขข้อมูลสำหรับการดาวน์โหลดประวัติย่อของคุณ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResume} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์ (ไม่บังคับ)</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  type="tel"
                  autoComplete="tel"
                  placeholder="เช่น 08X-XXX-XXXX"
                  value={formData.phone && formData.phone !== user?.username ? formData.phone : ''} 
                  onChange={handleChange} 
                  className="focus-visible:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">ลิงก์ LinkedIn (ไม่บังคับ)</Label>
                <Input 
                  id="linkedin" 
                  name="linkedin" 
                  placeholder="เช่น linkedin.com/in/username"
                  value={formData.linkedin} 
                  onChange={handleChange} 
                  className="focus-visible:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">ลิงก์ GitHub (ไม่บังคับ)</Label>
                <Input 
                  id="github" 
                  name="github" 
                  placeholder="เช่น github.com/username"
                  value={formData.github} 
                  onChange={handleChange} 
                  className="focus-visible:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">ทักษะและความเชี่ยวชาญ (คั่นด้วยเครื่องหมายจุลภาค ,)</Label>
              <Input 
                id="skills" 
                name="skills" 
                placeholder="เช่น HTML, CSS, JavaScript, React, Node.js, SQL"
                value={formData.skills} 
                onChange={handleChange} 
                className="focus-visible:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">เป้าหมายในการทำงาน / แนะนำตัวย่อ</Label>
              <textarea
                id="objective"
                name="objective"
                rows={3}
                placeholder="อธิบายสรุปประวัติสั้นๆ หรือเป้าหมายในการทำงานของคุณเพื่อดึงดูด HR..."
                value={formData.objective}
                onChange={handleChange}
                className="flex min-h-[80px] w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">ประวัติการทำงาน / กิจกรรม / ประสบการณ์อื่นๆ</Label>
              <textarea
                id="experience"
                name="experience"
                rows={5}
                placeholder="ระบุสถานที่ฝึกงาน กิจกรรมระหว่างเรียน โครงการเสริม หรือประสบการณ์ทำงาน (ระบุเป็นรายการได้)..."
                value={formData.experience}
                onChange={handleChange}
                className="flex min-h-[120px] w-full rounded-xl border border-purple-100 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-purple-50 pt-4">
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setIsEditResumeOpen(false)}
                className="rounded-xl px-4"
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                disabled={resumeSubmitLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6"
              >
                {resumeSubmitLoading ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    บันทึกข้อมูล Resume / CV
                  </span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resume Dialog */}
      <Dialog open={isResumeOpen} onOpenChange={setIsResumeOpen}>
        <DialogContent className="sm:max-w-4xl bg-gray-100 rounded-2xl p-6 shadow-2xl border border-purple-100/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-purple-200/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold text-purple-900">
                ส่งออกประวัติส่วนตัวและผลงาน (Resume / CV)
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400 mt-1">
                เพื่อฟอนต์ภาษาไทยและวรรณยุกต์ที่ถูกต้อง 100% โปรดเลือกปลายทาง (Destination) เป็น **"บันทึกเป็น PDF" (Save as PDF)** ในหน้าต่างป๊อปอัป
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-end">
              <Button
                onClick={handlePrintCSS}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลด PDF
              </Button>
            </div>
          </DialogHeader>

          {resumeLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
              <span className="text-gray-500 text-xs font-semibold">กำลังจัดเตรียมข้อมูล Resume...</span>
            </div>
          ) : (
            <div className="flex justify-center p-2 bg-gray-200 rounded-xl max-h-[60vh] overflow-y-auto shadow-inner">
              {/* Resume A4 Sheet Container */}
              <div 
                id="resume-pdf-content" 
                className="w-[210mm] min-h-[297mm] bg-white text-slate-800 p-[15mm] shadow-lg flex flex-col justify-between text-sm leading-relaxed"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                {/* Header */}
                <div className="border-b-4 border-purple-600 pb-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {user?.firstName} {user?.lastName}
                      </h1>
                      <p className="text-purple-600 font-bold text-sm mt-1">
                        {studentData?.department || 'สาขาวิชาวิศวกรรมซอฟต์แวร์'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 flex-1">
                  {/* Left Column: Personal info & Skills */}
                  <div className="col-span-1 border-r border-gray-100 pr-4 space-y-6">
                    {/* ข้อมูลส่วนตัว */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">ข้อมูลส่วนตัว</h3>
                      <div className="space-y-1 text-[11px] text-gray-600">
                        <p><span className="font-semibold text-slate-800">รหัสนักศึกษา:</span> {studentData?.student_id || user?.username}</p>
                        <p><span className="font-semibold text-slate-800">อีเมล:</span> {user?.email}</p>
                        <p><span className="font-semibold text-slate-800">โทรศัพท์:</span> {(user?.phone && user.phone !== user.username) ? user.phone : '-'}</p>
                        {user?.linkedin && <p><span className="font-semibold text-slate-800">LinkedIn:</span> {user.linkedin}</p>}
                        {user?.github && <p><span className="font-semibold text-slate-800">GitHub:</span> {user.github}</p>}
                      </div>
                    </div>

                    {/* Education */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">ประวัติการศึกษา</h3>
                      <div className="space-y-1">
                        <p className="font-bold text-xs text-slate-800">มหาวิทยาลัยราชภัฏศรีสะเกษ</p>
                        <p className="text-[11px] text-gray-600">{studentData?.faculty || 'คณะศิลปศาสตร์และวิทยาศาสตร์'}</p>
                        <p className="text-[11px] text-gray-500">
                          {user?.role === 'alumni' 
                            ? `สำเร็จการศึกษาปี พ.ศ. ${studentData?.year || ''}` 
                            : `นักศึกษาชั้นปีที่ ${studentData?.year || 4}`
                          }
                        </p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">ทักษะและความเชี่ยวชาญ</h3>
                      <div className="flex flex-wrap gap-1">
                        {user?.skills ? (
                          user.skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                            <span key={idx} className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))
                        ) : projectData?.tags ? (
                          (() => {
                            let tagsArray = [];
                            try {
                              tagsArray = Array.isArray(projectData.tags) 
                                ? projectData.tags 
                                : JSON.parse(projectData.tags);
                            } catch (e) {
                              tagsArray = projectData.tags.split(',').map(t => t.trim());
                            }
                            return tagsArray.map((tag, idx) => (
                              <span key={idx} className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ));
                          })()
                        ) : (
                          <>
                            <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">JavaScript</span>
                            <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">React</span>
                            <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">Node.js</span>
                            <span className="bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">SQL</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">สถานะการทำงาน</h3>
                      <span className="inline-block bg-slate-100 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                        {studentData?.status === 'employed' ? 'มีงานทำแล้ว' : 
                         studentData?.status === 'seeking' ? 'กำลังหางาน' : 
                         studentData?.status === 'studying' ? 'กำลังศึกษาต่อ' : 
                         studentData?.status === 'Active' ? 'กำลังศึกษาอยู่' : 'ทั่วไป'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Experience / Projects */}
                  <div className="col-span-2 space-y-6">
                    {/* Senior Project Section */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider border-b border-gray-100 pb-1">ผลงานโครงงานวิทยาการคอมพิวเตอร์ / วิศวกรรมซอฟต์แวร์</h3>
                      {projectData ? (
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-800">{projectData.title_th}</h4>
                            <p className="text-xs text-gray-500 italic font-medium">{projectData.title_en}</p>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed text-justify">
                            {projectData.description}
                          </p>
                          <div className="text-[11px] text-gray-500 space-y-0.5 pt-1">
                            <p><strong>อาจารย์ที่ปรึกษา:</strong> {projectData.advisor?.name || '-'}</p>
                            {projectData.has_award && (
                              <p className="text-amber-600 font-semibold">🏆 รางวัล: {projectData.award_name}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">
                          ไม่มีข้อมูลโปรเจกต์จบจดทะเบียนในระบบ
                        </div>
                      )}
                    </div>

                    {/* Work Experience / Activities */}
                    {user?.experience && (
                      <div className="space-y-3 pt-1">
                        <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider border-b border-gray-100 pb-1">ประสบการณ์การทำงาน / กิจกรรม</h3>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line text-justify">
                          {user.experience}
                        </p>
                      </div>
                    )}

                    {/* About me / Summary */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider border-b border-gray-100 pb-1">เป้าหมายในการทำงาน</h3>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line text-justify">
                        {user?.objective || "มุ่งมั่นที่จะนำความรู้ด้านการวิเคราะห์ ออกแบบ และการพัฒนาซอฟต์แวร์ที่ได้รับจากการศึกษา ตลอดจนทักษะในการพัฒนาโครงงานจบมาประยุกต์ใช้เพื่อแก้ไขปัญหาและส่งมอบนวัตกรรมซอฟต์แวร์ที่มีคุณภาพให้กับองค์กร"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 pt-3 text-[10px] text-gray-400 flex justify-between items-center">
                  <p>มหาวิทยาลัยราชภัฏศรีสะเกษ - ระบบบริหารจัดการข้อมูลและโครงงานจบ</p>
                  <p>สร้างโดยอัตโนมัติจากระบบ</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
