# Skill Exchange — Backend API

This is the backend for the Student Skill Exchange app. It is a REST API built with Express.js. It uses MySQL for the database, JWT for login, and Socket.io for live chat.

---

## What you need first

- **Node.js** 18 or newer
- **MySQL** 8 (or 5.7) with the database created and filled with data

---

## How to set it up

### 1. Install packages

Open a terminal in the project folder, then go to the backend folder and install:

```bash
cd backend
npm install
```

### 2. Set environment variables

Copy the example env file and rename it to `.env`:

```bash
cp .env.example .env
```

Open `.env` and set these values:

- **DB_HOST** — Where MySQL runs (e.g. `localhost`)
- **DB_PORT** — MySQL port (e.g. `3306`)
- **DB_USER** — Your MySQL user (e.g. `root`)
- **DB_PASSWORD** — Your MySQL password
- **DB_NAME** — Use `skill_exchange_db`
- **JWT_SECRET** — A long random string (used to sign login tokens)
- **JWT_EXPIRES_IN** — How long a token lasts (e.g. `7d` or `24h`)

Do not put `.env` in git. It is in `.gitignore`.

### 3. Prepare the database

From the project root, run these in MySQL:

1. Run `database/schema.sql` — creates tables, indexes, triggers, views
2. Run `database/seed.sql` — adds sample data

See the main [README](../README.md) and [database/README](../database/README.md) for more.

---

## How to run

**Development (server restarts when you change code):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

The server runs on the port in `.env` (default is 5000). So the base URL is: `http://localhost:5000`.

---

## API in short

| What | URL |
|------|-----|
| Root | `GET /` — short API info |
| Health | `GET /api/v1/health` — check if API is up |
| Login | `POST /api/v1/auth/login` |
| Register | `POST /api/v1/auth/register` |
| Users | `GET /api/v1/users` and others (see API docs) |
| Transactions | `POST /api/v1/transactions/match-request`, `POST /api/v1/transactions/paid-exchange` |
| Conversations & messages | `GET/POST /api/v1/conversations/...` (see API docs) |
| **API docs (Swagger)** | `GET /api-docs` — open in browser: `http://localhost:5000/api-docs` |

For routes that need login, send this header: `Authorization: Bearer <your-token>`.

---

## How to test

1. **Swagger UI** — Open `http://localhost:5000/api-docs` in your browser. You can try endpoints from there.
2. **Postman** — Step-by-step requests for auth and live chat are in [docs/LIVE-CHAT.md](docs/LIVE-CHAT.md).
3. **Socket test** — From the backend folder run: `node test-socket.js` (server must be running).

---

## Folder structure

```
backend/
├── src/
│   ├── app.js           # Express app and routes
│   ├── server.js        # Starts the server
│   ├── socket.js        # Socket.io for live chat
│   ├── routes/v1/       # All API routes
│   ├── controllers/     # Handles requests
│   ├── services/        # Database and business logic
│   ├── middleware/      # Auth and roles (RBAC)
│   └── openapi.json     # API spec for Swagger
├── docs/                # Extra docs (e.g. LIVE-CHAT.md)
├── .env.example         # Env template (no real secrets)
├── package.json
└── README.md            # This file
```

Live Url :- https://student-skill-exchange-and-learning-marketplace-production.up.railway.app/
