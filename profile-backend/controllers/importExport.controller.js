const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const iconv = require('iconv-lite');
const { TextDecoder } = require('util');

// Helper to safely decode CSV stream from either UTF-8 or TIS-620
const getDecodedCSVStream = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  let decodedString;
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decodedString = decoder.decode(buffer);
  } catch (e) {
    // If decoding as UTF-8 fails, try TIS-620 (Windows-874)
    decodedString = iconv.decode(buffer, 'win874');
  }
  return Readable.from(decodedString);
};

// Helper to safely clean up uploaded file
const cleanupFile = (filePath) => {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
};

// @desc    Import students from CSV/Excel
// @route   POST /api/data/import/students
// @access  Private (Admin)
exports.importStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let students = [];

    if (ext === '.csv') {
      if (!fs.existsSync(filePath)) return res.status(400).json({ success: false, message: 'Uploaded file not found' });
      const results = [];
      try {
        const stream = getDecodedCSVStream(filePath);
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', async () => {
            try { await processStudentImport(results, res); } finally { cleanupFile(filePath); }
          })
          .on('error', (err) => { cleanupFile(filePath); if (!res.headersSent) res.status(500).json({ success: false, message: 'Error reading CSV' }); });
      } catch (err) {
        cleanupFile(filePath);
        return res.status(500).json({ success: false, message: 'Error reading CSV file content', error: err.message });
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      students = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      await processStudentImport(students, res);
      cleanupFile(filePath);
    } else {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: 'Invalid file format. Only CSV and Excel files are supported.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error importing students', error: error.message });
  }
};

const STUDENT_COLUMN_MAP = {
  'รหัสนักศึกษา': 'student_id', 'รหัส': 'student_id',
  'ชื่อ': 'first_name', 'ชื่อจริง': 'first_name',
  'นามสกุล': 'last_name', 'คณะ': 'faculty',
  'สาขา': 'department', 'สาขาวิชา': 'department',
  'ชั้นปี': 'year', 'ปี': 'year',
  'อีเมล': 'email', 'อีเมลล์': 'email',
  'เบอร์โทร': 'phone', 'เบอร์โทรศัพท์': 'phone', 'โทรศัพท์': 'phone',
  'สถานะ': 'status', 'studentid': 'student_id', 'student id': 'student_id',
  'firstname': 'first_name', 'first name': 'first_name',
  'lastname': 'last_name', 'last name': 'last_name',
};

function mapStudentColumns(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = key.trim();
    const mappedKey = STUDENT_COLUMN_MAP[trimmedKey] || STUDENT_COLUMN_MAP[trimmedKey.toLowerCase()] || trimmedKey;
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    if (cleanValue !== '' && cleanValue !== undefined && cleanValue !== null) {
      mapped[mappedKey] = cleanValue;
    }
  }
  if (mapped.year) mapped.year = parseInt(mapped.year, 10);
  return mapped;
}

async function processStudentImport(students, res) {
  const results = { success: [], errors: [] };
  for (const rawData of students) {
    try {
      const studentData = mapStudentColumns(rawData);
      await prisma.student.create({ data: studentData });
      results.success.push(studentData.student_id || 'N/A');
    } catch (error) {
      results.errors.push({ student_id: rawData.student_id || rawData['รหัสนักศึกษา'] || rawData['รหัส'] || 'ไม่ระบุ', error: error.message });
    }
  }
  res.json({ success: true, message: 'Import completed', data: { successCount: results.success.length, errorCount: results.errors.length, errors: results.errors } });
}

// @desc    Import alumni from CSV/Excel
// @route   POST /api/data/import/alumni
// @access  Private (Admin)
exports.importAlumni = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let alumni = [];

    if (ext === '.csv') {
      if (!fs.existsSync(filePath)) return res.status(400).json({ success: false, message: 'File not found' });
      const results = [];
      try {
        const stream = getDecodedCSVStream(filePath);
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', async () => {
            try { await processAlumniImport(results, res); } finally { cleanupFile(filePath); }
          })
          .on('error', (err) => { cleanupFile(filePath); if (!res.headersSent) res.status(500).json({ success: false, message: 'Error reading CSV' }); });
      } catch (err) {
        cleanupFile(filePath);
        return res.status(500).json({ success: false, message: 'Error reading CSV file content', error: err.message });
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      alumni = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      await processAlumniImport(alumni, res);
      cleanupFile(filePath);
    } else {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: 'Invalid file format' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error importing alumni', error: error.message });
  }
};

