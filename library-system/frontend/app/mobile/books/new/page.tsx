"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useMemo, useRef, useState, useTransition } from "react";

import { BarcodeScanner } from "../../../components/barcode-scanner";
import { apiRequest } from "../../../lib/api";
import { uploadImage } from "../../../lib/upload";

type LookupResponse = {
  item: {
    title: string | null;
    author: string | null;
    publisher: string | null;
    publishYear: number | null;
    coverUrl: string | null;
    source: string | null;
  };
};

type CreateBookResponse = {
  item: {
    id: number;
    title: string;
    accessionCode: string;
    isbn: string | null;
    coverUrl: string | null;
  };
};

export default function MobileBookCreatePage() {
  const [isbn, setIsbn] = useState("");
  const [accessionCode, setAccessionCode] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishYear, setPublishYear] = useState("");
  const [remark, setRemark] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdBookId, setCreatedBookId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLookupPending, startLookupTransition] = useTransition();
  const lastLookedUpIsbn = useRef("");

  const scanHint = useMemo(() => {
    if (isbn && accessionCode) {
      return "ISBN 與館藏條碼都已輸入，可以直接建檔。";
    }

    if (isbn) {
      return "已取得 ISBN，請再掃館藏條碼，或直接沿用 ISBN 當館藏碼。";
    }

    return "先掃 ISBN 取得書目資料，再掃館藏條碼會最快。";
  }, [accessionCode, isbn]);

  async function lookupIsbnMetadata(targetIsbn: string) {
    const normalized = targetIsbn.replace(/[^0-9Xx]/g, "");

    if (normalized.length < 10) {
      setLookupMessage("ISBN 長度不足，請再確認。");
      return;
    }

    if (normalized === lastLookedUpIsbn.current) {
      return;
    }

    lastLookedUpIsbn.current = normalized;
    setLookupMessage(null);
    setError(null);

    startLookupTransition(async () => {
      try {
        const payload = await apiRequest<LookupResponse>(`/api/books/lookup/isbn/${normalized}`);

        if (payload.item.title && !title) {
          setTitle(payload.item.title);
        }

        if (payload.item.author && !author) {
          setAuthor(payload.item.author);
        }

        if (payload.item.publisher && !publisher) {
          setPublisher(payload.item.publisher);
        }

        if (payload.item.publishYear && !publishYear) {
          setPublishYear(String(payload.item.publishYear));
        }

        if (payload.item.coverUrl && !coverFile) {
          setCoverPreview(payload.item.coverUrl);
        }

        const sourceLabel =
          payload.item.source === "openlibrary"
            ? "Open Library"
            : payload.item.source === "googlebooks"
              ? "Google Books"
              : "外部書目";

        setLookupMessage(`已自動帶入書籍資料，來源：${sourceLabel}。`);
      } catch (lookupError) {
        lastLookedUpIsbn.current = "";
        setLookupMessage(lookupError instanceof Error ? lookupError.message : "查詢 ISBN 失敗。");
      }
    });
  }

  function handleBookCodeDetected(code: string) {
    setError(null);

    if (!isbn) {
      setIsbn(code);
      void lookupIsbnMetadata(code);
      return;
    }

    setAccessionCode(code);
  }

  function handleIsbnBlur() {
    void lookupIsbnMetadata(isbn);
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setCreatedBookId(null);

    startTransition(async () => {
      try {
        let coverUrl: string | null = null;

        if (coverFile) {
          const upload = await uploadImage("/api/uploads/book-cover", coverFile);
          coverUrl = upload.url;
        } else if (coverPreview?.startsWith("/uploads/") || coverPreview?.startsWith("http")) {
          coverUrl = coverPreview;
        }

        const payload = await apiRequest<CreateBookResponse>("/api/books", {
          method: "POST",
          body: JSON.stringify({
            isbn: isbn || null,
            accessionCode: accessionCode || isbn,
            title,
            author: author || null,
            publisher: publisher || null,
            publishYear: publishYear ? Number(publishYear) : null,
            remark: remark || null,
            coverUrl,
            status: "available",
          }),
        });

        setCreatedBookId(payload.item.id);
        setMessage(`已建立《${payload.item.title}》，館藏條碼為 ${payload.item.accessionCode}。`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "建立書籍失敗。");
      }
    });
  }

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Book intake</p>
        <h2>書籍建檔</h2>
        <p>先掃 ISBN 自動帶入書名、作者、出版社與出版年，再補館藏條碼與備註即可完成建檔。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/books" className="action-card">
          <div className="action-badge">書籍</div>
          <h3>查看書籍清單</h3>
          <p>建檔完成後可直接回清單檢查封面、條碼與基本資料。</p>
        </Link>
      </section>

      <BarcodeScanner
        label="掃描 ISBN / 館藏條碼"
        helperText={scanHint}
        onDetected={handleBookCodeDetected}
      />

      <form className="mobile-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>ISBN</span>
          <input
            value={isbn}
            onChange={(event) => {
              setIsbn(event.target.value);
              setLookupMessage(null);
            }}
            onBlur={handleIsbnBlur}
            placeholder="例如 9789860000001"
            inputMode="numeric"
          />
        </label>

        <button
          type="button"
          className="ghost-button"
          onClick={() => void lookupIsbnMetadata(isbn)}
          disabled={isLookupPending}
        >
          {isLookupPending ? "查詢中..." : "用 ISBN 帶入資料"}
        </button>

        {lookupMessage ? <div className="feedback">{lookupMessage}</div> : null}

        <label className="field">
          <span>館藏條碼</span>
          <input
            value={accessionCode}
            onChange={(event) => setAccessionCode(event.target.value)}
            placeholder="例如 B0002，留空則沿用 ISBN"
            autoCapitalize="characters"
          />
        </label>

        <label className="field">
          <span>書名</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="請輸入書名"
            required
          />
        </label>

        <label className="field">
          <span>作者</span>
          <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="例如 王小明" />
        </label>

        <label className="field">
          <span>出版社</span>
          <input
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            placeholder="例如 某某出版社"
          />
        </label>

        <label className="field">
          <span>出版年</span>
          <input
            type="number"
            min="0"
            max="9999"
            value={publishYear}
            onChange={(event) => setPublishYear(event.target.value)}
            placeholder="例如 2024"
          />
        </label>

        <label className="field">
          <span>封面照片</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleCoverChange} />
        </label>

        {coverPreview ? (
          <div className="cover-preview-card">
            <img src={coverPreview} alt="封面預覽" className="cover-preview-image" />
          </div>
        ) : null}

        <label className="field">
          <span>備註</span>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="例如 書況、來源或分類補充"
            rows={4}
          />
        </label>

        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "建立中..." : "建立書籍"}
        </button>
      </form>

      {message ? (
        <div className="feedback success">
          <div>{message}</div>
          <div className="feedback-link-row">
            <Link href="/mobile/books" className="inline-link">
              查看全部書籍
            </Link>
            {createdBookId ? <span className="feedback-meta">ID: {createdBookId}</span> : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="feedback error">{error}</div> : null}
    </section>
  );
}
