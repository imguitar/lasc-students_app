const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, projectController.getAllProjects);
router.get('/student/:studentId', auth, projectController.getProjectsByStudent);
router.get('/:id', auth, projectController.getProject);
router.post('/', auth, authorize('admin', 'student', 'alumni', 'advisor'), projectController.createProject);
router.put('/:id', auth, authorize('admin', 'student', 'alumni', 'advisor'), projectController.updateProject);
router.delete('/:id', auth, authorize('admin'), projectController.deleteProject);

module.exports = router;
