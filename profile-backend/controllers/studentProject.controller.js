const prisma = require('../prismaClient');

// @desc    Get all student semester projects across all students
// @route   GET /api/student-projects
// @access  Private
exports.getAllStudentProjects = async (req, res) => {
  try {
    const { academic_year, semester, category, department_id, search } = req.query;
    const where = {};

    if (academic_year && academic_year.trim() !== '') {
      where.academic_year = parseInt(academic_year, 10);
    }

    if (semester && semester.trim() !== '') {
      where.semester = parseInt(semester, 10);
    }

    if (category && category.trim() !== '') {
      where.category = category.trim();
    }

    if (department_id && department_id.trim() !== '') {
      where.profile = {
        OR: [
          { department: { department_id: department_id.trim() } },
          { department_id: parseInt(department_id) || -1 }
        ]
      };
    }

    // Only show published projects by default (unless admin explicitly requests all)
    const { is_published } = req.query;
    if (is_published !== undefined && is_published !== '') {
      where.is_published = is_published === 'true';
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { course_name: { contains: q } },
        { profile: { firstname: { contains: q } } },
        { profile: { lastname: { contains: q } } },
        { profile_id: { contains: q } }
      ];
    }

    const projects = await prisma.studentProject.findMany({
      where,
      include: {
        profile: {
          include: {
            faculty: true,
            department: true
          }
        },
        files: true
      },
      orderBy: [
        { academic_year: 'desc' },
        { semester: 'desc' },
        { created_at: 'desc' }
      ]
    });

    const formatted = projects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      academic_year: p.academic_year,
      semester: p.semester,
      course_name: p.course_name,
      technologies: p.technologies || [],
      github_url: p.github_url,
      demo_url: p.demo_url,
      image_url: p.image_url,
      document_url: p.document_url,
      link_url: p.link_url,
      status: p.status,
      skills_used: p.skills_used || [],
      internship_company: p.internship_company,
      is_published: p.is_published,
      year: p.year,
      files: p.files || [],
      created_at: p.created_at,
      student: {
        id: p.profile.id,
        student_id: p.profile.profile_id,
        name: `${p.profile.firstname} ${p.profile.lastname}`.trim(),
        faculty: p.profile.faculty?.faculty_name || '',
        department: p.profile.department?.department_name || '',
        department_id: p.profile.department?.department_id || ''
      }
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('Error in getAllStudentProjects:', error);
    res.status(500).json({ success: false, message: 'Error fetching student projects', error: error.message });
  }
};
