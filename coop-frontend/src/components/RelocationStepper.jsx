import { CheckCircle2, Circle, XCircle } from 'lucide-react';

const STEPS = [
  'ยื่นคำร้อง+ลงนาม',
  'บริษัทเดิมยินยอม',
  'อาจารย์ที่ปรึกษาพิจารณา',
  'คณบดี/สำนักงานออกเอกสาร',
  'รับหนังสือส่งตัวใหม่'
];

// map status → step index ที่ "เสร็จแล้ว" (0-based, -1 = ยังไม่เริ่ม)
const STEP_OF_STATUS = {
  submitted_waiting_company: 0,
  submitted_waiting_advisor: 1, // legacy (ข้ามขั้นบริษัท)
  company_approved_waiting_advisor: 1,
  advisor_approved_waiting_admin: 2,
  admin_approved_generating_request_letter: 3,
  waiting_company_acceptance: 3,
  company_accepted_generating_dispatch_letter: 3,
  completed: 4,
  rejected: -1
};

export const RELOCATION_STATUS_LABEL = {
  submitted_waiting_company: 'รอบริษัทเดิมลงนามยินยอม',
  company_approved_waiting_advisor: 'รออาจารย์ที่ปรึกษาพิจารณา',
  submitted_waiting_advisor: 'รออาจารย์ที่ปรึกษาพิจารณา',
  advisor_approved_waiting_admin: 'รอสำนักงานคณบดีดำเนินการ',
  admin_approved_generating_request_letter: 'กำลังออกหนังสือขอความอนุเคราะห์',
  waiting_company_acceptance: 'รอแบบตอบรับจากที่ใหม่',
  company_accepted_generating_dispatch_letter: 'กำลังออกหนังสือส่งตัวใหม่',
  completed: 'เสร็จสิ้น',
  rejected: 'ไม่อนุมัติ'
};

const RelocationStepper = ({ status }) => {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-xs font-semibold text-red-600">คำร้องไม่ได้รับอนุมัติ / ถูกตีกลับ</span>
      </div>
    );
  }
  const doneIndex = STEP_OF_STATUS[status] ?? -1;
  const icon = (done, active) => done ? (
    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
  ) : (
    <Circle className={`w-5 h-5 shrink-0 ${active ? 'text-violet-500' : 'text-slate-300'}`} />
  );
  const labelClass = (done, active) =>
    `${done ? 'text-emerald-600' : active ? 'text-violet-600 font-semibold' : 'text-slate-400'}`;
  return (
    <>
      {/* Mobile: แนวตั้ง — อ่าน label ยาวได้เต็มบรรทัด ไม่ล้น */}
      <div className="flex flex-col sm:hidden">
        {STEPS.map((label, idx) => {
          const done = idx <= doneIndex;
          const active = idx === doneIndex + 1;
          return (
            <div key={label} className="flex items-stretch gap-2.5">
              <div className="flex flex-col items-center w-5 shrink-0">
                {icon(done, active)}
                {idx < STEPS.length - 1 && (
                  <div className={`w-px flex-1 min-h-[10px] ${idx < doneIndex ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                )}
              </div>
              <span className={`text-xs font-medium pb-4 leading-5 ${labelClass(done, active)}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Desktop: แนวนอนเดิม */}
      <div className="hidden sm:flex items-center">
        {STEPS.map((label, idx) => {
          const done = idx <= doneIndex;
          const active = idx === doneIndex + 1;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                {icon(done, active)}
                <span className={`text-[10px] font-medium text-center leading-tight w-20 ${labelClass(done, active)}`}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-1 mb-4 ${idx < doneIndex ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default RelocationStepper;
