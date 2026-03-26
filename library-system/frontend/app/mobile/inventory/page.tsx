"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";

import { BarcodeScanner } from "../../components/barcode-scanner";
import { apiRequest } from "../../lib/api";
import { getCurrentOperatorId } from "../../lib/auth";
import { getApiUrl } from "../../lib/api";

type InventoryResult = "found" | "wrong_shelf" | "damaged" | "missing_check";

type InventorySession = {
  id: number;
  name: string;
  inventoryDate: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  scannedCount: number;
  anomalyCount: number;
};

type InventoryItem = {
  id: number;
  title?: string;
  accessionCode?: string;
  isbn?: string | null;
  scannedAt: string;
  result: InventoryResult;
  remark?: string | null;
};

type MissingBook = {
  id: number;
  title: string;
  accessionCode: string;
  isbn: string | null;
};

type InventorySessionsResponse = {
  items: InventorySession[];
};

type InventorySessionDetailResponse = {
  item: InventorySession & {
    scannedItems: InventoryItem[];
    missingBooks: MissingBook[];
  };
};

const resultOptions: Array<{ value: InventoryResult; label: string; description: string }> = [
  { value: "found", label: "在架", description: "正常掃到，在正確位置。" },
  { value: "wrong_shelf", label: "錯櫃", description: "有找到，但位置不正確。" },
  { value: "damaged", label: "損壞", description: "掃到時發現破損或需處理。" },
  { value: "missing_check", label: "待查", description: "疑似異常，需後續確認。" },
];

const resultLabels: Record<InventoryResult, string> = {
  found: "在架",
  wrong_shelf: "錯櫃",
  damaged: "損壞",
  missing_check: "待查",
};

function getResultClassName(result: InventoryResult) {
  if (result === "found") {
    return "status-pill status-pill-returned";
  }

  if (result === "wrong_shelf") {
    return "status-pill status-pill-loaned";
  }

  return "status-pill status-pill-overdue";
}

