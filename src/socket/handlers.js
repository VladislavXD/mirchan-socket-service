const socketManager = require('./manager');
const userService = require('../services/user.service');

/**
 * Обработка подключения нового пользователя
 */
const handleConnection = (socket) => {
  console.log(`✅ User ${socket.user.name} connected: ${socket.id}`);

  // Обновляем время последней активности (отключено - нет таблицы User)
  // userService.updateLastSeen(socket.userId);

  // Регистрируем пользователя в Map онлайн пользователей
  socketManager.registerUser(socket);

  // Присоединяем к его чатам
  socketManager.joinUserChats(socket);

  // ВАЖНО: Сначала уведомляем ВСЕХ о новом онлайн пользователе
  socketManager.notifyUserStatusChange(socket.userId, true);

  // Затем отправляем новому пользователю список УЖЕ онлайн пользователей
  // (в этот момент в userSockets уже есть все ранее подключенные пользователи)
  socketManager.sendGlobalOnlineStatuses(socket);

  // Отправляем текущие онлайн статусы участников чатов (для чатов)
  socketManager.sendCurrentOnlineStatuses(socket);

  // Регистрируем обработчики событий с rate limiting
  socket.on('join_chat', (data) => {
    if (!socketManager.checkRateLimit(socket.id, 'join_chat', 5, 1000)) {
      socket.emit('error', { message: 'Too many requests. Please slow down.' });
      return;
    }
    socketManager.handleJoinChat(socket, data);
  });
  
  socket.on('send_message', (data) => {
    if (!socketManager.checkRateLimit(socket.id, 'send_message', 5, 1000)) { // 5 сообщений в секунду
      socket.emit('error', { message: 'Too many messages. Please slow down.' });
      return;
    }
    socketManager.handleSendMessage(socket, data);
  });
  
  socket.on('mark_as_read', (data) => {
    if (!socketManager.checkRateLimit(socket.id, 'mark_as_read', 10, 1000)) {
      socket.emit('error', { message: 'Too many requests. Please slow down.' });
      return;
    }
    socketManager.handleMarkAsRead(socket, data);
  });
  
  socket.on('typing_start', (data) => {
    if (!socketManager.checkRateLimit(socket.id, 'typing_start', 3, 1000)) {
      return; // Молча игнорируем typing spam
    }
    socketManager.handleTypingStart(socket, data);
  });
  
  socket.on('typing_stop', (data) => {
    if (!socketManager.checkRateLimit(socket.id, 'typing_stop', 3, 1000)) {
      return; // Молча игнорируем typing spam
    }
    socketManager.handleTypingStop(socket, data);
  });
  
  // Явный запрос текущих онлайн-статусов от клиента
  socket.on('request_online_statuses', () => socketManager.sendCurrentOnlineStatuses(socket));
  
  // Явный запрос глобальных онлайн-статусов
  socket.on('request_global_online_statuses', () => socketManager.sendGlobalOnlineStatuses(socket));
  

  // Обработка отключения
  socket.on('disconnect', () => handleDisconnect(socket));
};

/**
 * Обработка отключения пользователя
 */
const handleDisconnect = (socket) => {
  console.log(`❌ User ${socket.user.name} disconnected: ${socket.id}`);

  // Обновляем время последней активности (отключено - нет таблицы User)
  // userService.updateLastSeen(socket.userId);

  // Уведомляем о том, что пользователь офлайн
  socketManager.notifyUserStatusChange(socket.userId, false);

  // Удаляем пользователя из реестра
  socketManager.unregisterUser(socket);
};

module.exports = { handleConnection };
