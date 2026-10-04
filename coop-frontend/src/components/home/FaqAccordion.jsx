import React, { useState } from 'react';
import { ChevronDownIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const FAQ_ITEMS = [
  {
    q: 'หากกรอกอีเมลสถานประกอบการผิด ต้องทำอย่างไร?',
    a: 'หากสถานประกอบการยังไม่ได้กดตอบรับ สามารถเข้าไปที่เมนู "ติดตามสถานะ" เพื่อแก้ไขอีเมลและกดส่งหนังสือแจ้งใหม่อีกครั้งได้ทันที',
  },
  {
    q: 'สถานประกอบการต้องสมัครสมาชิกหรือมีบัญชีก่อนตอบรับหรือไม่?',
    a: 'ไม่จำเป็น สถานประกอบการสามารถคลิกลิงก์ยืนยันตัวตนความปลอดภัยสูง (One-Time Secure Link) จากอีเมลเพื่อตอบรับได้ทันที',
  },
  {
    q: 'ถ้าสถานประกอบการยังไม่ตอบรับผ่านอีเมลภายในเวลาที่กำหนด ควรทำอย่างไร?',
    a: 'นักศึกษาสามารถกดปุ่ม "ส่งอีเมลแจ้งเตือนซ้ำ" ในหน้ารายละเอียดคำร้อง หรือประสานงานฝ่ายบุคคลเพื่อตรวจสอบในกล่อง Junk/Spam',
  },
  {
    q: 'สามารถออกฝึกงานนอกเขตพื้นที่หรือต่างจังหวัดได้หรือไม่?',
    a: 'สามารถทำได้ทั่วประเทศ เพียงระบุข้อมูลและอีเมลของสถานประกอบการให้ครบถ้วนเพื่อให้อาจารย์ที่ปรึกษาพิจารณา',
  },
];

const FaqAccordion = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div id="home-faq" className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-7 scroll-mt-24">
      <h3 className="text-lg font-bold text-gray-900 m-0 flex items-center gap-2">
        <QuestionMarkCircleIcon className="w-5 h-5 text-purple-600" />
        คำถามที่พบบ่อย (ระบบดิจิทัล)
      </h3>
      <div className="h-1 w-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2.5 mb-4" />
      <div className="flex flex-col divide-y divide-slate-100">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 py-3.5 text-left bg-transparent border-0 cursor-pointer group"
              >
                <span className={`text-sm font-semibold leading-snug transition-colors ${isOpen ? 'text-purple-700' : 'text-slate-700 group-hover:text-purple-700'}`}>
                  {item.q}
                </span>
                <ChevronDownIcon className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-600' : ''}`} />
              </button>
              {isOpen && (
                <p className="m-0 pb-4 pr-8 text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FaqAccordion;
