# Backend

Express + TypeScript + PostgreSQL API。

## 啟動

```bash
npm install
npm run dev
```

預設 `.env`：

```env
PORT=4000
DATABASE_URL=postgres://postgres:***@localhost:5432/library_system
CORS_ORIGIN=http://localhost:3000
```

## 目前模組

- `books`
- `members`
- `loans`
- `inventory` placeholder
- `health`

## 已完成 API

- `GET /api/books`
- `POST /api/books`
- `PATCH /api/books/:id`
- `GET /api/members`
- `POST /api/members`
- `PATCH /api/members/:id`
- `GET /api/loans`
- `GET /api/loans/overdue`
- `POST /api/loans/checkout`
- `POST /api/loans/return`

## 本機開發 log

- [backend-dev.log](C:\Users\user\Documents\Playground\library-system\backend\backend-dev.log)
