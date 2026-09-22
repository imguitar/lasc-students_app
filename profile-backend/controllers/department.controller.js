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

    // นับจำนวนนักศึกษาปัจจุบัน (รุ่น >= 66) และศิษย์เก่า (รุ่น < 66) แยกตามสาขาวิชา (LEFT JOIN logic)
    const profiles = await prisma.profile.findMany({
      where: {
        department_id: { in: departments.map(d => d.id) }
      },
      select: {
        department_id: true,
        profile_id: true
      }
    });

    const deptCounts = {};
    departments.forEach(d => {
      deptCounts[d.id] = { current: 0, alumni: 0, total: 0 };
    });

    profiles.forEach(p => {
      if (!deptCounts[p.department_id]) return;
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      if (match) {
        const batch = parseInt(match[1], 10);
        if (batch >= 66) {
          deptCounts[p.department_id].current++;
          deptCounts[p.department_id].total++;
        } else {
          deptCounts[p.department_id].alumni++;
          deptCounts[p.department_id].total++;
        }
      }
    });

    res.json({
      success: true,
      count: departments.length,
      data: departments.map(d => {
        const c = deptCounts[d.id] || { current: 0, alumni: 0, total: 0 };
        return {
          id: d.id,
          department_id: d.department_id,
          department_name: d.department_name,
          faculty_id: d.faculty_id,
          faculty_name: d.faculty ? d.faculty.faculty_name : null,
          department_head_id: d.department_head_id,
          department_head: formatHead(d.head, userMap),
          student_count: c.current,
          current_student_count: c.current,
          alumni_count: c.alumni,
          total_student_count: c.total
        };
      })
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

// @desc    Get department student counts summary (รองรับ LEFT JOIN แสดง 0 คน)
// @route   GET /api/departments/counts
// @access  Public
exports.getDepartmentCounts = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { is_active: true },
      orderBy: { id: 'asc' },
      include: { faculty: true }
    });

    const profiles = await prisma.profile.findMany({
      select: { department_id: true, profile_id: true }
    });

    const counts = {};
    departments.forEach(d => {
      counts[d.id] = { current: 0, alumni: 0, total: 0 };
    });

    profiles.forEach(p => {
      if (!counts[p.department_id]) return;
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      if (match) {
        const batch = parseInt(match[1], 10);
        if (batch >= 66) {
          counts[p.department_id].current++;
          counts[p.department_id].total++;
        } else {
          counts[p.department_id].alumni++;
          counts[p.department_id].total++;
        }
      }
    });

    const result = departments.map(d => ({
      id: d.id,
      department_id: d.id,
      department_code: d.department_id,
      department_name: d.department_name,
      faculty_id: d.faculty_id,
      faculty_name: d.faculty?.faculty_name || null,
      student_count: counts[d.id].current,
      current_student_count: counts[d.id].current,
      alumni_count: counts[d.id].alumni,
      total_student_count: counts[d.id].total
    }));

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error('Error fetching department counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department counts',
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
      select: { profile_id: true, student_status: true }
    });
    const profileIds = profiles.map(p => p.profile_id);

    const members = profileIds.length
      ? await prisma.user.findMany({
          where: { username: { in: profileIds } },
          select: { username: true, role: true, isActive: true }
        })
      : [];

    const byUsername = {};
    members.forEach(u => { byUsername[u.username] = u; });

    const alumni = members.filter(u => u.role === 'alumni');
    const advisors = members.filter(u => u.role === 'advisor');

    // นักศึกษาแยกตาม student_status ก่อน แล้วค่อยตกไปดู isActive
    let activeStudents = 0;
    let graduatedStudents = alumni.length;
    let resignedStudents = 0;
    let suspendedStudents = 0;
    let otherInactive = 0;

    profiles.forEach(p => {
      const user = byUsername[p.profile_id];
      if (!user || user.role !== 'student') return;

      if (p.student_status === 'graduated') graduatedStudents++;
      else if (p.student_status === 'resigned') resignedStudents++;
      else if (p.student_status === 'suspended') suspendedStudents++;
      else if (user.isActive) activeStudents++;
      else otherInactive++;
    });

    const totalStudents = activeStudents + graduatedStudents + resignedStudents + suspendedStudents + otherInactive;

    // โครงงานที่สร้างโดยสมาชิกของสาขานี้
    const projects = await prisma.project.findMany({
      where: { createdBy: { department_id: department.id } },
      select: { status: true }
    });

    const projectsByStatus = {
      draft: 0,
      approved: 0,
      in_progress: 0,
      waiting_defense: 0,
      passed_defense: 0,
      completed: 0
    };
    projects.forEach(p => {
      if (projectsByStatus[p.status] !== undefined) projectsByStatus[p.status]++;
    });

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
          totalStudents,
          activeStudents,
          graduatedStudents,
          resignedStudents,
          suspendedStudents,
          otherInactive,
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
