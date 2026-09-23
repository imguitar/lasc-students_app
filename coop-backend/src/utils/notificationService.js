const pool = require('../config/db');

// สร้างการแจ้งเตือนให้ user คนเดียว — การล้มเหลวต้องไม่ทำให้ Business Logic หลักพัง
// จึง catch error ไว้ในตัวเองและคืน null แทนการ throw
const createNotification = async ({ userId, type, title, message = null, link = null, requestId = null }) => {
  if (!userId || !type || !title) return null;
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, request_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, link, requestId]
    );
    return result.insertId;
  } catch (error) {
    console.error('[Notification] สร้างการแจ้งเตือนไม่สำเร็จ:', error.message);
    return null;
  }
};

const findUserIdByUsername = async (identifier) => {
  if (!identifier) return null;
  try {
    const [rows] = await pool.query('SELECT id FROM `user` WHERE username = ? OR studentId = ? LIMIT 1', [identifier, identifier]);
    return rows[0]?.id || null;
  } catch (error) {
    console.error('[Notification] ค้นหาผู้ใช้ไม่สำเร็จ:', error.message);
    return null;
  }
};

const findUserIdsByRole = async (role) => {
  try {
    const [rows] = await pool.query('SELECT id FROM `user` WHERE role = ?', [role]);
    return rows.map((row) => row.id);
  } catch (error) {
    console.error('[Notification] ค้นหารายชื่อผู้ใช้ตามบทบาทไม่สำเร็จ:', error.message);
    return [];
  }
};

module.exports = { createNotification, findUserIdByUsername, findUserIdsByRole };
