"use client";

import Link from "next/link";

import { getCurrentOperatorId } from "../../lib/auth";
import { getApiUrl } from "../../lib/api";

export default function MobileExportsPage() {
  const userId = getCurrentOperatorId();
  const exportItems = [
    {
      href: getApiUrl(`/api/exports/books.xlsx?userId=${userId}`),
      title: "匯出書籍",
      subtitle: "下載書籍清單，包含 ISBN、館藏條碼、狀態與備註。",
    },
    {
      href: getApiUrl(`/api/exports/members.xlsx?userId=${userId}`),
      title: "匯出會員",
      subtitle: "下載會員資料，包含聯絡方式、單位與狀態。",
    },
    {
      href: getApiUrl(`/api/exports/loans.xlsx?userId=${userId}`),
      title: "匯出借閱",
      subtitle: "下載借閱紀錄，方便做統計、追蹤與備查。",
    },
  ];

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Exports</p>
        <h2>Excel 匯出</h2>
        <p>將書籍、會員與借閱資料匯出成 Excel。此功能限管理員使用。</p>
      </article>

      <section className="action-grid">
        {exportItems.map((item) => (
          <a key={item.href} href={item.href} className="action-card">
            <div className="action-badge">匯出</div>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
          </a>
        ))}
      </section>

      <section className="mobile-form">
        <div className="field">
          <span>提醒</span>
          <div>若目前操作者是 staff，系統會拒絕匯出請求。</div>
        </div>
        <div className="inline-actions">
          <Link href="/mobile/books" className="ghost-button">
            查看書籍
          </Link>
          <Link href="/mobile" className="ghost-button">
            回首頁
          </Link>
        </div>
      </section>
    </section>
  );
}
