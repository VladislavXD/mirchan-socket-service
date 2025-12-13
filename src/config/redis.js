const { createClient } = require('redis');
const config = require('./index');

let redisClient = null;

/**
 * Получить или создать Redis клиент
 */
async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    url: config.redisUri
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Получить сессию из Redis
 * @param {string} sessionId - ID сессии (из cookie)
 * @returns {Promise<object|null>} - Данные сессии или null
 */
async function getSession(sessionId) {
  try {
    const client = await getRedisClient();
    const sessionKey = `${config.sessionFolder}${sessionId}`;
    
    const sessionData = await client.get(sessionKey);
    
    if (!sessionData) {
      console.log('⚠️  Session not found in Redis:', sessionKey);
      return null;
    }

    // Парсим JSON данные сессии
    const session = JSON.parse(sessionData);
    console.log('✅ Session found in Redis:', { 
      sessionId, 
      userId: session.userId,
      hasUserId: !!session.userId 
    });
    
    return session;
  } catch (error) {
    console.error('❌ Error getting session from Redis:', error.message);
    return null;
  }
}

/**
 * Получить кэшированные данные пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<object|null>} - Данные пользователя или null
 */
async function getCachedUserData(userId) {
  try {
    const client = await getRedisClient();
    const userKey = `user:${userId}`;
    
    const userData = await client.get(userKey);
    
    if (!userData) {
      console.log('⚠️  User data not found in Redis cache:', userKey);
      return null;
    }

    // Парсим JSON данные пользователя
    const user = JSON.parse(userData);
    
    // Преобразуем lastSeen обратно в Date
    if (user.lastSeen) {
      user.lastSeen = new Date(user.lastSeen);
    }
    
    console.log('✅ User data found in Redis cache:', { 
      userId, 
      name: user.name,
      email: user.email 
    });
    
    return user;
  } catch (error) {
    console.error('❌ Error getting user data from Redis cache:', error.message);
    return null;
  }
}

/**
 * Закрыть Redis соединение
 */
async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('👋 Redis connection closed');
  }
}

module.exports = {
  getRedisClient,
  getSession,
  getCachedUserData,
  closeRedis
};
