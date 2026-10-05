import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import {
    Alert, Dialog, DialogContent, Snackbar, TextField,
} from '@mui/material';
import {
    ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Copy, Download, FileText, FileSignature,
    FileCheck, Loader2, MapPin, QrCode, User, Upload, XCircle,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import './AdminDashboardPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import RelocationStepper, { RELOCATION_STATUS_LABEL } from '../../../components/RelocationStepper';
import SignaturePad from '../../../components/SignaturePad';
import { getUploadUrl } from '../../../utils/fileUrl';

const fileUrl = getUploadUrl;

const statusColor = (status) =>
    status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200/60'
    : status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
    : 'bg-violet-50 text-violet-600 border-violet-200/60';

const InfoRow = ({ label, children }) => (
    <div>
        <p className="text-[11px] font-semibold text-slate-400 m-0">{label}</p>
        <p className="text-sm text-slate-800 m-0 mt-0.5 break-words">{children || '-'}</p>
    </div>
);

// หน้ารายละเอียดคำร้องเปลี่ยนสถานที่ฝึกงาน (admin) — ดูข้อมูลเต็ม + ดำเนินการทีละขั้น
const AdminRelocationDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [uploadDialog, setUploadDialog] = useState({ open: false, item: null, endpoint: '', title: '', fileName: '', dataUrl: '', comment: '', startDate: '', endDate: '' });
    const [rejectDialog, setRejectDialog] = useState({ open: false, item: null, comment: '' });
    const [deanDialog, setDeanDialog] = useState({ open: false, item: null, decision: 'allow', signature: '', comment: '' });
    const [deanQr, setDeanQr] = useState({ open: false, link: '', copied: false });
    const [showPhoto, setShowPhoto] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    const load = () => {
        api.get('/relocations')
            .then((res) => {
                const rows = res.data?.data || [];
                const found = rows.find((r) => String(r.id) === String(id));
                if (found) setItem(found); else setNotFound(true);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate('/dashboard'); return; }
        load();
    }, [navigate, id]);

    const handleLogout = () => { localStorage.removeItem('user'); navigate('/'); };

    const callApi = async (method, url, body, okMsg) => {
        setSubmitting(true);
        try {
            const res = await api[method](url, body);
            setToast({ open: true, message: okMsg, severity: 'success' });
            load();
            return res.data || true;
        } catch (e) {
            setToast({ open: true, message: e.response?.data?.message || 'ดำเนินการไม่สำเร็จ', severity: 'error' });
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const submitDean = async () => {
        const { item: it, decision, signature, comment } = deanDialog;
        if (!signature) {
            setToast({ open: true, message: 'กรุณาลงลายมือชื่อดิจิทัล (คณบดี/ผู้บันทึกแทน)', severity: 'warning' });
            return;
        }
        const ok = await callApi('patch', `/relocations/${it.id}/admin-approve`,
            { decision, dean_signature_data_url: signature, comment },
            decision === 'allow' ? 'คณบดีอนุญาตแล้ว — พร้อมออกหนังสือขอความอนุเคราะห์' : 'บันทึกผลไม่อนุญาตแล้ว');
        if (ok) setDeanDialog({ open: false, item: null, decision: 'allow', signature: '', comment: '' });
    };

    const adminReject = async () => {
        if (!rejectDialog.comment.trim()) {
            setToast({ open: true, message: 'กรุณาระบุเหตุผลที่ตีกลับ', severity: 'warning' });
            return;
        }
        const ok = await callApi('patch', `/relocations/${rejectDialog.item.id}/admin-reject`, { comment: rejectDialog.comment }, 'ตีกลับคำร้องแล้ว');
        if (ok) setRejectDialog({ open: false, item: null, comment: '' });
    };

    // สร้างลิงก์/QR ให้คณบดีลงนามพิจารณาเอง (one-time)
    const openDeanQr = async (r) => {
        try {
            const res = await api.post(`/relocations/${r.id}/dean-link`);
            const token = res?.data?.data?.token;
            if (token) setDeanQr({ open: true, copied: false, kind: 'dean', link: `${window.location.origin}/coop/public/relocation-dean/${token}` });
        } catch (e) {
            setToast({ open: true, message: e.response?.data?.message || 'สร้างลิงก์คณบดีไม่สำเร็จ', severity: 'error' });
        }
    };

    // ลิงก์/QR ให้สถานประกอบการใหม่ตอบรับ (one-time)
    const openAcceptanceQr = async (r) => {
        try {
            const res = await api.get(`/relocations/${r.id}/acceptance-link`);
            const token = res?.data?.data?.token;
            if (token) setDeanQr({ open: true, copied: false, kind: 'acceptance', link: `${window.location.origin}/coop/public/company-acceptance/${token}` });
        } catch (e) {
            setToast({ open: true, message: e.response?.data?.message || 'สร้างลิงก์ตอบรับไม่สำเร็จ', severity: 'error' });
        }
    };

    // ช่วงวันฝึกงาน — บังคับก่อนออกหนังสือขอความอนุเคราะห์/ส่งตัว
    const NEEDS_DATES = ['request-letter', 'dispatch-letter'];
    const toISODate = (v) => {
        if (!v) return '';
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    };
    // นับวันทำการ จันทร์–เสาร์ (หักอาทิตย์) — ตรงกับ backend
    const countWorkDays = (s, e) => {
        if (!s || !e) return 0;
        let d = new Date(`${s}T00:00:00`); const end = new Date(`${e}T00:00:00`); let n = 0;
        while (d <= end) { if (d.getDay() !== 0) n += 1; d.setDate(d.getDate() + 1); }
        return n;
    };

    const openUpload = (it, endpoint, title) =>
        setUploadDialog({
            open: true, item: it, endpoint, title, fileName: '', dataUrl: '', comment: '',
            startDate: toISODate(it.new_start_date), endDate: toISODate(it.new_end_date)
        });

    const submitUpload = async () => {
        const { item: it, endpoint, fileName, dataUrl, comment, startDate, endDate } = uploadDialog;
        if (!dataUrl) { setToast({ open: true, message: 'กรุณาแนบไฟล์เอกสาร (PDF/PNG/JPG ≤10MB)', severity: 'warning' }); return; }
        const needsDates = NEEDS_DATES.includes(endpoint);
        if (needsDates && (!startDate || !endDate)) {
            setToast({ open: true, message: 'กรุณาระบุวันที่เริ่มและสิ้นสุดการฝึกงาน ณ สถานประกอบการใหม่', severity: 'warning' }); return;
        }
        if (needsDates && endDate < startDate) {
            setToast({ open: true, message: 'วันสิ้นสุดการฝึกงานต้องไม่ก่อนวันเริ่มต้น', severity: 'warning' }); return;
        }
        const res2 = await callApi('patch', `/relocations/${it.id}/${endpoint}`,
            { file_name: fileName, file_data_url: dataUrl, comment,
              ...(needsDates ? { new_start_date: startDate, new_end_date: endDate } : {}) },
            `${uploadDialog.title} เรียบร้อย`);
        const ok = !!res2;
        // หลังออกหนังสือขอความอนุเคราะห์ → เด้ง QR ลิงก์ตอบรับของที่ใหม่ทันที
        if (ok && endpoint === 'request-letter' && res2?.data?.acceptance_token) {
            setDeanQr({ open: true, copied: false, kind: 'acceptance', link: `${window.location.origin}/coop/public/company-acceptance/${res2.data.acceptance_token}` });
        }
        if (ok) setUploadDialog({ open: false, item: null, endpoint: '', title: '', fileName: '', dataUrl: '', comment: '', startDate: '', endDate: '' });
    };

    const onPickFile = (file) => {
        if (!file) return;
        if (!/\.(pdf|png|jpe?g)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
            setToast({ open: true, message: 'รองรับ PDF/PNG/JPG ≤ 10MB', severity: 'warning' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setUploadDialog((p) => ({ ...p, fileName: file.name, dataUrl: reader.result }));
        reader.readAsDataURL(file);
    };

    // ปุ่ม action ตามสถานะ — เหมือนหน้ารายการ แต่ใหญ่กดง่าย
    const renderActions = (r) => {
        const btn = 'inline-flex items-center justify-center gap-1.5 px-4 h-11 rounded-xl text-sm font-medium border-0 cursor-pointer transition flex-1 disabled:opacity-50';
        switch (r.status) {
            case 'advisor_approved_waiting_admin':
                return (
                    <>
                        <button type="button" onClick={() => setDeanDialog({ open: true, item: r, decision: 'allow', signature: '', comment: '' })} disabled={submitting} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                            <CheckCircle2 style={{ width: 15, height: 15 }} /> เสนอคณบดีพิจารณา
                        </button>
                        <button type="button" onClick={() => setRejectDialog({ open: true, item: r, comment: '' })} disabled={submitting} className={`${btn} bg-red-50 hover:bg-red-100 text-red-600 !border !border-red-200`}>
                            <XCircle style={{ width: 15, height: 15 }} /> ตีกลับ
                        </button>
                        <button type="button" onClick={() => openDeanQr(r)} disabled={submitting} title="สร้างลิงก์/QR ส่งให้คณบดีลงนามเอง" className={`${btn} bg-violet-50 hover:bg-violet-100 text-violet-600 !border !border-violet-200 sm:flex-none`}>
                            <QrCode style={{ width: 15, height: 15 }} /> ลิงก์ / QR ลงนาม (คณบดี)
                        </button>
                    </>
                );
            case 'admin_approved_generating_request_letter':
                return (
                    <button type="button" onClick={() => openUpload(r, 'request-letter', 'ออกหนังสือขอความอนุเคราะห์ (ที่ใหม่)')} disabled={submitting} className={`${btn} bg-violet-600 hover:bg-violet-700 text-white`}>
                        <FileSignature style={{ width: 15, height: 15 }} /> ออกหนังสือขอความอนุเคราะห์
                    </button>
                );
            case 'waiting_company_acceptance':
                return (
                    <>
                        <button type="button" onClick={() => openUpload(r, 'acceptance', 'บันทึกการตอบรับจากสถานประกอบการใหม่')} disabled={submitting} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
                            <FileCheck style={{ width: 15, height: 15 }} /> บันทึกผลตอบรับจากสถานประกอบการ
                        </button>
                        <button type="button" onClick={() => openAcceptanceQr(r)} disabled={submitting} title="สร้างลิงก์/QR ส่งให้สถานประกอบการใหม่ตอบรับออนไลน์" className={`${btn} bg-violet-50 hover:bg-violet-100 text-violet-600 !border !border-violet-200 sm:flex-none`}>
                            <QrCode style={{ width: 15, height: 15 }} /> ลิงก์ / QR ตอบรับ (ที่ใหม่)
                        </button>
                    </>
                );
            case 'company_accepted_generating_dispatch_letter':
                return (
                    <button type="button" onClick={() => openUpload(r, 'dispatch-letter', 'ออกหนังสือส่งตัวฉบับใหม่')} disabled={submitting} className={`${btn} bg-purple-700 hover:bg-purple-800 text-white`}>
                        <FileSignature style={{ width: 15, height: 15 }} /> ออกหนังสือส่งตัวใหม่
                    </button>
                );
            default:
                return <span className="text-xs text-slate-400">ไม่มีดำเนินการที่ต้องทำในขั้นตอนนี้</span>;
        }
    };

    const docLink = (url, label) => url ? (
        <a key={label} href={fileUrl(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 no-underline hover:text-violet-800 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-100">
            <FileText style={{ width: 13, height: 13 }} /> {label}
        </a>
    ) : null;

    const r = item;
    const avatarSrc = r?.student_avatar
        ? (/^https?:|^data:/.test(r.student_avatar) ? r.student_avatar : fileUrl(r.student_avatar))
        : '';
    const hasActions = r && ['advisor_approved_waiting_admin', 'admin_approved_generating_request_letter', 'waiting_company_acceptance', 'company_accepted_generating_dispatch_letter'].includes(r.status);

    return (
        <div className="admin-dashboard-container">
            <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24, display: 'block' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                    </button>
                    <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
                        <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
                        <span className="hidden sm:inline text-base md:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap ml-2" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>ระบบฝึกประสบการณ์วิชาชีพ</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <DateTimeIndicator />
                    <NotificationBell />
                    <UserProfileMenu />
                </div>
            </div>
            <AdminSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} currentPath="/admin-dashboard/relocations" handleLogout={handleLogout} />

            <main className="admin-main">
                <div className="max-w-4xl mx-auto w-full">
                    <Link to="/admin-dashboard/relocations" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 no-underline hover:text-violet-700 transition mb-4">
                        <ArrowLeft style={{ width: 14, height: 14 }} /> กลับไปหน้ารายการคำร้อง
                    </Link>

                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูล...
                        </div>
                    ) : notFound || !r ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                            <p className="text-slate-500 text-sm m-0">ไม่พบคำร้องขอเปลี่ยนสถานที่ฝึกงานหมายเลข #{id}</p>
                            <Link to="/admin-dashboard/relocations" className="text-xs font-semibold text-violet-600 no-underline hover:underline mt-2 inline-block">กลับไปหน้ารายการ</Link>
                        </div>
                    ) : (
                        <>
                            {/* Header: เลขคำร้อง + วันยื่น + สถานะ */}
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                                <div>
                                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 m-0">คำร้องขอเปลี่ยนสถานที่ฝึกงาน #{r.id}</h1>
                                    <p className="text-xs text-slate-400 m-0 mt-1">ยื่นเมื่อ {new Date(r.created_at).toLocaleString('th-TH')}</p>
                                </div>
                                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${statusColor(r.status)}`}>
                                    {RELOCATION_STATUS_LABEL[r.status] || r.status}
                                </span>
                            </div>

                            <div className="space-y-4 pb-24 md:pb-4">
                                {/* 1. ข้อมูลนักศึกษา */}
                                <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-slate-800 m-0 mb-3 flex items-center gap-2">
                                        <User style={{ width: 15, height: 15 }} className="text-violet-600" /> ข้อมูลนักศึกษา
                                    </h2>
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                            <InfoRow label="ชื่อ-นามสกุล">{r.studentName}</InfoRow>
                                            <InfoRow label="รหัสนักศึกษา">{r.student_id}</InfoRow>
                                            <InfoRow label="สาขาวิชา">{r.department}</InfoRow>
                                            <InfoRow label="ตำแหน่งที่ฝึก">{r.old_position}</InfoRow>
                                        </div>
                                        {/* รูปถ่ายนักศึกษา */}
                                        <div className="shrink-0 self-start">
                                            <div className={`w-[76px] h-[101px] sm:w-28 sm:h-[149px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center ${avatarSrc ? 'cursor-zoom-in hover:border-violet-300 transition' : ''}`}
                                                onClick={() => avatarSrc && setShowPhoto(true)}
                                                role={avatarSrc ? 'button' : undefined}
                                                aria-label={avatarSrc ? 'ขยายรูปนักศึกษา' : undefined}>
                                                {avatarSrc ? (
                                                    <img src={avatarSrc} alt={r.studentName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-slate-100 text-violet-400">
                                                        <User style={{ width: 26, height: 26 }} />
                                                        <span className="text-base font-bold mt-0.5">{(r.studentName || '').trim().charAt(0) || '?'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 2. เปรียบเทียบสถานที่เดิม vs ใหม่ */}
                                <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-slate-800 m-0 mb-3 flex items-center gap-2">
                                        <Building2 style={{ width: 15, height: 15 }} className="text-violet-600" /> เปรียบเทียบสถานที่ฝึกงาน
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide m-0">สถานที่เดิม</p>
                                            <p className="text-sm font-bold text-slate-800 m-0 mt-1">{r.old_company || '-'}</p>
                                            <p className="text-xs text-slate-500 m-0 mt-1.5">ฝึกสะสม {r.days_trained} วัน • คงเหลือ {r.days_remaining} วัน</p>
                                        </div>
                                        <div className="flex sm:flex-col items-center justify-center text-violet-500">
                                            <ArrowRight style={{ width: 20, height: 20 }} className="rotate-90 sm:rotate-0" />
                                        </div>
                                        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
                                            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide m-0">สถานที่ใหม่</p>
                                            <p className="text-sm font-bold text-violet-800 m-0 mt-1">{r.new_company_name}</p>
                                            <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                                                <p className="m-0 flex items-start gap-1.5"><MapPin style={{ width: 12, height: 12 }} className="shrink-0 mt-0.5 text-slate-400" />{r.new_company_address || '-'}</p>
                                                <p className="m-0">หัวหน้าหน่วยงาน: {r.mentor_name || r.new_company_contact || '-'}{r.mentor_position ? ` (${r.mentor_position})` : ''}</p>
                                                {r.mentor_phone && <p className="m-0">โทร: {r.mentor_phone}</p>}
                                                {r.mentor_email && <p className="m-0 break-all">อีเมล: {r.mentor_email}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 3. เหตุผล + ลายเซ็นนักศึกษา + เอกสาร */}
                                <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-slate-800 m-0 mb-3 flex items-center gap-2">
                                        <FileText style={{ width: 15, height: 15 }} className="text-violet-600" /> เหตุผลและเอกสารแนบ
                                    </h2>
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-sm text-slate-700 leading-relaxed">{r.reason || '-'}</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        {r.student_signature && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 m-0 mb-1">ลายเซ็นนักศึกษา</p>
                                                <img src={r.student_signature} alt="ลายเซ็นนักศึกษา" className="w-full h-20 object-contain bg-white rounded-xl border border-slate-200" />
                                            </div>
                                        )}
                                        <div className="flex flex-wrap content-start gap-2">
                                            {docLink(r.return_letter_file, 'หนังสือส่งตัวกลับ (บริษัทเดิม)')}
                                            {docLink(r.new_request_letter_file, 'หนังสือขอความอนุเคราะห์')}
                                            {docLink(r.new_acceptance_letter_file, 'ใบตอบรับ (บริษัทใหม่)')}
                                            {docLink(r.new_dispatch_letter_file, 'หนังสือส่งตัวฉบับใหม่')}
                                        </div>
                                    </div>
                                </section>

                                {/* 4. ประวัติการอนุมัติ / ลายเซ็นทุกฝ่าย */}
                                <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                                    <h2 className="text-sm font-bold text-slate-800 m-0 mb-3 flex items-center gap-2">
                                        <CheckCircle2 style={{ width: 15, height: 15 }} className="text-violet-600" /> ลำดับขั้นตอนและลายเซ็น
                                    </h2>
                                    <RelocationStepper status={r.status} />
                                    {(r.advisor_comment || r.admin_comment || r.company_signer_name) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                                            {r.company_signer_name && <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="font-semibold text-slate-500 m-0">ผู้ลงนามบริษัทเดิม</p><p className="text-slate-700 m-0 mt-0.5">{r.company_signer_name}{r.company_signer_position ? ` (${r.company_signer_position})` : ''}</p></div>}
                                            {r.advisor_comment && <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="font-semibold text-slate-500 m-0">หมายเหตุอาจารย์</p><p className="text-slate-700 m-0 mt-0.5">{r.advisor_comment}</p></div>}
                                            {r.admin_comment && <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="font-semibold text-slate-500 m-0">หมายเหตุคณบดี</p><p className="text-slate-700 m-0 mt-0.5">{r.admin_comment}</p></div>}
                                        </div>
                                    )}
                                    {(r.company_signature || r.advisor_signature || r.dean_signature) && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                                            {[
                                                [`บริษัท${r.company_signer_name ? ` (${r.company_signer_name})` : ''}`, r.company_signature],
                                                ['อาจารย์ที่ปรึกษา', r.advisor_signature],
                                                [`คณบดี${r.dean_decision ? ` (${r.dean_decision === 'allow' ? 'อนุญาต' : 'ไม่อนุญาต'})` : ''}`, r.dean_signature]
                                            ].filter(([, sig]) => sig).map(([label, sig]) => (
                                                <div key={label}>
                                                    <p className="text-[10px] font-semibold text-slate-400 m-0 mb-1 truncate">ลายเซ็น{label}</p>
                                                    <img src={sig} alt={label} className="w-full h-16 object-contain bg-white rounded-xl border border-slate-200" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* 5. Action — desktop inline / mobile sticky bottom */}
                                {hasActions && (
                                    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm sticky bottom-2 md:static z-10">
                                        <h2 className="text-sm font-bold text-slate-800 m-0 mb-3">ดำเนินการ</h2>
                                        <div className="flex flex-col sm:flex-row gap-2">{renderActions(r)}</div>
                                    </section>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Dialog เสนอคณบดีพิจารณา + ลงนาม */}
            <Dialog open={deanDialog.open} onClose={() => !submitting && setDeanDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="sm" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">เสนอคณบดีพิจารณา / ลงนาม</h3>
                    <p className="text-xs text-slate-500 mb-3 m-0">{deanDialog.item?.studentName} → {deanDialog.item?.new_company_name}</p>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 mb-3">
                        <p className="text-[10px] font-bold text-slate-500 mb-2">ลายเซ็นที่ผ่านการพิจารณาแล้ว</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                ['นักศึกษา', deanDialog.item?.student_signature],
                                [`บริษัท${deanDialog.item?.company_signer_name ? ` (${deanDialog.item.company_signer_name})` : ''}`, deanDialog.item?.company_signature],
                                ['อาจารย์ที่ปรึกษา', deanDialog.item?.advisor_signature]
                            ].filter(([, sig]) => sig).map(([label, sig]) => (
                                <div key={label}>
                                    <img src={sig} alt={label} className="w-full h-14 object-contain bg-white rounded-lg border border-slate-200" />
                                    <p className="text-[9px] text-slate-500 text-center mt-0.5 truncate">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 mb-3">
                        {[['allow', 'อนุญาตให้เปลี่ยน'], ['deny', 'ไม่อนุญาตให้เปลี่ยน']].map(([val, label]) => (
                            <button key={val} type="button" onClick={() => setDeanDialog((p) => ({ ...p, decision: val }))}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer transition ${deanDialog.decision === val
                                    ? val === 'allow' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="mb-3">
                        <p className="text-[11px] font-semibold text-slate-600 mb-1">ลายมือชื่อคณบดี / ผู้บันทึกแทน *</p>
                        <SignaturePad height={120} onChange={(d) => setDeanDialog((p) => ({ ...p, signature: d || '' }))} />
                    </div>
                    <TextField fullWidth size="small" label="หมายเหตุ (ไม่บังคับ)" value={deanDialog.comment}
                        onChange={(e) => setDeanDialog((p) => ({ ...p, comment: e.target.value }))} />

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setDeanDialog((p) => ({ ...p, open: false }))} disabled={submitting}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ยกเลิก</button>
                        <button type="button" onClick={submitDean} disabled={submitting || !deanDialog.signature}
                            className={`px-5 py-2 rounded-xl text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${deanDialog.decision === 'allow' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {deanDialog.decision === 'allow' ? 'ลงนามอนุญาต' : 'ลงนามไม่อนุญาต'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog แนบไฟล์แต่ละขั้น */}
            <Dialog open={uploadDialog.open} onClose={() => setUploadDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="xs" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">{uploadDialog.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 m-0">{uploadDialog.item?.studentName} → {uploadDialog.item?.new_company_name}</p>
                    <label className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition ${uploadDialog.dataUrl ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-violet-300'}`}>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                        {uploadDialog.dataUrl ? (
                            <><FileText style={{ width: 15, height: 15 }} className="text-emerald-600" /><span className="text-[11px] font-semibold text-emerald-700 truncate max-w-[240px]">{uploadDialog.fileName}</span></>
                        ) : (
                            <><Upload style={{ width: 15, height: 15 }} className="text-slate-400" /><span className="text-[11px] text-slate-500">แนบไฟล์ PDF/PNG/JPG ≤ 10MB</span></>
                        )}
                    </label>
                    {/* ช่วงวันฝึกงาน ณ ที่ใหม่ — บังคับก่อนออกหนังสือขอความอนุเคราะห์/ส่งตัว */}
                    {NEEDS_DATES.includes(uploadDialog.endpoint) && (
                        <div className="mt-3 rounded-xl bg-violet-50/60 border border-violet-100 p-3 space-y-2.5">
                            <p className="text-[11px] font-bold text-violet-700 m-0">กำหนดช่วงวันฝึกงาน ณ สถานประกอบการใหม่ <span className="text-rose-500">*</span></p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <TextField fullWidth size="small" type="date" label="วันที่เริ่มฝึกงาน" required
                                    InputLabelProps={{ shrink: true }}
                                    value={uploadDialog.startDate}
                                    onChange={(e) => setUploadDialog((p) => ({ ...p, startDate: e.target.value }))} />
                                <TextField fullWidth size="small" type="date" label="วันที่สิ้นสุดการฝึกงาน" required
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: uploadDialog.startDate || undefined }}
                                    value={uploadDialog.endDate}
                                    onChange={(e) => setUploadDialog((p) => ({ ...p, endDate: e.target.value }))} />
                            </div>
                            {uploadDialog.startDate && uploadDialog.endDate && uploadDialog.endDate >= uploadDialog.startDate && (
                                <p className="text-[11px] text-violet-700 m-0 leading-relaxed">
                                    รวม <strong>{countWorkDays(uploadDialog.startDate, uploadDialog.endDate)} วันทำการ</strong>
                                    {' '}(จันทร์–เสาร์) ≈ <strong>{countWorkDays(uploadDialog.startDate, uploadDialog.endDate) * 8} ชั่วโมง</strong>
                                </p>
                            )}
                            {uploadDialog.startDate && uploadDialog.endDate && uploadDialog.endDate < uploadDialog.startDate && (
                                <p className="text-[11px] text-rose-600 font-semibold m-0">วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น</p>
                            )}
                        </div>
                    )}
                    <div className="mt-3">
                        <TextField fullWidth size="small" label="หมายเหตุ (ไม่บังคับ)" value={uploadDialog.comment}
                            onChange={(e) => setUploadDialog((p) => ({ ...p, comment: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setUploadDialog((p) => ({ ...p, open: false }))}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ยกเลิก</button>
                        <button type="button" onClick={submitUpload} disabled={submitting || !uploadDialog.dataUrl}
                            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            ยืนยัน
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog ตีกลับ */}
            <Dialog open={rejectDialog.open} onClose={() => setRejectDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="xs" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-3">ตีกลับคำร้อง — ระบุเหตุผล</h3>
                    <TextField fullWidth multiline minRows={3} size="small" label="เหตุผล *" value={rejectDialog.comment}
                        onChange={(e) => setRejectDialog((p) => ({ ...p, comment: e.target.value }))} />
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setRejectDialog((p) => ({ ...p, open: false }))}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ยกเลิก</button>
                        <button type="button" onClick={adminReject} disabled={submitting}
                            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}ยืนยันตีกลับ
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog ลิงก์ + QR ให้คณบดีลงนาม */}
            <Dialog open={deanQr.open} onClose={() => setDeanQr({ open: false, link: '', copied: false })} fullWidth maxWidth="xs" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1 text-center">ลิงก์และ QR Code สำหรับการยินยอม/ลงนาม</h3>
                    <p className="text-xs text-slate-500 mb-3 m-0 text-center">
                        {item?.studentName}
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                            {deanQr.kind === 'acceptance'
                                ? 'ส่งลิงก์ให้สถานประกอบการใหม่เปิดเพื่ออ่านหนังสือและลงนามตอบรับนักศึกษา'
                                : 'ให้คณบดี/ผู้มีอำนาจลงนามเปิดลิงก์เพื่อพิจารณาอนุญาตการเปลี่ยนแหล่งฝึก'}
                        </span>
                    </p>
                    <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                            <QRCodeCanvas id="relocation-dean-qr-canvas" value={deanQr.link} size={170} level="H" marginSize={1} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="flex-1 text-[11px] text-slate-500 truncate m-0">{deanQr.link}</p>
                        <button type="button" aria-label="คัดลอกลิงก์" onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(deanQr.link);
                                setDeanQr((p) => ({ ...p, copied: true }));
                                setTimeout(() => setDeanQr((p) => ({ ...p, copied: false })), 2500);
                            } catch { setToast({ open: true, message: 'ไม่สามารถคัดลอกลิงก์ได้', severity: 'error' }); }
                        }} className={`shrink-0 p-1.5 rounded-lg transition cursor-pointer border-none ${deanQr.copied ? 'text-emerald-500 bg-emerald-50' : 'text-violet-600 hover:bg-violet-50 bg-transparent'}`}>
                            {deanQr.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-2 mb-0">
                        {deanQr.kind === 'acceptance'
                            ? 'ลิงก์ใช้งานได้ครั้งเดียว — เมื่อสถานประกอบการตอบรับแล้วจะใช้ซ้ำไม่ได้'
                            : 'ลิงก์ใช้งานได้ครั้งเดียว — เมื่อคณบดีลงนามพิจารณาแล้วจะใช้ซ้ำไม่ได้'}
                    </p>
                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={() => {
                            const canvas = document.getElementById('relocation-dean-qr-canvas');
                            if (!canvas) return;
                            const a = document.createElement('a');
                            a.href = canvas.toDataURL('image/png');
                            a.download = `relocation-dean-qr-${item?.id}.png`;
                            a.click();
                        }} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold border-0 cursor-pointer flex items-center justify-center gap-1.5">
                            <Download className="w-3.5 h-3.5" /> ดาวน์โหลด QR Code
                        </button>
                        <button type="button" onClick={() => setDeanQr({ open: false, link: '', copied: false })}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ปิด</button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox ดูรูปนักศึกษาขยาย */}
            {showPhoto && avatarSrc && (
                <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setShowPhoto(false)}>
                    <div className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800 max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
                        <img src={avatarSrc} alt={r.studentName} className="max-h-[75vh] w-auto object-contain block" />
                        <p className="text-center text-[11px] text-slate-300 py-2 m-0 bg-slate-900/60">{r.studentName} • {r.student_id}</p>
                    </div>
                </div>
            )}

            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setToast((p) => ({ ...p, open: false }))} severity={toast.severity} variant="filled">{toast.message}</Alert>
            </Snackbar>
        </div>
    );
};

export default AdminRelocationDetailPage;
