# Database

## 建立資料庫

```sql
CREATE DATABASE library_system;
```

## 匯入 schema

```bash
psql -U postgres -d library_system -f schema.sql
```

## 備註

- 建議使用 PostgreSQL 16 或 17
- 正式環境請另建應用程式專用帳號
- 可用 `dev-seed.sql` 建立本機測試資料

## 匯入測試資料

```bash
psql -U postgres -d library_system -f dev-seed.sql
```
