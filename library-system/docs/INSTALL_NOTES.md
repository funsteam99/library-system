# 安裝筆記（遠端圖書館主機）

主機：`100.74.130.58`
使用者：`user1`
專案路徑：`C:\Users\user1\fullon-library-pwa`

## 目前固定設定
- PostgreSQL: `17`（服務名 `postgresql-x64-17`）
- DB: `library_system`
- DB 密碼: `funsteam99`
- Backend: `:4000`
- Frontend: `:3000`

## 一鍵初始化
```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\user1\fullon-library-pwa\scripts\init-db.ps1
```

## 快速檢查
```powershell
# DB service
sc query postgresql-x64-17

# API
curl http://localhost:4000/api/books

# Frontend
start http://localhost:3000/mobile/books
```
