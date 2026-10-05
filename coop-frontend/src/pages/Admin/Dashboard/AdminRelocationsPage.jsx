import { useEffect, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import {
    Alert, Box, Dialog, DialogContent, Menu, MenuItem, Paper, Snackbar, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
} from '@mui/material';
import { Calendar, Check, CheckCircle2, Copy, Download, Eye, FileText, FileSignature, FileCheck, Loader2, MoreVertical, QrCode, Upload, XCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import './AdminDashboardPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import RelocationStepper, { RELOCATION_STATUS_LABEL, RelocationDots } from '../../../components/RelocationStepper';
import SignaturePad from '../../../components/SignaturePad';
import { getUploadUrl } from '../../../utils/fileUrl';

const fileUrl = getUploadUrl;

// dialog แนบไฟล์ทีละขั้น: request-letter / acceptance / dispatch-letter
const AdminRelocationsPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [rows, setRows] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [uploadDialog, setUploadDialog] = useState({ open: false, item: null, endpoint: '', title: '', fileName: '', dataUrl: '', comment: '', startDate: '', endDate: '' });
    const [datesDialog, setDatesDialog] = useState({ open: false, item: null, startDate: '', endDate: '' });
    const [rejectDialog, setRejectDialog] = useState({ open: false, item: null, comment: '' });
    const [deanDialog, setDeanDialog] = useState({ open: false, item: null, decision: 'allow', signature: '', comment: '' });
    const [menuAnchor, setMenuAnchor] = useState({ el: null, row: null });
    const [qrModal, setQrModal] = useState({ open: false, row: null, link: '', copied: false });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    const load = () => {
        api.get('/relocations').then((res) => setRows(res.data?.data || [])).catch(() => {});
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') { navigate('/dashboard'); return; }
        load();
    }, [navigate]);

    const handleLogout = () => { localStorage.removeItem('user'); navigate('/'); };

    const callApi = async (method, url, body, okMsg) => {
        setSubmitting(true);
        try {
            const res = await api[method](url, body);
            if (okMsg) setToast({ open: true, message: okMsg, severity: 'success' });
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
        const { item, decision, signature, comment } = deanDialog;
        if (!signature) {
            setToast({ open: true, message: 'กรุณาลงลายมือชื่อดิจิทัล (คณบดี/ผู้บันทึกแทน)', severity: 'warning' });
            return;
        }
        const ok = await callApi('patch', `/relocations/${item.id}/admin-approve`,
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

    const openUpload = (item, endpoint, title) =>
        setUploadDialog({
            open: true, item, endpoint, title, fileName: '', dataUrl: '', comment: '',
            startDate: toISODate(item.new_start_date), endDate: toISODate(item.new_end_date)
        });

    const openDatesDialog = (r) =>
        setDatesDialog({ open: true, item: r, startDate: toISODate(r.new_start_date), endDate: toISODate(r.new_end_date) });

    const submitDates = async () => {
        const { item, startDate, endDate } = datesDialog;
        if (!startDate || !endDate) {
            setToast({ open: true, message: 'กรุณาระบุวันที่เริ่มและสิ้นสุดการฝึกงานให้ครบถ้วน', severity: 'warning' }); return;
        }
        if (endDate < startDate) {
            setToast({ open: true, message: 'วันสิ้นสุดการฝึกงานต้องไม่ก่อนวันเริ่มต้น', severity: 'warning' }); return;
        }
        const ok = await callApi('patch', `/relocations/${item.id}/training-dates`,
            { new_start_date: startDate, new_end_date: endDate }, 'บันทึกช่วงวันฝึกงานแล้ว');
        if (ok) setDatesDialog({ open: false, item: null, startDate: '', endDate: '' });
    };

    // QR ลิงก์ยินยอมบริษัทเดิม — token มีอยู่ใน row อยู่แล้ว (one-time)
    const openQr = (r) => {
        const link = r.company_token
            ? `${window.location.origin}/coop/public/relocation-approval/${r.company_token}`
            : '';
        setQrModal({ open: true, row: r, link, copied: false, kind: 'company' });
    };

    // QR ลิงก์ให้คณบดีลงนามพิจารณา — ขอ token จาก backend (one-time, ใช้ซ้ำได้จนกว่าจะเซ็น)
    const openDeanQr = async (r) => {
        try {
            const res = await api.post(`/relocations/${r.id}/dean-link`);
            const token = res?.data?.data?.token;
            if (!token) return;
            setQrModal({
                open: true, row: r, copied: false, kind: 'dean',
                link: `${window.location.origin}/coop/public/relocation-dean/${token}`
            });
        } catch (e) {
            setToast({ open: true, message: e.response?.data?.message || 'สร้างลิงก์คณบดีไม่สำเร็จ', severity: 'error' });
        }
    };

    const copyQrLink = async () => {
        try {
            await navigator.clipboard.writeText(qrModal.link);
            setQrModal((p) => ({ ...p, copied: true }));
            setTimeout(() => setQrModal((p) => ({ ...p, copied: false })), 2500);
        } catch {
            setToast({ open: true, message: 'ไม่สามารถคัดลอกลิงก์ได้', severity: 'error' });
        }
    };

    const downloadQrPng = () => {
        const canvas = document.getElementById('relocation-qr-canvas');
        if (!canvas) return;
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `relocation-approval-qr-${qrModal.row?.id}.png`;
        a.click();
    };

    // ลิงก์/QR สถานประกอบการใหม่ตอบรับ — เปิดดูซ้ำได้จนกว่าบริษัทจะตอบ
    const openAcceptanceQr = async (r) => {
        try {
            const res = await api.get(`/relocations/${r.id}/acceptance-link`);
            const token = res?.data?.data?.token;
            if (!token) return;
            setQrModal({
                open: true, row: r, copied: false, kind: 'acceptance',
                link: `${window.location.origin}/coop/public/company-acceptance/${token}`
            });
        } catch (e) {
            setToast({ open: true, message: e.response?.data?.message || 'สร้างลิงก์ตอบรับไม่สำเร็จ', severity: 'error' });
        }
    };

    const submitUpload = async () => {
        const { item, endpoint, fileName, dataUrl, comment, startDate, endDate } = uploadDialog;
        if (!dataUrl) { setToast({ open: true, message: 'กรุณาแนบไฟล์เอกสาร (PDF/PNG/JPG ≤10MB)', severity: 'warning' }); return; }
        const needsDates = NEEDS_DATES.includes(endpoint);
        const datesReady = (startDate && endDate) || (item.new_start_date && item.new_end_date);
        if (needsDates && !datesReady) {
            setToast({ open: true, message: 'กรุณาระบุวันที่เริ่มฝึกงานและวันที่สิ้นสุด ณ สถานประกอบการใหม่', severity: 'warning' }); return;
        }
        if (needsDates && startDate && endDate && endDate < startDate) {
            setToast({ open: true, message: 'วันสิ้นสุดการฝึกงานต้องไม่ก่อนวันเริ่มต้น', severity: 'warning' }); return;
        }
        const res = await callApi('patch', `/relocations/${item.id}/${endpoint}`,
            { file_name: fileName, file_data_url: dataUrl, comment,
              ...(needsDates && startDate && endDate ? { new_start_date: startDate, new_end_date: endDate } : {}) },
            `${uploadDialog.title} เรียบร้อย`);
        if (res) {
            setUploadDialog({ open: false, item: null, endpoint: '', title: '', fileName: '', dataUrl: '', comment: '', startDate: '', endDate: '' });
            // หลังออกหนังสือขอความอนุเคราะห์ → เด้ง QR ลิงก์ตอบรับของที่ใหม่ทันที
            const token = res?.data?.acceptance_token;
            if (endpoint === 'request-letter' && token) {
                setQrModal({
                    open: true, row: item, copied: false, kind: 'acceptance',
                    link: `${window.location.origin}/coop/public/company-acceptance/${token}`
                });
            }
        }
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

    const statusColor = (status) =>
        status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200/60'
        : status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
        : 'bg-violet-50 text-violet-600 border-violet-200/60';

    // ปุ่ม action ตามสถานะ step-by-step (mobile = ปุ่มใหญ่เต็มแถวกดง่าย)
    const renderActions = (r, mobile = false) => {
        const btn = `inline-flex items-center gap-1 rounded-lg font-bold border-0 cursor-pointer transition ${mobile ? 'flex-1 justify-center px-3 py-2.5 text-xs' : 'px-2.5 py-1.5 text-[11px]'}`;
        switch (r.status) {
            case 'advisor_approved_waiting_admin':
                return (
                    <div className={mobile ? 'flex gap-2 flex-1' : 'flex gap-1.5 flex-wrap'}>
                        <button type="button" onClick={() => setDeanDialog({ open: true, item: r, decision: 'allow', signature: '', comment: '' })} disabled={submitting} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}>
                            <CheckCircle2 style={{ width: 12, height: 12 }} /> เสนอคณบดีพิจารณา
                        </button>
                        <button type="button" onClick={() => setRejectDialog({ open: true, item: r, comment: '' })} className={`${btn} bg-red-50 hover:bg-red-100 text-red-600 border !border-red-200`}>
                            <XCircle style={{ width: 12, height: 12 }} /> ตีกลับ
                        </button>
                    </div>
                );
            case 'admin_approved_generating_request_letter':
                return (
                    <button type="button" onClick={() => openUpload(r, 'request-letter', 'ออกหนังสือขอความอนุเคราะห์ (ที่ใหม่)')} className={`${btn} bg-violet-600 hover:bg-violet-700 text-white`}>
                        <FileSignature style={{ width: 12, height: 12 }} /> ออกหนังสือขอความอนุเคราะห์
                    </button>
                );
            case 'waiting_company_acceptance':
                return (
                    <button type="button" onClick={() => openUpload(r, 'acceptance', 'บันทึกการตอบรับจากสถานประกอบการใหม่')} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}>
                        <FileCheck style={{ width: 12, height: 12 }} /> บันทึกการตอบรับ
                    </button>
                );
            case 'company_accepted_generating_dispatch_letter':
                return (
                    <button type="button" onClick={() => openUpload(r, 'dispatch-letter', 'ออกหนังสือส่งตัวฉบับใหม่')} className={`${btn} bg-purple-700 hover:bg-purple-800 text-white`}>
                        <FileSignature style={{ width: 12, height: 12 }} /> ออกหนังสือส่งตัวใหม่
                    </button>
                );
            default:
                return <span className="text-[11px] text-slate-400">—</span>;
        }
    };

    // รายละเอียดเมื่อกดขยาย — ใช้ร่วมกันทั้งแถว table (desktop) และการ์ด (mobile)
    const renderDetail = (r) => (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 text-xs">
                <div><span className="font-semibold text-slate-500">เหตุผล:</span> <span className="text-slate-700">{r.reason}</span></div>
                <div><span className="font-semibold text-slate-500">ที่อยู่ใหม่:</span> <span className="text-slate-700">{r.new_company_address}</span></div>
                <div><span className="font-semibold text-slate-500">หัวหน้าหน่วยงาน/ผู้ดูแล:</span> <span className="text-slate-700">{r.mentor_name || r.new_company_contact}{r.mentor_position ? ` (${r.mentor_position})` : ''}</span></div>
                {r.mentor_email && <div><span className="font-semibold text-slate-500">อีเมลหัวหน้าหน่วยงาน:</span> <span className="text-slate-700">{r.mentor_email}</span></div>}
                {r.mentor_phone && <div><span className="font-semibold text-slate-500">โทร.หัวหน้าหน่วยงาน:</span> <span className="text-slate-700">{r.mentor_phone}</span></div>}
                <div><span className="font-semibold text-slate-500">ยื่นเมื่อ:</span> <span className="text-slate-700">{new Date(r.created_at).toLocaleString('th-TH')}</span></div>
                {r.advisor_comment && <div><span className="font-semibold text-slate-500">อาจารย์:</span> <span className="text-slate-700">{r.advisor_comment}</span></div>}
                {r.admin_comment && <div><span className="font-semibold text-slate-500">คณบดี:</span> <span className="text-slate-700">{r.admin_comment}</span></div>}
                {r.company_signer_name && <div><span className="font-semibold text-slate-500">ผู้ลงนามบริษัท:</span> <span className="text-slate-700">{r.company_signer_name}{r.company_signer_position ? ` (${r.company_signer_position})` : ''}</span></div>}
            </div>
            {/* ลายเซ็นดิจิทัลทุกฝ่าย */}
            {(r.student_signature || r.company_signature || r.advisor_signature || r.dean_signature) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pb-1">
                    {[
                        ['นักศึกษา', r.student_signature],
                        [`บริษัท${r.company_signer_name ? ` (${r.company_signer_name})` : ''}`, r.company_signature],
                        ['อาจารย์ที่ปรึกษา', r.advisor_signature],
                        [`คณบดี${r.dean_decision ? ` (${r.dean_decision === 'allow' ? 'อนุญาต' : 'ไม่อนุญาต'})` : ''}`, r.dean_signature]
                    ].filter(([, sig]) => sig).map(([label, sig]) => (
                        <div key={label}>
                            <p className="text-[10px] font-semibold text-slate-500 mb-0.5 truncate">ลายเซ็น{label}</p>
                            <img src={sig} alt={label} className="w-full h-12 object-contain bg-white rounded-lg border border-slate-200" />
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const docLink = (url, label) => url ? (
        <a key={label} href={fileUrl(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 no-underline hover:text-violet-800">
            <FileText style={{ width: 12, height: 12 }} /> {label}
        </a>
    ) : null;

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
                <header className="admin-header">
                    <div>
                        <h1 className="!text-xl sm:!text-2xl">คำร้องขอเปลี่ยนสถานที่ฝึกงาน</h1>
                        <p className="!text-xs sm:!text-sm text-slate-500 leading-relaxed break-words">ดำเนินการทีละขั้น: อนุมัติ → ออกหนังสือขอความอนุเคราะห์ → บันทึกตอบรับ → ออกหนังสือส่งตัวใหม่</p>
                    </div>
                </header>

                <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
                    <div className="section-header"><h2 className="!text-base sm:!text-xl">รายการคำร้อง ({rows.length})</h2></div>

                    {/* Desktop: table เดิม */}
                    <TableContainer
                        component={Box}
                        className="compact-table hidden md:block"
                        sx={{
                            // จอเล็ก (1024-1366): ตารางกระชับเต็มกรอบ ไม่ดันล้น — cell padding เล็กลง
                            '& table': { width: '100%', tableLayout: 'auto' },
                            '& .MuiTableCell-root': { px: 1.5, py: 1.5 },
                        }}
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>นักศึกษา</TableCell>
                                    <TableCell>ย้ายจาก → ไป</TableCell>
                                    <TableCell>เอกสารแนบ</TableCell>
                                    <TableCell>ความคืบหน้า</TableCell>
                                    <TableCell>สถานะ</TableCell>
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.length > 0 ? rows.map((r) => (
                                    <Fragment key={r.id}>
                                        <TableRow hover onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} sx={{ cursor: 'pointer' }}>
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 text-sm">{r.studentName || r.student_id}</div>
                                                <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{r.student_id} • {r.department}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs text-slate-600">{r.old_company || '-'}</div>
                                                <div className="text-xs font-semibold text-violet-700">→ {r.new_company_name}</div>
                                                <div className="text-[11px] text-slate-400">ฝึกแล้ว {r.days_trained} / เหลือ {r.days_remaining} วัน</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {docLink(r.return_letter_file, 'ส่งตัวกลับ')}
                                                    {docLink(r.new_request_letter_file, 'ขอความอนุเคราะห์')}
                                                    {docLink(r.new_acceptance_letter_file, 'ใบตอบรับ')}
                                                    {docLink(r.new_dispatch_letter_file, 'ส่งตัวใหม่')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <RelocationDots status={r.status} />
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${statusColor(r.status)}`}>
                                                    {RELOCATION_STATUS_LABEL[r.status] || r.status}
                                                </span>
                                            </TableCell>
                                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    aria-label="เมนูจัดการคำร้อง"
                                                    onClick={(e) => { e.stopPropagation(); setMenuAnchor({ el: e.currentTarget, row: r }); }}
                                                    className="p-1.5 rounded-lg border-0 bg-transparent cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                                                >
                                                    <MoreVertical style={{ width: 16, height: 16 }} />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedId === r.id && (
                                            <TableRow key={`${r.id}-detail`}>
                                                <TableCell colSpan={6} sx={{ bgcolor: '#f8fafc' }}>
                                                    {renderDetail(r)}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                )) : (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>ไม่มีคำร้องขอเปลี่ยนสถานที่ฝึกงาน</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Mobile: stacked cards — ไม่มี scroll แนวนอน */}
                    <div className="block md:hidden">
                        {rows.length > 0 ? rows.map((r) => (
                            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3 mb-3">
                                {/* header: ชื่อ + status badge */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 text-base leading-snug m-0 break-words">{r.studentName || r.student_id}</p>
                                        <p className="text-xs text-slate-500 m-0 mt-0.5">{r.student_id} • {r.department}</p>
                                    </div>
                                    <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor(r.status)}`}>
                                        {RELOCATION_STATUS_LABEL[r.status] || r.status}
                                    </span>
                                </div>

                                {/* เส้นทางย้าย: เดิม → ใหม่ + วันฝึก */}
                                <div className="rounded-xl bg-violet-50/60 border border-violet-100 px-3 py-2.5">
                                    <p className="text-[11px] text-slate-500 m-0">สถานที่เดิม: <span className="font-semibold text-slate-700">{r.old_company || '-'}</span></p>
                                    <p className="text-[11px] text-slate-500 m-0 mt-1">สถานที่ใหม่: <span className="font-bold text-violet-700">{r.new_company_name}</span></p>
                                    <p className="text-[10px] text-slate-400 m-0 mt-1.5">ฝึกแล้ว {r.days_trained} วัน • คงเหลือ {r.days_remaining} วัน</p>
                                </div>

                                {/* ความคืบหน้า (stepper แนวตั้งบนมือถือ) */}
                                <RelocationStepper status={r.status} />

                                {/* เอกสารแนบ */}
                                {(r.return_letter_file || r.new_request_letter_file || r.new_acceptance_letter_file || r.new_dispatch_letter_file) && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        {docLink(r.return_letter_file, 'ส่งตัวกลับ')}
                                        {docLink(r.new_request_letter_file, 'ขอความอนุเคราะห์')}
                                        {docLink(r.new_acceptance_letter_file, 'ใบตอบรับ')}
                                        {docLink(r.new_dispatch_letter_file, 'ส่งตัวใหม่')}
                                    </div>
                                )}

                                {/* action buttons — เต็มความกว้าง กดง่ายด้วยนิ้ว */}
                                <div className="flex gap-2 pt-1">
                                    {renderActions(r, true)}
                                    <button type="button" onClick={() => navigate(`/admin-dashboard/relocations/${r.id}`)}
                                        className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 bg-white cursor-pointer transition hover:bg-slate-50 shrink-0">
                                        ดูรายละเอียด
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-sm text-slate-400">ไม่มีคำร้องขอเปลี่ยนสถานที่ฝึกงาน</div>
                        )}
                    </div>
                </Paper>
            </main>

            {/* Dialog เสนอคณบดีพิจารณา + ลงนาม */}
            <Dialog open={deanDialog.open} onClose={() => !submitting && setDeanDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="sm" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">เสนอคณบดีพิจารณา / ลงนาม</h3>
                    <p className="text-xs text-slate-500 mb-3 m-0">{deanDialog.item?.studentName} → {deanDialog.item?.new_company_name}</p>

                    {/* ลายเซ็นที่ผ่านมาทั้งหมด (บันทึกข้อความจำลอง) */}
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

                    {/* ผลพิจารณา */}
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
                    {/* ช่วงวันฝึกงาน ณ ที่ใหม่ — บังคับก่อนออกหนังสือขอความอนุเคราะห์/ส่งตัว */}
                    {NEEDS_DATES.includes(uploadDialog.endpoint) && (
                        <div className="mb-3 rounded-xl bg-violet-50/60 border border-violet-100 p-3 space-y-2.5">
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
                    <label className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition ${uploadDialog.dataUrl ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-violet-300'}`}>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                        {uploadDialog.dataUrl ? (
                            <><FileText style={{ width: 15, height: 15 }} className="text-emerald-600" /><span className="text-[11px] font-semibold text-emerald-700 truncate max-w-[240px]">{uploadDialog.fileName}</span></>
                        ) : (
                            <><Upload style={{ width: 15, height: 15 }} className="text-slate-400" /><span className="text-[11px] text-slate-500">แนบไฟล์ PDF/PNG/JPG ≤ 10MB</span></>
                        )}
                    </label>
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

            {/* Dialog กำหนดช่วงวันฝึกงาน ณ สถานประกอบการใหม่ */}
            <Dialog open={datesDialog.open} onClose={() => setDatesDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="xs" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">กำหนดช่วงวันฝึกงาน (ที่ใหม่)</h3>
                    <p className="text-xs text-slate-500 mb-3 m-0">{datesDialog.item?.studentName} → {datesDialog.item?.new_company_name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <TextField fullWidth size="small" type="date" label="วันที่เริ่มฝึกงาน ณ ที่ใหม่" required autoFocus
                            InputLabelProps={{ shrink: true }}
                            value={datesDialog.startDate}
                            onChange={(e) => setDatesDialog((p) => ({ ...p, startDate: e.target.value }))} />
                        <TextField fullWidth size="small" type="date" label="วันที่สิ้นสุดการฝึกงาน" required
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: datesDialog.startDate || undefined }}
                            value={datesDialog.endDate}
                            onChange={(e) => setDatesDialog((p) => ({ ...p, endDate: e.target.value }))} />
                    </div>
                    {datesDialog.startDate && datesDialog.endDate && datesDialog.endDate >= datesDialog.startDate && (
                        <div className="mt-3 rounded-xl bg-violet-50/60 border border-violet-100 px-3 py-2.5">
                            <p className="text-[11px] text-violet-700 m-0 leading-relaxed">
                                รวม <strong>{countWorkDays(datesDialog.startDate, datesDialog.endDate)} วันทำการ</strong>
                                {' '}(จันทร์–เสาร์) ≈ <strong>{countWorkDays(datesDialog.startDate, datesDialog.endDate) * 8} ชั่วโมง</strong>
                            </p>
                        </div>
                    )}
                    {datesDialog.startDate && datesDialog.endDate && datesDialog.endDate < datesDialog.startDate && (
                        <p className="text-[11px] text-rose-600 font-semibold m-0 mt-2">วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น</p>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setDatesDialog((p) => ({ ...p, open: false }))}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ยกเลิก</button>
                        <button type="button" onClick={submitDates}
                            disabled={submitting || !datesDialog.startDate || !datesDialog.endDate || datesDialog.endDate < datesDialog.startDate}
                            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}บันทึกวันฝึกงาน
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

            {/* เมนูสามจุด — action ต่อแถวบน desktop */}
            <Menu
                anchorEl={menuAnchor.el}
                open={Boolean(menuAnchor.el)}
                onClose={() => setMenuAnchor({ el: null, row: null })}
                PaperProps={{ className: '!rounded-xl !shadow-lg !border !border-slate-100', sx: { minWidth: 230, mt: 0.5 } }}
            >
                <MenuItem
                    sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1 }}
                    onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && navigate(`/admin-dashboard/relocations/${r.id}`); }}
                >
                    <Eye style={{ width: 14, height: 14 }} className="text-slate-500" /> ดูรายละเอียด
                </MenuItem>
                {menuAnchor.row?.company_token && (
                    <MenuItem
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1 }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openQr(r); }}
                    >
                        <QrCode style={{ width: 14, height: 14 }} className="text-violet-500" /> สร้างลิงก์ / QR Code ยินยอม
                    </MenuItem>
                )}
                {menuAnchor.row?.status === 'advisor_approved_waiting_admin' && [
                    <MenuItem
                        key="dean"
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#059669' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && setDeanDialog({ open: true, item: r, decision: 'allow', signature: '', comment: '' }); }}
                    >
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> เสนอคณบดีพิจารณา
                    </MenuItem>,
                    <MenuItem
                        key="dean-qr"
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#7c3aed' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openDeanQr(r); }}
                    >
                        <QrCode style={{ width: 14, height: 14 }} /> ลิงก์/QR ให้คณบดีลงนาม
                    </MenuItem>,
                    <MenuItem
                        key="reject"
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#dc2626' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && setRejectDialog({ open: true, item: r, comment: '' }); }}
                    >
                        <XCircle style={{ width: 14, height: 14 }} /> ตีกลับคำร้อง
                    </MenuItem>
                ]}
                {menuAnchor.row?.status === 'admin_approved_generating_request_letter' && (
                    <MenuItem
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#7c3aed' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openUpload(r, 'request-letter', 'ออกหนังสือขอความอนุเคราะห์ (ที่ใหม่)'); }}
                    >
                        <FileSignature style={{ width: 14, height: 14 }} /> ออกหนังสือขอความอนุเคราะห์
                    </MenuItem>
                )}
                {menuAnchor.row?.status === 'waiting_company_acceptance' && [
                    <MenuItem
                        key="acceptance-qr"
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#7c3aed' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openAcceptanceQr(r); }}
                    >
                        <QrCode style={{ width: 14, height: 14 }} /> ลิงก์/QR ให้ที่ใหม่ตอบรับ
                    </MenuItem>,
                    <MenuItem
                        key="acceptance-upload"
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#2563eb' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openUpload(r, 'acceptance', 'บันทึกการตอบรับจากสถานประกอบการใหม่'); }}
                    >
                        <FileCheck style={{ width: 14, height: 14 }} /> บันทึกการตอบรับ
                    </MenuItem>
                ]}
                {['admin_approved_generating_request_letter', 'waiting_company_acceptance', 'company_accepted_generating_dispatch_letter'].includes(menuAnchor.row?.status) && (
                    <MenuItem
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#0284c7' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openDatesDialog(r); }}
                    >
                        <Calendar style={{ width: 14, height: 14 }} /> กำหนดวันฝึกงาน (ที่ใหม่)
                    </MenuItem>
                )}
                {menuAnchor.row?.status === 'company_accepted_generating_dispatch_letter' && (
                    <MenuItem
                        sx={{ fontSize: '0.8rem', fontWeight: 600, gap: 1, color: '#7e22ce' }}
                        onClick={() => { const r = menuAnchor.row; setMenuAnchor({ el: null, row: null }); r && openUpload(r, 'dispatch-letter', 'ออกหนังสือส่งตัวฉบับใหม่'); }}
                    >
                        <FileSignature style={{ width: 14, height: 14 }} /> ออกหนังสือส่งตัวใหม่
                    </MenuItem>
                )}
            </Menu>

            {/* Dialog ลิงก์ + QR Code ยินยอมบริษัทเดิม */}
            <Dialog open={qrModal.open} onClose={() => setQrModal({ open: false, row: null, link: '', copied: false })} fullWidth maxWidth="xs" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1 text-center">ลิงก์และ QR Code สำหรับการยินยอม/ลงนาม</h3>
                    <p className="text-xs text-slate-500 mb-3 m-0 text-center">
                        {qrModal.row?.studentName}
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                            {qrModal.kind === 'dean'
                                ? 'ให้คณบดี/ผู้มีอำนาจลงนามเปิดลิงก์เพื่อพิจารณาอนุญาตการเปลี่ยนแหล่งฝึก'
                                : qrModal.kind === 'acceptance'
                                    ? 'ส่งลิงก์ให้สถานประกอบการใหม่เปิดเพื่ออ่านหนังสือและลงนามตอบรับนักศึกษา'
                                    : 'ให้สถานประกอบการเดิมลงนามยินยอมการเปลี่ยนแหล่งฝึก'}
                        </span>
                    </p>
                    {qrModal.link ? (
                        <>
                            <div className="flex justify-center">
                                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <QRCodeCanvas id="relocation-qr-canvas" value={qrModal.link} size={170} level="H" marginSize={1} />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="flex-1 text-[11px] text-slate-500 truncate m-0">{qrModal.link}</p>
                                <button type="button" onClick={copyQrLink} aria-label="คัดลอกลิงก์"
                                    className={`shrink-0 p-1.5 rounded-lg transition cursor-pointer border-none ${qrModal.copied ? 'text-emerald-500 bg-emerald-50' : 'text-violet-600 hover:bg-violet-50 bg-transparent'}`}>
                                    {qrModal.copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 text-center mt-2 mb-0">
                                {qrModal.kind === 'dean'
                                    ? 'ลิงก์ใช้งานได้ครั้งเดียว — เมื่อคณบดีลงนามพิจารณาแล้วจะใช้ซ้ำไม่ได้'
                                    : 'ลิงก์ใช้งานได้ครั้งเดียว — เมื่อบริษัทลงนาม/ตอบรับแล้วจะใช้ซ้ำไม่ได้'}
                            </p>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={downloadQrPng}
                                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold border-0 cursor-pointer flex items-center justify-center gap-1.5">
                                    <Download className="w-3.5 h-3.5" /> ดาวน์โหลด QR Code
                                </button>
                                <button type="button" onClick={() => setQrModal({ open: false, row: null, link: '', copied: false })}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ปิด</button>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-400 text-center m-0 py-6">คำร้องนี้ไม่มีลิงก์ที่ใช้งานได้ (โทเค็นถูกใช้ไปแล้วหรือผ่านขั้นนี้แล้ว)</p>
                    )}
                </DialogContent>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setToast((p) => ({ ...p, open: false }))} severity={toast.severity} variant="filled">{toast.message}</Alert>
            </Snackbar>
        </div>
    );
};

export default AdminRelocationsPage;
