/**
 * การตั้งค่า Workflow กลาง (สเปก 3.1) — แยกกระบวนการ ฝึกงานทั่วไป (Internship) กับ สหกิจศึกษา (CWIE)
 * ตอนนี้ยังไม่ได้ผูกกับหน้าจอหรือ backend รอสเปกส่วนที่ 3 ที่เหลือ
 */
export const WORKFLOW_CONFIG = {
  internship: {
    id: 'internship',
    title: 'การฝึกงานทั่วไป (Internship / Practicum)',
    subtitle: 'เน้นการเรียนรู้ระบบงาน สภาพแวดล้อม และกระบวนการทำงานในสถานประกอบการ',
    durationLabel: '2-3 เดือน (ช่วงปิดภาคเรียนฤดูร้อน)',
    trackingUnit: 'ชั่วโมงสะสม',
    targetValue: 300,
    hasProject: false,
    supervisionRounds: 1,
    gradingType: 'SU', // S / U (ผ่าน / ไม่ผ่าน)
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
    steps: [
      { id: 1, key: 'request', label: 'ยื่นคำขอฝึกงาน' },
      { id: 2, key: 'logbook', label: 'บันทึกเวลาและรายงานรายวัน' },
      { id: 3, key: 'supervision', label: 'การนิเทศงาน (1 ครั้ง)' },
      { id: 4, key: 'report', label: 'รายงานสรุปผลการฝึกงาน' },
      { id: 5, key: 'grading', label: 'ผลการประเมิน (S/U)' },
    ],
  },
  cwie: {
    id: 'cwie',
    title: 'สหกิจศึกษา (Cooperative Education / CWIE)',
    subtitle: 'ปฏิบัติงานเสมือนพนักงานประจำ พร้อมจัดทำโครงงานพัฒนานวัตกรรมหรือแก้ปัญหาให้องค์กร',
    durationLabel: '1 ภาคการศึกษาเต็ม (อย่างน้อย 16 สัปดาห์)',
    trackingUnit: 'สัปดาห์ปฏิบัติงาน',
    targetValue: 16,
    hasProject: true,
    supervisionRounds: 2,
    gradingType: 'LETTER_GRADE', // A, B+, B, C+, C, D+, D, F
    badgeStyle: 'bg-purple-950/10 text-purple-900 border-amber-400/40 font-semibold',
    steps: [
      { id: 1, key: 'request', label: 'ยื่นคำร้องและเสนอหัวข้อโครงงาน' },
      { id: 2, key: 'logbook', label: 'บันทึกการปฏิบัติงานรายวัน' },
      { id: 3, key: 'milestones', label: 'รายงานความคืบหน้าโครงงาน (Milestones)' },
      { id: 4, key: 'supervision_1', label: 'การนิเทศงานรอบที่ 1 (ความก้าวหน้า)' },
      { id: 5, key: 'supervision_2', label: 'การนิเทศงานรอบที่ 2 (ตรวจโครงงาน)' },
      { id: 6, key: 'defense', label: 'การสอบปากเปล่าและนำเสนอโครงงาน' },
      { id: 7, key: 'grading', label: 'ผลการตัดเกรดตามเกณฑ์ (A - F)' },
    ],
  },
};

export default WORKFLOW_CONFIG;
