const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// แปลงชื่อ Role จากฝั่ง UI/Request ให้ตรงกับ enum Role ในฐานข้อมูล ('admin' | 'advisor' | 'student' | 'alumni')
// โดยระบบเดิมใช้ 'advisor' แทน Teacher/อาจารย์
const normalizeRole = (roleInput) => {
  if (!roleInput || typeof roleInput !== 'string') return null;
  const r = roleInput.trim().toLowerCase();
  if (r === 'teacher' || r === 'advisor') return 'advisor';
  if (['admin', 'student', 'alumni'].includes(r)) return r;
  return null;
};

const getRoleDisplayName = (role) => {
  switch (role) {
    case 'admin':
      return 'Admin (ผู้ดูแลระบบ)';
    case 'advisor':
    case 'teacher':
      return 'Teacher (อาจารย์)';
    case 'student':
      return 'Student (นักศึกษา)';
    case 'alumni':
      return 'Alumni (ศิษย์เก่า)';
    default:
      return role;
  }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// สร้างรหัสผ่านเริ่มต้นที่ปลอดภัย (ความยาว 12 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ)
const generateSecurePassword = (length = 12) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!%*?&';
  const all = upper + lower + digits + special;

  const chars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    special[crypto.randomInt(0, special.length)]
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

// สร้างตาราง user_audit_logs อัตโนมัติหากยังไม่ได้รันไฟล์ migration ด้วยมือ
let auditTableEnsured = false;
const ensureAuditTable = async () => {
  if (auditTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`user_audit_logs\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`action\` VARCHAR(50) NOT NULL,
        \`actor_id\` INT DEFAULT NULL,
        \`actor_username\` VARCHAR(191) NOT NULL,
        \`actor_name\` VARCHAR(255) DEFAULT NULL,
        \`target_user_id\` INT DEFAULT NULL,
        \`target_username\` VARCHAR(191) NOT NULL,
        \`target_name\` VARCHAR(255) DEFAULT NULL,
        \`details\` JSON DEFAULT NULL,
        \`ip_address\` VARCHAR(64) DEFAULT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`idx_user_audit_logs_action\` (\`action\`),
        KEY \`idx_user_audit_logs_actor_id\` (\`actor_id\`),
        KEY \`idx_user_audit_logs_target_user_id\` (\`target_user_id\`),
        KEY \`idx_user_audit_logs_target_username\` (\`target_username\`),
        KEY \`idx_user_audit_logs_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    auditTableEnsured = true;
  } catch (err) {
    console.warn('Warning ensuring user_audit_logs table:', err.message);
  }
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.connection?.remoteAddress || '').slice(0, 64) || null;
};

// บันทึก Audit Log โดยไม่บันทึกรหัสผ่านหรือข้อมูลลับเด็ดขาด
const recordAuditLog = async (req, { action, targetUserId, targetUsername, targetName, details = {} }) => {
  try {
    await ensureAuditTable();

    // ลบ field ที่อาจเป็นรหัสผ่านออกเสมอเพื่อความปลอดภัยสูงสุด
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.newPassword;
    delete safeDetails.oldPassword;
    delete safeDetails.hashedPassword;

    const actorId = req.user?.id || null;
    const actorUsername = req.user?.username || 'admin';

    let actorName = actorUsername;
    if (actorUsername) {
      const actorProfile = await prisma.profile.findUnique({
        where: { profile_id: actorUsername },
        select: { prefix: true, firstname: true, lastname: true }
      });
      if (actorProfile) {
        actorName = `${actorProfile.prefix ? actorProfile.prefix + ' ' : ''}${actorProfile.firstname || ''} ${actorProfile.lastname || ''}`.trim() || actorUsername;
      }
    }

    const ipAddress = getClientIp(req);
    const detailsJson = JSON.stringify(safeDetails);

    await prisma.$executeRaw`
      INSERT INTO user_audit_logs
        (action, actor_id, actor_username, actor_name, target_user_id, target_username, target_name, details, ip_address, created_at)
      VALUES
        (${action}, ${actorId}, ${actorUsername}, ${actorName}, ${targetUserId || null}, ${targetUsername}, ${targetName || null}, ${detailsJson}, ${ipAddress}, NOW(3))
    `;
  } catch (err) {
    console.error('Error recording user audit log:', err.message);
  }
};

// ค้นหาหรือตั้งค่า Faculty และ Department เริ่มต้นสำหรับ Profile
const resolveFacultyAndDepartment = async ({ faculty_id, department_id, faculty_name, department_name }) => {
  let department = null;
  let faculty = null;

  if (department_id !== undefined && department_id !== null && String(department_id).trim() !== '') {
    const deptStr = String(department_id).trim();
    const deptNum = parseInt(deptStr, 10);
    if (!isNaN(deptNum)) {
      department = await prisma.department.findUnique({ where: { id: deptNum } });
    }
    if (!department) {
      department = await prisma.department.findUnique({ where: { department_id: deptStr } });
    }
  }

  if (!department && department_name && String(department_name).trim() !== '') {
    department = await prisma.department.findFirst({
      where: { department_name: String(department_name).trim() }
    });
    if (!department) {
      department = await prisma.department.findFirst({
        where: { department_name: { contains: String(department_name).trim() } }
      });
    }
  }

  if (department) {
    faculty = await prisma.faculty.findUnique({ where: { id: department.faculty_id } });
    return {
      facultyId: department.faculty_id,
      departmentId: department.id,
      facultyName: faculty?.faculty_name || '',
      departmentName: department.department_name || ''
    };
  }

  if (faculty_id !== undefined && faculty_id !== null && String(faculty_id).trim() !== '') {
    const facNum = parseInt(String(faculty_id).trim(), 10);
    if (!isNaN(facNum)) {
      faculty = await prisma.faculty.findUnique({ where: { id: facNum } });
    }
  }

  if (!faculty && faculty_name && String(faculty_name).trim() !== '') {
    faculty = await prisma.faculty.findFirst({
      where: { faculty_name: String(faculty_name).trim() }
    });
  }

  if (faculty) {
    const firstDept = await prisma.department.findFirst({
      where: { faculty_id: faculty.id },
      orderBy: { id: 'asc' }
    });
    if (firstDept) {
      return {
        facultyId: faculty.id,
        departmentId: firstDept.id,
        facultyName: faculty.faculty_name,
        departmentName: firstDept.department_name
      };
    }
  }

  // Fallback ไปยังคณะและสาขาแรกในระบบ (กรณี Admin ที่ไม่ได้เลือกสาขา แต่ต้องสร้างแถวใน profile เพื่อเก็บชื่อ-นามสกุล)
  const fallbackDept = await prisma.department.findFirst({
    include: { faculty: true },
    orderBy: { id: 'asc' }
  });

  if (fallbackDept) {
    return {
      facultyId: fallbackDept.faculty_id,
      departmentId: fallbackDept.id,
      facultyName: fallbackDept.faculty?.faculty_name || '',
      departmentName: fallbackDept.department_name || ''
    };
  }

  return { facultyId: null, departmentId: null, facultyName: '', departmentName: '' };
};

// @desc    Get summary statistics for User Management Dashboard Cards
// @route   GET /api/admin/users/stats
// @access  Private (Admin only)
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      adminCount,
      teacherCount,
      studentCount,
      alumniCount,
      suspendedCount,
      activeCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { role: 'advisor' } }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'alumni' } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { isActive: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        adminCount,
        teacherCount,
        advisorCount: teacherCount,
        studentCount,
        alumniCount,
        suspendedCount,
        activeCount
      }
    });
  } catch (error) {
    console.error('Error in getStats (User Management):', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลสถิติผู้ใช้งานได้',
      error: error.message
    });
  }
};

// @desc    Get paginated, filtered, and sorted list of all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    await ensureAuditTable();

    const {
      search = '',
      role = '',
      status = '',
      faculty_id = '',
      department_id = '',
      sortBy = 'username',
      sortOrder = 'asc',
      page = 1,
      limit = 15
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 15));

    // 1. ดึงข้อมูล User เบื้องต้นตามตัวกรอง role และ status
    const userWhere = {};
    if (role && role !== 'all') {
      const normalized = normalizeRole(role);
      if (normalized) {
        userWhere.role = normalized;
      }
    }

    if (status && status !== 'all') {
      if (status === 'active' || status === 'Active' || status === 'true') {
        userWhere.isActive = true;
      } else if (status === 'suspended' || status === 'inactive' || status === 'Inactive' || status === 'false') {
        userWhere.isActive = false;
      }
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // 2. ดึงข้อมูล Profile, Faculty, Department ทั้งหมดเพื่อ join กับ User
    const [faculties, departments, allProfiles] = await Promise.all([
      prisma.faculty.findMany(),
      prisma.department.findMany(),
      prisma.profile.findMany({
        select: {
          id: true,
          profile_id: true,
          prefix: true,
          firstname: true,
          lastname: true,
          first_name_en: true,
          last_name_en: true,
          faculty_id: true,
          department_id: true,
          phone: true,
          avatar_url: true,
          student_status: true,
          graduation_year: true
        }
      })
    ]);

    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f.id] = f.faculty_name;
    });

    const departmentMap = {};
    const headProfileIdToDept = {};
    departments.forEach((d) => {
      departmentMap[d.id] = d;
      if (d.department_head_id) {
        headProfileIdToDept[d.department_head_id] = d.department_name;
      }
    });

    const profileMap = {};
    allProfiles.forEach((p) => {
      profileMap[p.profile_id] = p;
    });

    // 3. ดึงข้อมูลผู้สร้างบัญชี (Creator) และสถานะบังคับเปลี่ยนรหัสผ่านจาก user_audit_logs
    let creatorMap = {};
    let forceResetMap = {};
    try {
      const createLogs = await prisma.$queryRaw`
        SELECT target_user_id, target_username, actor_username, actor_name, details, created_at
        FROM user_audit_logs
        WHERE action IN ('CREATE_USER', 'RESET_PASSWORD')
        ORDER BY created_at ASC
      `;
      if (Array.isArray(createLogs)) {
        createLogs.forEach((log) => {
          const key = log.target_user_id || log.target_username;
          if (log.action === 'CREATE_USER' || !creatorMap[key]) {
            if (!creatorMap[key] && log.actor_username) {
              creatorMap[log.target_user_id] = log.actor_name || log.actor_username;
              creatorMap[log.target_username] = log.actor_name || log.actor_username;
            }
          }
          let parsedDetails = log.details;
          if (typeof parsedDetails === 'string') {
            try {
              parsedDetails = JSON.parse(parsedDetails);
            } catch (_) {
              parsedDetails = {};
            }
          }
          if (parsedDetails && parsedDetails.mustChangePassword !== undefined) {
            forceResetMap[log.target_user_id] = !!parsedDetails.mustChangePassword;
          }
        });
      }
    } catch (_) {
      // หากยังไม่มีตารางหรือคิวรีไม่สำเร็จ ให้ข้ามอย่างปลอดภัย
    }

    // 4. รวมข้อมูล User + Profile
    let combined = users.map((u) => {
      const profile = profileMap[u.username] || null;
      const deptObj = profile ? departmentMap[profile.department_id] : null;
      const facultyName = profile ? (facultyMap[profile.faculty_id] || '') : '';
      const departmentName = deptObj ? deptObj.department_name : '';

      const firstName = profile?.firstname || '';
      const lastName = profile?.lastname || '';
      const prefix = profile?.prefix || '';
      const fullName = `${prefix ? prefix + ' ' : ''}${firstName} ${lastName}`.trim() || u.username;

      // รหัสนักศึกษา (แสดงเมื่อเป็นนักศึกษา/ศิษย์เก่า หรือรหัสตัวเลข)
      const isStudentOrAlumni = u.role === 'student' || u.role === 'alumni';
      const studentId = isStudentOrAlumni ? (profile?.profile_id || u.username) : (profile?.profile_id || '');

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        role_label: getRoleDisplayName(u.role),
        isActive: u.isActive,
        status: u.isActive ? 'active' : 'suspended',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        created_by: creatorMap[u.id] || creatorMap[u.username] || 'ระบบ / นำเข้าข้อมูล',
        must_change_password: !!forceResetMap[u.id],
        profile_id: profile?.id || null,
        student_id: studentId,
        prefix,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: profile?.phone || '',
        avatar_url: profile?.avatar_url || '',
        faculty_id: profile?.faculty_id || null,
        faculty_name: u.role === 'admin' && !profile ? '-' : facultyName,
        department_id: profile?.department_id || null,
        department_code: deptObj?.department_id || '',
        department_name: u.role === 'admin' && !profile ? '-' : departmentName,
        student_status: profile?.student_status || null,
        graduation_year: profile?.graduation_year || null,
        is_department_head: profile ? !!headProfileIdToDept[profile.id] : false,
        head_of_department: profile ? (headProfileIdToDept[profile.id] || null) : null
      };
    });

    // 5. กรองตามคณะ / สาขาวิชา
    if (faculty_id && String(faculty_id).trim() !== '' && faculty_id !== 'all') {
      const facStr = String(faculty_id).trim();
      combined = combined.filter(
        (item) => String(item.faculty_id) === facStr || item.faculty_name === facStr
      );
    }

    if (department_id && String(department_id).trim() !== '' && department_id !== 'all') {
      const deptStr = String(department_id).trim();
      combined = combined.filter(
        (item) =>
          String(item.department_id) === deptStr ||
          item.department_code === deptStr ||
          item.department_name === deptStr
      );
    }

    // 6. ค้นหาจากชื่อ, นามสกุล, Username, Email, รหัสนักศึกษา
    if (search && String(search).trim() !== '') {
      const q = String(search).trim().toLowerCase();
      combined = combined.filter(
        (item) =>
          (item.full_name && item.full_name.toLowerCase().includes(q)) ||
          (item.first_name && item.first_name.toLowerCase().includes(q)) ||
          (item.last_name && item.last_name.toLowerCase().includes(q)) ||
          (item.username && item.username.toLowerCase().includes(q)) ||
          (item.email && item.email.toLowerCase().includes(q)) ||
          (item.student_id && item.student_id.toLowerCase().includes(q)) ||
          (item.department_name && item.department_name.toLowerCase().includes(q))
      );
    }

    // 7. เรียงลำดับข้อมูล (Sorting)
    const dir = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    combined.sort((a, b) => {
      switch (sortBy) {
        case 'name':
        case 'full_name':
          return a.full_name.localeCompare(b.full_name, 'th') * dir;
        case 'username':
          return String(a.username || '').localeCompare(String(b.username || ''), undefined, { numeric: true }) * dir;
        case 'email':
          return a.email.localeCompare(b.email) * dir;
        case 'role':
          return a.role.localeCompare(b.role) * dir;
        case 'status':
        case 'isActive':
          return ((a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1)) * dir;
        case 'department':
          return (a.department_name || '').localeCompare(b.department_name || '', 'th') * dir;
        case 'createdAt':
        default: {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA !== timeB) return (timeA - timeB) * dir;
          return (a.id - b.id) * dir;
        }
      }
    });

    // 8. แบ่งหน้า (Pagination)
    const totalItems = combined.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limitNum));
    const safePage = Math.min(pageNum, totalPages);
    const startIndex = (safePage - 1) * limitNum;
    const paginatedItems = combined.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        totalItems,
        totalPages,
        currentPage: safePage,
        limit: limitNum,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1
      }
    });
  } catch (error) {
    console.error('Error in getUsers (User Management):', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงรายการผู้ใช้งานได้',
      error: error.message
    });
  }
};

// @desc    Check if username or email is available
// @route   GET /api/admin/users/check-availability
// @access  Private (Admin only)
exports.checkAvailability = async (req, res) => {
  try {
    const { username, email, excludeUserId } = req.query;
    const excludeId = excludeUserId ? parseInt(excludeUserId, 10) : null;

    let usernameTaken = false;
    let emailTaken = false;

    if (username && String(username).trim() !== '') {
      const existing = await prisma.user.findFirst({
        where: {
          username: String(username).trim(),
          ...(excludeId ? { NOT: { id: excludeId } } : {})
        },
        select: { id: true }
      });
      usernameTaken = !!existing;
    }

    if (email && String(email).trim() !== '') {
      const existing = await prisma.user.findFirst({
        where: {
          email: String(email).trim(),
          ...(excludeId ? { NOT: { id: excludeId } } : {})
        },
        select: { id: true }
      });
      emailTaken = !!existing;
    }

    res.json({
      success: true,
      data: {
        usernameAvailable: !usernameTaken,
        emailAvailable: !emailTaken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถตรวจสอบข้อมูลซ้ำได้',
      error: error.message
    });
  }
};

// @desc    Get single user details including relational impact before deletion
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
exports.getUserById = async (req, res) => {
  try {
    await ensureAuditTable();
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
    }

    const profile = await prisma.profile.findUnique({
      where: { profile_id: user.username },
      include: {
        faculty: true,
        department: true
      }
    });

    // ตรวจสอบความสัมพันธ์กับข้อมูลอื่นในระบบ (เพื่อป้องกันการลบข้อมูลนักศึกษา/โครงงาน/ผลงานโดยไม่ตั้งใจ)
    const [
      projectsCreatedCount,
      projectMembershipsCount,
      projectAdvisingCount,
      studentProjectsCount,
      internshipsCount,
      employmentsCount,
      newsEventsCount,
      promotionBatchesCount
    ] = await Promise.all([
      prisma.project.count({ where: { created_by_profile_id: user.username } }),
      prisma.projectMember.count({ where: { profile_id: user.username } }),
      prisma.project.count({ where: { advisor_profile_id: user.username } }),
      prisma.studentProject.count({ where: { profile_id: user.username } }),
      prisma.internship.count({ where: { profile_id: user.username } }),
      prisma.alumniEmployment.count({ where: { profile_id: user.username } }),
      prisma.newsEvent.count({ where: { created_by: user.id } }),
      prisma.promotionBatch.count({ where: { created_by: user.id } })
    ]);

    const totalRelatedRecords =
      projectsCreatedCount +
      projectMembershipsCount +
      projectAdvisingCount +
      studentProjectsCount +
      internshipsCount +
      employmentsCount +
      newsEventsCount +
      promotionBatchesCount;

    let auditHistory = [];
    try {
      auditHistory = await prisma.$queryRaw`
        SELECT id, action, actor_id, actor_username, actor_name, target_user_id, target_username, target_name, details, ip_address, created_at
        FROM user_audit_logs
        WHERE target_user_id = ${user.id} OR target_username = ${user.username}
        ORDER BY created_at DESC
        LIMIT 20
      `;
    } catch (_) {
      auditHistory = [];
    }

    res.json({
      success: true,
      data: {
        ...user,
        role_label: getRoleDisplayName(user.role),
        profile,
        relations: {
          hasProfile: !!profile,
          projectsCreatedCount,
          projectMembershipsCount,
          projectAdvisingCount,
          studentProjectsCount,
          internshipsCount,
          employmentsCount,
          newsEventsCount,
          promotionBatchesCount,
          totalRelatedRecords
        },
        auditHistory
      }
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้',
      error: error.message
    });
  }
};

// @desc    Create a new user account (Admin, Teacher/Advisor, Student, Alumni)
// @route   POST /api/admin/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
  try {
    const {
      prefix = '',
      first_name = '',
      last_name = '',
      username = '',
      email = '',
      student_id = '',
      role = 'student',
      faculty_id,
      department_id,
      faculty_name,
      department_name,
      phone = '',
      password = '',
      auto_generate_password = false,
      must_change_password = true,
      graduation_year
    } = req.body;

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      return res.status(400).json({
        success: false,
        message: 'ประเภทผู้ใช้งาน (Role) ไม่ถูกต้อง กรุณาเลือก Admin, Teacher, Student หรือ Alumni'
      });
    }

    const cleanFirstName = String(first_name || '').trim();
    const cleanLastName = String(last_name || '').trim();
    const cleanPrefix = String(prefix || '').trim();
    const cleanStudentId = String(student_id || '').trim();
    const cleanUsername = String(username || cleanStudentId || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanPhone = String(phone || '').trim();

    if (!cleanFirstName || !cleanLastName) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อและนามสกุลให้ครบถ้วน'
      });
    }

    if (!cleanUsername) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอก Username'
      });
    }

    if (cleanUsername.length > 13 && normalizedRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Username / รหัสประจำตัว สำหรับนักศึกษา ศิษย์เก่า และอาจารย์ ต้องมีความยาวไม่เกิน 13 ตัวอักษร'
      });
    }

    if ((normalizedRole === 'student' || normalizedRole === 'alumni') && !cleanStudentId && !cleanUsername) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรหัสนักศึกษา'
      });
    }

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'รูปแบบอีเมลไม่ถูกต้อง'
      });
    }

    // ตรวจสอบคณะและสาขาวิชาสำหรับ Teacher, Student, Alumni
    if (['advisor', 'student', 'alumni'].includes(normalizedRole)) {
      if (!department_id && !department_name) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกคณะและสาขาวิชาสำหรับผู้ใช้งานประเภทนี้'
        });
      }
    }

    // ตรวจสอบ Username และ Email ซ้ำในระบบ
    const [existingByUsername, existingByEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username: cleanUsername } }),
      prisma.user.findUnique({ where: { email: cleanEmail } })
    ]);

    if (existingByUsername) {
      return res.status(400).json({
        success: false,
        message: `Username "${cleanUsername}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่อผู้ใช้อื่น`,
        field: 'username'
      });
    }

    if (existingByEmail) {
      return res.status(400).json({
        success: false,
        message: `อีเมล "${cleanEmail}" มีอยู่ในระบบแล้ว กรุณาใช้อีเมลอื่น`,
        field: 'email'
      });
    }

    // กำหนดรหัสผ่านและเข้ารหัสด้วย bcrypt
    const rawPassword = auto_generate_password
      ? generateSecurePassword(12)
      : String(password || '').trim();

    if (!rawPassword || rawPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // หา faculty_id และ department_id ที่ถูกต้อง
    const { facultyId, departmentId, facultyName, departmentName } = await resolveFacultyAndDepartment({
      faculty_id,
      department_id,
      faculty_name,
      department_name
    });

    const profileCode = (cleanStudentId || cleanUsername).slice(0, 13);

    // สร้าง User และ Profile ภายใต้ Transaction เดียวกัน
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          password: hashedPassword,
          role: normalizedRole,
          isActive: true
        }
      });

      let newProfile = null;
      if (facultyId && departmentId && profileCode.length <= 13) {
        let gradYear = graduation_year ? parseInt(graduation_year, 10) : null;
        if (!gradYear && normalizedRole === 'alumni' && /^\d{2}/.test(profileCode)) {
          gradYear = 2500 + parseInt(profileCode.substring(0, 2), 10) + 4;
        }

        newProfile = await tx.profile.upsert({
          where: { profile_id: profileCode },
          update: {
            prefix: cleanPrefix || undefined,
            firstname: cleanFirstName,
            lastname: cleanLastName,
            faculty_id: facultyId,
            department_id: departmentId,
            phone: cleanPhone || undefined,
            student_status: normalizedRole === 'alumni' ? 'graduated' : 'active',
            ...(gradYear ? { graduation_year: gradYear } : {})
          },
          create: {
            profile_id: profileCode,
            prefix: cleanPrefix || null,
            firstname: cleanFirstName,
            lastname: cleanLastName,
            faculty_id: facultyId,
            department_id: departmentId,
            phone: cleanPhone || null,
            student_status: normalizedRole === 'alumni' ? 'graduated' : 'active',
            graduation_year: gradYear
          }
        });
      }

      return { newUser, newProfile };
    });

    const fullName = `${cleanPrefix ? cleanPrefix + ' ' : ''}${cleanFirstName} ${cleanLastName}`.trim();

    await recordAuditLog(req, {
      action: 'CREATE_USER',
      targetUserId: result.newUser.id,
      targetUsername: result.newUser.username,
      targetName: fullName,
      details: {
        role: normalizedRole,
        roleLabel: getRoleDisplayName(normalizedRole),
        email: cleanEmail,
        faculty: facultyName,
        department: departmentName,
        mustChangePassword: !!must_change_password,
        autoGeneratedPassword: !!auto_generate_password
      }
    });

    res.status(201).json({
      success: true,
      message: 'สร้างบัญชีผู้ใช้งานสำเร็จ',
      data: {
        id: result.newUser.id,
        username: result.newUser.username,
        email: result.newUser.email,
        role: result.newUser.role,
        role_label: getRoleDisplayName(result.newUser.role),
        isActive: result.newUser.isActive,
        full_name: fullName,
        faculty_name: facultyName,
        department_name: departmentName,
        // ส่งรหัสผ่านเริ่มต้นกลับเฉพาะตอนสร้างบัญชีเมื่อสั่งสุ่มรหัสผ่านเพื่อให้ Admin นำไปแจ้งผู้ใช้ได้
        generatedPassword: auto_generate_password ? rawPassword : null
      }
    });
  } catch (error) {
    console.error('Error in createUser (User Management):', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูล Username, Email หรือรหัสประจำตัวซ้ำกับข้อมูลที่มีอยู่ในระบบ'
      });
    }
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้งาน',
      error: error.message
    });
  }
};

