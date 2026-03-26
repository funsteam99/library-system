import { Router } from "express";

import { listActiveUsers } from "../features/users/repository.js";
import { asyncHandler } from "../lib/async-handler.js";

export const usersRouter = Router();

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await listActiveUsers();

    res.json({
      items: rows.map((row) => ({
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        status: row.status,
      })),
    });
  }),
);
