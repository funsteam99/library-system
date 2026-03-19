"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";

type MembersResponse = {
  items: Array<{
    id: number;
    memberCode: string;
    name: string;
    phone: string | null;
    email: string | null;
    unitName: string | null;
    status: string;
  }>;
};

export default function MobileMembersPage() {
  const [items, setItems] = useState<MembersResponse["items"]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      try {
        const data = await apiRequest<MembersResponse>("/api/members");
        if (active) {
          setItems(data.items);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "讀取會員清單失敗。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((member) =>
      [member.name, member.memberCode, member.phone, member.email, member.unitName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [items, keyword]);

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Members</p>
        <h2>會員清單</h2>
        <p>可先搜尋會員編號、姓名、電話或單位，再決定要編輯資料還是直接借書。</p>
      </article>

      <section className="action-grid">
        <Link href="/mobile/members/new" className="action-card">
          <div className="action-badge">新增</div>
          <h3>建立新會員</h3>
          <p>現場新增會員資料、拍照後即可接續借書流程。</p>
        </Link>
        <Link href="/mobile" className="action-card">
          <div className="action-badge">返回</div>
          <h3>回到首頁</h3>
          <p>切回借還、書籍建檔或盤點流程。</p>
        </Link>
      </section>

      <section className="mobile-form">
        <label className="field">
          <span>搜尋會員</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="輸入姓名、會員編號、電話、Email 或單位"
          />
        </label>
      </section>

      <section className="books-list">
        {loading ? <div className="feedback">載入中...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        {!loading && !error && filteredItems.length === 0 ? (
          <div className="feedback">{keyword ? "查無符合條件的會員。" : "目前還沒有會員資料。"}</div>
        ) : null}
        {!loading && !error
          ? filteredItems.map((member) => (
              <article key={member.id} className="book-row">
                <div>
                  <h3>{member.name}</h3>
                  <p>會員編號：{member.memberCode}</p>
                  <p>電話：{member.phone ?? "未填寫"}</p>
                </div>
                <div className="book-row-side">
                  <span className="status-pill">{member.status}</span>
                  <p>{member.unitName ?? member.email ?? "未填寫單位"}</p>
                  <Link href={`/mobile/members/${member.id}/edit`} className="inline-link">
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
