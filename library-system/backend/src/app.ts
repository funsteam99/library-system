import path from "node:path";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { uploadsRoot } from "./config/paths.js";
import { env } from "./config/env.js";
import { HttpError } from "./lib/errors.js";
import { booksRouter } from "./routes/books.js";
import { healthRouter } from "./routes/health.js";
import { inventoryRouter } from "./routes/inventory.js";
import { loansRouter } from "./routes/loans.js";
import { membersRouter } from "./routes/members.js";
import { uploadsRouter } from "./routes/uploads.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));

  app.get("/", (_req, res) => {
    res.json({
      name: "library-system-backend",
      status: "running",
    });
  });

  app.use("/uploads", express.static(path.resolve(uploadsRoot)));
  app.use("/api/health", healthRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/books", booksRouter);
  app.use("/api/members", membersRouter);
  app.use("/api/loans", loansRouter);
  app.use("/api/inventory", inventoryRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ message: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
