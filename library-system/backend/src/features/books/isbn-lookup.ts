import {
  lookupBookByIsbnCdp,
  type IsbnLookupDebugCandidate,
  type LookupSourceId,
} from "./isbn-lookup-cdp.js";

type IsbnLookupResult = {
  title: string | null;
  author: string | null;
  publisher: string | null;
  publishYear: number | null;
  coverUrl: string | null;
  source: LookupSourceId | null;
};

export type IsbnLookupResponse = {
  item: IsbnLookupResult | null;
  debugCandidates: IsbnLookupDebugCandidate[];
  attemptedSources: Array<{ id: LookupSourceId; label: string }>;
  matchedSource: { id: LookupSourceId; label: string } | null;
  foundFields: string[];
};

const attemptedSources: Array<{ id: LookupSourceId; label: string }> = [
  { id: "openlibrary", label: "Open Library" },
  { id: "googlebooks", label: "Google Books" },
  { id: "taaze", label: "讀冊" },
  { id: "books_tw", label: "博客來" },
  { id: "tenlong", label: "天瓏書店" },
  { id: "sanmin", label: "三民書局" },
  { id: "cinii", label: "CiNii Books" },
  { id: "amazon_jp", label: "Amazon.co.jp" },
  { id: "amazon", label: "Amazon" },
];

function getSourceLabel(source: LookupSourceId | null) {
  return attemptedSources.find((item) => item.id === source) ?? null;
}

function getFoundFields(item: IsbnLookupResult | null) {
  if (!item) {
    return [];
  }

  const fields: string[] = [];

  if (item.title?.trim()) {
    fields.push("書名");
  }
  if (item.author?.trim()) {
    fields.push("作者");
  }
  if (item.publisher?.trim()) {
    fields.push("出版社");
  }
  if (typeof item.publishYear === "number") {
    fields.push("出版年");
  }
  if (item.coverUrl?.trim()) {
    fields.push("封面");
  }

  return fields;
}

function normalizeCoverUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.startsWith("http://") ? value.replace("http://", "https://") : value;
}

function normalizeYear(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

async function lookupOpenLibrary(isbn: string): Promise<IsbnLookupResult | null> {
  let response: Response;

  try {
    response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Record<string, any>;
  const book = payload[`ISBN:${isbn}`];

  if (!book) {
    return null;
  }

  return {
    title: book.title ?? null,
    author: Array.isArray(book.authors)
      ? book.authors.map((item: any) => item.name).join(", ")
      : null,
    publisher: Array.isArray(book.publishers)
      ? book.publishers.map((item: any) => item.name).join(", ")
      : null,
    publishYear: normalizeYear(book.publish_date),
    coverUrl: normalizeCoverUrl(
      book.cover?.large ?? book.cover?.medium ?? book.cover?.small ?? null,
    ),
    source: "openlibrary",
  };
}

async function lookupGoogleBooks(isbn: string): Promise<IsbnLookupResult | null> {
  let response: Response;

  try {
    response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    items?: Array<{
      volumeInfo?: {
        title?: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        imageLinks?: {
          thumbnail?: string;
          smallThumbnail?: string;
        };
      };
    }>;
  };

  const volume = payload.items?.[0]?.volumeInfo;

  if (!volume) {
    return null;
  }

  return {
    title: volume.title ?? null,
    author: volume.authors?.join(", ") ?? null,
    publisher: volume.publisher ?? null,
    publishYear: normalizeYear(volume.publishedDate),
    coverUrl: normalizeCoverUrl(
      volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail ?? null,
    ),
    source: "googlebooks",
  };
}

function extractJsonLdObjects(html: string) {
  const matches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );

  const objects: any[] = [];

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        objects.push(...parsed);
      } else {
        objects.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return objects;
}

function normalizeAuthor(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    const names = value
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : typeof item?.name === "string"
            ? item.name.trim()
            : "",
      )
      .filter(Boolean);

    return names.length > 0 ? names.join(", ") : null;
  }

  if (typeof value === "object" && value && typeof (value as { name?: unknown }).name === "string") {
    return (value as { name: string }).name.trim() || null;
  }

  return null;
}

async function lookupTenlong(isbn: string): Promise<IsbnLookupResult | null> {
  let response: Response;

  try {
    response = await fetch(`https://www.tenlong.com.tw/products/${isbn}`);
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const objects = extractJsonLdObjects(html);
  const book = objects.find((item) => {
    const typeValue = item?.["@type"];
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    return types.some((type) => typeof type === "string" && /Book|Product/i.test(type));
  });

  if (!book) {
    return null;
  }

  const name =
    typeof book.name === "string" && book.name.trim().length > 0 ? book.name.trim() : null;
  const author = normalizeAuthor(book.author);
  const publisher =
    typeof book.publisher === "string"
      ? book.publisher.trim() || null
      : typeof book.publisher?.name === "string"
        ? book.publisher.name.trim() || null
        : null;
  const publishYear = normalizeYear(
    typeof book.datePublished === "string" ? book.datePublished : undefined,
  );
  const coverUrl = normalizeCoverUrl(
    typeof book.image === "string"
      ? book.image
      : Array.isArray(book.image)
        ? book.image.find((value: unknown) => typeof value === "string") ?? null
        : null,
  );

  if (!name) {
    return null;
  }

  return {
    title: name,
    author,
    publisher,
    publishYear,
    coverUrl,
    source: "tenlong",
  };
}

export async function lookupBookByIsbn(
  isbn: string,
  includeDebug = false,
): Promise<IsbnLookupResponse> {
  const normalizedIsbn = isbn.replace(/[^0-9Xx]/g, "");
  const debugCandidates: IsbnLookupDebugCandidate[] = [];

  if (!normalizedIsbn) {
    return {
      item: null,
      debugCandidates,
      attemptedSources,
      matchedSource: null,
      foundFields: [],
    };
  }

  const openLibrary = await lookupOpenLibrary(normalizedIsbn);
  if (openLibrary) {
    return {
      item: openLibrary,
      debugCandidates,
      attemptedSources,
      matchedSource: getSourceLabel(openLibrary.source),
      foundFields: getFoundFields(openLibrary),
    };
  }

  const googleBooks = await lookupGoogleBooks(normalizedIsbn);
  if (googleBooks) {
    return {
      item: googleBooks,
      debugCandidates,
      attemptedSources,
      matchedSource: getSourceLabel(googleBooks.source),
      foundFields: getFoundFields(googleBooks),
    };
  }

  const tenlong = await lookupTenlong(normalizedIsbn);
  if (tenlong) {
    return {
      item: tenlong,
      debugCandidates,
      attemptedSources,
      matchedSource: getSourceLabel(tenlong.source),
      foundFields: getFoundFields(tenlong),
    };
  }

  const cdpResult = await lookupBookByIsbnCdp(
    normalizedIsbn,
    includeDebug ? debugCandidates : undefined,
  );
  if (cdpResult) {
    return {
      item: cdpResult,
      debugCandidates,
      attemptedSources,
      matchedSource: getSourceLabel(cdpResult.source),
      foundFields: getFoundFields(cdpResult),
    };
  }

  return {
    item: null,
    debugCandidates,
    attemptedSources,
    matchedSource: null,
    foundFields: [],
  };
}
