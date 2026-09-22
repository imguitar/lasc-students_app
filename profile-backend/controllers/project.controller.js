const prisma = require('../prismaClient');

const VALID_STATUSES = ['draft', 'approved', 'in_progress', 'waiting_defense', 'passed_defense', 'completed'];

// แปลงค่าสถานะให้เป็นรูปแบบปัจจุบัน — รองรับค่าเดิมที่เป็นตัวใหญ่ ('Draft', 'Approved', 'Completed')
// คืน null ถ้าไม่รู้จัก เพื่อให้ผู้เรียกตัดสินใจเองว่าจะปฏิเสธหรือใช้ค่าเริ่มต้น
// (ห้ามคืน 'draft' เป็น fallback ที่นี่ เพราะจะทำให้สถานะที่พิมพ์ผิดกลายเป็นแบบร่างแบบเงียบ ๆ)
const normalizeStatus = (status) => {
  if (status === undefined || status === null || status === '') return null;
  const s = String(status).trim().toLowerCase();
  return VALID_STATUSES.includes(s) ? s : null;
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getAllProjects = async (req, res) => {
  try {
    const { year, status, tags, search, has_award } = req.query;
    let where = {};

    if (year) where.year = parseInt(year);
    if (status) {
      const normalized = normalizeStatus(status);
      // ค่าที่ไม่รู้จักต้องได้ผลลัพธ์ว่าง ไม่ใช่ถูกละเลยจนคืนทุกโครงงาน
      if (!normalized) return res.json({ success: true, count: 0, data: [] });
      where.status = normalized;
    }
    if (has_award) where.has_award = has_award === 'true';

    if (search) {
      where.OR = [
        { title_th: { contains: search } },
        { title_en: { contains: search } },
        { description: { contains: search } }
      ];
    }

    let projects = await prisma.project.findMany({
      where,
      include: {
        advisor: {
          include: { department: true }
        },
        members: {
          include: { profile: true }
        }
      },
      orderBy: { year: 'desc' }
    });

    // Map to frontend expected format
    const mappedProjects = projects.map(p => ({
      ...p,
      advisor: p.advisor ? {
        id: p.advisor.id,
        advisor_id: p.advisor.profile_id,
        name: `${p.advisor.firstname} ${p.advisor.lastname}`.trim(),
        department: p.advisor.department?.department_name || '',
        faculty_id: p.advisor.faculty_id ? p.advisor.faculty_id.toString() : '',
        department_id: p.advisor.department_id ? p.advisor.department_id.toString() : '',
        email: p.advisor.email || ''
      } : null,
      advisor_profile_id: p.advisor_profile_id || '',
      created_by_profile_id: p.created_by_profile_id || '',
      members: p.members.map(m => {
        if (!m.profile) return null;
        return {
          id: m.profile.id,
          student_id: m.profile.profile_id,
          first_name: m.profile.firstname,
          last_name: m.profile.lastname
        };
      }).filter(Boolean)
    }));

    let finalProjects = mappedProjects;
    if (tags) {
      const searchTags = tags.split(',').map(t => t.trim().toLowerCase());
      finalProjects = finalProjects.filter(p => {
        if (!p.tags || !Array.isArray(p.tags)) return false;
        return p.tags.some(t => searchTags.includes(t.toLowerCase()));
      });
    }
    
    res.json({
      success: true,
      count: finalProjects.length,
      data: finalProjects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching projects',
      error: error.message 
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        advisor: { include: { department: true } },
        members: { include: { profile: true } }
      }
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const mappedProject = {
      ...project,
      advisor: project.advisor ? {
        id: project.advisor.id,
        name: `${project.advisor.firstname} ${project.advisor.lastname}`.trim(),
        department: project.advisor.department?.department_name || '',
        faculty_id: project.advisor.faculty_id ? project.advisor.faculty_id.toString() : '',
        department_id: project.advisor.department_id ? project.advisor.department_id.toString() : '',
        email: '',
        phone: ''
      } : null,
      members: project.members.map(m => ({
        id: m.profile.id,
        student_id: m.profile.profile_id,
        first_name: m.profile.firstname,
        last_name: m.profile.lastname,
        email: ''
      }))
    };
    
    res.json({
      success: true,
      data: mappedProject
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching project', error: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin/Student)
exports.createProject = async (req, res) => {
  try {
    const data = { ...req.body };
    
    let advisorProfileId = null;
    if (data.advisor) {
      const adv = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(data.advisor) || -1 }, { profile_id: String(data.advisor) }] } });
      if (adv) advisorProfileId = adv.profile_id;
    }

    let memberProfileIds = [];
    if (data.members && Array.isArray(data.members)) {
      for (const mId of data.members) {
        const mem = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(mId) || -1 }, { profile_id: String(mId) }] } });
        if (mem) memberProfileIds.push(mem.profile_id);
      }
    }

    // Auto-generate project_id
    const count = await prisma.project.count();
    const projectId = `PJ${String(count + 1).padStart(4, '0')}`;

    const creatorUsername = req.user?.username;
    if (req.user?.role === 'student' && creatorUsername) {
      if (!memberProfileIds.includes(creatorUsername)) {
        memberProfileIds.push(creatorUsername);
      }
    }

    const projectData = {
      project_id: projectId,
      title_th: data.title_th,
      title_en: data.title_en || '',
      description: data.description || '',
      year: data.year ? parseInt(data.year) : new Date().getFullYear() + 543,
      document_url: data.document_url || '',
      status: normalizeStatus(data.status) || 'draft',
      type: data.type || 'individual',
      has_award: data.has_award === true || data.has_award === 'true',
      tags: data.tags || [],
      created_by_profile_id: creatorUsername || null,
      members: {
        create: memberProfileIds.map(pid => ({ profile_id: pid }))
      }
    };

    if (advisorProfileId) {
      projectData.advisor_profile_id = advisorProfileId;
    }

    const project = await prisma.project.create({ 
      data: projectData,
      include: { advisor: true, members: true }
    });
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Project ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating project', error: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin/Student/Advisor)
exports.updateProject = async (req, res) => {
  try {
    const data = { ...req.body };
    const projectId = parseInt(req.params.id);

    const existing = await prisma.project.findUnique({
      where: { id: projectId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    let advisorProfileId = undefined;
    if (data.advisor !== undefined) {
      if (data.advisor) {
        const adv = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(data.advisor) || -1 }, { profile_id: String(data.advisor) }] } });
        if (adv) advisorProfileId = adv.profile_id;
      } else {
        advisorProfileId = null;
      }
    }

    let memberProfileIds = undefined;
    if (data.members && Array.isArray(data.members)) {
      memberProfileIds = [];
      for (const mId of data.members) {
        const mem = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(mId) || -1 }, { profile_id: String(mId) }] } });
        if (mem) memberProfileIds.push(mem.profile_id);
      }
    }

    const updateData = {};
    if (data.title_th !== undefined) updateData.title_th = data.title_th;
    if (data.title_en !== undefined) updateData.title_en = data.title_en;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.year !== undefined) updateData.year = parseInt(data.year);
    if (data.document_url !== undefined) updateData.document_url = data.document_url;
    if (data.status !== undefined) {
      const normalizedStatus = normalizeStatus(data.status);
      if (!normalizedStatus) {
        return res.status(400).json({
          success: false,
          message: `สถานะไม่ถูกต้อง ค่าที่อนุญาต: ${VALID_STATUSES.join(', ')}`
        });
      }
      updateData.status = normalizedStatus;
    }
    if (data.project_type !== undefined) updateData.type = data.project_type.toLowerCase();
    else if (data.type !== undefined) updateData.type = data.type;
    if (data.has_award !== undefined) updateData.has_award = data.has_award === true || data.has_award === 'true';
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (advisorProfileId !== undefined) updateData.advisor_profile_id = advisorProfileId;

    if (memberProfileIds !== undefined) {
      await prisma.projectMember.deleteMany({ where: { project_id: projectId } });
      updateData.members = {
        create: memberProfileIds.map(pid => ({ profile_id: pid }))
      };
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: { advisor: true, members: true }
    });
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(500).json({ success: false, message: 'Error updating project', error: error.message });
  }
};

