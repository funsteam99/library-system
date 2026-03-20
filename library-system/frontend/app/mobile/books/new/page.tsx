"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { BarcodeScanner } from "../../../components/barcode-scanner";
import { CameraCapture } from "../../../components/camera-capture";
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
  } | null;
  found: boolean;
  message: string | null;
};

type BookSummary = {
  id: number;
  title: string;
  accessionCode: string;
  isbn: string | null;
};

type DuplicateCheckResponse = {
  item: {
    isbn: string;
    accessionCode: string;
    isbnMatches: BookSummary[];
    accessionMatch: BookSummary | null;
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

type ScanMode = "auto" | "isbn" | "accession";

export default function MobileBookCreatePage() {
  const [scanMode, setScanMode] = useState<ScanMode>("auto");
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
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [duplicateBooks, setDuplicateBooks] = useState<BookSummary[]>([]);
  const [hasAccessionConflict, setHasAccessionConflict] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdBookId, setCreatedBookId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLookupPending, startLookupTransition] = useTransition();
  const lastLookedUpIsbn = useRef("");

  const scanHint = useMemo(() => {
    if (scanMode === "isbn") {
      return "目前掃碼會直接覆蓋 ISBN 欄位，適合想重掃 ISBN 的情況。";
    }

    if (scanMode === "accession") {
      return "目前掃碼會直接覆蓋館藏條碼欄位，適合連續貼標與建檔。";
    }

    if (isbn && accessionCode) {
      return "自動判斷模式下，ISBN 與館藏條碼都已有值，下一次掃碼會覆蓋館藏條碼。";
    }

    if (isbn) {
      return "自動判斷模式下，下一次掃碼會填入館藏條碼。";
    }

    return "自動判斷模式下，第一次掃碼會先填 ISBN。";
  }, [accessionCode, isbn, scanMode]);

  async function checkDuplicates(nextIsbn: string, nextAccessionCode: string) {
    const normalizedIsbn = nextIsbn.replace(/[^0-9Xx]/g, "");
    const normalizedAccessionCode = nextAccessionCode.trim();

    if (!normalizedIsbn && !normalizedAccessionCode) {
      setDuplicateMessage(null);
      setDuplicateBooks([]);
      setHasAccessionConflict(false);
      return;
    }

    const params = new URLSearchParams();
    if (normalizedIsbn) {
      params.set("isbn", normalizedIsbn);
    }
    if (normalizedAccessionCode) {
      params.set("accessionCode", normalizedAccessionCode);
    }

    try {
      const payload = await apiRequest<DuplicateCheckResponse>(
        `/api/books/check?${params.toString()}`,
      );
      const messages: string[] = [];

      setDuplicateBooks(payload.item.isbnMatches);
      setHasAccessionConflict(Boolean(payload.item.accessionMatch));

      if (payload.item.isbnMatches.length > 0) {
        messages.push(`此 ISBN 已有 ${payload.item.isbnMatches.length} 筆館藏紀錄。`);
      }

      if (payload.item.accessionMatch) {
        messages.push(
          `館藏條碼 ${payload.item.accessionCode} 已存在於《${payload.item.accessionMatch.title}》。`,
        );
      }

      setDuplicateMessage(messages.length > 0 ? messages.join(" ") : null);
    } catch {
      setDuplicateMessage(null);
      setDuplicateBooks([]);
      setHasAccessionConflict(false);
    }
  }

  async function lookupIsbnMetadata(targetIsbn: string) {
    const normalized = targetIsbn.replace(/[^0-9Xx]/g, "");

    if (normalized.length < 10) {
      setLookupMessage("ISBN 長度不足，請再確認。");
      return;
    }

    if (normalized === lastLookedUpIsbn.current) {
      await checkDuplicates(normalized, accessionCode || normalized);
      return;
    }

    lastLookedUpIsbn.current = normalized;
    setLookupMessage(null);
    setError(null);

    startLookupTransition(async () => {
      try {
        const payload = await apiRequest<LookupResponse>(
          `/api/books/lookup/isbn/${normalized}`,
        );

        if (payload.item?.title && !title) {
          setTitle(payload.item.title);
        }
        if (payload.item?.author && !author) {
          setAuthor(payload.item.author);
        }
        if (payload.item?.publisher && !publisher) {
          setPublisher(payload.item.publisher);
        }
        if (payload.item?.publishYear && !publishYear) {
          setPublishYear(String(payload.item.publishYear));
        }
        if (payload.item?.coverUrl && !coverFile) {
          setCoverPreview(payload.item.coverUrl);
        }

        if (payload.found && payload.item) {
          const sourceLabel =
            payload.item.source === "openlibrary"
              ? "Open Library"
              : payload.item.source === "googlebooks"
                ? "Google Books"
                : "站內搜尋";

          setLookupMessage(`已從 ${sourceLabel} 帶入部分書籍資料。`);
        } else {
          setLookupMessage("查不到外部書目資料，請直接手動輸入書名與作者。");
        }
      } catch {
        lastLookedUpIsbn.current = "";
        setLookupMessage("查詢書目資料失敗，請稍後再試。");
      } finally {
        await checkDuplicates(normalized, accessionCode || normalized);
      }
    });
  }

  function applyScannedValueToIsbn(code: string) {
    setIsbn(code);
    setLookupMessage(null);
    void lookupIsbnMetadata(code);
  }

  function applyScannedValueToAccession(code: string) {
    setAccessionCode(code);
    void checkDuplicates(isbn, code);
  }

  function handleBookCodeDetected(code: string) {
    setError(null);

    if (scanMode === "isbn") {
      applyScannedValueToIsbn(code);
      return;
    }

    if (scanMode === "accession") {
      applyScannedValueToAccession(code);
      return;
    }

    if (!isbn) {
      applyScannedValueToIsbn(code);
      return;
    }

    applyScannedValueToAccession(code);
  }

  function handleIsbnBlur() {
    void lookupIsbnMetadata(isbn);
  }

  function handleAccessionBlur() {
    void checkDuplicates(isbn, accessionCode);
  }

  function setCapturedCover(file: File, previewUrl: string) {
    setCoverFile(file);
    setCoverPreview(previewUrl);
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }

    setCapturedCover(file, URL.createObjectURL(file));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setCreatedBookId(null);

    if (hasAccessionConflict) {
      setError("館藏條碼已存在，請更換館藏條碼後再送出。");
      return;
    }

    startTransition(async () => {
      try {
        let coverUrl: string | null = null;

        if (coverFile) {
          const upload = await uploadImage("/api/uploads/book-cover", coverFile);
          coverUrl = upload.url;
        } else if (
          coverPreview?.startsWith("/uploads/") ||
          coverPreview?.startsWith("http")
        ) {
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
        setDuplicateMessage(null);
        setDuplicateBooks([]);
        setHasAccessionConflict(false);
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
        <p>可先掃 ISBN 帶入資料，再掃館藏條碼；也可切換掃碼模式做實操比較。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/books" className="action-card">
          <div className="action-badge">書籍</div>
          <h3>查看書籍清單</h3>
          <p>建檔後可直接回清單確認資料與封面。</p>
        </Link>
      </section>

      <section className="feedback">
        <div>掃碼模式</div>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-button ${scanMode === "auto" ? "active" : ""}`}
            onClick={() => setScanMode("auto")}
          >
            自動判斷
          </button>
          <button
            type="button"
            className={`segmented-button ${scanMode === "isbn" ? "active" : ""}`}
            onClick={() => setScanMode("isbn")}
          >
            掃 ISBN
          </button>
          <button
            type="button"
            className={`segmented-button ${scanMode === "accession" ? "active" : ""}`}
            onClick={() => setScanMode("accession")}
          >
            掃館藏條碼
          </button>
        </div>
      </section>

      <BarcodeScanner
        label="掃 ISBN / 館藏條碼"
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

        <div className="inline-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => void lookupIsbnMetadata(isbn)}
            disabled={isLookupPending}
          >
            {isLookupPending ? "查詢中..." : "用 ISBN 帶入資料"}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setScanMode("isbn")}
          >
            下次掃到 ISBN
          </button>
        </div>

        {lookupMessage ? <div className="feedback">{lookupMessage}</div> : null}

        <label className="field">
          <span>館藏條碼</span>
          <input
            value={accessionCode}
            onChange={(event) => setAccessionCode(event.target.value)}
            onBlur={handleAccessionBlur}
            placeholder="例如 B0002，也可沿用 ISBN"
            autoCapitalize="characters"
          />
        </label>

        <div className="inline-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setScanMode("accession")}
          >
            下次掃到館藏條碼
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              const nextValue = isbn.trim();
              setAccessionCode(nextValue);
              void checkDuplicates(isbn, nextValue);
            }}
            disabled={!isbn.trim()}
          >
            用 ISBN 當館藏條碼
          </button>
        </div>

        {duplicateMessage ? (
          <div className={`feedback ${hasAccessionConflict ? "error" : ""}`}>
            {duplicateMessage}
          </div>
        ) : null}

        {duplicateBooks.length > 0 ? (
          <div className="feedback">
            <div>同 ISBN 既有館藏：</div>
            {duplicateBooks.slice(0, 3).map((book) => (
              <div key={book.id}>
                《{book.title}》 / 館藏條碼 {book.accessionCode}
              </div>
            ))}
          </div>
        ) : null}

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
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="例如 王小明"
          />
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
          <input type="file" accept="image/*" onChange={handleCoverChange} />
        </label>

        <CameraCapture onCapture={setCapturedCover} />

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
            placeholder="例如 書況、來源、特別標記"
            rows={4}
          />
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={isPending || hasAccessionConflict}
        >
          {isPending ? "建立中..." : "建立書籍"}
        </button>
      </form>

      {message ? (
        <div className="feedback success">
          <div>{message}</div>
          <div className="feedback-link-row">
            <Link href="/mobile/books" className="inline-link">
              看全部書籍
            </Link>
            {createdBookId ? (
              <span className="feedback-meta">ID: {createdBookId}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="feedback error">{error}</div> : null}
    </section>
  );
}
