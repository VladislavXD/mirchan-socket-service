# Chat Socket Service - Архитектура проекта

## 📁 Структура файлов

```
chat-socket-service/
├── index.js                    # Точка входа, запуск сервера
├── package.json                # Зависимости и скрипты
├── .env                        # Переменные окружения
├── prisma/
│   └── schema.prisma          # Prisma схема (копия из express-api)
└── src/
    ├── app.js                 # Express приложение
    ├── config/
    │   ├── index.js          # Конфигурация (env переменные)
    │   └── database.js       # Singleton Prisma Client
    ├── middleware/
    │   └── auth.js           # JWT аутентификация для Socket.IO
    ├── services/
    │   ├── chat.service.js   # Работа с чатами (БД)
    │   ├── message.service.js # Работа с сообщениями (БД)
    │   └── user.service.js   # Работа с пользователями (БД)
    ├── socket/
    │   ├── index.js          # Инициализация Socket.IO
    │   ├── manager.js        # SocketManager - управление соединениями
    │   └── handlers.js       # Обработчики событий Socket.IO
    └── routes/
        └── index.js          # HTTP API маршруты
```

## 🏗️ Архитектурные принципы

### 1. **Разделение ответственности (SoC)**

Каждый модуль отвечает за свою область:

- **Config**: Конфигурация и переменные окружения
- **Middleware**: Проверка токенов и аутентификация
- **Services**: Бизнес-логика и работа с БД
- **Socket**: Управление WebSocket соединениями
- **Routes**: HTTP API endpoints

### 2. **Singleton Pattern**

- **Prisma Client** (`src/config/database.js`) - единственный экземпляр для всего приложения
- **SocketManager** (`src/socket/manager.js`) - единственный менеджер соединений
- **Services** - все сервисы экспортируются как синглтоны

### 3. **Dependency Injection**

Сервисы получают зависимости через импорты, а не создают их сами:

```javascript
// ❌ Плохо
class ChatService {
  constructor() {
    this.prisma = new PrismaClient(); // Создаем каждый раз
  }
}

// ✅ Хорошо
const { getPrismaClient } = require('../config/database');
class ChatService {
  constructor() {
    this.prisma = getPrismaClient(); // Используем синглтон
  }
}
```

### 4. **Graceful Shutdown**

Корректное завершение работы при получении SIGTERM:

1. Закрываем Socket.IO соединения
2. Закрываем HTTP сервер
3. Prisma автоматически отключается от БД

## 📝 Описание модулей

### Config (`src/config/`)

**index.js**: Централизованная конфигурация с валидацией:
```javascript
const config = {
  port: 3002,
  secretKey: 'musiya',
  corsOrigins: [...],
  nodeEnv: 'development'
};
```

**database.js**: Singleton Prisma Client с автоматическим отключением.

### Middleware (`src/middleware/`)

**auth.js**: Socket.IO middleware для JWT аутентификации:
- Проверяет токен из `socket.handshake.auth.token`
- Загружает пользователя из БД
- Прикрепляет `socket.userId` и `socket.user`

### Services (`src/services/`)

Изолированные модули для работы с БД:

**chat.service.js**:
- `getUserChats(userId)` - чаты пользователя
- `getChatById(chatId, userId)` - чат с проверкой доступа
- `updateLastMessage(chatId, content)` - обновление последнего сообщения

**message.service.js**:
- `createMessage(data)` - создание сообщения
- `getMessageById(messageId)` - получение сообщения
- `markMessagesAsRead(messageIds, userId)` - отметка прочитанных

**user.service.js**:
- `updateLastSeen(userId)` - обновление активности
- `getUserById(userId)` - получение пользователя

### Socket (`src/socket/`)

**index.js**: Инициализация Socket.IO с CORS и middleware.

**manager.js**: Центральный менеджер соединений:
- `userSockets` - Map userId → socketId
- `socketUsers` - Map socketId → userId
- Методы: `registerUser`, `joinUserChats`, `handleSendMessage`, `isUserOnline`, etc.

**handlers.js**: Обработчики событий:
- `handleConnection` - новое подключение
- `handleDisconnect` - отключение пользователя

### Routes (`src/routes/`)

**index.js**: HTTP API для внешних сервисов:
- `GET /health` - статус сервиса
- `GET /users/online` - список онлайн пользователей
- `GET /users/:userId/status` - статус пользователя
- `POST /users/status/bulk` - массовая проверка статусов

## 🔄 Поток данных

### Подключение пользователя
```
Client → Socket.IO
         ↓
   auth middleware (проверка JWT)
         ↓
   handleConnection (handlers.js)
         ↓
   SocketManager.registerUser
         ↓
   ChatService.getUserChats
         ↓
   socket.join('chat_xxx')
         ↓
   SocketManager.notifyUserStatusChange
```

### Отправка сообщения
```
Client emit('send_message')
         ↓
   SocketManager.handleSendMessage
         ↓
   ChatService.getChatById (проверка доступа)
         ↓
   MessageService.createMessage
         ↓
   io.to('chat_xxx').emit('new_message')
         ↓
   ChatService.updateLastMessage (async)
```

## 🚀 Запуск

```bash
# Development
npm run dev

# Production
npm start

# Prisma
npm run prisma:generate
```

## 🧪 Тестирование endpoints

```bash
# Health check
curl http://localhost:3002/health

# Online users
curl http://localhost:3002/users/online

# User status
curl http://localhost:3002/users/USER_ID/status

# Bulk status check
curl -X POST http://localhost:3002/users/status/bulk \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["id1", "id2"]}'
```

## 📊 Преимущества новой архитектуры

### ✅ До рефакторинга
- ❌ Один файл 400+ строк
- ❌ Смешанная логика (Socket.IO + HTTP + БД)
- ❌ Сложно тестировать
- ❌ Сложно масштабировать

### ✅ После рефакторинга
- ✅ Модульная структура (8 файлов)
- ✅ Разделение ответственности
- ✅ Легко тестировать каждый модуль
- ✅ Легко добавлять новые функции
- ✅ Готово к масштабированию

## 🔧 Расширение функционала

### Добавление нового события Socket.IO

1. Создать метод в `SocketManager` (`src/socket/manager.js`):
```javascript
handleNewEvent(socket, data) {
  // Логика обработки
}
```

2. Зарегистрировать в `handlers.js`:
```javascript
socket.on('new_event', (data) => socketManager.handleNewEvent(socket, data));
```

### Добавление нового HTTP endpoint

Добавить маршрут в `src/routes/index.js`:
```javascript
router.get('/new-endpoint', (req, res) => {
  // Логика
  res.json({ result: 'ok' });
});
```

### Добавление нового сервиса

Создать файл `src/services/new.service.js`:
```javascript
const { getPrismaClient } = require('../config/database');

class NewService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async someMethod() {
    return this.prisma.model.findMany();
  }
}

module.exports = new NewService();
```

## 🐛 Debugging

Логи выводятся с эмодзи для удобства:
- ✅ Успешные операции
- ❌ Ошибки
- 📝 Регистрация пользователей
- 📨 Отправка сообщений
- 📡 Изменение статусов

Пример:
```
✅ User Caesar Consulting connected: vtxsYhlXWyykSMw9AAAF
📝 Registered user Caesar Consulting (vtxsYhlXWyykSMw9AAAF)
✅ User Caesar Consulting joined 4 chats
📡 Status change notified: User 68b70c... is online
```

## 📚 Дополнительные материалы

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
