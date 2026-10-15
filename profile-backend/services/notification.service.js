const prisma = require('../prismaClient');
const { emitNotification } = require('../socket');

/**
 * ดึงรายการแจ้งเตือนของผู้ใช้
 */
const getUserNotifications = async ({ userId, page = 1, limit = 50, unreadOnly = false }) => {
  try {
    const where = {
      user_id: userId,
      ...(unreadOnly ? { is_read: false } : {})
    };

    const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skip = Math.max((parseInt(page, 10) - 1) * take, 0);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take,
        skip
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false
        }
      })
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(total / take) || 1
    };
  } catch (error) {
    console.error('[NotificationService] Error getting user notifications:', error);
    throw error;
  }
};

/**
 * ดึงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
 */
const getUnreadCount = async (userId) => {
  try {
    return await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
  } catch (error) {
    console.error('[NotificationService] Error getting unread count:', error);
    return 0;
  }
};

/**
 * ทำเครื่องหมายการแจ้งเตือนรายการเดียวว่าอ่านแล้ว
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: {
        id: parseInt(notificationId, 10),
        user_id: userId
      },
      data: {
        is_read: true
      }
    });
    return updated.count > 0;
  } catch (error) {
    console.error('[NotificationService] Error marking notification as read:', error);
    throw error;
  }
};

/**
 * ทำเครื่องหมายการแจ้งเตือนทั้งหมดว่าอ่านแล้ว
 */
const markAllAsRead = async (userId) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true
      }
    });
    return updated.count;
  } catch (error) {
    console.error('[NotificationService] Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * ลบการแจ้งเตือนรายการเดียว
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const deleted = await prisma.notification.deleteMany({
      where: {
        id: parseInt(notificationId, 10),
        user_id: userId
      }
    });
    return deleted.count > 0;
  } catch (error) {
    console.error('[NotificationService] Error deleting notification:', error);
    throw error;
  }
};

/**
 * สร้างการแจ้งเตือนเดี่ยว พร้อม Real-time push
 * ฟังก์ชันนี้ปลอดภัย (safe) — หากล้มเหลวจะไม่ throw ขัดขวาง logic หลัก
 */
const createNotification = async ({ userId, type, title, message = null, link = null, requestId = null }) => {
  if (!userId || !type || !title) return null;
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        link,
        request_id: requestId ? parseInt(requestId, 10) : null,
        is_read: false
      }
    });

    // Real-time Push ผ่าน Socket.IO
    try {
      emitNotification(userId, notification);
    } catch (socketErr) {
      console.warn('[NotificationService] Socket emit error:', socketErr.message);
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error.message);
    return null;
  }
};

/**
 * สร้างการแจ้งเตือนแบบกลุ่ม (Batch) พร้อม Real-time push
 * ใช้ transaction หรือ loop เพื่อความปลอดภัยและ emit รายบุคคล
 */
const createBatchNotifications = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  try {
    const validItems = items.filter(i => (i.userId || i.user_id) && i.type && i.title);
    if (validItems.length === 0) return [];

    const createdNotifications = await prisma.$transaction(
      validItems.map(item =>
        prisma.notification.create({
          data: {
            user_id: item.userId || item.user_id,
            type: item.type,
            title: item.title,
            message: item.message || null,
            link: item.link || null,
            request_id: item.requestId || item.request_id || null,
            is_read: false
          }
        })
      )
    );

    // Push แจ้งเตือน real-time ให้ผู้ใช้แต่ละคน
    createdNotifications.forEach(notification => {
      try {
        emitNotification(notification.user_id, notification);
      } catch (err) {
        // ignore socket errors during batch
      }
    });

    return createdNotifications;
  } catch (error) {
    console.error('[NotificationService] Error creating batch notifications:', error.message);
    return [];
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createBatchNotifications
};
