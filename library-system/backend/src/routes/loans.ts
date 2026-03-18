import { Router } from "express";
import { ZodError } from "zod";

import { mapLoan } from "../features/loans/mapper.js";
import {
  checkoutLoan,
  listLoans,
  listOverdueLoans,
  returnLoan,
} from "../features/loans/repository.js";
import { checkoutSchema, returnSchema } from "../features/loans/schemas.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/errors.js";

export const loansRouter = Router();

loansRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await listLoans();
    res.json({ items: rows.map(mapLoan) });
  }),
);

loansRouter.get(
  "/overdue",
  asyncHandler(async (_req, res) => {
    const rows = await listOverdueLoans();
    res.json({ items: rows.map(mapLoan) });
  }),
);

loansRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    try {
      const input = checkoutSchema.parse(req.body);
      const row = await checkoutLoan(input);
      res.status(201).json({ item: mapLoan(row) });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, error.issues[0]?.message ?? "Invalid request body");
      }

      throw error;
    }
  }),
);

loansRouter.post(
  "/return",
  asyncHandler(async (req, res) => {
    try {
      const input = returnSchema.parse(req.body);
      const row = await returnLoan(input);
      res.json({ item: mapLoan(row) });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, error.issues[0]?.message ?? "Invalid request body");
      }

      throw error;
    }
  }),
);
