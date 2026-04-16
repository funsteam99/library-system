# fullon-library (Monorepo)

圖書館管理系統單一倉庫，包含：
- `frontend/` Next.js 前端（預設 :3000）
- `backend/` Node/TS API 後端（預設 :4000）

## 快速啟動

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## 存取
- 前端：`http://localhost:3000/mobile`
- 後端健康檢查：`http://localhost:4000/api/health`

前端透過 rewrite 將 `/api/*` 轉發到 `http://localhost:4000/api/*`。

---

## Windows 完整安裝步驟（含 PostgreSQL）

以下為這台環境已驗證可用的流程。

### 1) 安裝必要軟體
1. 安裝 Node.js LTS（建議 20+）
2. 安裝 PostgreSQL 17（Windows）

管理員 PowerShell 參考：
```powershell
winget install -e --id PostgreSQL.PostgreSQL.17 --override "--mode unattended --superpassword funsteam99 --serverport 5432 --servicename postgresql-x64-17 --serviceaccount `"NT AUTHORITY\NetworkService`"" --accept-package-agreements --accept-source-agreements
```

### 2) 安裝專案依賴
```powershell
cd C:\Users\user1\fullon-library-pwa\frontend
npm install

cd C:\Users\user1\fullon-library-pwa\backend
npm install
npm run build
```

### 3) 初始化資料庫（建議一鍵）
本專案已提供初始化腳本：
`C:\Users\user1\fullon-library-pwa\scripts\init-db.ps1`

執行：
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\user1\fullon-library-pwa\scripts\init-db.ps1
```

腳本會自動：
- 確認/建立 `library_system`
- 套用 `database/db-init.sql`
- 套用 migrations
- 匯入 `dev-seed.sql`
- 做 users/books smoke check

### 4) 建立 backend `.env`
檔案：`C:\Users\user1\fullon-library-pwa\backend\.env`

內容：
```env
PORT=4000
DATABASE_URL=postgres://postgres:funsteam99@localhost:5432/library_system
CORS_ORIGIN=http://localhost:3000
```

### 5) 啟動服務
```powershell
# 後端
cd C:\Users\user1\fullon-library-pwa\backend
node dist\server.js

# 前端（另一個視窗）
cd C:\Users\user1\fullon-library-pwa\frontend
npm run dev
```

### 6) 驗證
```powershell
curl http://localhost:4000/api/books
```
應回傳 JSON（不是 `{"message":"Internal server error"}`）。

前端：
- `http://localhost:3000/mobile`
- `http://localhost:3000/mobile/books`

### 常見問題
1. `Internal server error`：多半是 DB 未啟動、`.env` 遺失、或 schema 未匯入。
2. `ECONNREFUSED 5432`：PostgreSQL 服務未啟動或 port 被占用。
3. 前端正常但資料空白：先測 `http://localhost:4000/api/books`。
