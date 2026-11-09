import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarClock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function DailyReportLockedCard({
  requestStatus = 'ยังไม่มีคำร้อง',
  isCompleted = false,
}) {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4">
      {/* การ์ดใบเดียวรวมศูนย์ (Single Unified Card) */}
      <div
        className="bg-[#FAFAFD] border border-[#E9E5F5] rounded-2xl md:rounded-3xl p-6 md:p-8"
        style={{ boxShadow: '0 4px 24px -2px rgba(76, 29, 149, 0.06)' }}
      >
        {/* ส่วนหัวภายในการ์ด (Card Header) */}
        <div className="flex items-center gap-3.5 pb-5 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-800 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-purple-800" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-snug m-0">
              บันทึกรายงานประจำวัน
            </h1>
            <p className="text-xs md:text-sm text-slate-500 m-0 mt-0.5">
              เช็คชื่อและบันทึกประสบการณ์การฝึกงานในแต่ละวัน
            </p>
          </div>
        </div>

        {/* โซนแจ้งสถานะและข้อความชี้แจง (Status & Explanation State) */}
        <div className="flex flex-col items-center text-center max-w-md mx-auto py-4">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center mb-4 ring-8 ring-purple-50/50">
            {isCompleted ? (
              <CheckCircle2 className="w-9 h-9 text-purple-700" />
            ) : (
              <CalendarClock className="w-9 h-9 text-purple-700" />
            )}
          </div>

          <h2 className="text-base md:text-lg font-bold text-slate-800 mb-2">
            {isCompleted ? 'การฝึกงานเสร็จสิ้นแล้ว' : 'ยังไม่สามารถรายงานประจำวันได้'}
          </h2>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 mb-4">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isCompleted ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span>สถานะคำร้องปัจจุบัน: {requestStatus || 'ยังไม่มีคำร้อง'}</span>
          </div>

          <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mb-6">
            {isCompleted
              ? 'คุณได้ผ่านการฝึกงานเรียบร้อยแล้ว ไม่จำเป็นต้องบันทึกรายงานประจำวันอีกต่อไป'
              : 'ระบบจะเปิดให้เริ่มบันทึกเวลาปฏิบัติงานและรายงานประจำวัน เมื่อคำร้องขอฝึกงานได้รับการอนุมัติและผู้ดูแลระบบเปิดรอบการฝึกงานเรียบร้อยแล้ว'}
          </p>

          {/* ปุ่มแอ็กชันมาตรฐาน (Action Area) */}
          <button
            type="button"
            onClick={() => navigate('/dashboard/my-requests')}
            style={{
              background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 14px 0 rgba(109, 40, 217, 0.28)',
            }}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-semibold text-white hover:shadow-lg hover:shadow-purple-900/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer border-none"
          >
            <span>ไปยังหน้ารายการคำร้อง</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

