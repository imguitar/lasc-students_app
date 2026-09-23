import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import {
  TextField,
  MenuItem,
  Button,
  Input,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { User, Building2, UserCheck, Briefcase, Search, ArrowLeft, Upload, FileCheck, Info, Menu } from 'lucide-react';
import api from '../../api/axios';
import './NewRequestPage.css';
import './Dashboard/DashboardPage.css'; // Import dashboard styles
import StudentSidebar from '../../components/StudentSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';
import ModernButton from '../../components/ModernButton';
import StatusBadge from '../../components/StatusBadge';
import { isStudentEditableStatus } from './Dashboard/MyRequestsPage';
import { getEffectiveInternshipStatus } from '../../utils/internshipStatus';
import {
  getProvinces,
  getAmphoes,
  getDistricts,
  getZipcode
} from '../../utils/thaiAddress';
const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('ไม่สามารถโหลดไฟล์รูปภาพได้'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });

const calculateStudentYear = (studentId) => {
  if (!studentId || typeof studentId !== 'string') return '';
  const cleanId = studentId.trim();
  if (cleanId.length < 2) return '';
  const entryYearDigits = parseInt(cleanId.slice(0, 2), 10);
  if (Number.isNaN(entryYearDigits)) return '';

  const entryYearFull = 2500 + entryYearDigits;
  const currentThaiYear = new Date().getFullYear() + 543;
  const calculatedYear = (currentThaiYear - entryYearFull) + 1;

  if (calculatedYear > 0) {
    return String(calculatedYear);
  }
  return '';
};

