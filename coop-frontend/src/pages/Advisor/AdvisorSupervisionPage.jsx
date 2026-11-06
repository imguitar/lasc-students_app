import { ModalActions, ModalCancelButton, ModalConfirmButton } from '../../components/ModalActions';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Building2, Calendar, CalendarCheck, CalendarClock, CalendarDays, ChevronDown, ClipboardCheck, MoreVertical, Users, Video, MapPin, X, FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import '../Admin/Dashboard/AdminDashboardPage.css';
import StatCard from '../../components/StatCard';

const AdvisorSupervisionPage = () => {
    const navigate = useNavigate();
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

    const fileToDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const [docModal, setDocModal] = useState({
        open: false,
        request: null,
        file: null,
        docName: '',
        submitting: false,
        error: ''
    });

    const openDocModal = (request) => {
        setDocModal({
            open: true,
            request,
            file: null,
            docName: '',
            submitting: false,
            error: ''
        });
    };

    const closeDocModal = () => {
        setDocModal({
            open: false,
            request: null,
            file: null,
            docName: '',
            submitting: false,
            error: ''
        });
    };

    const handleUploadDoc = async () => {
        if (!docModal.file) {
            setDocModal((prev) => ({ ...prev, error: 'กรุณาเลือกไฟล์เอกสาร (PDF, PNG หรือ JPG)' }));
            return;
        }

        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(docModal.file.type)) {
            setDocModal((prev) => ({ ...prev, error: 'รองรับเฉพาะไฟล์ PDF, PNG หรือ JPG เท่านั้น' }));
            return;
        }

        if (docModal.file.size > 10 * 1024 * 1024) {
            setDocModal((prev) => ({ ...prev, error: 'ขนาดไฟล์ต้องไม่เกิน 10MB' }));
            return;
        }

        setDocModal((prev) => ({ ...prev, submitting: true, error: '' }));
        try {
            const dataUrl = await fileToDataUrl(docModal.file);
            const docName = docModal.docName.trim() || docModal.file.name;
            const res = await api.post(`/requests/${docModal.request.id}/supervision-documents`, {
                document_name: docName,
                document_type: 'เอกสารนิเทศ',
                data_url: dataUrl
            });

            const newDoc = res.data?.data || {
                id: Date.now().toString(),
                name: docName,
                url: dataUrl,
                uploadedAt: new Date().toISOString()
            };

            persistRequests((allRequests) =>
                allRequests.map((req) => {
                    if (req.id !== docModal.request.id) return req;
                    const prevAppt = req.supervisionAppointment || {};
                    const prevDocs = Array.isArray(prevAppt.documents) ? prevAppt.documents : [];
                    return {
                        ...req,
                        supervisionAppointment: {
                            ...prevAppt,
                            documents: [...prevDocs, newDoc]
                        }
                    };
                })
            );

            setDocModal((prev) => ({
                ...prev,
                file: null,
                docName: '',
                submitting: false,
                request: {
                    ...prev.request,
                    supervisionAppointment: {
                        ...(prev.request?.supervisionAppointment || {}),
                        documents: [...(prev.request?.supervisionAppointment?.documents || []), newDoc]
                    }
                }
            }));

            setToast({ open: true, message: 'แนบเอกสารนิเทศเรียบร้อยแล้ว', severity: 'success' });
        } catch (err) {
            setDocModal((prev) => ({
                ...prev,
                submitting: false,
                error: err.response?.data?.message || err.message || 'แนบเอกสารไม่สำเร็จ'
            }));
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm('ยืนยันที่จะลบเอกสารนิเทศฉบับนี้หรือไม่?')) return;
        try {
            await api.delete(`/requests/${docModal.request.id}/supervision-documents/${docId}`);
            persistRequests((allRequests) =>
                allRequests.map((req) => {
                    if (req.id !== docModal.request.id) return req;
                    const prevAppt = req.supervisionAppointment || {};
                    const prevDocs = Array.isArray(prevAppt.documents) ? prevAppt.documents : [];
                    return {
                        ...req,
                        supervisionAppointment: {
                            ...prevAppt,
                            documents: prevDocs.filter((d) => d.id !== docId)
                        }
                    };
                })
            );

            setDocModal((prev) => ({
                ...prev,
                request: {
                    ...prev.request,
                    supervisionAppointment: {
                        ...(prev.request?.supervisionAppointment || {}),
                        documents: (prev.request?.supervisionAppointment?.documents || []).filter((d) => d.id !== docId)
                    }
                }
            }));

            setToast({ open: true, message: 'ลบเอกสารเรียบร้อยแล้ว', severity: 'success' });
        } catch (err) {
            setToast({
                open: true,
                message: 'เกิดข้อผิดพลาดในการลบเอกสาร: ' + (err.response?.data?.message || err.message),
                severity: 'error'
            });
        }
    };

    const saveAppointment = async () => {
        if (!appointmentDialog.date) {
            setToast({ open: true, message: 'กรุณาเลือกวันที่นิเทศ', severity: 'warning' });
            return;
        }

        try {
            const currentReq = supervisionRows.find((r) => r.id === appointmentDialog.requestId);
            const currentDocList = currentReq?.supervisionAppointment?.documents || [];

            // ส่งเฉพาะข้อมูลการนัดหมายตาม Requirement ของอาจารย์ที่ปรึกษา ({ advisor_id, supervision_date, supervision_type, note })
            await api.patch(`/requests/${appointmentDialog.requestId}/appointment`, {
                advisor_id: appointmentDialog.advisorId,
                supervision_date: appointmentDialog.date,
                supervision_type: appointmentDialog.mode,
                note: appointmentDialog.note,
                date: appointmentDialog.date,
                mode: appointmentDialog.mode,
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
                                    documents: currentDocList,
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

    const activeDialogRequest = supervisionRows.find((r) => r.id === appointmentDialog.requestId);

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
        <>

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
                                                        {Array.isArray(request.supervisionAppointment?.documents) && request.supervisionAppointment.documents.length > 0 && (
                                                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                                {request.supervisionAppointment.documents.map((doc) => (
                                                                    <a
                                                                        key={doc.id || doc.url}
                                                                        href={doc.url?.startsWith('http') || doc.url?.startsWith('data:') ? doc.url : `http://localhost:5002${doc.url}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200/80 rounded-md px-2 py-0.5 w-fit no-underline transition"
                                                                    >
                                                                        <FileText className="w-3 h-3 text-violet-600 shrink-0" />
                                                                        <span className="truncate max-w-[120px]">{doc.name || 'เอกสารนิเทศ'}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
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
                                            {Array.isArray(request.supervisionAppointment?.documents) && request.supervisionAppointment.documents.length > 0 && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                    <FileText className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                                    <span className="font-semibold text-violet-700">เอกสาร:</span>
                                                    {request.supervisionAppointment.documents.map((doc) => (
                                                        <a
                                                            key={doc.id || doc.url}
                                                            href={doc.url?.startsWith('http') || doc.url?.startsWith('data:') ? doc.url : `http://localhost:5002${doc.url}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-violet-600 hover:text-violet-800 underline text-xs"
                                                        >
                                                            {doc.name || 'ดูเอกสาร'}
                                                        </a>
                                                    ))}
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
                        <MenuItem
                            key="documents"
                            onClick={() => { if (req) openDocModal(req); closeActionMenu(); }}
                            sx={{ fontSize: '0.8125rem', fontWeight: 600, gap: 1.25, py: 1.25, color: '#334155' }}
                        >
                            <FileText className="w-4 h-4 text-violet-600" />
                            {req?.supervisionAppointment?.documents?.length ? 'จัดการเอกสารนิเทศ' : 'แนบเอกสารนิเทศ'}
                            {req?.supervisionAppointment?.documents?.length > 0 && (
                                <span className="text-[10px] font-bold text-violet-700 bg-violet-100/80 px-1.5 py-0.5 rounded-full ml-auto">
                                    {req.supervisionAppointment.documents.length}
                                </span>
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
                    className: '!rounded-3xl !shadow-[0_24px_64px_-12px_rgba(76,29,149,0.25)]',
                    sx: { overflow: 'hidden', bgcolor: '#FAFAFD', border: '1px solid #E9E5F5' }
                }}
            >
                <div aria-hidden="true" style={{ height: 3, background: '#4C1D95', flexShrink: 0 }} />
                <div aria-hidden="true" style={{ height: 2, background: '#EAB308', flexShrink: 0 }} />
                <div className="px-6 pt-5 pb-4 border-b border-[#E9E5F5] flex items-start justify-between gap-3">
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
                                    className="w-full appearance-none h-11 pl-3.5 pr-10 text-base md:text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition cursor-pointer"
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
                                    className="w-full box-border h-11 px-3.5 text-base md:text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">รูปแบบการนิเทศ</label>
                                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                                    {[
                                        { value: 'Online', icon: <Video className="w-4 h-4" /> },
                                        { value: 'Onsite', icon: <MapPin className="w-4 h-4" /> },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setAppointmentDialog((prev) => ({ ...prev, mode: opt.value }))}
                                            style={appointmentDialog.mode === opt.value ? { background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)', borderColor: '#EAB308' } : undefined}
                                            className={`h-11 sm:h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                                                appointmentDialog.mode === opt.value
                                                    ? 'text-white shadow-sm'
                                                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700'
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
                                className="w-full box-border rounded-xl border border-slate-200 p-3 text-base md:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 resize-none h-20 text-slate-700 bg-slate-50/70 focus:bg-white transition"
                            />
                        </div>

                    </div>
                </DialogContent>

                <div className="px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-[#E9E5F5]">
                    <ModalActions className="!pt-0 !mt-0 !border-0 w-full">
                        <ModalCancelButton onClick={closeAppointmentDialog}>ยกเลิก</ModalCancelButton>
                        <ModalConfirmButton tone="confirm" onClick={saveAppointment}>บันทึกการนัดหมาย</ModalConfirmButton>
                    </ModalActions>
                </div>
            </Dialog>

            {/* Modal จัดการและแนบเอกสารนิเทศแยกต่างหาก (Separate Document Attachment Modal) */}
            <Dialog
                open={docModal.open}
                onClose={closeDocModal}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    className: '!rounded-3xl !shadow-[0_24px_64px_-12px_rgba(76,29,149,0.25)]',
                    sx: { overflow: 'hidden', bgcolor: '#FAFAFD', border: '1px solid #E9E5F5' }
                }}
            >
                <div aria-hidden="true" style={{ height: 3, background: '#4C1D95', flexShrink: 0 }} />
                <div aria-hidden="true" style={{ height: 2, background: '#EAB308', flexShrink: 0 }} />
                <div className="px-6 pt-5 pb-4 border-b border-[#E9E5F5] flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-violet-100/70 border border-violet-200/80 flex items-center justify-center shrink-0 shadow-sm">
                            <FileText className="w-5 h-5 text-violet-700" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 m-0">แนบเอกสารนิเทศงาน</h3>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                จัดการเอกสารสำหรับ {docModal.request?.studentName || '-'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeDocModal}
                        className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer border-none bg-transparent"
                        aria-label="ปิด"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <DialogContent sx={{ px: 3, py: 2.5 }}>
                    <div className="space-y-4">
                        {/* รายการเอกสารที่แนบไว้แล้ว */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 mb-2 block">
                                เอกสารที่แนบไว้แล้ว ({docModal.request?.supervisionAppointment?.documents?.length || 0})
                            </label>
                            {(!docModal.request?.supervisionAppointment?.documents || docModal.request.supervisionAppointment.documents.length === 0) ? (
                                <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                    ยังไม่มีเอกสารนิเทศที่แนบไว้
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {docModal.request.supervisionAppointment.documents.map((doc) => (
                                        <div
                                            key={doc.id || doc.url}
                                            className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs gap-3"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate m-0">{doc.name || 'เอกสารนิเทศ'}</p>
                                                    <p className="text-[11px] text-slate-400 m-0">
                                                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('th-TH') : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <a
                                                    href={doc.url?.startsWith('http') || doc.url?.startsWith('data:') ? doc.url : `http://localhost:5002${doc.url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-violet-600 transition"
                                                    title="เปิดดูเอกสาร"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDoc(doc.id)}
                                                    className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition cursor-pointer border-none bg-transparent"
                                                    title="ลบเอกสาร"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* กล่องแนบเอกสารใหม่ */}
                        <div className="pt-3 border-t border-slate-100">
                            <label className="text-xs font-semibold text-slate-700 mb-2 block">
                                แนบเอกสารใหม่ (PDF/PNG/JPG ≤ 10MB)
                            </label>

                            {docModal.error && (
                                <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-200/80 rounded-xl p-2.5">
                                    {docModal.error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <input
                                        type="text"
                                        value={docModal.docName}
                                        onChange={(e) => setDocModal((prev) => ({ ...prev, docName: e.target.value }))}
                                        placeholder="ชื่อเอกสาร (เช่น หนังสือนิเทศก์, กำหนดการนัดหมาย)..."
                                        className="w-full box-border h-11 px-3.5 text-base md:text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition"
                                    />
                                </div>

                                <div className="border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/30 rounded-2xl p-4 text-center transition cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".pdf,image/png,image/jpeg,image/jpg"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) {
                                                setDocModal((prev) => ({
                                                    ...prev,
                                                    file: f,
                                                    docName: prev.docName || f.name.replace(/\.[^/.]+$/, ''),
                                                    error: ''
                                                }));
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100/80 text-violet-700 flex items-center justify-center">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">
                                            {docModal.file ? docModal.file.name : 'คลิกหรือลากไฟล์เอกสารมาวางที่นี่'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            รองรับไฟล์ PDF, PNG, JPG ขนาดไม่เกิน 10MB
                                        </span>
                                    </div>
                                </div>

                                {docModal.file && (
                                    <button
                                        type="button"
                                        onClick={handleUploadDoc}
                                        disabled={docModal.submitting}
                                        style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)' }}
                                        className="w-full min-h-[44px] px-6 rounded-xl text-white text-sm font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition cursor-pointer border-none flex items-center justify-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>{docModal.submitting ? 'กำลังอัปโหลด...' : 'บันทึกเอกสารนิเทศ'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>

                <div className="px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-[#E9E5F5] flex justify-end">
                    <button
                        type="button"
                        onClick={closeDocModal}
                        className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-[#475569] text-sm font-semibold transition cursor-pointer"
                    >
                        ปิดหน้าต่าง
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
        </>
    );
};

export default AdvisorSupervisionPage;