const ALUMNI_COLUMN_MAP = {
  'รหัสศิษย์เก่า': 'alumni_id', 'รหัส': 'alumni_id',
  'ชื่อ': 'first_name', 'นามสกุล': 'last_name',
  'คณะ': 'faculty', 'สาขาวิชา': 'department', 'สาขา': 'department',
  'ปีที่สำเร็จการศึกษา': 'graduation_year',
  'สถานที่ทำงาน': 'workplace', 'ตำแหน่ง': 'position',
  'อีเมล': 'email', 'เบอร์โทร': 'phone'
};

function mapAlumniColumns(row) {
  const mapped = { contact_info: {} };
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = key.trim();
    const mappedKey = ALUMNI_COLUMN_MAP[trimmedKey] || ALUMNI_COLUMN_MAP[trimmedKey.toLowerCase()] || trimmedKey;
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    if (cleanValue !== '' && cleanValue !== undefined && cleanValue !== null) {
      if (mappedKey === 'email') mapped.contact_info.email = cleanValue;
      else if (mappedKey === 'phone') mapped.contact_info.phone = cleanValue;
      else mapped[mappedKey] = cleanValue;
    }
  }
  if (mapped.graduation_year) mapped.graduation_year = parseInt(mapped.graduation_year, 10);
  return mapped;
}

async function processAlumniImport(alumniList, res) {
  const results = { success: [], errors: [] };
  for (const rawData of alumniList) {
    try {
      const alumniData = mapAlumniColumns(rawData);

      // Auto-create User account for alumni login
      if (alumniData.alumni_id) {
        const existingUser = await prisma.user.findUnique({ where: { username: alumniData.alumni_id } });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(alumniData.alumni_id, 10);
          const email = alumniData.contact_info?.email || `${alumniData.alumni_id}@alumni.local`;
          const existingEmail = await prisma.user.findUnique({ where: { email } });
          const finalEmail = existingEmail ? `${alumniData.alumni_id}_${Date.now()}@alumni.local` : email;

          const user = await prisma.user.create({
            data: {
              username: alumniData.alumni_id,
              email: finalEmail,
              password: hashedPassword,
              role: 'alumni',
              firstName: alumniData.first_name || alumniData.alumni_id,
              lastName: alumniData.last_name || '',
            }
          });
          alumniData.userId = user.id;
        } else {
          alumniData.userId = existingUser.id;
        }
      }

      await prisma.alumni.create({ data: alumniData });
      results.success.push(alumniData.alumni_id || 'N/A');
    } catch (error) {
      results.errors.push({ student_id: rawData.alumni_id || rawData['รหัสศิษย์เก่า'] || 'ไม่ระบุ', error: error.message });
    }
  }
  res.json({ success: true, message: 'Import completed', data: { successCount: results.success.length, errorCount: results.errors.length, errors: results.errors } });
}

// @desc    Import advisors from CSV/Excel
// @route   POST /api/data/import/advisors
// @access  Private (Admin)
exports.importAdvisors = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let advisors = [];

    if (ext === '.csv') {
      if (!fs.existsSync(filePath)) return res.status(400).json({ success: false, message: 'File not found' });
      const results = [];
      try {
        const stream = getDecodedCSVStream(filePath);
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', async () => {
            try { await processAdvisorImport(results, res); } finally { cleanupFile(filePath); }
          })
          .on('error', (err) => { cleanupFile(filePath); if (!res.headersSent) res.status(500).json({ success: false, message: 'Error reading CSV' }); });
      } catch (err) {
        cleanupFile(filePath);
        return res.status(500).json({ success: false, message: 'Error reading CSV file content', error: err.message });
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      advisors = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      await processAdvisorImport(advisors, res);
      cleanupFile(filePath);
    } else {
      cleanupFile(filePath);
      return res.status(400).json({ success: false, message: 'Invalid file format' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error importing advisors', error: error.message });
  }
};

const ADVISOR_COLUMN_MAP = {
  'รหัสอาจารย์': 'advisor_id', 'ชื่อ-นามสกุล': 'name', 'ชื่อ': 'name',
  'คณะ': 'faculty', 'สาขาวิชา': 'department',
  'อีเมล': 'email', 'เบอร์โทร': 'phone',
  'ความเชี่ยวชาญ': 'specialization'
};

function mapAdvisorColumns(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = key.trim();
    const mappedKey = ADVISOR_COLUMN_MAP[trimmedKey] || ADVISOR_COLUMN_MAP[trimmedKey.toLowerCase()] || trimmedKey;
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    if (cleanValue !== '' && cleanValue !== undefined && cleanValue !== null) {
      if (mappedKey === 'specialization') {
        mapped[mappedKey] = cleanValue.split(',').map(s => s.trim());
      } else {
        mapped[mappedKey] = cleanValue;
      }
    }
  }
  return mapped;
}

