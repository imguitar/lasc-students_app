import { Button } from '@mui/material';
import { ArrowRight, Building2, CalendarClock, User, Check, FileText, Download } from 'lucide-react';
import { formatAddress } from '../utils/formatters';
import { getUploadUrl } from '../utils/fileUrl';
import { RELOCATION_STATUS_LABEL } from './RelocationStepper';
import { downloadDocument, downloadFileSmart } from '../utils/documentViewer';
import '../pages/Admin/Shared/RequestDetailsPage.css';

// โทนสี badge ตามขั้นตอนคำร้องเปลี่ยนสถานที่ฝึกงาน
const RELOC_BADGE = {
  submitted_waiting_company: 'bg-amber-50 text-amber-600 border-amber-200',
  company_approved_waiting_advisor: 'bg-amber-50 text-amber-600 border-amber-200',
  submitted_waiting_advisor: 'bg-amber-50 text-amber-600 border-amber-200',
  advisor_approved_waiting_admin: 'bg-sky-50 text-sky-600 border-sky-200',
  admin_approved_generating_request_letter: 'bg-violet-50 text-violet-600 border-violet-200',
  waiting_company_acceptance: 'bg-blue-50 text-blue-600 border-blue-200',
  company_accepted_generating_dispatch_letter: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  rejected: 'bg-red-50 text-red-500 border-red-200',
};

export const formatThaiDate = (value) =>
  value ? new Date(value).toLocaleDateString('th-TH') : '';

// ตำแหน่งฝึกงาน "ปัจจุบัน" — ถ้ามี relocation completed ใช้ค่าบริษัท/ผู้ติดต่อ/ช่วงวันของที่ใหม่
export const getActivePlacement = (request, relocations = []) => {
  const details = request?.details || {};
  const completed = (relocations || []).filter((r) => r.status === 'completed');
  const latestReloc = completed[completed.length - 1] || null;
  const relocated = !!latestReloc || (Number(request?.has_completed_relocation) === 1 && !!request?.active_company_name);
  const term = details.internshipTerm;
  return {
    details,
    latestReloc,
    relocated,
    companyName: latestReloc?.new_company_name || (relocated ? request.active_company_name : '') || details.companyName || request?.company || '-',
    companyAddress: latestReloc?.new_company_address
      ? formatAddress(latestReloc.new_company_address)
      : formatAddress(details.companyAddress || details.address),
    previousCompany: relocated ? (latestReloc?.old_company || request?.company || '') : '',
    contactPerson: latestReloc?.mentor_name || details.contactPerson,
    contactPosition: latestReloc?.mentor_position || details.contactPosition,
    contactPhone: latestReloc?.mentor_phone || details.contactPhone,
    contactEmail: latestReloc?.mentor_email || details.contactEmail,
    startDate: latestReloc?.new_start_date || request?.internship_start_date || details.startDate || '',
    endDate: latestReloc?.new_end_date || request?.internship_end_date || details.endDate || '',
    effectiveDate: latestReloc?.new_start_date || request?.active_start_date || '',
    termLabel: term === 'term1' ? 'ภาคการศึกษาที่ 1' : term === 'term2' ? 'ภาคการศึกษาที่ 2' : term === 'summer' ? 'ภาคฤดูร้อน' : (term || ''),
    mentorLine: [latestReloc?.mentor_name, latestReloc?.mentor_email || latestReloc?.mentor_phone].filter(Boolean).join(' • '),
    newDispatchLetterFile: latestReloc?.new_dispatch_letter_file || '',
  };
};

/**
 * Shared Request Detail View — ใช้ร่วมกันทุกหน้าที่แสดงรายละเอียดคำร้องฝึกงาน
 * (/dashboard/request/:id, /dashboard/student/:id และหน้าอื่น ๆ)
 * Slots: evaluatorEmailAction, datesHeaderAction (React node ฝั่งขวาของหัว section)
 */
