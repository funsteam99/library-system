"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { apiRequest } from "../../../../lib/api";
import { uploadImage } from "../../../../lib/upload";

type MemberDetailResponse = {
  item: {
    id: number;
    memberCode: string;
    name: string;
    phone: string | null;
    email: string | null;
    unitName: string | null;
    note: string | null;
    photoUrl: string | null;
    status: string;
  };
};

export default function MobileMemberEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [memberCode, setMemberCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [unitName, setUnitName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("active");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function loadMember() {
      try {
        const data = await apiRequest<MemberDetailResponse>(`/api/members/${params.id}`);
        if (!active) return;
        setMemberCode(data.item.memberCode);
        setName(data.item.name);
        setPhone(data.item.phone ?? "");
        setEmail(data.item.email ?? "");
        setUnitName(data.item.unitName ?? "");
        setNote(data.item.note ?? "");
        setPhotoUrl(data.item.photoUrl ?? null);
        setPhotoPreview(data.item.photoUrl ?? null);
        setStatus(data.item.status);
        setError(null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "會員資料載入失敗");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMember();
    return () => {
      active = false;
    };
  }, [params.id]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(photoUrl);
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        let nextPhotoUrl = photoUrl;

        if (photoFile) {
          const upload = await uploadImage("/api/uploads/member-photo", photoFile);
          nextPhotoUrl = upload.url;
        }

        await apiRequest<MemberDetailResponse>(`/api/members/${params.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            memberCode,
            name,
            phone: phone || null,
            email: email || null,
            unitName: unitName || null,
            photoUrl: nextPhotoUrl,
            note: note || null,
            status,
          }),
        });

        setMessage("會員資料已更新");
        router.push("/mobile/members");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "會員更新失敗");
      }
    });
  }

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Edit member</p>
        <h2>編輯會員</h2>
        <p>修改會員編號、姓名、電話與狀態。存檔後會回到會員清單。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/members" className="action-card">
          <div className="action-badge">返回</div>
          <h3>回會員清單</h3>
          <p>不修改時可直接回到清單查看其他會員。</p>
        </Link>
      </section>

      {loading ? <div className="feedback">載入中...</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      {!loading && !error ? (
        <form className="mobile-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>會員編號</span>
            <input value={memberCode} onChange={(event) => setMemberCode(event.target.value)} required />
          </label>
          <label className="field">
            <span>姓名</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field">
            <span>電話</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>單位 / 班級</span>
            <input value={unitName} onChange={(event) => setUnitName(event.target.value)} />
          </label>
          <label className="field">
            <span>會員照片</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} />
          </label>
          {photoPreview ? (
            <div className="cover-preview-card">
              <img src={photoPreview} alt="會員照片預覽" className="cover-preview-image" />
            </div>
          ) : null}
          <label className="field">
            <span>狀態</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="field-select">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <label className="field">
            <span>備註</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
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
