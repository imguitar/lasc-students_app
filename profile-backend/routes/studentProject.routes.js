const express = require('express');
const router = express.Router();
const studentProjectController = require('../controllers/studentProject.controller');
const { auth } = require('../middleware/auth');

router.get('/', auth, studentProjectController.getAllStudentProjects);

module.exports = router;
