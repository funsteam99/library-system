# DEVLOG

## 專案現況

這是一套手機優先的圖書管理 MVP，核心已可運作於：
- 本機 Windows 開發環境
- 內網 HTTPS
- 手機 Safari / Chrome 掃碼流程
- 可延伸到 Docker / NAS 部署

## 已完成

### 基礎架構
- PostgreSQL 資料庫 `library_system`
- Express + TypeScript backend
- Next.js frontend
- Caddy 內網 HTTPS
- GitHub repo 與 `main` 分支工作流

### 手機 PWA
- `/mobile`
- `/mobile/books`
- `/mobile/books/new`
- `/mobile/books/[id]/edit`
- `/mobile/members`
- `/mobile/members/new`
- `/mobile/members/[id]/edit`
- `/mobile/loan`
- `/mobile/return`
- `/mobile/inventory`

### 書籍功能
- 書籍建檔
- 書籍清單
- 書籍編輯
- 封面上傳與 webcam 拍照
- ISBN metadata lookup
- ISBN / 館藏條碼重複檢查
- 清單封面縮圖
- 書籍狀態管理

### 會員功能
- 會員建檔
- 會員清單
- 會員編輯
- 會員照片上傳與 webcam 拍照

### 流通功能
- 借書
- 還書
- 借閱 API

### 盤點
- 建立盤點批次
- 掃描館藏條碼
- 完成盤點批次

## ISBN metadata 現況

### Primary
- Open Library
- Google Books

### Fallback
- 讀冊
- 博客來
- Amazon
- Amazon.co.jp
- CiNii Books

### 已驗證案例
- `9789866535581`
  - 可帶出：書名、作者、出版社、出版年
- `9784899773993`
  - 可帶出：日文書名、作者、出版年、封面

## 狀態管理方向

本系統目前採：
- 不做硬刪除
- 用書籍狀態管理生命週期

可用狀態：
- `available`
- `loaned`
- `lost`
- `repair`
- `inventory`
- `inactive`

## 重要檔案

### 文件
- [README.md](/C:/Users/user/Documents/Playground/library-system/README.md)
- [library-mvp-spec-v1.md](/C:/Users/user/Documents/Playground/docs/library-mvp-spec-v1.md)

### Backend
- [app.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/app.ts)
- [books.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/routes/books.ts)
- [members.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/routes/members.ts)
- [loans.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/routes/loans.ts)
- [inventory.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/routes/inventory.ts)
- [uploads.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/routes/uploads.ts)
- [isbn-lookup.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/features/books/isbn-lookup.ts)
- [isbn-lookup-cdp.ts](/C:/Users/user/Documents/Playground/library-system/backend/src/features/books/isbn-lookup-cdp.ts)

### Database
- [schema.sql](/C:/Users/user/Documents/Playground/library-system/database/schema.sql)
- [dev-seed.sql](/C:/Users/user/Documents/Playground/library-system/database/dev-seed.sql)
- [20260320_add_inactive_book_status.sql](/C:/Users/user/Documents/Playground/library-system/database/migrations/20260320_add_inactive_book_status.sql)

### Frontend
- [mobile books new](/C:/Users/user/Documents/Playground/library-system/frontend/app/mobile/books/new/page.tsx)
- [mobile books list](/C:/Users/user/Documents/Playground/library-system/frontend/app/mobile/books/page.tsx)
- [mobile books edit](/C:/Users/user/Documents/Playground/library-system/frontend/app/mobile/books/[id]/edit/page.tsx)
- [camera capture](/C:/Users/user/Documents/Playground/library-system/frontend/app/components/camera-capture.tsx)
- [barcode scanner](/C:/Users/user/Documents/Playground/library-system/frontend/app/components/barcode-scanner.tsx)

## 本機服務

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- HTTPS entry: `https://192.168.0.112`

## Log 位置

- [backend-dev.log](/C:/Users/user/Documents/Playground/library-system/backend/backend-dev.log)
- [frontend-dev.log](/C:/Users/user/Documents/Playground/library-system/frontend/frontend-dev.log)
- [caddy.log](/C:/Users/user/Documents/Playground/library-system/infra/caddy/caddy.log)

## 已知限制

- 某些站點 metadata 不完整
- 某些封面圖仍可能抓不到
- 中文與日文來源需持續補強
- 尚未提供 Docker Compose 正式部署檔

## 下一步建議

1. 補 `Docker Compose / NAS` 正式部署檔
2. 補盤點差異清單與匯出
3. 補借閱紀錄查詢頁
4. 補書籍 / 會員更多篩選
5. 補 README 的 Docker / NAS 實作稿
