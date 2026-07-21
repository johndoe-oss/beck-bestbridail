import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Health endpoints removed — no status information is leaked to probes.
// The catch-all 404 handler in routes/index.ts will return the same
// generic HTML error page as any other non-existent route.

export default router;