// @desc    Update user account and profile details
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
    }

    const {
      prefix,
      first_name,
      last_name,
      username,
      email,
      role,
      faculty_id,
      department_id,
      faculty_name,
      department_name,
      phone,
      isActive
    } = req.body;

    const changes = {};
    const userUpdateData = {};

    // 1. ตรวจสอบการแก้ไข Email
    if (email !== undefined) {
      const cleanEmail = String(email).trim();
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'รูปแบบอีเมลไม่ถูกต้อง' });
      }
      if (cleanEmail !== existingUser.email) {
        const duplicateEmail = await prisma.user.findFirst({
          where: { email: cleanEmail, NOT: { id: targetId } }
        });
        if (duplicateEmail) {
          return res.status(400).json({
            success: false,
            message: `อีเมล "${cleanEmail}" ถูกใช้งานโดยบัญชีอื่นแล้ว`,
            field: 'email'
          });
        }
        userUpdateData.email = cleanEmail;
        changes.email = { from: existingUser.email, to: cleanEmail };
      }
    }

    // 2. ตรวจสอบการแก้ไข Username
    let newUsername = existingUser.username;
    if (username !== undefined && String(username).trim() !== '' && String(username).trim() !== existingUser.username) {
      const cleanUsername = String(username).trim();
      if (cleanUsername.length > 13 && (role || existingUser.role) !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Username / รหัสประจำตัวต้องไม่เกิน 13 ตัวอักษร'
        });
      }
      const duplicateUser = await prisma.user.findFirst({
        where: { username: cleanUsername, NOT: { id: targetId } }
      });
      if (duplicateUser) {
        return res.status(400).json({
          success: false,
          message: `Username "${cleanUsername}" ถูกใช้งานโดยบัญชีอื่นแล้ว`,
          field: 'username'
        });
      }
      userUpdateData.username = cleanUsername;
      newUsername = cleanUsername;
      changes.username = { from: existingUser.username, to: cleanUsername };
    }

    // 3. ตรวจสอบการแก้ไข Role
    let roleChanged = false;
    let targetRole = existingUser.role;
    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) {
        return res.status(400).json({ success: false, message: 'Role ที่ระบุไม่ถูกต้อง' });
      }

      if (normalizedRole !== existingUser.role) {
        // ป้องกัน Admin เปลี่ยน Role ตัวเองออกจาก Admin
        if (req.user.id === existingUser.id && normalizedRole !== 'admin') {
          return res.status(400).json({
            success: false,
            message: 'ไม่อนุญาตให้ลดสิทธิ์ (Role) ของบัญชีตัวเองเพื่อป้องกันการสูญเสียสิทธิ์ผู้ดูแลระบบ'
          });
        }

        // ป้องกันการเปลี่ยน Role ของ Admin คนสุดท้ายในระบบ
        if (existingUser.role === 'admin' && normalizedRole !== 'admin') {
          const activeAdminCount = await prisma.user.count({
            where: { role: 'admin', isActive: true, NOT: { id: existingUser.id } }
          });
          if (activeAdminCount === 0) {
            return res.status(400).json({
              success: false,
              message: 'ไม่สามารถเปลี่ยน Role ของผู้ดูแลระบบ (Admin) คนสุดท้ายที่เปิดใช้งานอยู่ได้'
            });
          }
        }

        userUpdateData.role = normalizedRole;
        targetRole = normalizedRole;
        roleChanged = true;
        changes.role = { from: existingUser.role, to: normalizedRole };
      }
    }

    // 4. ตรวจสอบการแก้ไขสถานะบัญชี (ถ้าส่งมาพร้อมกัน)
    if (isActive !== undefined && Boolean(isActive) !== existingUser.isActive) {
      const nextActive = Boolean(isActive);
      if (!nextActive && req.user.id === existingUser.id) {
        return res.status(400).json({
          success: false,
          message: 'ไม่อนุญาตให้ระงับบัญชีของตัวเอง'
        });
      }
      if (!nextActive && existingUser.role === 'admin') {
        const otherActiveAdmins = await prisma.user.count({
          where: { role: 'admin', isActive: true, NOT: { id: existingUser.id } }
        });
        if (otherActiveAdmins === 0) {
          return res.status(400).json({
            success: false,
            message: 'ไม่สามารถระงับบัญชีผู้ดูแลระบบ (Admin) คนสุดท้ายได้'
          });
        }
      }
      userUpdateData.isActive = nextActive;
      changes.isActive = { from: existingUser.isActive, to: nextActive };
    }

    // 5. จัดการข้อมูล Profile
    const existingProfile = await prisma.profile.findUnique({
      where: { profile_id: existingUser.username }
    });

    const { facultyId, departmentId, facultyName, departmentName } = await resolveFacultyAndDepartment({
      faculty_id: faculty_id !== undefined ? faculty_id : existingProfile?.faculty_id,
      department_id: department_id !== undefined ? department_id : existingProfile?.department_id,
      faculty_name,
      department_name
    });

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: targetId },
          data: userUpdateData
        });
      }

      if (existingProfile) {
        const profileUpdateData = {};
        if (newUsername !== existingUser.username && newUsername.length <= 13) {
          profileUpdateData.profile_id = newUsername;
        }
        if (prefix !== undefined) profileUpdateData.prefix = String(prefix).trim() || null;
        if (first_name !== undefined && String(first_name).trim() !== '') {
          profileUpdateData.firstname = String(first_name).trim();
          if (existingProfile.firstname !== profileUpdateData.firstname) {
            changes.first_name = { from: existingProfile.firstname, to: profileUpdateData.firstname };
          }
        }
        if (last_name !== undefined && String(last_name).trim() !== '') {
          profileUpdateData.lastname = String(last_name).trim();
          if (existingProfile.lastname !== profileUpdateData.lastname) {
            changes.last_name = { from: existingProfile.lastname, to: profileUpdateData.lastname };
          }
        }
        if (phone !== undefined) {
          profileUpdateData.phone = String(phone).trim() || null;
        }
        if (facultyId && facultyId !== existingProfile.faculty_id) {
          profileUpdateData.faculty_id = facultyId;
          changes.faculty = { to: facultyName };
        }
        if (departmentId && departmentId !== existingProfile.department_id) {
          profileUpdateData.department_id = departmentId;
          changes.department = { to: departmentName };
        }
        if (roleChanged) {
          if (targetRole === 'alumni') {
            profileUpdateData.student_status = 'graduated';
          } else if (targetRole === 'student') {
            profileUpdateData.student_status = 'active';
          }
        }

        if (Object.keys(profileUpdateData).length > 0) {
          await tx.profile.update({
            where: { id: existingProfile.id },
            data: profileUpdateData
          });
        }
      } else if ((first_name || last_name) && facultyId && departmentId && newUsername.length <= 13) {
        await tx.profile.create({
          data: {
            profile_id: newUsername,
            prefix: prefix ? String(prefix).trim() : null,
            firstname: String(first_name || '').trim(),
            lastname: String(last_name || '').trim(),
            faculty_id: facultyId,
            department_id: departmentId,
            phone: phone ? String(phone).trim() : null,
            student_status: targetRole === 'alumni' ? 'graduated' : 'active'
          }
        });
        changes.profileCreated = true;
      }
    });

    const updatedProfile = await prisma.profile.findUnique({
      where: { profile_id: newUsername }
    });
    const targetFullName = updatedProfile
      ? `${updatedProfile.prefix ? updatedProfile.prefix + ' ' : ''}${updatedProfile.firstname || ''} ${updatedProfile.lastname || ''}`.trim()
      : newUsername;

    await recordAuditLog(req, {
      action: roleChanged ? 'CHANGE_ROLE' : 'UPDATE_USER',
      targetUserId: targetId,
      targetUsername: newUsername,
      targetName: targetFullName,
      details: {
        changes,
        ...(roleChanged
          ? {
              oldRole: existingUser.role,
              newRole: targetRole,
              oldRoleLabel: getRoleDisplayName(existingUser.role),
              newRoleLabel: getRoleDisplayName(targetRole)
            }
          : {})
      }
    });

    res.json({
      success: true,
      message: 'บันทึกการแก้ไขข้อมูลผู้ใช้งานสำเร็จ',
      data: {
        id: targetId,
        username: newUsername,
        email: userUpdateData.email || existingUser.email,
        role: targetRole,
        role_label: getRoleDisplayName(targetRole),
        isActive: userUpdateData.isActive !== undefined ? userUpdateData.isActive : existingUser.isActive,
        full_name: targetFullName
      }
    });
  } catch (error) {
    console.error('Error in updateUser (User Management):', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้งาน',
      error: error.message
    });
  }
};

