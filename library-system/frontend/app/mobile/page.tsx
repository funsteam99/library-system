import Link from "next/link";

const quickActions = [
  {
    href: "/mobile/loan",
    title: "借書",
    subtitle: "掃會員與書籍條碼，快速完成借閱。",
  },
  {
    href: "/mobile/return",
    title: "還書",
    subtitle: "掃書籍條碼即可完成歸還。",
  },
  {
    href: "/mobile/books",
    title: "書籍管理",
    subtitle: "搜尋、建檔與編輯館藏資料。",
  },
  {
    href: "/mobile/members",
    title: "會員管理",
    subtitle: "搜尋、建檔與更新會員資料。",
  },
  {
    href: "/mobile/inventory",
    title: "盤點",
    subtitle: "建立盤點批次，掃描在架書籍。",
  },
];

export default function MobileHomePage() {
  return (
    <section className="mobile-stack">
      <article className="hero-card">
        <p className="eyebrow">Today&apos;s focus</p>
        <h2>以手機完成借還、建檔、拍照與盤點。</h2>
        <p>
          這套流程以行動作業為核心。館員可以拿著手機在現場掃 ISBN、建立書籍、建立會員、
          借還書、拍封面與進行盤點，不必反覆回到桌機整理資料。
        </p>
      </article>

      <section className="action-grid">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="action-card">
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
          <p>可直接拿來測借書流程。</p>
        </div>
        <div>
          <p className="eyebrow">測試書籍</p>
          <strong>書籍 `B0001`</strong>
          <p>可直接拿來測借還與盤點流程。</p>
        </div>
      </section>
    </section>
  );
}
