const express = require('express');
const router = express.Router();
const newsEventController = require('../controllers/newsEvent.controller');
const { auth, authorize } = require('../middleware/auth');

// Public read for authenticated users (students, teachers, alumni see published; admin sees all)
router.get('/', auth, newsEventController.getAllNewsEvents);
router.get('/:id', auth, newsEventController.getNewsEventById);

// Management routes (Admin and Advisors)
router.post('/', auth, authorize('admin', 'advisor', 'teacher'), newsEventController.createNewsEvent);
router.put('/:id', auth, authorize('admin', 'advisor', 'teacher'), newsEventController.updateNewsEvent);
router.delete('/:id', auth, authorize('admin', 'advisor', 'teacher'), newsEventController.deleteNewsEvent);
router.patch('/:id/pin', auth, authorize('admin', 'advisor', 'teacher'), newsEventController.togglePin);
router.patch('/:id/publish', auth, authorize('admin', 'advisor', 'teacher'), newsEventController.togglePublish);

// Email notification routes (Admin only)
router.get('/:id/email-recipients', auth, authorize('admin'), newsEventController.getEventEmailRecipients);
router.post('/:id/send-email', auth, authorize('admin'), newsEventController.sendNewsEventEmailBatch);
router.get('/:id/email-history', auth, authorize('admin'), newsEventController.getNewsEventEmailHistory);
router.post('/:id/retry-failed-email', auth, authorize('admin'), newsEventController.retryFailedNewsEventEmail);

module.exports = router;