// @desc    Activate or Suspend user account
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
exports.updateUserStatus = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });
    }

    const { isActive, reason = '' } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสถานะ isActive (true หรือ false)' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
    }

    // ป้องกัน Admin ระงับบัญชีตัวเองโดยไม่ตั้งใจ
    if (!isActive && req.user.id === targetUser.id) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถระงับบัญชีผู้ใช้งานของตัวเองได้'
      });
    }

    // ป้องกันการระงับบัญชี Admin คนสุดท้ายในระบบ
    if (!isActive && targetUser.role === 'admin') {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: 'admin', isActive: true, NOT: { id: targetUser.id } }
      });
      if (otherActiveAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถระงับบัญชีผู้ดูแลระบบ (Admin) คนสุดท้ายที่ใช้งานอยู่ได้'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    const profile = await prisma.profile.findUnique({
      where: { profile_id: targetUser.username },
      select: { prefix: true, firstname: true, lastname: true }
    });
    const targetName = profile
      ? `${profile.prefix ? profile.prefix + ' ' : ''}${profile.firstname || ''} ${profile.lastname || ''}`.trim()
      : targetUser.username;

    await recordAuditLog(req, {
      action: isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER',
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetName,
      details: {
        previousStatus: targetUser.isActive ? 'active' : 'suspended',
        newStatus: isActive ? 'active' : 'suspended',
        reason: reason ? String(reason).trim() : undefined
      }
    });

    res.json({
      success: true,
      message: isActive ? 'เปิดใช้งานบัญชีผู้ใช้งานเรียบร้อยแล้ว' : 'ระงับการใช้งานบัญชีชั่วคราวเรียบร้อยแล้ว',
      data: updated
    });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะบัญชี',
      error: error.message
    });
  }
};

