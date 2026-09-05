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

// @desc    Get all advisors
// @route   GET /api/advisors
// @access  Private
exports.getAllAdvisors = async (req, res) => {
  try {
    const { faculty, faculty_id, department, department_id, isActive, search } = req.query;
    // ดึง User (role = advisor)
    const users = await prisma.user.findMany({
      where: { role: 'advisor' }
    });
    
    const userUsernames = users.map(u => u.username);

    // ดึง Profile เฉพาะที่เป็น advisor (Chunked)
    let profiles = [];
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < userUsernames.length; i += CHUNK_SIZE) {
      const chunk = userUsernames.slice(i, i + CHUNK_SIZE);
      const profilesChunk = await prisma.profile.findMany({
        where: { profile_id: { in: chunk } },
        orderBy: { profile_id: 'desc' }
      });
      profiles = profiles.concat(profilesChunk);
    }

    const faculties = await prisma.faculty.findMany();
    const departments = await prisma.department.findMany();
    const facultyMap = {};
    faculties.forEach(f => facultyMap[f.id] = f.faculty_name);
    const departmentMap = {};
    departments.forEach(d => departmentMap[d.id] = d.department_name);


    
    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    let advisors = profiles.map(p => {
      const user = userMap[p.profile_id];
      if (!user) return null;

      return {
        id: p.id,
        advisor_id: p.profile_id,
        name: `${p.firstname} ${p.lastname}`.trim(),
        first_name: p.firstname,
        last_name: p.lastname,
        faculty: facultyMap[p.faculty_id] || '',
        faculty_id: p.faculty_id ? p.faculty_id.toString() : '',
        department: departmentMap[p.department_id] || '',
        department_id: p.department_id ? p.department_id.toString() : '',
        isActive: user.isActive,
        email: user.email,
        userId: user.id
      };
    }).filter(Boolean);

    // Filters
    if (faculty) advisors = advisors.filter(a => a.faculty === faculty);
    if (faculty_id) advisors = advisors.filter(a => a.faculty_id === faculty_id.toString());
    if (department) advisors = advisors.filter(a => a.department.includes(department) || department.includes(a.department));
    if (department_id && department_id.trim() !== '') {
      const deptString = department_id.trim();
      const matchedDept = departments.find(d => d.department_id === deptString || d.id.toString() === deptString);
      
      if (matchedDept) {
        advisors = advisors.filter(a => a.department_id === matchedDept.id.toString());
      } else {
        // Fallback if not found in db exactly
        const numMatch = deptString.match(/\d+/);
        if (numMatch) {
          advisors = advisors.filter(a => a.department_id === numMatch[0]);
        }
      }
    }
    if (isActive !== undefined && isActive !== '') {
      const isAct = isActive === 'true';
      advisors = advisors.filter(a => a.isActive === isAct);
    }
    if (search) {
      const lowSearch = search.toLowerCase();
      advisors = advisors.filter(a => 
        a.name.toLowerCase().includes(lowSearch) || 
        a.advisor_id.toLowerCase().includes(lowSearch)
      );
    }

    res.json({
      success: true,
      count: advisors.length,
      data: advisors
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching advisors',
      error: error.message 
    });
  }
};

// @desc    Get single advisor
// @route   GET /api/advisors/:id
// @access  Private
exports.getAdvisor = async (req, res) => {
  res.json({ success: true, data: {} });
};

// @desc    Create new advisor
// @route   POST /api/advisors
// @access  Private (Admin)
exports.createAdvisor = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.advisor_id || (!data.name && !data.first_name)) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let firstName = data.first_name || data.name;
    let lastName = data.last_name || '';
    if (data.name && data.name.includes(' ') && !data.first_name) {
       const parts = data.name.split(' ');
       firstName = parts[0];
       lastName = parts.slice(1).join(' ');
    }

    // 1. Setup Faculty and Department
    const facName = data.faculty || 'Unspecified Faculty';
    const deptName = data.department || 'Unspecified Department';
    const { facultyId, departmentId } = await getOrSetupFacultyAndDept(facName, deptName);

    // 2. Upsert User
    const existingUser = await prisma.user.findUnique({ where: { username: data.advisor_id } });
    if (!existingUser) {
      const defaultPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          username: data.advisor_id,
          email: data.email || `${data.advisor_id.toLowerCase()}@example.com`,
          password: defaultPassword,
          role: 'advisor',
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });
    }

    // 3. Create Profile
    const profile = await prisma.profile.create({
      data: {
        profile_id: data.advisor_id,
        firstname: firstName,
        lastname: lastName,
        faculty_id: facultyId,
        department_id: departmentId
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Advisor created successfully',
      data: profile
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Advisor ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating advisor', error: error.message });
  }
};

// @desc    Update advisor
// @route   PUT /api/advisors/:id
// @access  Private (Admin)
exports.updateAdvisor = async (req, res) => {
  try {
    const data = req.body;
    
    const profile = await prisma.profile.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!profile) return res.status(404).json({ success: false, message: 'Advisor not found' });

    let facultyId = profile.faculty_id;
    let departmentId = profile.department_id;

    if (data.faculty && data.department) {
      const fd = await getOrSetupFacultyAndDept(data.faculty, data.department);
      facultyId = fd.facultyId;
      departmentId = fd.departmentId;
    }

    let firstName = data.first_name || profile.firstname;
    let lastName = data.last_name || profile.lastname;
    if (data.name && data.name.includes(' ') && !data.first_name) {
       const parts = data.name.split(' ');
       firstName = parts[0];
       lastName = parts.slice(1).join(' ');
    } else if (data.name && !data.name.includes(' ') && !data.first_name) {
       firstName = data.name;
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        firstname: firstName,
        lastname: lastName,
        faculty_id: facultyId,
        department_id: departmentId
      }
    });

    if (data.isActive !== undefined) {
      const user = await prisma.user.findUnique({ where: { username: profile.profile_id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: data.isActive
          }
        });
      }
    }

    res.json({ success: true, message: 'Advisor updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating advisor', error: error.message });
  }
};

// @desc    Delete advisor
// @route   DELETE /api/advisors/:id
// @access  Private (Admin)
exports.deleteAdvisor = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: parseInt(req.params.id) } });
    if (profile) {
      await prisma.profile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { username: profile.profile_id } }).catch(() => {});
    }
    res.json({ success: true, message: 'Advisor deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting advisor', error: error.message });
  }
};

// @desc    Get next available advisor ID
// @route   GET /api/advisors/next-id/generate
// @access  Private (Admin)
exports.getNextAdvisorId = async (req, res) => {
  try {
    // Generate next ID from User table for advisors
    const users = await prisma.user.findMany({
      where: { role: 'advisor' },
      select: { username: true }
    });

    let maxNum = 0;
    users.forEach(u => {
      if (u.username) {
        const match = u.username.match(/^(?:AD|ADV)(\d+)$/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const nextNum = maxNum + 1;
    const nextId = `AD${String(nextNum).padStart(3, '0')}`;

    res.json({
      success: true,
      nextId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating next advisor ID',
      error: error.message
    });
  }
};
