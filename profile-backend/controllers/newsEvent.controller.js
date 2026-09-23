const prisma = require('../prismaClient');

// Helper to convert BE or CE year to CE number
const parseYearToCE = (yearStr) => {
  if (!yearStr) return null;
  const y = parseInt(yearStr, 10);
  if (isNaN(y)) return null;
  return y > 2400 ? y - 543 : y;
};

// @desc    Get all news and events with filters
// @route   GET /api/news-events
// @access  Private (students, teachers, alumni see published only; admin sees all)
exports.getAllNewsEvents = async (req, res) => {
  try {
    const { month, year, type, is_published, search } = req.query;
    const where = {};

    // Role-based visibility
    if (req.user.role !== 'admin') {
      where.is_published = true;
    } else if (is_published !== undefined && is_published !== '') {
      where.is_published = is_published === 'true' || is_published === true;
    }

    // Filter by type
    if (type && type !== 'ALL' && type !== 'ทั้งหมด') {
      where.type = type;
    }

    // Filter by date (month & year)
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

    // Search by keyword
    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { location: { contains: keyword } }
      ];
    }

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
        }
      }
    });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
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
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลข่าวสารหรือกิจกรรมนี้' });
    }

    // Non-admin cannot view unpublished events
    if (req.user.role !== 'admin' && !event.is_published) {
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
// @access  Private (Admin only)
exports.createNewsEvent = async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      event_date,
      start_time,
      end_time,
      location,
      image_url,
      attachment_url,
      attachment_name,
      is_pinned,
      is_published
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
      return res.status(400).json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง' });
    }

    const newEvent = await prisma.newsEvent.create({
      data: {
        title: title.trim(),
        type: type.trim(),
        description: description ? description.trim() : null,
        event_date: parsedDate,
        start_time: start_time ? start_time.trim() : null,
        end_time: end_time ? end_time.trim() : null,
        location: location ? location.trim() : null,
        image_url: image_url ? image_url.trim() : null,
        attachment_url: attachment_url ? attachment_url.trim() : null,
        attachment_name: attachment_name ? attachment_name.trim() : null,
        is_pinned: Boolean(is_pinned),
        is_published: is_published !== undefined ? Boolean(is_published) : true,
        created_by: req.user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true
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
// @access  Private (Admin only)
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

    const {
      title,
      type,
      description,
      event_date,
      start_time,
      end_time,
      location,
      image_url,
      attachment_url,
      attachment_name,
      is_pinned,
      is_published
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (type !== undefined) updateData.type = type.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (event_date !== undefined) {
      const parsedDate = new Date(event_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: 'รูปแบบวันที่ไม่ถูกต้อง' });
      }
      updateData.event_date = parsedDate;
    }
    if (start_time !== undefined) updateData.start_time = start_time ? start_time.trim() : null;
    if (end_time !== undefined) updateData.end_time = end_time ? end_time.trim() : null;
    if (location !== undefined) updateData.location = location ? location.trim() : null;
    if (image_url !== undefined) updateData.image_url = image_url ? image_url.trim() : null;
    if (attachment_url !== undefined) updateData.attachment_url = attachment_url ? attachment_url.trim() : null;
    if (attachment_name !== undefined) updateData.attachment_name = attachment_name ? attachment_name.trim() : null;
    if (is_pinned !== undefined) updateData.is_pinned = Boolean(is_pinned);
    if (is_published !== undefined) updateData.is_published = Boolean(is_published);

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
// @access  Private (Admin only)
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
// @access  Private (Admin only)
exports.togglePin = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง' });
    }

    const existing = await prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    const updated = await prisma.newsEvent.update({
      where: { id },
      data: { is_pinned: !existing.is_pinned }
    });

    res.status(200).json({
      success: true,
      message: updated.is_pinned ? 'ปักหมุดข่าวสาร/กิจกรรมแล้ว' : 'ยกเลิกการปักหมุดแล้ว',
      data: updated
    });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะปักหมุด',
      error: error.message
    });
  }
};

// @desc    Toggle published status
// @route   PATCH /api/news-events/:id/publish
// @access  Private (Admin only)
exports.togglePublish = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง' });
    }

    const existing = await prisma.newsEvent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    const updated = await prisma.newsEvent.update({
      where: { id },
      data: { is_published: !existing.is_published }
    });

    res.status(200).json({
      success: true,
      message: updated.is_published ? 'เผยแพร่ข่าวสาร/กิจกรรมแล้ว' : 'ยกเลิกการเผยแพร่แล้ว',
      data: updated
    });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะเผยแพร่',
      error: error.message
    });
  }
};
