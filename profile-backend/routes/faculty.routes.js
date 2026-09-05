const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');

// Public access
router.get('/', facultyController.getAllFaculties);

module.exports = router;
