/**
 * Calculates date-driven status for an internship request:
 * - Current Date < startDate: "อนุมัติแล้ว (รอออกฝึกงาน)"
 * - startDate <= Current Date <= endDate: "กำลังออกฝึกงาน"
 * - Current Date > endDate: "สิ้นสุดการฝึกงาน (รอประเมิน)"
 */

export const formatDateToYMD = (val) => {
  if (!val) return '';
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getEffectiveInternshipStatus = (request, currentDate = new Date()) => {
  if (!request) return '';

  const rawStatus = String(request.status || '').trim();

  // If request is still in early waiting or rejected phases, preserve raw status
  const unapprovedStatuses = [
    'รอตรวจสอบ',
    'รอผู้ดูแลระบบตรวจสอบ',
    'รอผู้ดูแลระบบอนุมัติ',
    'รออาจารย์ที่ปรึกษาอนุมัติ',
    'รอสถานประกอบการตอบรับ',
    'COMPANY_ACCEPTED',
    'รอแอดมินออกใบส่งตัว',
    'รอออกใบส่งตัว',
    'ตอบรับแล้ว',
    'สถานประกอบการตอบรับแล้ว (รอผู้ดูแลระบบกำหนดวัน)',
    'ไม่อนุมัติ (อาจารย์)',
    'ไม่อนุมัติ (Admin)',
    'ปฏิเสธ',
    'ยกเลิก',
    'ร่าง'
  ];

  if (unapprovedStatuses.includes(rawStatus)) {
    return rawStatus;
  }

  // Get dates from request fields
  const startDateVal = request.internship_start_date || request.startDate || request.details?.startDate;
  const endDateVal = request.internship_end_date || request.endDate || request.details?.endDate;

  if (!startDateVal || !endDateVal) {
    return rawStatus;
  }

  const currentStr = formatDateToYMD(currentDate);
  const startStr = formatDateToYMD(startDateVal);
  const endStr = formatDateToYMD(endDateVal);

  if (!currentStr || !startStr || !endStr) {
    return rawStatus;
  }

  // Eligible statuses that follow the internship date timeline
  const isPostApproval =
    rawStatus === 'อนุมัติแล้ว' ||
    rawStatus === 'อนุมัติแล้ว (รอออกฝึกงาน)' ||
    rawStatus === 'กำลังออกฝึกงาน' ||
    rawStatus === 'ออกฝึกงาน' ||
    rawStatus === 'สิ้นสุดการฝึกงาน (รอประเมิน)' ||
    rawStatus.includes('ออกฝึกงาน') ||
    rawStatus.includes('รอออกฝึกงาน') ||
    !!(request.dispatchLetter || request.details?.dispatchLetter);

  if (!isPostApproval) {
    return rawStatus;
  }

  if (currentStr < startStr) {
    return 'อนุมัติแล้ว (รอออกฝึกงาน)';
  } else if (currentStr >= startStr && currentStr <= endStr) {
    return 'กำลังออกฝึกงาน';
  } else {
    return 'สิ้นสุดการฝึกงาน (รอประเมิน)';
  }
};
