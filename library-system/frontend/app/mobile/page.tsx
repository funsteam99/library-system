"use client";

import Link from "next/link";

const quickActions = [
  {
    href: "/mobile/loan",
    title: "借書",
    subtitle: "掃會員證與書籍條碼，立即完成借出。",
  },
  {
    href: "/mobile/return",
    title: "還書",
    subtitle: "掃館藏條碼後直接完成歸還作業。",
  },
  {
    href: "/mobile/books",
    title: "書籍管理",
    subtitle: "查看書籍清單、建檔與編輯資料。",
  },
  {
    href: "/mobile/members",
    title: "會員管理",
    subtitle: "查看會員清單、建檔與更新資料。",
  },
  {
    href: "/mobile/loans",
    title: "借閱紀錄",
    subtitle: "查看全部借閱、借出中與逾期中的書。",
  },
  {
    href: "/mobile/exports",
    title: "Excel 匯出",
    subtitle: "下載書籍、會員與借閱紀錄 Excel。",
  },
  {
    href: "/mobile/imports",
    title: "Excel 匯入",
    subtitle: "上傳書籍與會員 Excel，批次建立資料。",
  },
  {
    href: "/mobile/inventory",
    title: "盤點",
    subtitle: "建立盤點批次並持續掃描在架館藏。",
  },
];

export default function MobileHomePage() {
  return (
    <section className="mobile-stack">
      <article className="hero-card">
        <p className="eyebrow">Today's focus</p>
        <h2>用手機完成借還、建檔與盤點</h2>
        <p>
          這是館員的行動工作台。你可以先掃 ISBN 建書、拍封面，再進行借書、還書與盤點，
          也能隨時打開借閱紀錄查看目前借出中與逾期書籍。
        </p>
      </article>

      <section className="action-grid">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="action-card">
            <div className="action-badge">常用功能</div>
            <h3>{action.title}</h3>
            <p>{action.subtitle}</p>
          </Link>
        ))}
      </section>

      <section className="status-panel">
        <div>
          <p className="eyebrow">測試會員</p>
          <strong>會員 `M0001`</strong>
          <p>可直接拿來驗證借書流程。</p>
        </div>
        <div>
          <p className="eyebrow">測試書籍</p>
          <strong>館藏 `B0001`</strong>
          <p>可直接拿來驗證借還與盤點流程。</p>
        </div>
      </section>
    </section>
  );
}
