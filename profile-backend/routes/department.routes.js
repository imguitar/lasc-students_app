const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');
const { auth, authorize } = require('../middleware/auth');

// Public or low privilege access (anyone logged in can view departments)
router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartment);

// Admin only routes for managing departments
router.post('/', auth, authorize('admin'), departmentController.createDepartment);
router.put('/:id', auth, authorize('admin'), departmentController.updateDepartment);

module.exports = router;
