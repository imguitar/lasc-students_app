const prisma = require('../prismaClient');
const emailService = require('../services/email.service');

// Helper to convert BE or CE year to CE number
const parseYearToCE = (yearStr) => {
  if (!yearStr) return null;
  const y = parseInt(yearStr, 10);
  if (isNaN(y)) return null;
  return y > 2400 ? y - 543 : y;
};

// Helper to compute student year level from profile_id (e.g. '6811506101' -> year 2568)
const computeStudentYear = (profileId) => {
  if (!profileId) return null;
  const match = profileId.match(/^(\d{2})/);
  if (!match) return null;
  const batch = parseInt(match[1], 10);
  const entryBE = 2500 + batch;
  const currentBE = new Date().getFullYear() + 543;
  return Math.max(1, currentBE - entryBE + 1);
};

// @desc    Get all news and events with target group filtering
// @route   GET /api/news-events
// @access  Private
exports.getAllNewsEvents = async (req, res) => {
  try {
    const { month, year, type, is_published, search, target_type } = req.query;
    const userRole = req.user.role;
    const where = {};

    // 1. Role-based publish visibility
    if (userRole === 'admin') {
      if (is_published !== undefined && is_published !== '') {
        where.is_published = is_published === 'true' || is_published === true;
      }
    } else if (userRole === 'advisor' || userRole === 'teacher') {
      // Advisors see published news, OR their own unpublished drafts
      where.OR = [
        { is_published: true },
        { created_by: req.user.id }
      ];
    } else {
      where.is_published = true;
    }

    // 2. Filter by category type
    if (type && type !== 'ALL' && type !== 'ทั้งหมด') {
      where.type = type;
    }

    // 3. Filter by date (month & year)
    const ceYear = parseYearToCE(year);
    const m = month ? parseInt(month, 10) : null;

    if (ceYear && m && m >= 1 && m <= 12) {
      const startOfMonth = new Date(Date.UTC(ceYear, m - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(ceYear, m, 0, 23, 59, 59, 999));
      where.event_date = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    } else if (ceYear) {
      const startOfYear = new Date(Date.UTC(ceYear, 0, 1, 0, 0, 0));
      const endOfYear = new Date(Date.UTC(ceYear, 11, 31, 23, 59, 59, 999));
      where.event_date = {
        gte: startOfYear,
        lte: endOfYear
      };
    }

    // 4. Search by keyword
    if (search && search.trim()) {
      const keyword = search.trim();
      const searchConditions = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { location: { contains: keyword } }
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // 5. Target group filtering for non-admin
    const userProfile = await prisma.profile.findUnique({
      where: { profile_id: req.user.username }
    });

    const events = await prisma.newsEvent.findMany({
      where,
      orderBy: [
        { is_pinned: 'desc' },
        { event_date: 'asc' },
        { start_time: 'asc' },
        { created_at: 'desc' }
      ],
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            department_name: true,
            department_id: true
          }
        },
        faculty: {
          select: {
            id: true,
            faculty_name: true
          }
        }
      }
    });

    // In-memory target group filtering for precise match
    let filteredEvents = events;
    if (userRole !== 'admin') {
      const studentYear = computeStudentYear(userProfile?.profile_id);
      const userDeptId = userProfile?.department_id;
      const userFacultyId = userProfile?.faculty_id;

      filteredEvents = events.filter((ev) => {
        // Creator always sees their own events
        if (ev.created_by === req.user.id) return true;

        const target = ev.target_type || 'all';

        // Public to everyone
        if (target === 'all') return true;

        // Faculty target
        if (target === 'faculty') {
          return !ev.faculty_id || ev.faculty_id === userFacultyId;
        }

        // Department target
        if (target === 'department') {
          return !ev.department_id || ev.department_id === userDeptId;
        }

        // Year level target (for students)
        if (target === 'year') {
          if (userRole === 'advisor' || userRole === 'teacher') return true;
          return !ev.year_level || ev.year_level === studentYear;
        }

        // Department + Year target
        if (target === 'department_year') {
          const deptMatch = !ev.department_id || ev.department_id === userDeptId;
          if (userRole === 'advisor' || userRole === 'teacher') return deptMatch;
          const yearMatch = !ev.year_level || ev.year_level === studentYear;
          return deptMatch && yearMatch;
        }

        return true;
      });
    }

    res.status(200).json({
      success: true,
      count: filteredEvents.length,
      data: filteredEvents
    });
  } catch (error) {
    console.error('Error fetching news & events:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข่าวสารและกิจกรรม',
      error: error.message
    });
  }
};

