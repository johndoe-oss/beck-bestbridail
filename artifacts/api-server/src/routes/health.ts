import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Health check endpoint — returns a lightweight 200 OK.
// Used by Render (and other platforms) to verify the service is running.
// No sensitive information is leaked.
router.get("/healthz", (_req, res) => {
  logger.debug("Health check passed");
  res.status(200).json({ status: "ok" });
});

export default router;
