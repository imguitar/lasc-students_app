const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

// Helper function to find or create faculty and department
const getOrSetupFacultyAndDept = async (facultyName, deptName, deptCode) => {
  let faculty = await prisma.faculty.findFirst({ where: { faculty_name: facultyName } });
  if (!faculty) {
    faculty = await prisma.faculty.create({ data: { faculty_name: facultyName } });
  }

  let department = null;
  if (deptCode) {
    department = await prisma.department.findUnique({ where: { department_id: deptCode } });
  }
  if (!department) {
    department = await prisma.department.findFirst({ 
      where: { department_name: deptName, faculty_id: faculty.id } 
    });
  }
  if (!department) {
    const generatedCode = deptCode || `D${Date.now().toString().slice(-4)}`;
    department = await prisma.department.create({
      data: { 
        department_name: deptName, 
        department_id: generatedCode,
        faculty_id: faculty.id 
      }
    });
  }

  return { facultyId: faculty.id, departmentId: department.id };
};

// @desc    Get all alumni
// @route   GET /api/alumni
// @access  Private
exports.getAllAlumni = async (req, res) => {
  try {
    const { faculty, department, department_id, graduation_year, graduation_batch, employment_status, search } = req.query;
    
    // Find all users with role 'student' or 'alumni'
    const users = await prisma.user.findMany({
      where: { role: { in: ['student', 'alumni'] } },
      select: { id: true, username: true, email: true, isActive: true, role: true }
    });
    const userMap = {};
    users.forEach(u => { userMap[u.username] = u; });

    // ดึง Profiles ของผู้ใช้ทั้งหมด แล้วแยกผู้ที่เป็นศิษย์เก่า:
    // 1. profile_id ที่ขึ้นต้นด้วย 2 หลัก < 66 (เช่น 65, 64, 63, ...)
    // 2. หรือ user.role เป็น 'alumni'
    // 3. หรือมี graduation_year
    // 4. หรือมีประวัติการทำงานใน alumniEmployments
    const allProfiles = await prisma.profile.findMany({
      where: {
        profile_id: { in: users.map(u => u.username) }
      },
      include: {
        faculty: true,
        department: true,
        alumniEmployments: {
          orderBy: [
            { is_current: 'desc' },
            { start_date: 'desc' }
          ]
        },
        studentSkills: {
          include: { skill: true }
        },
        addresses: true
      },
      orderBy: { profile_id: 'desc' }
    });

    const profiles = allProfiles.filter(p => {
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      if (match) {
        return parseInt(match[1], 10) < 66;
      }
      return p.graduation_year !== null || userMap[p.profile_id]?.role === 'alumni' || (p.alumniEmployments && p.alumniEmployments.length > 0);
    });

    let alumniList = profiles.map(p => {
      const user = userMap[p.profile_id];
      const currentJob = p.alumniEmployments.find(e => e.is_current) || p.alumniEmployments[0] || null;
      
      // Calculate or read graduation year
      let gradYear = p.graduation_year;
      if (!gradYear && p.profile_id && /^\d{2}/.test(p.profile_id)) {
        const entryBE = 2500 + parseInt(p.profile_id.substring(0, 2), 10);
        gradYear = entryBE + 4;
      }

      const hasJob = !!currentJob;
      const calculatedEmploymentStatus = hasJob ? 'employed' : 'unemployed';

      return {
        id: p.id,
        alumni_id: p.profile_id,
        first_name: p.firstname,
        last_name: p.lastname,
        first_name_en: p.first_name_en || '',
        last_name_en: p.last_name_en || '',
        prefix: p.prefix || '',
        phone: p.phone || '',
        bio: p.bio || '',
        avatar_url: p.avatar_url || '',
        faculty: p.faculty?.faculty_name || '',
        faculty_id: p.faculty_id,
        department: p.department?.department_name || '',
        department_id: p.department?.department_id || '',
        department_numeric_id: p.department_id,
        graduation_year: gradYear || '',
        graduation_batch: p.graduation_batch || '',
        graduation_date: p.graduation_date,
        student_status: p.student_status || 'graduated',
        employment_status: calculatedEmploymentStatus,
        workplace: currentJob?.company_name || 'ยังไม่ได้ระบุ',
        position: currentJob?.position || 'ยังไม่ได้ระบุ',
        current_job: currentJob,
        employments: p.alumniEmployments,
        skills: p.studentSkills.map(s => ({
          id: s.skill.id,
          name: s.skill.name,
          category: s.skill.category,
          level: s.level
        })),
        addresses: p.addresses,
        contact_info: {
          email: user?.email || `${p.profile_id}@alumni.local`,
          phone: p.phone || '',
          linkedin: p.linkedin_url || '',
          github: p.github_url || '',
          portfolio: p.portfolio_url || ''
        },
        userId: user?.id || null
      };
    });

    // 1. Filter by Faculty
    if (faculty && faculty.trim() !== '') {
      alumniList = alumniList.filter(a => a.faculty === faculty.trim());
    }

    // 2. Filter by Department Name
    if (department && department.trim() !== '') {
      alumniList = alumniList.filter(a => 
        a.department === department.trim() || 
        a.department.includes(department.trim())
      );
    }

    // 3. Filter by Department Code / Numeric ID / Name
    if (department_id && department_id.trim() !== '') {
      const depCode = department_id.trim();
      alumniList = alumniList.filter(a => 
        a.department_id === depCode || 
        String(a.department_numeric_id) === depCode ||
        String(a.department_id) === depCode ||
        a.department === depCode
      );
    }

    // 4. Filter by Graduation Year
    if (graduation_year && graduation_year.trim() !== '') {
      const parsedGrad = parseInt(graduation_year, 10);
      if (!isNaN(parsedGrad)) {
        alumniList = alumniList.filter(a => a.graduation_year === parsedGrad);
      }
    }

    // 5. Filter by Graduation Batch
    if (graduation_batch && graduation_batch.trim() !== '') {
      const batchStr = graduation_batch.trim();
      alumniList = alumniList.filter(a => a.graduation_batch && a.graduation_batch.includes(batchStr));
    }

    // 6. Filter by Employment Status
    if (employment_status && employment_status.trim() !== '') {
      alumniList = alumniList.filter(a => a.employment_status === employment_status.trim());
    }

    // 7. Search
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      alumniList = alumniList.filter(a =>
        a.first_name.toLowerCase().includes(q) ||
        a.last_name.toLowerCase().includes(q) ||
        a.alumni_id.toLowerCase().includes(q) ||
        a.workplace.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: alumniList.length,
      data: alumniList
    });
  } catch (error) {
    console.error('Error fetching alumni:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching alumni',
      error: error.message 
    });
  }
};

