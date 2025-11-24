# Quick Start Guide

## Installation & Setup (5 minutes)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy example env file
copy .env.example .env

# Edit .env with your settings
notepad .env
```

**Minimum required changes in .env:**

- `MONGODB_URI` - Your MongoDB connection string
- `JWT_ACCESS_SECRET` - Change to a strong random string
- `JWT_REFRESH_SECRET` - Change to a different strong random string
- `ENCRYPTION_KEY` - Must be EXACTLY 32 characters

### 3. Start MongoDB

```bash
# If MongoDB is installed as a service
net start MongoDB

# Or run mongod directly
mongod
```

### 4. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will be running at: `http://localhost:5000`

## Quick Test

### 1. Health Check

```bash
curl http://localhost:5000/api/health
```

### 2. Register User

```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"test123\"}"
```

### 3. Login

```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"test123\"}"
```

Save the `accessToken` from the response!

### 4. Get Your Profile

```bash
curl http://localhost:5000/api/auth/me ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Next Steps

1. **Test with Postman**: Import the API endpoints
2. **Socket.IO Testing**: Use a Socket.IO client to test real-time features
3. **Create More Users**: Register multiple users to test chats
4. **Test Chat Features**: Create chats, send messages, create groups

## Common Issues

### MongoDB Connection Failed

- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify MongoDB is listening on the correct port

### Port Already in Use

- Change PORT in .env to another value (e.g., 5001)
- Or stop the process using port 5000

### JWT Token Invalid

- Make sure Authorization header format is: `Bearer YOUR_TOKEN`
- Token expires after 15 minutes by default (configurable)

### File Upload Errors

- Ensure `uploads/` directory exists
- Check MAX_FILE_SIZE in .env
- Verify file type is allowed (see file.service.js)

## Production Checklist

Before deploying to production:

- [ ] Change all JWT secrets to strong random values
- [ ] Change ENCRYPTION_KEY to a secure 32-character key
- [ ] Set NODE_ENV=production
- [ ] Use production MongoDB (Atlas, etc.)
- [ ] Enable HTTPS
- [ ] Configure CORS_ORIGIN to your frontend domain
- [ ] Set up process manager (PM2)
- [ ] Configure logging and monitoring
- [ ] Set up automated backups
- [ ] Use cloud storage for uploads (AWS S3, etc.)

## API Documentation

Full API documentation is in `README.md`

## Support

For detailed documentation, see:

- `README.md` - Complete API documentation
- `src/` - Well-commented source code
- Environment variables in `.env.example`

Happy coding! 🚀
