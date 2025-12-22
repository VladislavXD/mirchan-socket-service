const { Server } = require('socket.io');
const config = require('../config');
const { socketAuthMiddleware } = require('../middleware/auth');
const socketManager = require('./manager');
const { handleConnection } = require('./handlers');

/**
 * Инициализация Socket.IO сервера
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    
    
  });

  // Middleware для аутентификации
  io.use(socketAuthMiddleware);

  // Инициализация менеджера
  socketManager.init(io);

  // Обработка подключений
  io.on('connection', handleConnection);

  console.log('🚀 Socket.IO server initialized');

  return io;
};

module.exports = { initializeSocket, socketManager };
