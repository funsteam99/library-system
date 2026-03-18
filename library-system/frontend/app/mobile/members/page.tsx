"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
          setError(loadError instanceof Error ? loadError.message : "會員清單載入失敗");
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

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Members</p>
        <h2>會員清單</h2>
        <p>先用最基本的列表確認讀者資料是否已建立，之後再補搜尋與篩選。</p>
      </article>

      <section className="action-grid">
        <Link href="/mobile/members/new" className="action-card">
          <div className="action-badge">新增</div>
          <h3>建立新會員</h3>
          <p>回到手機會員建檔頁，繼續掃會員證與輸入讀者資料。</p>
        </Link>
        <Link href="/mobile" className="action-card">
          <div className="action-badge">返回</div>
          <h3>回首頁</h3>
          <p>回到行動工作台，切換到借還或書籍管理。</p>
        </Link>
      </section>

      <section className="books-list">
        {loading ? <div className="feedback">載入中...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        {!loading && !error && items.length === 0 ? (
          <div className="feedback">目前還沒有會員資料。</div>
        ) : null}
        {!loading && !error
          ? items.map((member) => (
              <article key={member.id} className="book-row">
                <div>
                  <h3>{member.name}</h3>
                  <p>會員編號：{member.memberCode}</p>
                  <p>電話：{member.phone ?? "未填"}</p>
                </div>
                <div className="book-row-side">
                  <span className="status-pill">{member.status}</span>
                  <p>{member.unitName ?? member.email ?? "未填單位"}</p>
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
