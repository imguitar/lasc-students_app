import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Divider, Grid, TextField, Button, CircularProgress, Alert, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel } from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import api from '../../api/axios';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
const questions = [
  { id: 'q1', label: '1. ปริมาณงาน (Quantity of Work) ปริมาณงานที่ปฏิบัติสำเร็จตามหน้าที่หรือตามที่ได้รับมอบหมายเมื่อเทียบกับเวลาและข้อตกลง' },
  { id: 'q2', label: '2. คุณภาพงาน (Quality of Work) ทำงานได้ถูกต้องครบถ้วนสมบูรณ์ มีความประณีตเรียบร้อย มีความแม่นยำ ไว้ใจได้' },
  { id: 'q3', label: '3. ความรู้ความสามารถทางวิชาการ นักศึกษามีความรู้ทางวิชาการเพียงพอที่จะปฏิบัติงานได้อย่างมีประสิทธิภาพ' },
  { id: 'q4', label: '4. ความสามารถในการเรียนรู้และประยุกต์วิชาการ ความรวดเร็วในการเรียนรู้ เข้าใจข้อมูล ข่าวสาร และวิธีการทำงาน สามารถนำไปประยุกต์ใช้ได้' },
  { id: 'q5', label: '5. ความรู้ความชำนาญด้านปฏิบัติการ หลังจากพนักงานที่ปรึกษาสอนงานแล้วสามารถปฏิบัติงานได้ มีทักษะและความชำนาญในการปฏิบัติงาน' },
  { id: 'q6', label: '6. วิจารณญาณ การวิเคราะห์ และการตัดสินใจ ตัดสินใจได้ดี ถูกต้อง รวดเร็ว มีการวิเคราะห์ข้อมูลและแก้ปัญหาอย่างมีเหตุผล' },
  { id: 'q7', label: '7. การจัดการและวางแผน นักศึกษามีความสามารถในการจัดการ ลำดับความสำคัญของงาน วางแผนขั้นตอนการทำงานได้ดี' },
  { id: 'q8', label: '8. ทักษะการสื่อสารและการนำเสนอ ความสามารถในการติดต่อสื่อสาร พูด เขียน นำเสนอ (Presentation) ได้อย่างมีประสิทธิภาพ' },
  { id: 'q9', label: '9. การพัฒนาด้านภาษาและวัฒนธรรมต่างประเทศ เช่น ภาษาอังกฤษ การทำงานกับชาวต่างชาติ หรือความตระหนักในความหลากหลายทางวัฒนธรรม' },
  { id: 'q10', label: '10. ความเหมาะสมต่อตำแหน่งงานที่ได้รับมอบหมาย สามารถพัฒนาตนเองให้ปฏิบัติงานตามตำแหน่งที่ได้รับมอบหมายได้อย่างเหมาะสม' },
  { id: 'q11', label: '11. ความรับผิดชอบและเป็นผู้ที่ไว้วางใจได้ ดำเนินงานให้สำเร็จลุล่วงโดยคำนึงถึงเป้าหมาย มีความรับผิดชอบต่องานที่ได้รับมอบหมาย' },
  { id: 'q12', label: '12. ความสนใจ อุตสาหะในการทำงาน มีความสนใจและกระตือรือร้นในการทำงาน มีความอุตสาหะ ไม่ย่อท้อต่ออุปสรรค' },
  { id: 'q13', label: '13. ความคิดริเริ่มในการทำงานและการเสนอความคิดเห็น เมื่อได้รับคำชี้แนะ สามารถเริ่มทำงานได้เอง มีความคิดสร้างสรรค์ นำเสนอแนวคิดใหม่ๆ' },
  { id: 'q14', label: '14. การตอบสนองต่อการสั่งการ ยินดีรับคำสั่ง คำแนะนำ คำวิจารณ์ ไม่แสดงความอึดอัดใจ พร้อมที่จะปรับปรุงตนเอง' },
  { id: 'q15', label: '15. บุคลิกภาพ การวางตัว และการปรับตัวเข้ากับสังคม มีบุคลิกภาพและการวางตัวได้เหมาะสม แต่งกายสุภาพ รู้จักกาลเทศะ' },
  { id: 'q16', label: '16. มนุษยสัมพันธ์ สามารถร่วมงานกับผู้อื่น การทำงานเป็นทีม สร้างมนุษยสัมพันธ์ได้ดีกับเพื่อนร่วมงานและผู้บังคับบัญชา' },
  { id: 'q17', label: '17. ความมั่นใจในตนเอง มีความสามารถแก้ปัญหา รับมือกับปัญหาต่างๆ เผชิญหน้ากับความท้าทายด้วยความมั่นใจ' },
  { id: 'q18', label: '18. ความเป็นผู้นำ มีความสามารถทำให้คนอื่นให้ความร่วมมือ สามารถชักจูง โน้มน้าว ชี้แนะ และเป็นผู้นำที่ดี' },
  { id: 'q19', label: '19. ความมีระเบียบวินัย ปฏิบัติตามวัฒนธรรมขององค์กร ความสนใจเรียนรู้ ศึกษา กฎระเบียบ เข้างานตรงเวลา' },
  { id: 'q20', label: '20. คุณธรรมและจริยธรรม มีความซื่อสัตย์ สุจริต มีจิตใจสะอาด รู้จักเสียสละ ไม่เห็นแก่ตัว เอื้อเฟื้อเผื่อแผ่' },
];

const PublicEvaluationPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluated, setEvaluated] = useState(false);
  const [requestData, setRequestData] = useState(null);
  
  const [formData, setFormData] = useState({
    evaluatorName: '', evaluatorPosition: '', evaluatorDepartment: '',
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '',
    q11: '', q12: '', q13: '', q14: '', q15: '', q16: '', q17: '', q18: '', q19: '', q20: '',
    strengths: '', improvements: '', hireFuture: '', overallScore: '', projectUsage: '', otherComments: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const sigCanvas = useRef({});
  const [signatureError, setSignatureError] = useState(false);

  useEffect(() => {
    api.get(`/public/evaluate/request/${id}`)
      .then((res) => {
        if (res.data.evaluated) {
          setEvaluated(true);
        } else if (res.data.data) {
          setRequestData(res.data.data);
        } else {
          setError('ไม่พบข้อมูลคำร้อง');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('ไม่พบข้อมูลคำร้อง หรือลิงก์ไม่ถูกต้อง');
        setLoading(false);
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
    setSignatureError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (sigCanvas.current.isEmpty()) {
      setSignatureError(true);
      return;
    }
    
    setSubmitting(true);
    setSignatureError(false);
    
    // ใช้ getCanvas() แทน getTrimmedCanvas() เพื่อเลี่ยงปัญหา Vite module import
    const signatureBase64 = sigCanvas.current.getCanvas().toDataURL('image/png');
    
    const payload = { ...formData, studentId: requestData.studentId, signature: signatureBase64 };
    for (let i = 1; i <= 20; i++) {
      if (payload[`q${i}`] === '-') {
        payload[`q${i}`] = null;
      } else if (payload[`q${i}`] !== '') {
        payload[`q${i}`] = parseInt(payload[`q${i}`], 10);
      } else {
        payload[`q${i}`] = null;
      }
    }

    try {
      await api.post(`/public/evaluate/${id}`, payload);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (evaluated) return <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}><Alert severity="info" sx={{ maxWidth: 500, mx: 'auto' }}>นักศึกษาคนนี้ได้รับการประเมินเรียบร้อยแล้ว ขอบคุณครับ</Alert></Box>;
  if (error && !success) return <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}><Alert severity="error" sx={{ maxWidth: 500, mx: 'auto' }}>{error}</Alert></Box>;
  if (success) return <Box sx={{ p: 4, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa' }}><Alert severity="success" sx={{ maxWidth: 500, mx: 'auto' }}>บันทึกผลการประเมินสำเร็จ ขอบคุณที่ให้ความร่วมมือครับ</Alert></Box>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', py: 5, px: { xs: 1, sm: 2 } }}>
      <Paper elevation={0} sx={{ maxWidth: 900, mx: 'auto', p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        <Typography variant="h5" align="center" fontWeight="700" gutterBottom>
          แบบประเมินผลการฝึกงานและปฏิบัติงานสหกิจศึกษาของนักศึกษา<br/>
          (สำหรับพนักงานที่ปรึกษา)
        </Typography>
        <Divider sx={{ my: 3 }} />
        
        <form onSubmit={handleSubmit}>
          {/* คำชี้แจง */}
          <Paper elevation={0} sx={{ mb: 4, p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" fontWeight="700" gutterBottom sx={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
              <InformationCircleIcon style={{ width: 24, height: 24 }} /> คำชี้แจง
            </Typography>
            
            <Box component="ol" sx={{ m: 0, pl: 2.5, color: '#334155', '& li': { mb: 1.5 } }}>
              <Typography component="li" variant="body2">
                ผู้ให้ข้อมูลในแบบประเมินนี้ต้องเป็น <strong>พนักงานที่ปรึกษา (Job supervisor)</strong> ของนักศึกษาฝึกงานและนักศึกษาสหกิจศึกษา หรือบุคคลที่ได้รับมอบหมายให้ทำหน้าที่แทน
              </Typography>
              <Typography component="li" variant="body2">
                แบบประเมินผลนี้มีทั้งหมด <strong>20 ข้อ</strong> โปรดให้ข้อมูลครบทุกข้อ เพื่อความสมบูรณ์ของการประเมินผล
              </Typography>
              <Typography component="li" variant="body2">
                กรุณาเติมข้อความในช่องว่าง และเลือกเพื่อให้คะแนนในแต่ละหัวข้อการประเมิน โดยมีระดับคะแนน ดังนี้
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, mb: 0.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}><strong style={{ color: '#0f172a' }}>5</strong> มากที่สุด</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}><strong style={{ color: '#0f172a' }}>4</strong> มาก</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}><strong style={{ color: '#0f172a' }}>3</strong> ปานกลาง</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}><strong style={{ color: '#0f172a' }}>2</strong> น้อย</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}><strong style={{ color: '#0f172a' }}>1</strong> น้อยที่สุด</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '4px 12px', borderRadius: '16px', border: '1px dashed #cbd5e1', fontSize: '0.85rem', color: '#64748b' }}><strong>-</strong> ไม่มีความคิดเห็น</span>
                </Box>
              </Typography>
              <Typography component="li" variant="body2">
                เมื่อประเมินผลเรียบร้อยแล้ว โปรดกดยืนยันเพื่อ <strong>บันทึกข้อมูลเข้าสู่ระบบ</strong> <span style={{ color: '#94a3b8' }}>(ทดแทนการใส่ซองประทับตรา "ลับ")</span>
              </Typography>
            </Box>
          </Paper>

          {/* ส่วนเกริ่นนำ */}
          <Box sx={{ mb: 5, px: 2.5, py: 1.5, borderLeft: '4px solid #3b82f6', bgcolor: '#eff6ff', borderRadius: '0 8px 8px 0' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#1e3a8a' }}>
              เรียน ผู้อำนวยการศูนย์ฝึกประสบการณ์วิชาชีพและสหกิจศึกษา
            </Typography>
            <Typography variant="body2" sx={{ color: '#1e40af', mt: 0.5, ml: 2 }}>
              ขอแจ้งผลประเมินการฝึกงานและการปฏิบัติงานสหกิจศึกษาของนักศึกษา ดังนี้:
            </Typography>
          </Box>

          {/* ส่วนที่ 1: ข้อมูลทั่วไป */}
          <Typography variant="h6" fontWeight="600" gutterBottom>ส่วนที่ 1: ข้อมูลทั่วไป</Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ชื่อ-นามสกุลนักศึกษา" value={requestData?.studentName || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="รหัสประจำตัว" value={requestData?.studentId || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="สาขาวิชา" value={requestData?.department || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ตำแหน่งที่เข้าฝึกงาน" value={requestData?.position || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ชื่อสถานประกอบการ" value={requestData?.companyName || requestData?.company || '-'} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ชื่อ-นามสกุลผู้ประเมิน" name="evaluatorName" value={formData.evaluatorName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="ตำแหน่ง" name="evaluatorPosition" value={formData.evaluatorPosition} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="แผนก" name="evaluatorDepartment" value={formData.evaluatorDepartment} onChange={handleChange} required />
            </Grid>
          </Grid>

          {/* ส่วนที่ 2: การประเมินผล */}
          <Typography variant="h6" fontWeight="600" gutterBottom>ส่วนที่ 2: การประเมินผล</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด, - = ไม่มีความเห็น
          </Typography>
          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mt: 4, color: '#2563eb' }}>หมวด: ผลสำเร็จของงาน</Typography>
          <Box sx={{ mb: 4 }}>
            {questions.slice(0, 2).map((q) => (
              <Box key={q.id} sx={{ mb: 3, p: { xs: 2, md: 3 }, bgcolor: '#f9fafb', borderRadius: 2 }}>
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
          </Box>

          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mt: 4, color: '#2563eb' }}>หมวด: ความรู้ความสามารถ</Typography>
          <Box sx={{ mb: 4 }}>
            {questions.slice(2, 14).map((q) => (
              <Box key={q.id} sx={{ mb: 3, p: { xs: 2, md: 3 }, bgcolor: '#f9fafb', borderRadius: 2 }}>
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
          </Box>

          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mt: 4, color: '#2563eb' }}>หมวด: ลักษณะส่วนบุคคล</Typography>
          <Box sx={{ mb: 4 }}>
            {questions.slice(14, 20).map((q) => (
              <Box key={q.id} sx={{ mb: 3, p: { xs: 2, md: 3 }, bgcolor: '#f9fafb', borderRadius: 2 }}>
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
          </Box>

          {/* ส่วนที่ 3-5 */}
          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mt: 5, pt: 3, borderTop: '1px solid #e2e8f0', color: '#0f172a' }}>
            โปรดให้ข้อคิดเห็นที่เป็นประโยชน์แก่นักศึกษา
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={3} label="21. จุดเด่นของนักศึกษา" name="strengths" value={formData.strengths} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth multiline rows={3} label="22. ข้อควรปรับปรุงของนักศึกษา" name="improvements" value={formData.improvements} onChange={handleChange} />
            </Grid>
          </Grid>

          <FormControl component="fieldset" sx={{ mb: 4, display: 'block' }}>
            <FormLabel sx={{ fontWeight: 600, color: '#111', mb: 1, display: 'block' }}>23. ในอนาคต ท่านสนใจจะรับนักศึกษาเข้าทำงานในสถานประกอบการนี้หรือไม่</FormLabel>
            <RadioGroup row name="hireFuture" value={formData.hireFuture} onChange={handleChange}>
              <FormControlLabel value="รับ" control={<Radio required />} label="รับ" />
              <FormControlLabel value="ไม่แน่ใจ" control={<Radio required />} label="ไม่แน่ใจ" />
              <FormControlLabel value="ไม่รับ" control={<Radio required />} label="ไม่รับ" />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" sx={{ mb: 4, display: 'block' }}>
            <FormLabel sx={{ fontWeight: 600, color: '#111', mb: 1, display: 'block' }}>24. สรุปโดยภาพรวมท่านมีความคิดเห็นต่อคุณภาพนักศึกษาคนนี้ในระดับ</FormLabel>
            <RadioGroup name="overallScore" value={formData.overallScore} onChange={handleChange}>
              <FormControlLabel value="ยอดเยี่ยม" control={<Radio required />} label="5 = ยอดเยี่ยม (Outstanding)" />
              <FormControlLabel value="ดีมาก" control={<Radio required />} label="4 = ดีมาก (Very good)" />
              <FormControlLabel value="พอใจ" control={<Radio required />} label="3 = พอใจ (Satisfactory)" />
              <FormControlLabel value="คาบเส้น" control={<Radio required />} label="2 = คาบเส้น (Marginal)" />
              <FormControlLabel value="ไม่เป็นที่พอใจ" control={<Radio required />} label="1 = ไม่เป็นที่พอใจ (Unsatisfactory)" />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" sx={{ mb: 4, display: 'block' }}>
            <FormLabel sx={{ fontWeight: 600, color: '#111', mb: 1, display: 'block' }}>25. การใช้ประโยชน์จากผลการปฏิบัติงาน/โครงงานของนักศึกษา</FormLabel>
            <RadioGroup name="projectUsage" value={formData.projectUsage} onChange={handleChange}>
              <FormControlLabel value="ใช้" control={<Radio required />} label="สถานประกอบการนำผลการปฏิบัติงานไปใช้ประโยชน์ หรือคาดว่าจะนำไปใช้" />
              <FormControlLabel value="ยังไม่ใช้แต่อาจจะใช้ในอนาคต" control={<Radio required />} label="ยังไม่ใช้ประโยชน์ ณ เวลานี้ แต่คาดว่าจะนำไปใช้ในอนาคต" />
              <FormControlLabel value="ไม่มีประโยชน์" control={<Radio required />} label="ผลการปฏิบัติงานไม่มีประโยชน์ต่อสถานประกอบการ" />
            </RadioGroup>
          </FormControl>

          <Box sx={{ mb: 4 }}>
            <TextField fullWidth multiline rows={4} label="26. ข้อคิดเห็นอื่นๆ" name="otherComments" value={formData.otherComments} onChange={handleChange} />
          </Box>

          {/* E-Signature */}
          <Box sx={{ mb: 4, p: { xs: 2, sm: 3 }, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#fff' }}>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>ลายมือชื่อผู้ประเมิน *</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              กรุณาใช้นิ้วหรือเมาส์วาดลายเซ็นลงในกรอบด้านล่าง
            </Typography>
            <Box sx={{ border: '1px dashed #94a3b8', borderRadius: 1, bgcolor: '#f8fafc', mb: 2, height: 200, overflow: 'hidden' }}>
              <SignatureCanvas 
                ref={sigCanvas} 
                penColor="black" 
                canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }} 
              />
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Button variant="outlined" color="error" size="small" onClick={clearSignature}>
                ล้างลายเซ็น
              </Button>
            </Box>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="ตำแหน่ง" 
                  value={formData.evaluatorPosition || '-'} 
                  InputProps={{ readOnly: true }} 
                  variant="standard" 
                  helperText="ดึงข้อมูลจากส่วนที่ 1"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="วันที่ประเมิน" 
                  value={new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} 
                  InputProps={{ readOnly: true }} 
                  variant="standard" 
                  helperText="วันที่ปัจจุบัน"
                />
              </Grid>
            </Grid>

            {signatureError && (
              <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: '500' }}>
                * กรุณาลงลายเซ็นก่อนส่งแบบประเมิน
              </Typography>
            )}
          </Box>

          <Button type="submit" variant="contained" color="primary" size="large" fullWidth disabled={submitting} sx={{ py: 1.5, fontSize: '1.1rem' }}>
            {submitting ? 'กำลังบันทึก...' : 'ส่งแบบประเมิน'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default PublicEvaluationPage;
