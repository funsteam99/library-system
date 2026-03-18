BEGIN;

INSERT INTO users (id, username, password_hash, name, role, status)
VALUES
  (1, 'admin', 'dev-only-password-hash', '系統管理員', 'admin', 'active')
ON CONFLICT (username) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1), true);

INSERT INTO categories (code, name, sort_order, status)
VALUES
  ('GEN', '一般書籍', 1, 'active')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO shelves (code, name, area_name, description, status)
VALUES
  ('A-01', 'A01 書櫃', '主館', '預設測試書櫃', 'active')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  area_name = EXCLUDED.area_name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO members (member_code, name, phone, email, unit_name, status, note)
VALUES
  ('M0001', '王小明', '0912000000', 'reader@example.com', '圖書室', 'active', '開發測試會員')
ON CONFLICT (member_code) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  unit_name = EXCLUDED.unit_name,
  status = EXCLUDED.status,
  note = EXCLUDED.note,
  updated_at = NOW();

INSERT INTO books (
  isbn,
  accession_code,
  title,
  author,
  publisher,
  publish_year,
  category_id,
  shelf_id,
  status,
  source,
  remark
)
VALUES (
  '9789860000001',
  'B0001',
  '圖書管理系統開發手冊',
  '系統建置小組',
  '內部出版',
  2026,
  (SELECT id FROM categories WHERE code = 'GEN'),
  (SELECT id FROM shelves WHERE code = 'A-01'),
  'available',
  'purchase',
  '開發測試書籍'
)
ON CONFLICT (accession_code) DO UPDATE
SET
  isbn = EXCLUDED.isbn,
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  publisher = EXCLUDED.publisher,
  publish_year = EXCLUDED.publish_year,
  category_id = EXCLUDED.category_id,
  shelf_id = EXCLUDED.shelf_id,
  status = EXCLUDED.status,
  source = EXCLUDED.source,
  remark = EXCLUDED.remark,
  updated_at = NOW();

COMMIT;
