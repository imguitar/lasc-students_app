const prisma = require('../prismaClient');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { getIo } = require('../socket');

// Helper to get user profile with department and faculty
const getUserProfile = async (username) => {
  return prisma.profile.findUnique({
    where: { profile_id: username },
    include: { department: true, faculty: true }
  });
};

// Helper for author display name
const getAuthorDisplayName = (user, profile) => {
  if (profile) {
    const fullName = `${profile.prefix ? profile.prefix + ' ' : ''}${profile.firstname || ''} ${profile.lastname || ''}`.trim();
    if (fullName) return fullName;
  }
  return user.username;
};

// Helper to calculate student year level (1, 2, 3, 4, etc.)
const calculateStudentYear = (profileId) => {
  if (!profileId || !/^\d{2}/.test(profileId)) return null;
  const currentBE = new Date().getFullYear() + 543;
  const entryBE = 2500 + parseInt(profileId.substring(0, 2), 10);
  return Math.max(1, currentBE - entryBE + 1);
};

// Helper to clean room name and remove corrupt characters or question marks
const cleanRoomName = (name, deptName) => {
  if (deptName) {
    const cleanDept = deptName.replace(/^[?\s]+/, '').trim();
    return `ห้องแชท${cleanDept}`;
  }
  if (!name) return 'ห้องแชทประจำสาขา';
  const cleaned = name.replace(/^[?\s]+/, '').trim();
  if (cleaned.startsWith('ห้องแชท') || cleaned.startsWith('ห้องพูดคุย')) {
    return cleaned;
  }
  return `ห้องแชท${cleaned}`;
};

// Helper to get or auto-create chat room for a department
const getOrCreateDepartmentRoom = async (deptId) => {
  let room = await prisma.chatRoom.findUnique({
    where: { department_id: deptId },
    include: {
      department: {
        select: { id: true, department_id: true, department_name: true }
      }
    }
  });

  if (!room) {
    const dept = await prisma.department.findUnique({ where: { id: deptId } });
    if (!dept) return null;
    room = await prisma.chatRoom.create({
      data: {
        department_id: dept.id,
        name: `ห้องแชท${dept.department_name}`
      },
      include: {
        department: {
          select: { id: true, department_id: true, department_name: true }
        }
      }
    });
  }

  return room;
};

// ============================================================
// Multer Configuration for Chat Attachments
// ============================================================
const CHAT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
  fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed'
];

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CHAT_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uuid = crypto.randomUUID();
    cb(null, `${uuid}${ext}`);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่รองรับ อนุญาตเฉพาะรูปภาพ, PDF, Word, Excel และ ZIP ขนาดไม่เกิน 20MB'));
    }
  }
});

// Middleware for chat file upload
exports.uploadChatAttachmentMiddleware = chatUpload.single('file');

// ============================================================
// GROUP CHAT CONTROLLER METHODS
// ============================================================

// @desc    Get chat rooms accessible by current user
// @route   GET /api/chat-board/rooms
// @access  Private
exports.getRooms = async (req, res) => {
  try {
    const userRole = req.user.role;
    const profile = await getUserProfile(req.user.username);

    let rooms = [];

    if (userRole === 'admin') {
      // Admin can see all department chat rooms
      const allRooms = await prisma.chatRoom.findMany({
        include: {
          department: {
            select: { id: true, department_id: true, department_name: true }
          },
          messages: {
            orderBy: { id: 'desc' },
            take: 1
          }
        },
        orderBy: { department_id: 'asc' }
      });

      // Enrich with member counts
      rooms = await Promise.all(
        allRooms.map(async (room) => {
          const memberCount = await prisma.profile.count({
            where: { department_id: room.department_id }
          });
          return {
            id: room.id,
            department_id: room.department_id,
            department_name: room.department.department_name,
            department_code: room.department.department_id,
            name: cleanRoomName(room.name, room.department?.department_name),
            description: room.description,
            member_count: memberCount,
            last_message: room.messages[0] || null,
            created_at: room.created_at,
            updated_at: room.updated_at
          };
        })
      );
    } else {
      // Non-admin can only access their own department's room
      if (!profile || !profile.department_id) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลสาขาวิชาของผู้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
        });
      }

      const room = await getOrCreateDepartmentRoom(profile.department_id);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบห้องแชทสำหรับสาขาวิชาของคุณ'
        });
      }

      const memberCount = await prisma.profile.count({
        where: { department_id: profile.department_id }
      });

      const lastMessage = await prisma.chatMessage.findFirst({
        where: { room_id: room.id },
        orderBy: { id: 'desc' }
      });

      rooms = [
        {
          id: room.id,
          department_id: room.department_id,
          department_name: room.department.department_name,
          department_code: room.department.department_id,
          name: cleanRoomName(room.name, room.department?.department_name),
          description: room.description,
          member_count: memberCount,
          last_message: lastMessage || null,
          created_at: room.created_at,
          updated_at: room.updated_at
        }
      ];
    }

    res.json({
      success: true,
      data: rooms,
      currentUser: {
        username: req.user.username,
        role: req.user.role,
        profile_id: profile?.profile_id || req.user.username,
        display_name: getAuthorDisplayName(req.user, profile),
        department_id: profile?.department_id || null,
        department_name: profile?.department?.department_name || null,
        year: calculateStudentYear(profile?.profile_id),
        avatar_url: profile?.avatar_url || null
      }
    });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องแชท',
      error: error.message
    });
  }
};

