const prisma = require('../prismaClient');

// Helper: คำนวณ prefix ของรหัสนักศึกษาจากปีการศึกษาและชั้นปี
// เช่น academic_year=2569, from_year=1 → entryBE=2569 → prefix="69"
//      academic_year=2569, from_year=4 → entryBE=2566 → prefix="66"
const calcStudentIdPrefix = (academicYear, yearLevel) => {
  const entryBE = academicYear - yearLevel + 1;
  return (entryBE - 2500).toString();
};

// ============================================================
// @desc    Preview นักศึกษาที่เข้าเกณฑ์เลื่อนชั้นปี
// @route   POST /api/admin/student-promotion/preview
// @access  Admin only
// ============================================================
exports.previewPromotion = async (req, res) => {
  try {
    const { academic_year, from_year, to_year, department_id } = req.body;

    // Validate input
    if (!academic_year || from_year === undefined || from_year === null || from_year === '') {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุปีการศึกษา และชั้นปีต้นทาง'
      });
    }

    const academicYear = parseInt(academic_year, 10);
    const isAllYears = from_year === 'all' || from_year === 0 || from_year === '0';

    let fromYear = 0;
    let toYear = 0;

    if (!isAllYears) {
      fromYear = parseInt(from_year, 10);
      toYear = parseInt(to_year, 10);

      if (fromYear < 1 || fromYear > 4 || toYear < 2 || toYear > 5) {
        return res.status(400).json({
          success: false,
          message: 'ชั้นปีต้นทางต้องอยู่ระหว่าง 1-4 และชั้นปีปลายทางต้องอยู่ระหว่าง 2-5'
        });
      }

      if (toYear !== fromYear + 1) {
        return res.status(400).json({
          success: false,
          message: 'ชั้นปีปลายทางต้องเป็นชั้นปีถัดจากชั้นปีต้นทาง'
        });
      }
    }

    // คำนวณ prefix ของรหัสนักศึกษา
    let targetPrefixes = [];
    if (isAllYears) {
      targetPrefixes = [1, 2, 3, 4].map(y => ({
        year: y,
        prefix: calcStudentIdPrefix(academicYear, y)
      }));
    } else {
      targetPrefixes = [{
        year: fromYear,
        prefix: calcStudentIdPrefix(academicYear, fromYear)
      }];
    }

    const prefixMap = {};
    targetPrefixes.forEach(item => {
      prefixMap[item.prefix] = item.year;
    });

    // ค้นหา User ที่ role = student, isActive = true, username ขึ้นต้นด้วย prefix
    const users = await prisma.user.findMany({
      where: {
        role: 'student',
        isActive: true,
        OR: targetPrefixes.map(item => ({ username: { startsWith: item.prefix } }))
      },
      select: { id: true, username: true, email: true, isActive: true }
    });

    if (users.length === 0) {
      return res.json({
        success: true,
        data: {
          academic_year: academicYear,
          from_year: isAllYears ? 'all' : fromYear,
          to_year: isAllYears ? 'all' : toYear,
          students: [],
          total: 0,
          eligible_count: 0,
          ineligible_count: 0
        }
      });
    }

    const userUsernames = users.map(u => u.username);

    // ค้นหา Profile ที่ตรงกัน
    const profileWhere = {
      profile_id: { in: userUsernames },
      student_status: 'active' // ต้องเป็น active เท่านั้น (ไม่ใช่ graduated, inactive, suspended, withdrawn)
    };

    // กรองตาม department ถ้าระบุ
    if (department_id) {
      const parsedDeptId = parseInt(department_id, 10);
      if (!isNaN(parsedDeptId)) {
        profileWhere.department_id = parsedDeptId;
      }
    }

    const profiles = await prisma.profile.findMany({
      where: profileWhere,
      include: {
        faculty: true,
        department: true
      },
      orderBy: { profile_id: 'asc' }
    });

    // ตรวจสอบว่าไม่เคยถูกเลื่อนในรอบเดียวกัน
    // ค้นหา executed batches ที่ตรงกับ academic_year
    const executedBatchesWhere = {
      academic_year: academicYear,
      status: 'executed'
    };
    if (!isAllYears) {
      executedBatchesWhere.OR = [
        { from_year: fromYear, to_year: toYear },
        { from_year: 0 }
      ];
    }

    const executedBatches = await prisma.promotionBatch.findMany({
      where: executedBatchesWhere,
      select: { id: true }
    });

    let alreadyPromotedIds = new Set();
    if (executedBatches.length > 0) {
      const batchIds = executedBatches.map(b => b.id);
      const previousPromotions = await prisma.promotionHistory.findMany({
        where: {
          batch_id: { in: batchIds },
          status: 'promoted'
        },
        select: { profile_id: true }
      });
      alreadyPromotedIds = new Set(previousPromotions.map(p => p.profile_id));
    }

    // สร้างรายชื่อพร้อมสถานะ
    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    const students = profiles.map(p => {
      const user = userMap[p.profile_id];
      if (!user) return null;

      const prefix = p.profile_id.substring(0, 2);
      const studentFromYear = prefixMap[prefix] || (academicYear - (2500 + parseInt(prefix, 10)) + 1);
      const studentToYear = studentFromYear + 1;

      const isAlreadyPromoted = alreadyPromotedIds.has(p.profile_id);

      let eligibilityStatus = 'eligible'; // พร้อมเลื่อน
      let eligibilityReason = '';

      if (isAlreadyPromoted) {
        eligibilityStatus = 'already_promoted';
        eligibilityReason = 'เคยถูกเลื่อนในรอบปีการศึกษานี้แล้ว';
      } else if (p.student_status !== 'active') {
        eligibilityStatus = 'ineligible';
        eligibilityReason = `สถานะไม่อนุญาต: ${p.student_status}`;
      }

      return {
        profile_id: p.profile_id,
        prefix: p.prefix,
        firstname: p.firstname,
        lastname: p.lastname,
        faculty: p.faculty?.faculty_name || '',
        department: p.department?.department_name || '',
        department_id: p.department_id,
        from_year: studentFromYear,
        to_year: studentToYear,
        eligibility_status: eligibilityStatus,
        eligibility_reason: eligibilityReason,
        student_status: p.student_status
      };
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        academic_year: academicYear,
        from_year: isAllYears ? 'all' : fromYear,
        to_year: isAllYears ? 'all' : toYear,
        students,
        total: students.length,
        eligible_count: students.filter(s => s.eligibility_status === 'eligible').length,
        ineligible_count: students.filter(s => s.eligibility_status !== 'eligible').length,
        by_year: {
          year1: students.filter(s => s.from_year === 1).length,
          year2: students.filter(s => s.from_year === 2).length,
          year3: students.filter(s => s.from_year === 3).length,
          year4: students.filter(s => s.from_year === 4).length
        }
      }
    });
  } catch (error) {
    console.error('Error in previewPromotion:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบนักศึกษาที่เข้าเกณฑ์',
      error: error.message
    });
  }
};

