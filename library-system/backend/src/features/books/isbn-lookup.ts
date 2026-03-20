import { lookupBookByIsbnCdp, type IsbnLookupDebugCandidate } from "./isbn-lookup-cdp.js";

type IsbnLookupResult = {
  title: string | null;
  author: string | null;
  publisher: string | null;
  publishYear: number | null;
  coverUrl: string | null;
  source: "openlibrary" | "googlebooks" | "cdp-search" | null;
};

export type IsbnLookupResponse = {
  item: IsbnLookupResult | null;
  debugCandidates: IsbnLookupDebugCandidate[];
};

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
    author: Array.isArray(book.authors) ? book.authors.map((item: any) => item.name).join(", ") : null,
    publisher: Array.isArray(book.publishers)
      ? book.publishers.map((item: any) => item.name).join(", ")
      : null,
    publishYear: normalizeYear(book.publish_date),
    coverUrl: normalizeCoverUrl(book.cover?.large ?? book.cover?.medium ?? book.cover?.small ?? null),
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
    coverUrl: normalizeCoverUrl(volume.imageLinks?.thumbnail ?? volume.imageLinks?.smallThumbnail ?? null),
    source: "googlebooks",
  };
}

export async function lookupBookByIsbn(isbn: string, includeDebug = false): Promise<IsbnLookupResponse> {
  const normalizedIsbn = isbn.replace(/[^0-9Xx]/g, "");
  const debugCandidates: IsbnLookupDebugCandidate[] = [];

  if (!normalizedIsbn) {
    return { item: null, debugCandidates };
  }

  const openLibrary = await lookupOpenLibrary(normalizedIsbn);
  if (openLibrary) {
    return { item: openLibrary, debugCandidates };
  }

  const googleBooks = await lookupGoogleBooks(normalizedIsbn);
  if (googleBooks) {
    return { item: googleBooks, debugCandidates };
  }

  const cdpResult = await lookupBookByIsbnCdp(normalizedIsbn, includeDebug ? debugCandidates : undefined);
  if (cdpResult) {
    return { item: cdpResult, debugCandidates };
  }

  return { item: null, debugCandidates };
}
