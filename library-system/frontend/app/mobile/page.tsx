import Link from "next/link";

const quickActions = [
  {
    href: "/mobile/loan",
    title: "借書",
    subtitle: "掃會員與書籍條碼，完成借出流程。",
  },
  {
    href: "/mobile/return",
    title: "還書",
    subtitle: "掃書即可歸還，現場快速處理流通。",
  },
  {
    href: "/mobile/books",
    title: "書籍管理",
    subtitle: "查看書籍清單，或進一步新增書籍資料。",
  },
  {
    href: "/mobile/members",
    title: "會員管理",
    subtitle: "查看會員清單，或進一步新增讀者資料。",
  },
];

export default function MobileHomePage() {
  return (
    <section className="mobile-stack">
      <article className="hero-card">
        <p className="eyebrow">Today&apos;s focus</p>
        <h2>在手機上完成借還書、書籍建檔與會員建檔</h2>
        <p>
          現在的行動版已經有借書、還書、書籍管理與會員管理。接下來你不需要記路徑，只要從首頁或底部導覽就能回到清單和新增頁。
        </p>
      </article>

      <section className="action-grid">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="action-card">
            <div className="action-badge">工作流</div>
            <h3>{action.title}</h3>
            <p>{action.subtitle}</p>
          </Link>
        ))}
      </section>

      <section className="status-panel">
        <div>
          <p className="eyebrow">測試會員</p>
          <strong>會員 `M0001`</strong>
          <p>測試讀者：王小明</p>
        </div>
        <div>
          <p className="eyebrow">測試書籍</p>
          <strong>書籍 `B0001`</strong>
          <p>圖書管理系統開發手冊</p>
        </div>
      </section>
    </section>
  );
}
