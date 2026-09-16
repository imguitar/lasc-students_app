const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ประธานสาขาวิชาอ่านจาก departments.department_head_id (แหล่งความจริงเดียวของทั้งระบบ)
const findHeadDepartment = async (profile) => {
  if (!profile) return null;
  return prisma.department.findFirst({
    where: { department_head_id: profile.id },
    select: { id: true, department_id: true, department_name: true }
  });
};

// ชื่อเต็มที่แสดงบน UI — เผื่อกรณียังไม่มี profile ให้ตกไปใช้ username
const buildDisplayName = (user, profile) =>
  `${profile?.prefix ? profile.prefix + ' ' : ''}${profile?.firstname || ''} ${profile?.lastname || ''}`.trim() || user.username;


// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role || 'student',
        firstName,
        lastName,
        phone
      }
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error registering user',
      error: error.message 
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists — ใช้ findUnique เพื่อให้ใช้ index (เร็วกว่า findFirst + OR)
    const user =
      (await prisma.user.findUnique({ where: { username } })) ??
      (await prisma.user.findUnique({ where: { username: username.toLowerCase() } })) ??
      (await prisma.user.findUnique({ where: { email: username } }));

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Verify password — เรียก bcrypt.compare ครั้งเดียว (bcrypt ไม่ case-sensitive อยู่แล้ว)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Fetch associated Profile
    const profile = await prisma.profile.findUnique({
      where: { profile_id: user.username },
      include: { faculty: true, department: true }
    });
    user.profile = profile || null;

    const headDepartment = await findHeadDepartment(profile);

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          profile: user.profile,
          firstName: profile?.firstname || '',
          lastName: profile?.lastname || '',
          name: buildDisplayName(user, profile),
          is_department_head: !!headDepartment,
          head_department: headDepartment
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error logging in',
      error: error.message 
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Fetch associated Profile
    const profile = await prisma.profile.findUnique({
      where: { profile_id: user.username },
      include: { faculty: true, department: true }
    });
    user.profile = profile || null;

    const headDepartment = await findHeadDepartment(profile);
    user.firstName = profile?.firstname || '';
    user.lastName = profile?.lastname || '';
    user.name = buildDisplayName(user, profile);
    user.is_department_head = !!headDepartment;
    user.head_department = headDepartment;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user data',
      error: error.message 
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile',
      error: error.message 
    });
  }
};
