const express = require('express');
const router = express.Router();
const advisorController = require('../controllers/advisor.controller');
const { auth, authorize } = require('../middleware/auth');

router.get('/next-id/generate', auth, authorize('admin'), advisorController.getNextAdvisorId);
router.get('/', auth, advisorController.getAllAdvisors);
router.get('/:id', auth, advisorController.getAdvisor);
router.post('/', auth, authorize('admin'), advisorController.createAdvisor);
router.put('/:id', auth, authorize('admin'), advisorController.updateAdvisor);
router.delete('/:id', auth, authorize('admin'), advisorController.deleteAdvisor);

module.exports = router;
