const prisma = require('../prismaClient');

// จัดรูปข้อมูลประธานสาขาให้ frontend ใช้ได้ทันที
// userMap คือ map ของ username -> user เพื่อดึงอีเมลจริงจากตาราง user
const formatHead = (head, userMap = {}) => {
  if (!head) return null;
  const user = userMap[head.profile_id];
  return {
    id: head.id,
    profile_id: head.profile_id,
    prefix: head.prefix || '',
    firstname: head.firstname,
    lastname: head.lastname,
    name: `${head.prefix ? head.prefix : ''}${head.firstname} ${head.lastname}`.trim(),
    phone: head.phone || '-',
    email: user?.email || '-'
  };
};

// ดึงอีเมลของ profile ที่ระบุจากตาราง user (เชื่อมด้วย user.username = profile.profile_id)
const buildUserMap = async (profileIds) => {
  const ids = profileIds.filter(Boolean);
  if (ids.length === 0) return {};

  const users = await prisma.user.findMany({
    where: { username: { in: ids } },
    select: { username: true, email: true }
  });

  return users.reduce((map, u) => {
    map[u.username] = u;
    return map;
  }, {});
};

// @desc    Get all active departments
// @route   GET /api/departments
// @access  Public
exports.getAllDepartments = async (req, res) => {
  try {
    const { faculty_id } = req.query;
    
    let whereClause = {
      is_active: true
    };
    
    if (faculty_id) {
      whereClause.faculty_id = parseInt(faculty_id);
    }

    const departments = await prisma.department.findMany({
      where: whereClause,
      orderBy: {
        id: 'asc'
      },
      include: {
        faculty: true,
        head: true
      }
    });

    const userMap = await buildUserMap(departments.map(d => d.head?.profile_id));

    res.json({
      success: true,
      count: departments.length,
      data: departments.map(d => ({
        id: d.id,
        department_id: d.department_id,
        department_name: d.department_name,
        faculty_id: d.faculty_id,
        faculty_name: d.faculty ? d.faculty.faculty_name : null,
        department_head_id: d.department_head_id,
        department_head: formatHead(d.head, userMap)
      }))
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching departments',
      error: error.message
    });
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Public
exports.getDepartment = async (req, res) => {
  try {
    const department = await prisma.department.findUnique({
      where: {
        id: parseInt(req.params.id)
      },
      include: {
        faculty: true,
        head: true
      }
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const userMap = await buildUserMap([department.head?.profile_id]);

    // อาจารย์ที่ปรึกษาที่สังกัดสาขานี้และยังเปิดใช้งาน — ใช้เป็นตัวเลือกประธานสาขา
    const advisorUsers = await prisma.user.findMany({
      where: { role: 'advisor', isActive: true },
      select: { username: true, email: true }
    });
    const advisorUserMap = advisorUsers.reduce((map, u) => {
      map[u.username] = u;
      return map;
    }, {});

    const eligibleProfiles = await prisma.profile.findMany({
      where: {
        department_id: department.id,
        profile_id: { in: advisorUsers.map(u => u.username) }
      },
      select: {
        id: true,
        profile_id: true,
        prefix: true,
        firstname: true,
        lastname: true,
        phone: true
      },
      orderBy: { firstname: 'asc' }
    });

    const eligibleAdvisors = eligibleProfiles.map(p => ({
      id: p.id,
      profile_id: p.profile_id,
      prefix: p.prefix || '',
      firstname: p.firstname,
      lastname: p.lastname,
      name: `${p.prefix ? p.prefix : ''}${p.firstname} ${p.lastname}`.trim(),
      phone: p.phone || '-',
      email: advisorUserMap[p.profile_id]?.email || '-'
    }));

    res.json({
      success: true,
      data: {
        id: department.id,
        department_id: department.department_id,
        department_name: department.department_name,
        faculty_id: department.faculty_id,
        faculty_name: department.faculty ? department.faculty.faculty_name : null,
        is_active: department.is_active,
        department_head_id: department.department_head_id,
        department_head: formatHead(department.head, userMap),
        eligible_advisors: eligibleAdvisors
      }
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department',
      error: error.message
    });
  }
};

// @desc    Create a department
// @route   POST /api/departments
// @access  Private (Admin)
exports.createDepartment = async (req, res) => {
  try {
    const { department_name, department_id, faculty_id } = req.body;
    
    if (!department_name || !faculty_id) {
      return res.status(400).json({ success: false, message: 'Please provide department_name and faculty_id' });
    }

    const department = await prisma.department.create({
      data: {
        department_name,
        department_id,
        faculty_id: parseInt(faculty_id)
      }
    });

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating department',
      error: error.message
    });
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private (Admin)
exports.updateDepartment = async (req, res) => {
  try {
    const { department_name, department_id, is_active, faculty_id } = req.body;
    const departmentId = parseInt(req.params.id);

    const existing = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const department = await prisma.department.update({
      where: { id: departmentId },
      data: {
        department_name: department_name || existing.department_name,
        department_id: department_id !== undefined ? department_id : existing.department_id,
        is_active: is_active !== undefined ? is_active : existing.is_active,
        faculty_id: faculty_id ? parseInt(faculty_id) : existing.faculty_id
      }
    });

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating department',
      error: error.message
    });
  }
};

// @desc    กำหนด/ยกเลิกประธานสาขาวิชา
// @route   PUT /api/departments/:id/head
// @access  Private (Admin)
exports.updateDepartmentHead = async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const { department_head_id } = req.body;

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: { faculty: true }
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลสาขาวิชา' });
    }

    // ค่าว่าง = ยกเลิกการกำหนดประธานสาขา
    if (department_head_id === undefined || department_head_id === null || department_head_id === '' || department_head_id === 0) {
      const updated = await prisma.department.update({
        where: { id: departmentId },
        data: { department_head_id: null }
      });

      return res.json({
        success: true,
        message: 'ยกเลิกการกำหนดประธานสาขาวิชาเรียบร้อยแล้ว',
        data: {
          id: updated.id,
          department_id: updated.department_id,
          department_name: updated.department_name,
          department_head_id: null,
          department_head: null
        }
      });
    }

    const headProfileId = parseInt(department_head_id);
    if (Number.isNaN(headProfileId)) {
      return res.status(400).json({ success: false, message: 'รหัสอาจารย์ที่ส่งมาไม่ถูกต้อง' });
    }

    const profile = await prisma.profile.findUnique({ where: { id: headProfileId } });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลอาจารย์ที่เลือก' });
    }

    // ต้องเป็นอาจารย์ที่ปรึกษาที่เปิดใช้งานอยู่
    const advisorUser = await prisma.user.findFirst({
      where: { username: profile.profile_id, role: 'advisor', isActive: true }
    });

    if (!advisorUser) {
      return res.status(400).json({
        success: false,
        message: 'อาจารย์ที่เลือกต้องเป็นอาจารย์ที่ปรึกษาและมีสถานะเปิดใช้งานในระบบ'
      });
    }

    // ต้องสังกัดสาขานี้เท่านั้น
    if (profile.department_id !== department.id) {
      return res.status(400).json({
        success: false,
        message: 'อาจารย์ที่เลือกต้องสังกัดอยู่ในสาขาวิชานี้เท่านั้น (ไม่อนุญาตให้เลือกอาจารย์จากสาขาอื่น)'
      });
    }

    // อาจารย์ 1 ท่านเป็นประธานได้เพียงสาขาเดียว
    const headOfOtherDept = await prisma.department.findFirst({
      where: {
        department_head_id: profile.id,
        NOT: { id: department.id }
      }
    });

    if (headOfOtherDept) {
      return res.status(400).json({
        success: false,
        message: `อาจารย์ ${profile.firstname} ${profile.lastname} ดำรงตำแหน่งประธานสาขา "${headOfOtherDept.department_name}" อยู่แล้ว (อาจารย์ 1 ท่านไม่สามารถเป็นประธานหลายสาขาพร้อมกันได้)`
      });
    }

    const updated = await prisma.department.update({
      where: { id: department.id },
      data: { department_head_id: profile.id },
      include: { head: true, faculty: true }
    });

    res.json({
      success: true,
      message: `แต่งตั้ง ${profile.prefix ? profile.prefix : ''}${profile.firstname} ${profile.lastname} เป็นประธาน${department.department_name} เรียบร้อยแล้ว`,
      data: {
        id: updated.id,
        department_id: updated.department_id,
        department_name: updated.department_name,
        faculty_name: updated.faculty?.faculty_name || '',
        department_head_id: updated.department_head_id,
        department_head: formatHead(updated.head, { [advisorUser.username]: advisorUser })
      }
    });
  } catch (error) {
    console.error('Error updating department head:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการกำหนดประธานสาขาวิชา',
      error: error.message
    });
  }
};

