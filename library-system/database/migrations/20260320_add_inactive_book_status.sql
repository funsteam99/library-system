ALTER TABLE books
  DROP CONSTRAINT IF EXISTS books_status_check;

ALTER TABLE books
  ADD CONSTRAINT books_status_check CHECK (
    status IN ('available', 'loaned', 'lost', 'repair', 'inventory', 'inactive')
  );