// @desc    Reset user password securely (never exposes old password)
// @route   POST /api/admin/users/:id/reset-password
// @access  Private (Admin only)
exports.resetUserPassword = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });
    }

    const { newPassword = '', autoGenerate = false, mustChangePassword = true } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
    }

    const plainPassword = autoGenerate
      ? generateSecurePassword(12)
      : String(newPassword || '').trim();

    if (!plainPassword || plainPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await prisma.user.update({
      where: { id: targetId },
      data: { password: hashedPassword }
    });

    const profile = await prisma.profile.findUnique({
      where: { profile_id: targetUser.username },
      select: { prefix: true, firstname: true, lastname: true }
    });
    const targetName = profile
      ? `${profile.prefix ? profile.prefix + ' ' : ''}${profile.firstname || ''} ${profile.lastname || ''}`.trim()
      : targetUser.username;

    await recordAuditLog(req, {
      action: 'RESET_PASSWORD',
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetName,
      details: {
        method: autoGenerate ? 'auto_generated_secure' : 'admin_specified',
        mustChangePassword: Boolean(mustChangePassword)
      }
    });

    res.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านสำเร็จ',
      data: {
        id: targetUser.id,
        username: targetUser.username,
        mustChangePassword: Boolean(mustChangePassword),
        temporaryPassword: autoGenerate ? plainPassword : null
      }
    });
  } catch (error) {
    console.error('Error in resetUserPassword:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน',
      error: error.message
    });
  }
};

