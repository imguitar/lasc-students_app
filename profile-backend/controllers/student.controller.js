const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

// Helper to resolve profile by id (number) or profile_id (string)
const findProfileByIdOrCode = async (idOrCode) => {
  const isNum = !isNaN(parseInt(idOrCode)) && /^\d+$/.test(idOrCode) && idOrCode.length < 10;
  return await prisma.profile.findFirst({
    where: isNum ? { OR: [{ id: parseInt(idOrCode) }, { profile_id: idOrCode }] } : { profile_id: idOrCode },
    include: {
      faculty: true,
      department: true,
      addresses: true,
      studentSkills: { include: { skill: true } },
      internships: { orderBy: { start_date: 'desc' } },
      studentProjects: { orderBy: { created_at: 'desc' } },
      alumniEmployments: { orderBy: { is_current: 'desc' } }
    }
  });
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getAllStudents = async (req, res) => {
  try {
    const { faculty, department, department_id, year, status, search } = req.query;
    const where = {};

    // 1. Department Mapping
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
        where.department_id = -1;
      }
    } else if (Array.isArray(department_id)) {
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

    // 2. Users filter
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
    
    // 3. Fetch Profiles in chunks
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
        first_name_en: p.first_name_en || '',
        last_name_en: p.last_name_en || '',
        faculty: facultyMap[p.faculty_id] || '',
        faculty_id: p.faculty_id,
        department: departmentMap[p.department_id] || '',
        department_id: p.department_id ? p.department_id.toString() : '',
        year: calYear,
        status: user.isActive ? 'Active' : 'Inactive',
        email: user.email,
        phone: p.phone || '',
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
      error: error.message
    });
  }
};

// @desc    Get single student with full details
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const user = await prisma.user.findFirst({
      where: { username: profile.profile_id }
    });

    // Find Thesis / Senior Project
    const thesisProjects = await prisma.project.findMany({
      where: {
        OR: [
          { created_by_profile_id: profile.profile_id },
          { members: { some: { profile_id: profile.profile_id } } }
        ]
      },
      include: {
        advisor: true,
        members: { include: { profile: true } }
      }
    });

    const entryBE = profile.profile_id && /^\d{2}/.test(profile.profile_id)
      ? 2500 + parseInt(profile.profile_id.substring(0, 2), 10)
      : null;
    const currentBE = new Date().getFullYear() + 543;
    const yearLevel = entryBE ? Math.max(1, currentBE - entryBE + 1) : 1;

    const data = {
      id: profile.id,
      student_id: profile.profile_id,
      prefix: profile.prefix || '',
      first_name: profile.firstname,
      last_name: profile.lastname,
      first_name_en: profile.first_name_en || '',
      last_name_en: profile.last_name_en || '',
      phone: profile.phone || '',
      birth_date: profile.birth_date,
      avatar_url: profile.avatar_url || '',
      bio: profile.bio || '',
      graduation_year: profile.graduation_year || (entryBE ? entryBE + 4 : null),
      graduation_batch: profile.graduation_batch || '',
      graduation_date: profile.graduation_date,
      student_status: profile.student_status || 'active',
      entry_year: entryBE,
      year: yearLevel,
      status: user?.isActive ? 'Active' : 'Inactive',
      role: user?.role || 'student',
      faculty: profile.faculty?.faculty_name || '',
      faculty_id: profile.faculty_id,
      department: profile.department?.department_name || '',
      department_id: profile.department?.department_id || '',
      contact_info: {
        email: user?.email || `${profile.profile_id}@student.sskru.ac.th`,
        phone: profile.phone || '',
        linkedin: profile.linkedin_url || '',
        github: profile.github_url || '',
        portfolio: profile.portfolio_url || ''
      },
      addresses: profile.addresses,
      skills: profile.studentSkills.map(s => ({
        id: s.id,
        skill_id: s.skill.id,
        name: s.skill.name,
        category: s.skill.category,
        level: s.level
      })),
      internships: profile.internships,
      student_projects: profile.studentProjects,
      thesis_projects: thesisProjects,
      employments: profile.alumniEmployments,
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      } : null
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in getStudent:', error);
    res.status(500).json({ success: false, message: 'Error fetching student details', error: error.message });
  }
};

