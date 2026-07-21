import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import compression from "compression";
import path from "path";
import fs from "fs";
import router from "./routes";
import { securityMiddleware } from "./middlewares/security";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Response compression (gzip/brotli) ────────────────────────────────────────
app.use(compression());

// ── Structured logging ────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://api.paystack.co"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow serving uploads cross-origin
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true } : false,
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));

// ── Stripe webhook — MUST be registered before express.json() ─────────────────
// express.raw() gives the raw Buffer that Stripe needs to verify its signature.
app.use("/api/payments/webhooks/stripe", express.raw({ type: "application/json" }));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Block /admin entirely — return 404, not 403, to avoid revealing the route ─
app.use("/admin", (_req, res) => {
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").send(
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Page Not Found</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#f8f8f8;color:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:1rem}.card{background:#fff;border:3px solid #111;padding:2.5rem 2rem;max-width:420px;width:100%;box-shadow:6px 6px 0 #111}h1{font-size:2.5rem;margin-bottom:.5rem}p{font-size:1rem;color:#555}</style></head><body><div class=\"card\"><h1>Page Not Found</h1><p>Something went wrong. Please try again later.</p></div></body></html>",
  );
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/customers/register", authLimiter);
app.use("/api/customers/login", authLimiter);
app.use("/api/customers/verify-email", authLimiter);
app.use("/api/customers/resend-verification", strictLimiter); // Tighter: prevent OTP flooding
app.use("/api/bb-portal/login", authLimiter);
app.use("/api/payments/initiate", authLimiter); // Prevent payment spam
app.use("/api", generalLimiter);

// ── Security middleware ───────────────────────────────────────────────────────
// Must run AFTER body parsers but BEFORE any route handlers.
app.use("/api", securityMiddleware);

// ── Static uploads ────────────────────────────────────────────────────────────
// Serve uploaded product images at /api/uploads/<filename>
// Use process.cwd() — reliable regardless of bundling/source-map transforms.
// our npm scripts `cd` into the package directory before running,
// so cwd = artifacts/api-server/ in both dev and prod.
const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadsDir));

// ── Caching headers for GET endpoints ─────────────────────────────────────────
// Products, categories, and lookbooks change rarely — let browsers cache them.
const cacheControl = (maxAgeSec: number) =>
  (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.set("Cache-Control", `public, max-age=${maxAgeSec}`);
    next();
  };

app.use("/api/products", cacheControl(60));       // 1 minute
app.use("/api/categories", cacheControl(300));     // 5 minutes
app.use("/api/lookbooks", cacheControl(120));      // 2 minutes
app.use("/api/uploads", cacheControl(86400));      // 1 day for static images

// ── API router ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Serve built frontend (production & Render) ─────────────────────────────────
// Try multiple possible paths depending on where the process runs:
//   Run from root:         cwd/artifacts/beckbest-bridal/dist/public
//   Run from api-server:   cwd/../../artifacts/beckbest-bridal/dist/public  (dev)
//   Bundled & run from root: cwd/artifacts/beckbest-bridal/dist/public
const candidatePaths = [
  path.resolve(process.cwd(), "artifacts", "beckbest-bridal", "dist", "public"),           // run from repo root
  path.resolve(process.cwd(), "..", "..", "artifacts", "beckbest-bridal", "dist", "public"), // run from artifacts/api-server/
  path.resolve(__dirname, "..", "..", "beckbest-bridal", "dist", "public"),                 // dist/index.mjs in artifacts/api-server/dist/
];

let frontendStaticDir: string | null = null;
for (const p of candidatePaths) {
  const indexPath = path.resolve(p, "index.html");
  if (fs.existsSync(indexPath)) {
    frontendStaticDir = p;
    break;
  }
}

if (frontendStaticDir) {
  app.use(express.static(frontendStaticDir));

  // SPA fallback: serve index.html for all non-API routes
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(frontendStaticDir!, "index.html"));
  });
}

export default app;
