const prisma = require('../prismaClient');

const VALID_STATUSES = ['draft', 'approved', 'in_progress', 'waiting_defense', 'passed_defense', 'completed'];

// แปลงค่าสถานะให้เป็นรูปแบบปัจจุบัน — รองรับค่าเดิมที่เป็นตัวใหญ่ ('Draft', 'Approved', 'Completed')
const normalizeStatus = (status) => {
  if (status === undefined || status === null || status === '') return null;
  const s = String(status).trim().toLowerCase();
  return VALID_STATUSES.includes(s) ? s : null;
};

// Helper: Resolve advisors (main & co) from request payload
const resolveAdvisors = async (data) => {
  const result = []; // { profile_id, role: 'main' | 'co' }
  const seen = new Set();

  if (data.advisors && Array.isArray(data.advisors)) {
    for (let i = 0; i < data.advisors.length; i++) {
      const item = data.advisors[i];
      const advIdentifier = item.advisor_id || item.profile_id || item.id || item;
      const role = item.role === 'co' ? 'co' : (result.length === 0 ? 'main' : (item.role || 'co'));
      const advProfile = await prisma.profile.findFirst({
        where: { OR: [{ id: parseInt(advIdentifier) || -1 }, { profile_id: String(advIdentifier) }] }
      });
      if (advProfile && !seen.has(advProfile.profile_id)) {
        seen.add(advProfile.profile_id);
        result.push({ profile_id: advProfile.profile_id, role });
      }
    }
  } else {
    // Single or main advisor
    if (data.advisor) {
      const mainProfile = await prisma.profile.findFirst({
        where: { OR: [{ id: parseInt(data.advisor) || -1 }, { profile_id: String(data.advisor) }] }
      });
      if (mainProfile && !seen.has(mainProfile.profile_id)) {
        seen.add(mainProfile.profile_id);
        result.push({ profile_id: mainProfile.profile_id, role: 'main' });
      }
    }
    // Co-advisors array
    if (data.co_advisors && Array.isArray(data.co_advisors)) {
      for (const coId of data.co_advisors) {
        const coProfile = await prisma.profile.findFirst({
          where: { OR: [{ id: parseInt(coId) || -1 }, { profile_id: String(coId) }] }
        });
        if (coProfile && !seen.has(coProfile.profile_id)) {
          seen.add(coProfile.profile_id);
          result.push({ profile_id: coProfile.profile_id, role: 'co' });
        }
      }
    }
  }

  return result;
};

