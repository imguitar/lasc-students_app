// Single Source of Truth: สถานประกอบการ "ปัจจุบัน" ของแต่ละคำร้องฝึกงาน
// ถ้านักศึกษามีคำร้องย้ายที่เสร็จสิ้นแล้ว (completed) รอบล่าสุด → ใช้บริษัทใหม่
// ไม่เช่นนั้นใช้ r.company เดิม — ใช้ร่วมกันทุก route ที่ส่งข้อมูลคำร้อง/นักศึกษา

// JOIN หารอบย้าย completed ล่าสุด — requestAlias = alias ของตาราง requests ใน query นั้น
const LATEST_COMPLETED_RELOC_JOIN = (requestAlias = 'r') => `
  LEFT JOIN internship_relocation_requests active_reloc
    ON active_reloc.id = (
      SELECT rr.id FROM internship_relocation_requests rr
      WHERE rr.internship_request_id = ${requestAlias}.id AND rr.status = 'completed'
      ORDER BY rr.created_at DESC, rr.id DESC LIMIT 1
    )`;

// คอลัมน์ที่ expose (prefix active_*) — NULL เมื่อยังไม่เคยย้ายสำเร็จ
const ACTIVE_COMPANY_COLS = `
  active_reloc.new_company_name AS active_company_name,
  active_reloc.new_company_address AS active_company_address,
  active_reloc.mentor_name AS active_mentor_name,
  active_reloc.mentor_position AS active_mentor_position,
  active_reloc.mentor_email AS active_mentor_email,
  active_reloc.mentor_phone AS active_mentor_phone,
  DATE_FORMAT(active_reloc.new_start_date, '%Y-%m-%d') AS active_start_date,
  DATE_FORMAT(active_reloc.new_end_date, '%Y-%m-%d') AS active_end_date,
  IF(active_reloc.id IS NOT NULL, 1, 0) AS has_completed_relocation`;

module.exports = { LATEST_COMPLETED_RELOC_JOIN, ACTIVE_COMPANY_COLS };