// @desc    Delete or Soft-Delete user account safely without destroying student/project/portfolio records
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });
    }

    // mode: 'soft' (ระงับบัญชีถาวร/ซอฟต์ดีลีต) | 'account_only' (ลบบัญชี user แต่เก็บข้อมูล profile/โครงงาน/ผลงานไว้)
    const mode = req.query.mode || req.body?.mode || 'account_only';

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้งานในระบบ' });
    }

    // ป้องกันการลบบัญชีตัวเอง
    if (req.user.id === targetUser.id) {
      return res.status(400).json({
        success: false,
        message: 'ไม่อนุญาตให้ลบบัญชีผู้ใช้งานของตัวเอง'
      });
    }

    // ป้องกันการลบ Admin คนสุดท้าย
    if (targetUser.role === 'admin') {
      const otherAdmins = await prisma.user.count({
        where: { role: 'admin', isActive: true, NOT: { id: targetUser.id } }
      });
      if (otherAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบ (Admin) คนสุดท้ายของระบบ'
        });
      }
    }

    const profile = await prisma.profile.findUnique({
      where: { profile_id: targetUser.username },
      select: { id: true, profile_id: true, prefix: true, firstname: true, lastname: true }
    });
    const targetName = profile
      ? `${profile.prefix ? profile.prefix + ' ' : ''}${profile.firstname || ''} ${profile.lastname || ''}`.trim()
      : targetUser.username;

    // ตรวจสอบว่ามี PromotionBatch ที่อ้างอิง user.id แบบ ON DELETE RESTRICT หรือไม่
    const promotionBatchesCount = await prisma.promotionBatch.count({
      where: { created_by: targetUser.id }
    });

    // หากเลือกโหมด Soft Delete หรือมี PromotionBatch ผูกแบบ RESTRICT ให้ใช้ Soft Delete (ระงับบัญชี)
    if (mode === 'soft' || promotionBatchesCount > 0) {
      await prisma.user.update({
        where: { id: targetId },
        data: { isActive: false }
      });

      await recordAuditLog(req, {
        action: 'DELETE_USER',
        targetUserId: targetUser.id,
        targetUsername: targetUser.username,
        targetName,
        details: {
          deleteMode: 'soft_delete',
          preservedProfile: !!profile,
          reason: promotionBatchesCount > 0
            ? 'มีประวัติการดำเนินการเลื่อนชั้นปีที่อ้างอิงอยู่ ระบบจึงทำการ Soft Delete (ระงับบัญชี) เพื่อรักษาความสมบูรณ์ของฐานข้อมูล'
            : 'ระงับการใช้งานบัญชีถาวร (Soft Delete) โดยคงข้อมูลนักศึกษา โครงงาน และผลงานทั้งหมดไว้'
        }
      });

      return res.json({
        success: true,
        mode: 'soft_delete',
        message: 'ดำเนินการระงับบัญชีถาวร (Soft Delete) เรียบร้อยแล้ว โดยข้อมูลนักศึกษา โครงงาน และผลงานทั้งหมดยังคงอยู่ครบถ้วน'
      });
    }

    // ลบเฉพาะแถวในตาราง user เท่านั้น (ไม่ลบตาราง profile, projects, student_projects, internships เด็ดขาด!)
    await prisma.user.delete({
      where: { id: targetId }
    });

    await recordAuditLog(req, {
      action: 'DELETE_USER',
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      targetName,
      details: {
        deleteMode: 'account_only_preserved_profile',
        role: targetUser.role,
        email: targetUser.email,
        preservedProfile: !!profile,
        note: 'ลบบัญชีเข้าสู่ระบบ (User) เรียบร้อยแล้ว โดยไม่ลบข้อมูลนักศึกษา โครงงาน หรือผลงานที่เกี่ยวข้อง'
      }
    });

    res.json({
      success: true,
      mode: 'account_deleted',
      message: 'ลบบัญชีผู้ใช้งานสำเร็จ (ข้อมูลประวัติ โครงงาน และผลงานที่เกี่ยวข้องถูกเก็บรักษาไว้อย่างปลอดภัย)'
    });
  } catch (error) {
    console.error('Error in deleteUser (User Management):', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน',
      error: error.message
    });
  }
};

