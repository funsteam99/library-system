# DEVLOG

## 目前狀態

專案已從規格文件推進到可操作的 MVP。

### 已完成

- 建立 PostgreSQL 資料庫 `library_system`
- 匯入核心 schema
- 建立本機測試 seed
- 建立 Express API 骨架
- 完成書籍 / 會員 / 借還書 API
- 建立 Next.js 手機端 PWA 骨架
- 完成手機借書 / 還書
- 完成手機書籍清單 / 建檔 / 編輯
- 完成手機會員清單 / 建檔 / 編輯
- 完成 iPhone 可用的內網 HTTPS
- 完成手機相機掃碼

## 重要路徑

### 核心文件

- [README.md](C:\Users\user\Documents\Playground\library-system\README.md)
- [library-mvp-spec-v1.md](C:\Users\user\Documents\Playground\docs\library-mvp-spec-v1.md)

### 資料庫

- [schema.sql](C:\Users\user\Documents\Playground\library-system\database\schema.sql)
- [dev-seed.sql](C:\Users\user\Documents\Playground\library-system\database\dev-seed.sql)

### HTTPS

- [Caddyfile](C:\Users\user\Documents\Playground\library-system\infra\caddy\Caddyfile)
- [rootCA.pem](C:\Users\user\Documents\Playground\library-system\infra\caddy\rootCA.pem)

## 服務與 log

### 開發服務

- 前端 dev：`http://localhost:3000`
- 後端 dev：`http://localhost:4000`
- 手機 HTTPS：`https://192.168.0.112`

### log 檔

- [backend-dev.log](C:\Users\user\Documents\Playground\library-system\backend\backend-dev.log)
- [frontend-dev.log](C:\Users\user\Documents\Playground\library-system\frontend\frontend-dev.log)
- [caddy.log](C:\Users\user\Documents\Playground\library-system\infra\caddy\caddy.log)

## 已知問題

- Windows PowerShell 直接送中文 JSON 到 API 時，終端回傳可能出現亂碼
- 封面 / 會員照片目前只有前端預覽，尚未做正式上傳
- `inventory` 盤點流程尚未開始
- 行動端尚未加入搜尋 / 篩選 / 詳細頁

## 建議下一步

1. 做盤點功能第一版
2. 補書籍 / 會員搜尋與篩選
3. 做照片正式上傳
4. 處理中文編碼驗證與資料清洗
