const axios = require('axios');
const config = require('../config');
const { getPrismaClient } = require('../config/database');
const { getSession, getCachedUserData } = require('../config/redis');

/**
 * Извлечь sessionId из cookie строки
 * @param {string} cookieString - Строка cookies из заголовка
 * @param {string} cookieName - Имя cookie для поиска
 * @returns {string|null} - Значение cookie или null
 */
function extractSessionId(cookieString, cookieName) {
  if (!cookieString) return null;
  
  const match = cookieString.match(new RegExp(`${cookieName}=s%3A([^;.]+)`));
  if (match) {
    return match[1]; // Возвращаем sessionId без подписи
  }
  
  // Если cookie не подписан
  const simpleMatch = cookieString.match(new RegExp(`${cookieName}=([^;]+)`));
  return simpleMatch ? simpleMatch[1] : null;
}

/**
 * Socket.IO authentication middleware
 * Используется только Session Cookie с Redis
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie;

    console.log('� Socket.IO auth attempt:', {
      hasCookies: !!cookies,
      cookies: cookies?.substring(0, 100) + '...'
    });
    
    if (!cookies) {
      console.error('❌ No cookies provided');
      return next(new Error('Authentication error: No credentials provided'));
    }

    let userId = null;
    let user = null;

    // Стратегия: Пробуем получить session из Redis (основной метод)
    if (cookies) {
      try {
        const sessionId = extractSessionId(cookies, config.sessionName);
        console.log('🔍 Extracted sessionId from cookie:', sessionId);
        
        if (sessionId) {
          const session = await getSession(sessionId);
          
          if (session && session.userId) {
            userId = session.userId;
            console.log('✅ User ID from Redis session:', userId);
          } else {
            console.log('⚠️  Session exists but no userId found');
          }
        } else {
          console.log('⚠️  Could not extract sessionId from cookies');
        }
      } catch (redisError) {
        console.log('⚠️  Redis session error:', redisError.message);
      }
    }

    // Если нет userId, пробуем верифицировать сессию через NestJS API (резерв)
    if (!userId && config.apiUrl && cookies) {
      try {
        console.log('🔍 Trying to verify session via NestJS API...');
        
        // Запрашиваем у NestJS API информацию о текущем пользователе
        const response = await axios.get(`${config.apiUrl}/auth/me`, {
          headers: {
            'Cookie': cookies || '',
            'User-Agent': 'Socket.IO-Service'
          },
          timeout: 3000,
          withCredentials: true
        });

        if (response.data && response.data.id) {
          user = response.data;
          userId = user.id;
          console.log('✅ Session verified via NestJS API:', userId, user.email);
        }
      } catch (apiError) {
        console.log('⚠️  Failed to verify session via API:', apiError.message);
        
        // Если endpoint /auth/me не существует, пробуем /auth/profile
        try {
          const profileResponse = await axios.get(`${config.apiUrl}/auth/profile`, {
            headers: {
              'Cookie': cookies || ''
            },
            timeout: 3000
          });
          
          if (profileResponse.data && profileResponse.data.id) {
            user = profileResponse.data;
            userId = user.id;
            console.log('✅ Session verified via /auth/profile:', userId);
          }
        } catch (profileError) {
          console.log('⚠️  Failed /auth/profile:', profileError.message);
        }
      }
    }

    // Если так и не получили userId, отклоняем
    if (!userId) {
      console.error('❌ Could not authenticate user');
      return next(new Error('Authentication error: Invalid credentials'));
    }

    // Если пользователь уже загружен из NestJS API, используем его
    // Если нет, получаем данные пользователя из Redis кэша
    if (!user && userId) {
      try {
        console.log('🔍 Getting user data from Redis cache...');
        
        // Пробуем получить данные из Redis кэша
        const cachedUserData = await getCachedUserData(userId);
        
        if (cachedUserData) {
          user = cachedUserData;
          console.log('✅ User data loaded from Redis cache:', user.name || user.email);
        } else {
          console.log('⚠️  User data not found in Redis cache');
          
          // Fallback: получаем данные пользователя из NestJS API
          if (config.apiUrl && cookies) {
            try {
              console.log('🔍 Getting user data from NestJS API...');
              
              const apiResponse = await axios.get(`${config.apiUrl}/auth/me`, {
                headers: {
                  'Cookie': cookies || '',
                  'User-Agent': 'Socket.IO-Service'
                },
                timeout: 3000,
                withCredentials: true
              });

              if (apiResponse.data && apiResponse.data.id) {
                user = {
                  id: apiResponse.data.id,
                  name: apiResponse.data.name || apiResponse.data.username || 'Unknown',
                  email: apiResponse.data.email,
                  avatarUrl: apiResponse.data.avatarUrl,
                  lastSeen: apiResponse.data.lastSeen ? new Date(apiResponse.data.lastSeen) : new Date()
                };
                console.log('✅ User data loaded from NestJS API:', user.name || user.email);
              }
            } catch (apiError) {
              console.log('⚠️  Failed to load user data from NestJS API:', apiError.message);
            }
          }
        }
      } catch (cacheError) {
        console.log('⚠️  Failed to load user data from Redis cache:', cacheError.message);
      }
    }

    // Если все еще нет данных пользователя, создаем минимальный объект
    if (!user) {
      user = {
        id: userId,
        name: 'Unknown', // Временно, пока не загрузятся данные
        email: 'unknown@example.com',
        avatarUrl: null,
        lastSeen: new Date()
      };
      console.log('✅ Created minimal user object:', userId);
    }

    console.log('✅ User authenticated:', user.id, user.name || user.email);

    // Прикрепляем данные пользователя к socket
    socket.userId = user.id;
    socket.user = user;
    
    next();
  } catch (error) {
    console.error('❌ Socket authentication error:', error.message);
    console.error('   Stack:', error.stack);
    next(new Error('Authentication error: ' + error.message));
  }
};

module.exports = { socketAuthMiddleware };