// @desc    Get single news/event by ID
// @route   GET /api/news-events/:id
// @access  Private
exports.getNewsEventById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง' });
    }

    const event = await prisma.newsEvent.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            department_name: true,
            department_id: true
          }
        },
        faculty: {
          select: {
            id: true,
            faculty_name: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลข่าวสารหรือกิจกรรมนี้' });
    }

    // Role check: non-admin & non-creator cannot view unpublished events
    if (req.user.role !== 'admin' && event.created_by !== req.user.id && !event.is_published) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลข่าวสารหรือกิจกรรมนี้' });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching news event by ID:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message
    });
  }
};

// @desc    Create a new news/event
// @route   POST /api/news-events
// @access  Private (Admin, Advisor, Teacher)
exports.createNewsEvent = async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      event_date,
      end_date,
      start_time,
      end_time,
      location,
      image_url,
      attachment_url,
      attachment_name,
      is_pinned,
      is_published,
      target_type,
      department_id,
      faculty_id,
      year_level
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกหัวข้อข่าว/กิจกรรม' });
    }

    if (!type || !type.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกประเภท' });
    }

    if (!event_date) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุวันที่จัดกิจกรรม' });
    }

    const parsedDate = new Date(event_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'รูปแบบวันที่จัดกิจกรรมไม่ถูกต้อง' });
    }

    let parsedEndDate = null;
    if (end_date) {
      parsedEndDate = new Date(end_date);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ success: false, message: 'รูปแบบวันสิ้นสุดกิจกรรมไม่ถูกต้อง' });
      }
    }

    const userRole = req.user.role;
    let finalTargetType = target_type || 'all';
    let finalDeptId = department_id ? parseInt(department_id, 10) : null;
    let finalFacultyId = faculty_id ? parseInt(faculty_id, 10) : null;
    let finalYearLevel = year_level ? parseInt(year_level, 10) : null;

    // Permissions for Advisor/Teacher
    if (userRole === 'advisor' || userRole === 'teacher') {
      const profile = await prisma.profile.findUnique({
        where: { profile_id: req.user.username }
      });

      if (!profile || !profile.department_id) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลสาขาวิชาของอาจารย์ ไม่สามารถสร้างข่าวสารได้'
        });
      }

      // Advisor news is bound to their department
      finalDeptId = profile.department_id;
      finalFacultyId = profile.faculty_id;

      // If advisor set 'all', change to their department or let them target their department/year
      if (!['department', 'department_year'].includes(finalTargetType)) {
        finalTargetType = finalYearLevel ? 'department_year' : 'department';
      }
    }

    const newEvent = await prisma.newsEvent.create({
      data: {
        title: title.trim(),
        type: type.trim(),
        description: description ? description.trim() : '',
        event_date: parsedDate,
        end_date: parsedEndDate,
        start_time: start_time ? start_time.trim() : null,
        end_time: end_time ? end_time.trim() : null,
        location: location ? location.trim() : null,
        image_url: image_url ? image_url.trim() : null,
        attachment_url: attachment_url ? attachment_url.trim() : null,
        attachment_name: attachment_name ? attachment_name.trim() : null,
        is_pinned: Boolean(is_pinned),
        is_published: is_published !== undefined ? Boolean(is_published) : true,
        created_by: req.user.id,
        target_type: finalTargetType,
        department_id: finalDeptId,
        faculty_id: finalFacultyId,
        year_level: finalYearLevel
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            department_name: true,
            department_id: true
          }
        },
        faculty: {
          select: {
            id: true,
            faculty_name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'สร้างข่าวสาร/กิจกรรมเรียบร้อยแล้ว',
      data: newEvent
    });
  } catch (error) {
    console.error('Error creating news event:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างข่าวสาร/กิจกรรม',
      error: error.message
    });
  }
};