// @desc    Get student by Student ID Code (Autofill support)
// @route   GET /api/students/code/:student_id
// @access  Private
exports.getStudentByCode = async (req, res) => {
  try {
    const code = req.params.student_id;
    const profile = await prisma.profile.findUnique({
      where: { profile_id: code },
      include: { faculty: true, department: true }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student ID not found' });
    }

    const user = await prisma.user.findUnique({
      where: { username: code }
    });

    res.json({
      success: true,
      data: {
        id: profile.id,
        student_id: profile.profile_id,
        prefix: profile.prefix || '',
        first_name: profile.firstname,
        last_name: profile.lastname,
        first_name_en: profile.first_name_en || '',
        last_name_en: profile.last_name_en || '',
        faculty: profile.faculty?.faculty_name || '',
        faculty_id: profile.faculty_id,
        department: profile.department?.department_name || '',
        department_id: profile.department?.department_id || '',
        email: user?.email || `${profile.profile_id}@student.sskru.ac.th`,
        phone: profile.phone || '',
        graduation_year: profile.graduation_year || null
      }
    });
  } catch (error) {
    console.error('Error in getStudentByCode:', error);
    res.status(500).json({ success: false, message: 'Error fetching student by code', error: error.message });
  }
};

// @desc    Get complete Resume data
// @route   GET /api/students/:id/resume
// @access  Private
exports.getResume = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student/Profile not found' });
    }

    const user = await prisma.user.findFirst({
      where: { username: profile.profile_id }
    });

    // Thesis project
    const thesis = await prisma.project.findFirst({
      where: {
        OR: [
          { created_by_profile_id: profile.profile_id },
          { members: { some: { profile_id: profile.profile_id } } }
        ]
      },
      include: {
        advisor: { include: { department: true } },
        members: { include: { profile: true } }
      }
    });

    // Categorize skills
    const skillsByCategory = {
      programming: [],
      framework: [],
      database: [],
      tools: [],
      soft_skills: [],
      language: [],
      other: []
    };

    profile.studentSkills.forEach(s => {
      const cat = s.skill.category || 'other';
      if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
      skillsByCategory[cat].push({
        id: s.id,
        skill_id: s.skill.id,
        name: s.skill.name,
        level: s.level
      });
    });

    const currentAddress = profile.addresses.find(a => a.type === 'current') || null;
    const registeredAddress = profile.addresses.find(a => a.type === 'registered') || null;

    const entryBE = profile.profile_id && /^\d{2}/.test(profile.profile_id)
      ? 2500 + parseInt(profile.profile_id.substring(0, 2), 10)
      : null;

    const resumeData = {
      profile: {
        id: profile.id,
        profile_id: profile.profile_id,
        prefix: profile.prefix || '',
        first_name: profile.firstname,
        last_name: profile.lastname,
        first_name_en: profile.first_name_en || '',
        last_name_en: profile.last_name_en || '',
        full_name_th: `${profile.prefix || ''} ${profile.firstname} ${profile.lastname}`.trim(),
        full_name_en: (profile.first_name_en && profile.last_name_en) 
          ? `${profile.first_name_en} ${profile.last_name_en}`.trim() 
          : '',
        phone: profile.phone || '',
        email: user?.email || `${profile.profile_id}@student.sskru.ac.th`,
        birth_date: profile.birth_date,
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || 'มุ่งมั่นนำความรู้และทักษะด้านเทคโนโลยีสารสนเทศมาพัฒนาโซลูชันที่มีประสิทธิภาพ',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
        portfolio_url: profile.portfolio_url || ''
      },
      education: {
        university: 'มหาวิทยาลัยราชภัฏศรีสะเกษ (Sisaket Rajabhat University)',
        faculty: profile.faculty?.faculty_name || '',
        department: profile.department?.department_name || '',
        entry_year: entryBE,
        graduation_year: profile.graduation_year || (entryBE ? entryBE + 4 : null),
        status: user?.role === 'alumni' ? 'จบการศึกษาแล้ว (Graduated)' : 'กำลังศึกษา (Studying)'
      },
      addresses: {
        current: currentAddress,
        registered: registeredAddress
      },
      skills: profile.studentSkills.map(s => ({
        id: s.id,
        name: s.skill.name,
        category: s.skill.category,
        level: s.level
      })),
      skills_by_category: skillsByCategory,
      internships: profile.internships,
      student_projects: profile.studentProjects,
      thesis_project: thesis ? {
        id: thesis.id,
        project_id: thesis.project_id,
        title_th: thesis.title_th,
        title_en: thesis.title_en,
        description: thesis.description,
        advisor: thesis.advisor ? `${thesis.advisor.firstname} ${thesis.advisor.lastname}`.trim() : '',
        status: thesis.status,
        year: thesis.year,
        has_award: thesis.has_award,
        document_url: thesis.document_url
      } : null,
      employments: profile.alumniEmployments
    };

    res.json({ success: true, data: resumeData });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ success: false, message: 'Error generating resume', error: error.message });
  }
};

