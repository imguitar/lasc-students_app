import React from 'react';
import {
  PencilSquareIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

const STEPS = [
  {
    icon: PencilSquareIcon,
    iconClass: 'bg-purple-50 text-purple-600 border-purple-100',
    title: 'กรอกคำร้องออนไลน์ & ระบุอีเมลสถานประกอบการ',
    desc: 'บันทึกข้อมูลบริษัทและอีเมลฝ่ายบุคคล/ผู้ประสานงานผ่านระบบ ไม่ต้องพิมพ์เอกสาร',
  },
  {
    icon: PaperAirplaneIcon,
    iconClass: 'bg-blue-50 text-blue-600 border-blue-100',
    title: 'คณะตรวจสอบ & ส่งหนังสือทางอีเมลอัตโนมัติ',
    desc: 'อาจารย์และเจ้าหน้าที่อนุมัติคำร้อง ระบบจะส่งหนังสือขอความอนุเคราะห์ตรงไปยังอีเมลบริษัททันที',
  },
  {
    icon: CheckCircleIcon,
    iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: 'สถานประกอบการตอบรับผ่านลิงก์ออนไลน์',
    desc: 'บริษัทกดลิงก์ยืนยันรับเข้าฝึกงานผ่านอีเมล ไม่ต้องเซ็นหรือสแกนเอกสารส่งกลับ',
  },
  {
    icon: DevicePhoneMobileIcon,
    iconClass: 'bg-amber-50 text-amber-600 border-amber-100',
    title: 'ออกฝึก & บันทึกเวลาดิจิทัล',
    desc: 'เช็กอินเวลาทำงานและเขียนบันทึกประจำวันผ่านมือถือในระบบ Coop',
  },
];

const DigitalJourney = () => (
  <section className="py-10 sm:py-14">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 m-0">ขั้นตอนการฝึกประสบการณ์วิชาชีพ</h2>
        <div className="w-14 h-1 bg-purple-600 rounded-full mt-2.5 mb-2.5" />
        <p className="text-xs sm:text-sm text-slate-500 m-0">ทุกขั้นตอนดำเนินการผ่านระบบออนไลน์และอีเมล — ตั้งแต่ยื่นคำร้องจนถึงบันทึกเวลาฝึกงาน</p>
      </div>

      <div className="relative">
        {/* เส้นเชื่อมแนวตั้งบนมือถือ */}
        <div className="sm:hidden absolute left-[33px] top-6 bottom-6 w-px bg-slate-200" aria-hidden="true" />
        {/* เส้นเชื่อมแนวนอนบน desktop */}
        <div className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-px bg-slate-200" aria-hidden="true" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="group relative bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 flex sm:flex-col items-start gap-4 h-full"
            >
              <div className={`relative w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 z-10 bg-white ${step.iconClass}`}>
                <step.icon className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-widest text-purple-500/80 uppercase mb-1">ขั้นตอนที่ {i + 1}</div>
                <h3 className="text-sm font-bold text-slate-800 m-0 leading-snug">{step.title}</h3>
                <p className="text-xs text-slate-500 m-0 mt-1.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default DigitalJourney;
