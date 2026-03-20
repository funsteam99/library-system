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

type ScanMode = "auto" | "isbn" | "accession";

type LookupSource = {
  id: string;
  label: string;
};

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
  attemptedSources: LookupSource[];
  matchedSource: LookupSource | null;
  foundFields: string[];
};

type BookSummary = {
  id: number;
  title: string;
  accessionCode: string;
  isbn: string | null;
  author: string | null;
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
  };
};

const REQUIRED_METADATA_FIELDS = ["書名", "作者", "出版社", "出版年"] as const;

const scanModeOptions: Array<{ value: ScanMode; label: string; helper: string }> = [
  {
    value: "auto",
    label: "自動判斷",
    helper: "先填 ISBN，再把下一次掃碼帶到館藏條碼。",
  },
  {
    value: "isbn",
    label: "掃 ISBN",
    helper: "每次掃碼都覆蓋 ISBN，並強制重新查詢書目。",
  },
  {
    value: "accession",
    label: "掃館藏條碼",
    helper: "每次掃碼都覆蓋館藏條碼，不查外部書目。",
  },
];

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
  const [lookupTrace, setLookupTrace] = useState<{
    attemptedSources: LookupSource[];
    matchedSource: LookupSource | null;
    foundFields: string[];
  }>({
    attemptedSources: [],
    matchedSource: null,
    foundFields: [],
  });
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [duplicateBooks, setDuplicateBooks] = useState<BookSummary[]>([]);
  const [hasAccessionConflict, setHasAccessionConflict] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdBookId, setCreatedBookId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lastLookedUpIsbn = useRef("");

  const canUseIsbnAsAccession = useMemo(() => {
    return isbn.trim().length > 0;
  }, [isbn]);

  function resetLookupState() {
    setLookupMessage(null);
    setLookupTrace({
      attemptedSources: [],
      matchedSource: null,
      foundFields: [],
    });
    setDuplicateMessage(null);
    setDuplicateBooks([]);
    setHasAccessionConflict(false);
    lastLookedUpIsbn.current = "";
  }

  function resetForNextBook() {
    setIsbn("");
    setAccessionCode("");
    setTitle("");
    setAuthor("");
    setPublisher("");
    setPublishYear("");
    setRemark("");
    setCoverPreview(null);
    setCoverFile(null);
    resetLookupState();
    setError(null);
  }

  function handleCoverSelected(file: File, previewUrl: string) {
    setCoverFile(file);
    setCoverPreview(previewUrl);
    setError(null);
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setCoverFile(null);
      setCoverPreview(null);
      return;
    }

    handleCoverSelected(file, URL.createObjectURL(file));
  }

  async function checkDuplicates(nextIsbn: string, nextAccessionCode: string) {
    const params = new URLSearchParams();

    if (nextIsbn.trim()) {
      params.set("isbn", nextIsbn.trim());
    }

    if (nextAccessionCode.trim()) {
      params.set("accessionCode", nextAccessionCode.trim());
    }

    if (!params.toString()) {
      setDuplicateMessage(null);
      setDuplicateBooks([]);
      setHasAccessionConflict(false);
      return;
    }

    try {
      const response = await apiRequest<DuplicateCheckResponse>(`/api/books/check?${params.toString()}`);
      const isbnMatches = response.item.isbnMatches ?? [];
      const accessionMatch = response.item.accessionMatch;
      const messages: string[] = [];

      setDuplicateBooks(isbnMatches);
      setHasAccessionConflict(Boolean(accessionMatch));

      if (isbnMatches.length > 0) {
        messages.push(`此 ISBN 已有 ${isbnMatches.length} 筆館藏紀錄。`);
      }

      if (accessionMatch) {
        messages.push(`館藏條碼 ${accessionMatch.accessionCode} 已存在。`);
      }

      setDuplicateMessage(messages.length > 0 ? messages.join(" ") : null);
    } catch {
      setDuplicateMessage("重複館藏檢查暫時失敗，仍可先手動確認。");
      setDuplicateBooks([]);
      setHasAccessionConflict(false);
    }
  }

  async function lookupIsbnMetadata(nextIsbn: string, force = false) {
    const normalized = nextIsbn.trim();

    if (!normalized) {
      resetLookupState();
      return;
    }

    if (!force && lastLookedUpIsbn.current === normalized) {
      return;
    }

    lastLookedUpIsbn.current = normalized;
    setLookupMessage("正在查詢外部書目資料...");
    setLookupTrace({
      attemptedSources: [],
      matchedSource: null,
      foundFields: [],
    });
    setError(null);

    try {
      const payload = await apiRequest<LookupResponse>(
        `/api/books/lookup/isbn/${encodeURIComponent(normalized)}`,
      );

      setLookupTrace({
        attemptedSources: payload.attemptedSources ?? [],
        matchedSource: payload.matchedSource ?? null,
        foundFields: payload.foundFields ?? [],
      });

      if (!payload.item) {
        setLookupMessage("查不到可用書目資料，請直接手動輸入。");
        return;
      }

      if (payload.item.title) {
        setTitle(payload.item.title);
      }
      if (payload.item.author) {
        setAuthor(payload.item.author);
      }
      if (payload.item.publisher) {
        setPublisher(payload.item.publisher);
      }
      if (typeof payload.item.publishYear === "number") {
        setPublishYear(String(payload.item.publishYear));
      }
      if (payload.item.coverUrl) {
        setCoverPreview(payload.item.coverUrl);
        setCoverFile(null);
      }

      const missingRequiredFields = REQUIRED_METADATA_FIELDS.filter(
        (field) => !payload.foundFields.includes(field),
      );

      if (missingRequiredFields.length === 0) {
        setLookupMessage(
          `已命中 ${payload.matchedSource?.label ?? "外部來源"}，並自動帶入完整書目資料。`,
        );
      } else {
        setLookupMessage(
          `已先帶入找到的欄位；仍缺少 ${missingRequiredFields.join("、")}，請手動補齊。`,
        );
      }
    } catch (lookupError) {
      setLookupMessage(
        lookupError instanceof Error
          ? lookupError.message
          : "查詢外部書目資料時發生錯誤。",
      );
    }
  }

  function handleBookCodeDetected(code: string) {
    const nextCode = code.trim();

    if (!nextCode) {
      return;
    }

    // 掃描器在建完上一本後應直接進入下一本，不沿用舊欄位。
    if (createdBookId || message) {
      resetForNextBook();
      setCreatedBookId(null);
      setMessage(null);
    }

    if (scanMode === "isbn") {
      setIsbn(nextCode);
      void checkDuplicates(nextCode, accessionCode);
      void lookupIsbnMetadata(nextCode, true);
      return;
    }

    if (scanMode === "accession") {
      setAccessionCode(nextCode);
      void checkDuplicates(isbn, nextCode);
      return;
    }

    const shouldUseIsbn = !isbn.trim();

    if (shouldUseIsbn) {
      setIsbn(nextCode);
      void checkDuplicates(nextCode, accessionCode);
      void lookupIsbnMetadata(nextCode, true);
      return;
    }

    setAccessionCode(nextCode);
    void checkDuplicates(isbn, nextCode);
  }

  function applyIsbnToAccessionCode() {
    const nextAccessionCode = isbn.trim();

    if (!nextAccessionCode) {
      return;
    }

    setAccessionCode(nextAccessionCode);
    void checkDuplicates(isbn, nextAccessionCode);
  }

  function handleIsbnBlur() {
    const normalized = isbn.trim();

    if (!normalized) {
      return;
    }

    void checkDuplicates(normalized, accessionCode);
    void lookupIsbnMetadata(normalized);
  }

  function handleAccessionBlur() {
    void checkDuplicates(isbn, accessionCode);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setCreatedBookId(null);
    setError(null);

    if (hasAccessionConflict) {
      setError("館藏條碼已存在，請更換後再建立書籍。");
      return;
    }

    startTransition(async () => {
      try {
        let coverUrl = coverPreview;

        if (coverFile) {
          const upload = await uploadImage("/api/uploads/book-cover", coverFile);
          coverUrl = upload.url;
        }

        const payload = await apiRequest<CreateBookResponse>("/api/books", {
          method: "POST",
          body: JSON.stringify({
            isbn: isbn.trim() || null,
            accessionCode: accessionCode.trim() || isbn.trim(),
            title: title.trim(),
            author: author.trim() || null,
            publisher: publisher.trim() || null,
            publishYear: publishYear.trim() ? Number(publishYear.trim()) : null,
            coverUrl: coverUrl || null,
            remark: remark.trim() || null,
            status: "available",
          }),
        });

        setCreatedBookId(payload.item.id);
        setMessage(`已建立書籍《${payload.item.title}》，館藏條碼 ${payload.item.accessionCode}。`);
        resetForNextBook();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "建立書籍時發生錯誤。",
        );
      }
    });
  }

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Book intake</p>
        <h2>書籍建檔</h2>
        <p>先掃 ISBN 帶入可找到的書目資料，再補館藏條碼、封面與備註；建立後可直接掃下一本。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/books" className="action-card">
          <div className="action-badge">書籍</div>
          <h3>查看書籍清單</h3>
          <p>確認剛建立的資料、封面與狀態，或再進一步編輯。</p>
        </Link>
      </section>

      <section className="mobile-form">
        <div className="field">
          <span>掃碼模式</span>
          <div className="segmented-control" role="tablist" aria-label="掃碼模式">
            {scanModeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented-button ${scanMode === option.value ? "active" : ""}`}
                onClick={() => setScanMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <small>{scanModeOptions.find((option) => option.value === scanMode)?.helper}</small>
        </div>
      </section>

      <BarcodeScanner
        label="掃書籍條碼"
        helperText="開啟掃描後，會依照目前模式強制更新欄位；若是 ISBN 也會重新查詢書目。"
        onDetected={handleBookCodeDetected}
      />

      <form className="mobile-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>ISBN</span>
          <input
            value={isbn}
            onChange={(event) => {
              setIsbn(event.target.value);
              setError(null);
            }}
            onBlur={handleIsbnBlur}
            placeholder="例如 9789866535581"
            inputMode="numeric"
          />
        </label>

        <div className="inline-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              void checkDuplicates(isbn, accessionCode);
              void lookupIsbnMetadata(isbn, true);
            }}
            disabled={!isbn.trim()}
          >
            用 ISBN 帶入資料
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setScanMode("isbn")}
          >
            下次掃到 ISBN
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setScanMode("accession")}
          >
            下次掃到館藏條碼
          </button>
        </div>

        <label className="field">
          <span>館藏條碼</span>
          <input
            value={accessionCode}
            onChange={(event) => {
              setAccessionCode(event.target.value);
              setError(null);
            }}
            onBlur={handleAccessionBlur}
            placeholder="例如 B0002"
            autoCapitalize="characters"
          />
        </label>

        <div className="inline-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={applyIsbnToAccessionCode}
            disabled={!canUseIsbnAsAccession}
          >
            用 ISBN 當館藏條碼
          </button>
        </div>

        {lookupMessage ? <div className="feedback">{lookupMessage}</div> : null}

        {lookupTrace.attemptedSources.length > 0 ? (
          <div className="feedback-meta">
            <div>查詢來源：{lookupTrace.attemptedSources.map((source) => source.label).join("、")}</div>
            <div>命中來源：{lookupTrace.matchedSource?.label ?? "未命中"}</div>
            <div>
              已找到欄位：
              {lookupTrace.foundFields.length > 0 ? lookupTrace.foundFields.join("、") : "尚未找到"}
            </div>
          </div>
        ) : null}

        {duplicateMessage ? <div className="feedback error">{duplicateMessage}</div> : null}

        {duplicateBooks.length > 0 ? (
          <div className="feedback-meta">
            <div>同 ISBN 館藏：</div>
            {duplicateBooks.map((book) => (
              <div key={book.id}>
                #{book.id}《{book.title}》 / {book.accessionCode}
              </div>
            ))}
          </div>
        ) : null}

        <label className="field">
          <span>書名</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如 不動產疑難雜症解析：增訂版"
            required
          />
        </label>

        <label className="field">
          <span>作者</span>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="例如 趙坤麟"
          />
        </label>

        <label className="field">
          <span>出版社</span>
          <input
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            placeholder="例如 馥林文化"
          />
        </label>

        <label className="field">
          <span>出版年</span>
          <input
            value={publishYear}
            onChange={(event) => setPublishYear(event.target.value)}
            placeholder="例如 2010"
            inputMode="numeric"
          />
        </label>

        <label className="field">
          <span>封面照片</span>
          <input type="file" accept="image/*" onChange={handleCoverChange} />
        </label>

        <CameraCapture label="用桌機相機拍封面" onCapture={handleCoverSelected} />

        {coverPreview ? (
          <div className="cover-preview-card">
            <img src={coverPreview} alt="書籍封面預覽" className="cover-preview-image" />
          </div>
        ) : null}

        <label className="field">
          <span>備註</span>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="可記錄櫃位、分類或來源補充說明。"
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
              看全部書籍
            </Link>
            {createdBookId ? <span className="feedback-meta">ID: {createdBookId}</span> : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="feedback error">{error}</div> : null}
    </section>
  );
}
