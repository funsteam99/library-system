"use client";

import Link from "next/link";

import { isAdminOperator } from "../lib/auth";

const quickActions = [
  {
    href: "/mobile/loan",
    title: "借書",
    subtitle: "掃會員與書籍條碼，快速完成借出。",
  },
  {
    href: "/mobile/return",
    title: "還書",
    subtitle: "掃書籍條碼，立即完成歸還與逾期判斷。",
  },
  {
    href: "/mobile/books",
    title: "書籍清單",
    subtitle: "查詢、建立與編輯館藏書籍資料。",
  },
  {
    href: "/mobile/members",
    title: "會員清單",
    subtitle: "查詢、建立與編輯會員資料。",
  },
  {
    href: "/mobile/loans",
    title: "借閱紀錄",
    subtitle: "查看借出中、逾期中與歷史借閱紀錄。",
  },
  {
    href: "/mobile/exports",
    title: "Excel 匯出",
    subtitle: "下載書籍、會員與借閱資料。",
    adminOnly: true,
  },
  {
    href: "/mobile/imports",
    title: "Excel 匯入",
    subtitle: "用 Excel 批次建立書籍或會員資料。",
    adminOnly: true,
  },
  {
    href: "/mobile/inventory",
    title: "盤點",
    subtitle: "建立盤點批次、掃描館藏並輸出差異表。",
  },
];

export default function MobileHomePage() {
  const isAdmin = isAdminOperator();
  const visibleActions = quickActions.filter((action) => !action.adminOnly || isAdmin);

  return (
    <section className="mobile-stack">
      <article className="hero-card">
        <p className="eyebrow">Today's focus</p>
        <h2>手機就能處理建檔、借還與盤點</h2>
        <p>
          這個入口整合了書籍建檔、會員管理、借還書、盤點與 Excel 資料交換。
          若你目前是館員角色，系統會自動隱藏需要管理權限的功能。
        </p>
      </article>

      <section className="action-grid">
        {visibleActions.map((action) => (
          <Link key={action.href} href={action.href} className="action-card">
            <div className="action-badge">常用功能</div>
            <h3>{action.title}</h3>
            <p>{action.subtitle}</p>
          </Link>
        ))}
      </section>

      <section className="status-panel">
        <div>
          <p className="eyebrow">借書測試</p>
          <strong>會員 `M0001`</strong>
          <p>可先用測試會員確認借書流程是否正常。</p>
        </div>
        <div>
          <p className="eyebrow">還書測試</p>
          <strong>館藏 `B0001`</strong>
          <p>可先用測試館藏確認還書與狀態更新。</p>
        </div>
      </section>
    </section>
  );
}