// @desc    Update a news/event
// @route   PUT /api/news-events/:id
// @access  Private (Admin, or Author Advisor)
exports.updateNewsEvent = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง' });
    }

    const existing = await prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลที่ต้องการแก้ไข' });
    }

    // Role check: Advisor can only edit their own news
    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'คุณสามารถแก้ไขได้เฉพาะข่าวสาร/กิจกรรมที่ตนเองเป็นผู้สร้างเท่านั้น'
      });
    }

    const {
      title,
      type,
      description,
      event_date,
      end_date,
      start_time,
      end_time,
      location,
      image_url,
      attachment_url,
      attachment_name,
      is_pinned,
      is_published,
      target_type,
      department_id,
      faculty_id,
      year_level
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (type !== undefined) updateData.type = type.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : '';
    if (event_date !== undefined) {
      const parsedDate = new Date(event_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง' });
      }
      updateData.event_date = parsedDate;
    }
    if (end_date !== undefined) {
      if (end_date) {
        const parsedEndDate = new Date(end_date);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ success: false, message: 'รูปแบบวันสิ้นสุดไม่ถูกต้อง' });
        }
        updateData.end_date = parsedEndDate;
      } else {
        updateData.end_date = null;
      }
    }
    if (start_time !== undefined) updateData.start_time = start_time ? start_time.trim() : null;
    if (end_time !== undefined) updateData.end_time = end_time ? end_time.trim() : null;
    if (location !== undefined) updateData.location = location ? location.trim() : null;
    if (image_url !== undefined) updateData.image_url = image_url ? image_url.trim() : null;
    if (attachment_url !== undefined) updateData.attachment_url = attachment_url ? attachment_url.trim() : null;
    if (attachment_name !== undefined) updateData.attachment_name = attachment_name ? attachment_name.trim() : null;
    if (is_pinned !== undefined) updateData.is_pinned = Boolean(is_pinned);
    if (is_published !== undefined) updateData.is_published = Boolean(is_published);

    if (target_type !== undefined) updateData.target_type = target_type;
    if (req.user.role === 'admin') {
      if (department_id !== undefined) updateData.department_id = department_id ? parseInt(department_id, 10) : null;
      if (faculty_id !== undefined) updateData.faculty_id = faculty_id ? parseInt(faculty_id, 10) : null;
    }
    if (year_level !== undefined) updateData.year_level = year_level ? parseInt(year_level, 10) : null;

    const updatedEvent = await prisma.newsEvent.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            department_name: true,
            department_id: true
          }
        },
        faculty: {
          select: {
            id: true,
            faculty_name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'อัปเดตข้อมูลข่าวสาร/กิจกรรมเรียบร้อยแล้ว',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating news event:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล',
      error: error.message
    });
  }
};

// @desc    Delete a news/event
// @route   DELETE /api/news-events/:id
// @access  Private (Admin, or Author Advisor)
exports.deleteNewsEvent = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง' });
    }

    const existing = await prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' });
    }

    // Role check: Advisor can only delete their own news
    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'คุณสามารถลบได้เฉพาะข่าวสาร/กิจกรรมที่ตนเองเป็นผู้สร้างเท่านั้น'
      });
    }

    await prisma.newsEvent.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'ลบข่าวสาร/กิจกรรมเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting news event:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อมูล',
      error: error.message
    });
  }
};

