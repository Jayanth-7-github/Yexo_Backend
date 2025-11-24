# Socket.IO API Documentation

## Connection

### Authentication

Connect to Socket.IO with JWT token:

```javascript
import io from "socket.io-client";

const token = localStorage.getItem("accessToken");
const socket = io("http://localhost:8081", {
  auth: { token }, // or query: { token }
});
```

### Events to Listen

#### `authenticated`

Emitted when connection is successful

```javascript
socket.on("authenticated", (data) => {
  console.log("Connected:", data);
  // { userId, socketId, timestamp }
});
```

#### `error`

Emitted on any error

```javascript
socket.on("error", (data) => {
  console.error("Socket error:", data.message);
});
```

---

## Chat Rooms

### Join Chats

Join multiple chat rooms to receive messages

**Emit:**

```javascript
socket.emit("join_chats", {
  chatIds: ["chatId1", "chatId2", "chatId3"],
});
```

**Listen for acknowledgment:**

```javascript
socket.on("chats_joined", (data) => {
  console.log("Successfully joined:", data.joined);
  console.log("Failed to join:", data.failed);
  // { joined: ['id1', 'id2'], failed: [], timestamp }
});
```

---

## Messaging

### Send Message

Send a message in a chat

**Emit:**

```javascript
socket.emit("send_message", {
  chatId: "chatId123",
  content: "Hello world!",
  type: "text", // optional: text|image|video|audio|file
  meta: {}, // optional: metadata for media messages
});
```

**Listen for acknowledgment:**

```javascript
socket.on("message_sent", (data) => {
  console.log("Message sent successfully:", data.message);
  // { success: true, message: {...}, timestamp }
});
```

### Receive Messages

Listen for new messages from others (and your own messages)

```javascript
socket.on("new_message", (message) => {
  console.log("New message:", message);
  // {
  //   _id, chat, sender: { _id, username, avatarUrl },
  //   type, content, meta, status,
  //   sentAt, deliveredAt, seenAt, seenBy
  // }

  // Note: content is DECRYPTED on the backend
  // Display it directly in your UI
});
```

### Mark Message as Seen

Mark a specific message as seen

**Emit:**

```javascript
socket.emit("message_seen", {
  messageId: "msgId123",
  chatId: "chatId123",
});
```

**Listen for acknowledgment:**

```javascript
socket.on("message_seen", (data) => {
  console.log("Message marked as seen:", data);
  // { messageId, chatId, userId, seenAt }
});
```

---

## Typing Indicators

### Start Typing

```javascript
socket.emit("typing", {
  chatId: "chatId123",
  isTyping: true,
});
```

### Stop Typing

```javascript
socket.emit("stop_typing", {
  chatId: "chatId123",
});
```

### Listen for Typing

```javascript
socket.on("typing", (data) => {
  console.log(`${data.username} is typing in chat ${data.chatId}`);
  // { chatId, userId, username, isTyping }
});

socket.on("stop_typing", (data) => {
  console.log(`${data.username} stopped typing`);
  // { chatId, userId, username }
});
```

---

## Presence

### User Online/Offline

```javascript
socket.on("user_online", (data) => {
  console.log(`User ${data.userId} is online`);
  // { userId, timestamp }
});

socket.on("user_offline", (data) => {
  console.log(`User ${data.userId} is offline`);
  // { userId, lastSeenAt }
});
```

---

## REST API Endpoints

### Get Messages

```
GET /api/messages/:chatId?page=1&limit=20&before=2024-01-01T00:00:00Z
Authorization: Bearer <token>
```

### Send Message (REST alternative)

```
POST /api/messages/:chatId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello!",
  "type": "text",
  "meta": {}
}
```

### Mark Single Message Status

```
PATCH /api/messages/:messageId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "seen"  // or "delivered"
}
```

### Mark All Messages as Seen in Chat

```
PATCH /api/messages/chat/:chatId/mark-seen
Authorization: Bearer <token>
```

**Use this endpoint when:**