// Helper: Map project data to include multiple advisors and preserve backward compatibility
const mapProject = (p) => {
  const advisors = (p.advisors || []).map(a => ({
    id: a.profile?.id || a.id,
    advisor_id: a.profile?.profile_id || a.profile_id,
    name: a.profile ? `${a.profile.firstname} ${a.profile.lastname}`.trim() : '',
    department: a.profile?.department?.department_name || '',
    faculty_id: a.profile?.faculty_id ? a.profile.faculty_id.toString() : '',
    department_id: a.profile?.department_id ? a.profile.department_id.toString() : '',
    email: a.profile?.phone || '',
    role: a.role // 'main' or 'co'
  }));

  const mainAdvisor = advisors.find(a => a.role === 'main') || (p.advisor ? {
    id: p.advisor.id,
    advisor_id: p.advisor.profile_id,
    name: `${p.advisor.firstname} ${p.advisor.lastname}`.trim(),
    department: p.advisor.department?.department_name || '',
    faculty_id: p.advisor.faculty_id ? p.advisor.faculty_id.toString() : '',
    department_id: p.advisor.department_id ? p.advisor.department_id.toString() : '',
    email: '',
    role: 'main'
  } : null);

  const coAdvisors = advisors.filter(a => a.role === 'co');

  return {
    ...p,
    approval_status: p.approval_status || 'draft',
    approval_requested_at: p.approval_requested_at || null,
    approved_at: p.approved_at || null,
    approved_by: p.approved_by || null,
    rejected_at: p.rejected_at || null,
    rejected_by: p.rejected_by || null,
    rejection_reason: p.rejection_reason || null,
    approval_history: (p.approvalHistory || []).map(h => ({
      id: h.id,
      project_id: h.project_id,
      action: h.action,
      requested_by: h.requested_by,
      requested_at: h.requested_at,
      acted_by: h.acted_by,
      acted_at: h.acted_at,
      rejection_reason: h.rejection_reason,
      comments: h.comments
    })),
    advisor: mainAdvisor,
    advisors: advisors.length > 0 ? advisors : (mainAdvisor ? [mainAdvisor] : []),
    main_advisor: mainAdvisor,
    co_advisors: coAdvisors,
    advisor_profile_id: mainAdvisor?.advisor_id || p.advisor_profile_id || '',
    created_by_profile_id: p.created_by_profile_id || '',
    members: (p.members || []).map(m => {
      if (!m.profile) return null;
      return {
        id: m.profile.id,
        student_id: m.profile.profile_id,
        first_name: m.profile.firstname,
        last_name: m.profile.lastname,
        email: ''
      };
    }).filter(Boolean)
  };
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getAllProjects = async (req, res) => {
  try {
    const { year, status, approval_status, tags, search, has_award } = req.query;
    let where = {};

    if (year) where.year = parseInt(year);
    if (status) {
      const normalized = normalizeStatus(status);
      if (!normalized) return res.json({ success: true, count: 0, data: [] });
      where.status = normalized;
    }
    if (approval_status) {
      where.approval_status = approval_status.trim().toLowerCase();
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
        advisors: {
          include: {
            profile: { include: { department: true } }
          },
          orderBy: { role: 'asc' }
        },
        members: {
          include: { profile: true }
        },
        approvalHistory: {
          orderBy: { acted_at: 'desc' }
        }
      },
      orderBy: { year: 'desc' }
    });

    const mappedProjects = projects.map(mapProject);

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
        advisors: {
          include: {
            profile: { include: { department: true } }
          },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: {
          orderBy: { acted_at: 'desc' }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      data: mapProject(project)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching project', error: error.message });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin/Student/Advisor)
exports.createProject = async (req, res) => {
  try {
    const data = { ...req.body };
    
    const resolvedAdvisors = await resolveAdvisors(data);
    const mainAdvisor = resolvedAdvisors.find(a => a.role === 'main') || resolvedAdvisors[0];
    const advisorProfileId = mainAdvisor ? mainAdvisor.profile_id : null;

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
      advisor_profile_id: advisorProfileId,
      members: {
        create: memberProfileIds.map(pid => ({ profile_id: pid }))
      },
      advisors: {
        create: resolvedAdvisors.map(adv => ({
          profile_id: adv.profile_id,
          role: adv.role
        }))
      }
    };

    const project = await prisma.project.create({ 
      data: projectData,
      include: {
        advisor: true,
        advisors: { include: { profile: true } },
        members: true
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'สร้างโครงงานสำเร็จ',
      data: mapProject(project)
    });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'รหัสโครงงานซ้ำในระบบ' });
    }
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างโครงงาน', error: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin/Student)
exports.updateProject = async (req, res) => {
  try {
    const data = { ...req.body };
    const projectId = parseInt(req.params.id);

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: { advisors: true, members: true }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Role check:
    // 1. Advisor is forbidden from editing student's project details directly in approval flow
    if (req.user?.role === 'advisor' || req.user?.role === 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'อาจารย์ไม่ได้รับอนุญาตให้แก้ไขข้อมูลโครงงานของนักศึกษาโดยตรงในขั้นตอนอนุมัติ กรุณาใช้ปุ่มอนุมัติหรือไม่อนุมัติโครงการพร้อมระบุเหตุผล'
      });
    }

    // 2. Student can only edit their own project (creator or member)
    if (req.user?.role === 'student' || req.user?.role === 'alumni') {
      const isCreator = existing.created_by_profile_id === req.user.username;
      const isMember = existing.members.some(m => m.profile_id === req.user.username);
      if (!isCreator && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'คุณสามารถแก้ไขได้เฉพาะโครงงานของตนเองเท่านั้น'
        });
      }

      // If pending approval, cannot edit until advisor approves or rejects
      if (existing.approval_status === 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถแก้ไขข้อมูลโครงงานได้ในขณะที่อยู่ระหว่างรอการอนุมัติจากอาจารย์ที่ปรึกษา'
        });
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

    // Handle advisors update
    if (data.advisors !== undefined || data.advisor !== undefined || data.co_advisors !== undefined) {
      const resolvedAdvisors = await resolveAdvisors(data);
      const mainAdvisor = resolvedAdvisors.find(a => a.role === 'main') || resolvedAdvisors[0];
      updateData.advisor_profile_id = mainAdvisor ? mainAdvisor.profile_id : null;

      await prisma.projectAdvisor.deleteMany({ where: { project_id: projectId } });
      if (resolvedAdvisors.length > 0) {
        updateData.advisors = {
          create: resolvedAdvisors.map(adv => ({
            profile_id: adv.profile_id,
            role: adv.role
          }))
        };
      }
    }

    // Handle members update
    if (data.members !== undefined && Array.isArray(data.members)) {
      const memberProfileIds = [];
      for (const mId of data.members) {
        const mem = await prisma.profile.findFirst({ where: { OR: [{ id: parseInt(mId) || -1 }, { profile_id: String(mId) }] } });
        if (mem) memberProfileIds.push(mem.profile_id);
      }
      await prisma.projectMember.deleteMany({ where: { project_id: projectId } });
      updateData.members = {
        create: memberProfileIds.map(pid => ({ profile_id: pid }))
      };
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        advisor: { include: { department: true } },
        advisors: {
          include: {
            profile: { include: { department: true } }
          },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: {
          orderBy: { acted_at: 'desc' }
        }
      }
    });
    
    res.json({
      success: true,
      message: 'ปรับปรุงข้อมูลโครงงานสำเร็จ',
      data: mapProject(project)
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Error updating project', error: error.message });
  }
};

