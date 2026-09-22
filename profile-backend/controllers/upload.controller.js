const prisma = require('../prismaClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ============================================================
// Multer Configuration
// ============================================================

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure upload directories exist
['avatars', 'projects', 'news'].forEach(dir => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Allowed MIME types
const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PROJECT_FILE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Size limits
const AVATAR_MAX_SIZE = 5 * 1024 * 1024;       // 5 MB
const PROJECT_FILE_MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// Generate a safe unique filename
const generateFileName = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
};

// Sanitize original filename — strip path separators
const sanitizeOriginalName = (name) => {
  return name.replace(/[/\\]/g, '_').replace(/\.\./g, '_');
};

// Avatar storage
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'avatars')),
  filename: (req, file, cb) => cb(null, generateFileName(file.originalname))
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (AVATAR_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์ JPG, PNG, WebP เท่านั้น'));
    }
  }
}).single('avatar');

// Project file storage
const projectStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'projects')),
  filename: (req, file, cb) => cb(null, generateFileName(file.originalname))
});

const projectUpload = multer({
  storage: projectStorage,
  limits: { fileSize: PROJECT_FILE_MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (PROJECT_FILE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์ JPG, PNG, WebP, GIF, PDF, DOC, DOCX เท่านั้น'));
    }
  }
}).single('file');

// News image storage
const newsImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'news')),
  filename: (req, file, cb) => cb(null, generateFileName(file.originalname))
});

const newsImageUpload = multer({
  storage: newsImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ JPG, PNG, WebP, GIF เท่านั้น'));
    }
  }
}).single('image');

// News attachment storage
const newsAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'news')),
  filename: (req, file, cb) => cb(null, generateFileName(file.originalname))
});

const newsAttachmentUpload = multer({
  storage: newsAttachmentStorage,
  limits: { fileSize: 25 * 1024 * 1024 }
}).single('file');

// ============================================================
// Helper: Check ownership
// ============================================================

const isOwnerOrAdmin = (req, profileId) => {
  if (req.user.role === 'admin') return true;
  return req.user.username === profileId;
};

// ============================================================
// Controllers
// ============================================================

// @desc    Upload avatar image
// @route   POST /api/upload/avatar
// @access  Private (owner or admin)
exports.uploadAvatar = (req, res) => {
  avatarUpload(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์มีขนาดเกิน 5 MB' : err.message)
        : err.message;
      return res.status(400).json({ success: false, message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' });
    }

    try {
      const profileId = req.body.profile_id;
      if (!profileId) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'กรุณาระบุ profile_id' });
      }

      // Authorization check
      if (!isOwnerOrAdmin(req, profileId)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์เปลี่ยนรูปโปรไฟล์ของผู้อื่น' });
      }

      const profile = await prisma.profile.findUnique({
        where: { profile_id: profileId }
      });

      if (!profile) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'ไม่พบโปรไฟล์' });
      }

      // Delete old avatar file if exists
      if (profile.avatar_url && profile.avatar_url.startsWith('/uploads/avatars/')) {
        const oldPath = path.join(__dirname, '..', profile.avatar_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Save new avatar URL
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await prisma.profile.update({
        where: { profile_id: profileId },
        data: { avatar_url: avatarUrl }
      });

      res.json({
        success: true,
        message: 'อัปโหลดรูปโปรไฟล์สำเร็จ',
        data: { avatar_url: avatarUrl }
      });
    } catch (error) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error uploading avatar:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์', error: error.message });
    }
  });
};

