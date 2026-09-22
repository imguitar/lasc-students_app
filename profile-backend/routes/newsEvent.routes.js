const express = require('express');
const router = express.Router();
const newsEventController = require('../controllers/newsEvent.controller');
const { auth, authorize } = require('../middleware/auth');

// Public read for authenticated users (students, teachers, alumni see published; admin sees all)
router.get('/', auth, newsEventController.getAllNewsEvents);
router.get('/:id', auth, newsEventController.getNewsEventById);

// Admin-only management routes
router.post('/', auth, authorize('admin'), newsEventController.createNewsEvent);
router.put('/:id', auth, authorize('admin'), newsEventController.updateNewsEvent);
router.delete('/:id', auth, authorize('admin'), newsEventController.deleteNewsEvent);
router.patch('/:id/pin', auth, authorize('admin'), newsEventController.togglePin);
router.patch('/:id/publish', auth, authorize('admin'), newsEventController.togglePublish);

module.exports = router;
