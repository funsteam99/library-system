import { Router } from "express";
import * as XLSX from "xlsx";

import { listBooks } from "../features/books/repository.js";
import {
  getInventorySessionById,
  listInventoryItemsBySession,
  listMissingBooksForSession,
} from "../features/inventory/repository.js";
import { listLoans } from "../features/loans/repository.js";
import { listMembers } from "../features/members/repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAdmin } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";
import { requireParam } from "../lib/params.js";
import { parseId } from "../lib/parse-int.js";

export const exportsRouter = Router();
exportsRouter.use(requireAdmin);

function sendWorkbook(
  res: {
    setHeader: (name: string, value: string) => void;
    type: (value: string) => void;
    send: (body: Buffer) => void;
  },
  filename: string,
  rows: Record<string, unknown>[],
  sheetName: string,
) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
}

exportsRouter.get(
  "/books.xlsx",
  asyncHandler(async (_req, res) => {
    const rows = await listBooks();

    sendWorkbook(
      res,
      "books.xlsx",
      rows.map((row) => ({
        ID: row.id,
        ISBN: row.isbn,
        館藏條碼: row.accession_code,
        書名: row.title,
        作者: row.author,
        出版社: row.publisher,
        出版年: row.publish_year,
        狀態: row.status,
        備註: row.remark,
        建立時間: row.created_at,
        更新時間: row.updated_at,
      })),
      "Books",
    );
  }),
);

exportsRouter.get(
  "/members.xlsx",
  asyncHandler(async (_req, res) => {
    const rows = await listMembers();

    sendWorkbook(
      res,
      "members.xlsx",
      rows.map((row) => ({
        ID: row.id,
        會員編號: row.member_code,
        姓名: row.name,
        電話: row.phone,
        Email: row.email,
        單位: row.unit_name,
        狀態: row.status,
        備註: row.note,
        建立時間: row.created_at,
        更新時間: row.updated_at,
      })),
      "Members",
    );
  }),
);

exportsRouter.get(
  "/loans.xlsx",
  asyncHandler(async (_req, res) => {
    const rows = await listLoans();

    sendWorkbook(
      res,
      "loans.xlsx",
      rows.map((row) => ({
        ID: row.id,
        書名: row.book_title,
        館藏條碼: row.book_accession_code,
        會員姓名: row.member_name,
        會員編號: row.member_code,
        借出時間: row.loan_date,
        到期時間: row.due_date,
        歸還時間: row.returned_at,
        狀態: row.status,
        備註: row.remark,
      })),
      "Loans",
    );
  }),
);

exportsRouter.get(
  "/inventory/:id.xlsx",
  asyncHandler(async (req, res) => {
    const id = parseId(requireParam(req.params.id, "id"));
    const session = await getInventorySessionById(id);

    if (!session) {
      throw new HttpError(404, "Inventory session not found");
    }

    const [items, missingBooks] = await Promise.all([
      listInventoryItemsBySession(id),
      listMissingBooksForSession(id),
    ]);

    const workbook = XLSX.utils.book_new();
    const scannedSheet = XLSX.utils.json_to_sheet(
      items.map((row) => ({
        ID: row.id,
        書名: row.title,
        館藏條碼: row.accession_code,
        ISBN: row.isbn,
        盤點結果: row.result,
        掃描時間: row.scanned_at,
        備註: row.remark,
      })),
    );
    const missingSheet = XLSX.utils.json_to_sheet(
      missingBooks.map((row) => ({
        ID: row.id,
        書名: row.title,
        館藏條碼: row.accession_code,
        ISBN: row.isbn,
        狀態: "未掃到",
      })),
    );

    XLSX.utils.book_append_sheet(workbook, scannedSheet, "ScannedItems");
    XLSX.utils.book_append_sheet(workbook, missingSheet, "MissingBooks");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const filename = `inventory-session-${id}.xlsx`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  }),
);