// @desc    Submit project for approval (Student -> Advisor)
// @route   POST /api/projects/:id/submit-approval
// @access  Private (Student/Alumni/Admin)
exports.submitApproval = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        advisors: true,
        members: true
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงงานที่ระบุ' });
    }

    // Check ownership if student
    if (req.user?.role === 'student' || req.user?.role === 'alumni') {
      const isCreator = existing.created_by_profile_id === req.user.username;
      const isMember = existing.members.some(m => m.profile_id === req.user.username);
      if (!isCreator && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'คุณสามารถส่งขออนุมัติได้เฉพาะโครงงานของตนเองเท่านั้น'
        });
      }
    }

    // Prevent duplicate submission
    if (existing.approval_status === 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'โครงงานนี้ได้ส่งคำขออนุมัติไปแล้ว และอยู่ระหว่างรออาจารย์ที่ปรึกษาตรวจสอบ'
      });
    }

    // Check if project has an advisor assigned
    if (!existing.advisor_profile_id && existing.advisors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'โครงงานยังไม่มีอาจารย์ที่ปรึกษา กรุณาระบุอาจารย์ที่ปรึกษาก่อนส่งขออนุมัติ'
      });
    }

    const now = new Date();

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        approval_status: 'pending_approval',
        approval_requested_at: now,
        rejection_reason: null
      },
      include: {
        advisor: { include: { department: true } },
        advisors: {
          include: { profile: { include: { department: true } } },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: { orderBy: { acted_at: 'desc' } }
      }
    });

    // Record audit history
    await prisma.projectApprovalHistory.create({
      data: {
        project_id: projectId,
        action: 'SUBMIT_APPROVAL',
        requested_by: req.user.username,
        requested_at: now,
        acted_by: req.user.username,
        acted_at: now,
        comments: 'นักศึกษาส่งคำขออนุมัติโครงงาน'
      }
    });

    res.json({
      success: true,
      message: 'ส่งคำขออนุมัติโครงงานไปยังอาจารย์ที่ปรึกษาเรียบร้อยแล้ว',
      data: mapProject(updated)
    });
  } catch (error) {
    console.error('Error submitting project for approval:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งคำขออนุมัติ', error: error.message });
  }
};

