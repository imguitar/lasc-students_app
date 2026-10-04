import { useEffect, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import {
    Alert, Box, Dialog, DialogContent, Paper, Snackbar, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
} from '@mui/material';
import { CheckCircle2, FileText, FileSignature, FileCheck, Loader2, Upload, XCircle } from 'lucide-react';
import './AdminDashboardPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import RelocationStepper, { RELOCATION_STATUS_LABEL } from '../../../components/RelocationStepper';
import SignaturePad from '../../../components/SignaturePad';
import { getUploadUrl } from '../../../utils/fileUrl';

const fileUrl = getUploadUrl;

// dialog แนบไฟล์ทีละขั้น: request-letter / acceptance / dispatch-letter
const AdminRelocationsPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [rows, setRows] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [uploadDialog, setUploadDialog] = useState({ open: false, item: null, endpoint: '', title: '', fileName: '', dataUrl: '', comment: '' });
    const [rejectDialog, setRejectDialog] = useState({ open: false, item: null, comment: '' });
    const [deanDialog, setDeanDialog] = useState({ open: false, item: null, decision: 'allow', signature: '', comment: '' });
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
            await api[method](url, body);
            setToast({ open: true, message: okMsg, severity: 'success' });
            load();
            return true;
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

    const openUpload = (item, endpoint, title) =>
        setUploadDialog({ open: true, item, endpoint, title, fileName: '', dataUrl: '', comment: '' });

    const submitUpload = async () => {
        const { item, endpoint, fileName, dataUrl, comment } = uploadDialog;
        if (!dataUrl) { setToast({ open: true, message: 'กรุณาแนบไฟล์เอกสาร (PDF/PNG/JPG ≤10MB)', severity: 'warning' }); return; }
        const ok = await callApi('patch', `/relocations/${item.id}/${endpoint}`,
            { file_name: fileName, file_data_url: dataUrl, comment }, `${uploadDialog.title} เรียบร้อย`);
        if (ok) setUploadDialog({ open: false, item: null, endpoint: '', title: '', fileName: '', dataUrl: '', comment: '' });
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

    // ปุ่ม action ตามสถานะ step-by-step
    const renderActions = (r) => {
        const btn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-0 cursor-pointer transition';
        switch (r.status) {
            case 'advisor_approved_waiting_admin':
                return (
                    <div className="flex gap-1.5 flex-wrap">
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
                        <h1>คำร้องขอเปลี่ยนสถานที่ฝึกงาน</h1>
                        <p>ดำเนินการทีละขั้น: อนุมัติ → ออกหนังสือขอความอนุเคราะห์ → บันทึกตอบรับ → ออกหนังสือส่งตัวใหม่</p>
                    </div>
                </header>

                <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
                    <div className="section-header"><h2>รายการคำร้อง ({rows.length})</h2></div>
                    <TableContainer component={Box} className="compact-table">
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
                                                <div className="font-semibold text-slate-800">{r.studentName || r.student_id}</div>
                                                <div className="text-[11px] text-slate-400">{r.student_id} • {r.department}</div>
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
                                            <TableCell sx={{ minWidth: 240 }}>
                                                <RelocationStepper status={r.status} />
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor(r.status)}`}>
                                                    {RELOCATION_STATUS_LABEL[r.status] || r.status}
                                                </span>
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                {renderActions(r)}
                                            </TableCell>
                                        </TableRow>
                                        {expandedId === r.id && (
                                            <TableRow key={`${r.id}-detail`}>
                                                <TableCell colSpan={6} sx={{ bgcolor: '#f8fafc' }}>
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

            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setToast((p) => ({ ...p, open: false }))} severity={toast.severity} variant="filled">{toast.message}</Alert>
            </Snackbar>
        </div>
    );
};

export default AdminRelocationsPage;
