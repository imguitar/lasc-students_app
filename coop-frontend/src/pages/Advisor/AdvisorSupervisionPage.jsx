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
    IconButton,
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
import { Building2, Calendar, CalendarCheck, CalendarClock, CalendarDays, ChevronDown, ClipboardCheck, FileText, Loader2, MoreVertical, Trash2, Upload, Users, Video, MapPin, X } from 'lucide-react';
import '../Admin/Dashboard/AdminDashboardPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import NotificationBell from '../../components/NotificationBell';
import DateTimeIndicator from '../../components/DateTimeIndicator';
import StatCard from '../../components/StatCard';
import { getUploadUrl } from '../../utils/fileUrl';

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
    const [docUpload, setDocUpload] = useState({ uploading: false, progress: 0, docType: 'แบบบันทึกการนิเทศ', dragOver: false });

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
            navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/'));
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
                                    // คงเอกสารแนบและเมทาดาทาการมอบหมายเดิมไว้
                                    ...(request.supervisionAppointment || {}),
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

    // ---- เอกสารการนิเทศ (อัปโหลด/ลบ) ----
    const ALLOWED_DOC_TYPES = ['แบบบันทึกการนิเทศ', 'ภาพถ่ายการนิเทศ', 'หนังสือขอเข้านิเทศ', 'เอกสารสรุปผลการนิเทศ', 'อื่นๆ'];
    const DOC_MAX_BYTES = 10 * 1024 * 1024;
    const docFileUrl = getUploadUrl;

    const activeDialogRequest = supervisionRows.find((r) => r.id === appointmentDialog.requestId);
    const activeDocs = activeDialogRequest?.supervisionAppointment?.documents || [];

    // ช่วงวันที่ฝึกงานสำหรับกำหนด min/max ของ date picker
    const internshipRange = (() => {
        if (!activeDialogRequest) return { min: '', max: '' };
        const toYMD = (v) => {
            const d = new Date(v);
            return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        return {
            min: toYMD(activeDialogRequest.internship_start_date || activeDialogRequest.details?.startDate),
            max: toYMD(activeDialogRequest.internship_end_date || activeDialogRequest.details?.endDate)
        };
    })();

    const uploadSupervisionDoc = async (file) => {
        if (!file || !appointmentDialog.requestId) return;
        const okExt = /\.(pdf|png|jpe?g)$/i.test(file.name);
        if (!okExt) {
            setToast({ open: true, message: 'รองรับเฉพาะไฟล์ PDF, PNG, JPG', severity: 'warning' });
            return;
        }
        if (file.size > DOC_MAX_BYTES) {
            setToast({ open: true, message: 'ไฟล์ต้องมีขนาดไม่เกิน 10MB', severity: 'warning' });
            return;
        }
        try {
            setDocUpload((prev) => ({ ...prev, uploading: true, progress: 0 }));
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await api.post(`/requests/${appointmentDialog.requestId}/supervision-documents`, {
                document_name: file.name,
                document_type: docUpload.docType,
                data_url: dataUrl
            }, {
                onUploadProgress: (e) => {
                    if (e.total) setDocUpload((prev) => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
                }
            });
            const doc = res.data?.data;
            if (doc) {
                persistRequests((all) =>
                    all.map((r) =>
                        r.id === appointmentDialog.requestId
                            ? { ...r, supervisionAppointment: { ...(r.supervisionAppointment || {}), documents: [...(r.supervisionAppointment?.documents || []), doc] } }
                            : r
                    )
                );
            }
            setToast({ open: true, message: 'อัปโหลดเอกสารเรียบร้อย', severity: 'success' });
        } catch (error) {
            setToast({ open: true, message: 'อัปโหลดไม่สำเร็จ: ' + (error.response?.data?.message || error.message), severity: 'error' });
        } finally {
            setDocUpload((prev) => ({ ...prev, uploading: false, progress: 0 }));
        }
    };

    const deleteSupervisionDoc = async (doc) => {
        try {
            await api.delete(`/requests/${appointmentDialog.requestId}/supervision-documents/${doc.id}`);
            persistRequests((all) =>
                all.map((r) =>
                    r.id === appointmentDialog.requestId
                        ? { ...r, supervisionAppointment: { ...(r.supervisionAppointment || {}), documents: (r.supervisionAppointment?.documents || []).filter((d) => d.id !== doc.id) } }
                        : r
                )
            );
            setToast({ open: true, message: 'ลบเอกสารเรียบร้อย', severity: 'success' });
        } catch (error) {
            setToast({ open: true, message: 'ลบเอกสารไม่สำเร็จ: ' + (error.response?.data?.message || error.message), severity: 'error' });
        }
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
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" style={{ width: 24, height: 24, display: "block" }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg></button>
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
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: { xs: 1.25, md: 2 },
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

                    <TableContainer component={Box} className="compact-table" sx={{ display: { xs: 'none', md: 'block' } }}>
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
                                                <TableCell>{request.active_company_name || request.company || request.companyName || '-'}</TableCell>
                                                <TableCell>{formatDate(request.active_start_date || request.startDate || request.details?.startDate || request.details?.internship_info?.startDate || request.submittedDate || request.created_at)}</TableCell>
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
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        aria-label={`จัดการนิเทศคำร้อง ${request.id}`}
                                                        aria-haspopup="menu"
                                                        title="จัดการ"
                                                        onClick={(e) => { e.stopPropagation(); setActionMenu({ anchor: e.currentTarget, request }); }}
                                                        sx={{ p: 0.75, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' }, '&:active': { bgcolor: 'rgba(226,232,240,0.6)' } }}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </IconButton>
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

                    {/* Mobile Card Stack View (<768px) — ตามกฎ Table-to-Card ใน skill section 4 */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                        {supervisionRows.length === 0 ? (
                            <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: '#94a3b8' }}>
                                ไม่พบนักศึกษาที่ต้องนิเทศในสาขา {advisorDept || '-'}
                            </Typography>
                        ) : (
                            supervisionRows.map((request) => {
                                const supervisionStatus = getSupervisionStatus(request);
                                const done = supervisionStatus === 'นิเทศเสร็จสิ้น' || request.hasAdvisorEval;
                                const mine = isAssignedToMe(request, { id: currentUserId, name: advisorName });
                                const canEvaluate = done || mine;
                                const appointmentText = request.supervisionAppointment?.date
                                    ? `${formatDate(request.supervisionAppointment.date)} (${request.supervisionAppointment.mode})`
                                    : null;
                                const startDate = request.active_start_date || request.startDate || request.details?.startDate || request.details?.internship_info?.startDate || request.submittedDate || request.created_at;

                                return (
                                    <Box key={request.id} sx={{ bgcolor: '#fff', p: 2, borderRadius: '16px', border: '1px solid rgba(226,232,240,0.8)' }}>
                                        {/* หัวการ์ด: ชื่อ/รหัส + badge + เมนู */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>
                                                    {request.studentName || '-'}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>{request.studentId || '-'}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                <Alert severity={statusChipMap[supervisionStatus] || 'default'} sx={{ py: 0, px: 1 }} icon={false}>
                                                    {supervisionStatus}
                                                </Alert>
                                                <IconButton
                                                    size="small"
                                                    aria-label={`จัดการนิเทศคำร้อง ${request.id}`}
                                                    aria-haspopup="menu"
                                                    title="จัดการ"
                                                    onClick={(e) => { e.stopPropagation(); setActionMenu({ anchor: e.currentTarget, request }); }}
                                                    sx={{ p: 0.75, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(241,245,249,0.8)', color: '#475569' }, '&:active': { bgcolor: 'rgba(226,232,240,0.6)' } }}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                        {/* เนื้อหาการ์ด: บริษัท + วันเริ่ม (ที่ใหม่ล่าสุด) + นัดหมาย */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1.5, pt: 1.5, borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                <Building2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                                <span className="break-words">{request.active_company_name || request.company || request.companyName || '-'}</span>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                                <span>เริ่มฝึก: {formatDate(startDate)}</span>
                                            </Box>
                                            {appointmentText && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                    <CalendarClock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <span>
                                                        นัดนิเทศ: {appointmentText}
                                                        {request.supervisionAppointment?.advisorName && ` — ${request.supervisionAppointment.advisorName}`}
                                                    </span>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* ปุ่มหลักท้ายการ์ด — full width 44px */}
                                        {isDepartmentHead && !done && (
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                startIcon={<CalendarCheck className="w-4 h-4" />}
                                                onClick={() => openAppointmentDialog(request)}
                                                sx={{ minHeight: '44px', mt: 1.5, borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                                            >
                                                {request.supervisionAppointment?.date ? 'แก้ไขนัดหมายนิเทศงาน' : 'นัดหมายนิเทศงาน'}
                                            </Button>
                                        )}
                                        {!(isDepartmentHead && !done) && canEvaluate && (
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                startIcon={<ClipboardCheck className="w-4 h-4" />}
                                                onClick={() => navigate(`/advisor-dashboard/supervision/evaluate/${request.id}`)}
                                                sx={{ minHeight: '44px', mt: 1.5, borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                                            >
                                                {done ? 'ดูผลนิเทศ' : 'บันทึกผลนิเทศ'}
                                            </Button>
                                        )}
                                    </Box>
                                );
                            })
                        )}
                    </Box>
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
                                    min={internshipRange.min || undefined}
                                    max={internshipRange.max || undefined}
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
                        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 -mt-1.5 mb-0">
                            โปรดระบุวันที่นิเทศให้ตรงกับวันที่ในเอกสารราชการ/หนังสือนิเทศ
                            {internshipRange.min && internshipRange.max && ` (ช่วงฝึกงาน ${formatDate(internshipRange.min)} – ${formatDate(internshipRange.max)})`}
                        </p>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">หมายเหตุ</label>
                            <textarea
                                value={appointmentDialog.note}
                                onChange={(event) => setAppointmentDialog((prev) => ({ ...prev, note: event.target.value }))}
                                placeholder="รายละเอียดเพิ่มเติม เช่น ลิงก์ประชุม หรือสถานที่นัดหมาย..."
                                className="w-full box-border rounded-xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 resize-none h-20 text-slate-700 bg-slate-50/70 focus:bg-white transition"
                            />
                        </div>

                        {/* เอกสารการนิเทศ */}
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <label className="text-xs font-semibold text-slate-600 m-0">เอกสารนิเทศ (PDF/PNG/JPG ≤ 10MB)</label>
                                <div className="relative">
                                    <select
                                        value={docUpload.docType}
                                        onChange={(e) => setDocUpload((prev) => ({ ...prev, docType: e.target.value }))}
                                        className="appearance-none h-8 pl-3 pr-8 text-[11px] text-slate-600 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/15 cursor-pointer"
                                    >
                                        {ALLOWED_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            <label
                                onDragOver={(e) => { e.preventDefault(); setDocUpload((prev) => ({ ...prev, dragOver: true })); }}
                                onDragLeave={() => setDocUpload((prev) => ({ ...prev, dragOver: false }))}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDocUpload((prev) => ({ ...prev, dragOver: false }));
                                    uploadSupervisionDoc(e.dataTransfer.files?.[0]);
                                }}
                                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition cursor-pointer ${
                                    docUpload.dragOver ? 'border-violet-400 bg-violet-50/60' : 'border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30'
                                }`}
                            >
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    onChange={(e) => { uploadSupervisionDoc(e.target.files?.[0]); e.target.value = ''; }}
                                />
                                {docUpload.uploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                                        <span className="text-[11px] text-violet-600 font-semibold">กำลังอัปโหลด... {docUpload.progress}%</span>
                                        <div className="w-full max-w-[220px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${docUpload.progress}%` }} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-slate-400" />
                                        <span className="text-[11px] text-slate-500">ลากไฟล์มาวาง หรือ <span className="text-violet-600 font-semibold">คลิกเลือกไฟล์</span></span>
                                    </>
                                )}
                            </label>

                            {activeDocs.length > 0 && (
                                <ul className="mt-2.5 space-y-1.5">
                                    {activeDocs.map((doc) => (
                                        <li key={doc.id} className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2">
                                            <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-medium text-slate-700 truncate m-0">{doc.name}</p>
                                                <p className="text-[10px] text-slate-400 m-0">{doc.type} • {(doc.size / 1024 / 1024).toFixed(1)} MB</p>
                                            </div>
                                            <a
                                                href={docFileUrl(doc.url)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 no-underline shrink-0"
                                            >
                                                เปิดดู
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => deleteSupervisionDoc(doc)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer border-none bg-transparent shrink-0"
                                                aria-label="ลบเอกสาร"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
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