// @desc    Get single room details
// @route   GET /api/chat-board/rooms/:roomId
// @access  Private
exports.getRoomDetails = async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId, 10);
    const profile = await getUserProfile(req.user.username);

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        department: {
          select: { id: true, department_id: true, department_name: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชทที่ต้องการ'
      });
    }

    // Security Authorization: Non-admin can only access their own department room
    if (req.user.role !== 'admin') {
      if (!profile || profile.department_id !== room.department_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทของสาขานี้'
        });
      }
    }

    const memberCount = await prisma.profile.count({
      where: { department_id: room.department_id }
    });

    res.json({
      success: true,
      data: {
        id: room.id,
        department_id: room.department_id,
        department_name: room.department.department_name,
        department_code: room.department.department_id,
        name: cleanRoomName(room.name, room.department?.department_name),
        description: room.description,
        member_count: memberCount,
        created_at: room.created_at,
        updated_at: room.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องแชท',
      error: error.message
    });
  }
};

// @desc    Get paginated messages for a chat room
// @route   GET /api/chat-board/rooms/:roomId/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId, 10);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const beforeId = req.query.before_id ? parseInt(req.query.before_id, 10) : undefined;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const profile = await getUserProfile(req.user.username);

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชทที่ต้องการ'
      });
    }

    // Security Authorization
    if (req.user.role !== 'admin') {
      if (!profile || profile.department_id !== room.department_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทของสาขานี้'
        });
      }
    }

    const whereClause = {
      room_id: roomId
    };

    if (beforeId && !isNaN(beforeId)) {
      whereClause.id = { lt: beforeId };
    }

    if (search) {
      whereClause.OR = [
        { message: { contains: search } },
        { author_name: { contains: search } },
        { file_name: { contains: search } }
      ];
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        },
        replyTo: {
          select: {
            id: true,
            author_profile_id: true,
            author_name: true,
            author_role: true,
            author_year: true,
            message: true,
            file_name: true,
            image_url: true
          }
        },
        reactions: true
      }
    });

    // Check if there are older messages
    let hasMore = false;
    if (messages.length === limit) {
      const oldestId = messages[messages.length - 1].id;
      const olderCount = await prisma.chatMessage.count({
        where: {
          room_id: roomId,
          id: { lt: oldestId }
        }
      });
      hasMore = olderCount > 0;
    }

    // Reverse to display chronologically (oldest at top, newest at bottom)
    const sortedMessages = messages.reverse();

    res.json({
      success: true,
      count: sortedMessages.length,
      has_more: hasMore,
      data: sortedMessages
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อความแชท',
      error: error.message
    });
  }
};

