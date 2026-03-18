import { Router } from "express";
import { ZodError } from "zod";

import { mapMember } from "../features/members/mapper.js";
import {
  createMember,
  getMemberByCode,
  getMemberById,
  listMembers,
  updateMember,
} from "../features/members/repository.js";
import { createMemberSchema, updateMemberSchema } from "../features/members/schemas.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/errors.js";
import { requireParam } from "../lib/params.js";
import { parseId } from "../lib/parse-int.js";

export const membersRouter = Router();

membersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await listMembers();
    res.json({ items: rows.map(mapMember) });
  }),
);

membersRouter.get(
  "/by-code/:code",
  asyncHandler(async (req, res) => {
    const code = requireParam(req.params.code, "code");
    const row = await getMemberByCode(code);

    if (!row) {
      throw new HttpError(404, "Member not found");
    }

    res.json({ item: mapMember(row) });
  }),
);

membersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(requireParam(req.params.id, "id"));
    const row = await getMemberById(id);

    if (!row) {
      throw new HttpError(404, "Member not found");
    }

    res.json({ item: mapMember(row) });
  }),
);

membersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const input = createMemberSchema.parse(req.body);
      const row = await createMember(input);

      res.status(201).json({ item: mapMember(row) });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, error.issues[0]?.message ?? "Invalid request body");
      }

      throw error;
    }
  }),
);

membersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(requireParam(req.params.id, "id"));

    try {
      const input = updateMemberSchema.parse(req.body);
      const row = await updateMember(id, input);

      if (!row) {
        throw new HttpError(404, "Member not found");
      }

      res.json({ item: mapMember(row) });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HttpError(400, error.issues[0]?.message ?? "Invalid request body");
      }

      throw error;
    }
  }),
);
