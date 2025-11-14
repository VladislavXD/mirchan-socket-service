const socketManager = require('./manager');
const userService = require('../services/user.service');

/**
 * Обработка подключения нового пользователя
 */
const handleConnection = (socket) => {
  console.log(`✅ User ${socket.user.name} connected: ${socket.id}`);

  // Обновляем время последней активности
  userService.updateLastSeen(socket.userId);

  // Регистрируем пользователя
  socketManager.registerUser(socket);

  // Присоединяем к его чатам
  socketManager.joinUserChats(socket);

  // Уведомляем о том, что пользователь онлайн
  socketManager.notifyUserStatusChange(socket.userId, true);

  // Регистрируем обработчики событий
  socket.on('join_chat', (data) => socketManager.handleJoinChat(socket, data));
  socket.on('send_message', (data) => socketManager.handleSendMessage(socket, data));
  socket.on('mark_as_read', (data) => socketManager.handleMarkAsRead(socket, data));
  socket.on('typing_start', (data) => socketManager.handleTypingStart(socket, data));
  socket.on('typing_stop', (data) => socketManager.handleTypingStop(socket, data));

  // Обработка отключения
  socket.on('disconnect', () => handleDisconnect(socket));
};

/**
 * Обработка отключения пользователя
 */
const handleDisconnect = (socket) => {
  console.log(`❌ User ${socket.user.name} disconnected: ${socket.id}`);

  // Обновляем время последней активности
  userService.updateLastSeen(socket.userId);

  // Уведомляем о том, что пользователь офлайн
  socketManager.notifyUserStatusChange(socket.userId, false);

  // Удаляем пользователя из реестра
  socketManager.unregisterUser(socket);
};

module.exports = { handleConnection };
