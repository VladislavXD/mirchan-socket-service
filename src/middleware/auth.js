const jwt = require('jsonwebtoken');
const config = require('../config');
const { getPrismaClient } = require('../config/database');

/**
 * Socket.IO authentication middleware
 * Проверяет JWT токен и загружает данные пользователя
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Верификация токена
    const decoded = jwt.verify(token, config.secretKey);
    
    // Загрузка пользователя из БД
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        avatarUrl: true,
        lastSeen: true
      }
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Прикрепляем данные пользователя к socket
    socket.userId = user.id;
    socket.user = user;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = { socketAuthMiddleware };
