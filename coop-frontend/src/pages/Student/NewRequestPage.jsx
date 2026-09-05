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
import api from '../../api/axios';
import './NewRequestPage.css';
import './Dashboard/DashboardPage.css'; // Import dashboard styles
import StudentSidebar from '../../components/StudentSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import ModernButton from '../../components/ModernButton';
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

const NewRequestPage = () => {
  const DIGIT_ONLY_FIELDS = new Set(['studentId', 'studentYear', 'studentPhone', 'supervisorPhone', 'homePostal', 'companyPostal']);
  const MAX_DIGIT_LENGTH_FIELDS = {
    studentPhone: 10,
    supervisorPhone: 10,
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
  const alertShown = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const MAX_LOCAL_STORAGE_IMAGE_SIZE = 512 * 1024; // 512KB limit for demo storage
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [amphureOptions, setAmphureOptions] = useState([]);
  const [tambonOptions, setTambonOptions] = useState([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState(null);
  const [selectedAmphureId, setSelectedAmphureId] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [selectedCompanyProvinceId, setSelectedCompanyProvinceId] = useState(null);
  const [selectedCompanyAmphureId, setSelectedCompanyAmphureId] = useState(null);
  const [useManualCompanyAddress, setUseManualCompanyAddress] = useState(false);
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
          const details = reqData.details || {};
          const studentInfo = details.student_info || {};
          const companyAddress = details.companyAddress || {};

          setFormData(prev => ({
            ...prev,
            studentTitle: studentInfo.title || '',
            studentName: studentInfo.name || reqData.studentName || '',
            studentEmail: studentInfo.email || '',
            studentId: studentInfo.studentId || reqData.studentId || '',
            studentYear: studentInfo.year || '',
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
      setFormData(prev => ({
        ...prev,
        studentName: user.full_name || user.name || prev.studentName,
        studentEmail: user.email || prev.studentEmail,
        studentId: user.student_code || user.username || prev.studentId,
        studentMajor: user.major || prev.studentMajor,
        studentPhone: user.phone || prev.studentPhone
      }));

      // Check for existing active request via API only in NEW mode
      const studentId = user.student_code || user.studentId || user.username;
      api.get(`/requests?studentId=${studentId}`).then(res => {
        const REJECTED_STATUSES = ['ไม่อนุมัติ (อาจารย์)', 'ไม่อนุมัติ (Admin)', 'ปฏิเสธ'];
        const activeRequest = (res.data.data || []).find(req => !REJECTED_STATUSES.includes(req.status));
        if (activeRequest) {
          setHasExistingRequest(true);
        }
      }).catch(err => console.error('Failed to check existing requests:', err));
    }

  }, [navigate, id]);

  useEffect(() => {
    let mounted = true;
    const loadAddressData = async () => {
      setAddressLoading(true);
      setAddressError('');
      try {
        const [provinceRes, amphureRes, tambonRes] = await Promise.all([
          fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/province.json'),
          fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/district.json'),
          fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/sub_district.json')
        ]);

        if (!provinceRes.ok || !amphureRes.ok || !tambonRes.ok) {
          throw new Error('Failed to load address data');
        }

        const [provinces, amphures, tambons] = await Promise.all([
          provinceRes.json(),
          amphureRes.json(),
          tambonRes.json()
        ]);

        if (!mounted) return;
        setProvinceOptions(provinces);
        setAmphureOptions(amphures);
        setTambonOptions(tambons);
        setUseManualAddress(false);
        setUseManualCompanyAddress(false);
      } catch (error) {
        if (!mounted) return;
        setAddressError('ไม่สามารถโหลดข้อมูลจังหวัด/อำเภอ/ตำบลได้');
        setUseManualAddress(true);
        setUseManualCompanyAddress(true);
      } finally {
        if (mounted) setAddressLoading(false);
      }
    };

    loadAddressData();
    return () => {
      mounted = false;
    };
  }, []);

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
    const matched = provinceOptions.find((p) => p.name_th === value);
    setSelectedProvinceId(matched ? matched.id : null);
    setSelectedAmphureId(null);
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
    const matched = amphureOptions.find(
      (a) => a.name_th === selectedValue && a.province_id === selectedProvinceId
    );
    setSelectedAmphureId(matched ? matched.id : null);
    setFormData((prev) => ({
      ...prev,
      homeAmphur: selectedValue,
      homeTambon: '',
      homePostal: ''
    }));
  };

  const handleTambonChange = (value) => {
    const selectedValue = value || '';
    const matched = tambonOptions.find(
      (t) => t.name_th === selectedValue && t.district_id === selectedAmphureId
    );
    setFormData((prev) => ({
      ...prev,
      homeTambon: selectedValue,
      homePostal: matched?.zip_code ? String(matched.zip_code) : ''
    }));
  };

  const handleCompanyProvinceChange = (value) => {
    const selectedValue = value || '';
    const matched = provinceOptions.find((p) => p.name_th === value);
    setSelectedCompanyProvinceId(matched ? matched.id : null);
    setSelectedCompanyAmphureId(null);
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
    const matched = amphureOptions.find(
      (a) => a.name_th === selectedValue && a.province_id === selectedCompanyProvinceId
    );
    setSelectedCompanyAmphureId(matched ? matched.id : null);
    setFormData((prev) => ({
      ...prev,
      companyAmphur: selectedValue,
      companyTambon: '',
      companyPostal: ''
    }));
  };

  const handleCompanyTambonChange = (value) => {
    const selectedValue = value || '';
    const matched = tambonOptions.find(
      (t) => t.name_th === selectedValue && t.district_id === selectedCompanyAmphureId
    );
    setFormData((prev) => ({
      ...prev,
      companyTambon: selectedValue,
      companyPostal: matched?.zip_code ? String(matched.zip_code) : ''
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
    if (hasExistingRequest) return;

    if (formData.studentPhone && formData.studentPhone.length !== 10) {
      alert('กรุณากรอกเบอร์โทรศัพท์นักศึกษาให้ครบ 10 หลัก');
      return;
    }
    if (formData.supervisorPhone && formData.supervisorPhone.length !== 10) {
      alert('กรุณากรอกเบอร์โทรหัวหน้าหน่วยงานให้ครบ 10 หลัก');
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

      const requestPayload = {
        studentId: formData.studentId || user.student_code || user.username || 'N/A',
        studentName: formData.studentName || user.full_name || user.name || 'Student',
        department: formData.studentMajor || user.major || '',
        company: formData.companyName,
        position: formData.position,
        submittedDate: formattedDate,
        status: 'รออาจารย์ที่ปรึกษาอนุมัติ',
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
        alert('แก้ไขคำร้องและยื่นใหม่สำเร็จ!');
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
    } catch (error) {
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
    const matchedProvince = normalized.province
      ? provinceOptions.find((p) => p.name_th === normalized.province)
      : null;
    const matchedAmphure = matchedProvince && normalized.amphur
      ? amphureOptions.find((a) => a.name_th === normalized.amphur && a.province_id === matchedProvince.id)
      : null;
    const matchedTambon = matchedAmphure && normalized.tambon
      ? tambonOptions.find((t) => t.name_th === normalized.tambon && t.district_id === matchedAmphure.id)
      : null;

    setSelectedCompanyProvinceId(matchedProvince?.id || null);
    setSelectedCompanyAmphureId(matchedAmphure?.id || null);
    setFormData((prev) => ({
      ...prev,
      companyName: company.name || prev.companyName,
      companyHouse: normalized.house ?? '',
      companyMoo: normalized.moo ?? '',
      companyTambon: matchedTambon ? matchedTambon.name_th : normalized.tambon ?? '',
      companyAmphur: matchedAmphure ? matchedAmphure.name_th : normalized.amphur ?? '',
      companyProvince: matchedProvince ? matchedProvince.name_th : normalized.province ?? '',
      companyPostal: normalized.postal ?? '',
      address: normalized.detail || normalized.fullText || prev.address,
      supervisor: company.contactPerson || '',
      supervisorPhone: company.phone || '',
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
      <div className="mobile-top-navbar">
        <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
          <img src={lascLogo} alt="LASC Logo" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
          <UserProfileMenu />
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
        </div>
      </div>
      <StudentSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/dashboard/new-request"
        handleLogout={handleLogout}
      />

      <main className="dashboard-main">
        <div className="new-request-content"> {/* Renamed from container to avoid full height issues if any */}
          <div className="new-request-header">
            {/* Removed Back Button as we have sidebar now */}
            <h1>ยื่นคำร้องฝึกงานวิชาชีพ</h1>
            <p>กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง</p>
          </div>


          {/* Modal for existing request */}
          {hasExistingRequest && (
            <Box
              sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                p: 2,
              }}
            >
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  p: { xs: 3, sm: 4.5 },
                  borderRadius: '24px',
                  width: '90%',
                  maxWidth: '460px',
                  textAlign: 'center',
                  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Box
                  sx={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    bgcolor: '#fef2f2',
                    color: '#ef4444',
                    border: '2px solid #fee2e2',
                    display: 'grid',
                    placeItems: 'center',
                    mx: 'auto',
                    mb: 2.5,
                    boxShadow: '0 8px 20px rgba(239, 68, 68, 0.15)',
                  }}
                >
                  <ExclamationTriangleIcon style={{ width: 36, height: 36 }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: '#0f172a',
                    mb: 1.5,
                    fontSize: { xs: '1.25rem', sm: '1.4rem' },
                    lineHeight: 1.3,
                  }}
                >
                  ไม่สามารถยื่นคำร้องใหม่ได้
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#64748b',
                    mb: 3.5,
                    lineHeight: 1.6,
                    fontSize: '0.975rem',
                  }}
                >
                  คุณมีคำร้องที่อยู่ระหว่างการดำเนินการ <br />
                  ระบบจำกัดการยื่นคำร้อง 1 รายการต่อ 1 บัญชีเท่านั้น
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <ModernButton
                    customVariant="secondary"
                    onClick={() => navigate('/dashboard')}
                    sx={{ flex: { xs: '1 1 100%', sm: '1' } }}
                  >
                    กลับหน้าหลัก
                  </ModernButton>
                  <ModernButton
                    customVariant="primary"
                    onClick={() => navigate('/dashboard/my-requests')}
                    sx={{ flex: { xs: '1 1 100%', sm: '1' } }}
                  >
                    ดูสถานะคำร้อง
                  </ModernButton>
                </Box>
              </Box>
            </Box>
          )}
          
          <form onSubmit={handleSubmit} className="request-form">
            <div className="form-section">
              <h2>ข้อมูลส่วนตัวนักศึกษา</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="studentTitle">คำนำหน้า</label>
                  <TextField select fullWidth id="studentTitle" name="studentTitle" value={formData.studentTitle} onChange={handleChange} size="small">
                    <MenuItem value="">-- เลือก --</MenuItem>
                    <MenuItem value="นาย">นาย</MenuItem>
                    <MenuItem value="นาง">นาง</MenuItem>
                    <MenuItem value="นางสาว">นางสาว</MenuItem>
                  </TextField>
                </div>

                <div className="form-group">
                  <label htmlFor="studentName">ชื่อ-นามสกุล</label>
                  <TextField fullWidth size="small" type="text" id="studentName" name="studentName" value={formData.studentName} onChange={handleChange} placeholder="ชื่อ-นามสกุล" disabled={true} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="studentId">รหัสนักศึกษา</label>
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

                <div className="form-group">
                  <label htmlFor="studentYear">ปีการศึกษา/ชั้นปี</label>
                  <TextField
                    fullWidth
                    size="small"
                    type="text"
                    id="studentYear"
                    name="studentYear"
                    value={formData.studentYear}
                    onChange={handleChange}
                    placeholder="เช่น ปี 2566 หรือ ชั้นปี 3"
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 2 }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lastSemesterGrade">เกรดเฉลี่ยเทอมล่าสุด</label>
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="studentMajor">สาขา</label>
                  <TextField select fullWidth size="small" id="studentMajor" name="studentMajor" value={formData.studentMajor} onChange={handleChange} disabled={true}>
                    <MenuItem value="">เลือกสาขา</MenuItem>
                    {departmentOptions.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </TextField>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="homeAddress">ที่อยู่ตามบัตรประชาชน</label>
                <div className="form-row">
                  <TextField fullWidth size="small" type="text" id="homeHouse" name="homeHouse" value={formData.homeHouse} onChange={handleChange} placeholder="บ้านเลขที่" />
                  <TextField fullWidth size="small" type="text" id="homeMoo" name="homeMoo" value={formData.homeMoo} onChange={handleChange} placeholder="หมู่" />
                </div>
                {addressError && (
                  <p className="field-hint" style={{ color: '#c53030' }}>{addressError}</p>
                )}
                <div className="form-row">
                  {useManualAddress ? (
                    <>
                      <TextField fullWidth size="small" type="text" id="homeTambon" name="homeTambon" value={formData.homeTambon} onChange={handleChange} placeholder="ตำบล" />
                      <TextField fullWidth size="small" type="text" id="homeAmphur" name="homeAmphur" value={formData.homeAmphur} onChange={handleChange} placeholder="อำเภอ" />
                    </>
                  ) : (
                    <>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={provinceOptions.map((province) => province.name_th)}
                        value={formData.homeProvince || ''}
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
                        options={amphureOptions.filter((a) => a.province_id === selectedProvinceId).map((a) => a.name_th)}
                        value={formData.homeAmphur || ''}
                        onChange={(_, value) => handleAmphureChange(value)}
                        disabled={!selectedProvinceId}
                        autoHighlight
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="เลือกหรือพิมพ์อำเภอ"
                          />
                        )}
                      />
                    </>
                  )}
                </div>
                <div className="form-row">
                  {useManualAddress ? (
                    <>
                      <TextField fullWidth size="small" type="text" id="homeProvince" name="homeProvince" value={formData.homeProvince} onChange={handleChange} placeholder="จังหวัด" />
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
                        options={tambonOptions.filter((t) => t.district_id === selectedAmphureId).map((t) => t.name_th)}
                        value={formData.homeTambon || ''}
                        onChange={(_, value) => handleTambonChange(value)}
                        disabled={!selectedAmphureId}
                        autoHighlight
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="เลือกหรือพิมพ์ตำบล"
                          />
                        )}
                      />
                      <TextField fullWidth size="small" type="text" id="homePostal" name="homePostal" value={formData.homePostal} onChange={handleChange} placeholder="รหัสไปรษณีย์" InputProps={{ readOnly: true }} />
                    </>
                  )}
                </div>
                {addressLoading && (
                  <p className="field-hint">กำลังโหลดข้อมูลที่อยู่...</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="studentPhone">เบอร์โทรศัพท์</label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  id="studentPhone"
                  name="studentPhone"
                  value={formData.studentPhone}
                  onChange={handleChange}
                  placeholder="094xxxxxxx"
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="studentEmail">อีเมลล์</label>
                <TextField fullWidth size="small" type="email" id="studentEmail" name="studentEmail" value={formData.studentEmail} onChange={handleChange} placeholder="student@university.ac.th" />
              </div>
              <div className="form-group">
                <label htmlFor="studentPhoto">อัพโหลดรูปถ่ายนักศึกษา (JPG/PNG หรือ PDF)</label>
                <Input
                  type="file"
                  id="studentPhoto"
                  name="studentPhoto"
                  inputProps={{ accept: 'image/png, image/jpeg, application/pdf' }}
                  onChange={handleFileChange}
                />
                {studentPhoto && (
                  <p className="file-info">ไฟล์ที่เลือก: {studentPhoto.name}</p>
                )}
              </div>
            </div>

            <div className="form-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>ข้อมูลสถานประกอบการ</h2>
                <Button type="button" variant="outlined" size="small" onClick={handleOpenCompanyPicker} disabled={hasExistingRequest}>
                  เลือกจากรายการแนะนำ
                </Button>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companyName">ชื่อบริษัท/องค์กร *</label>
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

                <div className="form-group">
                  <label htmlFor="position">ตำแหน่งที่ฝึกงาน *</label>
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

              <div className="form-group">
                <label htmlFor="companyAddress">ที่อยู่สถานประกอบการ *</label>
                <div className="form-row">
                  <TextField
                    fullWidth
                    size="small"
                    type="text"
                    id="companyHouse"
                    name="companyHouse"
                    value={formData.companyHouse}
                    onChange={handleChange}
                    placeholder="ที่อยู่เลขที่"
                    required
                  />
                </div>
                <div className="form-row">
                  {useManualCompanyAddress ? (
                    <>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="companyTambon"
                        name="companyTambon"
                        value={formData.companyTambon}
                        onChange={handleChange}
                        placeholder="ตำบล"
                        required
                      />
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="companyAmphur"
                        name="companyAmphur"
                        value={formData.companyAmphur}
                        onChange={handleChange}
                        placeholder="อำเภอ"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={provinceOptions.map((province) => province.name_th)}
                        value={formData.companyProvince || ''}
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
                        options={amphureOptions.filter((a) => a.province_id === selectedCompanyProvinceId).map((a) => a.name_th)}
                        value={formData.companyAmphur || ''}
                        onChange={(_, value) => handleCompanyAmphureChange(value)}
                        disabled={!selectedCompanyProvinceId}
                        autoHighlight
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="เลือกหรือพิมพ์อำเภอ"
                            required
                          />
                        )}
                      />
                    </>
                  )}
                </div>
                <div className="form-row">
                  {useManualCompanyAddress ? (
                    <>
                      <TextField
                        fullWidth
                        size="small"
                        type="text"
                        id="companyProvince"
                        name="companyProvince"
                        value={formData.companyProvince}
                        onChange={handleChange}
                        placeholder="จังหวัด"
                        required
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
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 5 }}
                        required
                      />
                    </>
                  ) : (
                    <>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={tambonOptions.filter((t) => t.district_id === selectedCompanyAmphureId).map((t) => t.name_th)}
                        value={formData.companyTambon || ''}
                        onChange={(_, value) => handleCompanyTambonChange(value)}
                        disabled={!selectedCompanyAmphureId}
                        autoHighlight
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="เลือกหรือพิมพ์ตำบล"
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
                {addressLoading && (
                  <p className="field-hint">กำลังโหลดข้อมูลที่อยู่...</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="address">รายละเอียดที่อยู่เพิ่มเติม</label>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="เช่น อาคาร/ชั้น/ซอย"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="internshipTerm">ภาคการศึกษาที่ประสงค์ฝึกงาน</label>
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
                <div style={{ marginTop: '6px', padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📌</span>
                  <span><strong>ช่วงฝึกงาน:</strong> ผู้ดูแลระบบ (Admin) จะเป็นผู้กดกำหนดวันฝึกงานจริง (วันเริ่ม - วันสิ้นสุด) หลังตรวจสอบคำร้อง</span>
                </div>
              </div>

              <h3>ข้อมูลหัวหน้าหน่วยงาน/ผู้ดูแล</h3>
              <div className="form-group">
                <label htmlFor="supervisor"></label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  id="supervisor"
                  name="supervisor"
                  value={formData.supervisor}
                  onChange={handleChange}
                  placeholder="ชื่อ-นามสกุล"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="supervisorPosition">ตำแหน่ง</label>
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

                <div className="form-group">
                  <label htmlFor="supervisorEmail">อีเมลหัวหน้าหน่วยงาน</label>
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

              <div className="form-group">
                <label htmlFor="supervisorPhone">เบอร์โทรหัวหน้าหน่วยงาน</label>
                <TextField
                  fullWidth
                  size="small"
                  type="text"
                  id="supervisorPhone"
                  name="supervisorPhone"
                  value={formData.supervisorPhone}
                  onChange={handleChange}
                  placeholder="0812345678"
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }}
                />
              </div>
            </div>

            <div className="form-section">
              <h2>รายละเอียดงานที่ฝึก</h2>
              
              <div className="form-group">
                <label htmlFor="jobDescription">รายละเอียดงาน *</label>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  id="jobDescription"
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleChange}
                  placeholder="อธิบายลักษณะงานที่จะทำระหว่างฝึกงาน"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="skills">ทักษะที่คาดว่าจะได้รับ *</label>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="เช่น React, Node.js, Database Design"
                  rows="3"
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <Link to="/dashboard" className="btn-cancel">
                ยกเลิก
              </Link>
              <Button type="submit" variant="contained" className="btn-submit">
                ยื่นคำร้อง
              </Button>
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
