# Backup And Restore

## 建議頻率

- 資料庫：每天至少 1 次
- 圖片上傳資料夾：每天至少 1 次
- 重大匯入、盤點、批次調整前：先手動備份 1 次

## 手動備份

### 只備份資料庫

```powershell
.\scripts\backup-db.ps1
```

### 只備份上傳圖片

```powershell
.\scripts\backup-uploads.ps1
```

### 一次備份資料庫與圖片

```powershell
.\scripts\run-backup.ps1
```

若要指定資料庫連線參數：

```powershell
.\scripts\run-backup.ps1 -Database library_system -Username postgres -Host localhost -Port 5432
```

## 自動備份排程

註冊 Windows 每日自動備份：

```powershell
.\scripts\register-backup-task.ps1 -DailyAt 21:00
```

若要自訂排程名稱與資料庫連線：

```powershell
.\scripts\register-backup-task.ps1 `
  -TaskName LibrarySystemNightlyBackup `
  -DailyAt 22:30 `
  -Database library_system `
  -Username postgres `
  -Host localhost `
  -Port 5432
```

## 備份輸出位置

```text
backups/db/
backups/uploads/
```

## 還原資料庫

```powershell
.\scripts\restore-db.ps1 -BackupFile .\backups\db\library_system-20260326-153000.sql
```

## 實務建議

- 備份完成後，把 `backups/` 同步到外接硬碟、NAS 或雲端硬碟
- 若系統放在 NAS，可把 `run-backup.ps1` 放進排程
- 還原前先再備份一次目前資料庫，避免覆蓋後無法回頭
- 圖片與資料庫都要備份，缺一不可