const InternshipRequestDetailView = ({
  request,
  relocations = [],
  evaluatorEmailAction = null,
  datesHeaderAction = null,
}) => {
  const placement = getActivePlacement(request, relocations);
  const { details, latestReloc } = placement;
  const studentAddress = formatAddress(details.student_info?.address);
  const studentEmail = (details.student_info?.email && !details.student_info.email.includes('@student.sskru.ac.th'))
    ? details.student_info.email
    : (request.studentId ? `stu${request.studentId}@sskru.ac.th` : '-');



  return (
    <>
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
            <span className="detail-value">{details.student_info?.phone || '-'} / {studentEmail}</span>
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
        {/* Relocation History Banner — แจ้งชัดเจนว่านักศึกษาย้ายสถานที่ฝึกงานแล้ว */}
        {placement.relocated && (
          <div className="bg-violet-50/70 border border-violet-200/80 rounded-2xl p-4 mb-4 space-y-2">
            <p className="text-xs font-bold text-violet-800 m-0 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-violet-600" />
              สถานประกอบการปัจจุบัน (ได้รับการอนุมัติย้ายแล้ว)
            </p>
            {placement.previousCompany && (
              <p className="text-[11px] font-semibold text-violet-700 m-0 flex items-center gap-1 flex-wrap">
                <ArrowRight className="w-3.5 h-3.5 text-violet-500" />
                ย้ายสถานที่ฝึกงานจาก: {placement.previousCompany}
                <ArrowRight className="w-3.5 h-3.5 text-violet-500" />
                {placement.companyName}
                {placement.effectiveDate ? ` (มีผล ${formatThaiDate(placement.effectiveDate)})` : ''}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <p className="m-0 text-slate-600"><span className="text-slate-400">ชื่อหน่วยงานปัจจุบัน:</span> <strong className="text-violet-900">{placement.companyName}</strong></p>
              <p className="m-0 text-slate-600"><span className="text-slate-400">ตำแหน่ง:</span> <strong className="text-slate-700">{details.position || request.position || '-'}</strong></p>
              <p className="m-0 text-slate-600 flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-slate-400">ช่วงฝึกใหม่:</span>
                <strong className="text-slate-700">
                  {placement.startDate && placement.endDate
                    ? `${formatThaiDate(placement.startDate)} – ${formatThaiDate(placement.endDate)}`
                    : 'รอกำหนดวันฝึกงาน'}
                </strong>
              </p>
              <p className="m-0 text-slate-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-slate-400">ผู้ประสานงาน/พี่เลี้ยง:</span>
                <strong className="text-slate-700">{placement.mentorLine || '-'}</strong>
              </p>
            </div>
          </div>
        )}
        <div className="detail-grid">
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <span className="detail-label">1. ชื่อบุคคล / ชื่อตำแหน่งงานติดต่อ / ผู้ประสานงานที่ติดต่อ</span>
            <span className="detail-value">
              {placement.contactPerson || '-'} {placement.contactPosition ? `(${placement.contactPosition})` : ''}
            </span>
          </div>
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <span className="detail-label">2. ชื่อหน่วยงาน / บริษัทที่ติดต่อ{placement.relocated ? ' (สถานที่ฝึกปัจจุบัน)' : ''}</span>
            <span className="detail-value">{placement.companyName}</span>
          </div>
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <span className="detail-label">3. ที่อยู่หน่วยงาน</span>
            <span className="detail-value">{placement.companyAddress}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">4. โทรศัพท์ / อีเมลติดต่อ</span>
            <span className="detail-value">{placement.contactPhone || '-'} / {placement.contactEmail || '-'}</span>
          </div>
          <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
            <span className="detail-label">อีเมลผู้ประเมินจากสถานประกอบการ (สำหรับส่งแบบประเมิน)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span className="detail-value" style={{ fontWeight: 600, color: (request.evaluator_email || details.evaluatorEmail) ? '#1e293b' : '#94a3b8' }}>
                {request.evaluator_email || details.evaluatorEmail || '(ยังไม่ระบุโดยสถานประกอบการ)'}
              </span>
              {evaluatorEmailAction}
            </div>
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
              {!details.description && !details.skills && <span style={{ color: '#94a3b8' }}>ไม่ได้ระบุ</span>}
            </p>
          </div>
        </div>
      </section>

      {/* ประวัติการเปลี่ยนสถานที่ฝึกงาน — แสดงเฉพาะเมื่อเคยยื่นคำร้องย้าย */}
      {relocations.length > 0 && (
        <section className="detail-section">
          <h3>
            ประวัติการเปลี่ยนสถานที่ฝึกงาน
            <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-600 text-[11px] font-bold align-middle">
              {relocations.length} ครั้ง
            </span>
          </h3>
          <div className="space-y-3">
            {relocations.map((r, idx) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800 m-0">
                    คำร้องครั้งที่ {idx + 1}
                    <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                      (ยื่นเมื่อ {formatThaiDate(r.created_at)})
                    </span>
                  </p>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5 ${RELOC_BADGE[r.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {RELOCATION_STATUS_LABEL[r.status] || r.status}
                  </span>
                </div>

                {/* ที่เดิม → ที่ใหม่ (มือถือเรียงแนวตั้ง) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-[10px] font-semibold text-slate-400 m-0">สถานประกอบการเดิม</p>
                    {/* รอบถัดไป "ที่เดิม" คือบริษัทใหม่ของรอบก่อนหน้า */}
                    <p className="text-xs font-bold text-slate-700 m-0 mt-0.5 truncate">
                      {idx > 0 ? (relocations[idx - 1].new_company_name || r.old_company || request.company) : (r.old_company || request.company) || '—'}
                    </p>
                    {(relocations[idx - 1]?.new_start_date || request.internship_start_date || request.details?.startDate) && (
                      <p className="text-[10px] text-slate-500 m-0 mt-0.5">
                        ฝึกช่วง {formatThaiDate(relocations[idx - 1]?.new_start_date || request.internship_start_date || request.details?.startDate)} – {formatThaiDate(r.created_at)}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 m-0 mt-0.5">ฝึกสะสมแล้ว {r.days_trained || 0} วัน</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-violet-400 shrink-0 rotate-90 sm:rotate-0 self-center" />
                  <div className="flex-1 min-w-0 rounded-xl bg-violet-50/60 border border-violet-100 px-3 py-2">
                    <p className="text-[10px] font-semibold text-violet-400 m-0">สถานประกอบการใหม่</p>
                    <p className="text-xs font-bold text-violet-800 m-0 mt-0.5 truncate">{r.new_company_name}</p>
                    <p className="text-[10px] text-violet-500 m-0 mt-0.5">
                      {r.new_start_date && r.new_end_date
                        ? `${formatThaiDate(r.new_start_date)} – ${formatThaiDate(r.new_end_date)}`
                        : 'รอสำนักงานคณบดีกำหนดวันฝึกงาน'}
                    </p>
                  </div>
                </div>

                <div className="detail-item">
                  <span className="detail-label">เหตุผลการขอย้าย</span>
                  <span className="detail-value">{r.reason}</span>
                </div>

                {(r.company_signed_at || r.advisor_signed_at || r.dean_signed_at || r.acceptance_signed_at) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-100">
                    {[
                      [r.company_signed_at, 'บริษัทเดิมลงนาม'],
                      [r.advisor_signed_at, 'อาจารย์เห็นชอบ'],
                      [r.dean_signed_at, 'คณะอนุมัติ'],
                      [r.acceptance_signed_at, 'บริษัทใหม่ตอบรับ'],
                    ].filter(([d]) => d).map(([d, label]) => (
                      <span key={label} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {label} {formatThaiDate(d)}
                      </span>
                    ))}
                  </div>
                )}

                {/* เอกสารที่เกี่ยวข้อง — MUI Buttons มาตรฐาน Clean Violet */}
                {(r.return_letter_file || r.new_request_letter_file || r.new_dispatch_letter_file) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      [r.return_letter_file, 'หนังสือส่งตัวกลับ'],
                      [r.new_request_letter_file, 'หนังสือขอความอนุเคราะห์'],
                      [r.new_dispatch_letter_file, 'หนังสือส่งตัวฉบับใหม่'],
                    ].filter(([u]) => u).map(([u, label]) => {
                      const fileName = `${label}_${r.id}${(String(u).match(/\.[a-z]+$/i) || ['.pdf'])[0]}`;
                      return (
                        <span key={label} className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outlined"
                            size="small"
                            component="a"
                            href={getUploadUrl(u)}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<FileText size={14} />}
                            sx={{ minHeight: 40, textTransform: 'none', borderRadius: 2.5, borderColor: '#ddd6fe', color: '#6d28d9', bgcolor: '#f5f3ff', fontWeight: 600, '&:hover': { borderColor: '#c4b5fd', bgcolor: '#ede9fe' } }}
                          >
                            {label}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => downloadFileSmart(getUploadUrl(u), fileName)}
                            title={`ดาวน์โหลด ${label}`}
                            startIcon={<Download size={14} />}
                            sx={{ minHeight: 40, minWidth: 0, px: 1.5, textTransform: 'none', borderRadius: 2.5, borderColor: '#e2e8f0', color: '#64748b', '& .MuiButton-startIcon': { m: 0 }, '&:hover': { borderColor: '#7c3aed', color: '#6d28d9', bgcolor: '#f5f3ff' } }}
                          />
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>ความประสงค์และกำหนดวันฝึกงาน{placement.relocated ? ' (ช่วงฝึกปัจจุบัน)' : ''}</h3>
          {datesHeaderAction}
        </div>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">ภาคการศึกษา / ช่วงฝึกงาน</span>
            <span className="detail-value">{placement.termLabel || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">วันที่เริ่มต้นฝึกงาน</span>
            <span className="detail-value">
              {placement.startDate
                ? formatThaiDate(placement.startDate)
                : <span style={{ color: '#94a3b8' }}>รอผู้ดูแลระบบกำหนด</span>}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">วันที่สิ้นสุดการฝึกงาน</span>
            <span className="detail-value">
              {placement.endDate
                ? formatThaiDate(placement.endDate)
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

    </>
  );
};

export default InternshipRequestDetailView;