// @desc    Toggle pinned status
// @route   PATCH /api/news-events/:id/pin
// @access  Private (Admin or Creator)
exports.togglePin = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการนี้' });
    }

    const updated = await prisma.newsEvent.update({
      where: { id },
      data: { is_pinned: !existing.is_pinned }
    });

    res.status(200).json({
      success: true,
      message: `เปลี่ยนสถานะปักหมุดเป็น: ${updated.is_pinned ? 'ปักหมุด' : 'ยกเลิกปักหมุด'}`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// @desc    Toggle published status
// @route   PATCH /api/news-events/:id/publish
// @access  Private (Admin or Creator)
exports.togglePublish = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการนี้' });
    }

    const updated = await prisma.newsEvent.update({
      where: { id },
      data: { is_published: !existing.is_published }
    });

    res.status(200).json({
      success: true,
      message: `เปลี่ยนสถานะเผยแพร่เป็น: ${updated.is_published ? 'เผยแพร่' : 'แบบร่าง'}`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// =========================================================================
// EMAIL NOTIFICATIONS FOR NEWS & EVENTS
// =========================================================================

/**
 * Helper ค้นหาและคำนวณผู้รับที่ตรงตามเงื่อนไขจาก Database จริง
 */
const resolveEventRecipients = async (eventId, options = {}) => {
  const event = await prisma.newsEvent.findUnique({
    where: { id: eventId },
    include: {
      faculty: true,
      department: true
    }
  });

  if (!event) {
    throw new Error('ไม่พบข้อมูลข่าวสารหรือกิจกรรมนี้');
  }

  const targetType = options.target_type || event.target_type || 'all';
  const facultyId = options.faculty_id ? parseInt(options.faculty_id, 10) : event.faculty_id;
  const departmentId = options.department_id ? parseInt(options.department_id, 10) : event.department_id;
  const yearLevel = options.year_level ? parseInt(options.year_level, 10) : event.year_level;
  const specificUserIds = Array.isArray(options.specific_user_ids)
    ? options.specific_user_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id))
    : [];

  // กำหนดเงื่อนไขดึง User
  let userWhere = { isActive: true };

  if (targetType === 'teachers') {
    userWhere.role = { in: ['advisor', 'teacher'] };
  } else if (targetType === 'everyone') {
    userWhere.role = { in: ['student', 'advisor', 'teacher'] };
  } else if (targetType === 'specific' && specificUserIds.length > 0) {
    userWhere.id = { in: specificUserIds };
  } else {
    // เป้าหมายปกติ (all, faculty, department, year, department_year) เป็นของนักศึกษา
    userWhere.role = 'student';
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  if (users.length === 0) {
    return { event, recipients: [] };
  }

  // ดึง Profile เพื่อทราบ คณะ, สาขา, และชั้นปี
  const usernames = users.map(u => u.username);
  const profiles = await prisma.profile.findMany({
    where: { profile_id: { in: usernames } },
    include: {
      faculty: true,
      department: true
    }
  });

  const profileMap = new Map();
  profiles.forEach(p => profileMap.set(p.profile_id, p));

  // ดึงประวัติการเลื่อนชั้นปีเพื่อคำนวณชั้นปีจริง
  const profileIds = profiles.map(p => p.profile_id);
  const promotionMap = new Map();

  if (profileIds.length > 0) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const effectiveHistories = await prisma.promotionHistory.findMany({
      where: {
        profile_id: { in: profileIds },
        status: 'promoted',
        batch: {
          status: 'executed',
          effective_date: { lte: endOfToday }
        }
      },
      include: {
        batch: { select: { academic_year: true, effective_date: true } }
      },
      orderBy: [
        { batch: { academic_year: 'desc' } },
        { batch: { effective_date: 'desc' } },
        { id: 'desc' }
      ]
    });

    for (const h of effectiveHistories) {
      if (!promotionMap.has(h.profile_id)) {
        promotionMap.set(h.profile_id, h);
      }
    }
  }

  // ดึงประวัติที่เคยส่งอีเมลกิจกรรมนี้สำเร็จแล้ว เพื่อป้องกันการส่งซ้ำ
  const sentNotifications = await prisma.eventEmailNotification.findMany({
    where: {
      news_event_id: eventId,
      status: 'SENT'
    },
    select: {
      user_id: true,
      recipient_email: true
    }
  });

  const sentUserIds = new Set(sentNotifications.filter(n => n.user_id).map(n => n.user_id));
  const sentEmails = new Set(sentNotifications.map(n => n.recipient_email?.toLowerCase().trim()));

  const recipients = [];

  for (const u of users) {
    const p = profileMap.get(u.username);

    // กรองสำหรับนักศึกษา
    if (u.role === 'student') {
      if (targetType === 'faculty' && facultyId) {
        if (!p || p.faculty_id !== facultyId) continue;
      }
      if ((targetType === 'department' || targetType === 'department_year') && departmentId) {
        if (!p || p.department_id !== departmentId) continue;
      }

      // คำนวณชั้นปี
      let studentYear = null;
      let isGraduated = false;
      if (p) {
        const promo = promotionMap.get(p.profile_id);
        if (promo) {
          studentYear = promo.to_year;
          if (studentYear >= 5) isGraduated = true;
        } else {
          const match = p.profile_id.match(/^(\d{2})/);
          if (match) {
            const entryBE = 2500 + parseInt(match[1], 10);
            const currentBE = new Date().getFullYear() + 543;
            studentYear = Math.max(1, currentBE - entryBE + 1);
          }
        }
        if (p.student_status === 'graduated' || p.graduation_year !== null) {
          isGraduated = true;
        }
      }

      // ไม่ส่งให้นักศึกษาที่จบการศึกษาแล้ว
      if (isGraduated) continue;

      // กรองตามชั้นปี
      if ((targetType === 'year' || targetType === 'department_year') && yearLevel) {
        if (studentYear !== yearLevel) continue;
      }
    } else if (u.role === 'advisor' || u.role === 'teacher') {
      // ถ้าเลือกเฉพาะสาขา กรองอาจารย์ในสาขานั้นด้วย
      if (departmentId && p && p.department_id && p.department_id !== departmentId) {
        continue;
      }
    }

    const email = u.email ? u.email.trim() : '';
    const hasValidEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    const alreadySent = sentUserIds.has(u.id) || (hasValidEmail && sentEmails.has(email.toLowerCase()));

    const displayName = p
      ? `${p.prefix ? p.prefix + ' ' : ''}${p.firstname} ${p.lastname}`.trim()
      : u.username;

    recipients.push({
      userId: u.id,
      username: u.username,
      name: displayName,
      email: email || null,
      role: u.role,
      departmentId: p?.department_id || null,
      departmentName: p?.department?.department_name || null,
      facultyId: p?.faculty_id || null,
      facultyName: p?.faculty?.faculty_name || null,
      year: u.role === 'student' ? (promotionMap.get(u.username)?.to_year || computeStudentYear(u.username)) : null,
      hasEmail: hasValidEmail,
      alreadySent
    });
  }

  return { event, recipients };
};

// @desc    Preview email recipients for an event
// @route   GET /api/news-events/:id/email-recipients
// @access  Private (Admin only)
exports.getEventEmailRecipients = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสกิจกรรมไม่ถูกต้อง' });
    }

    const { target_type, faculty_id, department_id, year_level, specific_user_ids } = req.query;

    const parsedSpecificIds = specific_user_ids
      ? (typeof specific_user_ids === 'string' ? specific_user_ids.split(',') : specific_user_ids)
      : [];

    const { event, recipients } = await resolveEventRecipients(id, {
      target_type,
      faculty_id,
      department_id,
      year_level,
      specific_user_ids: parsedSpecificIds
    });

    const totalCount = recipients.length;
    const hasEmailCount = recipients.filter(r => r.hasEmail).length;
    const missingEmailCount = recipients.filter(r => !r.hasEmail).length;
    const alreadySentCount = recipients.filter(r => r.alreadySent).length;
    const readyToSendCount = recipients.filter(r => r.hasEmail && !r.alreadySent).length;

    res.status(200).json({
      success: true,
      data: {
        event: {
          id: event.id,
          title: event.title,
          type: event.type,
          event_date: event.event_date,
          target_type: event.target_type,
          location: event.location
        },
        summary: {
          total: totalCount,
          hasEmail: hasEmailCount,
          missingEmail: missingEmailCount,
          alreadySent: alreadySentCount,
          readyToSend: readyToSendCount
        },
        recipients
      }
    });
  } catch (error) {
    console.error('Error getting email recipients:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการค้นหาผู้รับอีเมล'
    });
  }
};

