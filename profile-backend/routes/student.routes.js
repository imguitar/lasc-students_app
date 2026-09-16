const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { auth, authorize } = require('../middleware/auth');

// List students
router.get('/', auth, studentController.getAllStudents);

// Code lookup for autofill
router.get('/code/:student_id', auth, studentController.getStudentByCode);

// Resume endpoints
router.get('/:id/resume', auth, studentController.getResume);
router.put('/:id/resume', auth, studentController.updateResume);

// Student Skills
router.get('/:id/skills', auth, studentController.getStudentSkills);
router.post('/:id/skills', auth, studentController.addStudentSkill);
router.delete('/:id/skills/:skillId', auth, studentController.deleteStudentSkill);

// Student Internships
router.get('/:id/internships', auth, studentController.getStudentInternships);
router.post('/:id/internships', auth, studentController.createInternship);
router.put('/:id/internships/:internshipId', auth, studentController.updateInternship);
router.delete('/:id/internships/:internshipId', auth, studentController.deleteInternship);

// Student Semester Projects
router.get('/:id/projects', auth, studentController.getStudentProjects);
router.post('/:id/projects', auth, studentController.createStudentProject);
router.put('/:id/projects/:projectId', auth, studentController.updateStudentProject);
router.delete('/:id/projects/:projectId', auth, studentController.deleteStudentProject);

// Student details & base CRUD
router.get('/:id', auth, studentController.getStudent);
router.post('/', auth, authorize('admin'), studentController.createStudent);
router.put('/:id', auth, authorize('admin', 'student'), studentController.updateStudent);
router.delete('/:id', auth, authorize('admin'), studentController.deleteStudent);
router.post('/:id/promote', auth, authorize('admin'), studentController.promoteStudentToAlumni);

module.exports = router;
