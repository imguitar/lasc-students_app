const prisma = require('../prismaClient');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const totalProjects = await prisma.project.count();
    const totalInternships = await prisma.internship.count();
    const totalStudentProjects = await prisma.studentProject.count();

    // ดึงผู้ใช้ที่เป็น student หรือ alumni
    const studentUsers = await prisma.user.findMany({
      where: { role: { in: ['student', 'alumni'] } },
      select: { username: true, role: true, isActive: true }
    });
    const userMap = {};
    studentUsers.forEach(u => { userMap[u.username] = u; });

    // ดึง Profile เพื่อแยก Current Student (รุ่น >= 66) และ Alumni (รุ่น < 66)
    const profiles = await prisma.profile.findMany({
      where: {
        profile_id: { in: studentUsers.map(u => u.username) }
      },
      select: {
        profile_id: true,
        graduation_year: true,
        student_status: true
      }
    });

    let currentStudentCount = 0;
    let activeStudentCount = 0;
    let alumniCount = 0;

    profiles.forEach(p => {
      const u = userMap[p.profile_id];
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      if (match) {
        const batch = parseInt(match[1], 10);
        if (batch >= 66) {
          currentStudentCount++;
          if (u ? u.isActive : true) activeStudentCount++;
        } else {
          alumniCount++;
        }
      } else if (p.graduation_year !== null || (u && u.role === 'alumni')) {
        alumniCount++;
      } else if (u && u.role === 'student') {
        currentStudentCount++;
        if (u.isActive) activeStudentCount++;
      }
    });

    // Count awarded projects
    const awardedProjects = await prisma.project.count({
      where: { has_award: true }
    });

    // Count projects by 6 statuses
    const draftProjects = await prisma.project.count({ where: { status: 'draft' } });
    const approvedProjects = await prisma.project.count({ where: { status: 'approved' } });
    const inProgressProjects = await prisma.project.count({ where: { status: 'in_progress' } });
    const waitingDefenseProjects = await prisma.project.count({ where: { status: 'waiting_defense' } });
    const passedDefenseProjects = await prisma.project.count({ where: { status: 'passed_defense' } });
    const completedProjects = await prisma.project.count({ where: { status: 'completed' } });

    // Count total faculties and departments
    const totalFaculties = await prisma.faculty.count();
    const totalDepartments = await prisma.department.count();

    const totalAll = currentStudentCount + alumniCount;

    res.json({
      success: true,
      data: {
        totalStudents: currentStudentCount,
        activeStudents: activeStudentCount,
        graduatedStudents: alumniCount,
        graduationRate: totalAll > 0 ? Math.round((alumniCount / totalAll) * 100) : 0,
        totalAlumni: alumniCount,
        totalProjects,
        totalInternships,
        totalStudentProjects,
        awardedProjects,
        totalFaculties,
        totalDepartments,
        projectsByStatus: {
          draft: draftProjects,
          approved: approvedProjects,
          in_progress: inProgressProjects,
          waiting_defense: waitingDefenseProjects,
          passed_defense: passedDefenseProjects,
          completed: completedProjects
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get alumni by faculty
// @route   GET /api/dashboard/alumni-by-faculty
// @access  Private
exports.getAlumniByFaculty = async (req, res) => {
  try {
    const studentUsers = await prisma.user.findMany({
      where: { role: { in: ['student', 'alumni'] } },
      select: { username: true, role: true }
    });
    const userMap = {};
    studentUsers.forEach(u => { userMap[u.username] = u; });

    const profiles = await prisma.profile.findMany({
      where: { profile_id: { in: studentUsers.map(u => u.username) } },
      select: { faculty_id: true, profile_id: true, graduation_year: true }
    });

    const faculties = await prisma.faculty.findMany();
    const facultyMap = {};
    faculties.forEach(f => { facultyMap[f.id] = f.faculty_name; });

    const counts = {};
    faculties.forEach(f => { counts[f.id] = 0; });

    profiles.forEach(p => {
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      const isAlumni = (match && parseInt(match[1], 10) < 66) || p.graduation_year !== null || userMap[p.profile_id]?.role === 'alumni';
      if (isAlumni && counts[p.faculty_id] !== undefined) {
        counts[p.faculty_id]++;
      }
    });

    const result = faculties.map(f => ({
      faculty: f.faculty_name,
      count: counts[f.id] || 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alumni by faculty',
      error: error.message
    });
  }
};

// @desc    Get alumni by graduation year
// @route   GET /api/dashboard/alumni-by-year
// @access  Private
exports.getAlumniByYear = async (req, res) => {
  try {
    const studentUsers = await prisma.user.findMany({
      where: { role: { in: ['student', 'alumni'] } },
      select: { username: true, role: true }
    });
    const userMap = {};
    studentUsers.forEach(u => { userMap[u.username] = u; });

    const profiles = await prisma.profile.findMany({
      where: { profile_id: { in: studentUsers.map(u => u.username) } },
      select: { profile_id: true, graduation_year: true }
    });

    const yearCounts = {};
    profiles.forEach(p => {
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      const batch = match ? parseInt(match[1], 10) : null;
      const isAlumni = (batch !== null && batch < 66) || p.graduation_year !== null || userMap[p.profile_id]?.role === 'alumni';

      if (isAlumni) {
        let gradYear = p.graduation_year;
        if (!gradYear && batch) {
          gradYear = 2500 + batch + 4;
        }
        if (gradYear) {
          yearCounts[gradYear] = (yearCounts[gradYear] || 0) + 1;
        }
      }
    });

    const result = Object.entries(yearCounts)
      .map(([yr, count]) => ({ year: parseInt(yr, 10), count }))
      .sort((a, b) => a.year - b.year);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alumni by year',
      error: error.message
    });
  }
};

// @desc    Get students by faculty (นักศึกษาปัจจุบัน รุ่น >= 66)
// @route   GET /api/dashboard/students-by-faculty
// @access  Private
exports.getStudentsByFaculty = async (req, res) => {
  try {
    const studentUsers = await prisma.user.findMany({
      where: { role: { in: ['student', 'alumni'] } },
      select: { username: true, role: true }
    });

    const profiles = await prisma.profile.findMany({
      where: { profile_id: { in: studentUsers.map(u => u.username) } },
      select: { faculty_id: true, profile_id: true }
    });

    const faculties = await prisma.faculty.findMany();
    const counts = {};
    faculties.forEach(f => { counts[f.id] = 0; });

    profiles.forEach(p => {
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      if (match && parseInt(match[1], 10) >= 66) {
        if (counts[p.faculty_id] !== undefined) {
          counts[p.faculty_id]++;
        }
      }
    });

    const result = faculties.map(f => ({
      faculty: f.faculty_name,
      count: counts[f.id] || 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching students by faculty',
      error: error.message
    });
  }
};

// @desc    Get recent projects
// @route   GET /api/dashboard/recent-alumni
// @access  Private
exports.getRecentAlumni = async (req, res) => {
  try {
    const recentProjects = await prisma.project.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        members: {
          include: {
            profile: {
              select: { firstname: true, lastname: true }
            }
          }
        }
      }
    });

    const result = recentProjects.map(p => ({
      id: p.id,
      first_name: p.title_th,
      last_name: '',
      workplace: p.status,
      position: `ปีการศึกษา ${p.year}`,
      updatedAt: p.updated_at
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent projects',
      error: error.message
    });
  }
};

// @desc    Get awarded projects
// @route   GET /api/dashboard/awarded-projects
// @access  Private
exports.getAwardedProjects = async (req, res) => {
  try {
    const awardedProjects = await prisma.project.findMany({
      where: { has_award: true },
      include: {
        members: {
          include: {
            profile: {
              select: { firstname: true, lastname: true }
            }
          }
        }
      },
      orderBy: { year: 'desc' },
      take: 10
    });

    res.json({ success: true, data: awardedProjects });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching awarded projects',
      error: error.message
    });
  }
};