// ============================================================
// @desc    ยืนยันและดำเนินการเลื่อนชั้นปี
// @route   POST /api/admin/student-promotion/execute
// @access  Admin only
// ============================================================
exports.executePromotion = async (req, res) => {
  try {
    const { academic_year, from_year, to_year, effective_date, notes, selected_profile_ids } = req.body;

    // Validate
    if (!academic_year || from_year === undefined || from_year === null || from_year === '' || !effective_date) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุข้อมูลให้ครบถ้วน'
      });
    }

    if (!selected_profile_ids || !Array.isArray(selected_profile_ids) || selected_profile_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกนักศึกษาอย่างน้อย 1 คน'
      });
    }

    const academicYear = parseInt(academic_year, 10);
    const isAllYears = from_year === 'all' || from_year === 0 || from_year === '0';

    let fromYear = 0;
    let toYear = 0;

    if (!isAllYears) {
      fromYear = parseInt(from_year, 10);
      toYear = parseInt(to_year, 10);
    }

    // ตรวจสอบว่ามีรอบที่ executed แล้ว พร้อมนักศึกษาซ้ำหรือไม่
    const executedBatchesWhere = {
      academic_year: academicYear,
      status: 'executed'
    };
    if (!isAllYears) {
      executedBatchesWhere.OR = [
        { from_year: fromYear, to_year: toYear },
        { from_year: 0 }
      ];
    }

    const executedBatches = await prisma.promotionBatch.findMany({
      where: executedBatchesWhere,
      select: { id: true }
    });

    if (executedBatches.length > 0) {
      const batchIds = executedBatches.map(b => b.id);
      const alreadyPromoted = await prisma.promotionHistory.findMany({
        where: {
          batch_id: { in: batchIds },
          profile_id: { in: selected_profile_ids },
          status: 'promoted'
        },
        select: { profile_id: true }
      });

      if (alreadyPromoted.length > 0) {
        const duplicateIds = alreadyPromoted.map(p => p.profile_id);
        return res.status(400).json({
          success: false,
          message: `นักศึกษาจำนวน ${duplicateIds.length} คนเคยถูกเลื่อนในรอบปีการศึกษานี้แล้ว`,
          duplicate_ids: duplicateIds
        });
      }
    }

    // ตรวจสอบว่า profile_ids ทั้งหมดยังเป็น active student อยู่
    const validProfiles = await prisma.profile.findMany({
      where: {
        profile_id: { in: selected_profile_ids },
        student_status: 'active'
      },
      select: { profile_id: true }
    });

    const validProfileIds = validProfiles.map(p => p.profile_id);
    const invalidIds = selected_profile_ids.filter(id => !validProfileIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `นักศึกษาจำนวน ${invalidIds.length} คนไม่อยู่ในสถานะที่สามารถเลื่อนชั้นได้`,
        invalid_ids: invalidIds
      });
    }

    // คำนวณ from_year และ to_year ของแต่ละคน
    const studentDataList = validProfileIds.map(profileId => {
      let sFromYear = fromYear;
      let sToYear = toYear;
      if (isAllYears) {
        const prefix = profileId.substring(0, 2);
        sFromYear = academicYear - (2500 + parseInt(prefix, 10)) + 1;
        sToYear = sFromYear + 1;
      }
      return {
        profile_id: profileId,
        from_year: sFromYear,
        to_year: sToYear
      };
    });

    // ============================================================
    // ดำเนินการภายใน Transaction
    // ============================================================
    const result = await prisma.$transaction(async (tx) => {
      // 1. สร้าง Promotion Batch
      const batch = await tx.promotionBatch.create({
        data: {
          academic_year: academicYear,
          from_year: isAllYears ? 0 : fromYear,
          to_year: isAllYears ? 0 : toYear,
          effective_date: new Date(effective_date),
          status: 'executed',
          notes: notes || null,
          total_eligible: validProfileIds.length,
          total_promoted: validProfileIds.length,
          created_by: req.user.id,
          executed_at: new Date()
        }
      });

      // 2. สร้าง Promotion History สำหรับแต่ละคน
      await tx.promotionHistory.createMany({
        data: studentDataList.map(item => ({
          batch_id: batch.id,
          profile_id: item.profile_id,
          from_year: item.from_year,
          to_year: item.to_year,
          status: 'promoted'
        }))
      });

      // 3. ถ้ามีคนที่ to_year >= 5 (สำเร็จการศึกษา)
      const graduatingIds = studentDataList
        .filter(item => item.to_year >= 5)
        .map(item => item.profile_id);

      if (graduatingIds.length > 0) {
        // Update profiles
        await tx.profile.updateMany({
          where: { profile_id: { in: graduatingIds } },
          data: {
            student_status: 'graduated',
            graduation_year: academicYear,
            graduation_date: new Date(effective_date)
          }
        });

        // Update user roles
        await tx.user.updateMany({
          where: { username: { in: graduatingIds } },
          data: { role: 'alumni' }
        });
      }

      return batch;
    });

    const graduatingCount = studentDataList.filter(item => item.to_year >= 5).length;
    let message = '';
    if (isAllYears) {
      message = graduatingCount > 0
        ? `ดำเนินการเลื่อนชั้นปีนักศึกษาทุกชั้นปีจำนวน ${validProfileIds.length} คน (รวมสำเร็จการศึกษา ${graduatingCount} คน) เรียบร้อยแล้ว`
        : `ดำเนินการเลื่อนชั้นปีนักศึกษาทุกชั้นปีจำนวน ${validProfileIds.length} คน เรียบร้อยแล้ว`;
    } else if (toYear === 5) {
      message = `ดำเนินการเลื่อนสถานะนักศึกษาจำนวน ${validProfileIds.length} คน เป็นสำเร็จการศึกษาเรียบร้อยแล้ว`;
    } else {
      message = `ดำเนินการเลื่อนชั้นปีนักศึกษาจำนวน ${validProfileIds.length} คน จากปี ${fromYear} → ปี ${toYear} เรียบร้อยแล้ว`;
    }

    res.json({
      success: true,
      message,
      data: {
        batch_id: result.id,
        total_promoted: validProfileIds.length,
        graduated_count: graduatingCount,
        academic_year: academicYear,
        from_year: isAllYears ? 'all' : fromYear,
        to_year: isAllYears ? 'all' : toYear
      }
    });
  } catch (error) {
    console.error('Error in executePromotion:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดำเนินการเลื่อนชั้นปี',
      error: error.message
    });
  }
};

