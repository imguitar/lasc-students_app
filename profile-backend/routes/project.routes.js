const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, projectController.getAllProjects);
router.get('/approval/pending', auth, authorize('admin', 'advisor', 'teacher'), projectController.getPendingApprovals);
router.get('/student/:studentId', auth, projectController.getProjectsByStudent);
router.get('/:id', auth, projectController.getProject);
router.post('/', auth, authorize('admin', 'student', 'alumni', 'advisor'), projectController.createProject);

// Approval Workflow Endpoints
router.post('/:id/submit-approval', auth, authorize('admin', 'student', 'alumni'), projectController.submitApproval);
router.post('/:id/approve', auth, authorize('admin', 'advisor', 'teacher'), projectController.approveProject);
router.post('/:id/reject', auth, authorize('admin', 'advisor', 'teacher'), projectController.rejectProject);

router.put('/:id/status', auth, authorize('admin', 'advisor', 'teacher', 'student', 'alumni'), projectController.updateProjectStatus);
router.put('/:id', auth, authorize('admin', 'student', 'alumni', 'advisor', 'teacher'), projectController.updateProject);
router.delete('/:id', auth, authorize('admin'), projectController.deleteProject);

module.exports = router;
