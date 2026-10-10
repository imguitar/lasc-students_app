import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import {
    Alert, Box, Dialog, DialogContent, Paper, Snackbar, Tab, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Tabs, TextField,
} from '@mui/material';
import { CheckCircle2, FileText, History, Inbox, Loader2, MessageSquareText, XCircle } from 'lucide-react';
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
    const [viewTab, setViewTab] = useState('active');

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

    // Deep link จากเมนู action หน้า dashboard (?focus=<relocId>) — เปิด dialog พิจารณาของรายการนั้นอัตโนมัติ
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        const focusId = searchParams.get('focus');
        if (!focusId || rows.length === 0 || reviewDialog.open) return;
        const target = rows.find((r) => String(r.id) === String(focusId));
        if (target && ['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(target.status)) {
            setReviewDialog({ open: true, item: target, approve: true, comment: '', signature: '' });
        }
        searchParams.delete('focus');
        setSearchParams(searchParams, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows]);

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

    // รายการที่ถึงขั้นอาจารย์ตัดสินได้ — นอกเหนือนี้ dialog ใช้ดูรายละเอียดอย่างเดียว
    const isReviewable = ['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(reviewDialog.item?.status);

    const statusColor = (status) =>
        status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200/60'
        : ['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(status) ? 'bg-amber-50 text-amber-600 border-amber-200/60'
        : 'bg-violet-50 text-violet-600 border-violet-200/60';

    // แท็บทำงาน: คำร้องที่จบแล้ว (completed/rejected) ย้ายไปประวัติ — active เหลือคำร้องล่าสุด 1 รายการต่อคำร้องฝึกงาน กันแถวซ้ำ
    const RELOC_TERMINAL = ['completed', 'rejected'];
    const sortedRows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || (b.id - a.id));
    const seenActiveKeys = new Set();
    const activeRows = sortedRows.filter((r) => {
        if (RELOC_TERMINAL.includes(r.status)) return false;
        const key = String(r.internship_request_id || r.student_id);
        if (seenActiveKeys.has(key)) return false;
        seenActiveKeys.add(key);
        return true;
    });
    const historyRows = sortedRows.filter((r) => RELOC_TERMINAL.includes(r.status));
    const displayRows = viewTab === 'active' ? activeRows : historyRows;

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

                    {/* Segmented Tabs — แยกงานที่ต้องทำออกจากประวัติที่จบแล้ว */}
                    <Tabs
                        value={viewTab}
                        onChange={(_, v) => { if (v) setViewTab(v); }}
                        sx={{
                            minHeight: 0, mb: 2, display: 'inline-flex',
                            bgcolor: 'rgba(241,245,249,0.7)', p: 0.5, borderRadius: 2.5,
                            '& .MuiTabs-indicator': { display: 'none' },
                            '& .MuiTabs-flexContainer': { gap: 0.5 },
                        }}
                    >
                        {[
                            { key: 'active', icon: <Inbox size={14} />, label: 'คำร้องรอดำเนินการ', count: activeRows.length },
                            { key: 'history', icon: <History size={14} />, label: 'ประวัติเสร็จสิ้น', count: historyRows.length },
                        ].map((tab) => (
                            <Tab
                                key={tab.key}
                                value={tab.key}
                                disableRipple
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                        <Box component="span" sx={{
                                            px: 0.75, py: 0.125, borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                                            bgcolor: viewTab === tab.key ? '#ede9fe' : 'rgba(226,232,240,0.8)',
                                            color: viewTab === tab.key ? '#6d28d9' : '#64748b',
                                        }}>
                                            {tab.count}
                                        </Box>
                                    </Box>
                                }
                                sx={{
                                    minHeight: 0, py: 0.75, px: 1.5, borderRadius: 2,
                                    textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
                                    '&.Mui-selected': { bgcolor: '#fff', color: '#6d28d9', boxShadow: '0 1px 2px rgba(15,23,42,0.08)' },
                                }}
                            />
                        ))}
                    </Tabs>

                    {/* Desktop: ตาราง / Mobile: การ์ด — ไม่มี horizontal scroll */}
                    <div className="hidden md:block">
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
                                {displayRows.length > 0 ? displayRows.map((r) => (
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
                                            {r.return_letter_file ? (
                                                <a href={fileUrl(r.return_letter_file)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 no-underline hover:text-violet-800">
                                                    <FileText style={{ width: 13, height: 13 }} /> หนังสือส่งตัวกลับ
                                                </a>
                                            ) : <span className="text-[11px] text-slate-400">-</span>}
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
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold border border-emerald-200/80 cursor-pointer transition">
                                                        <CheckCircle2 style={{ width: 12, height: 12 }} /> อนุญาต
                                                    </button>
                                                    <button type="button" onClick={() => setReviewDialog({ open: true, item: r, approve: false, comment: '', signature: '' })}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-[11px] font-medium border border-rose-200 cursor-pointer transition">
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
                                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <div className="text-sm text-slate-400">
                                            {viewTab === 'active' ? 'ไม่มีคำร้องขอย้ายที่รอดำเนินการในขณะนี้' : 'ยังไม่มีประวัติคำร้องที่เสร็จสิ้น'}
                                        </div>
                                    </TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    </div>

                    {/* Mobile Card View (< md) — การ์ดแนวตั้งเต็มความกว้างจอ */}
                    <div className="md:hidden px-1">
                        {displayRows.length > 0 ? displayRows.map((r) => {
                            const isPending = ['company_approved_waiting_advisor', 'submitted_waiting_advisor'].includes(r.status);
                            return (
                                <div key={r.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3 mb-3.5">
                                    {/* Header: ชื่อ + badge สถานะ */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-slate-900 font-semibold text-base m-0 truncate">{r.studentName || r.student_id}</p>
                                            <p className="text-slate-500 text-xs font-normal m-0 mt-0.5">({r.student_id})</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${statusColor(r.status)}`}>
                                            {RELOCATION_STATUS_LABEL[r.status] || r.status}
                                        </span>
                                    </div>

                                    {/* เส้นทางการย้าย */}
                                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                                        <p className="m-0 text-slate-600"><span className="font-semibold text-slate-500">ย้ายจาก:</span> {r.old_company || '-'}</p>
                                        <p className="m-0"><span className="font-semibold text-slate-500">ย้ายไป:</span> <span className="text-violet-600 font-semibold">{r.new_company_name}</span></p>
                                        <p className="m-0 text-slate-500">ระยะเวลา: ฝึกแล้ว {r.days_trained} วัน / คงเหลือ {r.days_remaining} วัน</p>
                                        {r.reason && <p className="m-0 text-slate-500 pt-1 border-t border-slate-200/70"><span className="font-semibold">เหตุผล:</span> {r.reason}</p>}
                                    </div>

                                    {r.return_letter_file && (
                                        <a href={fileUrl(r.return_letter_file)} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 no-underline">
                                            <FileText style={{ width: 13, height: 13 }} /> หนังสือส่งตัวกลับ
                                        </a>
                                    )}

                                    {/* Actions */}
                                    {isPending ? (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setReviewDialog({ open: true, item: r, approve: true, comment: '', signature: '' })}
                                                className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition">
                                                <CheckCircle2 style={{ width: 14, height: 14 }} /> อนุญาต
                                            </button>
                                            <button type="button" onClick={() => setReviewDialog({ open: true, item: r, approve: false, comment: '', signature: '' })}
                                                className="px-4 py-2.5 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition">
                                                <XCircle style={{ width: 14, height: 14 }} /> ไม่อนุญาต
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => setReviewDialog({ open: true, item: r, approve: true, comment: '', signature: '' })}
                                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm border-0 cursor-pointer transition">
                                            ดูรายละเอียด
                                        </button>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center text-slate-400 text-sm py-8 bg-white rounded-2xl border border-slate-200/80">
                                <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                {viewTab === 'active' ? 'ไม่มีคำร้องขอย้ายที่รอดำเนินการในขณะนี้' : 'ยังไม่มีประวัติคำร้องที่เสร็จสิ้น'}
                            </div>
                        )}
                    </div>
                </Paper>
            </main>

            <Dialog open={reviewDialog.open} onClose={() => setReviewDialog((p) => ({ ...p, open: false }))} fullWidth maxWidth="sm" PaperProps={{ className: '!rounded-3xl' }}>
                <DialogContent sx={{ px: 3, py: 3 }}>
                    <h3 className="text-base font-bold text-slate-800 mt-0 mb-1">
                        {isReviewable
                            ? (reviewDialog.approve ? 'อนุญาตให้เปลี่ยนสถานที่ฝึกงาน?' : 'ไม่อนุญาต — ระบุเหตุผล')
                            : 'รายละเอียดคำร้องขอย้ายสถานที่ฝึกงาน'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3 m-0">
                        {reviewDialog.item?.studentName} ({reviewDialog.item?.student_id})
                    </p>

                    {/* สรุปเส้นทางการย้าย: ที่เดิม → ที่ใหม่ + ระยะเวลา */}
                    {reviewDialog.item && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5 mb-3">
                            <p className="m-0 text-slate-600">
                                <span className="font-semibold text-slate-500">สถานที่เดิม:</span>{' '}
                                {reviewDialog.item.old_company || '-'}{reviewDialog.item.old_position ? ` (${reviewDialog.item.old_position})` : ''}
                            </p>
                            <p className="m-0 text-violet-700 font-semibold">
                                <span className="font-semibold text-slate-500">สถานที่ใหม่:</span>{' '}
                                {reviewDialog.item.new_company_name}
                            </p>
                            <p className="m-0 text-slate-500">
                                ระยะเวลา: ฝึกแล้ว {reviewDialog.item.days_trained ?? 0} วัน / คงเหลือ {reviewDialog.item.days_remaining ?? 0} วัน
                            </p>
                        </div>
                    )}

                    {/* เหตุผลที่ขอย้าย */}
                    {reviewDialog.item && (
                        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-xs text-slate-800 leading-relaxed mb-3">
                            <p className="m-0 font-medium text-slate-700 text-xs mb-1 flex items-center gap-1.5"><MessageSquareText className="w-3.5 h-3.5 text-amber-600" /> เหตุผลความจำเป็นในการขอย้าย:</p>
                            <p className="m-0">{reviewDialog.item.reason?.trim() || 'ไม่ได้ระบุเหตุผล'}</p>
                        </div>
                    )}

                    {!isReviewable && reviewDialog.item && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 mb-3 space-y-1.5 text-xs text-slate-600">
                            <p className="m-0"><span className="font-semibold">ย้ายจาก:</span> {reviewDialog.item.old_company || '-'}</p>
                            <p className="m-0"><span className="font-semibold">เหตุผล:</span> {reviewDialog.item.reason || '-'}</p>
                            <p className="m-0"><span className="font-semibold">สถานะ:</span> {RELOCATION_STATUS_LABEL[reviewDialog.item.status] || reviewDialog.item.status}</p>
                            {(reviewDialog.item.advisor_comment || reviewDialog.item.admin_comment) && (
                                <p className="m-0"><span className="font-semibold">ความเห็น:</span> {reviewDialog.item.advisor_comment || reviewDialog.item.admin_comment}</p>
                            )}
                        </div>
                    )}
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
                    {isReviewable && (
                        <TextField
                            fullWidth multiline minRows={3} size="small"
                            label={reviewDialog.approve ? 'ความเห็น (ไม่บังคับ)' : 'เหตุผลที่ไม่อนุญาต *'}
                            value={reviewDialog.comment}
                            onChange={(e) => setReviewDialog((p) => ({ ...p, comment: e.target.value }))}
                        />
                    )}
                    {isReviewable && reviewDialog.approve && (
                        <div className="mt-3">
                            <p className="text-[11px] font-semibold text-slate-600 mb-1">ลายมือชื่ออาจารย์ที่ปรึกษา *</p>
                            <SignaturePad height={120} onChange={(d) => setReviewDialog((p) => ({ ...p, signature: d || '' }))} />
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setReviewDialog((p) => ({ ...p, open: false }))}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold bg-white cursor-pointer">{isReviewable ? 'ยกเลิก' : 'ปิด'}</button>
                        {isReviewable && (
                            <button type="button" onClick={submitReview} disabled={submitting}
                                className={`px-5 py-2 rounded-xl text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${reviewDialog.approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                ยืนยัน
                            </button>
                        )}
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
