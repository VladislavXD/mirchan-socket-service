const express = require('express');
const { socketManager } = require('../socket');

const router = express.Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'chat-socket-service',
    connectedUsers: socketManager.getOnlineUsers().length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /users/online
 * Получить список онлайн пользователей
 */
router.get('/users/online', (req, res) => {
  const onlineUsers = socketManager.getOnlineUsers();
  res.json({
    count: onlineUsers.length,
    users: onlineUsers
  });
});

/**
 * GET /users/:userId/status
 * Проверить статус конкретного пользователя
 */
router.get('/users/:userId/status', (req, res) => {
  const { userId } = req.params;
  const isOnline = socketManager.isUserOnline(userId);
  
  res.json({
    userId,
    isOnline
  });
});

/**
 * POST /users/status/bulk
 * Проверить статус нескольких пользователей
 */
router.post('/users/status/bulk', (req, res) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array' });
  }

  const statuses = userIds.reduce((acc, userId) => {
    acc[userId] = socketManager.isUserOnline(userId);
    return acc;
  }, {});

  res.json({ statuses });
});

module.exports = router;
