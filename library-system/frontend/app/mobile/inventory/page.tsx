"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { BarcodeScanner } from "../../components/barcode-scanner";
import { apiRequest } from "../../lib/api";

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

type InventorySessionsResponse = {
  items: InventorySession[];
};

type InventorySessionDetailResponse = {
  item: InventorySession & {
    scannedItems: Array<{
      id: number;
      title?: string;
      accessionCode?: string;
      scannedAt: string;
      result: string;
    }>;
    missingBooks: Array<{
      id: number;
      title: string;
      accessionCode: string;
      isbn: string | null;
    }>;
  };
};

export default function MobileInventoryPage() {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<InventorySessionDetailResponse["item"] | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [bookCode, setBookCode] = useState("");
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
          setError(loadError instanceof Error ? loadError.message : "讀取盤點資料失敗。");
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
            startedByUserId: 1,
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
      setError("請先選擇盤點批次，並輸入或掃描書籍條碼。");
      return;
    }

    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const payload = await apiRequest<{ item: { title?: string; accessionCode?: string } }>(
          `/api/inventory/sessions/${selectedSessionId}/scan`,
          {
            method: "POST",
            body: JSON.stringify({
              bookCode,
              operatorUserId: 1,
            }),
          },
        );

        await loadSessions(selectedSessionId);
        setBookCode("");
        setMessage(`已盤點《${payload.item.title ?? "未知書籍"}》${payload.item.accessionCode ? ` / ${payload.item.accessionCode}` : ""}`);
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
        setMessage(`已完成盤點，未掃到 ${payload.item.missingCount} 本書。`);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "完成盤點失敗。");
      }
    });
  }

  return (
    <section className="mobile-stack">
      <article className="hero-card compact">
        <p className="eyebrow">Inventory</p>
        <h2>盤點</h2>
        <p>先建立盤點批次，再用手機或桌機掃描館藏條碼，系統會即時記錄在架書籍與未掃差異。</p>
      </article>

      <section className="action-grid compact">
        <Link href="/mobile/books" className="action-card">
          <div className="action-badge">書籍</div>
          <h3>查看書籍清單</h3>
          <p>盤點前可先確認館藏資料是否完整。</p>
        </Link>
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
        helperText="掃描館藏條碼或 ISBN，系統會記錄為本次已掃到。"
        onDetected={handleDetected}
      />

      <form className="mobile-form" onSubmit={handleScan}>
        <label className="field">
          <span>書籍條碼</span>
          <input
            value={bookCode}
            onChange={(event) => setBookCode(event.target.value)}
            placeholder="例如 B0001"
            autoCapitalize="characters"
          />
        </label>
        <button type="submit" className="primary-button" disabled={isPending || !selectedSessionId}>
          {isPending ? "送出中..." : "記錄本次掃描"}
        </button>
      </form>

      {selectedSession ? (
        <section className="mobile-stack">
          <div className="feedback">
            <div>批次：{selectedSession.name}</div>
            <div>狀態：{selectedSession.status}</div>
            <div>已掃數量：{selectedSession.scannedCount}</div>
            <div>異常數量：{selectedSession.anomalyCount}</div>
          </div>

          <button
            type="button"
            className="ghost-button"
            onClick={handleCompleteSession}
            disabled={isPending || selectedSession.status === "completed"}
          >
            {selectedSession.status === "completed" ? "本批次已完成" : "完成本次盤點"}
          </button>

          <section className="books-list">
            {selectedSession.scannedItems.length > 0 ? (
              selectedSession.scannedItems.map((item) => (
                <article key={item.id} className="book-row">
                  <div>
                    <h3>{item.title ?? "未知書籍"}</h3>
                    <p>館藏條碼：{item.accessionCode ?? "未提供"}</p>
                    <p>掃描時間：{new Date(item.scannedAt).toLocaleString("zh-TW")}</p>
                  </div>
                  <div className="book-row-side">
                    <span className="status-pill">{item.result}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="feedback">這個批次還沒有掃描資料。</div>
            )}
          </section>

          {selectedSession.missingBooks.length > 0 ? (
            <section className="books-list">
              <div className="feedback">未掃到書籍：{selectedSession.missingBooks.length} 本</div>
              {selectedSession.missingBooks.slice(0, 10).map((book) => (
                <article key={book.id} className="book-row">
                  <div>
                    <h3>{book.title}</h3>
                    <p>館藏條碼：{book.accessionCode}</p>
                    <p>ISBN：{book.isbn ?? "未填寫"}</p>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </section>
      ) : null}

      {loading ? <div className="feedback">載入盤點資料中...</div> : null}
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}
    </section>
  );
}
