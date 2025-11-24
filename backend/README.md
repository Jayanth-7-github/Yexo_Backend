# Chat Application Backend

A production-ready backend for a mobile chat application with real-time messaging, end-to-end-like encryption, and comprehensive features similar to WhatsApp.

## 🚀 Features

- **User Authentication**: JWT-based authentication with access and refresh tokens
- **Real-time Messaging**: Socket.IO for instant message delivery
- **End-to-End-like Encryption**: AES-256-GCM encryption for all messages
- **One-to-One Chats**: Private conversations between users
- **Group Chats**: Create and manage group conversations with admin controls
- **Message Status**: Sent, delivered, and seen indicators
- **Typing Indicators**: Real-time typing status
- **Online/Offline Presence**: Track user availability
- **Media Support**: Upload and send images, videos, audio, and files
- **Security**: Helmet, CORS, rate limiting, input validation
- **Scalable Architecture**: Clean separation of concerns with services, controllers, and routes

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository** (if applicable)

2. **Navigate to the backend directory**

   ```bash
   cd backend
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set up environment variables**

   Copy `.env.example` to `.env`:

   ```bash
   copy .env.example .env
   ```

   Edit `.env` and configure:

   ```env
   PORT=5000
   NODE_ENV=development

   # MongoDB connection string
   MONGODB_URI=mongodb://localhost:27017/chat_app

   # JWT secrets (change these in production!)
   JWT_ACCESS_SECRET=your_strong_access_secret_here
   JWT_REFRESH_SECRET=your_strong_refresh_secret_here
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # Encryption key (MUST be exactly 32 characters)
   ENCRYPTION_KEY=your32characterencryptionkey123
   ENCRYPTION_IV_LENGTH=16

   # CORS origin (your frontend/mobile app URL)
   CORS_ORIGIN=http://localhost:3000

   # Logging
   LOG_LEVEL=info

   # File upload
   MAX_FILE_SIZE=10485760
   UPLOAD_PATH=./uploads
   ```

   **⚠️ IMPORTANT**: In production, use strong, randomly generated secrets!

5. **Start MongoDB**

   Make sure MongoDB is running on your system:

   ```bash
   # On Windows (if installed as service)
   net start MongoDB

   # Or run mongod directly
   mongod
   ```

## 🎯 Running the Application

### Development Mode

```bash
npm run dev
```

This runs the server with nodemon for auto-reloading on file changes.

### Production Mode

```bash
npm start
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure123",
  "email": "john@example.com",
  "phoneNumber": "+1234567890"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secure123"
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

#### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

#### Logout

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "..."
}
```

### User Endpoints

#### Search Users

```http
GET /api/users?q=john&limit=20
Authorization: Bearer {accessToken}
```

#### Get User Profile

```http
GET /api/users/:userId
Authorization: Bearer {accessToken}
```

#### Update Profile

```http
PATCH /api/users/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "statusMessage": "Available",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

### Chat Endpoints

#### Get All Chats

```http
GET /api/chats?page=1&limit=20
Authorization: Bearer {accessToken}
```

#### Create/Get One-to-One Chat

```http
POST /api/chats
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "64abc123..."
}
```

#### Get Chat Details

```http
GET /api/chats/:chatId
Authorization: Bearer {accessToken}
```

#### Delete Chat

```http
DELETE /api/chats/:chatId
Authorization: Bearer {accessToken}
```

### Message Endpoints

#### Get Messages

```http
GET /api/messages/:chatId?page=1&limit=20
Authorization: Bearer {accessToken}
```

#### Send Message

```http
POST /api/messages/:chatId
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "type": "text",
  "content": "Hello, World!"
}
```

#### Upload Media

```http
POST /api/messages/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [binary file data]
```

Returns file metadata to include in message.

#### Update Message Status

```http
PATCH /api/messages/:messageId/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "seen"
}
```

### Group Endpoints

#### Create Group

```http
POST /api/groups
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Project Team",
  "description": "Team discussion",
  "memberIds": ["64abc123...", "64def456..."]
}
```

#### Get User's Groups

```http
GET /api/groups
Authorization: Bearer {accessToken}
```

#### Get Group Details

```http
GET /api/groups/:groupId
Authorization: Bearer {accessToken}
```

#### Update Group

```http
PATCH /api/groups/:groupId
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "New description"
}
```

#### Add Members

```http
POST /api/groups/:groupId/members
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "memberIds": ["64abc123..."]
}
```

