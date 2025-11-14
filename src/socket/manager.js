const chatService = require('../services/chat.service');
const messageService = require('../services/message.service');
const userService = require('../services/user.service');

/**
 * Менеджер Socket.IO соединений и событий
 */
class SocketManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
  }

  /**
   * Инициализация Socket.IO сервера
   */
  init(io) {
    this.io = io;
    console.log('✅ SocketManager initialized');
  }

  /**
   * Регистрация пользователя при подключении
   */
  registerUser(socket) {
    this.userSockets.set(socket.userId, socket.id);
    this.socketUsers.set(socket.id, socket.userId);
    console.log(`📝 Registered user ${socket.user.name} (${socket.id})`);
  }

  /**
   * Удаление пользователя при отключении
   */
  unregisterUser(socket) {
    this.userSockets.delete(socket.userId);
    this.socketUsers.delete(socket.id);
    console.log(`📝 Unregistered user ${socket.user.name} (${socket.id})`);
  }

  /**
   * Присоединить пользователя ко всем его чатам
   */
  async joinUserChats(socket) {
    try {
      const userChats = await chatService.getUserChats(socket.userId);

      userChats.forEach(chat => {
        socket.join(`chat_${chat.id}`);
      });

      console.log(`✅ User ${socket.user.name} joined ${userChats.length} chats`);
    } catch (error) {
      console.error('❌ Error joining user chats:', error);
    }
  }

  /**
   * Присоединиться к конкретному чату
   */
  async handleJoinChat(socket, data) {
    try {
      const { chatId } = data;

      const chat = await chatService.getChatById(chatId, socket.userId);

      if (!chat) {
        socket.emit('error', { message: 'Chat not found or access denied' });
        return;
      }

      socket.join(`chat_${chatId}`);
      socket.emit('joined_chat', { chatId });

      console.log(`✅ User ${socket.user.name} joined chat ${chatId}`);
    } catch (error) {
      console.error('❌ Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  }

  /**
   * Отправить сообщение в чат
   */
  async handleSendMessage(socket, data) {
    try {
      const { chatId, content } = data;

      // Обновляем активность пользователя
      userService.updateLastSeen(socket.userId);

      // Проверяем доступ и создаем сообщение
      const [chat, message] = await Promise.all([
        chatService.getChatById(chatId, socket.userId),
        messageService.createMessage({ content, senderId: socket.userId, chatId })
      ]);

      if (!chat) {
        socket.emit('error', { message: 'Chat not found or access denied' });
        return;
      }

      // Подготавливаем сообщение для отправки
      const messageWithSender = {
        ...message,
        createdAt: message.createdAt.toISOString(),
        sender: socket.user
      };

      // Отправляем всем участникам чата
      this.io.to(`chat_${chatId}`).emit('new_message', messageWithSender);

      // Асинхронно обновляем последнее сообщение
      chatService.updateLastMessage(chatId, content);

      console.log(`📨 Message sent in chat ${chatId} by ${socket.user.name}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Отметить сообщения как прочитанные
   */
  async handleMarkAsRead(socket, data) {
    try {
      const { messageIds } = data;

      await messageService.markMessagesAsRead(messageIds, socket.userId);

      // Уведомляем отправителей о прочтении
      for (const messageId of messageIds) {
        const message = await messageService.getMessageById(messageId);

        if (message && message.senderId !== socket.userId) {
          const senderSocketId = this.userSockets.get(message.senderId);
          if (senderSocketId) {
            this.io.to(senderSocketId).emit('message_read', {
              messageId,
              readBy: socket.userId,
              chatId: message.chatId
            });
          }
        }
      }

      console.log(`✅ Messages marked as read by ${socket.user.name}`);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }

  /**
   * Обработка начала печати
   */
  handleTypingStart(socket, data) {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('user_typing_start', {
      userId: socket.userId,
      userName: socket.user.name,
      chatId
    });
  }

  /**
   * Обработка окончания печати
   */
  handleTypingStop(socket, data) {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('user_typing_stop', {
      userId: socket.userId,
      chatId
    });
  }

  /**
   * Отправить сообщение конкретному пользователю
   */
  sendToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Получить список онлайн пользователей
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Проверить, онлайн ли пользователь
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  /**
   * Уведомить участников чатов об изменении статуса
   */
  async notifyUserStatusChange(userId, isOnline) {
    try {
      const userChats = await chatService.getUserChats(userId);

      userChats.forEach(chat => {
        this.io.to(`chat_${chat.id}`).emit('user_status_change', {
          userId,
          isOnline,
          chatId: chat.id
        });
      });

      console.log(`📡 Status change notified: User ${userId} is ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('❌ Error notifying user status change:', error);
    }
  }
}

module.exports = new SocketManager();
