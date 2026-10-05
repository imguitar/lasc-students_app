const express = require('express');
const router = express.Router();
const chatBoardController = require('../controllers/chatBoard.controller');
const { auth } = require('../middleware/auth');

// All chat board endpoints require authentication
router.use(auth);

// ==========================================
// GROUP CHAT ENDPOINTS
// ==========================================

// Chat Rooms
router.get('/rooms', chatBoardController.getRooms);
router.get('/rooms/:roomId', chatBoardController.getRoomDetails);

// Messages
router.get('/rooms/:roomId/messages', chatBoardController.getMessages);
router.post('/rooms/:roomId/messages', chatBoardController.sendMessage);
router.put('/messages/:messageId', chatBoardController.editMessage);
router.delete('/messages/:messageId', chatBoardController.deleteMessage);

// Reactions
router.post('/messages/:messageId/reactions', chatBoardController.toggleReaction);

// Attachments upload
router.post('/upload', chatBoardController.uploadChatAttachmentMiddleware, chatBoardController.uploadAttachment);

// ==========================================
// LEGACY POSTS / COMMENTS ENDPOINTS
// ==========================================
router.get('/posts', chatBoardController.getPosts);
router.get('/posts/:id', chatBoardController.getPostById);
router.post('/posts', chatBoardController.createPost);
router.delete('/posts/:id', chatBoardController.deletePost);
router.post('/posts/:id/comments', chatBoardController.addComment);
router.delete('/comments/:id', chatBoardController.deleteComment);

module.exports = router;
