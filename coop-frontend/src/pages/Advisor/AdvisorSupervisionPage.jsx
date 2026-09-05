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
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
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
    TextField,
    Typography,
} from '@mui/material';
import { STAT_EMOJI } from '../../utils/statEmojis';
import '../Admin/Dashboard/AdminDashboardPage.css';
import AdvisorSidebar from '../../components/AdvisorSidebar';
import UserProfileMenu from '../../components/UserProfileMenu';
import StatCard from '../../components/StatCard';

const AdvisorSupervisionPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [advisorName, setAdvisorName] = useState('');
    const [advisorDept, setAdvisorDept] = useState('');
    const [supervisionRows, setSupervisionRows] = useState([]);
    const [appointmentDialog, setAppointmentDialog] = useState({
        open: false,
        requestId: null,
        date: '',
        mode: 'Online',
        note: ''
    });
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

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

    const loadSupervisionRows = async (dept) => {
        try {
            const res = await api.get('/requests');
            const allRequests = res.data.data || [];
            const activeStatuses = ['อนุมัติแล้ว', 'ออกฝึกงาน', 'ฝึกงานเสร็จแล้ว'];
            const filtered = allRequests.filter((request) => {
                const sameDept = dept ? (request.department || '') === dept : true;
                return sameDept && activeStatuses.includes(request.status);
            });
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
        setAdvisorName(user.name || user.full_name || 'อาจารย์ที่ปรึกษา');
        setAdvisorDept(dept);
        loadSupervisionRows(dept);
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
            note: request.supervisionAppointment?.note || ''
        });
    };

    const closeAppointmentDialog = () => {
        setAppointmentDialog({
            open: false,
            requestId: null,
            date: '',
            mode: 'Online',
            note: ''
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
                note: appointmentDialog.note
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
            <div className="mobile-top-navbar">
                <Link to="/" className="mobile-top-logo" aria-label="LASC Home">
                    <img src={lascLogo} alt="LASC Logo" />
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '8px' }}>
                    <UserProfileMenu />
                    <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>
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
                        { title: 'นักศึกษาที่ดูแลทั้งหมด', value: summary.totalStudents, icon: STAT_EMOJI.TOTAL, color: '#3b82f6' },
                        { title: 'รอนัดนิเทศ', value: summary.pendingSchedule, icon: STAT_EMOJI.PENDING, color: '#f59e0b' },
                        { title: 'นิเทศสัปดาห์นี้', value: summary.thisWeek, icon: STAT_EMOJI.CALENDAR, color: '#0284c7' },
                        { title: 'ยังไม่ประเมิน', value: summary.pendingEvaluation, icon: STAT_EMOJI.NOTE, color: '#10b981' },
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
                                                        {request.supervisionAppointment?.note && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                หมายเหตุ: {request.supervisionAppointment.note}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                                                        {request.supervisionAppointment?.date ? (
                                                            <Button size="small" variant="outlined" color="info" onClick={() => openAppointmentDialog(request)}>
                                                                แก้ไขวันนัด
                                                            </Button>
                                                        ) : (
                                                            <Button size="small" variant="outlined" onClick={() => openAppointmentDialog(request)}>
                                                                กำหนดวันนิเทศ
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            size="small" 
                                                            variant={(supervisionStatus === 'นิเทศเสร็จสิ้น' || supervisionStatus === 'นิเทศแล้ว' || request.hasAdvisorEval) ? 'outlined' : 'contained'} 
                                                            color={(supervisionStatus === 'นิเทศเสร็จสิ้น' || supervisionStatus === 'นิเทศแล้ว' || request.hasAdvisorEval) ? 'success' : 'primary'}
                                                            onClick={() => navigate(`/advisor-dashboard/supervision/evaluate/${request.id}`)}
                                                        >
                                                            {(supervisionStatus === 'นิเทศเสร็จสิ้น' || supervisionStatus === 'นิเทศแล้ว' || request.hasAdvisorEval) ? 'นิเทศเสร็จสิ้น' : 'บันทึกผลนิเทศ'}
                                                        </Button>
                                                    </Stack>
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

            <Dialog open={appointmentDialog.open} onClose={closeAppointmentDialog} fullWidth maxWidth="sm">
                <DialogTitle>กำหนดวันนิเทศ</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            type="date"
                            label="วันที่นิเทศ"
                            value={appointmentDialog.date}
                            onChange={(event) => setAppointmentDialog((prev) => ({ ...prev, date: event.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            select
                            fullWidth
                            label="รูปแบบ"
                            value={appointmentDialog.mode}
                            onChange={(event) => setAppointmentDialog((prev) => ({ ...prev, mode: event.target.value }))}
                        >
                            <MenuItem value="Online">Online</MenuItem>
                            <MenuItem value="Onsite">Onsite</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="หมายเหตุ"
                            value={appointmentDialog.note}
                            onChange={(event) => setAppointmentDialog((prev) => ({ ...prev, note: event.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeAppointmentDialog}>ยกเลิก</Button>
                    <Button variant="contained" onClick={saveAppointment}>บันทึก</Button>
                </DialogActions>
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
