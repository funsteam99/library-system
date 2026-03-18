BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff')),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  member_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(120),
  unit_name VARCHAR(120),
  photo_url VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT members_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS shelves (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  area_name VARCHAR(100),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT shelves_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS books (
  id BIGSERIAL PRIMARY KEY,
  isbn VARCHAR(30),
  accession_code VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  publisher VARCHAR(255),
  publish_year INT,
  category_id BIGINT REFERENCES categories(id),
  shelf_id BIGINT REFERENCES shelves(id),
  cover_url VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  condition_note TEXT,
  source VARCHAR(50),
  price NUMERIC(10, 2),
  remark TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT books_status_check CHECK (
    status IN ('available', 'loaned', 'lost', 'repair', 'inventory')
  )
);

CREATE TABLE IF NOT EXISTS loans (
  id BIGSERIAL PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES books(id),
  member_id BIGINT NOT NULL REFERENCES members(id),
  loan_date TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  returned_at TIMESTAMP NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'loaned',
  loan_by_user_id BIGINT NOT NULL REFERENCES users(id),
  return_by_user_id BIGINT NULL REFERENCES users(id),
  remark TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT loans_status_check CHECK (status IN ('loaned', 'returned', 'overdue'))
);

CREATE UNIQUE INDEX IF NOT EXISTS loans_active_book_idx
  ON loans(book_id)
  WHERE returned_at IS NULL;

CREATE TABLE IF NOT EXISTS inventory_sessions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  inventory_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  started_by_user_id BIGINT NOT NULL REFERENCES users(id),
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  remark TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_sessions_status_check CHECK (
    status IN ('draft', 'in_progress', 'completed')
  )
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGSERIAL PRIMARY KEY,
  inventory_session_id BIGINT NOT NULL REFERENCES inventory_sessions(id),
  book_id BIGINT NOT NULL REFERENCES books(id),
  scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  scanned_by_user_id BIGINT NOT NULL REFERENCES users(id),
  result VARCHAR(20) NOT NULL DEFAULT 'found',
  shelf_id_at_scan BIGINT NULL REFERENCES shelves(id),
  remark TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_items_result_check CHECK (
    result IN ('found', 'wrong_shelf', 'damaged', 'missing_check')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_session_book_idx
  ON inventory_items(inventory_session_id, book_id);

CREATE INDEX IF NOT EXISTS books_accession_code_idx ON books(accession_code);
CREATE INDEX IF NOT EXISTS books_isbn_idx ON books(isbn);
CREATE INDEX IF NOT EXISTS members_member_code_idx ON members(member_code);
CREATE INDEX IF NOT EXISTS loans_member_status_idx ON loans(member_id, status);
CREATE INDEX IF NOT EXISTS inventory_items_scanned_at_idx ON inventory_items(scanned_at);

COMMIT;
