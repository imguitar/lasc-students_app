const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { auth, authorize } = require('../middleware/auth');

// ทุก route ต้องผ่าน auth + admin role
router.post('/preview', auth, authorize('admin'), promotionController.previewPromotion);
router.post('/execute', auth, authorize('admin'), promotionController.executePromotion);
router.get('/history', auth, authorize('admin'), promotionController.getPromotionHistory);
router.get('/history/:id', auth, authorize('admin'), promotionController.getPromotionBatchDetail);
router.delete('/batch/:id', auth, authorize('admin'), promotionController.rollbackPromotionBatch);

module.exports = router;