// @desc    Update Resume data (personal info, addresses, social links)
// @route   PUT /api/students/:id/resume
// @access  Private
exports.updateResume = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student/Profile not found' });
    }

    const {
      first_name_en,
      last_name_en,
      phone,
      birth_date,
      bio,
      avatar_url,
      linkedin_url,
      github_url,
      portfolio_url,
      current_address,
      registered_address
    } = req.body;

    // 1. Update Profile fields
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        first_name_en: first_name_en !== undefined ? first_name_en : profile.first_name_en,
        last_name_en: last_name_en !== undefined ? last_name_en : profile.last_name_en,
        phone: phone !== undefined ? phone : profile.phone,
        birth_date: birth_date ? new Date(birth_date) : profile.birth_date,
        bio: bio !== undefined ? bio : profile.bio,
        avatar_url: avatar_url !== undefined ? avatar_url : profile.avatar_url,
        linkedin_url: linkedin_url !== undefined ? linkedin_url : profile.linkedin_url,
        github_url: github_url !== undefined ? github_url : profile.github_url,
        portfolio_url: portfolio_url !== undefined ? portfolio_url : profile.portfolio_url
      }
    });

    // 2. Upsert Current Address
    if (current_address) {
      const existingCurrent = await prisma.studentAddress.findFirst({
        where: { profile_id: profile.profile_id, type: 'current' }
      });

      if (existingCurrent) {
        await prisma.studentAddress.update({
          where: { id: existingCurrent.id },
          data: {
            address_line: current_address.address_line,
            subdistrict: current_address.subdistrict,
            district: current_address.district,
            province: current_address.province,
            postal_code: current_address.postal_code
          }
        });
      } else {
        await prisma.studentAddress.create({
          data: {
            profile_id: profile.profile_id,
            type: 'current',
            address_line: current_address.address_line,
            subdistrict: current_address.subdistrict,
            district: current_address.district,
            province: current_address.province,
            postal_code: current_address.postal_code
          }
        });
      }
    }

    // 3. Upsert Registered Address
    if (registered_address) {
      const existingReg = await prisma.studentAddress.findFirst({
        where: { profile_id: profile.profile_id, type: 'registered' }
      });

      if (existingReg) {
        await prisma.studentAddress.update({
          where: { id: existingReg.id },
          data: {
            address_line: registered_address.address_line,
            subdistrict: registered_address.subdistrict,
            district: registered_address.district,
            province: registered_address.province,
            postal_code: registered_address.postal_code
          }
        });
      } else {
        await prisma.studentAddress.create({
          data: {
            profile_id: profile.profile_id,
            type: 'registered',
            address_line: registered_address.address_line,
            subdistrict: registered_address.subdistrict,
            district: registered_address.district,
            province: registered_address.province,
            postal_code: registered_address.postal_code
          }
        });
      }
    }

    res.json({ success: true, message: 'บันทึกข้อมูล Resume สำเร็จ' });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ success: false, message: 'Error updating resume', error: error.message });
  }
};

// ==========================================
// STUDENT SKILLS CRUD
// ==========================================