// @desc    Get single alumni by ID or profile_id
// @route   GET /api/alumni/:id
// @access  Private
exports.getAlumni = async (req, res) => {
  try {
    const idParam = req.params.id;
    const isNum = !isNaN(parseInt(idParam));

    const profile = await prisma.profile.findFirst({
      where: isNum 
        ? { OR: [{ id: parseInt(idParam) }, { profile_id: idParam }] }
        : { profile_id: idParam },
      include: {
        faculty: true,
        department: true,
        alumniEmployments: {
          orderBy: [
            { is_current: 'desc' },
            { start_date: 'desc' }
          ]
        },
        studentSkills: {
          include: { skill: true }
        },
        studentProjects: {
          orderBy: { created_at: 'desc' }
        },
        addresses: true
      }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Alumni not found' });
    }

    // Find linked User
    const user = await prisma.user.findFirst({
      where: { username: profile.profile_id }
    });

    // Find projects created or joined
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { created_by_profile_id: profile.profile_id },
          { members: { some: { profile_id: profile.profile_id } } }
        ]
      },
      include: {
        advisor: true
      }
    });

    const currentJob = profile.alumniEmployments.find(e => e.is_current) || profile.alumniEmployments[0] || null;

    let gradYear = profile.graduation_year;
    if (!gradYear && profile.profile_id && /^\d{2}/.test(profile.profile_id)) {
      gradYear = 2500 + parseInt(profile.profile_id.substring(0, 2), 10) + 4;
    }

    const data = {
      id: profile.id,
      alumni_id: profile.profile_id,
      prefix: profile.prefix || '',
      first_name: profile.firstname,
      last_name: profile.lastname,
      first_name_en: profile.first_name_en || '',
      last_name_en: profile.last_name_en || '',
      phone: profile.phone || '',
      birth_date: profile.birth_date,
      avatar_url: profile.avatar_url || '',
      bio: profile.bio || '',
      graduation_year: gradYear,
      graduation_batch: profile.graduation_batch || '',
      graduation_date: profile.graduation_date,
      student_status: profile.student_status || 'graduated',
      faculty: profile.faculty?.faculty_name || '',
      faculty_id: profile.faculty_id,
      department: profile.department?.department_name || '',
      department_id: profile.department?.department_id || '',
      employment_status: currentJob ? 'employed' : 'unemployed',
      workplace: currentJob?.company_name || 'ยังไม่ได้ระบุ',
      position: currentJob?.position || 'ยังไม่ได้ระบุ',
      current_job: currentJob,
      employments: profile.alumniEmployments,
      skills: profile.studentSkills.map(s => ({
        id: s.id,
        skill_id: s.skill.id,
        name: s.skill.name,
        category: s.skill.category,
        level: s.level
      })),
      projects: projects,
      student_projects: profile.studentProjects,
      addresses: profile.addresses,
      contact_info: {
        email: user?.email || `${profile.profile_id}@alumni.local`,
        phone: profile.phone || '',
        linkedin: profile.linkedin_url || '',
        github: profile.github_url || '',
        portfolio: profile.portfolio_url || ''
      },
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
    console.error('Error fetching alumni detail:', error);
    res.status(500).json({ success: false, message: 'Error fetching alumni details', error: error.message });
  }
};

