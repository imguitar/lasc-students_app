import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Autocomplete, TextField } from '@mui/material';
import { getProvinces, getAmphoes, getDistricts, getZipcode, isBangkok } from '../../utils/thaiAddress';
import SignaturePad from '../../components/SignaturePad';
import RelocationStepper from '../../components/RelocationStepper';
import { getUploadUrl } from '../../utils/fileUrl';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, CheckCircle2, Circle, Clock, FileText, Loader2, Search, Upload, User, X } from 'lucide-react';

// ยื่นคำร้องได้เฉพาะช่วงที่ "ออกฝึกงานแล้ว" เท่านั้น (สถานะชุดเดียวกับ backend)
const INTERNING_STATUSES = ['ออกฝึกงาน', 'กำลังออกฝึกงาน'];
const fileUrl = getUploadUrl;

// หน้าเต็มจอสำหรับยื่น "บันทึกข้อความ ขอเปลี่ยนแปลงสถานที่ฝึกงาน" (ย้ายออกจาก modal)
const RelocationRequestPage = () => {
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [daysTrained, setDaysTrained] = useState(0);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');

  const emptyForm = {
    reason: '', new_company_name: '',
    mentor_name: '', mentor_position: '', mentor_email: '', mentor_phone: '',
    addr_house: '', addr_moo: '', addr_road: '', addr_tambon: '',
    addr_amphur: '', addr_province: '', addr_postal: '',
    fileName: '', dataUrl: '', signature: ''
  };
  const [form, setForm] = useState(emptyForm);

  // ===== Guard + ดึงคำร้องหลัก/สถิติเช็คชื่อ =====
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login'); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'student') { navigate('/dashboard'); return; }
    const studentId = user.student_code || user.studentId || user.username;

    Promise.all([
      api.get(`/requests?studentId=${studentId}`).then((r) => r.data?.data || []).catch(() => []),
      api.get('/checkins', { params: { studentId } }).then((r) => r.data?.data || []).catch(() => []),
      api.get('/relocations').then((r) => r.data?.data || []).catch(() => []),
      api.get('/public/companies').then((r) => r.data?.data || []).catch(() => [])
    ]).then(([reqs, checkins, relos, comps]) => {
      setCompanies(comps);
      const primary = reqs.find((r) => INTERNING_STATUSES.includes(String(r.status || '').trim())) || null;
      setRequest(primary ? { ...primary, companyName: primary.companyName || primary.company } : null);
      setDaysTrained(checkins.filter((c) => ['present', 'late'].includes(c.status)).length);
      // มี relocation ค้างอยู่ให้ดู stepper ได้แม้สถานะจะเปลี่ยนไปแล้ว
      const mine = primary
        ? relos.filter((r) => Number(r.internship_request_id) === Number(primary.id))
        : relos;
      setExisting(mine.find((r) => r.status !== 'rejected') || null);
      setLoading(false);
    });
  }, [navigate]);

  // ===== ข้อมูล auto-fill ตามแบบบันทึกข้อความ =====
  const info = request?.details?.student_info || {};
  const oldAddr = request?.details?.companyAddress || {};
  const studentTitle = info.title || 'นาย/นางสาว';
  const studentName = request?.studentName || info.name || '-';
  const studentId2 = request?.studentId || info.studentId || '-';
  const major = request?.department || info.major || '-';
  const studentPhone = info.phone || '-';
  // ภาคเรียน: ค่าที่เก็บจริงคือ term1/term2/summer (ไม่มีปี) หรือรูปแบบ "2/2569"
  const termText = String(request?.details?.internshipTerm || '').trim();
  const slashMatch = /(\d)\s*\/\s*(\d{4})/.exec(termText);
  const semester = slashMatch ? slashMatch[1]
    : /^term\s*1$/i.test(termText) ? '1'
    : /^term\s*2$/i.test(termText) ? '2'
    : /summer/i.test(termText) ? 'ฤดูร้อน'
    : (/(\d)/.exec(termText)?.[1] || '');
  // ปีการศึกษา (พ.ศ.): ปีการศึกษาไทยเริ่ม มิ.ย. — ถ้าวันเริ่มฝึก/วันนี้อยู่ ม.ค.–พ.ค. นับเป็นปีการศึกษาก่อนหน้า
  const academicYear = (() => {
    if (slashMatch) return slashMatch[2];
    const ref = new Date(request?.internship_start_date || request?.details?.startDate || Date.now());
    const d = isNaN(ref) ? new Date() : ref;
    return String(d.getFullYear() + 543 - (d.getMonth() < 5 ? 1 : 0));
  })();
  const termLabel = semester
    ? `${semester === 'ฤดูร้อน' ? 'ภาคฤดูร้อน' : `ภาคเรียนที่ ${semester}`} ประจำปีการศึกษา ${academicYear}`
    : `ประจำปีการศึกษา ${academicYear}`;
  const todayThai = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const docNo = request ? `LASC-${request.id}` : '-';

  const computedRemaining = (() => {
    const end = request?.internship_end_date || request?.details?.endDate;
    if (!end) return null;
    const e = new Date(end);
    if (isNaN(e)) return null;
    return Math.max(0, Math.ceil((e - new Date()) / 86400000));
  })();

  // ===== ฐานข้อมูลที่อยู่ไทย (ชุดเดียวกับหน้ายื่นคำร้องหลัก) =====
  const provinceOptions = getProvinces();
  const amphurOptions = useMemo(() => getAmphoes(form.addr_province), [form.addr_province]);
  const tambonOptions = useMemo(
    () => getDistricts(form.addr_province, form.addr_amphur).map((d) => d.district),
    [form.addr_province, form.addr_amphur]
  );
  const bkk = isBangkok(form.addr_province);

  const onProvinceChange = (v) => setForm((p) => ({ ...p, addr_province: v || '', addr_amphur: '', addr_tambon: '', addr_postal: '' }));
  const onAmphurChange = (v) => setForm((p) => ({ ...p, addr_amphur: v || '', addr_tambon: '', addr_postal: '' }));
  const onTambonChange = (v) => setForm((p) => ({
    ...p, addr_tambon: v || '',
    addr_postal: v ? getZipcode(p.addr_province, p.addr_amphur, v) : ''
  }));

  // ===== สถานประกอบการแนะนำในระบบ (ชุดเดียวกับหน้ายื่นคำร้องหลัก) =====
  const openCompanyPicker = async () => {
    setPickerOpen(true);
    if (companies.length || pickerLoading) return;
    setPickerLoading(true);
    setPickerError('');
    try {
      const r = await api.get('/public/companies');
      setCompanies(r.data?.data || []);
    } catch {
      setPickerError('ไม่สามารถโหลดข้อมูลสถานประกอบการแนะนำได้');
    } finally {
      setPickerLoading(false);
    }
  };

  const companyAddressText = (c) => {
    const a = c.address;
    if (!a) return c.province || '';
    if (typeof a === 'string') return a;
    return [a.house || a.no, (a.moo || a.village) && `หมู่ ${a.moo || a.village}`,
      (a.tambon || a.subdistrict) && `ต.${a.tambon || a.subdistrict}`,
      (a.amphur || a.district) && `อ.${a.amphur || a.district}`,
      (a.province || a.city) && `จ.${a.province || a.city}`, a.postal || a.zip
    ].filter(Boolean).join(' ');
  };

  // แยกที่อยู่ไทยจากข้อความก้อนเดียว (regex ชุดเดียวกับ NewRequestPage)
  const parseThaiAddress = (raw) => {
    const r = { house: '', moo: '', road: '', tambon: '', amphur: '', province: '', postal: '', detail: '' };
    let rest = ` ${String(raw || '').replace(/\s+/g, ' ').trim()} `;
    if (!rest.trim()) return r;
    const cut = (re) => { const m = rest.match(re); if (!m) return ''; rest = rest.replace(m[0], ' '); return (m[1] || '').trim(); };
    r.postal = cut(/\s(\d{5})(?=\s|$)/) || cut(/(\d{5})(?=\s*$)/);
    r.moo = cut(/(?:หมู่(?:ที่)?|หมู่บ้าน|ม\.)\s*(\d{1,3})/);
    r.road = cut(/(?:ถนน|ถ\.)\s*([ก-๙A-Za-z0-9]+)/);
    r.tambon = cut(/(?:ตำบล|ต\.|แขวง)\s*([ก-๙A-Za-z]+)/);
    r.amphur = cut(/(?:อำเภอ|อ\.|เขต)\s*([ก-๙A-Za-z]+)/);
    const prov = getProvinces().find((p) => p && rest.includes(p));
    if (prov) { r.province = prov; rest = rest.replace(prov, ' '); }
    else r.province = cut(/(?:จังหวัด|จ\.)\s*([ก-๙A-Za-z]+)/);
    rest = rest.replace(/(?:จังหวัด|จ\.|เลขที่)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = rest.split(' ').filter(Boolean);
    if (parts.length && /^\d/.test(parts[0])) { r.house = parts[0]; r.detail = parts.slice(1).join(' '); }
    else r.detail = rest;
    return r;
  };

  const filteredCompanies = useMemo(() => {
    const k = pickerSearch.trim().toLowerCase();
    if (!k) return companies;
    return companies.filter((c) => [c.name, c.businessType || c.business_type, companyAddressText(c), c.contactPerson || c.contact_person]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(k)));
  }, [companies, pickerSearch]);

  const applyCompany = (c) => {
    const a = (c.address && typeof c.address === 'object')
      ? {
          house: c.address.house || c.address.no || '', moo: c.address.moo || c.address.village || '',
          road: c.address.road || '', tambon: c.address.tambon || c.address.subdistrict || '',
          amphur: c.address.amphur || c.address.district || '', province: c.address.province || c.address.city || '',
          postal: c.address.postal || c.address.zip || '', detail: c.address.detail || ''
        }
      : parseThaiAddress(c.address);
    const province = a.province || c.province || '';
    setForm((p) => ({
      ...p,
      new_company_name: c.name || p.new_company_name,
      addr_house: a.house || p.addr_house,
      addr_moo: a.moo || '', addr_road: a.road || a.detail || '',
      addr_province: province, addr_amphur: a.amphur || '', addr_tambon: a.tambon || '',
      addr_postal: a.postal || getZipcode(province, a.amphur, a.tambon) || '',
      mentor_name: c.contactPerson || c.contact_person || p.mentor_name,
      mentor_position: c.contactPosition || c.contact_position || p.mentor_position,
      mentor_phone: c.phone || c.contactPhone || c.contact_phone || p.mentor_phone,
      mentor_email: c.email || c.contactEmail || c.contact_email || p.mentor_email
    }));
    setPickerOpen(false);
    setPickerSearch('');
  };

  const onPickFile = (file) => {
    if (!file) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { setError('รองรับเฉพาะไฟล์ PDF, PNG, JPG'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, fileName: file.name, dataUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const mentorEmailValid = !form.mentor_email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.mentor_email.trim());
  const canSubmit = form.reason.trim() && form.new_company_name.trim()
    && form.mentor_name.trim() && mentorEmailValid
    && form.dataUrl && form.signature && !submitting;

  const submit = async () => {
    if (!canSubmit || !request) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/relocations', {
        internship_request_id: request.id,
        reason: form.reason,
        new_company_name: form.new_company_name,
        mentor_name: form.mentor_name, mentor_position: form.mentor_position,
        mentor_email: form.mentor_email, mentor_phone: form.mentor_phone,
        days_trained: daysTrained,
        days_remaining: computedRemaining ?? 0,
        return_letter_name: form.fileName,
        return_letter_data_url: form.dataUrl,
        student_signature_data_url: form.signature,
        new_addr_house: form.addr_house, new_addr_moo: form.addr_moo,
        new_addr_road: form.addr_road, new_addr_tambon: form.addr_tambon,
        new_addr_amphur: form.addr_amphur, new_addr_province: form.addr_province,
        new_addr_postal: form.addr_postal,
        semester, academic_year: academicYear, student_phone: studentPhone
      });
      navigate('/dashboard/my-requests');
    } catch (e) {
      setError(e.response?.data?.message || 'ส่งคำร้องไม่สำเร็จ');
      setSubmitting(false);
    }
  };

  // ฟิลด์ MUI ทั้งหน้า — ลุค filled มาจาก global .MuiOutlinedInput-root ใน index.css
  const acSx = {
    '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': { height: 48 },
    '& .MuiOutlinedInput-root.MuiInputBase-multiline': { padding: '12px 16px' },
    '& .MuiAutocomplete-popupIndicator': { color: '#64748b' },
    '& .MuiInputBase-input': { fontSize: 14, color: '#334155' },
    '& .MuiInputBase-input:not(.MuiInputBase-inputMultiline)': { padding: '12px 16px' },
    '& .MuiInputBase-input::placeholder': { color: '#94a3b8', opacity: 1 }
  };

  const InfoItem = ({ label, value, wide }) => (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="ty-caption m-0">{label}</p>
      <p className="text-sm font-semibold text-slate-900 m-0 mt-0.5 leading-relaxed break-words">{value || '—'}</p>
    </div>
  );

  const SectionHead = ({ n, title, hint }) => (
    <div className="flex items-start gap-3 mb-5">
      <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
      <div className="min-w-0">
        <h2 className="ty-section-title m-0">{title}</h2>
        {hint && <p className="ty-caption m-0 mt-0.5">{hint}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-purple-50/40">
      {/* Header bar */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dashboard/my-requests')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-purple-700 bg-transparent border-0 cursor-pointer px-3 py-2 rounded-xl hover:bg-purple-50 transition">
            <ArrowLeft style={{ width: 16, height: 16 }} />
            กลับไปหน้าคำร้องของฉัน
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="py-24 flex items-center justify-center gap-2 ty-body">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังเตรียมแบบฟอร์ม...
          </div>
        ) : !request && !existing ? (
          <div className="ui-card p-10 text-center max-w-xl mx-auto">
            <p className="ty-section-title m-0">ยังไม่สามารถยื่นคำร้องได้</p>
            <p className="ty-body mt-1 m-0">ขอเปลี่ยนสถานที่ฝึกงานได้เฉพาะนักศึกษาที่อยู่ในสถานะ "ออกฝึกงาน" แล้วเท่านั้น</p>
            <Link to="/dashboard/my-requests" className="mt-5 inline-block text-sm font-semibold text-purple-600 hover:text-purple-800">← กลับไปหน้าคำร้องของฉัน</Link>
          </div>
        ) : existing ? (
          <div className="ui-card p-8 max-w-3xl mx-auto">
            <p className="ty-section-title m-0">มีคำร้องขอเปลี่ยนสถานที่ฝึกงานที่กำลังดำเนินการอยู่</p>
            <p className="ty-body mt-1 mb-6 m-0">ย้ายไป {existing.new_company_name} — ติดตามสถานะหรือลิงก์/QR สำหรับบริษัทเดิมได้ที่หน้าคำร้องของฉัน</p>
            <RelocationStepper status={existing.status} />
            {existing.return_letter_file && (
              <a href={fileUrl(existing.return_letter_file)} target="_blank" rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 no-underline hover:text-purple-800">
                <FileText style={{ width: 15, height: 15 }} /> หนังสือส่งตัวกลับที่แนบไว้
              </a>
            )}
            <div className="mt-6">
              <Link to="/dashboard/my-requests" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold no-underline">
                <ArrowLeft style={{ width: 15, height: 15 }} /> กลับไปหน้าคำร้องของฉัน
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Page title */}
            <div className="mb-7">
              <span className="ty-badge bg-purple-100 text-purple-700">บันทึกข้อความ</span>
              <h1 className="ty-page-title mt-3 mb-1">ขอเปลี่ยนแปลงสถานที่ฝึกงาน</h1>
              <p className="ty-body m-0">กรอกข้อมูลตามแบบบันทึกข้อความราชการของคณะศิลปศาสตร์และวิทยาศาสตร์ ระบบดึงข้อมูลนักศึกษาและสถานที่เดิมให้อัตโนมัติ</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* ================= LEFT: เนื้อหาบันทึกข้อความ ================= */}
              <div className="lg:col-span-2 space-y-6">

                {/* หัวบันทึกข้อความ + ข้อมูลนักศึกษา */}
                <section className="ui-card p-6 sm:p-8">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 m-0 text-sm">
                    <dt className="font-semibold text-slate-900">ส่วนราชการ</dt>
                    <dd className="m-0 text-slate-700">คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ</dd>
                    <dt className="font-semibold text-slate-900">ที่</dt>
                    <dd className="m-0 text-slate-700">{docNo} <span className="ty-caption">(ออกเลขอัตโนมัติ)</span></dd>
                    <dt className="font-semibold text-slate-900">วันที่</dt>
                    <dd className="m-0 text-slate-700">{todayThai}</dd>
                    <dt className="font-semibold text-slate-900">เรื่อง</dt>
                    <dd className="m-0 text-slate-700">ขอเปลี่ยนแปลงสถานที่ฝึกงาน</dd>
                    <dt className="font-semibold text-slate-900">เรียน</dt>
                    <dd className="m-0 text-slate-700">คณบดีคณะศิลปศาสตร์และวิทยาศาสตร์</dd>
                  </dl>

                  <div className="mt-6 bg-slate-50/80 border border-slate-200 rounded-2xl p-6">
                    <p className="ty-label m-0 mb-4">ข้อมูลผู้ยื่นคำร้อง</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <InfoItem label="ชื่อ-นามสกุล" value={`${studentTitle} ${studentName}`} />
                      <InfoItem label="รหัสนักศึกษา" value={studentId2} />
                      <InfoItem label="สาขาวิชา" value={major} />
                      <InfoItem label="เบอร์ติดต่อ" value={studentPhone} />
                      <InfoItem label="ภาคเรียน / ปีการศึกษา" value={termLabel} wide />
                    </div>
                  </div>
                  <p className="ty-body mt-4 mb-0">มีความประสงค์ขอเปลี่ยนแปลงสถานที่ฝึกงาน{semester ? `ใน${termLabel}` : ''} รายละเอียดดังนี้</p>
                </section>

                {/* 1. เหตุผล */}
                <section className="ui-card p-6 sm:p-8">
                  <SectionHead n="1" title="เหตุผลในการขอเปลี่ยนแปลง" hint="เนื่องจากมีเหตุผลในการขอเปลี่ยนแปลง ดังนี้" />
                  <TextField multiline rows={5} fullWidth size="small" sx={acSx}
                    value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="ชี้แจงเหตุผลและความจำเป็นในการขอย้ายสถานที่ฝึกงานโดยละเอียด" />
                </section>

                {/* 2. สถานที่ฝึกงานเดิม */}
                <section className="ui-card p-6 sm:p-8">
                  <SectionHead n="2" title="สถานที่ฝึกงานเดิม" hint="ข้อมูลจากคำร้องฝึกงานที่ได้รับอนุมัติ" />
                  <p className="text-base font-semibold text-slate-900 m-0 mb-4 leading-relaxed">{request.companyName || request.company || '—'}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                    <InfoItem label="ที่อยู่ เลขที่" value={oldAddr.house} />
                    <InfoItem label="หมู่ที่" value={oldAddr.moo} />
                    <InfoItem label="ถนน" value={oldAddr.road} />
                    <InfoItem label="ตำบล/เขต" value={oldAddr.tambon} />
                    <InfoItem label="อำเภอ/แขวง" value={oldAddr.amphur} />
                    <InfoItem label="จังหวัด" value={oldAddr.province} />
                    <InfoItem label="รหัสไปรษณีย์" value={oldAddr.postal} />
                  </div>
                  {oldAddr.detail && <p className="ty-caption mt-3 mb-0">{oldAddr.detail}</p>}
                </section>

                {/* 3. สถานที่ฝึกงานใหม่ */}
                <section className="ui-card p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <SectionHead n="3" title="สถานที่ฝึกงานใหม่" hint="เลือกจังหวัด อำเภอ และตำบลจากรายการ — รหัสไปรษณีย์เติมอัตโนมัติ" />
                    <button type="button" onClick={openCompanyPicker}
                      className="px-3.5 py-2 rounded-xl border border-violet-200 text-violet-600 bg-violet-50/60 hover:bg-violet-100 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Search className="w-3.5 h-3.5" />
                      เลือกจากรายการแนะนำ
                    </button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="ty-label block mb-2">ชื่อบริษัท <span className="text-rose-500 ml-1">*</span></label>
                      <Autocomplete
                        freeSolo size="small" options={companies}
                        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name || '')}
                        inputValue={form.new_company_name}
                        onInputChange={(_, v, reason) => {
                          if (reason === 'input') setForm((p) => ({ ...p, new_company_name: v }));
                        }}
                        onChange={(_, v) => { if (v && typeof v === 'object') applyCompany(v); }}
                        filterOptions={(options, state) => {
                          const k = state.inputValue.trim().toLowerCase();
                          return k ? options.filter((c) => String(c.name || '').toLowerCase().includes(k)) : options;
                        }}
                        renderOption={(props, c) => (
                          <li {...props} key={props.key}>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 m-0">{c.name}</p>
                              {companyAddressText(c) && <p className="text-[11px] text-slate-400 m-0 truncate">{companyAddressText(c)}</p>}
                            </div>
                          </li>
                        )}
                        noOptionsText="ไม่พบในรายการแนะนำ — พิมพ์ชื่อเองได้"
                        renderInput={(params) => <TextField {...params} placeholder="พิมพ์ชื่อสถานประกอบการเพื่อค้นหา หรือเลือกจากรายการ" sx={acSx} />} />
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4">
                      <label className="ty-label block m-0">ที่อยู่สถานประกอบการ <span className="text-rose-500 ml-1">*</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[['addr_house', 'ที่อยู่ เลขที่'], ['addr_moo', 'หมู่ที่'], ['addr_road', 'ถนน']].map(([k, label]) => (
                          <div key={k}>
                            <label className="ty-label block mb-2">{label}</label>
                            <TextField fullWidth size="small" sx={acSx}
                              value={form[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="ty-label block mb-2">จังหวัด</label>
                        <Autocomplete size="small" options={provinceOptions} value={form.addr_province || null}
                          onChange={(_, v) => onProvinceChange(v)} autoHighlight
                          renderInput={(params) => <TextField {...params} placeholder="เลือกหรือพิมพ์จังหวัด" sx={acSx} />} />
                      </div>
                      <div>
                        <label className="ty-label block mb-2">{bkk ? 'เขต' : 'อำเภอ/แขวง'}</label>
                        <Autocomplete size="small" options={amphurOptions} value={form.addr_amphur || null}
                          onChange={(_, v) => onAmphurChange(v)} disabled={!form.addr_province} autoHighlight
                          renderInput={(params) => <TextField {...params} placeholder={form.addr_province ? (bkk ? 'เลือกเขต' : 'เลือกอำเภอ') : 'เลือกจังหวัดก่อน'} sx={acSx} />} />
                      </div>
                      <div>
                        <label className="ty-label block mb-2">{bkk ? 'แขวง' : 'ตำบล/เขต'}</label>
                        <Autocomplete size="small" options={tambonOptions} value={form.addr_tambon || null}
                          onChange={(_, v) => onTambonChange(v)} disabled={!form.addr_amphur} autoHighlight
                          renderInput={(params) => <TextField {...params} placeholder={form.addr_amphur ? (bkk ? 'เลือกแขวง' : 'เลือกตำบล') : 'เลือกอำเภอ/เขตก่อน'} sx={acSx} />} />
                      </div>
                      <div>
                        <label className="ty-label block mb-2">รหัสไปรษณีย์ <span className="ty-caption">(อัตโนมัติ)</span></label>
                        <TextField fullWidth size="small" sx={acSx} value={form.addr_postal} placeholder="—"
                          slotProps={{ input: { readOnly: true } }} />
                      </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                      <p className="ty-section-title m-0 mb-4 flex items-center gap-2">
                        <User className="text-purple-600 shrink-0" style={{ width: 18, height: 18 }} />
                        ข้อมูลหัวหน้าหน่วยงาน / ผู้ดูแล
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="ty-label block mb-2">ชื่อ-นามสกุล <span className="text-rose-500 ml-1">*</span></label>
                          <TextField fullWidth size="small" sx={acSx}
                            value={form.mentor_name} onChange={(e) => setForm((p) => ({ ...p, mentor_name: e.target.value }))}
                            placeholder="เช่น คุณสมชาย ใจดี" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="ty-label block mb-2">ตำแหน่ง</label>
                            <TextField fullWidth size="small" sx={acSx}
                              value={form.mentor_position} onChange={(e) => setForm((p) => ({ ...p, mentor_position: e.target.value }))}
                              placeholder="เช่น ผู้จัดการฝ่ายบุคคล" />
                          </div>
                          <div>
                            <label className="ty-label block mb-2">อีเมลหัวหน้าหน่วยงาน</label>
                            <TextField fullWidth size="small" sx={acSx} type="email"
                              value={form.mentor_email} onChange={(e) => setForm((p) => ({ ...p, mentor_email: e.target.value }))}
                              placeholder="name@company.co.th" />
                            {!mentorEmailValid && <p className="text-xs text-rose-600 m-0 mt-1.5">รูปแบบอีเมลไม่ถูกต้อง</p>}
                          </div>
                        </div>
                        <div>
                          <label className="ty-label block mb-2">เบอร์โทรหัวหน้าหน่วยงาน</label>
                          <TextField fullWidth size="small" sx={acSx}
                            value={form.mentor_phone} onChange={(e) => setForm((p) => ({ ...p, mentor_phone: e.target.value }))}
                            placeholder="08x-xxx-xxxx" slotProps={{ htmlInput: { inputMode: 'tel' } }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. ลายมือชื่อ */}
                <section className="ui-card p-6 sm:p-8">
                  <SectionHead n="4" title="ลงลายมือชื่อนักศึกษา" hint="จึงเรียนมาเพื่อโปรดพิจารณา" />
                  <div className="w-full">
                    <SignaturePad onChange={(dataUrl) => setForm((p) => ({ ...p, signature: dataUrl || '' }))} height={260} />
                    <div className="text-center mt-3">
                      <p className="ty-body m-0">ลงชื่อ ......................................... นักศึกษา</p>
                      <p className="text-sm font-semibold text-slate-800 m-0 mt-0.5">({studentTitle} {studentName})</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* ================= RIGHT: Sidebar สรุป/แนบไฟล์/ส่ง ================= */}
              <aside className="space-y-6 lg:sticky lg:top-24">
                {/* สถิติเวลาฝึกงาน */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="ui-card p-4">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                      <CalendarDays className="text-purple-600" style={{ width: 18, height: 18 }} />
                    </div>
                    <p className="ty-caption m-0">ฝึกงานไปแล้ว</p>
                    <p className="m-0 mt-0.5 leading-none"><span className="text-2xl font-bold text-purple-600">{daysTrained}</span> <span className="ty-caption">วัน</span></p>
                  </div>
                  <div className="ui-card p-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
                      <Clock className="text-amber-600" style={{ width: 18, height: 18 }} />
                    </div>
                    <p className="ty-caption m-0">คงเหลือ</p>
                    <p className="m-0 mt-0.5 leading-none"><span className="text-2xl font-bold text-amber-600">{computedRemaining ?? '—'}</span> <span className="ty-caption">วัน</span></p>
                  </div>
                </div>

                {/* เอกสารแนบ */}
                <div className="ui-card p-6">
                  <h3 className="ty-section-title m-0 mb-1">เอกสารแนบ <span className="text-rose-500 ml-1">*</span></h3>
                  <p className="ty-caption m-0 mb-4">หนังสือส่งตัวกลับจากสถานประกอบการเดิม (PDF/PNG/JPG ไม่เกิน 10MB)</p>
                  <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center cursor-pointer transition ${form.dataUrl ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-300 bg-slate-50/60 hover:border-purple-400 hover:bg-purple-50/40'}`}>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                    {form.dataUrl ? (
                      <>
                        <FileText className="text-emerald-600" style={{ width: 22, height: 22 }} />
                        <span className="text-sm font-medium text-emerald-700 truncate max-w-full">{form.fileName}</span>
                        <span className="ty-caption">คลิกเพื่อเปลี่ยนไฟล์</span>
                      </>
                    ) : (
                      <>
                        <Upload className="text-slate-400" style={{ width: 22, height: 22 }} />
                        <span className="text-sm font-medium text-slate-600">คลิกเพื่อแนบไฟล์</span>
                      </>
                    )}
                  </label>
                </div>

                {/* เงื่อนไข */}
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
                  <p className="text-sm font-semibold text-amber-900 m-0 flex items-center gap-2">
                    <AlertTriangle className="text-amber-600 shrink-0" style={{ width: 16, height: 16 }} />
                    ข้อกำหนดสำคัญ
                  </p>
                  <ul className="mt-2 mb-0 pl-5 space-y-1.5 list-disc text-[13px] text-amber-800 leading-relaxed">
                    <li>ขอเปลี่ยนได้เฉพาะกรณีจำเป็นตามเกณฑ์คณะ เช่น บาดเจ็บ/ไม่ปลอดภัย หรือสถานประกอบการขอยุติ</li>
                    <li><strong>ต้องแนบหนังสือส่งตัวกลับจากที่เดิมทุกครั้ง</strong></li>
                  </ul>
                </div>

                {/* Checklist + ปุ่มส่ง */}
                <div className="ui-card p-6">
                  <h3 className="ty-section-title m-0 mb-4">ความพร้อมก่อนส่ง</h3>
                  <ul className="m-0 p-0 list-none space-y-2.5">
                    {[
                      ['เหตุผลการขอเปลี่ยน', !!form.reason.trim()],
                      ['ชื่อบริษัทใหม่', !!form.new_company_name.trim()],
                      ['ที่อยู่ใหม่ (จังหวัด/อำเภอ/ตำบล)', !!(form.addr_province && form.addr_amphur && form.addr_tambon)],
                      ['หัวหน้าหน่วยงาน/ผู้ดูแล', !!form.mentor_name.trim()],
                      ['ลายมือชื่อนักศึกษา', !!form.signature],
                      ['หนังสือส่งตัวกลับ', !!form.dataUrl]
                    ].map(([label, ok]) => (
                      <li key={label} className="flex items-center gap-2.5 text-sm">
                        {ok
                          ? <CheckCircle2 className="text-emerald-500 shrink-0" style={{ width: 17, height: 17 }} />
                          : <Circle className="text-slate-300 shrink-0" style={{ width: 17, height: 17 }} />}
                        <span className={ok ? 'text-slate-800' : 'text-slate-500'}>{label}</span>
                      </li>
                    ))}
                  </ul>

                  {error && <p className="text-sm font-medium text-rose-600 mt-4 mb-0">{error}</p>}

                  <div className="mt-6 flex flex-col gap-2.5">
                    <button type="button" onClick={submit} disabled={!canSubmit}
                      className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-[0_6px_18px_rgba(147,51,234,0.25)] transition cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      ยืนยันส่งคำร้องขอเปลี่ยนที่ฝึกงาน
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/my-requests')} disabled={submitting}
                      className="w-full h-11 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium transition cursor-pointer bg-white disabled:opacity-50">
                      ยกเลิก
                    </button>
                  </div>
                </div>

                <div className="ui-card p-6">
                  <h3 className="ty-section-title m-0 mb-4">ขั้นตอนหลังส่ง</h3>
                  <ol className="m-0 p-0 list-none space-y-3">
                    {['บริษัทเดิมลงนามยินยอมผ่านลิงก์/QR', 'อาจารย์ที่ปรึกษาพิจารณาและลงนาม', 'คณบดีลงนาม + ออกหนังสือขอความอนุเคราะห์', 'ที่ใหม่ตอบรับ → รับหนังสือส่งตัวใหม่'].map((t, i) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 2}</span>
                        <span className="ty-body">{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* ===== Modal เลือกสถานประกอบการแนะนำ ===== */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="ty-section-title m-0">เลือกสถานประกอบการแนะนำ</h3>
                  <p className="ty-caption m-0 mt-0.5">เลือกจากรายชื่อในระบบเพื่อกรอกข้อมูลที่ใหม่อัตโนมัติ</p>
                </div>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="ปิดหน้าต่าง"
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer border-0 bg-transparent">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {pickerLoading ? (
                <div className="flex justify-center py-14">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : pickerError ? (
                <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-6 text-center text-sm font-medium text-rose-600">{pickerError}</div>
              ) : companies.length === 0 ? (
                <div className="text-center py-10">
                  <p className="ty-section-title m-0">ยังไม่มีข้อมูลสถานประกอบการแนะนำ</p>
                  <p className="ty-body m-0 mt-1">กรอกชื่อและที่อยู่สถานประกอบการใหม่ได้โดยตรงในฟอร์ม</p>
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="w-4 h-4 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input type="text" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="ค้นหาบริษัท / ประเภทธุรกิจ / ผู้ติดต่อ..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-2.5 text-sm text-slate-700 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {filteredCompanies.map((c, idx) => (
                      <button type="button" key={`${c.name}-${idx}`} onClick={() => applyCompany(c)}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition cursor-pointer text-left bg-white flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 m-0 truncate">{c.name}</p>
                          {companyAddressText(c) && <p className="ty-caption m-0 mt-0.5 truncate">{companyAddressText(c)}</p>}
                          {(c.businessType || c.business_type) && <p className="ty-caption m-0 mt-0.5 text-purple-500">{c.businessType || c.business_type}</p>}
                        </div>
                      </button>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <p className="ty-body text-center py-6 m-0">ไม่พบสถานประกอบการที่ค้นหา</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelocationRequestPage;
