# Calendar Backend - Authentication API

A secure authentication backend with MongoDB and Express.js featuring signup/login with phone number and email, with non-expiring JWT tokens.

## Features

- ✅ User signup with phone number, email, and password
- ✅ Unique validation for both phone number and email
- ✅ Secure password hashing with bcrypt
- ✅ Login using phone number and password
- ✅ JWT tokens that never expire
- ✅ Protected routes with authentication middleware

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or connection URI)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update `MONGODB_URI` if needed
   - Change `JWT_SECRET` to a secure random string

3. Make sure MongoDB is running:
```bash
# If using local MongoDB
mongod
```

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### 1. Signup
**POST** `/api/auth/signup`

**Request Body:**
```json
{
  "phoneNumber": "1234567890",
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "phoneNumber": "1234567890",
      "email": "user@example.com",
      "createdAt": "2026-01-01T03:13:45.000Z"
    }
  }
}
```

### 2. Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "phoneNumber": "1234567890",
  "password": "password123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "phoneNumber": "1234567890",
      "email": "user@example.com",
      "createdAt": "2026-01-01T03:13:45.000Z"
    }
  }
}
```

### 3. Get Current User (Protected)
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer your_jwt_token
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "phoneNumber": "1234567890",
      "email": "user@example.com",
      "createdAt": "2026-01-01T03:13:45.000Z"
    }
  }
}
```

## Testing with cURL

### Signup:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"1234567890","email":"user@example.com","password":"password123"}'
```

### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"1234567890","password":"password123"}'
```

### Get Current User:
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Project Structure

```
calendar_backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── authController.js    # Authentication logic
├── middleware/
│   └── auth.js              # JWT verification middleware
├── models/
│   └── User.js              # User schema
├── routes/
│   └── authRoutes.js        # API routes
├── .env                     # Environment variables
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
├── server.js                # Main server file
└── README.md                # Documentation
```

## Security Notes

- Passwords are hashed using bcrypt with salt rounds of 10
- Phone numbers and emails are unique and indexed
- JWT tokens are signed with a secret key
- **Important:** Tokens do not expire as requested. Store them securely on the client side.

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common status codes:
- `200` - Success
- `201` - Created successfully
- `400` - Bad request / Validation error
- `401` - Unauthorized / Invalid credentials
- `500` - Server error