// @desc    Create new alumni
// @route   POST /api/alumni
// @access  Private (Admin)
exports.createAlumni = async (req, res) => {
  try {
    const data = { ...req.body };
    const alumniId = data.alumni_id || data.student_id;
    const firstName = data.first_name || data.firstname;
    const lastName = data.last_name || data.lastname || '';

    if (!alumniId || !firstName) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสศิษย์เก่า และชื่อ' });
    }

    // 1. Setup Faculty and Department
    const facName = data.faculty || 'คณะวิทยาศาสตร์และเทคโนโลยี';
    const deptName = data.department || 'สาขาวิทยาการคอมพิวเตอร์';
    const deptCode = data.department_id || null;
    const { facultyId, departmentId } = await getOrSetupFacultyAndDept(facName, deptName, deptCode);

    // 2. Calculate Graduation Year
    let gradYear = data.graduation_year ? parseInt(data.graduation_year, 10) : null;
    if (!gradYear && /^\d{2}/.test(alumniId)) {
      gradYear = 2500 + parseInt(alumniId.substring(0, 2), 10) + 4;
    }

    // 3. Upsert User with role 'alumni'
    const existingUser = await prisma.user.findUnique({ where: { username: alumniId } });
    if (!existingUser) {
      const defaultPassword = await bcrypt.hash(alumniId, 10);
      await prisma.user.create({
        data: {
          username: alumniId,
          email: data.contact_info?.email || data.email || `${alumniId}@alumni.sskru.ac.th`,
          password: defaultPassword,
          role: 'alumni',
          isActive: true
        }
      });
    } else if (existingUser.role !== 'alumni') {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'alumni' }
      });
    }

    // 4. Upsert Profile
    const profile = await prisma.profile.upsert({
      where: { profile_id: alumniId },
      update: {
        prefix: data.prefix || undefined,
        firstname: firstName,
        lastname: lastName,
        first_name_en: data.first_name_en || undefined,
        last_name_en: data.last_name_en || undefined,
        faculty_id: facultyId,
        department_id: departmentId,
        graduation_year: gradYear,
        graduation_batch: data.graduation_batch || null,
        graduation_date: data.graduation_date ? new Date(data.graduation_date) : null,
        student_status: 'graduated',
        phone: data.phone || data.contact_info?.phone || undefined,
        bio: data.bio || undefined,
        linkedin_url: data.linkedin_url || data.contact_info?.linkedin || undefined,
        github_url: data.github_url || data.contact_info?.github || undefined,
        portfolio_url: data.portfolio_url || data.contact_info?.portfolio || undefined
      },
      create: {
        profile_id: alumniId,
        prefix: data.prefix || 'นาย',
        firstname: firstName,
        lastname: lastName,
        first_name_en: data.first_name_en || null,
        last_name_en: data.last_name_en || null,
        faculty_id: facultyId,
        department_id: departmentId,
        graduation_year: gradYear,
        graduation_batch: data.graduation_batch || null,
        graduation_date: data.graduation_date ? new Date(data.graduation_date) : null,
        student_status: 'graduated',
        phone: data.phone || data.contact_info?.phone || null,
        bio: data.bio || null,
        linkedin_url: data.linkedin_url || data.contact_info?.linkedin || null,
        github_url: data.github_url || data.contact_info?.github || null,
        portfolio_url: data.portfolio_url || data.contact_info?.portfolio || null
      }
    });

    // 5. Add Employment if provided
    if (data.workplace || data.company_name) {
      await prisma.alumniEmployment.create({
        data: {
          profile_id: profile.profile_id,
          company_name: data.workplace || data.company_name,
          position: data.position || 'พนักงาน',
          department: data.work_department || null,
          job_type: data.job_type || 'full_time',
          is_current: true,
          location: data.work_location || null
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'เพิ่มข้อมูลศิษย์เก่าสำเร็จ — บัญชีผู้ใช้ถูกสร้างอัตโนมัติ',
      data: profile
    });
  } catch (error) {
    console.error('Error creating alumni:', error);
    res.status(500).json({ success: false, message: 'Error creating alumni', error: error.message });
  }
};