// ============================================================
// @desc    ดูประวัติรอบการเลื่อนชั้นปีทั้งหมด
// @route   GET /api/admin/student-promotion/history
// @access  Admin only
// ============================================================
exports.getPromotionHistory = async (req, res) => {
  try {
    const batches = await prisma.promotionBatch.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    const data = batches.map(b => ({
      id: b.id,
      academic_year: b.academic_year,
      from_year: b.from_year,
      to_year: b.to_year,
      effective_date: b.effective_date,
      status: b.status,
      notes: b.notes,
      total_eligible: b.total_eligible,
      total_promoted: b.total_promoted,
      created_by: b.creator?.username || 'N/A',
      created_by_email: b.creator?.email || '',
      created_at: b.created_at,
      executed_at: b.executed_at
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Error in getPromotionHistory:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการเลื่อนชั้นปี',
      error: error.message
    });
  }
};

// ============================================================
// @desc    ดูรายละเอียดรอบการเลื่อนชั้น + รายชื่อนักศึกษา
// @route   GET /api/admin/student-promotion/history/:id
// @access  Admin only
// ============================================================
exports.getPromotionBatchDetail = async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const batch = await prisma.promotionBatch.findUnique({
      where: { id: batchId },
      include: {
        creator: {
          select: { id: true, username: true, email: true }
        },
        histories: {
          include: {
            profile: {
              include: {
                faculty: true,
                department: true
              }
            }
          },
          orderBy: { profile_id: 'asc' }
        }
      }
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'ไม่พบรอบการเลื่อนชั้นที่ระบุ' });
    }

    const students = batch.histories.map(h => ({
      profile_id: h.profile_id,
      prefix: h.profile?.prefix || '',
      firstname: h.profile?.firstname || '',
      lastname: h.profile?.lastname || '',
      faculty: h.profile?.faculty?.faculty_name || '',
      department: h.profile?.department?.department_name || '',
      from_year: h.from_year,
      to_year: h.to_year,
      status: h.status,
      created_at: h.created_at
    }));

    res.json({
      success: true,
      data: {
        id: batch.id,
        academic_year: batch.academic_year,
        from_year: batch.from_year,
        to_year: batch.to_year,
        effective_date: batch.effective_date,
        status: batch.status,
        notes: batch.notes,
        total_eligible: batch.total_eligible,
        total_promoted: batch.total_promoted,
        created_by: batch.creator?.username || 'N/A',
        created_by_email: batch.creator?.email || '',
        created_at: batch.created_at,
        executed_at: batch.executed_at,
        students
      }
    });
  } catch (error) {
    console.error('Error in getPromotionBatchDetail:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดรอบการเลื่อนชั้น',
      error: error.message
    });
  }
};

