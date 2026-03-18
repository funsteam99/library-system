import Link from "next/link";

const navItems = [
  { href: "/mobile", label: "首頁" },
  { href: "/mobile/loan", label: "借還" },
  { href: "/mobile/books", label: "書籍" },
  { href: "/mobile/members", label: "會員" },
];

export default function MobileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mobile-shell">
      <div className="mobile-frame">
        <header className="mobile-header">
          <div>
            <p className="eyebrow">Library PWA</p>
            <h1 className="mobile-title">館員行動工作台</h1>
          </div>
          <Link href="/" className="mini-link">
            總覽
          </Link>
        </header>

        {children}

        <nav className="bottom-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="bottom-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
