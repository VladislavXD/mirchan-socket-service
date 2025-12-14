require('dotenv').config();

const config = {
  port: process.env.PORT || 3002,
  secretKey: process.env.SECRET_KEY || 'default_secret',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:4000', // NestJS API для проверки сессий
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Redis Configuration
  redisUri: process.env.REDIS_URI || 'redis://localhost:6379',
  
  // Session Configuration (must match NestJS)
  sessionSecret: process.env.SESSION_SECRET || 'QPRJDQPD',
  sessionName: process.env.SESSION_NAME || 'session',
  sessionFolder: process.env.SESSION_FOLDER || 'sessions:',
  
  // CORS origins
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://mirchan.netlify.app',
    'https://mirchan-express-api.vercel.app',
    "https://mirchan-nest-server.vercel.app",
    'https://mirchan.site',
    'https://mirchan.site/',
    'mirchan.site',
    process.env.FRONTEND_URL
  ].filter(Boolean),
};

// Валидация обязательных переменных
const requiredEnvVars = ['SECRET_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

module.exports = config;