// @desc    Update project status specifically with workflow validation
// @route   PUT /api/projects/:id/status
// @access  Private (Admin/Advisor/Student)
exports.updateProjectStatus = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const normalized = normalizeStatus(status);
    if (!normalized) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` 
      });
    }

    const existingProject = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: normalized },
      include: { advisor: true, members: true }
    });

    res.json({
      success: true,
      message: `ปรับปรุงสถานะโครงงานเป็น ${normalized} สำเร็จ`,
      data: project
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status', error: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin)
exports.deleteProject = async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(500).json({ success: false, message: 'Error deleting project', error: error.message });
  }
};

// @desc    Get projects by student
// @route   GET /api/projects/student/:studentId
// @access  Private
exports.getProjectsByStudent = async (req, res) => {
  try {
    const studentIdParam = req.params.studentId;
    const profile = await prisma.profile.findFirst({
      where: { OR: [{ id: parseInt(studentIdParam) || -1 }, { profile_id: studentIdParam }] }
    });
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          {
            members: {
              some: {
                profile_id: profile.profile_id
              }
            }
          },
          {
            created_by_profile_id: profile.profile_id
          }
        ]
      },
      include: {
        advisor: {
          include: { department: true }
        }
      }
    });
    
    const mappedProjects = projects.map(p => ({
      ...p,
      advisor: p.advisor ? {
        name: `${p.advisor.firstname} ${p.advisor.lastname}`.trim(),
        department: p.advisor.department?.department_name || ''
      } : null
    }));

    res.json({
      success: true,
      count: mappedProjects.length,
      data: mappedProjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching student projects', error: error.message });
  }
};