// @desc    Delete avatar image
// @route   DELETE /api/upload/avatar/:profileId
// @access  Private (owner or admin)
exports.deleteAvatar = async (req, res) => {
  try {
    const profileId = req.params.profileId;

    if (!isOwnerOrAdmin(req, profileId)) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบรูปโปรไฟล์ของผู้อื่น' });
    }

    const profile = await prisma.profile.findUnique({
      where: { profile_id: profileId }
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'ไม่พบโปรไฟล์' });
    }

    // Delete file from disk
    if (profile.avatar_url && profile.avatar_url.startsWith('/uploads/avatars/')) {
      const filePath = path.join(__dirname, '..', profile.avatar_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Clear avatar_url in database
    await prisma.profile.update({
      where: { profile_id: profileId },
      data: { avatar_url: null }
    });

    res.json({ success: true, message: 'ลบรูปโปรไฟล์สำเร็จ' });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบรูปโปรไฟล์', error: error.message });
  }
};

// @desc    Upload project file
// @route   POST /api/upload/project-file/:projectId
// @access  Private (owner or admin)
exports.uploadProjectFile = (req, res) => {
  projectUpload(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? (err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์มีขนาดเกิน 20 MB' : err.message)
        : err.message;
      return res.status(400).json({ success: false, message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' });
    }

    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'projectId ไม่ถูกต้อง' });
      }

      // Check project exists and get owner
      const project = await prisma.studentProject.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'ไม่พบผลงาน' });
      }

      // Authorization check
      if (!isOwnerOrAdmin(req, project.profile_id)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์อัปโหลดไฟล์ให้ผลงานของผู้อื่น' });
      }

      const filePath = `/uploads/projects/${req.file.filename}`;

      // Create database record
      const fileRecord = await prisma.studentProjectFile.create({
        data: {
          project_id: projectId,
          file_name: req.file.filename,
          original_name: sanitizeOriginalName(req.file.originalname),
          file_type: req.file.mimetype,
          file_size: req.file.size,
          file_path: filePath
        }
      });

      res.status(201).json({
        success: true,
        message: 'อัปโหลดไฟล์สำเร็จ',
        data: fileRecord
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error uploading project file:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', error: error.message });
    }
  });
};

// @desc    Delete project file
// @route   DELETE /api/upload/project-file/:fileId
// @access  Private (owner or admin)
exports.deleteProjectFile = async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    if (isNaN(fileId)) {
      return res.status(400).json({ success: false, message: 'fileId ไม่ถูกต้อง' });
    }

    const fileRecord = await prisma.studentProjectFile.findUnique({
      where: { id: fileId },
      include: { project: true }
    });

    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์' });
    }

    // Authorization check
    if (!isOwnerOrAdmin(req, fileRecord.project.profile_id)) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ลบไฟล์ของผู้อื่น' });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', fileRecord.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.studentProjectFile.delete({ where: { id: fileId } });

    res.json({ success: true, message: 'ลบไฟล์สำเร็จ' });
  } catch (error) {
    console.error('Error deleting project file:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบไฟล์', error: error.message });
  }
};

// @desc    Get files for a project
// @route   GET /api/upload/project-files/:projectId
// @access  Private
exports.getProjectFiles = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ success: false, message: 'projectId ไม่ถูกต้อง' });
    }

    const files = await prisma.studentProjectFile.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching project files:', error);
    res.status(500).json({ success: false, message: 'Error fetching files', error: error.message });
  }
};

// @desc    Upload news image
// @route   POST /api/upload/news-image
// @access  Private
exports.uploadNewsImage = (req, res) => {
  newsImageUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' });
    }
    const relativePath = `/uploads/news/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      data: {
        file_path: relativePath,
        file_name: req.file.filename,
        original_name: sanitizeOriginalName(req.file.originalname),
        file_size: req.file.size
      }
    });
  });
};

// @desc    Upload news attachment
// @route   POST /api/upload/news-attachment
// @access  Private
exports.uploadNewsAttachment = (req, res) => {
  newsAttachmentUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์แนบ' });
    }
    const relativePath = `/uploads/news/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      data: {
        file_path: relativePath,
        file_name: req.file.filename,
        original_name: sanitizeOriginalName(req.file.originalname),
        file_size: req.file.size
      }
    });
  });
};
