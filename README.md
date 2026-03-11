# Student Skill Exchange & Learning Marketplace

**ADBMS Project** — A database-backed platform where students can offer skills, request skills, and run free or paid learning exchanges with sessions, payments, and reviews.

---

## What this project is

- **Offers & requests:** Students offer skills (e.g. Python, guitar) and request skills they want to learn.
- **Matching:** Offers can be matched to requests; the system creates an exchange and a session (time, venue).
- **Free or paid:** Exchanges can be free or paid; paid ones have a price and payment records.
- **Sessions & reviews:** Each exchange has one or more sessions; after completion, participants can leave reviews and reputation is updated.

The database supports all of this with proper schema, constraints, triggers, indexes, ACID transactions, and performance-tuned queries.

---

## Repository structure

| Folder / file | Description |
|---------------|-------------|
| **backend/**  | Node.js/Express API (Phase 2): REST, JWT auth, RBAC, transactions, Socket.io. See setup below. |
| **database/** | Schema, seed data, performance analysis, and ACID transaction examples. See [database/README.md](database/README.md). |
| **docs/**     | ER diagrams, schema documentation. See [docs/README.md](docs/README.md). |
| **media/**    | Logs for transaction rollback (Phase 2). |

---

## Backend setup and run (Phase 2)

1. **Database:** Create DB and load schema/seed (see Quick start below).
2. **Env:** Copy `backend/.env.example` to `backend/.env` and set `DB_*`, `JWT_SECRET`.
3. **Install:** `cd backend && npm install`
4. **Run:** `npm run dev` (or `node src/server.js`). API: `http://localhost:5000`. Swagger UI: `http://localhost:5000/api-docs`.
5. **API spec:** OpenAPI 3.0 spec is in `backend/src/openapi.json`.

---

## Tech stack (database phase)

- **DBMS:** MySQL
- **Schema:** Tables, constraints, indexes, triggers, views
- **Data:** Seed data with referential integrity (100+ records)
- **Performance:** Queries with EXPLAIN / EXPLAIN ANALYZE (before and after indexing)
- **ACID:** Stored procedures and documentation for atomicity, consistency, isolation, and durability

---

## Quick start (database)

1. Create the database and load schema: run `database/schema.sql`.
2. Load seed data: run `database/seed.sql`.
3. (Optional) Run performance queries: `database/performance.sql`.
4. (Optional) Run ACID examples: `database/acid_transactions.sql`.

See [database/README.md](database/README.md) for the full list of deliverables and files.
