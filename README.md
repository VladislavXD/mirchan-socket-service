# Chat Socket Service

Микросервис для обработки WebSocket соединений чата через Socket.IO.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Создайте файл `.env`:

```bash
cp .env.example .env
```

Настройте переменные:

```env
PORT=3002
SECRET_KEY=your_jwt_secret_here
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

### 3. Запуск сервиса

```bash
# Разработка
npm run dev

# Продакшн
npm start
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "chat-socket-service",
  "connectedUsers": 42,
  "uptime": 12345.67
}
```

### Отправить событие пользователю
```http
POST /api/socket/emit
Content-Type: application/json

{
  "userId": "user123",
  "event": "notification",
  "data": { "message": "Hello!" }
}
```

### Получить онлайн пользователей
```http
GET /api/socket/online-users
```

Response:
```json
{
  "onlineUsers": ["user1", "user2"],
  "count": 2
}
```

### Проверить статус пользователя
```http
GET /api/socket/user-status/:userId
```

Response:
```json
{
  "userId": "user123",
  "isOnline": true
}
```

## 🔌 Socket.IO События

### Клиент → Сервер

| Событие | Данные | Описание |
|---------|--------|----------|
| `join_chat` | `{ chatId }` | Присоединиться к чату |
| `send_message` | `{ chatId, content }` | Отправить сообщение |
| `mark_as_read` | `{ messageIds, chatId }` | Отметить сообщения как прочитанные |
| `typing_start` | `{ chatId }` | Начать печатать |
| `typing_stop` | `{ chatId }` | Закончить печатать |

### Сервер → Клиент

| Событие | Данные | Описание |
|---------|--------|----------|
| `new_message` | `{ ...message, sender }` | Новое сообщение |
| `messages_read` | `{ messageIds, readBy, chatId }` | Сообщения прочитаны |
| `user_typing_start` | `{ userId, userName, chatId }` | Пользователь печатает |
| `user_typing_stop` | `{ userId, chatId }` | Пользователь закончил печатать |
| `user_status_change` | `{ userId, isOnline, chatId }` | Статус пользователя изменился |
| `joined_chat` | `{ chatId }` | Успешно присоединился к чату |
| `error` | `{ message }` | Ошибка |

## 🏗️ Архитектура

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│                 │         │                      │         │                 │
│  Next.js Client │◄───────►│  Socket.IO Service   │◄───────►│  Express API    │
│                 │  WS     │  (port 3002)         │  HTTP   │  (port 3001)    │
│                 │         │                      │         │                 │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
                                      │                               │
                                      │                               │
                                      └───────────┬───────────────────┘
                                                  │
                                            ┌─────▼──────┐
                                            │            │
                                            │  PostgreSQL│
                                            │            │
                                            └────────────┘
```

## 🔐 Аутентификация

Socket.IO использует JWT токен для аутентификации:

```javascript
const socket = io('http://localhost:3002', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

## 📦 Docker

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  chat-socket-service:
    build: .
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - SECRET_KEY=${SECRET_KEY}
      - API_URL=http://express-api:3001
      - FRONTEND_URL=${FRONTEND_URL}
    depends_on:
      - express-api
```

## 🚀 Деплой

### Vercel
Socket.IO не поддерживается на Vercel. Используйте Railway, Render или Fly.io.

### Railway
```bash
railway login
railway init
railway up
```

### Render
Создайте Web Service и укажите:
- Build Command: `npm install`
- Start Command: `npm start`

## 📊 Мониторинг

Метрики доступны на `/health`:
- Количество подключенных пользователей
- Время работы сервиса
- Статус сервиса

## 🔧 Настройка основного API

Обновите основной Express API для взаимодействия с Socket.IO сервисом:

```javascript
// express-api/utils/socketClient.js
const axios = require('axios');

const SOCKET_SERVICE_URL = process.env.SOCKET_SERVICE_URL || 'http://localhost:3002';

async function emitToUser(userId, event, data) {
  try {
    await axios.post(`${SOCKET_SERVICE_URL}/api/socket/emit`, {
      userId,
      event,
      data
    });
  } catch (error) {
    console.error('Failed to emit socket event:', error.message);
  }
}

async function getOnlineUsers() {
  try {
    const response = await axios.get(`${SOCKET_SERVICE_URL}/api/socket/online-users`);
    return response.data.onlineUsers;
  } catch (error) {
    console.error('Failed to get online users:', error.message);
    return [];
  }
}

module.exports = { emitToUser, getOnlineUsers };
```

## 📝 Лицензия

MIT
# mirchan-socket-service
