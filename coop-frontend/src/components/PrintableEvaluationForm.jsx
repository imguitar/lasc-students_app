import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid } from '@mui/material';

const questions = [
  { id: 'q1', label: '1. ปริมาณงาน (Quantity of Work)' },
  { id: 'q2', label: '2. คุณภาพงาน (Quality of Work)' },
  { id: 'q3', label: '3. ความรู้ความสามารถทางวิชาการ' },
  { id: 'q4', label: '4. ความสามารถในการเรียนรู้และประยุกต์วิชาการ' },
  { id: 'q5', label: '5. ความรู้ความชำนาญด้านปฏิบัติการ' },
  { id: 'q6', label: '6. วิจารณญาณ การวิเคราะห์ และการตัดสินใจ' },
  { id: 'q7', label: '7. การจัดการและวางแผน' },
  { id: 'q8', label: '8. ทักษะการสื่อสารและการนำเสนอ' },
  { id: 'q9', label: '9. การพัฒนาด้านภาษาและวัฒนธรรมต่างประเทศ' },
  { id: 'q10', label: '10. ความเหมาะสมต่อตำแหน่งงานที่ได้รับมอบหมาย' },
  { id: 'q11', label: '11. ความรับผิดชอบและเป็นผู้ที่ไว้วางใจได้' },
  { id: 'q12', label: '12. ความสนใจ อุตสาหะในการทำงาน' },
  { id: 'q13', label: '13. ความคิดริเริ่มในการทำงานและการเสนอความคิดเห็น' },
  { id: 'q14', label: '14. การตอบสนองต่อการสั่งการ' },
  { id: 'q15', label: '15. บุคลิกภาพ การวางตัว และการปรับตัวเข้ากับสังคม' },
  { id: 'q16', label: '16. มนุษยสัมพันธ์' },
  { id: 'q17', label: '17. ความมั่นใจในตนเอง' },
  { id: 'q18', label: '18. ความเป็นผู้นำ' },
  { id: 'q19', label: '19. ความมีระเบียบวินัย ปฏิบัติตามวัฒนธรรมขององค์กร' },
  { id: 'q20', label: '20. คุณธรรมและจริยธรรม' }
];

const PrintableEvaluationForm = React.forwardRef(({ request, evaluation }, ref) => {
  if (!request || !evaluation) return <div ref={ref}></div>;

  return (
    <div ref={ref} style={{ padding: '40px', backgroundColor: '#fff', color: '#000', fontFamily: '"Sarabun", "Roboto", "Helvetica", "Arial", sans-serif' }}>
      <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
        แบบประเมินผลการฝึกงานของนักศึกษา (สำหรับสถานประกอบการ)
      </Typography>
      
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold">ส่วนที่ 1: ข้อมูลทั่วไป</Typography>
        <Grid container spacing={2} sx={{ mt: 1, pl: 2 }}>
          <Grid item xs={6}><Typography><strong>ชื่อนักศึกษา:</strong> {request.studentName}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>รหัสนักศึกษา:</strong> {request.studentId}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>สาขาวิชา:</strong> {request.department}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>สถานประกอบการ:</strong> {request.company}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>ผู้ประเมิน:</strong> {evaluation.evaluatorName}</Typography></Grid>
          <Grid item xs={6}><Typography><strong>ตำแหน่ง:</strong> {evaluation.evaluatorPosition}</Typography></Grid>
          <Grid item xs={12}><Typography><strong>แผนก:</strong> {evaluation.evaluatorDepartment}</Typography></Grid>
        </Grid>
      </Box>

      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ส่วนที่ 2: การประเมินผล</Typography>
      <TableContainer sx={{ mb: 4, border: '1px solid #000' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: '1px solid #000', fontWeight: 'bold', width: '70%' }}>หัวข้อประเมิน</TableCell>
              <TableCell align="center" sx={{ border: '1px solid #000', fontWeight: 'bold' }}>คะแนน (1-5)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell sx={{ border: '1px solid #000', py: 0.5 }}>{q.label}</TableCell>
                <TableCell align="center" sx={{ border: '1px solid #000', py: 0.5 }}>{evaluation[q.id] || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mb: 4, pageBreakInside: 'avoid' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ส่วนที่ 3: ข้อคิดเห็นเพิ่มเติม</Typography>
        <Box sx={{ pl: 2 }}>
          <Typography sx={{ mb: 1 }}><strong>21. จุดเด่นของนักศึกษา:</strong> {evaluation.strengths || '-'}</Typography>
          <Typography sx={{ mb: 1 }}><strong>22. ข้อควรปรับปรุง:</strong> {evaluation.improvements || '-'}</Typography>
          <Typography sx={{ mb: 1 }}><strong>23. สนใจรับเข้าทำงานหรือไม่:</strong> {evaluation.hireFuture || '-'}</Typography>
          <Typography sx={{ mb: 1 }}><strong>24. ภาพรวมคุณภาพ:</strong> {evaluation.overallScore || '-'}</Typography>
          <Typography sx={{ mb: 1 }}><strong>25. การใช้ประโยชน์จากผลงาน:</strong> {evaluation.projectUsage || '-'}</Typography>
          <Typography sx={{ mb: 1 }}><strong>26. ข้อคิดเห็นอื่นๆ:</strong> {evaluation.otherComments || '-'}</Typography>
        </Box>
      </Box>

      {/* Signature Section */}
      <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', pageBreakInside: 'avoid' }}>
        {evaluation.signature ? (
          <img src={evaluation.signature} alt="Signature" style={{ maxWidth: '200px', maxHeight: '100px' }} />
        ) : (
          <Box sx={{ width: 200, height: 100, borderBottom: '1px dotted #000', mb: 1 }} />
        )}
        <Typography>( {evaluation.evaluatorName || '......................................................'} )</Typography>
        <Typography>ผู้ประเมิน</Typography>
        <Typography sx={{ mt: 1 }}>ตำแหน่ง: {evaluation.evaluatorPosition || '...........................................'}</Typography>
        <Typography>วันที่: {new Date(evaluation.created_at || Date.now()).toLocaleDateString('th-TH')}</Typography>
      </Box>

    </div>
  );
});

export default PrintableEvaluationForm;
