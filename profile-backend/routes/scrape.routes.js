const express = require('express');
const router = express.Router();
const { previewFacultyStudents, previewAdvisors } = require('../controllers/scrape.controller');
const { auth } = require('../middleware/auth');

// GET /api/scrape/preview — ดึงรายชื่อนักศึกษาจากเว็บมหาลัย (Preview)
router.get('/preview', auth, previewFacultyStudents);

// GET /api/scrape/advisors/preview — ดึงรายชื่ออาจารย์จากเว็บ HRMS (Preview)
router.get('/advisors/preview', auth, previewAdvisors);

module.exports = router;
