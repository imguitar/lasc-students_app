import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import {
    Alert, Box, Dialog, DialogContent, Paper, Snackbar, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
} from '@mui/material';
import { CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react';
import '../Admin/Dashboard/AdminDashboardPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';
import { RELOCATION_STATUS_LABEL } from '../../components/RelocationStepper';
import SignaturePad from '../../components/SignaturePad';
import { getUploadUrl } from '../../utils/fileUrl';

const fileUrl = getUploadUrl;

const normalizeDept = (value) =>
    String(value || '').replace(/^\s*สาขาวิชา\s*/, '').replace(/^\s*สาขา\s*/, '').replace(/\s+/g, '').trim();

const AdvisorRelocationsPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [advisorDept, setAdvisorDept] = useState('');
    const [rows, setRows] = useState([]);
    const [reviewDialog, setReviewDialog] = useState({ open: false, item: null, approve: true, comment: '', signature: '' });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    const load = (dept) => {
        api.get('/relocations').then((res) => {
            const all = res.data?.data || [];
            const key = normalizeDept(dept);
            setRows(key ? all.filter((r) => normalizeDept(r.department) === key) : all);
        }).catch(() => {});
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { navigate('/login'); return; }
        const user = JSON.parse(userStr);
        if (user.role !== 'advisor') { navigate('/dashboard'); return; }
        const dept = user.department || user.major || '';
        setAdvisorDept(dept);
        load(dept);
    }, [navigate]);

    const handleLogout = () => { localStorage.removeItem('user'); navigate('/'); };

    const submitReview = async () => {
        const { item, approve, comment, signature } = reviewDialog;
        if (!item) return;
        if (approve && !signature) {
            setToast({ open: true, message: 'กรุณาลงลายมือชื่อดิจิทัลเพื่อยืนยันการอนุญาต', severity: 'warning' });
            return;
        }
        if (!approve && !comment.trim()) {
            setToast({ open: true, message: 'กรุณาระบุเหตุผลที่ไม่อนุญาต', severity: 'warning' });
            return;
        }
        setSubmitting(true);
        try {
            await api.patch(`/relocations/${item.id}/advisor-review`, { approve, comment, signature_data_url: signature });
            setToast({ open: true, message: approve ? 'อนุญาตแล้ว ส่งเรื่องเข้าสำนักงานคณบดี' : 'ตีกลับคำร้องแล้ว', severity: 'success' });
            setReviewDialog({ open: false, item: null, approve: true, comment: '', signature: '' });
            load(advisorDept);
        } catch (e) {
            setToast({ open: true, message: e.response?.data?.message || 'ดำเนินการไม่สำเร็จ', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const statusColor = (status) =>
        status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200/60'
        : ['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(status) ? 'bg-amber-50 text-amber-600 border-amber-200/60'
        : 'bg-violet-50 text-violet-600 border-violet-200/60';

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
            <AdvisorSidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} currentPath="/advisor-dashboard/relocations" handleLogout={handleLogout} />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>คำร้องขอเปลี่ยนสถานที่ฝึกงาน</h1>
                        <p>พิจารณาคำร้องย้ายสถานที่ฝึกงานของนักศึกษาในสาขา {advisorDept || '-'}</p>
                    </div>
                </header>

                <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
                    <div className="section-header"><h2>รายการคำร้อง</h2></div>
                    <TableContainer component={Box} className="compact-table">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>นักศึกษา</TableCell>
                                    <TableCell>ย้ายจาก → ไป</TableCell>
                                    <TableCell>เหตุผล</TableCell>
                                    <TableCell>เอกสาร</TableCell>
                                    <TableCell>สถานะ</TableCell>
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.length > 0 ? rows.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell>
                                            <div className="font-semibold text-slate-800">{r.studentName || r.student_id}</div>
                                            <div className="text-[11px] text-slate-400">{r.student_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-slate-600">{r.old_company || '-'}</div>
                                            <div className="text-xs font-semibold text-violet-700">→ {r.new_company_name}</div>
                                            <div className="text-[11px] text-slate-400">ฝึกแล้ว {r.days_trained} วัน / เหลือ {r.days_remaining} วัน</div>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 220 }}>
                                            <div className="text-xs text-slate-600" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.reason}</div>
                                        </TableCell>
                                        <TableCell>
                                            <a href={fileUrl(r.return_letter_file)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 no-underline hover:text-violet-800">
                                                <FileText style={{ width: 13, height: 13 }} /> หนังสือส่งตัวกลับ
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor(r.status)}`}>
                                                {RELOCATION_STATUS_LABEL[r.status] || r.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(r.status) ? (
                                                <div className="flex gap-1.5">
                                                    <button type="button" onClick={() => setReviewDialog({ open: true, item: r, approve: true, comment: '', signature: '' })}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold border-0 cursor-pointer transition">
                                                        <CheckCircle2 style={{ width: 12, height: 12 }} /> อนุญาต
                                                    </button>
                                                    <button type="button" onClick={() => setReviewDialog({ open: true, item: r, approve: false, comment: '', signature: '' })}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold border border-red-200 cursor-pointer transition">
                                                        <XCircle style={{ width: 12, height: 12 }} /> ไม่อนุญาต
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400">
                                                    {r.advisor_comment ? `เห็น: ${r.advisor_comment}` : '—'}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>ไม่มีคำร้องขอเปลี่ยนสถานที่ฝึกงาน</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </main>

            <Dialog open={reviewDialog.open} onClose={() => setReviewDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="sm" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">
                        {reviewDialog.approve ? 'อนุญาตให้เปลี่ยนสถานที่ฝึกงาน?' : 'ไม่อนุญาต — ระบุเหตุผล'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3 m-0">
                        {reviewDialog.item?.studentName} → {reviewDialog.item?.new_company_name}
                    </p>
                    {/* ลายเซ็นที่ผ่านมา */}
                    {(reviewDialog.item?.student_signature || reviewDialog.item?.company_signature) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 mb-3 grid grid-cols-2 gap-2">
                            {reviewDialog.item?.student_signature && (
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-500 mb-1">ลายเซ็นนักศึกษา</p>
                                    <img src={reviewDialog.item.student_signature} alt="ลายเซ็นนักศึกษา" className="w-full h-14 object-contain bg-white rounded-lg border border-slate-100" />
                                </div>
                            )}
                            {reviewDialog.item?.company_signature && (
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-500 mb-1">
                                        ลายเซ็นบริษัท{reviewDialog.item.company_signer_name ? ` (${reviewDialog.item.company_signer_name})` : ''}
                                    </p>
                                    <img src={reviewDialog.item.company_signature} alt="ลายเซ็นบริษัท" className="w-full h-14 object-contain bg-white rounded-lg border border-slate-100" />
                                </div>
                            )}
                        </div>
                    )}
                    <TextField
                        fullWidth multiline minRows={3} size="small"
                        label={reviewDialog.approve ? 'ความเห็น (ไม่บังคับ)' : 'เหตุผลที่ไม่อนุญาต *'}
                        value={reviewDialog.comment}
                        onChange={(e) => setReviewDialog((p) => ({ ...p, comment: e.target.value }))}
                    />
                    {reviewDialog.approve && (
                        <div className="mt-3">
                            <p className="text-[11px] font-semibold text-slate-600 mb-1">ลายมือชื่ออาจารย์ที่ปรึกษา *</p>
                            <SignaturePad height={120} onChange={(d) => setReviewDialog((p) => ({ ...p, signature: d || '' }))} />
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setReviewDialog((p) => ({ ...p, open: false }))}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">ยกเลิก</button>
                        <button type="button" onClick={submitReview} disabled={submitting}
                            className={`px-5 py-2 rounded-xl text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${reviewDialog.approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            ยืนยัน
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

export default AdvisorRelocationsPage;
