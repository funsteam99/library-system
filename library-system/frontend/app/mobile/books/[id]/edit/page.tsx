"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { apiRequest } from "../../../../lib/api";
import { uploadImage } from "../../../../lib/upload";

type BookDetailResponse = {
  item: {
    id: number;
    isbn: string | null;
    accessionCode: string;
    title: string;
    author: string | null;
    publisher: string | null;
    publishYear: number | null;
    coverUrl: string | null;
    remark: string | null;
  };
};

export default function MobileBookEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isbn, setIsbn] = useState("");
  const [accessionCode, setAccessionCode] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishYear, setPublishYear] = useState("");
  const [remark, setRemark] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function loadBook() {
      try {
        const data = await apiRequest<BookDetailResponse>(`/api/books/${params.id}`);
        if (!active) return;
        setIsbn(data.item.isbn ?? "");
        setAccessionCode(data.item.accessionCode);
        setTitle(data.item.title);
        setAuthor(data.item.author ?? "");
        setPublisher(data.item.publisher ?? "");
        setPublishYear(data.item.publishYear ? String(data.item.publishYear) : "");
        setRemark(data.item.remark ?? "");
        setCoverUrl(data.item.coverUrl ?? null);
        setCoverPreview(data.item.coverUrl ?? null);
        setError(null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "書籍資料載入失敗");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBook();
    return () => {
      active = false;
    };
  }, [params.id]);

  function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setCoverFile(null);
      setCoverPreview(coverUrl);
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        let nextCoverUrl = coverUrl;

        if (coverFile) {
          const upload = await uploadImage("/api/uploads/book-cover", coverFile);
          nextCoverUrl = upload.url;
        }

        await apiRequest<BookDetailResponse>(`/api/books/${params.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            isbn: isbn || null,
            accessionCode,
            title,
            author: author || null,
            publisher: publisher || null,
            publishYear: publishYear ? Number(publishYear) : null,
            coverUrl: nextCoverUrl,
            remark: remark || null,
          }),
        });

        setMessage("書籍資料已更新");
        router.push("/mobile/books");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "書籍更新失敗");
      }
    });
  }

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Edit book</p>
        <h2>編輯書籍</h2>
        <p>修改書名、作者、館藏條碼等主檔資料。存檔後會回到書籍清單。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/books" className="action-card">
          <div className="action-badge">返回</div>
          <h3>回書籍清單</h3>
          <p>不修改時可直接回到清單查看其他書。</p>
        </Link>
      </section>

      {loading ? <div className="feedback">載入中...</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      {!loading && !error ? (
        <form className="mobile-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>ISBN</span>
            <input value={isbn} onChange={(event) => setIsbn(event.target.value)} />
          </label>
          <label className="field">
            <span>館藏條碼</span>
            <input value={accessionCode} onChange={(event) => setAccessionCode(event.target.value)} required />
          </label>
          <label className="field">
            <span>書名</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field">
            <span>作者</span>
            <input value={author} onChange={(event) => setAuthor(event.target.value)} />
          </label>
          <label className="field">
            <span>出版社</span>
            <input value={publisher} onChange={(event) => setPublisher(event.target.value)} />
          </label>
          <label className="field">
            <span>出版年</span>
            <input
              type="number"
              min="0"
              max="9999"
              value={publishYear}
              onChange={(event) => setPublishYear(event.target.value)}
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
            <textarea value={remark} onChange={(event) => setRemark(event.target.value)} rows={4} />
          </label>
          <button type="submit" className="primary-button" disabled={isPending}>
            {isPending ? "儲存中..." : "儲存變更"}
          </button>
        </form>
      ) : null}

      {message ? <div className="feedback success">{message}</div> : null}
    </section>
  );
}
