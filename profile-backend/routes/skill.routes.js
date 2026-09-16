const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skill.controller');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, skillController.getAllSkills);
router.post('/', auth, skillController.createSkill);
router.delete('/:id', auth, authorize('admin'), skillController.deleteSkill);

module.exports = router;