export default function MobileInventoryPage() {
  const userId = getCurrentOperatorId();
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<InventorySessionDetailResponse["item"] | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [scanResult, setScanResult] = useState<InventoryResult>("found");
  const [scanRemark, setScanRemark] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function loadSessions(targetSessionId?: number | null) {
    const data = await apiRequest<InventorySessionsResponse>("/api/inventory/sessions");
    setSessions(data.items);

    const nextSessionId = targetSessionId ?? selectedSessionId ?? data.items[0]?.id ?? null;
    setSelectedSessionId(nextSessionId);

    if (nextSessionId) {
      const detail = await apiRequest<InventorySessionDetailResponse>(`/api/inventory/sessions/${nextSessionId}`);
      setSelectedSession(detail.item);
    } else {
      setSelectedSession(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        await loadSessions();
        if (active) {
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "讀取盤點資料時發生錯誤。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void boot();

    return () => {
      active = false;
    };
  }, []);

  function handleDetected(code: string) {
    setBookCode(code);
    setError(null);
  }

  function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const payload = await apiRequest<{ item: InventorySession }>("/api/inventory/sessions", {
          method: "POST",
          body: JSON.stringify({
            name: newSessionName || `盤點 ${new Date().toLocaleDateString("zh-TW")}`,
            startedByUserId: getCurrentOperatorId(),
          }),
        });

        setNewSessionName("");
        await loadSessions(payload.item.id);
        setMessage(`已建立盤點批次：${payload.item.name}`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "建立盤點批次失敗。");
      }
    });
  }

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSessionId || !bookCode.trim()) {
      setError("請先選擇盤點批次，並輸入或掃描館藏條碼。");
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const payload = await apiRequest<{ item: { title?: string; accessionCode?: string; result: InventoryResult } }>(
          `/api/inventory/sessions/${selectedSessionId}/scan`,
          {
            method: "POST",
            body: JSON.stringify({
              bookCode,
              operatorUserId: getCurrentOperatorId(),
              result: scanResult,
              remark: scanRemark.trim() || null,
            }),
          },
        );

        await loadSessions(selectedSessionId);
        setBookCode("");
        setScanRemark("");
        setMessage(
          `已記錄《${payload.item.title ?? "未命名書籍"}》 / ${payload.item.accessionCode ?? "未知條碼"} 為 ${resultLabels[payload.item.result]}`,
        );
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "盤點掃描失敗。");
      }
    });
  }

  function handleCompleteSession() {
    if (!selectedSessionId) {
      setError("請先選擇盤點批次。");
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const payload = await apiRequest<{
          item: InventorySession & {
            missingCount: number;
            missingBooks: Array<{ title: string; accessionCode: string }>;
          };
        }>(`/api/inventory/sessions/${selectedSessionId}/complete`, {
          method: "POST",
          body: JSON.stringify({}),
        });

        await loadSessions(selectedSessionId);
        setMessage(`已完成盤點，本次未掃到 ${payload.item.missingCount} 本書。`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "完成盤點失敗。");
      }
    });
  }

  const summary = useMemo(() => {
    const scannedItems = selectedSession?.scannedItems ?? [];

    return {
      found: scannedItems.filter((item) => item.result === "found").length,
      wrongShelf: scannedItems.filter((item) => item.result === "wrong_shelf").length,
      damaged: scannedItems.filter((item) => item.result === "damaged").length,
      missingCheck: scannedItems.filter((item) => item.result === "missing_check").length,
      missingBooks: selectedSession?.missingBooks.length ?? 0,
    };
  }, [selectedSession]);

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Inventory</p>
        <h2>盤點</h2>
        <p>建立盤點批次後可持續掃描，並記錄在架、錯櫃、損壞與待查，完成後直接查看未掃到清單。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/books" className="action-card">
          <div className="action-badge">書籍</div>
          <h3>查看書籍清單</h3>
          <p>盤點時需要對照館藏資料，可快速切到書籍清單。</p>
        </Link>
        {selectedSessionId ? (
          <a href={getApiUrl(`/api/exports/inventory/${selectedSessionId}.xlsx?userId=${userId}`)} className="action-card">
            <div className="action-badge">匯出</div>
            <h3>下載盤點結果</h3>
            <p>匯出這次盤點的已掃到與未掃到清單。</p>
          </a>
        ) : null}
      </section>

      <form className="mobile-form" onSubmit={handleCreateSession}>
        <label className="field">
          <span>建立盤點批次</span>
          <input
            value={newSessionName}
            onChange={(event) => setNewSessionName(event.target.value)}
            placeholder="例如 2026 春季盤點"
          />
        </label>
        <button type="submit" className="primary-button" disabled={isPending}>
          {isPending ? "建立中..." : "建立盤點批次"}
        </button>
      </form>

      <section className="mobile-form">
        <label className="field">
          <span>選擇盤點批次</span>
          <select
            value={selectedSessionId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value ? Number(event.target.value) : null;
              setSelectedSessionId(nextId);
              if (nextId) {
                void loadSessions(nextId);
              } else {
                setSelectedSession(null);
              }
            }}
            className="field-select"
          >
            <option value="">請選擇</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} / {session.status}
              </option>
            ))}
          </select>
        </label>
      </section>

      <BarcodeScanner
        label="掃描盤點書籍"
        helperText="可掃館藏條碼或 ISBN；掃到後再依實際情況選擇在架、錯櫃、損壞或待查。"
        onDetected={handleDetected}
      />

      <form className="mobile-form" onSubmit={handleScan}>
        <label className="field">
          <span>館藏條碼</span>
          <input
            value={bookCode}
            onChange={(event) => setBookCode(event.target.value)}
            placeholder="例如 B0001"
            autoCapitalize="characters"
          />
        </label>

        <div className="field">
          <span>盤點結果</span>
          <div className="segmented-control" role="tablist" aria-label="盤點結果">
            {resultOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented-button ${scanResult === option.value ? "active" : ""}`}
                onClick={() => setScanResult(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <small>{resultOptions.find((option) => option.value === scanResult)?.description}</small>
        </div>

        <label className="field">
          <span>備註</span>
          <textarea
            value={scanRemark}
            onChange={(event) => setScanRemark(event.target.value)}
            placeholder="例如 放在錯誤書櫃、封面脫落、需要後續確認。"
            rows={3}
          />
        </label>

        <button type="submit" className="primary-button" disabled={isPending || !selectedSessionId}>
          {isPending ? "記錄中..." : "記錄盤點結果"}
        </button>
      </form>

      {selectedSession ? (
        <section className="mobile-stack">
          <section className="status-panel">
            <div>
              <p className="eyebrow">盤點批次</p>
              <strong>{selectedSession.name}</strong>
              <p>{selectedSession.status}</p>
            </div>
            <div>
              <p className="eyebrow">已掃到</p>
              <strong>{selectedSession.scannedCount}</strong>
              <p>異常 {selectedSession.anomalyCount} 本</p>
            </div>
            <div>
              <p className="eyebrow">未掃到</p>
              <strong>{summary.missingBooks}</strong>
              <p>完成盤點後可匯出差異表。</p>
            </div>
            <div>
              <p className="eyebrow">異常摘要</p>
              <strong>
                錯櫃 {summary.wrongShelf} / 損壞 {summary.damaged}
              </strong>
              <p>待查 {summary.missingCheck} 本</p>
            </div>
          </section>

          <button
            type="button"
            className="ghost-button"
            onClick={handleCompleteSession}
            disabled={isPending || selectedSession.status === "completed"}
          >
            {selectedSession.status === "completed" ? "本批次已完成" : "完成本次盤點"}
          </button>

          <section className="books-list">
            <article className="hero-card compact">
              <p className="eyebrow">Scanned items</p>
              <h2>已掃到清單</h2>
              <p>每一筆都保留掃描結果與備註，方便盤點後回頭追蹤。</p>
            </article>

            {selectedSession.scannedItems.length === 0 ? (
              <div className="feedback">目前還沒有掃到任何館藏。</div>
            ) : (
              selectedSession.scannedItems.map((item) => (
                <article key={item.id} className="book-row">
                  <div className="book-row-main">
                    <h3>{item.title ?? "未命名書籍"}</h3>
                    <p>館藏條碼：{item.accessionCode ?? "未知"}</p>
                    <p>ISBN：{item.isbn ?? "未填寫"}</p>
                    <p>掃描時間：{new Date(item.scannedAt).toLocaleString("zh-TW")}</p>
                    {item.remark ? <p>備註：{item.remark}</p> : null}
                  </div>
                  <div className="book-row-side">
                    <span className={getResultClassName(item.result)}>{resultLabels[item.result]}</span>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="books-list">
            <article className="hero-card compact">
              <p className="eyebrow">Missing books</p>
              <h2>未掃到清單</h2>
              <p>這些館藏尚未在本次盤點中出現，可作為差異追查名單。</p>
            </article>

            {selectedSession.missingBooks.length === 0 ? (
              <div className="feedback success">目前沒有未掃到的書籍。</div>
            ) : (
              selectedSession.missingBooks.map((book) => (
                <article key={book.id} className="book-row">
                  <div className="book-row-main">
                    <h3>{book.title}</h3>
                    <p>館藏條碼：{book.accessionCode}</p>
                    <p>ISBN：{book.isbn ?? "未填寫"}</p>
                  </div>
                  <div className="book-row-side">
                    <span className="status-pill status-pill-overdue">未掃到</span>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      ) : null}

      {loading ? <div className="feedback">讀取盤點資料中...</div> : null}
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}
    </section>
  );
}