// @desc    Get student skills
// @route   GET /api/students/:id/skills
// @access  Private
exports.getStudentSkills = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const studentSkills = await prisma.studentSkill.findMany({
      where: { profile_id: profile.profile_id },
      include: { skill: true }
    });

    const result = studentSkills.map(s => ({
      id: s.id,
      skill_id: s.skill.id,
      name: s.skill.name,
      category: s.skill.category,
      level: s.level
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching skills', error: error.message });
  }
};

// @desc    Add skill to student
// @route   POST /api/students/:id/skills
// @access  Private
exports.addStudentSkill = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const { skill_id, skill_name, category, level } = req.body;

    let targetSkillId = skill_id;
    if (!targetSkillId && skill_name) {
      // Find or create skill
      let skill = await prisma.skill.findUnique({ where: { name: skill_name.trim() } });
      if (!skill) {
        skill = await prisma.skill.create({
          data: {
            name: skill_name.trim(),
            category: category || 'other'
          }
        });
      }
      targetSkillId = skill.id;
    }

    if (!targetSkillId) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุทักษะ (skill_id หรือ skill_name)' });
    }

    const studentSkill = await prisma.studentSkill.upsert({
      where: {
        profile_id_skill_id: {
          profile_id: profile.profile_id,
          skill_id: targetSkillId
        }
      },
      update: {
        level: level || 'intermediate'
      },
      create: {
        profile_id: profile.profile_id,
        skill_id: targetSkillId,
        level: level || 'intermediate'
      },
      include: { skill: true }
    });

    res.status(201).json({
      success: true,
      message: 'เพิ่มทักษะสำเร็จ',
      data: {
        id: studentSkill.id,
        skill_id: studentSkill.skill.id,
        name: studentSkill.skill.name,
        category: studentSkill.skill.category,
        level: studentSkill.level
      }
    });
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).json({ success: false, message: 'Error adding skill', error: error.message });
  }
};

// @desc    Delete student skill
// @route   DELETE /api/students/:id/skills/:skillId
// @access  Private
exports.deleteStudentSkill = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const skillIdParam = parseInt(req.params.skillId);

    // Can delete by studentSkill id or by skill_id
    await prisma.studentSkill.deleteMany({
      where: {
        profile_id: profile.profile_id,
        OR: [{ id: skillIdParam }, { skill_id: skillIdParam }]
      }
    });

    res.json({ success: true, message: 'ลบทักษะสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting skill', error: error.message });
  }
};

// ==========================================
// STUDENT INTERNSHIPS CRUD
// ==========================================

// @desc    Get student internships
// @route   GET /api/students/:id/internships
// @access  Private
exports.getStudentInternships = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const internships = await prisma.internship.findMany({
      where: { profile_id: profile.profile_id },
      orderBy: { start_date: 'desc' }
    });

    res.json({ success: true, count: internships.length, data: internships });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching internships', error: error.message });
  }
};

// @desc    Create internship for student
// @route   POST /api/students/:id/internships
// @access  Private
exports.createInternship = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const data = req.body;
    if (!data.company_name || !data.position) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อสถานประกอบการและตำแหน่ง' });
    }

    const internship = await prisma.internship.create({
      data: {
        profile_id: profile.profile_id,
        company_name: data.company_name,
        position: data.position,
        department: data.department || null,
        address: data.address || null,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        hours: data.hours ? parseInt(data.hours) : 0,
        description: data.description || null,
        skills_used: data.skills_used || [],
        evaluation_score: data.evaluation_score ? parseFloat(data.evaluation_score) : null,
        evaluation_status: data.evaluation_status || 'pending',
        status: data.status || 'in_progress'
      }
    });

    res.status(201).json({ success: true, message: 'บันทึกข้อมูลการฝึกงานสำเร็จ', data: internship });
  } catch (error) {
    console.error('Error creating internship:', error);
    res.status(500).json({ success: false, message: 'Error creating internship', error: error.message });
  }
};

