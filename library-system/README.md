# Library System

![Library System cover](docs/assets/github-cover.svg)

手機優先的圖書管理 MVP，適合小型圖書室、學校、基金會、教室書櫃與內部借閱空間。

系統核心方向：
- 用手機 PWA 當掃碼器與現場作業端
- 用電腦或 NAS 當主機
- 支援書籍建檔、會員管理、借還書、盤點、照片保存
- 以狀態管理生命週期，不以硬刪除為主

## 功能總覽

### 手機 PWA
- 書籍清單、建檔、編輯
- 會員清單、建檔、編輯
- 借書、還書
- ISBN / 館藏條碼掃碼
- 封面與會員照片拍照 / 上傳
- 盤點流程第一版

### 後端 API
- `GET /api/books`
- `GET /api/books/check`
- `GET /api/books/lookup/isbn/:isbn`
- `POST /api/books`
- `PATCH /api/books/:id`
- `GET /api/members`
- `POST /api/members`
- `PATCH /api/members/:id`
- `GET /api/loans`
- `GET /api/loans/overdue`
- `POST /api/loans/checkout`
- `POST /api/loans/return`
- `GET /api/inventory/sessions`
- `POST /api/inventory/sessions`
- `POST /api/inventory/sessions/:id/scan`
- `POST /api/uploads/book-cover`
- `POST /api/uploads/member-photo`

### ISBN metadata lookup
- Open Library
- Google Books
- 站內搜尋 fallback：
  - 讀冊
  - 博客來
  - Amazon
  - Amazon.co.jp
  - CiNii Books

## 技術棧

- Frontend: Next.js
- Backend: Express + TypeScript
- Database: PostgreSQL
- Reverse proxy: Caddy
- Barcode scanning: `html5-qrcode`
- Webcam capture: browser `getUserMedia`

## 專案結構

```text
library-system/
  backend/                 Express + TypeScript API
  database/                schema, seed, migrations
  docs/                    devlog and assets
  frontend/                Next.js mobile PWA
  infra/caddy/             internal HTTPS reverse proxy
```

## 系統需求

### 開發 / 本機部署
- Windows 10/11、macOS 或 Linux
- Node.js 20+
- npm 10+
- PostgreSQL 16 或 17

### 手機使用
- Android Chrome
- iPhone Safari
- iPhone 掃碼需要 HTTPS

### 建議硬體
- 小型內部使用：桌機 / Mini PC / Docker-capable NAS
- 記憶體：至少 8 GB 較穩
- 儲存：保留資料庫與照片空間

## 安裝

### 1. 安裝 PostgreSQL

建立資料庫：

```sql
CREATE DATABASE library_system;
```

匯入 schema：

```bash
psql -U postgres -d library_system -f database/schema.sql
```

如果需要測試資料：

```bash
psql -U postgres -d library_system -f database/dev-seed.sql
```

若已經有舊資料庫，請補 migration：

```bash
psql -U postgres -d library_system -f database/migrations/20260320_add_inactive_book_status.sql
```

### 2. 安裝 backend

```bash
cd backend
npm install
```

建立 `.env`：

```env
PORT=4000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/library_system
CORS_ORIGIN=http://localhost:3000
```

啟動 backend：

```bash
npm run dev
```

### 3. 安裝 frontend

```bash
cd frontend
npm install
```

若走同網段開發，可不設 API base；預設走同源 `/api`。

啟動 frontend：

```bash
npm run dev
```

## 本機開發網址

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`
- Mobile PWA: `http://localhost:3000/mobile`

## 內網 HTTPS 部署

### 為什麼要 HTTPS

iPhone Safari 要啟用相機掃碼時，通常需要：
- `https://...`
- 或 `http://localhost`

因此若手機要透過區網使用，建議加一層 HTTPS reverse proxy。

### Caddy 方式

本專案已有：
- [Caddyfile](/C:/Users/user/Documents/Playground/library-system/infra/caddy/Caddyfile)
- `infra/caddy/certs/`
- `infra/caddy/rootCA.pem`

內網入口範例：
- `https://192.168.0.112`
- `https://192.168.0.112/mobile`

### iPhone 信任本機憑證

把 [rootCA.pem](/C:/Users/user/Documents/Playground/library-system/infra/caddy/rootCA.pem) 傳到 iPhone 後：

1. 安裝描述檔
2. 到 `設定 > 一般 > 關於本機 > 憑證信任設定`
3. 開啟完全信任

完成後即可用 Safari 開相機掃碼。

## NAS 部署建議

可以部署在支援 Docker 的 NAS。

推薦方式：
- `frontend` 一個 container
- `backend` 一個 container
- `postgres` 一個 container
- `caddy/nginx` 一個 container
- `uploads` 掛 volume
- `database data` 掛 volume

適合條件：
- 支援 Docker / Container Manager
- 記憶體至少 4 GB，建議 8 GB
- 長時間開機

不建議：
- 太舊的 ARM NAS
- 無法跑容器的入門 NAS

## 日常使用流程

### 書籍建檔
1. 進入 `/mobile/books/new`
2. 掃 ISBN
3. 若查到 metadata，系統自動帶入
4. 再掃館藏條碼
5. 拍封面或上傳照片
6. 送出建立書籍

### 會員建檔
1. 進入 `/mobile/members/new`
2. 輸入會員資料
3. 拍照或上傳照片
4. 送出建立會員

### 借書
1. 進入 `/mobile/loan`
2. 掃會員碼
3. 掃書籍條碼
4. 送出借閱

### 還書
1. 進入 `/mobile/return`
2. 掃書籍條碼
3. 送出歸還

### 盤點
1. 進入 `/mobile/inventory`
2. 建立盤點批次
3. 連續掃描館藏條碼
4. 完成批次

## 狀態管理

本系統目前以「狀態管理」取代刪除。

書籍狀態：
- `available` 在館可借
- `loaned` 借出中
- `lost` 遺失
- `repair` 維修中
- `inventory` 盤點中
- `inactive` 下架停用

這樣可以保留：
- 借閱歷史
- 盤點紀錄
- 館藏條碼
- 封面照片

## 已知限制

- ISBN metadata 沒有全球單一完整來源
- 某些中文書、舊書、地方出版品仍需手動補資料
- 某些站點的封面或出版社資料仍可能不完整
- Windows 終端有時顯示中文亂碼，但不代表頁面本身顯示異常

## 開發與維護

### Backend

```bash
cd backend
npm run dev
npm run build
```

### Frontend

```bash
cd frontend
npm run dev
```

### 常用檔案

- [README.md](/C:/Users/user/Documents/Playground/library-system/README.md)
- [DEVLOG.md](/C:/Users/user/Documents/Playground/library-system/docs/DEVLOG.md)
- [schema.sql](/C:/Users/user/Documents/Playground/library-system/database/schema.sql)
- [library-mvp-spec-v1.md](/C:/Users/user/Documents/Playground/docs/library-mvp-spec-v1.md)

## 後續可擴充

- 逾期提醒
- 報表中心
- 盤點差異匯出
- 多館 / 多書櫃
- 權限分級
- Docker Compose / NAS 部署檔
