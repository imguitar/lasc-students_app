const express = require('express');
const router = express.Router();
const alumniController = require('../controllers/alumni.controller');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, alumniController.getAllAlumni);
router.get('/:id', auth, alumniController.getAlumni);
router.post('/', auth, authorize('admin'), alumniController.createAlumni);
router.put('/:id', auth, authorize('admin', 'alumni'), alumniController.updateAlumni);
router.delete('/:id', auth, authorize('admin'), alumniController.deleteAlumni);

module.exports = router;