// @desc    Send a new message to a chat room
// @route   POST /api/chat-board/rooms/:roomId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId, 10);
    const {
      message,
      file_url,
      file_name,
      file_size,
      file_type,
      image_url,
      reply_to_message_id
    } = req.body;

    const trimmedMsg = message ? String(message).trim() : '';

    if (!trimmedMsg && !file_url && !image_url) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุข้อความหรือแนบไฟล์'
      });
    }

    const profile = await getUserProfile(req.user.username);
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชทที่ต้องการ'
      });
    }

    // Security Authorization: Non-admin can only send messages in their own department's room
    if (req.user.role !== 'admin') {
      if (!profile || profile.department_id !== room.department_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทของสาขานี้'
        });
      }
    }

    const authorProfileId = profile ? profile.profile_id : req.user.username;
    const authorName = getAuthorDisplayName(req.user, profile);
    const authorYear = calculateStudentYear(authorProfileId);

    // Validate replyTo if provided
    let validReplyId = null;
    if (reply_to_message_id) {
      const replyId = parseInt(reply_to_message_id, 10);
      if (!isNaN(replyId)) {
        const replyTarget = await prisma.chatMessage.findFirst({
          where: { id: replyId, room_id: roomId }
        });
        if (replyTarget) {
          validReplyId = replyTarget.id;
        }
      }
    }

    const fallbackMsg = trimmedMsg || (file_name ? `แนบไฟล์: ${file_name}` : 'แนบรูปภาพ');

    const newMessage = await prisma.chatMessage.create({
      data: {
        room_id: roomId,
        author_profile_id: authorProfileId,
        author_name: authorName,
        author_role: req.user.role,
        author_year: authorYear,
        message: fallbackMsg,
        file_url: file_url || null,
        file_name: file_name || null,
        file_size: file_size ? parseInt(file_size, 10) : null,
        file_type: file_type || null,
        image_url: image_url || null,
        reply_to_message_id: validReplyId
      },
      include: {
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        },
        replyTo: {
          select: {
            id: true,
            author_profile_id: true,
            author_name: true,
            author_role: true,
            author_year: true,
            message: true,
            file_name: true,
            image_url: true
          }
        },
        reactions: true
      }
    });

    // Update room's updated_at
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updated_at: new Date() }
    });

    // Emit Real-time event via Socket.IO
    const io = getIo();
    if (io) {
      io.to(`room_${roomId}`).emit('new_message', newMessage);
    }

    res.status(201).json({
      success: true,
      message: 'ส่งข้อความเรียบร้อยแล้ว',
      data: newMessage
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ',
      error: error.message
    });
  }
};

// @desc    Edit user's own message
// @route   PUT /api/chat-board/messages/:messageId
// @access  Private (Owner only)
exports.editMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุข้อความที่ต้องการแก้ไข'
      });
    }

    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { room: true }
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อความที่ต้องการแก้ไข'
      });
    }

    // Only owner can edit message
    if (req.user.username !== existingMessage.author_profile_id) {
      return res.status(403).json({
        success: false,
        message: 'คุณสามารถแก้ไขได้เฉพาะข้อความของตนเองเท่านั้น'
      });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        message: String(message).trim(),
        is_edited: true
      },
      include: {
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        },
        replyTo: {
          select: {
            id: true,
            author_profile_id: true,
            author_name: true,
            author_role: true,
            author_year: true,
            message: true,
            file_name: true,
            image_url: true
          }
        },
        reactions: true
      }
    });

    // Real-time broadcast
    const io = getIo();
    if (io) {
      io.to(`room_${existingMessage.room_id}`).emit('message_updated', updated);
    }

    res.json({
      success: true,
      message: 'แก้ไขข้อความเรียบร้อยแล้ว',
      data: updated
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขข้อความ',
      error: error.message
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/chat-board/messages/:messageId
// @access  Private (Owner or Admin)
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const existingMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อความที่ต้องการลบ'
      });
    }

    // Owner or Admin can delete
    if (req.user.role !== 'admin' && req.user.username !== existingMessage.author_profile_id) {
      return res.status(403).json({
        success: false,
        message: 'คุณสามารถลบได้เฉพาะข้อความของตนเองเท่านั้น'
      });
    }

    const roomId = existingMessage.room_id;

    await prisma.chatMessage.delete({
      where: { id: messageId }
    });

    // Real-time broadcast
    const io = getIo();
    if (io) {
      io.to(`room_${roomId}`).emit('message_deleted', {
        messageId,
        roomId
      });
    }

    res.json({
      success: true,
      message: 'ลบข้อความเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อความ',
      error: error.message
    });
  }
};

