BEGIN;

INSERT INTO users (id, username, password_hash, name, role, status)
VALUES
  (2, 'staff', 'dev-only-password-hash', '館員測試', 'staff', 'active')
ON CONFLICT (username) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 2), true);

COMMIT;
