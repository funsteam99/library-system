# Library System

手機優先的圖書管理系統 MVP，支援：

- 手機 PWA 借書 / 還書
- 手機書籍建檔 / 編輯 / 清單
- 手機會員建檔 / 編輯 / 清單
- ISBN / 條碼掃描
- PostgreSQL 資料庫
- 內網 HTTPS，供 iPhone 相機使用

## 專案結構

```text
library-system/
  backend/        Express + TypeScript API
  database/       PostgreSQL schema / seed
  docs/           規格與開發紀錄
  frontend/       Next.js PWA
  infra/caddy/    內網 HTTPS 反向代理與憑證
```

## 本機與內網入口

- 前端本機：`http://localhost:3000`
- 後端本機：`http://localhost:4000`
- 手機 / 內網 HTTPS：`https://192.168.0.112`
- 手機首頁：`https://192.168.0.112/mobile`

## 目前可用功能

### 行動端

- 借書：`/mobile/loan`
- 還書：`/mobile/return`
- 書籍清單：`/mobile/books`
- 書籍建檔：`/mobile/books/new`
- 書籍編輯：`/mobile/books/:id/edit`
- 會員清單：`/mobile/members`
- 會員建檔：`/mobile/members/new`
- 會員編輯：`/mobile/members/:id/edit`

### API

- `GET /api/books`
- `POST /api/books`
- `PATCH /api/books/:id`
- `GET /api/members`
- `POST /api/members`
- `PATCH /api/members/:id`
- `GET /api/loans`
- `POST /api/loans/checkout`
- `POST /api/loans/return`

## 啟動方式

### 1. 資料庫

```bash
psql -U postgres -d library_system -f database/schema.sql
psql -U postgres -d library_system -f database/dev-seed.sql
```

### 2. 後端

```bash
cd backend
npm install
npm run dev
```

### 3. 前端

```bash
cd frontend
npm install
npm run dev
```

## HTTPS 與 iPhone

iPhone 相機掃碼需要安全環境。專案已配置：

- Caddy 反向代理
- `mkcert` 產生本機憑證
- HTTPS 入口：`https://192.168.0.112`

若要讓 iPhone 信任本機 HTTPS，需在手機上安裝並信任：

- [rootCA.pem](C:\Users\user\Documents\Playground\library-system\infra\caddy\rootCA.pem)

## 開發紀錄

請看：

- [DEVLOG.md](C:\Users\user\Documents\Playground\library-system\docs\DEVLOG.md)

## 目前已知限制

- 封面 / 會員照片目前只有前端預覽，尚未正式上傳到後端
- 盤點功能尚未開始實作
- Windows PowerShell 直接送中文 JSON 到 API 時，終端輸出可能出現亂碼；需以手機 / 瀏覽器實際再驗證
