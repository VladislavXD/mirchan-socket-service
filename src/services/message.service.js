const { getPrismaClient } = require('../config/database');

class MessageService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Создать новое сообщение
   */
  async createMessage(data) {
    const { content, senderId, chatId } = data;
    
    return this.prisma.message.create({
      data: {
        content,
        senderId,
        chatId
      }
    });
  }

  /**
   * Получить сообщение по ID
   */
  async getMessageById(messageId) {
    return this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, chatId: true }
    });
  }

  /**
   * Отметить сообщения как прочитанные
   */
  async markMessagesAsRead(messageIds, currentUserId) {
    return this.prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        senderId: { not: currentUserId } // Не отмечаем свои сообщения
      },
      data: {
        isRead: true
      }
    });
  }
}

module.exports = new MessageService();
