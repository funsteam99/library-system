import { Router } from "express";
import { ZodError } from "zod";

import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/errors.js";
import { requireParam } from "../lib/params.js";
import { parseId } from "../lib/parse-int.js";
import { mapBook } from "../features/books/mapper.js";
import {
  createBook,
  getBookByBarcode,
  getBookById,
  listBooks,
  updateBook,
} from "../features/books/repository.js";
import { lookupBookByIsbn } from "../features/books/isbn-lookup.js";
import { createBookSchema, updateBookSchema } from "../features/books/schemas.js";

export const booksRouter = Router();

booksRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await listBooks();
    res.json({ items: rows.map(mapBook) });
  }),
);

booksRouter.get(
  "/lookup/isbn/:isbn",
  asyncHandler(async (req, res) => {
    const isbn = requireParam(req.params.isbn, "isbn");
    const item = await lookupBookByIsbn(isbn);

    if (!item) {
      throw new HttpError(404, "No metadata found for this ISBN");
    }

    res.json({ item });
  }),
);

booksRouter.get(
  "/by-barcode/:code",
  asyncHandler(async (req, res) => {
    const code = requireParam(req.params.code, "code");
    const row = await getBookByBarcode(code);

    if (!row) {
      throw new HttpError(404, "Book not found");
    }

    res.json({ item: mapBook(row) });
  }),
);

booksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(requireParam(req.params.id, "id"));
    const row = await getBookById(id);

    if (!row) {
      throw new HttpError(404, "Book not found");
    }

    res.json({ item: mapBook(row) });
  }),
);

booksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const input = createBookSchema.parse(req.body);
      const row = await createBook(input);

      res.status(201).json({ item: mapBook(row) });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, error.issues[0]?.message ?? "Invalid request body");
      }

      throw error;
    }
  }),
);

booksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(requireParam(req.params.id, "id"));

    try {
      const input = updateBookSchema.parse(req.body);
      const row = await updateBook(id, input);

      if (!row) {
        throw new HttpError(404, "Book not found");
      }

      res.json({ item: mapBook(row) });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, error.issues[0]?.message ?? "Invalid request body");
      }

      throw error;
    }
  }),
);
