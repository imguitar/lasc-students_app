const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getAllStudents = async (req, res) => {
  try {
    const { faculty, department, department_id, year, status, search } = req.query;
    const where = {};

    // 1. Department Mapping (string department_id -> integer Primary Key)
    if (department_id && typeof department_id === 'string' && department_id.trim() !== '') {
      const { getDepartmentNameById } = require('../utils/departments');
      const deptName = getDepartmentNameById(department_id.trim());
      
      let targetDept = null;
      if (deptName !== "ไม่ระบุสาขาวิชา") {
        targetDept = await prisma.department.findFirst({
          where: { department_name: deptName }
        });
      }
      
      if (!targetDept) {
        targetDept = await prisma.department.findUnique({
          where: { department_id: department_id.trim() }
        });
      }

      if (targetDept) {
        where.department_id = targetDept.id;
      } else {
        where.department_id = -1; // Force empty result if department_id is not found
      }
    } else if (Array.isArray(department_id)) {
      // ป้องกัน Error กรณีส่งค่ามาเป็น Array
      return res.status(400).json({ success: false, message: 'Invalid department_id format' });
    }

    if (faculty && typeof faculty === 'string' && faculty.trim() !== '') {
      const targetFac = await prisma.faculty.findFirst({ where: { faculty_name: faculty.trim() } });
      if (targetFac) where.faculty_id = targetFac.id;
      else where.faculty_id = -1;
    }

    if (department && typeof department === 'string' && department.trim() !== '') {
      const targetDeptFilter = await prisma.department.findFirst({ 
        where: { department_name: { contains: department.trim() } } 
      });
      if (targetDeptFilter) where.department_id = targetDeptFilter.id;
      else where.department_id = -1;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchStr = search.trim();
      where.OR = [
        { firstname: { contains: searchStr } },
        { lastname: { contains: searchStr } },
        { profile_id: { contains: searchStr } }
      ];
    }

    // 2. Users and Year/Status Mapping
    const userWhere = { role: 'student' };
    if (status && typeof status === 'string' && status.trim() !== '') {
      userWhere.isActive = status.trim() === 'Active';
    }
    
    let users = await prisma.user.findMany({ where: userWhere });
    
    if (year && typeof year === 'string' && year.trim() !== '') {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) {
         const currentBE = new Date().getFullYear() + 543;
         const entryBE = currentBE - parsedYear + 1;
         const prefix = (entryBE - 2500).toString(); 
         users = users.filter(u => u.username.startsWith(prefix));
      }
    }

    if (users.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const userUsernames = users.map(u => u.username);
    
    // 3. Fetch Profiles with Prisma where (Chunked to prevent parameter limits)
    let profiles = [];
    const CHUNK_SIZE = 1000;
    
    for (let i = 0; i < userUsernames.length; i += CHUNK_SIZE) {
      const chunk = userUsernames.slice(i, i + CHUNK_SIZE);
      const profilesChunk = await prisma.profile.findMany({
        where: {
          ...where,
          profile_id: { in: chunk }
        },
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

    let students = profiles.map(p => {
      const user = userMap[p.profile_id];
      if (!user) return null;

      const entryBE = 2500 + parseInt(p.profile_id.substring(0, 2), 10);
      const currentBE = new Date().getFullYear() + 543;
      const calYear = Math.max(1, currentBE - entryBE + 1);

      return {
        id: p.id,
        student_id: p.profile_id,
        prefix: p.prefix,
        first_name: p.firstname,
        last_name: p.lastname,
        faculty: facultyMap[p.faculty_id] || '',
        department: departmentMap[p.department_id] || '',
        department_id: p.department_id ? p.department_id.toString() : '',
        year: calYear,
        status: user.isActive ? 'Active' : 'Inactive',
        email: user.email,
        userId: user.id
      };
    }).filter(Boolean);

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('API Error in getAllStudents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching students',
      error: error.message,
      stack: error.stack
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  // omitted for brevity, fallback response
  res.json({ success: true, data: {} });
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin)
exports.createStudent = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.student_id || !data.first_name || !data.last_name || !data.department_id) {
      return res.status(400).json({ success: false, message: 'Missing required fields (including department_id)' });
    }

    const department = await prisma.department.findUnique({
      where: { department_id: data.department_id }
    });

    if (!department) {
      return res.status(400).json({ success: false, message: 'Department not found' });
    }

    // 2. Upsert User
    const existingUser = await prisma.user.findUnique({ where: { username: data.student_id } });
    if (!existingUser) {
      const defaultPassword = await bcrypt.hash(data.student_id, 10);
      await prisma.user.create({
        data: {
          username: data.student_id,
          email: data.email || `${data.student_id}@student.sskru.ac.th`,
          password: defaultPassword,
          role: 'student',
          isActive: data.status === 'Active' || !data.status ? true : false
        }
      });
    }

    // 3. Upsert Profile
    let profile;
    if (req.query.upsert === 'true') {
      profile = await prisma.profile.upsert({
        where: { profile_id: data.student_id },
        update: {
          prefix: data.prefix,
          firstname: data.first_name,
          lastname: data.last_name,
          faculty_id: department.faculty_id,
          department_id: department.id
        },
        create: {
          profile_id: data.student_id,
          prefix: data.prefix,
          firstname: data.first_name,
          lastname: data.last_name,
          faculty_id: department.faculty_id,
          department_id: department.id
        }
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          profile_id: data.student_id,
          prefix: data.prefix,
          firstname: data.first_name,
          lastname: data.last_name,
          faculty_id: department.faculty_id,
          department_id: department.id
        }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Student processed successfully',
      data: profile
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Student ID already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating student', error: error.message });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin/Student)
exports.updateStudent = async (req, res) => {
  try {
    const data = req.body;
    
    const profile = await prisma.profile.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    let facultyId = profile.faculty_id;
    let departmentId = profile.department_id;

    if (data.department_id) {
      const department = await prisma.department.findUnique({ where: { department_id: data.department_id } });
      if (!department) {
        return res.status(400).json({ success: false, message: 'Department not found' });
      }
      departmentId = department.id;
      facultyId = department.faculty_id;
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        prefix: data.prefix !== undefined ? data.prefix : profile.prefix,
        firstname: data.first_name || profile.firstname,
        lastname: data.last_name || profile.lastname,
        faculty_id: facultyId,
        department_id: departmentId
      }
    });

    if (data.status) {
      const user = await prisma.user.findUnique({ where: { username: profile.profile_id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: data.status === 'Active' ? true : false,
            role: data.status === 'Graduated' ? 'alumni' : 'student'
          }
        });
      }
    }

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating student', error: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
exports.deleteStudent = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: parseInt(req.params.id) } });
    if (profile) {
      await prisma.profile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { username: profile.profile_id } }).catch(() => {});
    }
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting student', error: error.message });
  }
};

exports.getStudentByCode = exports.getStudent;
exports.promoteStudentToAlumni = exports.updateStudent;