#### Remove Member

```http
DELETE /api/groups/:groupId/members/:memberId
Authorization: Bearer {accessToken}
```

#### Leave Group

```http
POST /api/groups/:groupId/leave
Authorization: Bearer {accessToken}
```

#### Make Admin

```http
POST /api/groups/:groupId/admins
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "userId": "64abc123..."
}
```

#### Delete Group

```http
DELETE /api/groups/:groupId
Authorization: Bearer {accessToken}
```

## 🔌 Socket.IO Events

### Client Connection

```javascript
const socket = io("http://localhost:5000", {
  auth: {
    token: "your_jwt_access_token",
  },
});
```

### Events

#### Join Chat Rooms

```javascript
socket.emit("join_chats", {
  chatIds: ["chatId1", "chatId2"],
});
```

#### Send Message

```javascript
socket.emit("send_message", {
  chatId: "chatId",
  type: "text",
  content: "Hello!",
});
```

#### Listen for New Messages

```javascript
socket.on("new_message", (message) => {
  console.log("New message:", message);
});
```

#### Typing Indicator

```javascript
// Start typing
socket.emit("typing", { chatId: "chatId", isTyping: true });

// Stop typing
socket.emit("stop_typing", { chatId: "chatId" });

// Listen for typing
socket.on("typing", (data) => {
  console.log(`${data.username} is typing in ${data.chatId}`);
});
```

#### Message Seen

```javascript
socket.emit("message_seen", {
  messageId: "msgId",
  chatId: "chatId",
});

socket.on("message_seen", (data) => {
  console.log("Message seen:", data);
});
```

#### Presence

```javascript
socket.on("user_online", (data) => {
  console.log("User online:", data.userId);
});

socket.on("user_offline", (data) => {
  console.log("User offline:", data.userId, data.lastSeenAt);
});
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── config.js     # Environment variables
│   │   └── db.js         # MongoDB connection
│   ├── models/           # Mongoose models
│   │   ├── User.js
│   │   ├── Chat.js
│   │   ├── Group.js
│   │   ├── Message.js
│   │   └── RefreshToken.js
│   ├── services/         # Business logic
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── chat.service.js
│   │   ├── message.service.js
│   │   ├── group.service.js
│   │   ├── encryption.service.js
│   │   └── file.service.js
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── chat.controller.js
│   │   ├── message.controller.js
│   │   └── group.controller.js
│   ├── routes/           # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── chat.routes.js
│   │   ├── message.routes.js
│   │   ├── group.routes.js
│   │   └── health.routes.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   ├── sockets/          # Socket.IO handlers
│   │   └── index.js
│   ├── utils/            # Utility functions
│   │   ├── logger.js
│   │   ├── response.js
│   │   ├── constants.js
│   │   └── cryptoHelpers.js
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── uploads/              # Uploaded files
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Message Encryption**: AES-256-GCM for message content
- **Rate Limiting**: Prevent abuse with configurable limits
- **Input Validation**: express-validator for request validation
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Error Handling**: Sanitized error messages in production

## 🧪 Testing

You can test the API using:

- Postman
- cURL
- Any HTTP client

For Socket.IO testing, use:

- Socket.IO client library
- Postman (supports WebSocket)
- Online tools like https://amritb.github.io/socketio-client-tool/

## 📝 Notes

### Encryption

All message content is encrypted using AES-256-GCM before storage. Each message has:

- `contentEncrypted`: The encrypted message
- `iv`: Initialization vector (unique per message)
- `authTag`: Authentication tag for GCM mode

Messages are automatically decrypted when retrieved via API or Socket.IO.

### Message Status Flow

1. **sent**: Message created and saved
2. **delivered**: Message delivered to recipient's device
3. **seen**: Message viewed by recipient

### File Uploads

Files are stored locally in the `uploads/` directory. For production, consider using cloud storage (AWS S3, Azure Blob, etc.) and update `FileService`.

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, random secrets for JWT and encryption
3. Use a production MongoDB instance (MongoDB Atlas, etc.)
4. Enable HTTPS
5. Use a process manager (PM2, systemd)
6. Set up proper logging and monitoring
7. Configure reverse proxy (Nginx, Apache)
8. Use cloud storage for file uploads
9. Implement backup strategies

## 📄 License

ISC

## 👥 Support

For issues or questions, please create an issue in the repository.

---

**Built with ❤️ using Node.js, Express, MongoDB, and Socket.IO**
