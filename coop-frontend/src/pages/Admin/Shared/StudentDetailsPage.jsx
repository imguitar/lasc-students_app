import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogActions, Button, Typography, Box } from '@mui/material';
import { ChartBarIcon, DocumentTextIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../../../api/axios';
import './RequestDetailsPage.css';

const dataUrlToBlobUrl = (dataUrl) => {
  if (!dataUrl) return '';
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert dataUrl to blob:', err);
    return dataUrl;
  }
};

const handleDownloadFile = (dataUrl, fileName = 'หนังสือส่งตัวฝึกงาน.pdf') => {
  if (!dataUrl) return;
  try {
    const blobUrl = dataUrlToBlobUrl(dataUrl);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [request, setRequest] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [advisorEvaluation, setAdvisorEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState(false);
  const [docModal, setDocModal] = useState({ open: false, dataUrl: '', fileName: '', blobUrl: '' });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    const userObj = JSON.parse(userStr);
    setUserRole(String(userObj.role || '').toLowerCase());

    const loadData = async () => {
      try {
        let reqData = null;

        // 1. Search requests by exact student ID or request ID
        try {
          const listRes = await api.get('/requests');
          const allReqs = listRes.data.data || [];
          reqData = allReqs.find((r) => 
            String(r.studentId) === String(id) || 
            String(r.id) === String(id) ||
            String(r.student_code) === String(id)
          ) || null;
        } catch (_) {
        }

        // 2. Search user baseline profile for exact student ID
        let userBaseline = null;
        try {
          const usersRes = await api.get('/users');
          const users = usersRes.data.data || [];
          userBaseline = users.find((item) => 
            String(item.student_code) === String(id) || 
            String(item.username) === String(id) || 
            String(item.studentId) === String(id)
          ) || null;
        } catch (_) {
        }

        if (reqData) {
          if (typeof reqData.details === 'string') {
            try {
              reqData.details = JSON.parse(reqData.details);
            } catch (e) {
              reqData.details = {};
            }
          }
          if (userBaseline) {
            reqData.studentName = reqData.studentName || (userBaseline.title ? `${userBaseline.title} ` : '') + (userBaseline.full_name || userBaseline.name || '');
            reqData.department = reqData.department || userBaseline.major || userBaseline.department || '';
          }
          setRequest(reqData);

          // Fetch company and advisor evaluation if available
          if (reqData.id && reqData.id !== '-') {
            try {
              const [evalRes, advisorEvalRes] = await Promise.all([
                api.get(`/evaluations/request/${reqData.id}`).catch(() => ({ data: { data: null } })),
                api.get(`/advisor-evaluations/request/${reqData.id}`).catch(() => ({ data: { data: null } }))
              ]);
              if (evalRes.data && evalRes.data.data) {
                setEvaluation(evalRes.data.data);
              }
              if (advisorEvalRes.data && advisorEvalRes.data.data) {
                setAdvisorEvaluation(advisorEvalRes.data.data);
              }
            } catch (_) {}
          }
        } else if (userBaseline) {
          // Student exists but has NOT submitted any request yet
          setRequest({
            id: '-',
            submittedDate: null,
            status: 'ยังไม่ได้ยื่นคำร้อง',
            studentId: userBaseline.student_code || userBaseline.username || id,
            studentName: (userBaseline.title ? `${userBaseline.title} ` : '') + (userBaseline.full_name || userBaseline.name || '-'),
            department: userBaseline.major || userBaseline.department || '-',
            company: '-',
            position: '-',
            details: {
              student_info: {
                phone: userBaseline.phone || '-',
                email: userBaseline.email || '-',
                lastSemesterGrade: userBaseline.lastSemesterGrade || '-',
                address: userBaseline.address || null,
              },
              companyName: '-',
              position: '-',
              description: '-',
              skills: '-',
              contactPerson: '-',
              contactPhone: '-',
              contactEmail: '-',
            }
          });
        } else {
          setRequest(null);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const getStatusBadge = (status) => {
    const statusStyles = {
      'ยังไม่ได้ยื่นคำร้อง': { bg: '#f1f5f9', color: '#64748b' },
      'รออาจารย์ที่ปรึกษาอนุมัติ': { bg: '#fff3cd', color: '#856404' },
      'รอผู้ดูแลระบบตรวจสอบ': { bg: '#c3dafe', color: '#434190' },
      'รอผู้ดูแลระบบอนุมัติ': { bg: '#c3dafe', color: '#434190' },
      'รอสถานประกอบการตอบรับ': { bg: '#e2e8f0', color: '#2d3748' },
      'รออาจารย์อนุมัติเริ่มฝึกงาน': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'รอแอดมินอนุมัติเริ่มฝึกงาน': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'อนุมัติแล้ว': { bg: '#d1fae5', color: '#065f46', label: 'รอแอดมินอนุมัติการออกฝึกงาน' },
      'ออกฝึกงาน': { bg: '#c4f1f9', color: '#0c4a6e' },
      'ประเมินเสร็จแล้ว': { bg: '#ddd6fe', color: '#4c1d95' },
      'ฝึกงานเสร็จแล้ว': { bg: '#fbcfe8', color: '#9d174d' },
      'ไม่อนุมัติ (อาจารย์)': { bg: '#f8d7da', color: '#721c24' },
      'ไม่อนุมัติ (Admin)': { bg: '#f8d7da', color: '#721c24' },
      'ปฏิเสธ': { bg: '#f8d7da', color: '#721c24' }
    };
    const style = statusStyles[status] || { bg: '#e2e3e5', color: '#383d41' };
    return { ...style, label: style.label || status || 'ยังไม่ได้ยื่นคำร้อง' };
  };

  const formatAddress = (address) => {
    if (!address) return '-';
    if (typeof address === 'string') return address;

    const parts = [];
    if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
    if (address.moo) parts.push(`หมู่ ${address.moo}`);
    if (address.tambon) parts.push(`ตำบล ${address.tambon}`);
    if (address.amphur) parts.push(`อำเภอ ${address.amphur}`);
    if (address.province) parts.push(`จังหวัด ${address.province}`);
    if (address.postal) parts.push(`รหัสไปรษณีย์ ${address.postal}`);

    return parts.length > 0 ? parts.join(' ') : '-';
  };

  if (loading) {
    return (
      <div className="request-details-container">
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="request-details-container">
        <div className="details-card">
          <h2>ไม่พบข้อมูลนักศึกษารหัส: {id}</h2>
          <button type="button" className="btn-back" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>
            ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  const details = request.details || {};
  const studentAddress = formatAddress(details.student_info?.address);
  const companyAddress = formatAddress(details.companyAddress || details.address);
  const internshipTermLabel = details.internshipTerm === 'term1'
    ? 'ภาคการศึกษาที่ 1'
    : details.internshipTerm === 'term2'
      ? 'ภาคการศึกษาที่ 2'
      : details.internshipTerm === 'summer'
        ? 'ภาคฤดูร้อน'
        : (details.internshipTerm || '');

  const statusInfo = getStatusBadge(request.status);

  return (
    <div className="request-details-container">
      <div className="details-card">
        <header className="details-header" style={{ position: 'relative', minHeight: '140px', paddingRight: details.studentPhoto?.dataUrl ? '130px' : '20px' }}>
          <div>
            <h2>รายละเอียดคำร้องฝึกงาน</h2>
            <p style={{ color: '#718096', marginTop: '5px' }}>
              {request.id && request.id !== '-' ? `เลขที่คำร้อง: ${request.id}` : 'ยังไม่มีเลขที่คำร้อง'}{' '}
              {request.submittedDate ? `(ยื่นเมื่อ: ${new Date(request.submittedDate).toLocaleDateString('th-TH')})` : ''}
            </p>
            <span className="status-badge-lg" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color, marginTop: '10px', display: 'inline-block' }}>
              {statusInfo.label}
            </span>
          </div>
          {details.studentPhoto?.dataUrl && (
            <div 
              style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }} 
              onClick={() => setImageModal(true)}
              title="คลิกเพื่อดูรูปขยาย"
            >
              <img 
                src={details.studentPhoto.dataUrl} 
                alt="รูปนักศึกษา" 
                style={{ width: '100px', height: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
              />
            </div>
          )}
        </header>

        <section className="detail-section">
          <h3>ข้อมูลนักศึกษา</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ชื่อ-นามสกุล</span>
              <span className="detail-value">{request.studentName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">รหัสนักศึกษา</span>
              <span className="detail-value">{request.studentId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">สาขาวิชา</span>
              <span className="detail-value">{request.department}</span>
            </div>
            {details.student_info?.lastSemesterGrade && (
              <div className="detail-item">
                <span className="detail-label">เกรดเฉลี่ยเทอมล่าสุด</span>
                <span className="detail-value">{details.student_info.lastSemesterGrade}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">โทรศัพท์ / อีเมลติดต่อ</span>
              <span className="detail-value">{details.student_info?.phone || '-'} / {details.student_info?.email || '-'}</span>
            </div>
            {studentAddress && studentAddress !== '-' && (
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">ที่อยู่ปัจจุบัน</span>
                <span className="detail-value">{studentAddress}</span>
              </div>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h3>รายละเอียดสถานประกอบการ</h3>
          <div className="detail-grid">
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">1. ชื่อบุคคล / ชื่อตำแหน่งงานติดต่อ / ผู้ประสานงานที่ติดต่อ</span>
              <span className="detail-value">
                {details.contactPerson || '-'} {details.contactPosition ? `(${details.contactPosition})` : ''}
              </span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">2. ชื่อหน่วยงาน / บริษัทที่ติดต่อ</span>
              <span className="detail-value">{details.companyName || request.company || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">3. ที่อยู่หน่วยงาน</span>
              <span className="detail-value">{companyAddress}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">4. โทรศัพท์ / อีเมลติดต่อ</span>
              <span className="detail-value">{details.contactPhone || '-'} / {details.contactEmail || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">5. ตำแหน่งงานที่ต้องการเข้าฝึกงาน</span>
              <span className="detail-value">{details.position || request.position || '-'}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">6. ข้อมูลเพิ่มเติม (ลักษณะงานที่ทำ / ทักษะที่ต้องการ)</span>
              <p className="detail-value" style={{ whiteSpace: 'pre-wrap', marginTop: '5px' }}>
                {details.description ? `ลักษณะงาน: ${details.description}\n` : ''}
                {details.skills ? `ทักษะ: ${details.skills}` : ''}
                {!details.description && !details.skills && '-'}
              </p>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3>ความประสงค์และกำหนดวันฝึกงาน</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">ภาคการศึกษา / ช่วงฝึกงาน</span>
              <span className="detail-value">{internshipTermLabel || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">วันที่เริ่มต้นฝึกงาน</span>
              <span className="detail-value">
                {(request.internship_start_date || details.startDate) 
                  ? new Date(request.internship_start_date || details.startDate).toLocaleDateString('th-TH') 
                  : <span style={{ color: '#94a3b8' }}>รอผู้ดูแลระบบกำหนด</span>}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">วันที่สิ้นสุดการฝึกงาน</span>
              <span className="detail-value">
                {(request.internship_end_date || details.endDate) 
                  ? new Date(request.internship_end_date || details.endDate).toLocaleDateString('th-TH') 
                  : <span style={{ color: '#94a3b8' }}>รอผู้ดูแลระบบกำหนด</span>}
              </span>
            </div>
            {details.internshipDateNote && (
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">หมายเหตุวันฝึกงาน</span>
                <span className="detail-value">{details.internshipDateNote}</span>
              </div>
            )}
          </div>
        </section>

        {request.supervisionAppointment && (
          <section className="detail-section">
            <h3 style={{ color: '#0ea5e9' }}>กำหนดการนิเทศ (โดยอาจารย์ที่ปรึกษา)</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">วันที่นิเทศ</span>
                <span className="detail-value" style={{ fontWeight: 'bold' }}>{request.supervisionAppointment.date ? new Date(request.supervisionAppointment.date).toLocaleDateString('th-TH') : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">รูปแบบ</span>
                <span className="detail-value">{request.supervisionAppointment.mode || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">สถานะการประเมิน</span>
                <span className="detail-value" style={{ 
                  fontWeight: 'bold', 
                  color: (request.supervisionReport || request.hasAdvisorEval) ? '#10b981' : '#f59e0b' 
                }}>
                  {(request.supervisionReport || request.hasAdvisorEval) ? 'นิเทศและประเมินเรียบร้อยแล้ว' : 'รอนิเทศงาน'}
                </span>
              </div>
              {request.supervisionAppointment.note && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">หมายเหตุ</span>
                  <span className="detail-value">{request.supervisionAppointment.note}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {request.dispatchLetter && (
          <section className="detail-section" style={{ backgroundColor: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ color: '#be185d', borderLeftColor: '#be185d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DocumentTextIcon style={{ width: 22, height: 22 }} /> หนังสือส่งตัวฝึกงาน (Dispatch Letter)
            </h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">ชื่อเอกสาร</span>
                <span className="detail-value" style={{ fontWeight: 'bold', color: '#881337' }}>{request.dispatchLetter.fileName || 'หนังสือส่งตัวฝึกงาน'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">เอกสารแนบ</span>
                <span className="detail-value">
                  {request.dispatchLetter.dataUrl ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<EyeIcon style={{ width: 16, height: 16 }} />}
                        sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                        onClick={() => {
                          const letter = request.dispatchLetter;
                          const blobUrl = dataUrlToBlobUrl(letter.dataUrl);
                          setDocModal({
                            open: true,
                            dataUrl: letter.dataUrl,
                            fileName: letter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf',
                            blobUrl,
                          });
                        }}
                      >
                        ดูเอกสาร
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
                        sx={{ borderColor: '#be185d', color: '#be185d', '&:hover': { borderColor: '#9d174d', bgcolor: '#fff1f2' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                        onClick={() => {
                          const letter = request.dispatchLetter;
                          handleDownloadFile(letter.dataUrl, letter.fileName || 'หนังสือส่งตัวฝึกงาน.pdf');
                        }}
                      >
                        ดาวน์โหลด
                      </Button>
                    </Box>
                  ) : (
                    <span style={{ color: '#64748b' }}>มีหนังสือส่งตัวแนบในระบบ</span>
                  )}
                </span>
              </div>
            </div>
          </section>
        )}

        {evaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                 <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ChartBarIcon style={{width: 20, height: 20}}/> ผลการประเมินจากสถานประกอบการ</span>
               </h3>
            </div>
            
            {(() => {
              let score = 0;
              let answered = 0;
              for (let i = 1; i <= 20; i++) {
                if (evaluation[`q${i}`] !== null && evaluation[`q${i}`] !== undefined) {
                   score += parseInt(evaluation[`q${i}`]);
                   answered++;
                }
              }
              const maxScore = answered * 5;
              const percent = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
              let gradeColor = '#10b981';
              if (percent < 50) gradeColor = '#ef4444';
              else if (percent < 70) gradeColor = '#f59e0b';
              else if (percent < 80) gradeColor = '#3b82f6';

              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '1rem' }}>คะแนนรวม (Automated Grading)</span>
                    <span style={{ fontWeight: '800', color: gradeColor, fontSize: '1.5rem' }}>{score} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ {maxScore}</span> ({percent}%)</span>
                  </div>
                  <div style={{ height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                     <div style={{ height: '100%', width: `${percent}%`, backgroundColor: gradeColor, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })()}
            
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
               <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>จุดเด่นของนักศึกษา</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{evaluation.strengths || '-'}</span>
               </div>
               <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ข้อควรปรับปรุง</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{evaluation.improvements || '-'}</span>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ความสนใจรับเข้าทำงานต่อ</span>
                    <span className="detail-value" style={{ display: 'block', fontWeight: '700', color: evaluation.hireFuture === 'รับ' ? '#10b981' : (evaluation.hireFuture === 'ไม่รับ' ? '#ef4444' : '#f59e0b') }}>
                       {evaluation.hireFuture || '-'}
                    </span>
                 </div>
                 <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ภาพรวมคุณภาพ</span>
                    <span className="detail-value" style={{ display: 'block', fontWeight: '600' }}>{evaluation.overallScore || '-'}</span>
                 </div>
               </div>
            </div>
          </section>
        )}

        {advisorEvaluation && (userRole === 'admin' || userRole === 'advisor') && (
          <section className="detail-section" style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChartBarIcon style={{ width: 20, height: 20 }} /> ผลการนิเทศและประเมิน (โดยอาจารย์ที่ปรึกษา)
                </span>
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, backgroundColor: '#dcfce7', padding: '4px 12px', borderRadius: '999px' }}>
                ผู้ประเมิน: {advisorEvaluation.advisorName || 'อาจารย์ที่ปรึกษา'}
              </span>
            </div>

            {(() => {
              let cScore = 0, cCount = 0;
              let sScore = 0, sCount = 0;
              for (let i = 1; i <= 17; i++) {
                const val = parseInt(advisorEvaluation[`c${i}`]);
                if (!isNaN(val)) { cScore += val; cCount++; }
              }
              for (let i = 1; i <= 20; i++) {
                const val = parseInt(advisorEvaluation[`s${i}`]);
                if (!isNaN(val)) { sScore += val; sCount++; }
              }

              const totalScore = cScore + sScore;
              const maxTotal = (cCount * 5) + (sCount * 5);
              const percent = maxTotal > 0 ? ((totalScore / maxTotal) * 100).toFixed(2) : 0;

              let gradeColor = '#10b981';
              if (percent < 50) gradeColor = '#ef4444';
              else if (percent < 70) gradeColor = '#f59e0b';
              else if (percent < 80) gradeColor = '#3b82f6';

              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: '600', color: '#166534', fontSize: '1rem' }}>คะแนนรวมการนิเทศงาน (Advisor Supervision Grading)</span>
                    <span style={{ fontWeight: '800', color: gradeColor, fontSize: '1.5rem' }}>
                      {totalScore} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ {maxTotal}</span> ({percent}%)
                    </span>
                  </div>
                  <div style={{ height: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, backgroundColor: gradeColor, transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })()}

            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
              {advisorEvaluation.companyComments && (
              <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <span className="detail-label" style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ความคิดเห็นต่อสถานประกอบการ</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{advisorEvaluation.companyComments}</span>
                </div>
              )}
              {advisorEvaluation.studentComments && (
                <div className="detail-item" style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <span className="detail-label" style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '4px', display: 'block' }}>ข้อเสนอแนะต่อนักศึกษา</span>
                  <span className="detail-value" style={{ display: 'block', lineHeight: 1.5 }}>{advisorEvaluation.studentComments}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {(evaluation || request?.hasCompanyEval) && userRole === 'student' && (
          <section className="detail-section">
            <h3 style={{ color: '#10b981' }}>การประเมินผลจากสถานประกอบการ</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">สถานประกอบการ</span>
                <span className="detail-value" style={{ fontWeight: 'bold' }}>{request.company || evaluation?.evaluatorName || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">ผู้ประเมิน</span>
                <span className="detail-value">{evaluation?.evaluatorName ? `${evaluation.evaluatorName} (${evaluation.evaluatorPosition || 'ตัวแทนบริษัท'})` : 'ตัวแทนสถานประกอบการ'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">สถานะการประเมิน</span>
                <span className="detail-value" style={{ fontWeight: 'bold', color: '#10b981' }}>
                  ประเมินเสร็จแล้ว
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Image Modal */}
        <Dialog 
          open={imageModal} 
          onClose={() => setImageModal(false)} 
          maxWidth="md"
          disableScrollLock={true}
          PaperProps={{ sx: { borderRadius: 3, p: 0.5, overflow: 'hidden' } }}
        >
          <DialogContent style={{ padding: '16px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
            {details.studentPhoto?.dataUrl && (
              <img 
                src={details.studentPhoto.dataUrl} 
                alt="รูปนักศึกษา (Full)" 
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Document Preview Modal */}
        <Dialog
          open={docModal.open}
          onClose={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })}
          maxWidth="md"
          fullWidth
          disableScrollLock={true}
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: '#ffe4e6',
                  color: '#be185d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <DocumentTextIcon style={{ width: 18, height: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                {docModal.fileName || 'หนังสือส่งตัวฝึกงาน'}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })} sx={{ color: '#64748b', fontWeight: 700 }}>
              ปิด
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh' }}>
            {docModal.open && (docModal.blobUrl || docModal.dataUrl) && (
              docModal.dataUrl?.startsWith('data:image/') ? (
                <img
                  src={docModal.dataUrl}
                  alt={docModal.fileName}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <iframe
                  src={docModal.blobUrl || docModal.dataUrl}
                  title={docModal.fileName}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px', backgroundColor: '#fff' }}
                />
              )
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              startIcon={<ArrowDownTrayIcon style={{ width: 18, height: 18 }} />}
              onClick={() => handleDownloadFile(docModal.dataUrl, docModal.fileName)}
              sx={{ bgcolor: '#be185d', '&:hover': { bgcolor: '#9d174d' }, fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 2.5 }}
            >
              ดาวน์โหลดไฟล์
            </Button>
            <Button variant="outlined" onClick={() => setDocModal({ open: false, dataUrl: '', fileName: '', blobUrl: '' })} sx={{ borderRadius: 2, textTransform: 'none', color: '#64748b', borderColor: '#cbd5e1' }}>
              ปิดหน้าต่าง
            </Button>
          </DialogActions>
        </Dialog>

        <footer className="actions-footer">
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            ย้อนกลับ
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudentDetailsPage;