// ============================================================
// @desc    ยกเลิก/Rollback รอบการเลื่อนชั้นปี
// @route   DELETE /api/admin/student-promotion/batch/:id
// @access  Admin only
// ============================================================
exports.rollbackPromotionBatch = async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const batch = await prisma.promotionBatch.findUnique({
      where: { id: batchId },
      include: { histories: true }
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'ไม่พบรอบการเลื่อนชั้นที่ระบุ' });
    }

    // ถ้ามีคนที่จบการศึกษา (to_year >= 5) ในรอบนี้ ให้ rollback กลับเป็น active student
    const graduatedHistories = batch.histories.filter(h => h.to_year >= 5);
    const graduatedProfileIds = graduatedHistories.map(h => h.profile_id);

    await prisma.$transaction(async (tx) => {
      if (graduatedProfileIds.length > 0) {
        await tx.profile.updateMany({
          where: { profile_id: { in: graduatedProfileIds } },
          data: {
            student_status: 'active',
            graduation_year: null,
            graduation_date: null
          }
        });

        await tx.user.updateMany({
          where: { username: { in: graduatedProfileIds } },
          data: { role: 'student' }
        });
      }

      // ลบ batch (histories จะถูกลบตาม CASCADE)
      await tx.promotionBatch.delete({
        where: { id: batchId }
      });
    });

    res.json({
      success: true,
      message: `ยกเลิกรอบการเลื่อนชั้นปี #${batchId} สำเร็จ รายชื่อนักศึกษาทั้งหมดถูกย้อนกลับสถานะเดิมเรียบร้อยแล้ว`
    });
  } catch (error) {
    console.error('Error in rollbackPromotionBatch:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยกเลิกรอบการเลื่อนชั้น',
      error: error.message
    });
  }
};
