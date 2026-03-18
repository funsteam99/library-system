import { Router } from "express";

export const inventoryRouter = Router();

inventoryRouter.get("/sessions", (_req, res) => {
  res.json({
    items: [],
    message: "Inventory sessions endpoint placeholder",
  });
});

inventoryRouter.post("/sessions", (_req, res) => {
  res.status(501).json({
    message: "Create inventory session endpoint not implemented yet",
  });
});
