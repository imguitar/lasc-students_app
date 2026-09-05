const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const importExportController = require('../controllers/importExport.controller');
const { auth, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only CSV and Excel files are allowed'));
    }
    cb(null, true);
  }
});

// Import routes
router.post('/import/students', 
  auth, 
  authorize('admin'), 
  upload.single('file'), 
  importExportController.importStudents
);

router.post('/import/alumni', 
  auth, 
  authorize('admin'), 
  upload.single('file'), 
  importExportController.importAlumni
);

router.post('/import/advisors', 
  auth, 
  authorize('admin'), 
  upload.single('file'), 
  importExportController.importAdvisors
);

// Export routes
router.get('/export/students', 
  auth, 
  authorize('admin'), 
  importExportController.exportStudents
);

router.get('/export/alumni', 
  auth, 
  authorize('admin'), 
  importExportController.exportAlumni
);

router.get('/export/projects', 
  auth, 
  authorize('admin'), 
  importExportController.exportProjects
);

// Template download
router.get('/template/:type', 
  auth, 
  authorize('admin'), 
  importExportController.downloadTemplate
);

module.exports = router;
