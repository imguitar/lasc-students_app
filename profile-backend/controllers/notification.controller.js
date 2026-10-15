const notificationService = require('../services/notification.service');

// @desc    Get current user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, unreadOnly } = req.query;

    const result = await notificationService.getUserNotifications({
      userId,
      page,
      limit,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1'
    });

    res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        page: result.page,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error in getNotifications controller:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงข้อมูลการแจ้งเตือนได้',
      error: error.message
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Error in getUnreadCount controller:', error);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถดึงจำนวนการแจ้งเตือนได้',
      error: error.message
    });
  }
};

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const updated = await notificationService.markAsRead(notificationId, userId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการแจ้งเตือนนี้'
      });
    }

    res.status(200).json({
      success: true,
      message: 'ทำเครื่องหมายว่าอ่านแล้วเรียบร้อย'
    });
  } catch (error) {
    console.error('Error in markAsRead controller:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการแจ้งเตือน',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: `ทำเครื่องหมายว่าอ่านแล้วทั้งหมด ${count} รายการ`,
      updatedCount: count
    });
  } catch (error) {
    console.error('Error in markAllAsRead controller:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการแจ้งเตือนทั้งหมด',
      error: error.message
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const deleted = await notificationService.deleteNotification(notificationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการแจ้งเตือนที่ต้องการลบ'
      });
    }

    res.status(200).json({
      success: true,
      message: 'ลบการแจ้งเตือนเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error in deleteNotification controller:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบการแจ้งเตือน',
      error: error.message
    });
  }
};
