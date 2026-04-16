# fullon-library (Monorepo)

圖書館管理系統單一倉庫，包含：
- `frontend/` Next.js 前端（預設 :3000）
- `backend/` Node/TS API 後端（預設 :4000）

## 系統介紹

fullon-library 是一套「手機優先」的圖書館管理系統，目標是讓小型圖書室、校園角落、社區空間可以用最低維護成本完成日常借還與館藏管理。

核心設計：
- 前端 PWA：提供行動化操作介面，適合櫃台與現場盤點
- 後端 API：集中處理資料存取、借還邏輯、匯入匯出
- PostgreSQL：保存書籍、會員、借閱、盤點等資料

主要功能：
- 書籍管理：新增、編輯、查詢、狀態管理
- 會員管理：建立會員與查詢借閱狀態
- 借書/還書：快速完成借還流程
- 資料初始化：一鍵建立資料庫與預設資料

## 使用方法

### 一、第一次安裝（建議順序）
1. 安裝 Node.js 與 PostgreSQL（見下方 Windows 安裝步驟）
2. 安裝 `frontend` / `backend` 依賴
3. 執行 `scripts/init-db.ps1` 初始化資料庫
4. 建立 `backend/.env`
5. 啟動 backend 與 frontend

### 二、日常啟動
```powershell
# 視窗 1：後端
cd C:\Users\user1\fullon-library-pwa\backend
node dist\server.js

# 視窗 2：前端
cd C:\Users\user1\fullon-library-pwa\frontend
npm run dev
```

### 三、日常操作流程
1. 開啟 `http://localhost:3000/mobile`
2. 先到「圖書清單」確認資料是否正常載入
3. 新增書籍或會員後，再進行借書/還書
4. 異常時先檢查 API：`http://localhost:4000/api/books`

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


## 常見錯誤排查速查表

### 1) 前端打得開，但資料是空白或報錯
先測 API：
```powershell
curl http://localhost:4000/api/books
```
- 有 JSON：後端正常，檢查前端快取或路由
- `Internal server error`：多半是資料庫/初始化問題
- 連不到：後端未啟動

### 2) `Internal server error`（常見）
優先檢查：
1. PostgreSQL 是否啟動
```powershell
sc query postgresql-x64-17
```
2. DB 初始化是否完成
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\user1\fullon-library-pwa\scripts\init-db.ps1
```
3. `backend/.env` 是否存在且 `DATABASE_URL` 正確

### 3) 4000 Port 無回應
```powershell
netstat -ano | findstr :4000
```
- 無 LISTEN：重啟 backend
```powershell
cd C:\Users\user1\fullon-library-pwa\backend
node dist\server.js
```

### 4) 5432 連線被拒絕 (`ECONNREFUSED 5432`)
代表 PostgreSQL 沒在聽 5432，或服務未啟動：
```powershell
netstat -ano | findstr :5432
sc query postgresql-x64-17
```

### 5) 前端頁面卡舊資料
- 用無痕視窗重開
- 清除站台快取 / Service Worker
- 重新整理 `http://localhost:3000/mobile/books`

### 6) 快速健康檢查（建議順序）
```powershell
curl http://localhost:4000/api/books
start http://localhost:3000/mobile/books
```
