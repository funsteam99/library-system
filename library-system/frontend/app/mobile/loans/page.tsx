"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";

type LoanItem = {
  id: number;
  loanDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: string;
  book: {
    id: number;
    title: string;
    accessionCode: string;
  };
  member: {
    id: number;
    name: string;
    memberCode: string;
  };
};

type LoansResponse = {
  items: LoanItem[];
};

type LoanFilter = "all" | "active" | "overdue";

const filterOptions: Array<{ value: LoanFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "active", label: "借出中" },
  { value: "overdue", label: "逾期中" },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "尚未歸還";
  }

  return new Date(value).toLocaleString("zh-TW");
}

function computeOverdueDays(dueDate: string) {
  const diff = Date.now() - new Date(dueDate).getTime();
  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getLoanStatusView(item: LoanItem, overdueIds: Set<number>) {
  const isActiveLoan = item.returnedAt === null;

  if (overdueIds.has(item.id) && isActiveLoan) {
    return {
      label: "逾期中",
      className: "status-pill status-pill-overdue",
    };
  }

  if (item.status === "returned") {
    return {
      label: "已歸還",
      className: "status-pill status-pill-returned",
    };
  }

  if (item.status === "overdue") {
    return {
      label: "逾期歸還",
      className: "status-pill status-pill-overdue-returned",
    };
  }

  return {
    label: "借出中",
    className: "status-pill status-pill-loaned",
  };
}

export default function MobileLoansPage() {
  const [items, setItems] = useState<LoanItem[]>([]);
  const [overdueIds, setOverdueIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<LoanFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [allLoans, overdueLoans] = await Promise.all([
          apiRequest<LoansResponse>("/api/loans"),
          apiRequest<LoansResponse>("/api/loans/overdue"),
        ]);

        if (!active) {
          return;
        }

        setItems(allLoans.items);
        setOverdueIds(new Set(overdueLoans.items.map((item) => item.id)));
        setError(null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "讀取借閱資料時發生錯誤。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const activeLoans = items.filter((item) => item.returnedAt === null);
    const overdueLoans = items.filter((item) => overdueIds.has(item.id) && item.returnedAt === null);

    return {
      total: items.length,
      active: activeLoans.length,
      overdue: overdueLoans.length,
    };
  }, [items, overdueIds]);

  const filteredItems = useMemo(() => {
    const byStatus =
      filter === "active"
        ? items.filter((item) => item.returnedAt === null)
        : filter === "overdue"
          ? items.filter((item) => overdueIds.has(item.id) && item.returnedAt === null)
          : items;

    const normalized = keyword.trim().toLowerCase();

    if (!normalized) {
      return byStatus;
    }

    return byStatus.filter((item) =>
      [
        item.book.title,
        item.book.accessionCode,
        item.member.name,
        item.member.memberCode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [filter, items, keyword, overdueIds]);

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Loan records</p>
        <h2>借閱紀錄</h2>
        <p>集中查看全部借閱、目前借出中，以及尚未歸還的逾期書籍。</p>
      </article>

      <section className="status-panel">
        <div>
          <p className="eyebrow">全部紀錄</p>
          <strong>{summary.total}</strong>
          <p>累積借閱與歸還歷史。</p>
        </div>
        <div>
          <p className="eyebrow">借出中</p>
          <strong>{summary.active}</strong>
          <p>尚未歸還的館藏。</p>
        </div>
        <div>
          <p className="eyebrow">逾期中</p>
          <strong>{summary.overdue}</strong>
          <p>到期未還，需要追蹤。</p>
        </div>
        <div>
          <p className="eyebrow">快捷入口</p>
          <Link href="/mobile/loan" className="inline-link">
            去借書
          </Link>
          <p>也可切到還書頁處理歸還。</p>
        </div>
      </section>

      <section className="mobile-form">
        <div className="field">
          <span>篩選紀錄</span>
          <div className="segmented-control" role="tablist" aria-label="借閱篩選">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented-button ${filter === option.value ? "active" : ""}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>搜尋借閱</span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="可輸入書名、館藏條碼、會員姓名或會員編號"
          />
        </label>
      </section>

      <section className="books-list">
        {loading ? <div className="feedback">讀取借閱紀錄中...</div> : null}
        {error ? <div className="feedback error">{error}</div> : null}
        {!loading && !error && filteredItems.length === 0 ? (
          <div className="feedback">
            {keyword
              ? "查無符合搜尋條件的借閱紀錄。"
              : filter === "overdue"
                ? "目前沒有逾期中的借閱。"
                : "目前沒有符合條件的借閱紀錄。"}
          </div>
        ) : null}

        {!loading && !error
          ? filteredItems.map((item) => {
              const overdueDays = overdueIds.has(item.id) ? computeOverdueDays(item.dueDate) : 0;
              const statusView = getLoanStatusView(item, overdueIds);

              return (
                <article key={item.id} className="book-row">
                  <div className="book-row-main">
                    <h3>{item.book.title}</h3>
                    <p>館藏條碼：{item.book.accessionCode}</p>
                    <p>
                      借閱會員：{item.member.name} / {item.member.memberCode}
                    </p>
                    <p>借出時間：{formatDateTime(item.loanDate)}</p>
                    <p>到期時間：{formatDateTime(item.dueDate)}</p>
                    <p>歸還時間：{formatDateTime(item.returnedAt)}</p>
                    {overdueDays > 0 && item.returnedAt === null ? <p>逾期天數：{overdueDays} 天</p> : null}
                  </div>

                  <div className="book-row-side">
                    <span className={statusView.className}>{statusView.label}</span>
                  </div>
                </article>
              );
            })
          : null}
      </section>
    </section>
  );
}
