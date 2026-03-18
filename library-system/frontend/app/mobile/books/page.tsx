"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
          setError(loadError instanceof Error ? loadError.message : "書籍清單載入失敗");
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

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Books</p>
        <h2>書籍清單</h2>
        <p>這裡先提供最基本的列表，方便你確認建檔後資料是否真的進系統。</p>
      </article>

      <section className="action-grid">
        <Link href="/mobile/books/new" className="action-card">
          <div className="action-badge">新增</div>
          <h3>建立新書籍</h3>
          <p>回到手機建檔頁，繼續掃 ISBN 與輸入資料。</p>
        </Link>
        <Link href="/mobile" className="action-card">
          <div className="action-badge">返回</div>
          <h3>回首頁</h3>
          <p>回到行動工作台，切換到借還或會員管理。</p>
        </Link>
      </section>

      <section className="books-list">
        {loading ? <div className="feedback">載入中...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        {!loading && !error && items.length === 0 ? (
          <div className="feedback">目前還沒有書籍資料。</div>
        ) : null}
        {!loading && !error
          ? items.map((book) => (
              <article key={book.id} className="book-row">
                <div>
                  <h3>{book.title}</h3>
                  <p>館藏條碼：{book.accessionCode}</p>
                  <p>ISBN：{book.isbn ?? "未填"}</p>
                </div>
                <div className="book-row-side">
                  <span className="status-pill">{book.status}</span>
                  <p>{book.author ?? "作者未填"}</p>
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