// @desc    Update internship
// @route   PUT /api/students/:id/internships/:internshipId
// @access  Private
exports.updateInternship = async (req, res) => {
  try {
    const intId = parseInt(req.params.internshipId);
    const data = req.body;

    const updated = await prisma.internship.update({
      where: { id: intId },
      data: {
        company_name: data.company_name,
        position: data.position,
        department: data.department,
        address: data.address,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        hours: data.hours !== undefined ? parseInt(data.hours) : undefined,
        description: data.description,
        skills_used: data.skills_used,
        evaluation_score: data.evaluation_score !== undefined ? parseFloat(data.evaluation_score) : undefined,
        evaluation_status: data.evaluation_status,
        status: data.status
      }
    });

    res.json({ success: true, message: 'แก้ไขข้อมูลการฝึกงานสำเร็จ', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating internship', error: error.message });
  }
};

// @desc    Delete internship
// @route   DELETE /api/students/:id/internships/:internshipId
// @access  Private
exports.deleteInternship = async (req, res) => {
  try {
    const intId = parseInt(req.params.internshipId);
    await prisma.internship.delete({ where: { id: intId } });
    res.json({ success: true, message: 'ลบข้อมูลการฝึกงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting internship', error: error.message });
  }
};

// ==========================================
// STUDENT PROJECTS CRUD (Semester Projects)
// ==========================================

// @desc    Get student semester projects
// @route   GET /api/students/:id/projects
// @access  Private
exports.getStudentProjects = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const projects = await prisma.studentProject.findMany({
      where: { profile_id: profile.profile_id },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching student projects', error: error.message });
  }
};

// @desc    Create student semester project
// @route   POST /api/students/:id/projects
// @access  Private
exports.createStudentProject = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const data = req.body;
    if (!data.title) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผลงาน' });
    }

    const project = await prisma.studentProject.create({
      data: {
        profile_id: profile.profile_id,
        title: data.title,
        description: data.description || null,
        category: data.category || 'Coursework',
        academic_year: data.academic_year ? parseInt(data.academic_year) : new Date().getFullYear() + 543,
        semester: data.semester ? parseInt(data.semester) : 1,
        course_name: data.course_name || null,
        technologies: data.technologies || [],
        github_url: data.github_url || null,
        demo_url: data.demo_url || null,
        image_url: data.image_url || null,
        document_url: data.document_url || null,
        link_url: data.link_url || null,
        status: data.status || 'completed',
        skills_used: data.skills_used || [],
        internship_company: data.internship_company || null,
        is_published: data.is_published !== undefined ? Boolean(data.is_published) : true,
        year: data.year ? parseInt(data.year) : null
      }
    });

    res.status(201).json({ success: true, message: 'บันทึกผลงานสำเร็จ', data: project });
  } catch (error) {
    console.error('Error creating student project:', error);
    res.status(500).json({ success: false, message: 'Error creating student project', error: error.message });
  }
};

// @desc    Update student semester project
// @route   PUT /api/students/:id/projects/:projectId
// @access  Private
exports.updateStudentProject = async (req, res) => {
  try {
    const projId = parseInt(req.params.projectId);
    const data = req.body;

    const updated = await prisma.studentProject.update({
      where: { id: projId },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        academic_year: data.academic_year !== undefined ? parseInt(data.academic_year) : undefined,
        semester: data.semester !== undefined ? parseInt(data.semester) : undefined,
        course_name: data.course_name,
        technologies: data.technologies,
        github_url: data.github_url,
        demo_url: data.demo_url,
        image_url: data.image_url,
        document_url: data.document_url,
        link_url: data.link_url,
        status: data.status,
        skills_used: data.skills_used,
        internship_company: data.internship_company,
        is_published: data.is_published !== undefined ? Boolean(data.is_published) : undefined,
        year: data.year !== undefined ? parseInt(data.year) : undefined
      }
    });

    res.json({ success: true, message: 'แก้ไขผลงานสำเร็จ', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating project', error: error.message });
  }
};

// @desc    Delete student semester project
// @route   DELETE /api/students/:id/projects/:projectId
// @access  Private
exports.deleteStudentProject = async (req, res) => {
  try {
    const projId = parseInt(req.params.projectId);
    await prisma.studentProject.delete({ where: { id: projId } });
    res.json({ success: true, message: 'ลบผลงานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting project', error: error.message });
  }
};

// ==========================================
// STUDENT CRUD
// ==========================================

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

    // Upsert User
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

    // Upsert Profile
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
    const profile = await findProfileByIdOrCode(req.params.id);
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

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        prefix: data.prefix !== undefined ? data.prefix : profile.prefix,
        firstname: data.first_name || profile.firstname,
        lastname: data.last_name || profile.lastname,
        first_name_en: data.first_name_en !== undefined ? data.first_name_en : profile.first_name_en,
        last_name_en: data.last_name_en !== undefined ? data.last_name_en : profile.last_name_en,
        phone: data.phone !== undefined ? data.phone : profile.phone,
        bio: data.bio !== undefined ? data.bio : profile.bio,
        graduation_year: data.graduation_year !== undefined ? parseInt(data.graduation_year) : profile.graduation_year,
        graduation_batch: data.graduation_batch !== undefined ? data.graduation_batch : profile.graduation_batch,
        graduation_date: data.graduation_date !== undefined ? (data.graduation_date ? new Date(data.graduation_date) : null) : profile.graduation_date,
        student_status: data.student_status !== undefined ? data.student_status : profile.student_status,
        faculty_id: facultyId,
        department_id: departmentId
      }
    });

    if (data.status || data.role) {
      const user = await prisma.user.findUnique({ where: { username: profile.profile_id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isActive: data.status ? data.status === 'Active' : user.isActive,
            role: data.role || (data.status === 'Graduated' ? 'alumni' : user.role)
          }
        });
      }
    }

    res.json({ success: true, message: 'Student updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating student', error: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
exports.deleteStudent = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (profile) {
      await prisma.profile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { username: profile.profile_id } }).catch(() => {});
    }
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting student', error: error.message });
  }
};

