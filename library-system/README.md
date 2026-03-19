# Library System

Mobile-first library management MVP for small libraries, schools, classrooms, and nonprofit reading rooms.

This project focuses on a practical workflow:
- use a phone as a barcode scanner
- create books and members on site
- check books in and out
- store cover/member photos
- run on a local PC with internal HTTPS support

## What Is Working

### Mobile PWA
- mobile home and navigation
- book list, create, edit
- member list, create, edit
- checkout and return flows
- barcode scanning with phone camera
- ISBN metadata lookup with manual fallback
- duplicate checking for ISBN and accession code
- cover photo and member photo upload

### Backend API
- `books`
- `members`
- `loans`
- `uploads`
- PostgreSQL integration

### Local Deployment
- local PC server setup
- internal HTTPS for iPhone camera access
- Caddy reverse proxy

## Project Structure

```text
library-system/
  backend/        Express + TypeScript API
  database/       PostgreSQL schema and seed data
  docs/           notes and devlog
  frontend/       Next.js mobile PWA
  infra/caddy/    local HTTPS reverse proxy
```

## Local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Internal HTTPS entry: `https://192.168.0.112`
- Mobile flow: `https://192.168.0.112/mobile`

## Key Mobile Routes

- `/mobile`
- `/mobile/books`
- `/mobile/books/new`
- `/mobile/books/:id/edit`
- `/mobile/members`
- `/mobile/members/new`
- `/mobile/members/:id/edit`
- `/mobile/loan`
- `/mobile/return`

## Core API Routes

- `GET /api/books`
- `GET /api/books/check`
- `GET /api/books/lookup/isbn/:isbn`
- `POST /api/books`
- `PATCH /api/books/:id`
- `GET /api/members`
- `POST /api/members`
- `PATCH /api/members/:id`
- `GET /api/loans`
- `POST /api/loans/checkout`
- `POST /api/loans/return`
- `POST /api/uploads/book-cover`
- `POST /api/uploads/member-photo`

## Quick Start

### 1. Database

```bash
psql -U postgres -d library_system -f database/schema.sql
psql -U postgres -d library_system -f database/dev-seed.sql
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes

- If ISBN metadata lookup does not find a result, the create-book screen still allows manual entry.
- iPhone camera scanning requires HTTPS.
- Local `.env`, uploaded files, certs, and build artifacts are intentionally ignored in git.

## Docs

- [DEVLOG](C:\Users\user\Documents\Playground\library-system\docs\DEVLOG.md)
- [Database Notes](C:\Users\user\Documents\Playground\library-system\database\README.md)
