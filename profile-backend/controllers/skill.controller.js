const prisma = require('../prismaClient');

// @desc    Get all master skills
// @route   GET /api/skills
// @access  Private
exports.getAllSkills = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};

    if (category && category.trim() !== '') {
      where.category = category.trim();
    }

    if (search && search.trim() !== '') {
      where.name = { contains: search.trim() };
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    res.json({ success: true, count: skills.length, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching skills', error: error.message });
  }
};

// @desc    Create new master skill
// @route   POST /api/skills
// @access  Private
exports.createSkill = async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อทักษะ' });
    }

    const skill = await prisma.skill.upsert({
      where: { name: name.trim() },
      update: { category: category || undefined },
      create: {
        name: name.trim(),
        category: category || 'other'
      }
    });

    res.status(201).json({ success: true, message: 'บันทึกทักษะสำเร็จ', data: skill });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating skill', error: error.message });
  }
};

// @desc    Delete master skill
// @route   DELETE /api/skills/:id
// @access  Private (Admin)
exports.deleteSkill = async (req, res) => {
  try {
    await prisma.skill.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'ลบทักษะสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting skill', error: error.message });
  }
};