// @desc    Toggle emoji reaction on a message (👍, ❤️, 😂, 😮, 😢)
// @route   POST /api/chat-board/messages/:messageId/reactions
// @access  Private
exports.toggleReaction = async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const { reaction_type } = req.body;

    const allowedReactions = ['👍', '❤️', '😂', '😮', '😢'];
    if (!reaction_type || !allowedReactions.includes(reaction_type)) {
      return res.status(400).json({
        success: false,
        message: 'Reaction ไม่ถูกต้อง อนุญาตเฉพาะ: 👍, ❤️, 😂, 😮, 😢'
      });
    }

    const profile = await getUserProfile(req.user.username);
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { room: true }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อความที่ต้องการทำรายการ'
      });
    }

    // Security check: non-admin must belong to the department of this room
    if (req.user.role !== 'admin') {
      if (!profile || profile.department_id !== message.room.department_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทของสาขานี้'
        });
      }
    }

    const userProfileId = profile ? profile.profile_id : req.user.username;
    const userName = getAuthorDisplayName(req.user, profile);

    // Check if reaction already exists for this user
    const existing = await prisma.chatMessageReaction.findFirst({
      where: {
        message_id: messageId,
        user_profile_id: userProfileId,
        reaction_type
      }
    });

    if (existing) {
      // Toggle off: remove reaction
      await prisma.chatMessageReaction.delete({
        where: { id: existing.id }
      });
    } else {
      // Toggle on: add reaction
      await prisma.chatMessageReaction.create({
        data: {
          message_id: messageId,
          user_profile_id: userProfileId,
          user_name: userName,
          reaction_type
        }
      });
    }

    // Fetch updated reactions
    const allReactions = await prisma.chatMessageReaction.findMany({
      where: { message_id: messageId }
    });

    // Real-time broadcast
    const io = getIo();
    if (io) {
      io.to(`room_${message.room_id}`).emit('reaction_updated', {
        messageId,
        roomId: message.room_id,
        reactions: allReactions
      });
    }

    res.json({
      success: true,
      data: allReactions
    });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึก Reaction',
      error: error.message
    });
  }
};

// @desc    Upload file attachment for chat
// @route   POST /api/chat-board/upload
// @access  Private
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด'
      });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = `/uploads/chat/${req.file.filename}`;

    res.json({
      success: true,
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: {
        url: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        isImage
      }
    });
  } catch (error) {
    console.error('Error uploading chat attachment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      error: error.message
    });
  }
};

// ============================================================
// LEGACY POSTS / COMMENTS METHODS (Backward Compatibility)
// ============================================================

