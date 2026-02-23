# Database

This folder contains database design and implementation for the Student Skill Exchange & Learning Marketplace.

## Phase 1 deliverables

- [x] **schema.sql** — tables, constraints, indexes, triggers, views
- [x] **seed.sql** — 100+ records with referential integrity
- [x] **performance.sql** — queries with EXPLAIN / EXPLAIN ANALYZE (before/after indexing)
- [x] **acid_transactions.sql** — ACID transaction examples (atomicity, isolation) and stored procedures

## Files in this folder

| File | Purpose |
|------|---------|
| schema.sql | Full schema (create database, tables, FKs, CHECKs, indexes, triggers, views) |
| seed.sql | Sample data for all tables (100+ rows, referential integrity) |
| performance.sql | 10 queries with EXPLAIN and EXPLAIN ANALYZE, before and after indexes |
| acid_transactions.sql | Stored procedures and examples for match-request, paid-exchange, and row locking (FOR UPDATE) |
