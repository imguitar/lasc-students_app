const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { auth } = require('../middleware/auth');

router.get('/stats', auth, dashboardController.getDashboardStats);
router.get('/alumni-by-faculty', auth, dashboardController.getAlumniByFaculty);
router.get('/alumni-by-year', auth, dashboardController.getAlumniByYear);
router.get('/students-by-faculty', auth, dashboardController.getStudentsByFaculty);
router.get('/recent-alumni', auth, dashboardController.getRecentAlumni);
router.get('/awarded-projects', auth, dashboardController.getAwardedProjects);
router.get('/student-report', auth, dashboardController.getStudentReport);
router.get('/project-report', auth, dashboardController.getProjectReport);

module.exports = router;