exports.getPosts = async (req, res) => {
  try {
    const userRole = req.user.role;
    const profile = await getUserProfile(req.user.username);
    const { department_id, search } = req.query;

    let whereClause = {};

    if (userRole === 'admin') {
      if (department_id && department_id !== 'all') {
        whereClause.department_id = parseInt(department_id, 10);
      }
    } else {
      if (!profile || !profile.department_id) {
        return res.json({
          success: true,
          data: [],
          userDepartment: null,
          message: 'ไม่พบข้อมูลสาขาวิชาของผู้ใช้งาน'
        });
      }
      whereClause.department_id = profile.department_id;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { title: { contains: search.trim() } },
        { content: { contains: search.trim() } },
        { author_name: { contains: search.trim() } }
      ];
    }

    const posts = await prisma.departmentPost.findMany({
      where: whereClause,
      include: {
        department: {
          select: { id: true, department_id: true, department_name: true }
        },
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: posts,
      userDepartment: profile?.department || null,
      isAdmin: userRole === 'admin'
    });
  } catch (error) {
    console.error('Error fetching chat board posts:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้',
      error: error.message
    });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const userRole = req.user.role;
    const profile = await getUserProfile(req.user.username);

    const post = await prisma.departmentPost.findUnique({
      where: { id: postId },
      include: {
        department: {
          select: { id: true, department_id: true, department_name: true }
        },
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                profile_id: true,
                firstname: true,
                lastname: true,
                prefix: true,
                avatar_url: true
              }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกระทู้ที่ต้องการ'
      });
    }

    if (userRole !== 'admin') {
      if (!profile || profile.department_id !== post.department_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณไม่มีสิทธิ์เข้าถึงกระทู้ของสาขาวิชาอื่น'
        });
      }
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกระทู้',
      error: error.message
    });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, department_id } = req.body;
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุหัวข้อและเนื้อหากระทู้'
      });
    }

    const userRole = req.user.role;
    let profile = await getUserProfile(req.user.username);

    let targetDeptId;
    let authorProfileId;
    let authorName;

    if (userRole === 'admin') {
      if (department_id) {
        targetDeptId = parseInt(department_id, 10);
      } else if (profile?.department_id) {
        targetDeptId = profile.department_id;
      } else {
        const firstDept = await prisma.department.findFirst();
        targetDeptId = firstDept ? firstDept.id : 1;
      }
      authorProfileId = profile ? profile.profile_id : 'admin1';
      authorName = getAuthorDisplayName(req.user, profile);
    } else {
      if (!profile || !profile.department_id) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลสาขาวิชาของผู้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
        });
      }
      targetDeptId = profile.department_id;
      authorProfileId = profile.profile_id;
      authorName = getAuthorDisplayName(req.user, profile);
    }

    const newPost = await prisma.departmentPost.create({
      data: {
        department_id: targetDeptId,
        author_profile_id: authorProfileId,
        author_name: authorName,
        author_role: userRole,
        title: title.trim(),
        content: content.trim()
      },
      include: {
        department: {
          select: { id: true, department_id: true, department_name: true }
        },
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'สร้างกระทู้เรียบร้อยแล้ว',
      data: newPost
    });
  } catch (error) {
    console.error('Error creating chat board post:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างกระทู้',
      error: error.message
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุข้อความตอบกลับ'
      });
    }

    const post = await prisma.departmentPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกระทู้ที่ต้องการตอบกลับ'
      });
    }

    const userRole = req.user.role;
    let profile = await getUserProfile(req.user.username);

    if (userRole !== 'admin') {
      if (!profile || profile.department_id !== post.department_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณสามารถตอบกระทู้เฉพาะในสาขาวิชาของตนเองเท่านั้น'
        });
      }
    }

    const authorProfileId = profile ? profile.profile_id : 'admin1';
    const authorName = getAuthorDisplayName(req.user, profile);

    const comment = await prisma.departmentComment.create({
      data: {
        post_id: postId,
        author_profile_id: authorProfileId,
        author_name: authorName,
        author_role: userRole,
        content: content.trim()
      },
      include: {
        author: {
          select: {
            profile_id: true,
            firstname: true,
            lastname: true,
            prefix: true,
            avatar_url: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'ตอบกระทู้เรียบร้อยแล้ว',
      data: comment
    });
  } catch (error) {
    console.error('Error adding comment to post:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตอบกระทู้',
      error: error.message
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const userRole = req.user.role;

    const post = await prisma.departmentPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบกระทู้ที่ต้องการลบ'
      });
    }

    if (userRole !== 'admin') {
      const profile = await getUserProfile(req.user.username);
      if (!profile || profile.profile_id !== post.author_profile_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณสามารถลบได้เฉพาะกระทู้ของตนเองเท่านั้น'
        });
      }
    }

    await prisma.departmentPost.delete({
      where: { id: postId }
    });

    res.json({
      success: true,
      message: 'ลบกระทู้เรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting chat board post:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบกระทู้',
      error: error.message
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const userRole = req.user.role;

    const comment = await prisma.departmentComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบความคิดเห็นที่ต้องการลบ'
      });
    }

    if (userRole !== 'admin') {
      const profile = await getUserProfile(req.user.username);
      if (!profile || profile.profile_id !== comment.author_profile_id) {
        return res.status(403).json({
          success: false,
          message: 'คุณสามารถลบได้เฉพาะความคิดเห็นของตนเองเท่านั้น'
        });
      }
    }

    await prisma.departmentComment.delete({
      where: { id: commentId }
    });

    res.json({
      success: true,
      message: 'ลบความคิดเห็นเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบความคิดเห็น',
      error: error.message
    });
  }
};
