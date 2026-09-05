const prisma = require('../prismaClient');

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
        faculty: true
      }
    });

    res.json({
      success: true,
      count: departments.length,
      data: departments.map(d => ({
        id: d.id,
        department_id: d.department_id,
        department_name: d.department_name,
        faculty_id: d.faculty_id,
        faculty_name: d.faculty ? d.faculty.faculty_name : null
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
        faculty: true
      }
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.json({
      success: true,
      data: {
        id: department.id,
        department_id: department.department_id,
        department_name: department.department_name,
        faculty_id: department.faculty_id,
        faculty_name: department.faculty ? department.faculty.faculty_name : null,
        is_active: department.is_active
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
