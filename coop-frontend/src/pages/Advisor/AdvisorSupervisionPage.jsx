import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    Menu,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { CalendarClock, CalendarDays, ChevronDown, ClipboardCheck, Users, Video, MapPin, X } from 'lucide-react';
import '../Admin/Dashboard/AdminDashboardPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';
import StatCard from '../../components/StatCard';

const AdvisorSupervisionPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [advisorName, setAdvisorName] = useState('');
    const [advisorDept, setAdvisorDept] = useState('');
    const [isDepartmentHead, setIsDepartmentHead] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [departmentAdvisors, setDepartmentAdvisors] = useState([]);
    const [supervisionRows, setSupervisionRows] = useState([]);
    const [appointmentDialog, setAppointmentDialog] = useState({
        open: false,
        requestId: null,
        date: '',
        mode: 'Online',
        note: '',
        advisorName: '',
        advisorId: ''
    });
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const [actionMenu, setActionMenu] = useState({ anchor: null, request: null });

    const closeActionMenu = () => setActionMenu({ anchor: null, request: null });

    const toDate = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (value) => {
        const date = toDate(value);
        return date ? date.toLocaleDateString('th-TH') : '-';
    };

    const isDateInCurrentWeek = (value) => {
        const date = toDate(value);
        if (!date) return false;

        const today = new Date();
        const day = today.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return date >= startOfWeek && date <= endOfWeek;
    };
    const getSupervisionStatus = (request) => {
        if (request.supervisionReport || request.hasAdvisorEval) return 'นิเทศเสร็จสิ้น';

        const hasAppointment = Boolean(request.supervisionAppointment?.date);
        if (!hasAppointment) return 'ยังไม่กำหนดวัน';

        const appointmentDate = toDate(request.supervisionAppointment.date);
        if (appointmentDate && appointmentDate < new Date()) {
            return 'รอส่งรายงาน';
        }

        return 'นัดแล้ว';
    };

    // ตัดคำนำหน้า "สาขา"/"สาขาวิชา" และช่องว่างออกก่อนเทียบ กันชื่อสาขาไม่ตรงกันเป๊ะ
    const normalizeDept = (value) =>
        String(value || '')
            .replace(/^\s*สาขาวิชา\s*/, '')
            .replace(/^\s*สาขา\s*/, '')
            .replace(/\s+/g, '')
            .trim();

    // เช็คว่าคำร้องนี้มอบหมายให้ผู้ใช้ปัจจุบันเป็นผู้นิเทศหรือไม่
    const isAssignedToMe = (request, me) => {
        const appt = request?.supervisionAppointment;
        if (!appt || !me) return false;
        const assignedId = appt.advisorId ? Number(appt.advisorId) : null;
        const assignedName = String(appt.advisorName || '').trim();
        const myName = String(me.name || '').trim();
        return Boolean(
            (assignedId && assignedId === Number(me.id)) ||
            (assignedName && myName && assignedName === myName)
        );
    };

    const loadSupervisionRows = async (dept, me) => {
        try {
            const res = await api.get('/requests');
            const allRequests = res.data.data || [];
            const activeStatuses = [
                'อนุมัติแล้ว', 'อนุมัติแล้ว (รอออกฝึกงาน)',
                'รออาจารย์อนุมัติเริ่มฝึกงาน', 'รอแอดมินอนุมัติเริ่มฝึกงาน',
                'สถานประกอบการตอบรับแล้ว', 'ตอบรับแล้ว',
                'ออกฝึกงาน', 'กำลังออกฝึกงาน',
                'สิ้นสุดการฝึกงาน (รอประเมิน)', 'ประเมินเสร็จแล้ว', 'ฝึกงานเสร็จแล้ว',
                // enum ภาษาอังกฤษที่อาจเจอในฐานข้อมูล
                'INTERNING', 'IN_PROGRESS', 'TRAINING', 'START_INTERNSHIP', 'APPROVED', 'COMPLETED'
            ];
            const deptKey = normalizeDept(dept);
            const filtered = allRequests.filter((request) => {
                const sameDept = deptKey ? normalizeDept(request.department) === deptKey : true;
                if (!sameDept || !activeStatuses.includes(request.status)) return false;
                // อาจารย์ทั่วไปเห็นเฉพาะนักศึกษาที่ตนได้รับมอบหมายเป็นผู้นิเทศ
                // ประธานสาขาเห็นภาพรวมทั้งหมดเพื่อจัดการนัดหมาย
                if (!me?.isDepartmentHead) return isAssignedToMe(request, me);
                return true;
            });
            console.log('[Supervision] dept:', dept, '| total:', allRequests.length, '| matched:', filtered.length);
            setSupervisionRows(filtered);
        } catch (err) {
            console.error('Failed to load requests:', err);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            navigate('/login');
            return;
        }

        const user = JSON.parse(userStr);
        if (user.role !== 'advisor') {
            navigate('/dashboard');
            return;
        }

        const dept = user.department || user.major || '';
        const myName = user.name || user.full_name || 'อาจารย์ที่ปรึกษา';
        const me = { id: user.id, name: myName, isDepartmentHead: Boolean(user.isDepartmentHead) };
        setAdvisorName(myName);
        setAdvisorDept(dept);
        setIsDepartmentHead(me.isDepartmentHead);
        setCurrentUserId(user.id);
        loadSupervisionRows(dept, me);

        // ประธานสาขาเปลี่ยนได้จากระบบฐานข้อมูลนักศึกษา ค่าใน localStorage จึงอาจเก่า
        // ดึงค่าล่าสุดจากเซิร์ฟเวอร์ทับเสมอ แล้วโหลดรายการใหม่ตามสิทธิ์จริง
        api.get('/auth/me')
            .then((res) => {
                const fresh = res.data?.user;
                if (!fresh) return;
                const freshHead = Boolean(fresh.isDepartmentHead);
                setIsDepartmentHead(freshHead);
                if (freshHead !== me.isDepartmentHead) {
                    loadSupervisionRows(dept, { ...me, isDepartmentHead: freshHead });
                }
            })
            .catch(() => {});

        // รายชื่ออาจารย์ในสาขาเดียวกัน สำหรับให้ประธานสาขาเลือกผู้นิเทศ
        api.get('/users?role=advisor')
            .then((res) => {
                const list = res.data?.data || [];
                const deptKey = normalizeDept(dept);
                const matched = deptKey ? list.filter((a) => normalizeDept(a.department) === deptKey) : list;
                setDepartmentAdvisors(matched.length > 0 ? matched : list);
            })
            .catch(() => {});
    }, [navigate]);

    const persistRequests = (updater) => {
        setSupervisionRows((prev) => {
            const updated = updater(prev);
            return updated;
        });
    };

    const openAppointmentDialog = (request) => {
        setAppointmentDialog({
            open: true,
            requestId: request.id,
            date: request.supervisionAppointment?.date || '',
            mode: request.supervisionAppointment?.mode || 'Online',
            note: request.supervisionAppointment?.note || '',
            advisorName: request.supervisionAppointment?.advisorName || '',
            advisorId: request.supervisionAppointment?.advisorId || ''
        });
    };

    const closeAppointmentDialog = () => {
        setAppointmentDialog({
            open: false,
            requestId: null,
            date: '',
            mode: 'Online',
            note: '',
            advisorName: '',
            advisorId: ''
        });
    };

    const saveAppointment = async () => {
        if (!appointmentDialog.date) {
            setToast({ open: true, message: 'กรุณาเลือกวันที่นิเทศ', severity: 'warning' });
            return;
        }

        try {
            await api.patch(`/requests/${appointmentDialog.requestId}/appointment`, {
                date: appointmentDialog.date,
                mode: appointmentDialog.mode,
                note: appointmentDialog.note,
                advisorName: appointmentDialog.advisorName,
                advisorId: appointmentDialog.advisorId
            });

            persistRequests((allRequests) =>
                allRequests.map((request) =>
                    request.id === appointmentDialog.requestId
                        ? {
                                ...request,
                                supervisionAppointment: {
                                    date: appointmentDialog.date,
                                    mode: appointmentDialog.mode,
                                    note: appointmentDialog.note,
                                    advisorName: appointmentDialog.advisorName,
                                    advisorId: appointmentDialog.advisorId,
                                    updatedAt: new Date().toISOString()
                                }
                            }
                        : request
                )
            );

            closeAppointmentDialog();
            setToast({ open: true, message: 'บันทึกนัดนิเทศเรียบร้อย', severity: 'success' });
        } catch (error) {
            setToast({ open: true, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error.response?.data?.message || error.message), severity: 'error' });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const summary = {
        totalStudents: supervisionRows.length,
        pendingSchedule: supervisionRows.filter((request) => getSupervisionStatus(request) === 'ยังไม่กำหนดวัน').length,
        thisWeek: supervisionRows.filter((request) => isDateInCurrentWeek(request.supervisionAppointment?.date)).length,
        pendingEvaluation: supervisionRows.filter((request) => !request.supervisionReport).length
    };

    const statusChipMap = {
        'ยังไม่กำหนดวัน': 'warning',
        'นัดแล้ว': 'info',
        'นิเทศแล้ว': 'success',
        'นิเทศเสร็จสิ้น': 'success',
        'รอส่งรายงาน': 'warning'
    };

    return (
        <div className="admin-dashboard-container">
            <div className="mobile-top-navbar flex h-16 w-full items-center justify-between px-4 sm:px-6 bg-white/90 border-b border-slate-100 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">☰</button>
                    <Link to="/" className="mobile-top-logo flex items-center shrink-0" aria-label="LASC Home">
                        <img src={lascLogo} alt="LASC Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
            <span className="hidden sm:inline text-base md:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap ml-2" style={{ fontFamily: '"Prompt", "Kanit", "Inter", sans-serif' }}>
              ระบบฝึกประสบการณ์วิชาชีพ
            </span>
                    </Link>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <DateTimeIndicator />
                    <NotificationBell />
                    <UserProfileMenu />
                </div>
            </div>
            <AdvisorSidebar
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                currentPath="/advisor-dashboard/supervision"
                handleLogout={handleLogout}
            />

            <main className="admin-main">
                <header className="admin-header">
                    <div>
                        <h1>ตารางนิเทศงานสหกิจศึกษา</h1>
                        <p>ภาพรวมและการติดตามนิเทศของ {advisorName}</p>
                    </div>
                </header>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                        gap: 2,
                        mb: 3,
                    }}
                >
                    {[
                        { title: 'นักศึกษาที่ดูแลทั้งหมด', value: summary.totalStudents, icon: <Users className="w-5 h-5" />, color: '#3b82f6' },
                        { title: 'รอนัดนิเทศ', value: summary.pendingSchedule, icon: <CalendarClock className="w-5 h-5" />, color: '#f59e0b' },
                        { title: 'นิเทศสัปดาห์นี้', value: summary.thisWeek, icon: <CalendarDays className="w-5 h-5" />, color: '#0284c7' },
                        { title: 'ยังไม่ประเมิน', value: summary.pendingEvaluation, icon: <ClipboardCheck className="w-5 h-5" />, color: '#10b981' },
                    ].map((item) => (
                        <StatCard
                            key={item.title}
                            title={item.title}
                            value={item.value}
                            icon={item.icon}
                            color={item.color}
                        />
                    ))}
                </Box>

                <Paper className="content-section" elevation={0} sx={{ width: '100%' }}>
                    <div className="section-header">
                        <h2>นักศึกษาที่ต้องนิเทศ</h2>
                    </div>

                    <TableContainer component={Box} className="compact-table">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>นักศึกษา</TableCell>
                                    <TableCell>บริษัท</TableCell>
                                    <TableCell>วันที่เริ่ม</TableCell>
                                    <TableCell>สถานะนิเทศ</TableCell>
                                    <TableCell>นัดหมาย</TableCell>
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {supervisionRows.length > 0 ? (
                                    supervisionRows.map((request) => {
                                        const supervisionStatus = getSupervisionStatus(request);
                                        const appointmentText = request.supervisionAppointment?.date
                                            ? `${formatDate(request.supervisionAppointment.date)} (${request.supervisionAppointment.mode})`
                                            : '-';

                                        return (
                                            <TableRow key={request.id} hover>
                                                <TableCell>
                                                    <Stack spacing={0.25}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.studentName || '-'}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{request.studentId || '-'}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{request.company || request.companyName || '-'}</TableCell>
                                                <TableCell>{formatDate(request.startDate || request.details?.startDate || request.details?.internship_info?.startDate || request.submittedDate || request.created_at)}</TableCell>
                                                <TableCell>
                                                    <Alert severity={statusChipMap[supervisionStatus] || 'default'} sx={{ py: 0, px: 1 }} icon={false}>
                                                        {supervisionStatus}
                                                    </Alert>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack spacing={0.3}>
                                                        <Typography variant="body2">{appointmentText}</Typography>
                                                        {request.supervisionAppointment?.advisorName && (
                                                            <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600, display: 'block' }}>
                                                                ผู้นิเทศ: {request.supervisionAppointment.advisorName}
                                                            </Typography>
                                                        )}
                                                        {request.supervisionAppointment?.note && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                หมายเหตุ: {request.supervisionAppointment.note}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        endIcon={<ChevronDown className="w-3.5 h-3.5" />}
                                                        onClick={(e) => setActionMenu({ anchor: e.currentTarget, request })}
                                                        sx={{
                                                            borderColor: '#ddd6fe',
                                                            color: '#6d28d9',
                                                            fontWeight: 600,
                                                            borderRadius: '10px',
                                                            textTransform: 'none',
                                                            '&:hover': { borderColor: '#a78bfa', bgcolor: '#f5f3ff' }
                                                        }}
                                                    >
                                                        จัดการ
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                            ไม่พบนักศึกษาที่ต้องนิเทศในสาขา {advisorDept || '-'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </main>

            <Menu
                anchorEl={actionMenu.anchor}
                open={Boolean(actionMenu.anchor)}
                onClose={closeActionMenu}
                PaperProps={{
                    className: '!rounded-2xl !shadow-[0_12px_40px_-8px_rgba(109,40,217,0.25)]',
                    sx: { mt: 0.5, minWidth: 220, border: '1px solid #ede9fe' }
                }}
            >
                {(() => {
                    const req = actionMenu.request;
                    const done = req && (getSupervisionStatus(req) === 'นิเทศเสร็จสิ้น' || req.hasAdvisorEval);
                    const mine = req && isAssignedToMe(req, { id: currentUserId, name: advisorName });
                    // ผู้ที่ไม่ได้รับมอบหมายเห็นเฉพาะผลที่บันทึกแล้ว (อ่านอย่างเดียว) — ซ่อนปุ่มบันทึกผลนิเทศ
                    const canEvaluate = done || mine;
                    return [
                        <MenuItem
                            key="schedule"
                            disabled={!isDepartmentHead || done}
                            onClick={() => { if (isDepartmentHead && !done && req) openAppointmentDialog(req); closeActionMenu(); }}
                            sx={{ fontSize: '0.8125rem', fontWeight: 600, gap: 1.25, py: 1.25, color: '#334155' }}
                        >
                            <CalendarClock className="w-4 h-4 text-violet-500" />
                            {req?.supervisionAppointment?.date ? 'แก้ไขวันนัด/อาจารย์' : 'กำหนดวัน/อาจารย์'}
                            {done ? (
                                <Typography component="span" variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>
                                    บันทึกผลแล้ว
                                </Typography>
                            ) : !isDepartmentHead && (
                                <Typography component="span" variant="caption" sx={{ color: '#94a3b8', ml: 'auto' }}>
                                    เฉพาะประธานสาขา
                                </Typography>
                            )}
                        </MenuItem>,
                        canEvaluate && (
                            <MenuItem
                                key="evaluate"
                                onClick={() => { if (req) navigate(`/advisor-dashboard/supervision/evaluate/${req.id}`); closeActionMenu(); }}
                                sx={{ fontSize: '0.8125rem', fontWeight: 600, gap: 1.25, py: 1.25, color: done ? '#059669' : '#334155' }}
                            >
                                <ClipboardCheck className={`w-4 h-4 ${done ? 'text-emerald-500' : 'text-violet-500'}`} />
                                {done ? 'ดูผลนิเทศ (เสร็จสิ้น)' : 'บันทึกผลนิเทศ'}
                            </MenuItem>
                        )
                    ].filter(Boolean);
                })()}
            </Menu>

            <Dialog
                open={appointmentDialog.open}
                onClose={closeAppointmentDialog}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    className: '!rounded-3xl !shadow-[0_24px_64px_-12px_rgba(109,40,217,0.25)]',
                    sx: { overflow: 'hidden' }
                }}
            >
                <div className="px-6 pt-6 pb-5 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                            <CalendarClock className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 m-0">กำหนดวันนิเทศ</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5 m-0">เลือกอาจารย์ผู้นิเทศ วันที่ และรูปแบบการนิเทศ</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeAppointmentDialog}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer border-none bg-transparent"
                        aria-label="ปิด"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <DialogContent sx={{ px: 3, py: 2.5 }}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
                                อาจารย์ผู้รับผิดชอบนิเทศ
                                {departmentAdvisors.find((a) => (a.name || a.username) === appointmentDialog.advisorName)?.isDepartmentHead && (
                                    <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">ประธานสาขา</span>
                                )}
                            </label>
                            <div className="relative">
                                <select
                                    value={appointmentDialog.advisorName}
                                    onChange={(event) => {
                                        const selectedName = event.target.value;
                                        const found = departmentAdvisors.find((a) => a.name === selectedName || a.username === selectedName);
                                        setAppointmentDialog((prev) => ({
                                            ...prev,
                                            advisorName: selectedName,
                                            advisorId: found ? found.id : ''
                                        }));
                                    }}
                                    className="w-full appearance-none h-11 pl-3.5 pr-10 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition cursor-pointer"
                                >
                                    <option value="">— เลือกอาจารย์ผู้นิเทศ —</option>
                                    {departmentAdvisors.map((adv) => (
                                        <option key={adv.id} value={adv.name || adv.username}>
                                            {adv.name || adv.username}{adv.isDepartmentHead ? ' (ประธานสาขา)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 m-0">กำหนดโดยประธานสาขาวิชา</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">วันที่นิเทศ</label>
                                <input
                                    type="date"
                                    value={appointmentDialog.date}
                                    onChange={(event) => setAppointmentDialog((prev) => ({ ...prev, date: event.target.value }))}
                                    className="w-full box-border h-11 px-3.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">รูปแบบการนิเทศ</label>
                                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                                    {[
                                        { value: 'Online', icon: <Video className="w-3.5 h-3.5" /> },
                                        { value: 'Onsite', icon: <MapPin className="w-3.5 h-3.5" /> },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setAppointmentDialog((prev) => ({ ...prev, mode: opt.value }))}
                                            className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border-none ${
                                                appointmentDialog.mode === opt.value
                                                    ? 'bg-white text-violet-700 shadow-sm'
                                                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            {opt.icon}
                                            {opt.value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">หมายเหตุ</label>
                            <textarea
                                value={appointmentDialog.note}
                                onChange={(event) => setAppointmentDialog((prev) => ({ ...prev, note: event.target.value }))}
                                placeholder="รายละเอียดเพิ่มเติม เช่น ลิงก์ประชุม หรือสถานที่นัดหมาย..."
                                className="w-full box-border rounded-xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 resize-none h-20 text-slate-700 bg-slate-50/70 focus:bg-white transition"
                            />
                        </div>
                    </div>
                </DialogContent>

                <div className="px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={closeAppointmentDialog}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer bg-white"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={saveAppointment}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.25)] transition cursor-pointer border-none"
                    >
                        บันทึกการนัดหมาย
                    </button>
                </div>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setToast((prev) => ({ ...prev, open: false }))} severity={toast.severity} variant="filled">
                    {toast.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default AdvisorSupervisionPage;
