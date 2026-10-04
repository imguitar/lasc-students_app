require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const requestRoutes = require('./routes/requestRoutes');
const publicRequestRoutes = require('./routes/publicRequestRoutes');
const { authenticate } = require('./middlewares/auth');
const checkinRoutes = require('./routes/checkinRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const companyRoutes = require('./routes/companyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const relocationRoutes = require('./routes/relocationRoutes');
const internshipRoundRoutes = require('./routes/internshipRoundRoutes');

// Import Cron
const initCronJobs = require('./cron/internshipCron');

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================
// Middlewares
// =============================================
// รองรับทั้ง localhost dev และ production domain — ตั้งเพิ่มได้ผ่าน CORS_ORIGIN (comma-separated)
// origin ไม่มี path จึง strip path ออกจาก FRONTEND_URL/COOP_PUBLIC_URL ก่อน (เช่น .../coop)
const toOrigin = (value) => {
  if (!value) return null;
  try {
    return new URL(String(value).trim()).origin;
  } catch (_) {
    return null;
  }
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  toOrigin(process.env.FRONTEND_URL),
  toOrigin(process.env.COOP_PUBLIC_URL),
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : []),
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files — รูปแบนเนอร์และไฟล์อัปโหลดอื่น ๆ (เช่น /uploads/banners/xxx.png)
// mount หลาย path เพื่อรองรับ nginx proxy_pass ทุกรูปแบบ:
//   /coop/api/ → backend /          → request มาที่ /uploads/...
//   /coop/api/ → backend /api/      → request มาที่ /api/uploads/...
//   proxy ส่ง URI เต็ม              → request มาที่ /coop/api/uploads/...
const uploadsDir = require('path').join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));
app.use('/coop/api/uploads', express.static(uploadsDir));

// =============================================
// Health Check
// =============================================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'API and Database are running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error in health check:', error.message);
    res.status(500).json({
      success: false,
      message: 'API is running but Database connection failed',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// Routes Registration
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', authenticate, requestRoutes);
app.use('/api/public/requests', publicRequestRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-proofs', paymentRoutes);
app.use('/api/public', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/internship', internshipRoutes);
app.use('/api/relocations', authenticate, relocationRoutes);
app.use('/api/public/relocations', relocationRoutes.publicRouter); // one-time link บริษัทเดิมลงนาม ไม่ต้อง login
app.use('/api', evaluationRoutes);
app.use('/api', internshipRoundRoutes);
app.use('/api', announcementRoutes);
app.use('/api', bannerRoutes);
app.use('/api', settingsRoutes);

// =============================================
// 404 & Error Handlers
// =============================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

// =============================================
// Cron Jobs
// =============================================
initCronJobs();

// =============================================
// Start Server
// =============================================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