// @desc    สรุปสถิติของสาขาวิชา
// @route   GET /api/departments/:id/stats
// @access  Private
exports.getDepartmentStats = async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: { faculty: true, head: true }
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const userMap = await buildUserMap([department.head?.profile_id]);

    // profile ทั้งหมดในสาขา แล้วแยกประเภทตาม role ในตาราง user
    const profiles = await prisma.profile.findMany({
      where: { department_id: department.id },
      select: { profile_id: true }
    });
    const profileIds = profiles.map(p => p.profile_id);

    const members = profileIds.length
      ? await prisma.user.findMany({
          where: { username: { in: profileIds } },
          select: { username: true, role: true, isActive: true }
        })
      : [];

    const students = members.filter(u => u.role === 'student');
    const alumni = members.filter(u => u.role === 'alumni');
    const advisors = members.filter(u => u.role === 'advisor');

    const activeStudents = students.filter(u => u.isActive).length;

    // โครงงานที่สร้างโดยสมาชิกของสาขานี้
    const projects = await prisma.project.findMany({
      where: { createdBy: { department_id: department.id } },
      select: { status: true }
    });

    const projectsByStatus = projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        department: {
          id: department.id,
          department_id: department.department_id,
          department_name: department.department_name,
          faculty_name: department.faculty?.faculty_name || '',
          department_head: formatHead(department.head, userMap)
        },
        stats: {
          totalStudents: students.length,
          activeStudents,
          inactiveStudents: students.length - activeStudents,
          totalAlumni: alumni.length,
          totalAdvisors: advisors.length,
          totalProjects: projects.length,
          projectsByStatus
        }
      }
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department stats',
      error: error.message
    });
  }
};
