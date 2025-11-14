const { getPrismaClient } = require('../config/database');

class ChatService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Получить все чаты пользователя
   */
  async getUserChats(userId) {
    return this.prisma.chat.findMany({
      where: {
        participants: {
          has: userId
        }
      },
      select: { id: true }
    });
  }

  /**
   * Получить чат по ID с проверкой доступа
   */
  async getChatById(chatId, userId) {
    return this.prisma.chat.findFirst({
      where: {
        id: chatId,
        participants: {
          has: userId
        }
      }
    });
  }

  /**
   * Обновить последнее сообщение в чате
   */
  async updateLastMessage(chatId, content) {
    return this.prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessage: content,
        lastMessageAt: new Date()
      }
    }).catch(error => {
      console.error('Error updating chat last message:', error);
      return null;
    });
  }
}

module.exports = new ChatService();
