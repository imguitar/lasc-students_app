const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagement.controller');
const { auth, authorize } = require('../middleware/auth');

// ทุก API ในโมดูลจัดการผู้ใช้งานอนุญาตเฉพาะผู้ใช้งานที่ผ่านการยืนยันตัวตน (auth) และมี Role เป็น 'admin' เท่านั้น
router.use(auth, authorize('admin'));

// สถิติสรุปสำหรับ Dashboard Cards
router.get('/stats', userManagementController.getStats);

// ประวัติการดำเนินการ (Audit Logs)
router.get('/audit-logs', userManagementController.getAuditLogs);

// ตรวจสอบ Username / Email ซ้ำ
router.get('/check-availability', userManagementController.checkAvailability);

// ดึงรายการผู้ใช้งานทั้งหมด (ค้นหา, กรอง, เรียงลำดับ, แบ่งหน้า)
router.get('/', userManagementController.getUsers);

// ดึงข้อมูลผู้ใช้งานรายบุคคลพร้อมข้อมูลความสัมพันธ์
router.get('/:id', userManagementController.getUserById);

// สร้างบัญชีผู้ใช้งานใหม่
router.post('/', userManagementController.createUser);

// แก้ไขข้อมูลผู้ใช้งานและสิทธิ์ (Role)
router.put('/:id', userManagementController.updateUser);

// เปิดใช้งาน / ระงับการใช้งานบัญชีชั่วคราว
router.patch('/:id/status', userManagementController.updateUserStatus);

// รีเซ็ตรหัสผ่านผู้ใช้งานอย่างปลอดภัย
router.post('/:id/reset-password', userManagementController.resetUserPassword);

// ลบบัญชีผู้ใช้งาน (รองรับ Soft Delete และการลบเฉพาะบัญชีโดยไม่ลบข้อมูลนักศึกษา/โครงงาน)
router.delete('/:id', userManagementController.deleteUser);

module.exports = router;

