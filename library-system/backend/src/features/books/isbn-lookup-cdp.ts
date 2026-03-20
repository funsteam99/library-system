import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import CDP from "chrome-remote-interface";

type IsbnLookupResult = {
  title: string | null;
  author: string | null;
  publisher: string | null;
  publishYear: number | null;
  coverUrl: string | null;
  source: "openlibrary" | "googlebooks" | "cdp-search" | null;
};

type SearchCandidate = {
  href: string;
  text: string;
  author: string | null;
  publisher: string | null;
  publishYear: number | null;
  coverUrl: string | null;
};

export type IsbnLookupDebugCandidate = {
  href: string;
  text: string;
  domain: string;
  accepted: boolean;
  reason: string;
};

type SearchSource = {
  domain: string;
  searchUrl: (isbn: string) => string;
  productUrlPatterns: RegExp[];
};

type LaunchedBrowser = {
  child: ChildProcess;
  port: number;
  userDataDir: string;
};

const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const searchSources: SearchSource[] = [
  {
    domain: "www.taaze.tw",
    searchUrl: (isbn) =>
      `https://www.taaze.tw/rwd_searchResult.html?keyword%5B%5D=${encodeURIComponent(isbn)}&keyType%5B%5D=0`,
    productUrlPatterns: [/\/products\/[^/?#]+/i],
  },
  {
    domain: "www.books.com.tw",
    searchUrl: (isbn) => `https://search.books.com.tw/search/query/key/${encodeURIComponent(isbn)}/cat/books`,
    productUrlPatterns: [/\/products\/[^/?#]+/i],
  },
  {
    domain: "ci.nii.ac.jp",
    searchUrl: (isbn) => `https://ci.nii.ac.jp/books/search?isbn=${encodeURIComponent(isbn)}`,
    productUrlPatterns: [/\/ncid\/[A-Z0-9]+/i],
  },
  {
    domain: "www.amazon.co.jp",
    searchUrl: (isbn) =>
      `https://www.amazon.co.jp/s?k=${encodeURIComponent(isbn)}&i=stripbooks`,
    productUrlPatterns: [/\/dp\/[A-Z0-9]{10}/i, /\/gp\/product\/[A-Z0-9]{10}/i],
  },
  {
    domain: "www.amazon.com",
    searchUrl: (isbn) =>
      `https://www.amazon.com/s?k=${encodeURIComponent(isbn)}&i=stripbooks-intl-ship`,
    productUrlPatterns: [/\/dp\/[A-Z0-9]{10}/i, /\/gp\/product\/[A-Z0-9]{10}/i],
  },
];

function normalizeYear(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function normalizeCoverUrl(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  return value.startsWith("http://") ? value.replace("http://", "https://") : value;
}

function absolutizeCoverUrl(url: string | null, hostname: string) {
  if (!url) {
    return null;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `https://${hostname}${url}`;
  }

  return url;
}

async function findBrowserPath() {
  for (const candidate of browserCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function waitForEndpoint(port: number, timeoutMs = 15000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error("CDP browser did not start in time");
}

function getRandomPort() {
  return 9300 + Math.floor(Math.random() * 400);
}

async function launchBrowser(): Promise<LaunchedBrowser | null> {
  const browserPath = await findBrowserPath();

  if (!browserPath) {
    return null;
  }

  const port = getRandomPort();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "library-cdp-"));
  const child = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-search-engine-choice-screen",
      "--window-size=1440,1600",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  try {
    await waitForEndpoint(port);
    return { child, port, userDataDir };
  } catch (error) {
    child.kill();
    await fs.rm(userDataDir, { recursive: true, force: true });
    throw error;
  }
}

async function closeBrowser(child: ChildProcess, userDataDir: string) {
  child.kill();
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 });
  } catch {
    return;
  }
}

async function navigateAndWait(Page: any, Runtime: any, url: string, timeoutMs = 15000) {
  await Page.enable();
  await Runtime.enable();

  const loaded = new Promise<void>((resolve) => {
    if (typeof Page.once === "function") {
      Page.once("loadEventFired", () => resolve());
      return;
    }

    const handler = () => resolve();
    Page.loadEventFired(handler);
  });

  await Page.navigate({ url });

  await Promise.race([
    loaded,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Navigation timeout")), timeoutMs)),
  ]);

  await new Promise((resolve) => setTimeout(resolve, 800));
}

async function collectSearchCandidates(
  Runtime: any,
  source: SearchSource,
): Promise<{ accepted: SearchCandidate[]; debug: IsbnLookupDebugCandidate[] }> {
  const evaluation = await Runtime.evaluate({
    expression: `(() => {
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const seen = new Set();

      return anchors
        .map((anchor) => {
          const href = anchor.href || "";
          const text = (anchor.textContent || "").trim();
          const container = anchor.closest("li, article, .item, .book, .prod, .search, .content, .box, div");
          const cardText = (container?.textContent || "").trim();

          const authorNode =
            container?.querySelector('a[href*="keyType%5B%5D=2"], a[href*="keyType[]=2"], a[href*="author"]') ||
            Array.from(container?.querySelectorAll("*") || []).find((node) =>
              /作者/.test(node.textContent || ""),
            ) ||
            null;

          const publisherNode =
            container?.querySelector('a[href*="keyType%5B%5D=3"], a[href*="keyType[]=3"], a[href*="publisher"]') ||
            Array.from(container?.querySelectorAll("*") || []).find((node) =>
              /出版社|出版/.test(node.textContent || ""),
            ) ||
            null;

          const imageNode = container?.querySelector("img");
          const srcset = imageNode?.getAttribute("srcset") || imageNode?.getAttribute("data-srcset") || "";
          const firstSrcsetImage = srcset
            ? srcset
                .split(",")
                .map((part) => part.trim().split(" ")[0])
                .find(Boolean) || null
            : null;

          return {
            href,
            text,
            cardText,
            author: (authorNode?.textContent || "").trim() || null,
            publisher: (publisherNode?.textContent || "").trim() || null,
            coverUrl:
              imageNode?.getAttribute("src") ||
              imageNode?.getAttribute("data-src") ||
              imageNode?.getAttribute("data-original") ||
              firstSrcsetImage ||
              null,
          };
        })
        .filter((item) => {
          if (!item.href || seen.has(item.href)) {
            return false;
          }
          seen.add(item.href);
          return true;
        });
    })()`,
    returnByValue: true,
  });

  const value = Array.isArray(evaluation.result.value) ? evaluation.result.value : [];
  const debug: IsbnLookupDebugCandidate[] = [];
  const accepted: SearchCandidate[] = [];

  for (const item of value.slice(0, 80)) {
    if (typeof item?.href !== "string") {
      continue;
    }

    const href = item.href;
    const text = typeof item?.text === "string" ? item.text : "";
    const cardText = typeof item?.cardText === "string" ? item.cardText : "";
    const author = typeof item?.author === "string" && item.author.trim().length > 0 ? item.author.trim() : null;
    const publisher =
      typeof item?.publisher === "string" && item.publisher.trim().length > 0 ? item.publisher.trim() : null;
    const coverUrl = normalizeCoverUrl(item?.coverUrl);
    const publishYear = normalizeYear(cardText);

    let reason = "accepted";
    let acceptedCandidate = true;

    if (!href.startsWith("http")) {
      acceptedCandidate = false;
      reason = "not-http";
    } else {
      let hostname = "";

      try {
        hostname = new URL(href).hostname;
      } catch {
        acceptedCandidate = false;
        reason = "invalid-url";
      }

      if (acceptedCandidate && hostname !== source.domain) {
        acceptedCandidate = false;
        reason = "wrong-domain";
      }

      if (
        acceptedCandidate &&
        !source.productUrlPatterns.some((pattern) => pattern.test(href))
      ) {
        acceptedCandidate = false;
        reason = "not-product-url";
      }

    }

    debug.push({
      href,
      text: text || cardText.slice(0, 120),
      domain: source.domain,
      accepted: acceptedCandidate,
      reason,
    });

    if (acceptedCandidate) {
      accepted.push({
        href,
        text: text || cardText.slice(0, 120),
        author,
        publisher,
        publishYear,
        coverUrl,
      });
    }
  }

  return {
        accepted: accepted.slice(0, 5),
    debug,
  };
}

async function extractMetadata(
  Runtime: any,
  isbn: string,
  expectedDomain: string,
  candidate: SearchCandidate,
): Promise<IsbnLookupResult | null> {
  const evaluation = await Runtime.evaluate({
    expression: `(() => {
      const hostname = window.location.hostname || "";
      const bodyText = document.body?.innerText || "";
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((node) => node.textContent || "")
        .filter(Boolean);

      const parsed = [];
      for (const script of scripts) {
        try {
          parsed.push(JSON.parse(script));
        } catch {}
      }

      const flatten = (input) => {
        if (!input) return [];
        if (Array.isArray(input)) return input.flatMap(flatten);
        if (typeof input === "object") {
          const graphItems = Array.isArray(input["@graph"]) ? input["@graph"] : [];
          return [input, ...graphItems.flatMap(flatten)];
        }
        return [];
      };

      const allObjects = parsed.flatMap(flatten);

      const pickName = (value) => {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
          const names = value
            .map((item) => (typeof item === "string" ? item : item?.name))
            .filter(Boolean);
          return names.length > 0 ? names.join(", ") : null;
        }
        if (typeof value === "object") {
          return value.name || null;
        }
        return null;
      };

      const firstCandidate = allObjects.find((item) => {
        const rawType = item?.["@type"];
        const types = Array.isArray(rawType) ? rawType : [rawType];
        return types.some((type) => typeof type === "string" && /Book|Product/i.test(type));
      });

      const fallbackTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title ||
        null;

      const fallbackAuthor =
        document.querySelector('meta[name="author"]')?.getAttribute("content") ||
        document.querySelector('[itemprop="author"]')?.textContent?.trim() ||
        document.querySelector('a[href*="/author/"]')?.textContent?.trim() ||
        null;

      const fallbackPublisher =
        document.querySelector('meta[property="book:publisher"]')?.getAttribute("content") ||
        document.querySelector('meta[name="publisher"]')?.getAttribute("content") ||
        Array.from(document.querySelectorAll("th, dt, td, dd"))
          .find((node) => /出版者|出版社/.test(node.textContent || ""))
          ?.nextElementSibling?.textContent?.trim() ||
        null;

      const fallbackImage =
        document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
        document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
        document.querySelector('img[data-original]')?.getAttribute("data-original") ||
        document.querySelector('img[data-src]')?.getAttribute("data-src") ||
        document.querySelector('img[srcset]')?.getAttribute("srcset")?.split(",")?.[0]?.trim()?.split(" ")?.[0] ||
        document.querySelector("img")?.getAttribute("src") ||
        null;

      const imageCandidates = Array.from(document.querySelectorAll("img"))
        .flatMap((img) => {
          const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset") || "";
          const srcsetUrls = srcset
            ? srcset
                .split(",")
                .map((part) => part.trim().split(" ")[0])
                .filter(Boolean)
            : [];

          return [
            img.getAttribute("src"),
            img.getAttribute("data-src"),
            img.getAttribute("data-original"),
            ...srcsetUrls,
          ].filter(Boolean);
        })
        .map((url) => String(url));

      const fallbackHtmlImage =
        imageCandidates.find((url) => /product|prod|cover|getImage|book|items/i.test(url) && !/logo|icon|banner/i.test(url)) ||
        imageCandidates[0] ||
        null;

      return {
        hostname,
        bodyText,
        title: firstCandidate?.name || firstCandidate?.headline || fallbackTitle,
        author: pickName(firstCandidate?.author) || fallbackAuthor,
        publisher: pickName(firstCandidate?.publisher) || pickName(firstCandidate?.brand) || fallbackPublisher,
        publishYear: firstCandidate?.datePublished || null,
        coverUrl: firstCandidate?.image || fallbackImage || fallbackHtmlImage,
      };
    })()`,
    returnByValue: true,
  });

  const value = evaluation.result.value as {
    hostname?: unknown;
    bodyText?: unknown;
    title?: unknown;
    author?: unknown;
    publisher?: unknown;
    publishYear?: unknown;
    coverUrl?: unknown;
  };

  if (!value || typeof value !== "object") {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : null;
  const bodyText = typeof value.bodyText === "string" ? value.bodyText : "";
  const hostname = typeof value.hostname === "string" ? value.hostname : "";

  if (!title || !bodyText.includes(isbn) || hostname !== expectedDomain) {
    return null;
  }

  const cleanedTitle =
    hostname === "ci.nii.ac.jp" ? title.replace(/^CiNii\s*図書\s*-\s*/i, "").trim() : title;
  const parsedAuthor = typeof value.author === "string" ? value.author.trim() : null;
  const parsedPublisher = typeof value.publisher === "string" ? value.publisher.trim() : null;
  const normalizedCoverUrl = absolutizeCoverUrl(normalizeCoverUrl(value.coverUrl), hostname);

  return {
    title: cleanedTitle,
    author: parsedAuthor || candidate.author || null,
    publisher: parsedPublisher || candidate.publisher || null,
    publishYear: normalizeYear(value.publishYear) ?? candidate.publishYear ?? null,
    coverUrl: normalizedCoverUrl || candidate.coverUrl || null,
    source: "cdp-search",
  };
}

function pushDebug(
  collector: IsbnLookupDebugCandidate[] | undefined,
  source: SearchSource,
  href: string,
  text: string,
  accepted: boolean,
  reason: string,
) {
  collector?.push({
    href,
    text,
    domain: source.domain,
    accepted,
    reason,
  });
}

export async function lookupBookByIsbnCdp(
  isbn: string,
  debugCollector?: IsbnLookupDebugCandidate[],
): Promise<IsbnLookupResult | null> {
  const launched = await launchBrowser();

  if (!launched) {
    return null;
  }

  const { child, port, userDataDir } = launched;

  try {
    const target = await CDP.New({ port });
    const client = await CDP({ target, port });
    const { Page, Runtime } = client;

    for (const source of searchSources) {
      const resultUrl = source.searchUrl(isbn);
      await navigateAndWait(Page, Runtime, resultUrl);
      pushDebug(
        debugCollector,
        source,
        resultUrl,
        "site-search-opened",
        true,
        "search-opened",
      );

      const { accepted, debug } = await collectSearchCandidates(Runtime, source);
      debugCollector?.push(...debug);

      for (const candidate of accepted) {
        await navigateAndWait(Page, Runtime, candidate.href);
        const metadata = await extractMetadata(Runtime, isbn, source.domain, candidate);

        if (metadata?.title) {
          await client.close();
          await CDP.Close({ id: target.id, port });
          return metadata;
        }
      }
    }

    await client.close();
    await CDP.Close({ id: target.id, port });
    return null;
  } catch {
    return null;
  } finally {
    await closeBrowser(child, userDataDir);
  }
}
