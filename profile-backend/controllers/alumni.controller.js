const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

// Helper function to find or create faculty and department
const getOrSetupFacultyAndDept = async (facultyName, deptName) => {
  let faculty = await prisma.faculty.findFirst({ where: { faculty_name: facultyName } });
  if (!faculty) faculty = await prisma.faculty.create({ data: { faculty_name: facultyName } });

  let department = await prisma.department.findFirst({ where: { department_name: deptName, faculty_id: faculty.id } });
  if (!department) department = await prisma.department.create({ data: { department_name: deptName, faculty_id: faculty.id } });

  return { facultyId: faculty.id, departmentId: department.id };
};

// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Private
exports.getAllAlumni = async (req, res) => {
  try {
    const { faculty, department, department_id, graduation_year, employment_status, search } = req.query;
    
    // ดึง Profile ทั้งหมด
    const profiles = await prisma.profile.findMany({
      include: {
        faculty: true,
        department: true
      },
      orderBy: { profile_id: 'desc' }
    });

    // ดึง User (role = alumni)
    const users = await prisma.user.findMany({
      where: { role: 'alumni' }
    });
    
    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    let alumni = profiles.map(p => {
      const user = userMap[p.profile_id];
      if (!user) return null;

      // Calculate approximate graduation year if needed
      const entryBE = 2500 + parseInt(p.profile_id.substring(0, 2), 10);
      const gradYear = entryBE + 4; // default assumption

      return {
        id: p.id,
        alumni_id: p.profile_id,
        first_name: p.firstname,
        last_name: p.lastname,
        faculty: p.faculty?.faculty_name || '',
        department: p.department?.department_name || '',
        department_id: p.department?.department_id || '',
        graduation_year: gradYear,
        employment_status: 'N/A',
        contact_info: { email: user.email },
        userId: user.id
      };
    }).filter(Boolean);

    // Filters
    if (faculty && faculty.trim() !== '') {
      alumni = alumni.filter(a => a.faculty === faculty);
    }
    if (department && department.trim() !== '') {
      alumni = alumni.filter(a => a.department === department);
    }
    if (department_id && department_id.trim() !== '') {
      const targetDept = await prisma.department.findUnique({ where: { department_id: department_id.trim() } });
      if (targetDept) {
        alumni = alumni.filter(a => a.department_id === targetDept.department_id);
      } else {
        alumni = [];
      }
    }
    if (graduation_year && graduation_year.trim() !== '') {
      const parsedGradYear = parseInt(graduation_year, 10);
      if (!isNaN(parsedGradYear)) {
        alumni = alumni.filter(a => a.graduation_year === parsedGradYear);
      }
    }
    if (employment_status && employment_status.trim() !== '') {
      alumni = alumni.filter(a => a.employment_status === employment_status);
    }
    if (search && search.trim() !== '') {
      const lowSearch = search.toLowerCase();
      alumni = alumni.filter(a => 
        a.first_name.toLowerCase().includes(lowSearch) || 
        a.last_name.toLowerCase().includes(lowSearch) || 
        a.alumni_id.toLowerCase().includes(lowSearch)
      );
    }

    res.json({
      success: true,
      count: alumni.length,
      data: alumni
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching alumni',
      error: error.message 
    });
  }
};

// @desc    Get single alumni
// @route   GET /api/alumni/:id
// @access  Private
exports.getAlumni = async (req, res) => {
  res.json({ success: true, data: {} });
};

// @desc    Create new alumni
// @route   POST /api/alumni
// @access  Private (Admin)
exports.createAlumni = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.alumni_id || !data.first_name) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // 1. Setup Faculty and Department
    const facName = data.faculty || 'Unspecified Faculty';
    const deptName = data.department || 'Unspecified Department';
    const { facultyId, departmentId } = await getOrSetupFacultyAndDept(facName, deptName);

    // 2. Upsert User
    const existingUser = await prisma.user.findUnique({ where: { username: data.alumni_id } });
    if (!existingUser) {
      const defaultPassword = await bcrypt.hash(data.alumni_id, 10);
      await prisma.user.create({
        data: {
          username: data.alumni_id,
          email: data.contact_info?.email || data.email || `${data.alumni_id}@alumni.local`,
          password: defaultPassword,
          role: 'alumni',
          isActive: true
        }
      });
    }

    // 3. Create Profile
    const profile = await prisma.profile.create({
      data: {
        profile_id: data.alumni_id,
        firstname: data.first_name,
        lastname: data.last_name || '',
        faculty_id: facultyId,
        department_id: departmentId
      }
    });
    
    res.status(201).json({
      success: true,
      message: `เพิ่มข้อมูลศิษย์เก่าสำเร็จ — บัญชีผู้ใช้ถูกสร้างอัตโนมัติ`,
      data: profile
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Alumni ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating alumni', error: error.message });
  }
};

// @desc    Update alumni
// @route   PUT /api/alumni/:id
// @access  Private (Admin/Alumni)
exports.updateAlumni = async (req, res) => {
  try {
    const data = req.body;
    
    const profile = await prisma.profile.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!profile) return res.status(404).json({ success: false, message: 'Alumni not found' });

    let facultyId = profile.faculty_id;
    let departmentId = profile.department_id;

    if (data.faculty && data.department) {
      const fd = await getOrSetupFacultyAndDept(data.faculty, data.department);
      facultyId = fd.facultyId;
      departmentId = fd.departmentId;
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        firstname: data.first_name || profile.firstname,
        lastname: data.last_name || profile.lastname,
        faculty_id: facultyId,
        department_id: departmentId
      }
    });

    if (data.contact_info?.email || data.email) {
      const user = await prisma.user.findUnique({ where: { username: profile.profile_id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email: data.contact_info?.email || data.email }
        });
      }
    }

    res.json({ success: true, message: 'Alumni updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating alumni', error: error.message });
  }
};

// @desc    Delete alumni
// @route   DELETE /api/alumni/:id
// @access  Private (Admin)
exports.deleteAlumni = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: parseInt(req.params.id) } });
    if (profile) {
      await prisma.profile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { username: profile.profile_id } }).catch(() => {});
    }
    res.json({ success: true, message: 'Alumni deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting alumni', error: error.message });
  }
};