// @desc    Send email notification batch to event recipients
// @route   POST /api/news-events/:id/send-email
// @access  Private (Admin only)
exports.sendNewsEventEmailBatch = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสกิจกรรมไม่ถูกต้อง' });
    }

    const {
      target_type,
      faculty_id,
      department_id,
      year_level,
      specific_user_ids,
      force_resend = false,
      start_time,
      end_time,
      location
    } = req.body;

    // หากมีการระบุหรือแก้ไขเวลาและสถานที่ในคำขอส่งอีเมล ให้บันทึกลงฐานข้อมูลกิจกรรมด้วย
    const updateEventData = {};
    if (start_time !== undefined) updateEventData.start_time = start_time ? start_time.trim() : null;
    if (end_time !== undefined) updateEventData.end_time = end_time ? end_time.trim() : null;
    if (location !== undefined) updateEventData.location = location ? location.trim() : null;

    if (Object.keys(updateEventData).length > 0) {
      await prisma.newsEvent.update({
        where: { id },
        data: updateEventData
      });
    }

    const { event, recipients } = await resolveEventRecipients(id, {
      target_type,
      faculty_id,
      department_id,
      year_level,
      specific_user_ids
    });

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบผู้รับที่ตรงตามเงื่อนไขที่กำหนด'
      });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clientUrl = req.headers.origin || process.env.PROFILE_PUBLIC_URL || 'http://localhost:3000';

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // ประมวลผลทีละคน เพื่อป้องกันการส่งล้มเหลวคนหนึ่งทำให้ทุกคนล้มเหลว
    for (const r of recipients) {
      // 1. กรณีไม่มีอีเมล
      if (!r.hasEmail || !r.email) {
        await prisma.eventEmailNotification.create({
          data: {
            news_event_id: event.id,
            user_id: r.userId,
            recipient_email: r.email || `no-email-${r.username || r.userId}@placeholder`,
            recipient_name: r.name,
            recipient_role: r.role,
            status: 'SKIPPED',
            error_message: 'ไม่มีข้อมูลอีเมลในระบบ',
            batch_id: batchId
          }
        });
        skippedCount++;
        continue;
      }

      // 2. กรณีเคยส่งแล้ว และไม่ได้ระบุให้ส่งซ้ำ (force_resend)
      if (r.alreadySent && !force_resend) {
        skippedCount++;
        continue;
      }

      // 3. สร้าง Notification Record สถานะ PENDING
      const notification = await prisma.eventEmailNotification.create({
        data: {
          news_event_id: event.id,
          user_id: r.userId,
          recipient_email: r.email,
          recipient_name: r.name,
          recipient_role: r.role,
          status: 'PENDING',
          batch_id: batchId
        }
      });

      // 4. ส่งอีเมล
      try {
        const sendResult = await emailService.sendNewsEventEmail({
          to: r.email,
          recipientName: r.name,
          event,
          clientUrl
        });

        if (sendResult.success) {
          await prisma.eventEmailNotification.update({
            where: { id: notification.id },
            data: {
              status: 'SENT',
              sent_at: new Date()
            }
          });
          sentCount++;
        } else {
          await prisma.eventEmailNotification.update({
            where: { id: notification.id },
            data: {
              status: 'FAILED',
              error_message: sendResult.error || 'ส่งอีเมลไม่สำเร็จ'
            }
          });
          failedCount++;
        }
      } catch (err) {
        console.error(`Error sending email to ${r.email}:`, err.message);
        await prisma.eventEmailNotification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            error_message: err.message
          }
        });
        failedCount++;
      }
    }

    const activeProvider = emailService.getActiveProvider();

    res.status(200).json({
      success: true,
      message: `ดำเนินการส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว`,
      data: {
        batchId,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        provider: activeProvider,
        simulated: activeProvider === 'simulated'
      }
    });
  } catch (error) {
    console.error('Error sending event emails:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือน'
    });
  }
};