async function processAdvisorImport(advisorsList, res) {
  const results = { success: [], errors: [] };
  for (const rawData of advisorsList) {
    try {
      const advisorData = mapAdvisorColumns(rawData);
      await prisma.advisor.create({ data: advisorData });
      results.success.push(advisorData.advisor_id || 'N/A');
    } catch (error) {
      results.errors.push({ student_id: rawData.advisor_id || rawData['รหัสอาจารย์'] || 'ไม่ระบุ', error: error.message });
    }
  }
  res.json({ success: true, message: 'Import completed', data: { successCount: results.success.length, errorCount: results.errors.length, errors: results.errors } });
}

// @desc    Export students to CSV/Excel
// @route   GET /api/data/export/students
// @access  Private (Admin)
exports.exportStudents = async (req, res) => {
  try {
    const { format = 'csv', faculty, department, year, status } = req.query;
    let where = {};

    if (faculty) where.faculty = faculty;
    if (department) where.department = department;
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const students = await prisma.student.findMany({ where });

    if (format === 'csv') {
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(students);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('students.csv');
      return res.send('\ufeff' + csv);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(students);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('students.xlsx');
      return res.send(buffer);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid format. Use csv or xlsx.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting students', error: error.message });
  }
};

// @desc    Export alumni to CSV/Excel
// @route   GET /api/data/export/alumni
// @access  Private (Admin)
exports.exportAlumni = async (req, res) => {
  try {
    const { format = 'csv', faculty, department, graduation_year } = req.query;
    let where = {};

    if (faculty) where.faculty = faculty;
    if (department) where.department = department;
    if (graduation_year) where.graduation_year = parseInt(graduation_year);

    const alumni = await prisma.alumni.findMany({ where });

    if (format === 'csv') {
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(alumni);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('alumni.csv');
      return res.send('\ufeff' + csv);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(alumni);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumni');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('alumni.xlsx');
      return res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting alumni', error: error.message });
  }
};

// @desc    Export projects to CSV/Excel
// @route   GET /api/data/export/projects
// @access  Private (Admin)
exports.exportProjects = async (req, res) => {
  try {
    const { format = 'csv', year, faculty, department } = req.query;
    let where = {};

    if (year) where.year = parseInt(year);
    if (faculty) where.faculty = faculty;
    if (department) where.department = department;

    const projects = await prisma.graduateProject.findMany({
      where,
      include: {
        advisor: true,
        members: true
      }
    });

    const flattenedProjects = projects.map(project => ({
      ...project,
      advisor_name: project.advisor?.name,
      members_list: project.members?.map(m => `${m.first_name} ${m.last_name} (${m.student_id})`).join(', ')
    }));

    if (format === 'csv') {
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(flattenedProjects);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('projects.csv');
      return res.send('\ufeff' + csv);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(flattenedProjects);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('projects.xlsx');
      return res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting projects', error: error.message });
  }
};

// @desc    Download import template
// @route   GET /api/data/template/:type
// @access  Private (Admin)
exports.downloadTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'csv' } = req.query;

    let template = [];
    
    switch (type) {
      case 'students':
        template = [{ student_id: '6610014101', first_name: 'สมชาย', last_name: 'ใจดี', faculty: 'คณะศิลปศาสตร์และวิทยาศาสตร์', department: 'วิทยาการคอมพิวเตอร์', year: 3, email: 'stu6610014101@sskru.ac.th', phone: '0812345678', status: 'Active' }];
        break;
      case 'alumni':
        template = [{ alumni_id: 'AL12345678', first_name: 'สมหญิง', last_name: 'รักเรียน', faculty: 'คณะเทคโนโลยีสารสนเทศ', department: 'วิทยาการคอมพิวเตอร์', graduation_year: 2023, workplace: 'บริษัท ABC จำกัด', position: 'Software Engineer', employment_status: 'employed' }];
        break;
      case 'advisors':
        template = [{ advisor_id: 'A001', name: 'ผศ.ดร.สมชาย ใจดี', faculty: 'คณะเทคโนโลยีสารสนเทศ', department: 'วิทยาการคอมพิวเตอร์', email: 'somchai@university.ac.th', phone: '0899999991', specialization: 'AI/Machine Learning, Data Science' }];
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid template type' });
    }

    if (format === 'csv') {
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(template);
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`${type}_template.csv`);
      return res.send('\ufeff' + csv);
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`${type}_template.xlsx`);
      return res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating template', error: error.message });
  }
};
