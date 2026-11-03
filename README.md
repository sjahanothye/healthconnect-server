# HealthConnect Server API

> **Connecting Communities Through Healthcare & Social Impact**

Backend API service for HealthConnect, built with **Express.js**, **MongoDB**, and **JWT Authentication**.

---

## Features

- **Authentication & Authorization**: Secure email/password registration, login, and Google authentication with JSON Web Tokens (JWT).
- **Password Integrity Rules**: Strict validation requiring uppercase, lowercase, and minimum 6 characters.
- **Dynamic Events Management**: Create, view, update, and delete events with strict creator ownership.
- **Future Date Validation**: Strict server-side validation preventing past dates from being created or updated.
- **MongoDB Database Operations**:
  - Filter only upcoming events (`eventDate >= today`).
  - `.limit(6)` query support for the homepage dynamic showcase.
  - Category filtering (Blood Donation, Eye Donation Awareness, Medical Support, etc.).
- **Event Joining & Attendance**: Safe registration recording, duplicate prevention, and real-time participant counter.
- **Joined Events Listing**: Sorted by event date.
- **CORS & Environment Setup**: Configured for local development and live deployment (Vercel / Render).

---

## Tech Stack

- **Node.js** & **Express.js**
- **MongoDB** (Native Driver with Connection Pooling)
- **JSON Web Tokens (JWT)** & **Bcrypt.js**
- **CORS** & **Dotenv**

---

## Environment Variables

Create a `.env` file in the root of the server folder:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=healthconnect_db
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000
```

---

## API Endpoints

### Auth Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email & password
- `POST /api/auth/google` - Google authentication
- `GET /api/auth/me` - Get current user profile (Protected)
- `PUT /api/auth/profile` - Update user name & photoURL (Protected)

### Event Endpoints
- `GET /api/events` - Get upcoming events (supports `?limit=6`, `?category=...`, `?search=...`)
- `GET /api/events/:id` - Get event details by ID
- `POST /api/events` - Create a new event (Protected, future date enforced)
- `PUT /api/events/:id` - Update user's own event (Protected)
- `DELETE /api/events/:id` - Delete user's own event (Protected)
- `GET /api/events/manage/my-events` - Get events created by logged-in user (Protected)
- `POST /api/events/:id/join` - Join an event (Protected, prevents duplicate join)
- `GET /api/events/joined/my-joined` - Get events joined by logged-in user (Protected, sorted by date)
- `POST /api/events/seed` - Pre-populate realistic healthcare & social events

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start
```