// @desc    Update alumni
// @route   PUT /api/alumni/:id
// @access  Private (Admin/Alumni)
exports.updateAlumni = async (req, res) => {
  try {
    const data = req.body;
    const idParam = req.params.id;
    const isNum = !isNaN(parseInt(idParam));

    const profile = await prisma.profile.findFirst({
      where: isNum 
        ? { OR: [{ id: parseInt(idParam) }, { profile_id: idParam }] }
        : { profile_id: idParam }
    });

    if (!profile) return res.status(404).json({ success: false, message: 'Alumni not found' });

    let facultyId = profile.faculty_id;
    let departmentId = profile.department_id;

    if (data.faculty && data.department) {
      const fd = await getOrSetupFacultyAndDept(data.faculty, data.department, data.department_id);
      facultyId = fd.facultyId;
      departmentId = fd.departmentId;
    } else if (data.department_id) {
      const dep = await prisma.department.findUnique({ where: { department_id: data.department_id } });
      if (dep) {
        departmentId = dep.id;
        facultyId = dep.faculty_id;
      }
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        prefix: data.prefix !== undefined ? data.prefix : profile.prefix,
        firstname: data.first_name || data.firstname || profile.firstname,
        lastname: data.last_name !== undefined ? data.last_name : profile.lastname,
        first_name_en: data.first_name_en !== undefined ? data.first_name_en : profile.first_name_en,
        last_name_en: data.last_name_en !== undefined ? data.last_name_en : profile.last_name_en,
        phone: data.phone !== undefined ? data.phone : (data.contact_info?.phone || profile.phone),
        bio: data.bio !== undefined ? data.bio : profile.bio,
        graduation_year: data.graduation_year !== undefined ? parseInt(data.graduation_year) : profile.graduation_year,
        graduation_batch: data.graduation_batch !== undefined ? data.graduation_batch : profile.graduation_batch,
        graduation_date: data.graduation_date !== undefined ? (data.graduation_date ? new Date(data.graduation_date) : null) : profile.graduation_date,
        linkedin_url: data.linkedin_url !== undefined ? data.linkedin_url : (data.contact_info?.linkedin || profile.linkedin_url),
        github_url: data.github_url !== undefined ? data.github_url : (data.contact_info?.github || profile.github_url),
        portfolio_url: data.portfolio_url !== undefined ? data.portfolio_url : (data.contact_info?.portfolio || profile.portfolio_url),
        faculty_id: facultyId,
        department_id: departmentId
      }
    });

    // Update email in User if provided
    const newEmail = data.email || data.contact_info?.email;
    if (newEmail) {
      await prisma.user.updateMany({
        where: { username: profile.profile_id },
        data: { email: newEmail }
      });
    }

    // Update or add Employment
    if (data.workplace || data.company_name) {
      const currentEmp = await prisma.alumniEmployment.findFirst({
        where: { profile_id: profile.profile_id, is_current: true }
      });

      if (currentEmp) {
        await prisma.alumniEmployment.update({
          where: { id: currentEmp.id },
          data: {
            company_name: data.workplace || data.company_name,
            position: data.position || currentEmp.position,
            location: data.work_location !== undefined ? data.work_location : currentEmp.location
          }
        });
      } else {
        await prisma.alumniEmployment.create({
          data: {
            profile_id: profile.profile_id,
            company_name: data.workplace || data.company_name,
            position: data.position || 'พนักงาน',
            location: data.work_location || null,
            is_current: true
          }
        });
      }
    }

    res.json({ success: true, message: 'Alumni updated successfully', data: updatedProfile });
  } catch (error) {
    console.error('Error updating alumni:', error);
    res.status(500).json({ success: false, message: 'Error updating alumni', error: error.message });
  }
};

