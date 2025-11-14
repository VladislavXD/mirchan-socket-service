const { getPrismaClient } = require('../config/database');

class UserService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Обновить время последней активности
   */
  async updateLastSeen(userId) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      });
    } catch (error) {
      console.error('Error updating user last seen:', error);
    }
  }

  /**
   * Получить пользователя по ID
   */
  async getUserById(userId) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        avatarUrl: true,
        lastSeen: true
      }
    });
  }
}

module.exports = new UserService();
