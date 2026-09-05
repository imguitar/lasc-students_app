const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables BEFORE importing prismaClient
// so DATABASE_URL is available when PrismaClient is instantiated
dotenv.config();

const prisma = require('./prismaClient');

const app = express();

// CORS Configuration — ต้องอยู่ก่อนสุด เพื่อให้ preflight OPTIONS ตอบกลับเสมอ
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

const corsOptions = {
  origin: allowedOrigins
    ? function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : true, // ถ้าไม่ได้ตั้ง CORS_ORIGIN ให้สะท้อน origin กลับทุก domain (เหมือนเดิม)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Check DB Connection only — ไม่ seed ตอน boot เพื่อป้องกันข้อมูลหาย
// หากต้องการ seed ข้อมูลเริ่มต้น ให้รัน: npm run seed
prisma.$connect()
  .then(() => {
    console.log('✅ Connected to MySQL Database (Prisma)');
  })
  .catch((err) => console.error('❌ Database connection error:', err));

// Import Routes
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const alumniRoutes = require('./routes/alumni.routes');
const projectRoutes = require('./routes/project.routes');
const advisorRoutes = require('./routes/advisor.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const importExportRoutes = require('./routes/importExport.routes');
const scrapeRoutes = require('./routes/scrape.routes');
const departmentRoutes = require('./routes/department.routes');
const facultyRoutes = require('./routes/faculty.routes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/advisors', advisorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/data', importExportRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/faculties', facultyRoutes);

// Health check for the API and its database connection
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Student Database Management System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
