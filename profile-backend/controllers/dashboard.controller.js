const prisma = require('../prismaClient');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Count total profiles (students + advisors + alumni all live in profile table)
    const totalProfiles = await prisma.profile.count();

    // Count total projects
    const totalProjects = await prisma.project.count();

    // Count awarded projects
    const awardedProjects = await prisma.project.count({
      where: { has_award: true }
    });

    // Count projects by status
    const draftProjects = await prisma.project.count({ where: { status: 'Draft' } });
    const approvedProjects = await prisma.project.count({ where: { status: 'Approved' } });
    const completedProjects = await prisma.project.count({ where: { status: 'Completed' } });

    // Count total faculties and departments
    const totalFaculties = await prisma.faculty.count();
    const totalDepartments = await prisma.department.count();

    res.json({
      success: true,
      data: {
        totalStudents: totalProfiles,   // profile คือ นักศึกษา/ศิษย์เก่า/อาจารย์
        activeStudents: totalProfiles,
        graduatedStudents: 0,
        graduationRate: 0,
        totalAlumni: 0,
        totalProjects,
        awardedProjects,
        totalFaculties,
        totalDepartments,
        projectsByStatus: {
          draft: draftProjects,
          approved: approvedProjects,
          completed: completedProjects
        },
        studentGender: { male: 0, female: 0 },
        alumniGender: { male: 0, female: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};

// @desc    Get alumni by faculty (ใช้ profile + faculty แทน)
// @route   GET /api/dashboard/alumni-by-faculty
// @access  Private
exports.getAlumniByFaculty = async (req, res) => {
  try {
    const grouped = await prisma.profile.groupBy({
      by: ['faculty_id'],
      _count: { faculty_id: true },
      orderBy: { _count: { faculty_id: 'desc' } }
    });

    // ดึงชื่อ faculty มาแนบ
    const faculties = await prisma.faculty.findMany();
    const facultyMap = {};
    faculties.forEach(f => { facultyMap[f.id] = f.faculty_name; });

    const result = grouped.map(g => ({
      faculty: facultyMap[g.faculty_id] || `คณะ ID ${g.faculty_id}`,
      count: g._count.faculty_id
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles by faculty',
      error: error.message
    });
  }
};

// @desc    Get alumni by graduation year → เปลี่ยนเป็น projects by year
// @route   GET /api/dashboard/alumni-by-year
// @access  Private
exports.getAlumniByYear = async (req, res) => {
  try {
    const grouped = await prisma.project.groupBy({
      by: ['year'],
      _count: { year: true },
      orderBy: { year: 'asc' }
    });

    const result = grouped.map(g => ({
      year: g.year,
      count: g._count.year
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching projects by year',
      error: error.message
    });
  }
};

// @desc    Get students by faculty → profile by faculty
// @route   GET /api/dashboard/students-by-faculty
// @access  Private
exports.getStudentsByFaculty = async (req, res) => {
  try {
    const grouped = await prisma.profile.groupBy({
      by: ['faculty_id'],
      _count: { faculty_id: true },
      orderBy: { _count: { faculty_id: 'desc' } }
    });

    const faculties = await prisma.faculty.findMany();
    const facultyMap = {};
    faculties.forEach(f => { facultyMap[f.id] = f.faculty_name; });

    const result = grouped.map(g => ({
      faculty: facultyMap[g.faculty_id] || `คณะ ID ${g.faculty_id}`,
      count: g._count.faculty_id
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profiles by faculty',
      error: error.message
    });
  }
};

// @desc    Get recent alumni → เปลี่ยนเป็น recent projects
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

    // Map ให้ตรงกับ format ที่ frontend ใช้
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
