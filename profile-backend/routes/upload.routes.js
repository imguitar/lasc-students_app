const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { auth } = require('../middleware/auth');

// Avatar upload & delete
router.post('/avatar', auth, uploadController.uploadAvatar);
router.delete('/avatar/:profileId', auth, uploadController.deleteAvatar);

// Project file upload, list & delete
router.post('/project-file/:projectId', auth, uploadController.uploadProjectFile);
router.get('/project-files/:projectId', auth, uploadController.getProjectFiles);
router.delete('/project-file/:fileId', auth, uploadController.deleteProjectFile);

// News & Events upload
router.post('/news-image', auth, uploadController.uploadNewsImage);
router.post('/news-attachment', auth, uploadController.uploadNewsAttachment);

module.exports = router;