// @desc    Approve project (Advisor/Admin)
// @route   POST /api/projects/:id/approve
// @access  Private (Advisor/Admin)
exports.approveProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        advisor: true,
        advisors: true
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงงานที่ระบุ' });
    }

    // Role check: Advisor must be one of the advisors for this project
    if (req.user.role === 'advisor' || req.user.role === 'teacher') {
      const advisorProfile = await prisma.profile.findFirst({
        where: { profile_id: req.user.username }
      });

      const isAdvisor = advisorProfile && (
        existing.advisor_profile_id === advisorProfile.profile_id ||
        existing.advisors.some(a => a.profile_id === advisorProfile.profile_id)
      );

      if (!isAdvisor) {
        return res.status(403).json({
          success: false,
          message: 'ท่านไม่มีสิทธิ์อนุมัติโครงงานนี้ เนื่องจากไม่ได้เป็นอาจารย์ที่ปรึกษาของโครงงาน'
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ท่านไม่มีสิทธิ์ในการอนุมัติโครงงาน'
      });
    }

    const now = new Date();

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        approval_status: 'approved',
        approved_at: now,
        approved_by: req.user.username,
        rejection_reason: null,
        // Advance progress status to approved if draft
        status: existing.status === 'draft' ? 'approved' : existing.status
      },
      include: {
        advisor: { include: { department: true } },
        advisors: {
          include: { profile: { include: { department: true } } },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: { orderBy: { acted_at: 'desc' } }
      }
    });

    // Record audit history
    await prisma.projectApprovalHistory.create({
      data: {
        project_id: projectId,
        action: 'APPROVE',
        acted_by: req.user.username,
        acted_at: now,
        comments: 'อาจารย์ที่ปรึกษาอนุมัติโครงงาน'
      }
    });

    res.json({
      success: true,
      message: 'อนุมัติโครงงานเรียบร้อยแล้ว',
      data: mapProject(updated)
    });
  } catch (error) {
    console.error('Error approving project:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอนุมัติโครงงาน', error: error.message });
  }
};

// @desc    Reject project with reason (Advisor/Admin)
// @route   POST /api/projects/:id/reject
// @access  Private (Advisor/Admin)
exports.rejectProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { rejection_reason } = req.body;

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุเหตุผลกรณีไม่อนุมัติโครงงาน'
      });
    }

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        advisor: true,
        advisors: true
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงงานที่ระบุ' });
    }

    // Role check: Advisor must be one of the advisors for this project
    if (req.user.role === 'advisor' || req.user.role === 'teacher') {
      const advisorProfile = await prisma.profile.findFirst({
        where: { profile_id: req.user.username }
      });

      const isAdvisor = advisorProfile && (
        existing.advisor_profile_id === advisorProfile.profile_id ||
        existing.advisors.some(a => a.profile_id === advisorProfile.profile_id)
      );

      if (!isAdvisor) {
        return res.status(403).json({
          success: false,
          message: 'ท่านไม่มีสิทธิ์ดำเนินการนี้ เนื่องจากไม่ได้เป็นอาจารย์ที่ปรึกษาของโครงงาน'
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ท่านไม่มีสิทธิ์ในการไม่อนุมัติโครงงาน'
      });
    }

    const now = new Date();

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        approval_status: 'rejected',
        rejected_at: now,
        rejected_by: req.user.username,
        rejection_reason: rejection_reason.trim()
      },
      include: {
        advisor: { include: { department: true } },
        advisors: {
          include: { profile: { include: { department: true } } },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: { orderBy: { acted_at: 'desc' } }
      }
    });

    // Record audit history
    await prisma.projectApprovalHistory.create({
      data: {
        project_id: projectId,
        action: 'REJECT',
        acted_by: req.user.username,
        acted_at: now,
        rejection_reason: rejection_reason.trim(),
        comments: 'อาจารย์ที่ปรึกษาไม่อนุมัติโครงงาน'
      }
    });

    res.json({
      success: true,
      message: 'บันทึกการไม่อนุมัติโครงงานเรียบร้อยแล้ว',
      data: mapProject(updated)
    });
  } catch (error) {
    console.error('Error rejecting project:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการไม่อนุมัติโครงงาน', error: error.message });
  }
};

