const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('./prismaClient');

let ioInstance = null;

const initSocket = (server, corsOptions) => {
  const io = new Server(server, {
    cors: {
      origin: corsOptions.origin || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token && socket.handshake.headers?.authorization) {
        token = socket.handshake.headers.authorization.replace('Bearer ', '');
      }
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User not active or found'));
      }

      const profile = await prisma.profile.findUnique({
        where: { profile_id: user.username },
        select: {
          id: true,
          profile_id: true,
          prefix: true,
          firstname: true,
          lastname: true,
          department_id: true,
          avatar_url: true
        }
      });

      socket.user = user;
      socket.profile = profile;
      next();
    } catch (err) {
      console.warn('Socket auth failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join Department Chat Room
    socket.on('join_room', async (roomId) => {
      try {
        const id = parseInt(roomId, 10);
        if (isNaN(id)) return;

        const room = await prisma.chatRoom.findUnique({
          where: { id }
        });

        if (!room) return;

        // Security check: non-admin can only join their department's room
        if (socket.user.role !== 'admin') {
          if (!socket.profile || socket.profile.department_id !== room.department_id) {
            socket.emit('error_message', 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทของสาขานี้');
            return;
          }
        }

        socket.join(`room_${id}`);
      } catch (err) {
        console.error('join_room error:', err);
      }
    });

    socket.on('leave_room', (roomId) => {
      const id = parseInt(roomId, 10);
      if (!isNaN(id)) {
        socket.leave(`room_${id}`);
      }
    });

    socket.on('typing_start', ({ roomId }) => {
      if (!roomId || !socket.profile) return;
      const fullName = `${socket.profile.prefix ? socket.profile.prefix + ' ' : ''}${socket.profile.firstname} ${socket.profile.lastname}`.trim() || socket.user.username;
      socket.to(`room_${roomId}`).emit('user_typing', {
        roomId: parseInt(roomId, 10),
        userId: socket.user.id,
        profileId: socket.profile.profile_id,
        userName: fullName
      });
    });

    socket.on('typing_stop', ({ roomId }) => {
      if (!roomId || !socket.profile) return;
      socket.to(`room_${roomId}`).emit('user_stop_typing', {
        roomId: parseInt(roomId, 10),
        userId: socket.user.id,
        profileId: socket.profile.profile_id
      });
    });

    socket.on('disconnect', () => {
      // Client disconnected
    });
  });

  ioInstance = io;
  return io;
};

const getIo = () => ioInstance;

module.exports = { initSocket, getIo };
