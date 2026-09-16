const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const { auth, authorize } = require('../middleware/auth');

// Public or low privilege access (anyone logged in can view departments)
router.get('/', departmentController.getAllDepartments);
// ต้องมาก่อน '/:id' ไม่อย่างนั้น 'stats' จะถูกจับเป็น id
router.get('/:id/stats', auth, departmentController.getDepartmentStats);
router.get('/:id', departmentController.getDepartment);

// Admin only routes for managing departments
router.post('/', auth, authorize('admin'), departmentController.createDepartment);
router.put('/:id/head', auth, authorize('admin'), departmentController.updateDepartmentHead);
router.put('/:id', auth, authorize('admin'), departmentController.updateDepartment);

module.exports = router;