// @desc    Promote Student to Alumni
// @route   POST /api/students/:id/promote
// @access  Private (Admin)
exports.promoteStudentToAlumni = async (req, res) => {
  try {
    const profile = await findProfileByIdOrCode(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const gradYear = req.body.graduation_year 
      ? parseInt(req.body.graduation_year) 
      : new Date().getFullYear() + 543;

    const gradBatch = req.body.graduation_batch || null;
    const gradDate = req.body.graduation_date ? new Date(req.body.graduation_date) : null;

    // Update profile with graduation info
    await prisma.profile.update({
      where: { id: profile.id },
      data: { 
        graduation_year: gradYear,
        graduation_batch: gradBatch,
        graduation_date: gradDate,
        student_status: 'graduated'
      }
    });

    // Update user role to alumni and ensure email is valid
    let finalEmail = null;
    const user = await prisma.user.findFirst({
      where: { username: profile.profile_id }
    });

    if (user) {
      const updateData = { role: 'alumni' };
      const reqEmail = req.body.email ? req.body.email.trim() : '';

      if (reqEmail) {
        // Validate conflict with other user
        const conflict = await prisma.user.findFirst({
          where: { email: reqEmail, NOT: { id: user.id } }
        });
        if (conflict) {
          return res.status(400).json({ 
            success: false, 
            message: `อีเมล ${reqEmail} ถูกใช้งานแล้วโดยผู้ใช้อื่น กรุณาระบุอีเมลอื่น` 
          });
        }
        updateData.email = reqEmail;
        finalEmail = reqEmail;
      } else if (!user.email || user.email.trim() === '') {
        // Generate safe default fallback email
        let fallbackEmail = `${profile.profile_id}@alumni.sskru.ac.th`;
        const conflict = await prisma.user.findFirst({
          where: { email: fallbackEmail, NOT: { id: user.id } }
        });
        if (conflict) {
          fallbackEmail = `${profile.profile_id}_${Date.now()}@alumni.sskru.ac.th`;
        }
        updateData.email = fallbackEmail;
        finalEmail = fallbackEmail;
      } else {
        finalEmail = user.email;
      }

      try {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      } catch (userErr) {
        console.warn('Could not update user credentials during promote:', userErr.message);
      }
    }

    res.json({ 
      success: true, 
      message: `เปลี่ยนสถานะเป็นศิษย์เก่า รุ่นปี พ.ศ. ${gradYear} เรียบร้อยแล้ว`,
      data: {
        graduation_year: gradYear,
        graduation_batch: gradBatch,
        graduation_date: gradDate,
        email: finalEmail
      }
    });
  } catch (error) {
    console.error('Error promoting student:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการปรับสถานะเป็นศิษย์เก่า', error: error.message });
  }
};