// @desc    Get pending approval requests for current advisor or admin
// @route   GET /api/projects/approval/pending
// @access  Private (Advisor/Teacher/Admin)
exports.getPendingApprovals = async (req, res) => {
  try {
    let where = {
      approval_status: 'pending_approval'
    };

    if (req.user.role === 'advisor' || req.user.role === 'teacher') {
      const advisorProfile = await prisma.profile.findFirst({
        where: { profile_id: req.user.username }
      });
      const advId = advisorProfile ? advisorProfile.profile_id : req.user.username;

      where.OR = [
        { advisor_profile_id: advId },
        { advisors: { some: { profile_id: advId } } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        advisor: { include: { department: true } },
        advisors: {
          include: { profile: { include: { department: true } } },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: { orderBy: { acted_at: 'desc' } }
      },
      orderBy: { approval_requested_at: 'desc' }
    });

    res.json({
      success: true,
      count: projects.length,
      data: projects.map(mapProject)
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ success: false, message: 'Error fetching pending approvals', error: error.message });
  }
};

// @desc    Update project status specifically with workflow validation
// @route   PUT /api/projects/:id/status
// @access  Private (Admin/Advisor only)
exports.updateProjectStatus = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะโครงงาน' });
    }

    const normalized = normalizeStatus(status);
    if (!normalized) {
      return res.status(400).json({ 
        success: false, 
        message: `สถานะไม่ถูกต้อง ค่าที่อนุญาต: ${VALID_STATUSES.join(', ')}` 
      });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        advisor: true,
        advisors: true,
        members: { include: { profile: true } }
      }
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงงานที่ระบุ' });
    }

    // Role check: Admin is allowed; Advisor must be one of the advisors; Student/Alumni must be creator or member
    if (req.user.role === 'advisor' || req.user.role === 'teacher') {
      const advisorProfile = await prisma.profile.findFirst({
        where: { profile_id: req.user.username }
      });

      const isAdvisor = advisorProfile && (
        existingProject.advisor_profile_id === advisorProfile.profile_id ||
        existingProject.advisors.some(a => a.profile_id === advisorProfile.profile_id)
      );

      if (!isAdvisor) {
        return res.status(403).json({
          success: false,
          message: 'ท่านไม่มีสิทธิ์แก้ไขสถานะของโครงงานนี้ (สามารถแก้ไขได้เฉพาะอาจารย์ที่ปรึกษาของโครงงานหรือผู้ดูแลระบบเท่านั้น)'
        });
      }
    } else if (req.user.role === 'student' || req.user.role === 'alumni') {
      const cleanUsername = req.user.username.replace('alumni_', '').toLowerCase();
      const isCreator = existingProject.created_by_profile_id && existingProject.created_by_profile_id.toLowerCase() === cleanUsername;
      const isMember = existingProject.members && existingProject.members.some(m => 
        (m.profile_id && m.profile_id.toLowerCase() === cleanUsername) ||
        (m.profile?.profile_id && m.profile.profile_id.toLowerCase() === cleanUsername)
      );

      if (!isCreator && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'ท่านไม่มีสิทธิ์แก้ไขสถานะของโครงงานนี้ (เฉพาะเจ้าของหรือสมาชิกโครงงานเท่านั้น)'
        });
      }

      // Check approval status: students can only update progress once the project is approved
      if (existingProject.approval_status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถปรับสถานะการดำเนินงานได้ เนื่องจากโครงงานยังไม่ได้รับการอนุมัติจากอาจารย์ที่ปรึกษา'
        });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ท่านไม่มีสิทธิ์ในการเปลี่ยนสถานะโครงงาน'
      });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { status: normalized },
      include: {
        advisor: { include: { department: true } },
        advisors: {
          include: {
            profile: { include: { department: true } }
          },
          orderBy: { role: 'asc' }
        },
        members: { include: { profile: true } },
        approvalHistory: { orderBy: { acted_at: 'desc' } }
      }
    });

    res.json({
      success: true,
      message: `ปรับปรุงสถานะโครงงานเป็น "${normalized}" สำเร็จ`,
      data: mapProject(project)
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการปรับปรุงสถานะ', error: error.message });
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
        },
        advisors: {
          include: {
            profile: { include: { department: true } }
          },
          orderBy: { role: 'asc' }
        },
        members: {
          include: { profile: true }
        },
        approvalHistory: {
          orderBy: { acted_at: 'desc' }
        }
      }
    });

    const mappedProjects = projects.map(mapProject);

    res.json({
      success: true,
      count: mappedProjects.length,
      data: mappedProjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching student projects', error: error.message });
  }
};
