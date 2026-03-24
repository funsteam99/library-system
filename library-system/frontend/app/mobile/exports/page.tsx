"use client";

import Link from "next/link";

const exportItems = [
  {
    href: "/api/exports/books.xlsx",
    title: "匯出書籍",
    subtitle: "下載書籍清單，包含 ISBN、館藏條碼、狀態與備註。",
  },
  {
    href: "/api/exports/members.xlsx",
    title: "匯出會員",
    subtitle: "下載會員資料，包含電話、Email、單位與狀態。",
  },
  {
    href: "/api/exports/loans.xlsx",
    title: "匯出借閱",
    subtitle: "下載借閱紀錄，包含借出、到期、歸還與狀態。",
  },
];

export default function MobileExportsPage() {
  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Exports</p>
        <h2>Excel 匯出</h2>
        <p>先提供書籍、會員與借閱紀錄的 Excel 匯出，方便備份、交接與外部整理。</p>
      </article>

      <section className="action-grid">
        {exportItems.map((item) => (
          <a key={item.href} href={item.href} className="action-card">
            <div className="action-badge">下載</div>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
          </a>
        ))}
      </section>

      <section className="mobile-form">
        <div className="field">
          <span>下一步</span>
          <div>這一版先完成匯出；Excel 匯入會放在下一輪補上。</div>
        </div>
        <div className="inline-actions">
          <Link href="/mobile/books" className="ghost-button">
            回書籍清單
          </Link>
          <Link href="/mobile" className="ghost-button">
            回首頁
          </Link>
        </div>
      </section>
    </section>
  );
}