- User opens a chat
- User returns to a chat from background
- You want to mark all unread messages as read at once

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 5
  },
  "message": "Messages marked as seen"
}
```

### Upload Media (Single File)

```
POST /api/messages/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fileName": "image.jpg",
    "fileUrl": "/uploads/image-1234567890-abc123.jpg",
    "fileSize": 102400,
    "mimeType": "image/jpeg",
    "type": "image"
  },
  "message": "File uploaded successfully"
}
```

### Upload Multiple Files

```
POST /api/messages/upload-multiple
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <binary>  (multiple files, max 10)
```

**Example using Axios:**

```javascript
const formData = new FormData();
formData.append("files", file1);
formData.append("files", file2);
formData.append("files", file3);

const response = await axios.post("/api/messages/upload-multiple", formData, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "multipart/form-data",
  },
});
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "fileName": "image1.jpg",
      "fileUrl": "/uploads/image1-1234567890-abc123.jpg",
      "fileSize": 102400,
      "mimeType": "image/jpeg",
      "type": "image"
    },
    {
      "fileName": "video.mp4",
      "fileUrl": "/uploads/video-1234567891-def456.mp4",
      "fileSize": 2048000,
      "mimeType": "video/mp4",
      "type": "video"
    }
  ],
  "message": "2 files uploaded successfully"
}
```

### Delete Message

```
DELETE /api/messages/:messageId
Authorization: Bearer <token>
```

---

## Important Notes

### ✅ Encryption

- Messages are **automatically encrypted** on the backend using AES-256-GCM
- Messages are **automatically decrypted** when retrieved
- The `content` field you receive is already decrypted - display it directly
- You don't need to handle encryption/decryption on the frontend

### ✅ Message Flow

1. User sends message via `send_message` socket event
2. Backend encrypts and saves message
3. Backend emits `new_message` to all participants (including sender)
4. Backend emits `message_sent` acknowledgment to sender
5. Other users receive `new_message` event with decrypted content

### ✅ Chat Room Management

- Auto-join: If you send a message without joining, you'll be auto-joined
- Best practice: Emit `join_chats` when app starts with all user's chat IDs
- Rejoin after reconnection to ensure message delivery

### ✅ Error Handling

Always listen for the `error` event:

```javascript
socket.on("error", (data) => {
  // Handle: authentication failures, authorization errors, validation errors
  console.error(data.message);
});
```

---

## Example Complete Implementation

```javascript
import io from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    this.socket = io("http://localhost:8081", {
      auth: { token },
    });

    // Connection events
    this.socket.on("authenticated", (data) => {
      console.log("Connected:", data.userId);
      this.joinUserChats();
    });

    // Message events
    this.socket.on("new_message", (message) => {
      // Add message to chat UI
      this.handleNewMessage(message);
    });

    this.socket.on("message_sent", (data) => {
      // Update UI with sent message
      console.log("Message sent:", data.message);
    });

    // Typing events
    this.socket.on("typing", (data) => {
      // Show typing indicator
    });

    this.socket.on("stop_typing", (data) => {
      // Hide typing indicator
    });

    // Presence events
    this.socket.on("user_online", (data) => {
      // Update user status to online
    });

    this.socket.on("user_offline", (data) => {
      // Update user status to offline
    });

    // Error handling
    this.socket.on("error", (data) => {
      console.error("Socket error:", data.message);
    });
  }

  joinUserChats() {
    // Get user's chat IDs from your state/store
    const chatIds = ["chat1", "chat2", "chat3"];
    this.socket.emit("join_chats", { chatIds });

    this.socket.on("chats_joined", (data) => {
      console.log("Joined chats:", data.joined);
    });
  }

  sendMessage(chatId, content, type = "text") {
    this.socket.emit("send_message", {
      chatId,
      content,
      type,
    });
  }

  markAsSeen(messageId, chatId) {
    this.socket.emit("message_seen", {
      messageId,
      chatId,
    });
  }

  startTyping(chatId) {
    this.socket.emit("typing", { chatId, isTyping: true });
  }

  stopTyping(chatId) {
    this.socket.emit("stop_typing", { chatId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
```
