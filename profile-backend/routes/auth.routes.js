const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);

// ออกตั๋วเข้าระบบศูนย์ฝึก — ทุก role ที่ล็อกอินอยู่ใช้ได้
router.post('/sso-ticket', auth, authController.createSsoTicket);

module.exports = router;
