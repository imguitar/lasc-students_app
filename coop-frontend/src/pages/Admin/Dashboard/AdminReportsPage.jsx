import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lascLogo from '../../../assets/LASC-SSKRU-1.png';
import api from '../../../api/axios';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Paper,
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
import './AdminDashboardPage.css';
import './AdminReportsPage.css';
import AdminSidebar from '../../../components/AdminSidebar';
import UserProfileMenu from '../../../components/UserProfileMenu';
import NotificationBell from '../../../components/NotificationBell';
import DateTimeIndicator from '../../../components/DateTimeIndicator';
import StatCard from '../../../components/StatCard';
import { STAT_EMOJI } from '../../../utils/statEmojis';

const AdminReportsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [successDeptFilter, setSuccessDeptFilter] = useState('all');
  const [successYear, setSuccessYear] = useState('');
  const statusPieRef = useRef(null);
  const departmentBarRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    api.get('/requests').then(res => {
      setRequests(res.data.data || []);
    }).catch(err => console.error('Failed to load requests:', err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const departments = [
    'all',
    'สาขาวิชาวิทยาการคอมพิวเตอร์',
    'สาขาวิชาเทคโนโลยีคอมพิวเตอร์และดิจิทัล',
    'สาขาวิชาสาธารณสุขชุมชน',
    'สาขาวิชาวิทยาศาสตร์การกีฬา',
    'สาขาวิชาเทคโนโลยีการเกษตร',
    'สาขาวิชาเทคโนโลยีและนวัตกรรมอาหาร',
    'สาขาวิชาอาชีวอนามัยและความปลอดภัย',
    'สาขาวิชาวิศวกรรมซอฟต์แวร์และปัญญาประดิษฐ์',
    'สาขาวิชาวิศวกรรมโลจิสติกส์',
    'สาขาวิศวกรรมการจัดการอุตสาหกรรมและสิ่งแวดล้อม',
    'สาขาวิชาการออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ',
    'สาขาวิชาเทคโนโลยีโยธาและสถาปัตยกรรม'
  ];

  const companies = useMemo(() => {
    const values = new Set();
    requests.forEach((req) => values.add(req.company || 'ไม่ระบุ'));
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b, 'th-TH'))];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    return requests.filter((req) => {
      const reqDate = parseDate(req.submittedDate);
      const reqDepartment = req.department || 'ไม่ระบุ';
      const reqCompany = req.company || 'ไม่ระบุ';

      if (departmentFilter !== 'all' && reqDepartment !== departmentFilter) return false;
      if (companyFilter !== 'all' && reqCompany !== companyFilter) return false;
      if (start && (!reqDate || reqDate < start)) return false;
      if (end && (!reqDate || reqDate > end)) return false;
      return true;
    });
  }, [requests, startDate, endDate, departmentFilter, companyFilter]);

  const statusDistribution = useMemo(() => {
    const map = {};
    filteredRequests.forEach((req) => {
      const key = req.status || 'ไม่ระบุ';
      map[key] = (map[key] || 0) + 1;
    });
    const statusColor = (status) => {
      if (!status || status === 'ไม่ระบุ') return '#e2e8f0';
      if (status.includes('ไม่อนุมัติ') || status.includes('ปฏิเสธ') || status.includes('แก้ไข')) return '#f43f5e';
      if (status.includes('อนุมัติแล้ว') || status.includes('ออกฝึกงาน') || status.includes('ฝึกงานเสร็จแล้ว')) return '#10b981';
      if (status.includes('รอสถานประกอบการ')) return '#6366f1';
      if (status.includes('รอ')) return '#8b5cf6';
      return '#7c3aed';
    };

    return Object.entries(map)
      .map(([status, total]) => ({ status, total, color: statusColor(status) }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRequests]);

  const monthlyStats = useMemo(() => {
    const map = {};
    filteredRequests.forEach((req) => {
      const date = new Date(req.submittedDate);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });

    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const [year, month] = key.split('-').map(Number);
        return {
          key,
          label: new Date(year, month - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }),
          total: map[key],
        };
      });
  }, [filteredRequests]);

  const yearlyStats = useMemo(() => {
    const stats = {};
    filteredRequests.forEach(req => {
      const date = new Date(req.submittedDate);
      const year = date.getFullYear();
      if (!Number.isNaN(year)) {
        stats[year] = (stats[year] || 0) + 1;
      }
    });
    return Object.entries(stats).map(([year, total]) => ({ year, total })).sort((a, b) => b.year - a.year);
  }, [filteredRequests]);

  const availableYears = useMemo(() => {
    const years = new Set();
    requests.forEach(req => {
      const d = new Date(req.submittedDate);
      if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
    });
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    return sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()];
  }, [requests]);

  useEffect(() => {
    if (!successYear && availableYears.length > 0) {
       setSuccessYear(availableYears[0].toString());
    }
  }, [availableYears, successYear]);

  const successfulInterns = useMemo(() => {
    return requests.filter(req => {
      if (req.status !== 'ฝึกงานเสร็จแล้ว') return false;
      
      const reqDept = req.department || 'ไม่ระบุ';
      if (successDeptFilter !== 'all' && reqDept !== successDeptFilter) return false;
      
      const d = new Date(req.submittedDate);
      if (successYear && !Number.isNaN(d.getTime())) {
         if (d.getFullYear().toString() !== successYear) return false;
      }
      return true;
    });
  }, [requests, successDeptFilter, successYear]);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "รหัสนักศึกษา,ชื่อ-นามสกุล,สาขา,บริษัท,วันที่ยื่น\n";
    
    successfulInterns.forEach(req => {
      const row = [
        req.studentId || '',
        req.studentName || '',
        req.department || '',
        req.company || '',
        req.submittedDate ? new Date(req.submittedDate).toLocaleDateString('th-TH') : ''
      ].map(e => `"${e}"`).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "successful_interns_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departmentStats = useMemo(() => {
    const map = {};
    filteredRequests.forEach((req) => {
      const key = req.department || 'ไม่ระบุ';
      map[key] = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .map(([department, total]) => ({ department, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRequests]);

  const summary = useMemo(() => {
    const approved = filteredRequests.filter((req) => req.status === 'อนุมัติแล้ว').length;
    const pending = filteredRequests.filter((req) => req.status === 'รอผู้ดูแลระบบตรวจสอบ' || req.status === 'รอผู้ดูแลระบบอนุมัติ').length;
    const rejected = filteredRequests.filter((req) => req.status.includes('ไม่อนุมัติ') || req.status === 'ปฏิเสธ').length;
    return { total: filteredRequests.length, approved, pending, rejected };
  }, [filteredRequests]);

  

  useLayoutEffect(() => {
    if (!statusPieRef.current) return undefined;

    const root = am5.Root.new(statusPieRef.current);
    if (root._logo) root._logo.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(72),
      }),
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        name: 'Status',
        valueField: 'value',
        categoryField: 'category',
        tooltip: am5.Tooltip.new(root, {
          labelText: '{category}: {value} คำร้อง ({valuePercentTotal.formatNumber(\'0.0\')}%)',
        }),
      }),
    );

    const pieData = statusDistribution.map((item) => ({
      category: item.status,
      value: item.total,
      sliceSettings: {
        fill: am5.color(item.color),
        stroke: am5.color('#ffffff'),
        strokeWidth: 2,
      },
    }));

    series.data.setAll(pieData);
    series.slices.template.setAll({
      templateField: 'sliceSettings',
      tooltipText: '{category}: {value} คำร้อง ({valuePercentTotal.formatNumber(\'0.0\')}%)',
      cornerRadius: 4,
    });
    series.labels.template.set('forceHidden', true);
    series.ticks.template.set('forceHidden', true);

    const pieTooltip = series.get('tooltip');
    if (pieTooltip) {
      pieTooltip.get('background').setAll({
        fill: am5.color('#1e1b4b'),
        fillOpacity: 0.95,
        strokeOpacity: 0,
      });
      pieTooltip.label.setAll({ fill: am5.color('#ffffff'), fontSize: 12 });
    }

    return () => {
      root.dispose();
    };
  }, [statusDistribution]);

  

  useLayoutEffect(() => {
    if (!departmentBarRef.current) return undefined;

    const root = am5.Root.new(departmentBarRef.current);
    if (root._logo) root._logo.dispose();
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: 'none',
        wheelY: 'none',
        paddingLeft: 0,
      }),
    );

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: 'department',
        renderer: am5xy.AxisRendererY.new(root, { minGridDistance: 24 }),
      }),
    );

    const yRenderer = yAxis.get('renderer');
    yRenderer.labels.template.setAll({
      oversizedBehavior: 'truncate',
      maxWidth: 140,
      fontSize: 12,
      fill: am5.color('#475569'),
    });
    yRenderer.grid.template.setAll({ strokeOpacity: 0 });

    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        renderer: am5xy.AxisRendererX.new(root, {}),
        numberFormat: '#',
        maxPrecision: 0,
      }),
    );

    const xRenderer = xAxis.get('renderer');
    xRenderer.grid.template.setAll({ stroke: am5.color('#f1f5f9'), strokeOpacity: 1 });
    xRenderer.labels.template.setAll({ fontSize: 11, fill: am5.color('#94a3b8') });

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'สาขา',
        xAxis,
        yAxis,
        valueXField: 'total',
        categoryYField: 'department',
        tooltip: am5.Tooltip.new(root, { labelText: '{categoryY}: {valueX} คำร้อง' }),
      }),
    );

    const barGradient = am5.LinearGradient.new(root, {
      rotation: 0,
      stops: [
        { color: am5.color('#7c3aed') },
        { color: am5.color('#6366f1') },
      ],
    });

    series.columns.template.setAll({
      cornerRadiusTR: 8,
      cornerRadiusBR: 8,
      fillGradient: barGradient,
      strokeOpacity: 0,
      height: am5.percent(55),
      tooltipText: '{categoryY}: {valueX} คำร้อง',
    });

    const barTooltip = series.get('tooltip');
    if (barTooltip) {
      barTooltip.get('background').setAll({
        fill: am5.color('#1e1b4b'),
        fillOpacity: 0.95,
        strokeOpacity: 0,
      });
      barTooltip.label.setAll({ fill: am5.color('#ffffff'), fontSize: 12 });
    }

    yAxis.data.setAll(departmentStats);
    series.data.setAll(departmentStats);

    return () => {
      root.dispose();
    };
  }, [departmentStats]);

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

      <AdminSidebar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        currentPath="/admin-dashboard/reports"
        handleLogout={handleLogout}
      />

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>รายงานเชิงวิเคราะห์</h1>
            <p>ตารางเต็ม, ฟิลเตอร์ละเอียด, กราฟหลายแบบ และสถิติรายเดือน/รายปี</p>
          </div>
        </header>

        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Filter ละเอียด</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' },
              gap: 1.5,
            }}
          >
            <TextField
              label="วันที่เริ่ม"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              fullWidth
            />
            <TextField
              label="วันที่สิ้นสุด"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="สาขา"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              fullWidth
            >
              {departments.map((item) => (
                <MenuItem key={item} value={item}>{item === 'all' ? 'ทั้งหมด' : item}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="บริษัท"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              fullWidth
            >
              {companies.map((item) => (
                <MenuItem key={item} value={item}>{item === 'all' ? 'ทั้งหมด' : item}</MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setDepartmentFilter('all');
                setCompanyFilter('all');
              }}
              sx={{ minHeight: 56 }}
            >
              ล้างตัวกรอง
            </Button>
          </Box>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 2,
          }}
        >
          {[
            { label: 'คำร้องทั้งหมด', value: summary.total, color: '#6366f1', icon: STAT_EMOJI.TOTAL },
            { label: 'รอตรวจสอบ', value: summary.pending, color: '#8b5cf6', icon: STAT_EMOJI.PENDING },
            { label: 'อนุมัติแล้ว', value: summary.approved, color: '#10b981', icon: STAT_EMOJI.APPROVED },
            { label: 'ไม่อนุมัติ', value: summary.rejected, color: '#f43f5e', icon: STAT_EMOJI.REJECTED },
          ].map((card) => (
            <StatCard
              key={card.label}
              title={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '1.4fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{ border: '1px solid rgba(237, 233, 254, 0.8)', borderRadius: '1.5rem', p: 3, bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#111827' }}>กราฟสัดส่วนสถานะคำร้องฝึกงาน</Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 1 }}>สัดส่วนสถานะตามตัวกรองที่เลือก</Typography>
            {statusDistribution.length > 0 ? (
              <>
                <Box sx={{ position: 'relative', height: { xs: 220, sm: 260 }, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box ref={statusPieRef} sx={{ position: 'absolute', inset: 0 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography sx={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
                      {summary.total}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#9ca3af' }}>
                      คำร้องทั้งหมด
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    mt: 2.5,
                    pt: 2,
                    borderTop: '1px solid #f3f4f6',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                  }}
                >
                  {statusDistribution.map((item) => (
                    <Box
                      key={item.status}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        p: 1,
                        borderRadius: '0.75rem',
                        bgcolor: 'rgba(249, 250, 251, 0.8)',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: 'rgba(245, 243, 255, 0.6)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '9999px', flexShrink: 0, bgcolor: item.color }} />
                        <Typography
                          component="span"
                          sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {item.status}
                        </Typography>
                      </Box>
                      <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                        {item.total}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  minHeight: 240,
                  borderRadius: 2,
                  border: '1px dashed #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 14,
                  fontWeight: 500,
                  background: '#f8fafc',
                }}
              >
                ยังไม่มีข้อมูล
              </Box>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{ border: '1px solid rgba(237, 233, 254, 0.8)', borderRadius: '1.5rem', p: 3, bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#111827' }}>กราฟจำนวนคำร้องแยกตามสาขาวิชา</Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mb: 1 }}>แตะแท่งกราฟเพื่อดูชื่อสาขาเต็มและจำนวนคำร้อง</Typography>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <Box
                ref={departmentBarRef}
                sx={{
                  width: '100%',
                  minWidth: 280,
                  height: Math.max(280, departmentStats.length * 44),
                }}
              />
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>สถิติรายเดือน</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เดือน</TableCell>
                    <TableCell align="right">จำนวนคำร้อง</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyStats.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {monthlyStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">ไม่มีข้อมูล</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>สถิติรายปี</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ปี</TableCell>
                    <TableCell align="right">จำนวนคำร้อง</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {yearlyStats.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell>{row.year}</TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                    </TableRow>
                  ))}
                  {yearlyStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">ไม่มีข้อมูล</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, mt: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              สรุปผลนักศึกษาที่ฝึกงานสำเร็จ
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="สาขา"
                value={successDeptFilter}
                onChange={(e) => setSuccessDeptFilter(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {departments.map((dept) => (
                  <MenuItem key={`success-dept-${dept}`} value={dept}>
                    {dept === 'all' ? 'ทั้งหมด' : dept}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="ปี"
                value={successYear}
                onChange={(e) => setSuccessYear(e.target.value)}
                sx={{ minWidth: 100 }}
              >
                {availableYears.map((year) => (
                  <MenuItem key={`success-year-${year}`} value={year.toString()}>
                    {year + 543}
                  </MenuItem>
                ))}
              </TextField>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={exportToCSV}
                disabled={successfulInterns.length === 0}
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, boxShadow: 'none', height: '40px' }}
              >
                Export เป็น CSV
              </Button>
            </Box>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>รหัสนักศึกษา</TableCell>
                  <TableCell>ชื่อ-นามสกุล</TableCell>
                  <TableCell>สาขา</TableCell>
                  <TableCell>บริษัท</TableCell>
                  <TableCell>วันที่ยื่น</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {successfulInterns.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.studentId}</TableCell>
                    <TableCell>{req.studentName}</TableCell>
                    <TableCell>{req.department}</TableCell>
                    <TableCell>{req.company}</TableCell>
                    <TableCell>{new Date(req.submittedDate).toLocaleDateString('th-TH')}</TableCell>
                  </TableRow>
                ))}
                {successfulInterns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">ไม่มีข้อมูลนักศึกษาที่ฝึกงานสำเร็จ</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </main>
    </div>
  );
};

export default AdminReportsPage;