// @desc    Get email notification history for an event
// @route   GET /api/news-events/:id/email-history
// @access  Private (Admin only)
exports.getNewsEventEmailHistory = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสกิจกรรมไม่ถูกต้อง' });
    }

    const event = await prisma.newsEvent.findUnique({
      where: { id },
      select: { id: true, title: true, type: true, event_date: true }
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'ไม่พบกิจกรรมนี้' });
    }

    const logs = await prisma.eventEmailNotification.findMany({
      where: { news_event_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });

    const summary = {
      total: logs.length,
      sent: logs.filter(l => l.status === 'SENT').length,
      failed: logs.filter(l => l.status === 'FAILED').length,
      skipped: logs.filter(l => l.status === 'SKIPPED').length,
      pending: logs.filter(l => l.status === 'PENDING').length
    };

    res.status(200).json({
      success: true,
      data: {
        event,
        summary,
        logs
      }
    });
  } catch (error) {
    console.error('Error fetching email history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการส่งอีเมล',
      error: error.message
    });
  }
};

// @desc    Retry sending failed email notifications
// @route   POST /api/news-events/:id/retry-failed-email
// @access  Private (Admin only)
exports.retryFailedNewsEventEmail = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสกิจกรรมไม่ถูกต้อง' });
    }

    const event = await prisma.newsEvent.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'ไม่พบกิจกรรมนี้' });
    }

    const { notification_ids } = req.body;
    const where = {
      news_event_id: id,
      status: 'FAILED'
    };

    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      where.id = { in: notification_ids.map(nid => parseInt(nid, 10)) };
    }

    const failedLogs = await prisma.eventEmailNotification.findMany({ where });

    if (failedLogs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'ไม่มีรายการที่ล้มเหลวสำหรับส่งใหม่',
        data: { retried: 0, sent: 0, failed: 0 }
      });
    }

    const clientUrl = req.headers.origin || process.env.PROFILE_PUBLIC_URL || 'http://localhost:3000';
    let sentCount = 0;
    let failedCount = 0;

    for (const log of failedLogs) {
      try {
        const sendResult = await emailService.sendNewsEventEmail({
          to: log.recipient_email,
          recipientName: log.recipient_name,
          event,
          clientUrl
        });

        if (sendResult.success) {
          await prisma.eventEmailNotification.update({
            where: { id: log.id },
            data: {
              status: 'SENT',
              sent_at: new Date(),
              error_message: null
            }
          });
          sentCount++;
        } else {
          await prisma.eventEmailNotification.update({
            where: { id: log.id },
            data: {
              error_message: sendResult.error || 'ส่งอีเมลไม่สำเร็จ'
            }
          });
          failedCount++;
        }
      } catch (err) {
        await prisma.eventEmailNotification.update({
          where: { id: log.id },
          data: {
            error_message: err.message
          }
        });
        failedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `ส่งอีเมลใหม่อีกครั้งแล้ว (สำเร็จ: ${sentCount}, ล้มเหลว: ${failedCount})`,
      data: {
        retried: failedLogs.length,
        sent: sentCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error('Error retrying failed emails:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการส่งใหม่อีกครั้ง'
    });
  }
};

