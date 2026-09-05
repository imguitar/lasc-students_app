const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, studentController.getAllStudents);
router.get('/code/:student_id', auth, studentController.getStudentByCode);
router.get('/:id', auth, studentController.getStudent);
router.post('/', auth, authorize('admin'), studentController.createStudent);
router.put('/:id', auth, authorize('admin', 'student'), studentController.updateStudent);
router.delete('/:id', auth, authorize('admin'), studentController.deleteStudent);
router.post('/:id/promote', auth, authorize('admin'), studentController.promoteStudentToAlumni);

module.exports = router;