// @desc    Get student status report with filters
// @route   GET /api/dashboard/student-report
// @access  Private
exports.getStudentReport = async (req, res) => {
  try {
    const { faculty, department_id, year } = req.query;

    // Build faculty/department filter for profiles
    let profileWhere = {};
    if (faculty && faculty.trim() !== '') {
      const fac = await prisma.faculty.findFirst({ where: { faculty_name: faculty.trim() } });
      if (fac) profileWhere.faculty_id = fac.id;
      else profileWhere.faculty_id = -1;
    }
    if (department_id && department_id.trim() !== '') {
      const deptTrim = department_id.trim();
      const parsedNum = parseInt(deptTrim, 10);
      const dept = await prisma.department.findFirst({
        where: {
          OR: [
            ...(!isNaN(parsedNum) ? [{ id: parsedNum }] : []),
            { department_id: deptTrim },
            { department_name: { contains: deptTrim } }
          ]
        }
      });
      if (dept) profileWhere.department_id = dept.id;
      else profileWhere.department_id = -1;
    }

    // Get all users (student and alumni)
    const allUsers = await prisma.user.findMany({
      where: { role: { in: ['student', 'alumni'] } },
      select: { username: true, role: true, isActive: true }
    });
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    // Get profiles
    const allProfiles = await prisma.profile.findMany({
      where: {
        ...profileWhere,
        profile_id: { in: allUsers.map(u => u.username) }
      },
      select: { 
        profile_id: true, 
        faculty_id: true, 
        department_id: true, 
        graduation_year: true, 
        student_status: true 
      }
    });

    // Filter by year (year level) if specified
    let filteredProfiles = allProfiles;
    if (year && year.trim() !== '') {
      const parsedYear = parseInt(year, 10);
      if (!isNaN(parsedYear)) {
        const currentBE = new Date().getFullYear() + 543;
        const entryBE = currentBE - parsedYear + 1;
        const prefix = (entryBE - 2500).toString();
        filteredProfiles = filteredProfiles.filter(p => p.profile_id.startsWith(prefix));
      }
    }

    // Count statuses
    let totalStudents = 0;
    let activeCount = 0;
    let inactiveCount = 0;
    let graduatedCount = 0;
    let resignedCount = 0;
    let suspendedCount = 0;

    filteredProfiles.forEach(p => {
      const u = userMap[p.profile_id];
      if (!u) return;

      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      const batch = match ? parseInt(match[1], 10) : null;
      const isAlumni = (batch !== null && batch < 66) || p.graduation_year !== null || u.role === 'alumni' || p.student_status === 'graduated';

      totalStudents++;
      if (isAlumni) {
        graduatedCount++;
      } else if (u.isActive) {
        if (p.student_status === 'suspended') {
          suspendedCount++;
        } else if (p.student_status === 'resigned') {
          resignedCount++;
        } else {
          activeCount++;
        }
      } else {
        if (p.student_status === 'resigned') {
          resignedCount++;
        } else if (p.student_status === 'suspended') {
          suspendedCount++;
        } else {
          inactiveCount++;
        }
      }
    });

    // Graduated by year
    const graduatedByYear = {};
    filteredProfiles.forEach(p => {
      const u = userMap[p.profile_id];
      if (!u) return;
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      const batch = match ? parseInt(match[1], 10) : null;
      const isAlumni = (batch !== null && batch < 66) || p.graduation_year !== null || u.role === 'alumni' || p.student_status === 'graduated';

      if (isAlumni) {
        let gradYear = p.graduation_year;
        if (!gradYear && batch) {
          gradYear = 2500 + batch + 4;
        }
        if (gradYear) {
          graduatedByYear[gradYear] = (graduatedByYear[gradYear] || 0) + 1;
        }
      }
    });

    const graduatedByYearArray = Object.entries(graduatedByYear)
      .map(([yr, count]) => ({ year: parseInt(yr, 10), count }))
      .sort((a, b) => a.year - b.year);

    // Students by year level (เฉพาะนักศึกษาปัจจุบัน รุ่น >= 66 ที่ยังคงสถานะ Active)
    const currentBE = new Date().getFullYear() + 543;
    const byYearLevel = {};
    filteredProfiles.forEach(p => {
      const u = userMap[p.profile_id];
      if (!u || !u.isActive) return;
      const match = p.profile_id && p.profile_id.match(/^(\d{2})/);
      const batch = match ? parseInt(match[1], 10) : null;
      if (batch && batch >= 66) {
        const entryBE = 2500 + batch;
        const yl = Math.max(1, currentBE - entryBE + 1);
        const key = yl <= 5 ? `ชั้นปีที่ ${yl}` : 'ชั้นปีที่ 5+';
        byYearLevel[key] = (byYearLevel[key] || 0) + 1;
      }
    });

    const byYearLevelArray = Object.entries(byYearLevel)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Get faculties and departments for filter options
    const faculties = await prisma.faculty.findMany({ select: { id: true, faculty_name: true } });
    const departments = await prisma.department.findMany({ 
      select: { id: true, department_id: true, department_name: true, faculty_id: true } 
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: totalStudents,
          active: activeCount,
          graduated: graduatedCount,
          inactive: inactiveCount,
          resigned: resignedCount,
          suspended: suspendedCount
        },
        graduatedByYear: graduatedByYearArray,
        byYearLevel: byYearLevelArray,
        filterOptions: {
          faculties: faculties.map(f => ({ id: f.id, name: f.faculty_name })),
          departments: departments.map(d => ({ id: d.department_id, name: d.department_name, faculty_id: d.faculty_id }))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student report:', error);
    res.status(500).json({ success: false, message: 'Error fetching student report', error: error.message });
  }
};

// @desc    Get project status report with filters
// @route   GET /api/dashboard/project-report
// @access  Private
exports.getProjectReport = async (req, res) => {
  try {
    const { year, status, advisor, faculty, department_id, type } = req.query;

    let where = {};
    if (year && year.trim() !== '') where.year = parseInt(year);
    if (status && status.trim() !== '') where.status = status.trim();
    if (type && type.trim() !== '') where.type = type.trim();
    if (advisor && advisor.trim() !== '') {
      where.advisor_profile_id = advisor.trim();
    }

    if (faculty && faculty.trim() !== '') {
      const fac = await prisma.faculty.findFirst({ where: { faculty_name: faculty.trim() } });
      if (fac) {
        where.createdBy = { ...(where.createdBy || {}), faculty_id: fac.id };
      } else {
        where.createdBy = { ...(where.createdBy || {}), faculty_id: -1 };
      }
    }

    if (department_id && department_id.trim() !== '') {
      const dept = await prisma.department.findFirst({
        where: { OR: [{ department_id: department_id.trim() }, { department_name: { contains: department_id.trim() } }] }
      });
      if (dept) {
        where.createdBy = { ...(where.createdBy || {}), department_id: dept.id };
      } else {
        where.createdBy = { ...(where.createdBy || {}), department_id: -1 };
      }
    }

    // Count by status
    const statusCounts = {};
    const statuses = ['draft', 'approved', 'in_progress', 'waiting_defense', 'passed_defense', 'completed'];
    
    for (const s of statuses) {
      statusCounts[s] = await prisma.project.count({
        where: { ...where, status: s }
      });
    }

    const totalProjects = await prisma.project.count({ where });

    // Projects by year
    const projectsByYear = await prisma.project.groupBy({
      by: ['year'],
      where,
      _count: { year: true },
      orderBy: { year: 'asc' }
    });

    const projectsByYearArray = projectsByYear.map(g => ({
      year: g.year,
      count: g._count.year
    }));

    // Get advisor list for filter
    const advisors = await prisma.profile.findMany({
      where: {
        projectsAsAdvisor: { some: {} }
      },
      select: { profile_id: true, firstname: true, lastname: true }
    });

    // Get faculties and departments for filter options
    const faculties = await prisma.faculty.findMany({ select: { id: true, faculty_name: true } });
    const departments = await prisma.department.findMany({ 
      select: { id: true, department_id: true, department_name: true, faculty_id: true } 
    });

    // Get available years for filter
    const availableYears = await prisma.project.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' }
    });

    res.json({
      success: true,
      data: {
        total: totalProjects,
        byStatus: statusCounts,
        byYear: projectsByYearArray,
        filterOptions: {
          advisors: advisors.map(a => ({ 
            id: a.profile_id, 
            name: `${a.firstname} ${a.lastname}`.trim() 
          })),
          years: availableYears.map(y => y.year),
          statuses: statuses,
          faculties: faculties.map(f => ({ id: f.id, name: f.faculty_name })),
          departments: departments.map(d => ({ id: d.department_id, name: d.department_name, faculty_id: d.faculty_id }))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project report:', error);
    res.status(500).json({ success: false, message: 'Error fetching project report', error: error.message });
  }
};
