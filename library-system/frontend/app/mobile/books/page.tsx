"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";

type BooksResponse = {
  items: Array<{
    id: number;
    title: string;
    accessionCode: string;
    isbn: string | null;
    author: string | null;
    status: string;
  }>;
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
          setError(loadError instanceof Error ? loadError.message : "讀取書籍清單失敗。");
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
        <p>先搜尋書名、館藏條碼、ISBN 或作者，再決定是否編輯、借還或補建資料。</p>
      </article>

      <section className="action-grid">
        <Link href="/mobile/books/new" className="action-card">
          <div className="action-badge">新增</div>
          <h3>建立新書籍</h3>
          <p>支援掃 ISBN、外部書目帶入、選檔或 webcam 拍封面。</p>
        </Link>
        <Link href="/mobile" className="action-card">
          <div className="action-badge">返回</div>
          <h3>回到首頁</h3>
          <p>切換到借還、會員管理或盤點功能。</p>
        </Link>
      </section>

      <section className="mobile-form">
        <label className="field">
          <span>搜尋書籍</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="輸入書名、館藏條碼、ISBN 或作者"
          />
        </label>
      </section>

      <section className="books-list">
        {loading ? <div className="feedback">載入中...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        {!loading && !error && filteredItems.length === 0 ? (
          <div className="feedback">{keyword ? "查無符合條件的書籍。" : "目前還沒有書籍資料。"}</div>
        ) : null}
        {!loading && !error
          ? filteredItems.map((book) => (
              <article key={book.id} className="book-row">
                <div>
                  <h3>{book.title}</h3>
                  <p>館藏條碼：{book.accessionCode}</p>
                  <p>ISBN：{book.isbn ?? "未填寫"}</p>
                </div>
                <div className="book-row-side">
                  <span className="status-pill">{book.status}</span>
                  <p>{book.author ?? "未填寫作者"}</p>
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
