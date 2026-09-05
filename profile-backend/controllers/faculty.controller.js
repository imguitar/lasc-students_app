const prisma = require('../prismaClient');

// @desc    Get all faculties
// @route   GET /api/faculties
// @access  Public
exports.getAllFaculties = async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    res.json({
      success: true,
      count: faculties.length,
      data: faculties
    });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching faculties',
      error: error.message
    });
  }
};
