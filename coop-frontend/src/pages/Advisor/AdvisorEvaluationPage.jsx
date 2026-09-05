import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Divider, Grid, TextField, Button, CircularProgress, Alert, RadioGroup, FormControlLabel, Radio, FormControl, IconButton } from '@mui/material';
import api from '../../api/axios';

const companyQuestions = [
  { id: 'c1', label: '1.1 ความเข้าใจในแนวคิดของการฝึกงานและสหกิจศึกษา - ผู้บริหาร' },
  { id: 'c2', label: '1.2 ความเข้าใจในแนวคิดของการฝึกงานและสหกิจศึกษา - เจ้าหน้าที่ฝ่ายบุคคล' },
  { id: 'c3', label: '1.3 ความเข้าใจในแนวคิดของการฝึกงานและสหกิจศึกษา - พนักงานที่ปรึกษา (Job Supervisor)' },
  { id: 'c4', label: '2.1 ปริมาณงานมีความเหมาะสม' },
  { id: 'c5', label: '2.2 คุณภาพงานตรงตามลักษณะของสาขาวิชาชีพ' },
  { id: 'c6', label: '2.3 ลักษณะงานมีความปลอดภัย ไม่เสี่ยงหรือก่อให้เกิดอันตราย' },
  { id: 'c7', label: '3.1 การประสานงานภายในสถานประกอบการระหว่างฝ่ายบุคคล และ Job Supervisor เป็นไปอย่างมีประสิทธิภาพ' },
  { id: 'c8', label: '3.2 ฝ่ายบุคคล/ผู้ที่เกี่ยวข้อง มีการปฐมนิเทศ แนะนำกฎระเบียบต่างๆ ขององค์กรให้นักศึกษาทราบ' },
  { id: 'c9', label: '3.3 มี Job Supervisor ดูแลนักศึกษาภายในสัปดาห์แรกที่เข้างาน' },
  { id: 'c10', label: '3.4 Job Supervisor มีความรู้ และประสบการณ์ ตรงกับสาขาวิชาชีพของนักศึกษา' },
  { id: 'c11', label: '3.5 Job Supervisor มีเวลาให้แก่นักศึกษาด้านการปฏิบัติงาน' },
  { id: 'c12', label: '3.6 Job Supervisor มอบหมายงาน สอนงาน และให้คำปรึกษาอย่างเหมาะสม' },
  { id: 'c13', label: '3.7 มีการจัดทำแผนการทำงานตลอดระยะเวลาของการปฏิบัติงาน' },
  { id: 'c14', label: '3.8 มีค่าตอบแทนให้นักศึกษาอย่างเหมาะสม' },
  { id: 'c15', label: '3.9 จัดสวัสดิการ (ที่พัก อาหาร รถรับส่ง ฯลฯ) ให้นักศึกษาอย่างเหมาะสม' },
  { id: 'c16', label: '3.10 มีความพร้อมด้านอุปกรณ์ หรือเครื่องมือสำหรับให้นักศึกษาปฏิบัติงาน' },
  { id: 'c17', label: '3.11 ให้ความสำคัญต่อการประเมินผลการปฏิบัติงาน และรายงานของนักศึกษา' },
];

const studentQuestions = [
  { id: 's1', label: '1.1 มีความรับผิดชอบต่องานที่ได้รับมอบหมาย' },
  { id: 's2', label: '1.2 ปฏิบัติงานด้วยความกระตือรือร้น' },
  { id: 's3', label: '1.3 มีการปรับปรุงคุณภาพงานที่ปฏิบัติอยู่เสมอ' },
  { id: 's4', label: '1.4 ใช้เวลาในการทำงานให้เกิดประโยชน์สูงสุด' },
  { id: 's5', label: '1.5 มีการรายงานผลการปฏิบัติงาน' },
  { id: 's6', label: '2.1 ปฏิบัติงานโดยใช้ความรู้ ความสามารถที่มีอยู่อย่างเต็มที่' },
  { id: 's7', label: '2.2 มีความสามารถในการประยุกต์ใช้ความรู้' },
  { id: 's8', label: '2.3 มีความชำนาญในด้านปฏิบัติการ' },
  { id: 's9', label: '2.4 มีความสามารถในการวางแผน จัดลำดับความสำคัญของงาน' },
  { id: 's10', label: '2.5 ใฝ่รู้ สนใจศึกษาหาความรู้ใหม่ๆ เพิ่มเติม' },
  { id: 's11', label: '3.1 ปฏิบัติตามกฎ ระเบียบหรือข้อบังคับขององค์กรโดยเคร่งครัด' },
  { id: 's12', label: '3.2 เข้างานตรงเวลา ไม่เคยขาด ไม่เคยสาย' },
  { id: 's13', label: '3.3 ให้ความเคารพเชื่อฟังผู้บังคับบัญชา' },
  { id: 's14', label: '3.4 มีความขยัน อดทน สู้งาน' },
  { id: 's15', label: '3.5 มีคุณธรรม จริยธรรม เช่น ซื่อสัตย์ สุจริต รักษาความลับองค์กร' },
  { id: 's16', label: '3.6 มีความคิดริเริ่ม สร้างสรรค์' },
  { id: 's17', label: '3.7 มีความมั่นใจในตนเอง กล้าสอบถาม และเสนอความคิดเห็น' },
  { id: 's18', label: '3.8 มีบุคลิกภาพ และวางตัวเหมาะสม เช่น การแต่งกาย กิริยาวาจา วุฒิภาวะ' },
  { id: 's19', label: '3.9 มีความสามารถในการทำงานเป็นทีมร่วมกับผู้อื่น' },
  { id: 's20', label: '3.10 ใช้ทรัพยากรขององค์กรอย่างรู้คุณค่า เช่น ไฟฟ้า วัสดุสิ้นเปลืองต่างๆ' },
];

const AdvisorEvaluationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestData, setRequestData] = useState(null);
  
  const [formData, setFormData] = useState({
    advisorName: '',
    c1: '', c2: '', c3: '', c4: '', c5: '', c6: '', c7: '', c8: '', c9: '', c10: '', c11: '', c12: '', c13: '', c14: '', c15: '', c16: '', c17: '',
    companyComments: '',
    s1: '', s2: '', s3: '', s4: '', s5: '', s6: '', s7: '', s8: '', s9: '', s10: '', s11: '', s12: '', s13: '', s14: '', s15: '', s16: '', s17: '', s18: '', s19: '', s20: '',
    studentComments: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        const advName = user.name || user.full_name || 'อาจารย์ที่ปรึกษา';

        // Get request details
        const reqRes = await api.get(`/requests/${id}`);
        if (!reqRes.data.data) {
          setError('ไม่พบข้อมูลคำร้อง');
          return;
        }
        setRequestData(reqRes.data.data);

        // Get existing evaluation if any
        const evalRes = await api.get(`/advisor-evaluations/request/${id}`);
        if (evalRes.data.data) {
          const d = evalRes.data.data;
          setFormData({
            advisorName: d.advisorName || advName,
            c1: d.c1 ?? '', c2: d.c2 ?? '', c3: d.c3 ?? '', c4: d.c4 ?? '', c5: d.c5 ?? '', c6: d.c6 ?? '', c7: d.c7 ?? '', c8: d.c8 ?? '', c9: d.c9 ?? '', c10: d.c10 ?? '', c11: d.c11 ?? '', c12: d.c12 ?? '', c13: d.c13 ?? '', c14: d.c14 ?? '', c15: d.c15 ?? '', c16: d.c16 ?? '', c17: d.c17 ?? '',
            companyComments: d.companyComments || '',
            s1: d.s1 ?? '', s2: d.s2 ?? '', s3: d.s3 ?? '', s4: d.s4 ?? '', s5: d.s5 ?? '', s6: d.s6 ?? '', s7: d.s7 ?? '', s8: d.s8 ?? '', s9: d.s9 ?? '', s10: d.s10 ?? '', s11: d.s11 ?? '', s12: d.s12 ?? '', s13: d.s13 ?? '', s14: d.s14 ?? '', s15: d.s15 ?? '', s16: d.s16 ?? '', s17: d.s17 ?? '', s18: d.s18 ?? '', s19: d.s19 ?? '', s20: d.s20 ?? '',
            studentComments: d.studentComments || ''
          });
        } else {
          setFormData(prev => ({ ...prev, advisorName: advName }));
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = { ...formData };
    
    // Parse to int or null
    Object.keys(payload).forEach(key => {
      if ((key.startsWith('c') || key.startsWith('s')) && key !== 'companyComments' && key !== 'studentComments') {
        if (payload[key] === '-') {
          payload[key] = null;
        } else if (payload[key] !== '' && payload[key] !== null) {
          payload[key] = parseInt(payload[key], 10);
        } else {
          payload[key] = null;
        }
      }
    });

    try {
      await api.post(`/advisor-evaluations/request/${id}`, payload);
      alert('บันทึกผลการนิเทศสำเร็จ');
      navigate('/advisor-dashboard/supervision');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4, textAlign: 'center' }}><Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>{error}</Alert></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', py: 5, px: { xs: 1, sm: 2 } }}>
      <Paper elevation={0} sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        
        <Box display="flex" alignItems="center" mb={2}>
          <Button onClick={() => navigate('/advisor-dashboard/supervision')} variant="outlined" sx={{ mr: 2 }}>← กลับ</Button>
          <Typography variant="h5" fontWeight="700" sx={{ flexGrow: 1, textAlign: 'center' }}>
            แบบบันทึกการนิเทศการฝึกงานและสหกิจศึกษา<br/>
            <span style={{ fontSize: '1rem', fontWeight: 400 }}>(สำหรับอาจารย์นิเทศ)</span>
          </Typography>
          <Box width={80} /> {/* spacer */}
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <form onSubmit={handleSubmit}>
          {/* ข้อมูลทั่วไป */}
          <Typography variant="h6" fontWeight="600" gutterBottom>ข้อมูลการนิเทศ</Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ชื่อสถานประกอบการ" value={requestData?.companyName || requestData?.company || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ชื่อนักศึกษา" value={requestData?.studentName || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="สาขาวิชา" value={requestData?.department || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ผู้ประเมิน/อาจารย์นิเทศ" name="advisorName" value={formData.advisorName} onChange={handleChange} required />
            </Grid>
          </Grid>

          <Typography variant="body2" color="error" sx={{ mb: 3 }}>
            * 5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด, - = ไม่มีความเห็น
          </Typography>

          {/* ส่วนที่ 2: คุณภาพสถานประกอบการ */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2, mb: 4, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#1976d2', color: '#fff', p: 2 }}>
              <Typography variant="h6" fontWeight="600">ส่วนที่ 1: คุณภาพสถานประกอบการ</Typography>
            </Box>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {companyQuestions.map((q) => (
                <Box key={q.id} sx={{ mb: 2, pb: 2, borderBottom: '1px dashed #e0e0e0' }}>
                  <Typography variant="subtitle1" fontWeight="500" gutterBottom>{q.label}</Typography>
                  <FormControl component="fieldset">
                    <RadioGroup row name={q.id} value={formData[q.id]} onChange={handleChange} sx={{ gap: 2 }}>
                      <FormControlLabel value="5" control={<Radio required />} label="5" />
                      <FormControlLabel value="4" control={<Radio required />} label="4" />
                      <FormControlLabel value="3" control={<Radio required />} label="3" />
                      <FormControlLabel value="2" control={<Radio required />} label="2" />
                      <FormControlLabel value="1" control={<Radio required />} label="1" />
                      <FormControlLabel value="-" control={<Radio required />} label="-" />
                    </RadioGroup>
                  </FormControl>
                </Box>
              ))}
              <TextField 
                fullWidth multiline rows={3} 
                label="ความคิดเห็นเพิ่มเติม (คุณภาพสถานประกอบการ)" 
                name="companyComments" value={formData.companyComments} onChange={handleChange} 
                sx={{ mt: 2 }}
              />
            </Box>
          </Box>

          {/* ส่วนที่ 3: คุณภาพนักศึกษา */}
          <Box sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0', borderRadius: 2, mb: 4, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#2e7d32', color: '#fff', p: 2 }}>
              <Typography variant="h6" fontWeight="600">ส่วนที่ 2: คุณภาพพนักงานศึกษา</Typography>
            </Box>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {studentQuestions.map((q) => (
                <Box key={q.id} sx={{ mb: 2, pb: 2, borderBottom: '1px dashed #e0e0e0' }}>
                  <Typography variant="subtitle1" fontWeight="500" gutterBottom>{q.label}</Typography>
                  <FormControl component="fieldset">
                    <RadioGroup row name={q.id} value={formData[q.id]} onChange={handleChange} sx={{ gap: 2 }}>
                      <FormControlLabel value="5" control={<Radio required />} label="5" />
                      <FormControlLabel value="4" control={<Radio required />} label="4" />
                      <FormControlLabel value="3" control={<Radio required />} label="3" />
                      <FormControlLabel value="2" control={<Radio required />} label="2" />
                      <FormControlLabel value="1" control={<Radio required />} label="1" />
                      <FormControlLabel value="-" control={<Radio required />} label="-" />
                    </RadioGroup>
                  </FormControl>
                </Box>
              ))}
              <TextField 
                fullWidth multiline rows={3} 
                label="ความคิดเห็นเพิ่มเติม (สรุปคุณภาพโดยรวมของนักศึกษา)" 
                name="studentComments" value={formData.studentComments} onChange={handleChange} 
                sx={{ mt: 2 }}
              />
            </Box>
          </Box>

          <Button type="submit" variant="contained" color="primary" size="large" fullWidth disabled={submitting} sx={{ py: 1.5, fontSize: '1.1rem' }}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึกผลการนิเทศ'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default AdvisorEvaluationPage;
