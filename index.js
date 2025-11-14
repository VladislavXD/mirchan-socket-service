const { createServer } = require('http');
const app = require('./src/app');
const config = require('./src/config');
const { initializeSocket } = require('./src/socket');

// Создаем HTTP сервер
const httpServer = createServer(app);

// Инициализируем Socket.IO
const io = initializeSocket(httpServer);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, closing server...');
  
  io.close(() => {
    console.log('✅ Socket.IO server closed');
  });

  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Запуск сервера
httpServer.listen(config.port, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🚀 Chat Socket Service                  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Socket.IO: ws://localhost:${config.port}`);
  console.log(`🌐 HTTP API:  http://localhost:${config.port}`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /health              - Health check`);
  console.log(`  GET  /users/online        - Online users list`);
  console.log(`  GET  /users/:id/status    - User online status`);
  console.log(`  POST /users/status/bulk   - Bulk status check`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('─'.repeat(46));
});

module.exports = { httpServer, io };
