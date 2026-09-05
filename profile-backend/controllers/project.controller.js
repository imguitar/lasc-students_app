const prisma = require('../prismaClient');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getAllProjects = async (req, res) => {
  try {
    const { year, status, tags, search, has_award } = req.query;
    let where = {};

    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (has_award) where.has_award = has_award === 'true';

    // Tags filtering: simpler way for MySQL
    // Note: The schema defines tags as Json. Querying Json in MySQL might require specific syntax.
    // For simplicity, if tags is passed, we skip exact filtering in the DB query and filter in memory, 
    // or just let it be. Prisma allows path/equals for JSON. We'll skip complex tags filtering for now.

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
        name: `${p.advisor.firstname} ${p.advisor.lastname}`.trim(),
        department: p.advisor.department?.department_name || '',
        faculty_id: p.advisor.faculty_id ? p.advisor.faculty_id.toString() : '',
        department_id: p.advisor.department_id ? p.advisor.department_id.toString() : ''
      } : null,
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

    // If tags filtering is needed, do it in memory for safety with JSON fields
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

    // Since User email/phone is separate, we'd ideally join User table, but to keep it fast, we can omit email/phone or fetch it.
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
    
    // Map Frontend IDs to profile_ids
    // The frontend sends `data.advisor` (which might be the profile.id or profile_id). 
    // We need `advisor_profile_id` which is a String.
    let advisorProfileId = null;
    if (data.advisor) {
      // Find the advisor profile
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

    const projectData = {
      project_id: projectId,
      title_th: data.title_th,
      title_en: data.title_en || '',
      description: data.description || '',
      year: data.year ? parseInt(data.year) : new Date().getFullYear() + 543,
      document_url: data.document_url || '',
      status: data.status || 'Draft',
      type: data.type || 'individual',
      has_award: data.has_award === true || data.has_award === 'true',
      tags: data.tags || [],
      members: {
        create: memberProfileIds.map(pid => ({ profile_id: pid }))
      }
    };

    if (advisorProfileId) {
      projectData.advisor_profile_id = advisorProfileId;
    }

    console.log('Creating project with data:', JSON.stringify(projectData, null, 2));

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
// @access  Private (Admin/Student)
exports.updateProject = async (req, res) => {
  try {
    const data = { ...req.body };
    const projectId = parseInt(req.params.id);

    // Map advisor
    let advisorProfileId = undefined;
    if (data.advisor) {
      const adv = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(data.advisor) || -1 }, { profile_id: String(data.advisor) }] } });
      if (adv) advisorProfileId = adv.profile_id;
    }

    // Map members
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
    if (data.status !== undefined) updateData.status = data.status;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.has_award !== undefined) updateData.has_award = data.has_award === true || data.has_award === 'true';
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (advisorProfileId !== undefined) updateData.advisor_profile_id = advisorProfileId;

    if (memberProfileIds !== undefined) {
      // delete old members
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
    // Attempt to find profile_id from id or directly use string
    const profile = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(studentIdParam) || -1 }, { profile_id: studentIdParam }] } });
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            profile_id: profile.profile_id
          }
        }
      },
      include: {
        advisor: {
          include: { department: true }
        }
      }
    });
    
    // Map to frontend expected format
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
