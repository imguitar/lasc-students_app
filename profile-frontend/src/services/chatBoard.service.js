import api from './api';

export const chatBoardService = {
  // ==========================================
  // GROUP CHAT API
  // ==========================================

  // Get accessible chat rooms
  getRooms: async () => {
    const response = await api.get('/chat-board/rooms');
    return response.data;
  },

  // Get single room details
  getRoomDetails: async (roomId) => {
    const response = await api.get(`/chat-board/rooms/${roomId}`);
    return response.data;
  },

  // Get paginated messages in room (params: limit, before_id, search)
  getMessages: async (roomId, params = {}) => {
    const response = await api.get(`/chat-board/rooms/${roomId}/messages`, { params });
    return response.data;
  },

  // Send a message
  sendMessage: async (roomId, data) => {
    const response = await api.post(`/chat-board/rooms/${roomId}/messages`, data);
    return response.data;
  },

  // Edit user's own message
  editMessage: async (messageId, data) => {
    const response = await api.put(`/chat-board/messages/${messageId}`, data);
    return response.data;
  },

  // Delete message
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/chat-board/messages/${messageId}`);
    return response.data;
  },

  // Toggle reaction (👍, ❤️, 😂, 😮, 😢)
  toggleReaction: async (messageId, reactionType) => {
    const response = await api.post(`/chat-board/messages/${messageId}/reactions`, {
      reaction_type: reactionType
    });
    return response.data;
  },

  // Upload file attachment (images, doc, pdf, zip up to 20MB)
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/chat-board/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // ==========================================
  // LEGACY POSTS / COMMENTS API
  // ==========================================
  getPosts: async (params = {}) => {
    const response = await api.get('/chat-board/posts', { params });
    return response.data;
  },

  getPostById: async (id) => {
    const response = await api.get(`/chat-board/posts/${id}`);
    return response.data;
  },

  createPost: async (data) => {
    const response = await api.post('/chat-board/posts', data);
    return response.data;
  },

  deletePost: async (id) => {
    const response = await api.delete(`/chat-board/posts/${id}`);
    return response.data;
  },

  addComment: async (postId, data) => {
    const response = await api.post(`/chat-board/posts/${postId}/comments`, data);
    return response.data;
  },

  deleteComment: async (id) => {
    const response = await api.delete(`/chat-board/comments/${id}`);
    return response.data;
  }
};

export default chatBoardService;
