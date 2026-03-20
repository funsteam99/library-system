"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";

type BookStatus =
  | "available"
  | "loaned"
  | "lost"
  | "repair"
  | "inventory"
  | "inactive";

type BooksResponse = {
  items: Array<{
    id: number;
    title: string;
    accessionCode: string;
    isbn: string | null;
    author: string | null;
    status: BookStatus;
    coverUrl?: string | null;
  }>;
};

const statusLabels: Record<BookStatus, string> = {
  available: "在館可借",
  loaned: "借出中",
  lost: "遺失",
  repair: "維修中",
  inventory: "盤點中",
  inactive: "下架停用",
};

export default function MobileBooksPage() {
  const [items, setItems] = useState<BooksResponse["items"]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBooks() {
      try {
        const data = await apiRequest<BooksResponse>("/api/books");
        if (active) {
          setItems(data.items);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "書籍清單載入失敗。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((book) =>
      [book.title, book.accessionCode, book.isbn, book.author]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [items, keyword]);

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Books</p>
        <h2>書籍清單</h2>
        <p>可依書名、作者、館藏條碼或 ISBN 搜尋，也能直接看到封面與狀態。</p>
      </article>

      <section className="action-grid">
        <Link href="/mobile/books/new" className="action-card">
          <div className="action-badge">新增</div>
          <h3>建立新書籍</h3>
          <p>支援 ISBN 掃碼、館藏條碼與封面拍照建檔。</p>
        </Link>
        <Link href="/mobile" className="action-card">
          <div className="action-badge">首頁</div>
          <h3>回到首頁</h3>
          <p>可回借還、盤點與會員管理入口。</p>
        </Link>
      </section>

      <section className="mobile-form">
        <label className="field">
          <span>搜尋書籍</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="輸入書名、作者、館藏條碼或 ISBN"
          />
        </label>
      </section>

      <section className="books-list">
        {loading ? <div className="feedback">載入中...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        {!loading && !error && filteredItems.length === 0 ? (
          <div className="feedback">
            {keyword ? "查不到符合條件的書籍。" : "目前還沒有書籍資料。"}
          </div>
        ) : null}
        {!loading && !error
          ? filteredItems.map((book) => (
              <article key={book.id} className="book-row book-row-with-cover">
                <div className="book-cover-slot">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={`${book.title} 封面`}
                      className="book-cover-thumb"
                    />
                  ) : (
                    <div className="book-cover-placeholder">無封面</div>
                  )}
                </div>

                <div className="book-row-main">
                  <h3>{book.title}</h3>
                  <p>館藏條碼：{book.accessionCode}</p>
                  <p>ISBN：{book.isbn ?? "未填寫"}</p>
                  <p>作者：{book.author ?? "未填寫"}</p>
                </div>

                <div className="book-row-side">
                  <span className="status-pill">{statusLabels[book.status] ?? book.status}</span>
                  <Link href={`/mobile/books/${book.id}/edit`} className="inline-link">
                    編輯
                  </Link>
                </div>
              </article>
            ))
          : null}
      </section>
    </section>
  );
}