const NewRequestPage = () => {
  const DIGIT_ONLY_FIELDS = new Set(['studentId', 'homePostal', 'companyPostal']);
  const MAX_DIGIT_LENGTH_FIELDS = {
    homePostal: 5,
    companyPostal: 5,
  };
  const departmentOptions = [
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
  ];
  const navigate = useNavigate();
  const { id } = useParams();
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [existingActiveRequest, setExistingActiveRequest] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [existingStatus, setExistingStatus] = useState('');
  const _alertShown = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [useManualAddress, _setUseManualAddress] = useState(false);
  const [useManualCompanyAddress, _setUseManualCompanyAddress] = useState(false);
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);
  const [recommendedCompanies, setRecommendedCompanies] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const previousOverflow = useRef({ body: null, html: null });
  const [focusedCompany, setFocusedCompany] = useState(null);
  
  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(userStr);

    if (id) {
      // Edit mode: fetch existing request data
      api.get(`/requests/${id}`).then(res => {
        const reqData = res.data.data;
        if (reqData) {
          const status = reqData.status || '';
          const effectiveStatus = getEffectiveInternshipStatus(reqData) || status;
          setExistingStatus(effectiveStatus);
          const editable = isStudentEditableStatus(effectiveStatus);
          setIsReadOnly(!editable);

          const details = reqData.details || {};
          const studentInfo = details.student_info || {};
          const companyAddress = details.companyAddress || {};

          const targetStudentId = studentInfo.studentId || reqData.studentId || '';
          const targetStudentYear = studentInfo.year || calculateStudentYear(targetStudentId) || '';

          setFormData(prev => ({
            ...prev,
            studentTitle: studentInfo.title || '',
            studentName: studentInfo.name || reqData.studentName || '',
            studentEmail: studentInfo.email || '',
            studentId: targetStudentId,
            studentYear: targetStudentYear,
            lastSemesterGrade: studentInfo.lastSemesterGrade || '',
            studentMajor: studentInfo.major || reqData.department || '',
            homeHouse: studentInfo.address?.house || '',
            homeMoo: studentInfo.address?.moo || '',
            homeTambon: studentInfo.address?.tambon || '',
            homeAmphur: studentInfo.address?.amphur || '',
            homeProvince: studentInfo.address?.province || '',
            homePostal: studentInfo.address?.postal || '',
            studentPhone: studentInfo.phone || '',
            
            companyName: details.companyName || reqData.company || '',
            companyHouse: companyAddress.house || '',
            companyMoo: companyAddress.moo || '',
            companyTambon: companyAddress.tambon || '',
            companyAmphur: companyAddress.amphur || '',
            companyProvince: companyAddress.province || '',
            companyPostal: companyAddress.postal || '',
            address: companyAddress.detail || '',
            
            supervisor: details.contactPerson || '',
            supervisorPosition: details.contactPosition || '',
            supervisorEmail: details.contactEmail || '',
            supervisorPhone: details.contactPhone || '',
            position: reqData.position || details.position || '',
            internshipTerm: details.internshipTerm || '',
            jobDescription: details.description || '',
            skills: details.skills || ''
          }));

          if (details.studentPhoto && details.studentPhoto.dataUrl) {
            // Reconstruct a File object-like state for display
            fetch(details.studentPhoto.dataUrl)
              .then(r => r.blob())
              .then(blob => {
                const file = new File([blob], details.studentPhoto.name || 'photo.jpg', { type: blob.type });
                setStudentPhoto(file);
              });
          }
        }
      }).catch(err => {
        console.error('Failed to load existing request:', err);
        alert('ไม่สามารถโหลดข้อมูลคำร้องเดิมได้');
        navigate('/dashboard/my-requests');
      });
    } else {
      // New mode: Prefill student-related fields if available from the logged-in user
      const targetStudentId = user.student_code || user.studentId || user.username || '';
      const calculatedYear = calculateStudentYear(targetStudentId);

      setFormData(prev => ({
        ...prev,
        studentName: user.full_name || user.name || prev.studentName,
        studentEmail: user.email || prev.studentEmail,
        studentId: targetStudentId || prev.studentId,
        studentYear: prev.studentYear || calculatedYear,
        studentMajor: user.major || prev.studentMajor,
        studentPhone: user.phone || prev.studentPhone
      }));

      // Check for existing active request via API only in NEW mode
      const studentId = targetStudentId;
      api.get(`/requests?studentId=${studentId}`).then(res => {
        const REJECTED_STATUSES = ['ไม่อนุมัติ (อาจารย์)', 'ไม่อนุมัติ (Admin)', 'ปฏิเสธ'];
        const activeRequest = (res.data.data || []).find(req => !REJECTED_STATUSES.includes(req.status));
        if (activeRequest) {
          setExistingActiveRequest(activeRequest);
          setHasExistingRequest(true);
        }
      }).catch(err => console.error('Failed to check existing requests:', err));
    }

  }, [navigate, id]);



  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const [formData, setFormData] = useState({
    companyName: '',
    position: '',
    address: '',
    supervisor: '',
    supervisorEmail: '',
    supervisorPhone: '',
    supervisorPosition: '',
    internshipTerm: '',

    // Company address fields
    companyHouse: '',
    companyMoo: '',
    companyProvince: '',
    companyAmphur: '',
    companyTambon: '',
    companyPostal: '',

    // Student personal fields
    studentTitle: '',
    studentName: '',
    studentEmail: '',
    studentId: '',
    studentYear: '',
    lastSemesterGrade: '',
    studentMajor: '',
    homeHouse: '',
    homeMoo: '',
    homeTambon: '',
    homeAmphur: '',
    homeProvince: '',
    homePostal: '',
    studentPhone: '',

    jobDescription: '',
    skills: ''
  });

  const provinceOptions = useMemo(() => getProvinces(), []);

  const homeAmphurOptions = useMemo(() => {
    return getAmphoes(formData.homeProvince);
  }, [formData.homeProvince]);

  const homeTambonOptions = useMemo(() => {
    return getDistricts(formData.homeProvince, formData.homeAmphur);
  }, [formData.homeProvince, formData.homeAmphur]);

  const companyAmphurOptions = useMemo(() => {
    return getAmphoes(formData.companyProvince);
  }, [formData.companyProvince]);

  const companyTambonOptions = useMemo(() => {
    return getDistricts(formData.companyProvince, formData.companyAmphur);
  }, [formData.companyProvince, formData.companyAmphur]);



  const [studentPhoto, setStudentPhoto] = useState(null);

  const sanitizeGradeInput = (value) => {
    let normalized = String(value || '').replace(/[^\d.]/g, '');
    if (!normalized) return '';

    if (normalized.startsWith('.')) {
      normalized = `0${normalized}`;
    }

    const parts = normalized.split('.');
    const integerPartRaw = parts[0] || '';
    const decimalPartRaw = parts.slice(1).join('');

    let integerPart = integerPartRaw.replace(/^0+(\d)/, '$1');
    if (integerPart === '') integerPart = '0';

    const integerNumber = Number(integerPart);
    if (!Number.isNaN(integerNumber) && integerNumber > 4) {
      integerPart = '4';
    }

    const decimalPart = decimalPartRaw.slice(0, 2);
    return normalized.includes('.') ? `${integerPart}.${decimalPart}` : integerPart;
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (DIGIT_ONLY_FIELDS.has(name)) {
      nextValue = value.replace(/\D/g, '');

      if (MAX_DIGIT_LENGTH_FIELDS[name]) {
        nextValue = nextValue.slice(0, MAX_DIGIT_LENGTH_FIELDS[name]);
      }
    }

    if (name === 'lastSemesterGrade') {
      nextValue = sanitizeGradeInput(value);
    }

    setFormData({
      ...formData,
      [name]: nextValue
    });
  };

  const handleProvinceChange = (value) => {
    const selectedValue = value || '';
    setFormData((prev) => ({
      ...prev,
      homeProvince: selectedValue,
      homeAmphur: '',
      homeTambon: '',
      homePostal: ''
    }));
  };

  const handleAmphureChange = (value) => {
    const selectedValue = value || '';
    setFormData((prev) => ({
      ...prev,
      homeAmphur: selectedValue,
      homeTambon: '',
      homePostal: ''
    }));
  };

  const handleTambonChange = (value) => {
    const selectedValue = value || '';
    const zip = getZipcode(formData.homeProvince, formData.homeAmphur, selectedValue);
    setFormData((prev) => ({
      ...prev,
      homeTambon: selectedValue,
      homePostal: zip || prev.homePostal
    }));
  };

  const handleCompanyProvinceChange = (value) => {
    const selectedValue = value || '';
    setFormData((prev) => ({
      ...prev,
      companyProvince: selectedValue,
      companyAmphur: '',
      companyTambon: '',
      companyPostal: ''
    }));
  };

  const handleCompanyAmphureChange = (value) => {
    const selectedValue = value || '';
    setFormData((prev) => ({
      ...prev,
      companyAmphur: selectedValue,
      companyTambon: '',
      companyPostal: ''
    }));
  };

  const handleCompanyTambonChange = (value) => {
    const selectedValue = value || '';
    const zip = getZipcode(formData.companyProvince, formData.companyAmphur, selectedValue);
    setFormData((prev) => ({
      ...prev,
      companyTambon: selectedValue,
      companyPostal: zip || prev.companyPostal
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setStudentPhoto(null);
      return;
    }
    
    // Limit to 20MB
    if (file.size > 20 * 1024 * 1024) {
      alert('ไฟล์มีขนาดใหญ่เกินไป กรุณาอัพโหลดไฟล์ขนาดไม่เกิน 20MB');
      e.target.value = null;
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('กรุณาอัพโหลดไฟล์รูปภาพ (JPG, PNG) หรือ PDF เท่านั้น');
      e.target.value = null;
      return;
    }
    setStudentPhoto(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('คำร้องนี้ได้รับการอนุมัติแล้ว อยู่ในโหมดอ่านอย่างเดียว');
      return;
    }
    if (hasExistingRequest && !id) return;

    const studentPhoneDigits = String(formData.studentPhone || '').replace(/\D/g, '');
    if (formData.studentPhone && (studentPhoneDigits.length < 9 || studentPhoneDigits.length > 15)) {
      alert('กรุณากรอกเบอร์โทรศัพท์นักศึกษาให้ถูกต้อง (9-15 หลัก)');
      return;
    }
    const supervisorPhoneDigits = String(formData.supervisorPhone || '').replace(/\D/g, '');
    if (formData.supervisorPhone && (supervisorPhoneDigits.length < 9 || supervisorPhoneDigits.length > 15)) {
      alert('กรุณากรอกเบอร์โทรหัวหน้าหน่วยงานให้ถูกต้อง (9-15 หลัก)');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      let photoData = null;
      if (studentPhoto) {
        photoData = await compressImage(studentPhoto, 1200, 1200, 0.75);
      }

      const details = {
        student_info: {
          title: formData.studentTitle,
          name: formData.studentName,
          email: formData.studentEmail,
          studentId: formData.studentId,
          year: formData.studentYear,
          lastSemesterGrade: formData.lastSemesterGrade,
          major: formData.studentMajor,
          address: {
            house: formData.homeHouse,
            moo: formData.homeMoo,
            tambon: formData.homeTambon,
            amphur: formData.homeAmphur,
            province: formData.homeProvince,
            postal: formData.homePostal
          },
          phone: formData.studentPhone
        },
        companyAddress: {
          house: formData.companyHouse,
          moo: formData.companyMoo,
          tambon: formData.companyTambon,
          amphur: formData.companyAmphur,
          province: formData.companyProvince,
          postal: formData.companyPostal,
          detail: formData.address,
        },
        contactPerson: formData.supervisor,
        contactPosition: formData.supervisorPosition,
        contactEmail: formData.supervisorEmail,
        contactPhone: formData.supervisorPhone,
        internshipTerm: formData.internshipTerm,
        description: formData.jobDescription,
        skills: formData.skills,
        studentPhoto: photoData ? { name: studentPhoto.name, dataUrl: photoData } : null
      };

      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      let newStatus = 'รออาจารย์ที่ปรึกษาอนุมัติ';
      if (id && existingStatus && !['ไม่อนุมัติ (อาจารย์)', 'ไม่อนุมัติ (Admin)', 'ปฏิเสธ'].includes(existingStatus)) {
        newStatus = existingStatus;
      }

      const requestPayload = {
        studentId: formData.studentId || user.student_code || user.username || 'N/A',
        studentName: formData.studentName || user.full_name || user.name || 'Student',
        department: formData.studentMajor || user.major || '',
        company: formData.companyName,
        position: formData.position,
        submittedDate: formattedDate,
        status: newStatus,
        details,
      };

      if (id) {
        await api.put(`/requests/${id}`, requestPayload);
      } else {
        await api.post('/requests', requestPayload);
      }

      // Update avatar in localStorage if photo is an image
      if (studentPhoto && studentPhoto.type.startsWith('image/') && photoData) {
        try {
          const latestUser = { ...user, avatar: photoData };
          localStorage.setItem('user', JSON.stringify(latestUser));
        } catch (err) {
          console.error("Failed to update user avatar", err);
        }
      }

      if (id) {
        alert('แก้ไขคำร้องและบันทึกการเปลี่ยนแปลงสำเร็จ!');
      } else {
        alert('ยื่นคำร้องสำเร็จ! รอการอนุมัติจากอาจารย์ที่ปรึกษา');
      }
      navigate('/dashboard/my-requests');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('เกิดข้อผิดพลาดในการยื่นคำร้อง: ' + (error.response?.data?.message || error.message));
    }
  };

  const normalizeCompanyAddress = (rawAddress) => {
    if (!rawAddress) return { detail: '', fullText: '' };
    if (typeof rawAddress === 'string') {
      return { detail: rawAddress, fullText: rawAddress };
    }
    if (typeof rawAddress === 'object') {
      const formatted = {
        house: rawAddress.house || rawAddress.no || '',
        moo: rawAddress.moo || rawAddress.village || '',
        tambon: rawAddress.tambon || rawAddress.subdistrict || '',
        amphur: rawAddress.amphur || rawAddress.district || '',
        province: rawAddress.province || rawAddress.city || '',
        postal: rawAddress.postal || rawAddress.zip || '',
        detail: rawAddress.detail || rawAddress.description || '',
      };
      const fullText = [
        formatted.house,
        formatted.moo && `หมู่ ${formatted.moo}`,
        formatted.tambon && `ต.${formatted.tambon}`,
        formatted.amphur && `อ.${formatted.amphur}`,
        formatted.province && `จ.${formatted.province}`,
        formatted.postal && `รหัส ${formatted.postal}`,
        formatted.detail,
      ]
        .filter(Boolean)
        .join(' ');
      return { ...formatted, fullText };
    }
    return { detail: '', fullText: '' };
  };

  const loadRecommendedCompanies = async () => {
    setRecommendedLoading(true);
    setRecommendedError('');
    try {
      const res = await api.get('/public/companies');
      setRecommendedCompanies(res.data.data || []);
    } catch {
      setRecommendedError('ไม่สามารถโหลดข้อมูลสถานประกอบการแนะนำได้');
    } finally {
      setRecommendedLoading(false);
    }
  };

  const handleOpenCompanyPicker = () => {
    setCompanyPickerOpen(true);
    if (!recommendedCompanies.length && !recommendedLoading) {
      loadRecommendedCompanies();
    }
  };

  const handleCloseCompanyPicker = () => {
    setCompanyPickerOpen(false);
    setCompanySearch('');
    setFocusedCompany(null);
  };

  const filteredRecommendedCompanies = useMemo(() => {
    const keyword = companySearch.trim().toLowerCase();
    if (!keyword) return recommendedCompanies;
    return recommendedCompanies.filter((company) => {
      const fields = [company.name, company.businessType, company.address, company.contactPerson]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((field) => field.includes(keyword));
    });
  }, [companySearch, recommendedCompanies]);

  const applyRecommendedCompany = (company) => {
    if (!company) return;
    const normalized = normalizeCompanyAddress(company.address);
    const prov = normalized.province || '';
    const amph = normalized.amphur || '';
    const tamb = normalized.tambon || '';
    const post = normalized.postal || getZipcode(prov, amph, tamb) || '';

    setFormData((prev) => ({
      ...prev,
      companyName: company.name || prev.companyName,
      companyHouse: normalized.house ?? '',
      companyMoo: normalized.moo ?? '',
      companyTambon: tamb,
      companyAmphur: amph,
      companyProvince: prov,
      companyPostal: post,
      address: normalized.detail || normalized.fullText || prev.address,
      supervisor: company.contactPerson || '',
      supervisorPhone: company.phone || '',
      supervisorEmail: company.email || prev.supervisorEmail || '',
    }));
    handleCloseCompanyPicker();
  };

  useEffect(() => {
    if (companyPickerOpen) {
      previousOverflow.current = {
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
      };
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else if (previousOverflow.current.body !== null || previousOverflow.current.html !== null) {
      document.body.style.overflow = previousOverflow.current.body ?? '';
      document.documentElement.style.overflow = previousOverflow.current.html ?? '';
      previousOverflow.current = { body: null, html: null };
    }

    return () => {
      document.body.style.overflow = previousOverflow.current.body ?? '';
      document.documentElement.style.overflow = previousOverflow.current.html ?? '';
      previousOverflow.current = { body: null, html: null };
    };
  }, [companyPickerOpen]);

  return (
    <div className="dashboard-container">
      <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <DateTimeIndicator />
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard/new-request"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main bg-slate-50/50 min-h-screen">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 mb-2.5 transition no-underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับหน้าแดชบอร์ด
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {id ? (isReadOnly ? 'รายละเอียดคำร้องฝึกงาน (โหมดอ่านอย่างเดียว)' : 'แก้ไขคำร้องฝึกงานวิชาชีพ') : 'ยื่นคำร้องฝึกงานวิชาชีพ'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {id ? (isReadOnly ? 'คำร้องนี้ได้รับการอนุมัติแล้ว อยู่ในโหมดอ่านอย่างเดียว' : 'แก้ไขข้อมูลและบันทึกการเปลี่ยนแปลงคำร้อง') : 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง'}
            </p>
          </div>

          {/* Read Only Mode Banner */}
          {isReadOnly && (
            <Box
              sx={{
                mb: 3,
                p: 2.5,
                borderRadius: '16px',
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StatusBadge status={existingStatus} />
                <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
                  คำร้องนี้ได้รับการอนุมัติหรืออยู่ระหว่างดำเนินการฝึกงานแล้ว จึงอยู่ในโหมดอ่านอย่างเดียว (View Only) ไม่สามารถแก้ไขข้อมูลได้
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/dashboard')}
                sx={{ borderColor: '#cbd5e1', color: '#475569', borderRadius: '10px' }}
              >
                กลับไปหน้าแดชบอร์ด
              </Button>
            </Box>
          )}

          {/* Modal for existing request */}
          {hasExistingRequest && !id && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '16px',
              }}
            >
              <div
                className="max-w-md w-full bg-white rounded-[28px] border border-violet-100/60 shadow-[0_20px_50px_rgba(124,58,237,0.08)] p-7 text-center relative"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '28px',
                  boxShadow: '0 20px 50px rgba(124, 58, 237, 0.08)',
                  borderColor: 'rgba(237, 233, 254, 0.6)',
                  padding: '28px',
                  animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* 2. ไอคอนแจ้งเตือนด้านบน */}
                <div
                  className="w-14 h-14 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: '#fffbeb',
                    color: '#d97706',
                    border: '1px solid rgba(253, 230, 138, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <ExclamationTriangleIcon style={{ width: 28, height: 28 }} className="w-7 h-7 text-amber-600" />
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2 leading-tight">
                  {existingActiveRequest && isStudentEditableStatus(existingActiveRequest.status)
                    ? 'มีคำร้องที่อยู่ระหว่างการตรวจสอบ'
                    : 'ไม่สามารถยื่นคำร้องใหม่ได้'}
                </h3>

                <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto mb-6">
                  {existingActiveRequest && isStudentEditableStatus(existingActiveRequest.status) ? (
                    <>
                      คุณมีคำร้องสถานะ &quot;{existingActiveRequest.status}&quot; ที่ยังไม่ได้รับการอนุมัติ <br />
                      คุณสามารถแก้ไขข้อมูลคำร้องนี้ได้โดยตรง หรือดูสถานะในระบบ
                    </>
                  ) : (
                    <>
                      คุณมีคำร้องที่ได้รับการอนุมัติหรืออยู่ระหว่างดำเนินการแล้ว <br />
                      ระบบจำกัดการยื่นคำร้อง 1 รายการต่อ 1 บัญชีเท่านั้น
                    </>
                  )}
                </p>

                {/* 3. การจัดเรียงและโทนสีของปุ่มกด (Button Layout) */}
                <div className="flex flex-col gap-2.5 w-full">
                  {/* ปุ่มหลัก: ดูสถานะคำร้อง */}
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/my-requests')}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center cursor-pointer border-none outline-none"
                    style={{ backgroundColor: '#7c3aed', color: '#ffffff', border: 'none' }}
                  >
                    ดูสถานะคำร้อง
                  </button>

                  {/* ปุ่มรอง: แก้ไขคำร้องนี้ */}
                  {existingActiveRequest && isStudentEditableStatus(existingActiveRequest.status) && (
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/edit-request/${existingActiveRequest.id}`)}
                      className="w-full bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold py-2.5 px-4 rounded-xl border border-violet-200/60 transition flex items-center justify-center cursor-pointer outline-none"
                      style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid rgba(221, 214, 254, 0.6)' }}
                    >
                      แก้ไขคำร้องนี้
                    </button>
                  )}

                  {/* ปุ่มทางเลือก: กลับหน้าหลัก */}
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center cursor-pointer outline-none bg-white"
                    style={{ border: '1px solid #e2e8f0', color: '#475569', backgroundColor: '#ffffff' }}
                  >
                    กลับหน้าหลัก
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="w-full rounded-[28px] bg-white p-6 sm:p-10 shadow-[0_10px_40px_rgba(124,58,237,0.05)] border border-violet-100/60 flex flex-col gap-8 request-form">
            <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0 }} className="flex flex-col gap-8 space-y-8">
              
              {/* Section 1: ข้อมูลส่วนตัวนักศึกษา */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 m-0">ข้อมูลส่วนตัวนักศึกษา</h2>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
                    <div>
                      <label htmlFor="studentTitle" className="text-xs font-semibold text-slate-700 mb-2 block">คำนำหน้า</label>
                      <TextField select fullWidth id="studentTitle" name="studentTitle" value={formData.studentTitle} onChange={handleChange} size="small">
                        <MenuItem value="">-- เลือก --</MenuItem>
                        <MenuItem value="นาย">นาย</MenuItem>
                        <MenuItem value="นาง">นาง</MenuItem>
                        <MenuItem value="นางสาว">นางสาว</MenuItem>
                      </TextField>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="studentName" className="text-xs font-semibold text-slate-700 mb-2 block">ชื่อ-นามสกุล</label>
                      <TextField fullWidth size="small" type="text" id="studentName" name="studentName" value={formData.studentName} onChange={handleChange} placeholder="ชื่อ-นามสกุล" disabled={true} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label htmlFor="studentId" className="text-xs font-semibold text-slate-700 mb-2 block">รหัสนักศึกษา</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="studentId"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleChange}
                        placeholder="รหัสนักศึกษา"
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 13 }}
                        disabled={true}
                      />
                    </div>
                    <div>
                      <label htmlFor="studentYear" className="text-xs font-semibold text-slate-700 mb-2 block">ปีการศึกษา/ชั้นปี</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="studentYear"
                        name="studentYear"
                        value={formData.studentYear}
                        onChange={handleChange}
                        placeholder="ชั้นปี เช่น 4"
                        inputProps={{ maxLength: 10 }}
                        disabled={true}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label htmlFor="lastSemesterGrade" className="text-xs font-semibold text-slate-700 mb-2 block">เกรดเฉลี่ยเทอมล่าสุด</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="lastSemesterGrade"
                        name="lastSemesterGrade"
                        value={formData.lastSemesterGrade}
                        onChange={handleChange}
                        placeholder="เช่น 3.50"
                        inputProps={{ inputMode: 'decimal', pattern: '^([0-3](\\.[0-9]{0,2})?|4(\\.0{0,2})?)?$' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="studentMajor" className="text-xs font-semibold text-slate-700 mb-2 block">สาขา</label>
                      <TextField select fullWidth size="small" id="studentMajor" name="studentMajor" value={formData.studentMajor} onChange={handleChange} disabled={true}>
                        <MenuItem value="">เลือกสาขา</MenuItem>
                        {departmentOptions.map((dept) => (
                          <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                        ))}
                      </TextField>
                    </div>
                  </div>

                  {/* Home Address (ที่อยู่ตามบัตรประชาชน) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">ที่อยู่ตามบัตรประชาชน</label>
                    <div className="p-4 sm:p-6 rounded-2xl bg-slate-50/50 border border-slate-200/70 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <TextField fullWidth size="small" type="text" id="homeHouse" name="homeHouse" value={formData.homeHouse} onChange={handleChange} placeholder="บ้านเลขที่" />
                        <TextField fullWidth size="small" type="text" id="homeMoo" name="homeMoo" value={formData.homeMoo} onChange={handleChange} placeholder="หมู่" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {useManualAddress ? (
                          <>
                            <TextField fullWidth size="small" type="text" id="homeProvince" name="homeProvince" value={formData.homeProvince} onChange={handleChange} placeholder="จังหวัด" />
                            <TextField fullWidth size="small" type="text" id="homeAmphur" name="homeAmphur" value={formData.homeAmphur} onChange={handleChange} placeholder="อำเภอ" />
                          </>
                        ) : (
                          <>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={provinceOptions}
                              value={formData.homeProvince || null}
                              onChange={(_, value) => handleProvinceChange(value)}
                              autoHighlight
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="เลือกหรือพิมพ์จังหวัด"
                                />
                              )}
                            />
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={homeAmphurOptions}
                              value={formData.homeAmphur || null}
                              onChange={(_, value) => handleAmphureChange(value)}
                              disabled={!formData.homeProvince}
                              autoHighlight
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder={formData.homeProvince === 'กรุงเทพมหานคร' ? 'เลือกหรือพิมพ์เขต' : 'เลือกหรือพิมพ์อำเภอ'}
                                />
                              )}
                            />
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {useManualAddress ? (
                          <>
                            <TextField fullWidth size="small" type="text" id="homeTambon" name="homeTambon" value={formData.homeTambon} onChange={handleChange} placeholder="ตำบล" />
                            <TextField
                              fullWidth
                              size="small"
                              type="text"
                              id="homePostal"
                              name="homePostal"
                              value={formData.homePostal}
                              onChange={handleChange}
                              placeholder="รหัสไปรษณีย์"
                              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
                            />
                          </>
                        ) : (
                          <>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={homeTambonOptions.map((t) => t.district)}
                              value={formData.homeTambon || null}
                              onChange={(_, value) => handleTambonChange(value)}
                              disabled={!formData.homeAmphur}
                              autoHighlight
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder={formData.homeProvince === 'กรุงเทพมหานคร' ? 'เลือกหรือพิมพ์แขวง' : 'เลือกหรือพิมพ์ตำบล'}
                                />
                              )}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              type="text"
                              id="homePostal"
                              name="homePostal"
                              value={formData.homePostal}
                              onChange={handleChange}
                              placeholder="รหัสไปรษณีย์"
                              InputProps={{ readOnly: true }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label htmlFor="studentPhone" className="text-xs font-semibold text-slate-700 mb-2 block">เบอร์โทรศัพท์</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="studentPhone"
                        name="studentPhone"
                        value={formData.studentPhone}
                        onChange={handleChange}
                        placeholder="เช่น 094xxxxxxx หรือ 02-345-6789"
                        inputProps={{ inputMode: 'tel', maxLength: 20 }}
                      />
                    </div>
                    <div>
                      <label htmlFor="studentEmail" className="text-xs font-semibold text-slate-700 mb-2 block">อีเมลล์</label>
                      <TextField fullWidth size="small" type="email" id="studentEmail" name="studentEmail" value={formData.studentEmail} onChange={handleChange} placeholder="student@university.ac.th" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="studentPhoto" className="text-xs font-semibold text-slate-700 mb-2 block">อัพโหลดรูปถ่ายนักศึกษา (JPG/PNG หรือ PDF)</label>
                    <div className="relative rounded-xl border border-dashed border-slate-300 bg-slate-50/40 hover:bg-violet-50/30 hover:border-violet-300 transition py-6 px-4 flex flex-col items-center justify-center text-center cursor-pointer">
                      <input
                        type="file"
                        id="studentPhoto"
                        name="studentPhoto"
                        accept="image/png, image/jpeg, application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <Upload className="w-4 h-4 text-violet-500" />
                        <span>คลิกเพื่อเลือกไฟล์รูปถ่าย</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1">รองรับไฟล์ PNG, JPG หรือ PDF (ไม่เกิน 5MB)</span>
                    </div>
                    {studentPhoto && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-100">
                        <FileCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">ไฟล์ที่เลือก: {studentPhoto.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: ข้อมูลสถานประกอบการ */}
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-800 m-0">ข้อมูลสถานประกอบการ</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCompanyPicker}
                    disabled={hasExistingRequest}
                    className="px-3.5 py-2 rounded-xl border border-violet-200 text-violet-600 bg-violet-50/60 hover:bg-violet-100 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    เลือกจากรายการแนะนำ
                  </button>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label htmlFor="companyName" className="text-xs font-semibold text-slate-700 mb-2 block">ชื่อบริษัท/องค์กร *</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="เช่น บริษัท ABC จำกัด"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="position" className="text-xs font-semibold text-slate-700 mb-2 block">ตำแหน่งที่ฝึกงาน *</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        placeholder="เช่น Web Developer"
                        required
                      />
                    </div>
                  </div>

                  {/* Company Address Fields */}
                  <div className="space-y-2">
                    <label htmlFor="companyAddress" className="text-xs font-semibold text-slate-700 mb-2 block">ที่อยู่สถานประกอบการ *</label>
                    <div className="p-4 sm:p-6 rounded-2xl bg-slate-50/50 border border-slate-200/70 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <TextField fullWidth size="small" type="text" id="companyHouse" name="companyHouse" value={formData.companyHouse} onChange={handleChange} placeholder="เลขที่ตั้ง / อาคาร" required />
                        <TextField fullWidth size="small" type="text" id="companyMoo" name="companyMoo" value={formData.companyMoo} onChange={handleChange} placeholder="หมู่" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {useManualCompanyAddress ? (
                          <>
                            <TextField fullWidth size="small" type="text" id="companyProvince" name="companyProvince" value={formData.companyProvince} onChange={handleChange} placeholder="จังหวัด" required />
                            <TextField fullWidth size="small" type="text" id="companyAmphur" name="companyAmphur" value={formData.companyAmphur} onChange={handleChange} placeholder="อำเภอ" required />
                          </>
                        ) : (
                          <>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={provinceOptions}
                              value={formData.companyProvince || null}
                              onChange={(_, value) => handleCompanyProvinceChange(value)}
                              autoHighlight
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="เลือกหรือพิมพ์จังหวัด"
                                  required
                                />
                              )}
                            />
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={companyAmphurOptions}
                              value={formData.companyAmphur || null}
                              onChange={(_, value) => handleCompanyAmphureChange(value)}
                              disabled={!formData.companyProvince}
                              autoHighlight
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder={formData.companyProvince === 'กรุงเทพมหานคร' ? 'เลือกหรือพิมพ์เขต' : 'เลือกหรือพิมพ์อำเภอ'}
                                  required
                                />
                              )}
                            />
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {useManualCompanyAddress ? (
                          <>
                            <TextField fullWidth size="small" type="text" id="companyTambon" name="companyTambon" value={formData.companyTambon} onChange={handleChange} placeholder="ตำบล" required />
                            <TextField
                              fullWidth
                              size="small"
                              type="text"
                              id="companyPostal"
                              name="companyPostal"
                              value={formData.companyPostal}
                              onChange={handleChange}
                              placeholder="รหัสไปรษณีย์"
                              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
                              required
                            />
                          </>
                        ) : (
                          <>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={companyTambonOptions.map((t) => t.district)}
                              value={formData.companyTambon || null}
                              onChange={(_, value) => handleCompanyTambonChange(value)}
                              disabled={!formData.companyAmphur}
                              autoHighlight
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder={formData.companyProvince === 'กรุงเทพมหานคร' ? 'เลือกหรือพิมพ์แขวง' : 'เลือกหรือพิมพ์ตำบล'}
                                  required
                                />
                              )}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              type="text"
                              id="companyPostal"
                              name="companyPostal"
                              value={formData.companyPostal}
                              onChange={handleChange}
                              placeholder="รหัสไปรษณีย์"
                              InputProps={{ readOnly: true }}
                              required
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address" className="text-xs font-semibold text-slate-700 mb-2 block">รายละเอียดที่อยู่เพิ่มเติม</label>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="เช่น อาคาร/ชั้น/ซอย"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label htmlFor="internshipTerm" className="text-xs font-semibold text-slate-700 mb-2 block">ภาคการศึกษาที่ประสงค์ฝึกงาน</label>
                    <TextField
                      fullWidth
                      size="small"
                      select
                      id="internshipTerm"
                      name="internshipTerm"
                      value={formData.internshipTerm}
                      onChange={handleChange}
                    >
                      <MenuItem value="">-- เลือกภาคการศึกษา (ถ้ามี) --</MenuItem>
                      <MenuItem value="term1">ภาคการศึกษาที่ 1</MenuItem>
                      <MenuItem value="term2">ภาคการศึกษาที่ 2</MenuItem>
                      <MenuItem value="summer">ภาคฤดูร้อน</MenuItem>
                    </TextField>
                    <div className="mt-2.5 p-3.5 bg-violet-50/60 rounded-xl border border-violet-100 text-xs text-violet-800 flex items-start gap-2">
                      <Info className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                      <span><strong>ช่วงฝึกงาน:</strong> ผู้ดูแลระบบ (Admin) จะเป็นผู้กดกำหนดวันฝึกงานจริง (วันเริ่ม - วันสิ้นสุด) หลังตรวจสอบคำร้อง</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: ข้อมูลหัวหน้าหน่วยงาน/ผู้ดูแล */}
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 m-0">ข้อมูลหัวหน้าหน่วยงาน / ผู้ดูแล</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="supervisor" className="text-xs font-semibold text-slate-700 mb-2 block">ชื่อ-นามสกุล *</label>
                    <TextField
                      fullWidth
                      size="small"
                      type="text"
                      id="supervisor"
                      name="supervisor"
                      value={formData.supervisor}
                      onChange={handleChange}
                      placeholder="ชื่อ-นามสกุล ผู้ดูแลหรือหัวหน้าฝ่าย"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label htmlFor="supervisorPosition" className="text-xs font-semibold text-slate-700 mb-2 block">ตำแหน่ง</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="supervisorPosition"
                        name="supervisorPosition"
                        value={formData.supervisorPosition}
                        onChange={handleChange}
                        placeholder="ตำแหน่งหัวหน้าหน่วยงาน"
                      />
                    </div>

                    <div>
                      <label htmlFor="supervisorEmail" className="text-xs font-semibold text-slate-700 mb-2 block">อีเมลหัวหน้าหน่วยงาน</label>
                      <TextField
                        fullWidth
                        size="small"
                        type="email"
                        id="supervisorEmail"
                        name="supervisorEmail"
                        value={formData.supervisorEmail}
                        onChange={handleChange}
                        placeholder="supervisor@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="supervisorPhone" className="text-xs font-semibold text-slate-700 mb-2 block">เบอร์โทรหัวหน้าหน่วยงาน</label>
                    <TextField
                      fullWidth
                      size="small"
                      type="text"
                      id="supervisorPhone"
                      name="supervisorPhone"
                      value={formData.supervisorPhone}
                      onChange={handleChange}
                      placeholder="เช่น 0812345678 หรือ 02-345-6789"
                      inputProps={{ inputMode: 'tel', maxLength: 20 }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: รายละเอียดงานที่ฝึก */}
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 m-0">รายละเอียดงานที่ฝึก</h2>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label htmlFor="jobDescription" className="text-xs font-semibold text-slate-700 mb-2 block">รายละเอียดงาน *</label>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      id="jobDescription"
                      name="jobDescription"
                      value={formData.jobDescription}
                      onChange={handleChange}
                      placeholder="อธิบายลักษณะงานที่จะทำระหว่างฝึกงาน"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="skills" className="text-xs font-semibold text-slate-700 mb-2 block">ทักษะที่คาดว่าจะได้รับ *</label>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      id="skills"
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      placeholder="เช่น React, Node.js, Database Design"
                      rows={3}
                      required
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <Link
                to="/dashboard"
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm transition flex items-center justify-center no-underline text-center cursor-pointer"
              >
                {isReadOnly ? 'กลับหน้าแดชบอร์ด' : 'ยกเลิก'}
              </Link>
              {isReadOnly ? (
                <div className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs sm:text-sm flex items-center justify-center cursor-not-allowed">
                  โหมดอ่านอย่างเดียว (อนุมัติแล้ว)
                </div>
              ) : (
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition flex items-center justify-center cursor-pointer border-none outline-none"
                >
                  {id ? 'บันทึกการแก้ไขคำร้อง' : 'ยื่นคำร้อง'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      <Dialog
        open={companyPickerOpen}
        onClose={handleCloseCompanyPicker}
        fullWidth
        maxWidth="md"
        scroll="paper"
        disableScrollLock={true}
        PaperProps={{ sx: { maxHeight: '85vh' } }}
      >
        <DialogTitle>เลือกสถานประกอบการแนะนำ</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {recommendedLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <CircularProgress />
            </div>
          ) : recommendedError ? (
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', color: '#dc2626' }}>
              {recommendedError}
            </Paper>
          ) : recommendedCompanies.length === 0 ? (
            <Paper elevation={0} sx={{ p: 2, textAlign: 'center', color: '#64748b' }}>
              ยังไม่มีข้อมูลสถานประกอบการแนะนำ
            </Paper>
          ) : (
            <>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                label="ค้นหาบริษัท / ประเภทธุรกิจ"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
              />
              <TableContainer sx={{ mt: 2, maxHeight: 360, overflowY: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ชื่อบริษัท</TableCell>
                      <TableCell>ประเภทธุรกิจ</TableCell>
                      <TableCell>ผู้ติดต่อ</TableCell>
                      <TableCell align="center">รายละเอียด</TableCell>
                      <TableCell align="right">เลือก</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRecommendedCompanies.map((company, idx) => (
                      <TableRow key={`${company.name}-${idx}`} hover>
                        <TableCell>{company.name}</TableCell>
                        <TableCell>{company.businessType || '-'}</TableCell>
                        <TableCell>
                          <div>{company.contactPerson || '-'}</div>
                          {company.phone && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{company.phone}</div>}
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" variant="text" onClick={() => setFocusedCompany(company)}>
                            รายละเอียด
                          </Button>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" onClick={() => applyRecommendedCompany(company)}>
                            เลือก
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRecommendedCompanies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          ไม่พบข้อมูลตามคำค้นหา
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <div style={{ marginTop: '1.5rem' }}>
                {focusedCompany ? (
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                    <h3 style={{ marginTop: 0 }}>{focusedCompany.name}</h3>
                    <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                      ประเภทธุรกิจ: {focusedCompany.businessType || 'ไม่ระบุ'}
                    </p>
                    {focusedCompany.address && (
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        ที่อยู่: {typeof focusedCompany.address === 'string' ? focusedCompany.address : JSON.stringify(focusedCompany.address)}
                      </p>
                    )}
                    {focusedCompany.contactPerson && (
                      <p style={{ margin: '0.25rem 0', color: '#475569' }}>
                        ผู้ติดต่อ: {focusedCompany.contactPerson} {focusedCompany.phone ? `(${focusedCompany.phone})` : ''}
                      </p>
                    )}
                    <p style={{ margin: '0.25rem 0', color: '#475569' }}>ที่มา: {focusedCompany.source || '-'}</p>
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button variant="outlined" size="small" onClick={() => applyRecommendedCompany(focusedCompany)}>
                        ใช้ข้อมูลบริษัทนี้
                      </Button>
                      <Button variant="text" size="small" onClick={() => setFocusedCompany(null)}>
                        ปิดรายละเอียด
                      </Button>
                    </div>
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 2 }}>
                    เลือก "รายละเอียด" ในตารางเพื่อดูข้อมูลบริษัทเพิ่มเติม
                  </Paper>
                )}
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompanyPicker}>ปิด</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default NewRequestPage;