// @desc    Get audit logs for User Management
// @route   GET /api/admin/users/audit-logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    await ensureAuditTable();

    const { action = '', search = '', page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const logs = await prisma.$queryRaw`
      SELECT id, action, actor_id, actor_username, actor_name, target_user_id, target_username, target_name, details, ip_address, created_at
      FROM user_audit_logs
      ORDER BY created_at DESC
      LIMIT 500
    `;

    let filtered = Array.isArray(logs) ? logs : [];

    if (action && action !== 'all') {
      filtered = filtered.filter((l) => l.action === action);
    }

    if (search && String(search).trim() !== '') {
      const q = String(search).trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.actor_username && l.actor_username.toLowerCase().includes(q)) ||
          (l.actor_name && l.actor_name.toLowerCase().includes(q)) ||
          (l.target_username && l.target_username.toLowerCase().includes(q)) ||
          (l.target_name && l.target_name.toLowerCase().includes(q)) ||
          (l.action && l.action.toLowerCase().includes(q))
      );
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limitNum));
    const safePage = Math.min(pageNum, totalPages);
    const startIndex = (safePage - 1) * limitNum;

    const paginated = filtered.slice(startIndex, startIndex + limitNum).map((item) => {
      let parsedDetails = item.details;
      if (typeof parsedDetails === 'string') {
        try {
          parsedDetails = JSON.parse(parsedDetails);
        } catch (_) {
          parsedDetails = {};
        }
      }
      return {
        ...item,
        details: parsedDetails || {}
      };
    });

    res.json({
      success: true,
      data: paginated,
      pagination: {
        totalItems,
        totalPages,
        currentPage: safePage,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error in getAuditLogs:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงประวัติการดำเนินการ (Audit Log) ได้',
      error: error.message
    });
  }
};