// @desc    Delete alumni
// @route   DELETE /api/alumni/:id
// @access  Private (Admin)
exports.deleteAlumni = async (req, res) => {
  try {
    const idParam = req.params.id;
    const isNum = !isNaN(parseInt(idParam));

    const profile = await prisma.profile.findFirst({
      where: isNum ? { OR: [{ id: parseInt(idParam) }, { profile_id: idParam }] } : { profile_id: idParam }
    });

    if (profile) {
      await prisma.profile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { username: profile.profile_id } }).catch(() => {});
    }
    res.json({ success: true, message: 'Alumni deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting alumni', error: error.message });
  }
};

// ==========================================
// ALUMNI EMPLOYMENT CRUD
// ==========================================

// @desc    Add employment for alumni
// @route   POST /api/alumni/employment
// @access  Private (Admin/Alumni)
exports.addEmployment = async (req, res) => {
  try {
    const { profile_id, company_name, position, department, job_type, start_date, end_date, is_current, description, location, company_url } = req.body;

    if (!profile_id || !company_name || !position) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสศิษย์เก่า บริษัท และตำแหน่ง' });
    }

    // If marked current, mark other employments of this profile as not current
    if (is_current) {
      await prisma.alumniEmployment.updateMany({
        where: { profile_id },
        data: { is_current: false }
      });
    }

    const employment = await prisma.alumniEmployment.create({
      data: {
        profile_id,
        company_name,
        position,
        department: department || null,
        job_type: job_type || 'full_time',
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        is_current: is_current !== undefined ? Boolean(is_current) : true,
        description: description || null,
        location: location || null,
        company_url: company_url || null
      }
    });

    res.status(201).json({ success: true, message: 'เพิ่มประวัติการทำงานสำเร็จ', data: employment });
  } catch (error) {
    console.error('Error adding employment:', error);
    res.status(500).json({ success: false, message: 'Error adding employment', error: error.message });
  }
};

// @desc    Update employment
// @route   PUT /api/alumni/employment/:id
// @access  Private (Admin/Alumni)
exports.updateEmployment = async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const data = req.body;

    const existing = await prisma.alumniEmployment.findUnique({ where: { id: empId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Employment record not found' });

    if (data.is_current) {
      await prisma.alumniEmployment.updateMany({
        where: { profile_id: existing.profile_id },
        data: { is_current: false }
      });
    }

    const updated = await prisma.alumniEmployment.update({
      where: { id: empId },
      data: {
        company_name: data.company_name || existing.company_name,
        position: data.position || existing.position,
        department: data.department !== undefined ? data.department : existing.department,
        job_type: data.job_type || existing.job_type,
        start_date: data.start_date ? new Date(data.start_date) : existing.start_date,
        end_date: data.end_date ? new Date(data.end_date) : existing.end_date,
        is_current: data.is_current !== undefined ? Boolean(data.is_current) : existing.is_current,
        description: data.description !== undefined ? data.description : existing.description,
        location: data.location !== undefined ? data.location : existing.location,
        company_url: data.company_url !== undefined ? data.company_url : existing.company_url
      }
    });

    res.json({ success: true, message: 'แก้ไขประวัติการทำงานสำเร็จ', data: updated });
  } catch (error) {
    console.error('Error updating employment:', error);
    res.status(500).json({ success: false, message: 'Error updating employment', error: error.message });
  }
};

// @desc    Delete employment
// @route   DELETE /api/alumni/employment/:id
// @access  Private (Admin/Alumni)
exports.deleteEmployment = async (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    await prisma.alumniEmployment.delete({ where: { id: empId } });
    res.json({ success: true, message: 'ลบประวัติการทำงานสำเร็จ' });
  } catch (error) {
    console.error('Error deleting employment:', error);
    res.status(500).json({ success: false, message: 'Error deleting employment', error: error.message });
  }
};
