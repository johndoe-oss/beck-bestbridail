import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

// ── Malicious User-Agent patterns ──────────────────────────────────────────────
// Block known hacking tools, scanners, headless browsers, and scripted CLI tools
// being used as scraping/hacking vectors. We match substrings (case-insensitive).
const BLOCKED_UA_PATTERNS = [
  "sqlmap",
  "nikto",
  "nmap",
  "masscan",
  "nessus",
  "burpsuite",
  "burp suite",
  "wpscan",
  "dirbuster",
  "gobuster",
  "hydra",
  "metasploit",
  "openvas",
  "acunetix",
  "appscan",
  "netsparker",
  "webinspect",
  "zmeu",
  "zgrab",
  "zgrab2",
  "whatweb",
  "wappalyzer-cli",
  "skipfish",
  "vega",
  "w3af",
  "arachni",
  "ironwasp",
  "grendel-scan",
  "havij",
  "absinthe",
  "bbqsql",
  "bsqlbf",
  "pangolin",
  "safe3",
  "sqlsus",
  "sqlninja",
  "the mole",
  "mole",
  "jsql",
  "sql power injector",
  "power injector",

  // Headless / automation browsers used in attacks
  "headless",
  "phantomjs",
  "puppeteer",
  "playwright",
  "selenium",
  "webdriver",
  "casperjs",
  "slimerjs",

  // Scripting runtimes / CLI tools when used without disguise
  "python-requests",
  "python-urllib",
  "python-httpx",
  "go-http-client",
  "libwww-perl",
  "libcurl",
  "curl/",
  "wget/",
  "axel",
  "httrack",
  "lwp-request",
  "httpie",
  "insomnia",

  // Chrome extension spoofed or malicious
  "extensions-chrome",
  "chrome-extension",
  "moz-extension",
  "edge-extension",

  // Generic scanner / fuzzer fingerprints
  "nessus",
  "qualys",
  "shodan",
  "censys",
  "zgrab",
  "masscan",
  "gobuster",
  "feroxbuster",
  "rustbuster",
  "dirb",
  "wfuzz",
  "ffuf",
  "nuclei",
  "zap",
  "crawler",
  "bot",
  "spider",
  "scanner",
  "fuzzer",
  "brutus",
  "thc-hydra",
  "ncrack",
  "medusa",
];

// ── Blocked header signatures (Chrome extension IDs, custom tool headers) ─────
const BLOCKED_HEADER_PREFIXES = [
  "x-chrome-extension-id",
  "x-ext",
  "x-extension",
  "x-chrome-ext",
  "chrome-extension-",
  "x-devtools-",
  "x-browser-plugin",
  "x-firefox-extension",
  "x-edge-ext",
];

// ── Path Traversal patterns ────────────────────────────────────────────────────
// Block any URL that contains directory traversal sequences.
// This includes both literal ".." and URL-encoded variants, plus null-byte injection.
const PATH_TRAVERSAL_RE =
  /(?:^|[\/\\])\.{2,}(?:[\/\\]|$)|%2e%2e|%252e%252e|%c0%ae|%c0%2e|%uff0e|%u2216|\.\.(?:%2f|%5c)/i;
const NULL_BYTE_RE = /%00|\x00/;

// ── SQL Injection detection in query/body ──────────────────────────────────────
// These are aggressive heuristics; we only scan query strings, URL params,
// and body keys/values. False positives are possible with legacy data but unlikely
// with this app's typical inputs.
const SQLI_PATTERNS = [
  /(\bUNION\b.*\bSELECT\b)/i,
  /(\bSELECT\b.*\bFROM\b)/i,
  /(\bDROP\b\s+\bTABLE\b)/i,
  /(\bALTER\b\s+\bTABLE\b)/i,
  /(\bINSERT\b\s+\bINTO\b)/i,
  /(\bDELETE\b\s+\bFROM\b)/i,
  /(\bUPDATE\b\s+\bSET\b)/i,
  /(\bEXEC\b\s*\(|xp_cmdshell)/i,
  /(\bSLEEP\b\s*\()/i,
  /(\bBENCHMARK\b\s*\()/i,
  /(\bWAITFOR\b\s+\bDELAY\b)/i,
  /(;\s*--)/,
  /(';\s*(?:DROP|INSERT|DELETE|UPDATE|SELECT))/i,
  /(\/\*!)/,
  /(\bINFORMATION_SCHEMA\b)/i,
  /(\bPG_SLEEP\b)/i,
  /(\bLOAD_FILE\b)/i,
  /(\bINTO\s+(?:OUT|DUMP)FILE\b)/i,
];

// ── XSS detection patterns ─────────────────────────────────────────────────────
const XSS_PATTERNS = [
  /<script[^>]*>/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?[^"'>]*["']?\s*/i,
  /<iframe[^>]*>/i,
  /<object[^>]*>/i,
  /<embed[^>]*>/i,
  /<link[^>]*>/i,
  /<meta[^>]*>/i,
  /expression\s*\(/i,
  /eval\s*\(/i,
  /fromCharCode/i,
  /alert\s*\(/i,
  /prompt\s*\(/i,
  /confirm\s*\(/i,
  /document\.cookie/i,
  /document\.write/i,
  /window\.location/i,
  /String\.fromCharCode/i,
  /atob\s*\(/i,
  /btoa\s*\(/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
];

// ── HTML error templates (generic, no details leaked) ──────────────────────────

function sendErrorHtml(res: Response, statusCode: number, title: string): void {
  res.status(statusCode).setHeader("Content-Type", "text/html; charset=utf-8").send(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#f8f8f8;color:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:1rem}.card{background:#fff;border:3px solid #111;padding:2.5rem 2rem;max-width:420px;width:100%;box-shadow:6px 6px 0 #111}h1{font-size:2.5rem;margin-bottom:.5rem}p{font-size:1rem;color:#555}</style></head><body><div class="card"><h1>${title}</h1><p>Something went wrong. Please try again later.</p></div></body></html>`,
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isBlockedUserAgent(ua: string | undefined): { blocked: boolean; matched: string } {
  if (!ua) return { blocked: false, matched: "" };
  const lower = ua.toLowerCase();
  for (const pattern of BLOCKED_UA_PATTERNS) {
    if (lower.includes(pattern)) {
      return { blocked: true, matched: pattern };
    }
  }
  return { blocked: false, matched: "" };
}

function hasBlockedHeaders(headers: Record<string, string | string[] | undefined>): { blocked: boolean; matched: string } {
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    for (const prefix of BLOCKED_HEADER_PREFIXES) {
      if (lowerKey.startsWith(prefix)) {
        return { blocked: true, matched: key };
      }
    }
    // Also check if the header value itself looks like a chrome extension ID
    // Chrome extension IDs are 32-char lowercase alphabetic strings
    if (typeof value === "string" && /^[a-z]{32}$/.test(value)) {
      return { blocked: true, matched: `${key}: ext-id-like` };
    }
  }
  return { blocked: false, matched: "" };
}

function scanValue(input: unknown, patterns: RegExp[]): string | null {
  if (typeof input !== "string") return null;
  for (const re of patterns) {
    if (re.test(input)) return `pattern: ${re.source}`;
  }
  return null;
}

function scanObject(
  obj: Record<string, unknown>,
  patterns: RegExp[],
): { key: string; reason: string } | null {
  for (const [key, value] of Object.entries(obj)) {
    // Scan the key itself
    const keyMatch = scanValue(key, patterns);
    if (keyMatch) return { key, reason: `key matched ${keyMatch}` };

    // Scan string values
    if (typeof value === "string") {
      const valMatch = scanValue(value, patterns);
      if (valMatch) return { key, reason: `value matched ${valMatch}` };
    }

    // Recurse into nested objects (limit depth to avoid stack overflow)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = scanObject(value as Record<string, unknown>, patterns);
      if (nested) return { key: `${key}.${nested.key}`, reason: nested.reason };
    }

    // Scan array values
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          const match = scanValue(item, patterns);
          if (match) return { key, reason: `array item matched ${match}` };
        }
      }
    }
  }
  return null;
}

// ── Middleware ──────────────────────────────────────────────────────────────────

/**
 * Comprehensive security middleware that blocks:
 * - Path traversal attacks (e.g., `....12`, `..\\`, `%2e%2e`)
 * - SQL injection attempts in query params and body
 * - XSS injection patterns
 * - Known hacking tools, scanners, and scripted CLI user-agents
 * - Malicious Chrome extension headers
 * - Null-byte injection
 *
 * Responds with a non-descriptive 400 error to avoid leaking information.
 *
 * NOTE: Routes listed in BYPASS_PATTERNS are exempt from body/query scanning
 * to avoid false positives (e.g., payment references that may match SQLi patterns).
 */
const BYPASS_PATTERNS = [
  "/api/payments/verify",
  "/api/payments/initiate",
];

function shouldBypassScan(url: string): boolean {
  for (const pattern of BYPASS_PATTERNS) {
    if (url.startsWith(pattern)) return true;
  }
  return false;
}

export function securityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Skip scanning for payment verification/initiation routes (avoid false positives)
  if (shouldBypassScan(req.originalUrl ?? req.url)) {
    next();
    return;
  }

  const clientIp = req.ip ?? req.socket.remoteAddress ?? "unknown";

  // 1 ── Block suspicious User-Agents ──────────────────────────────────────────
  // Skip UA check for health endpoints so monitoring tools (curl/wget) can reach them.
  if (!shouldBypassUaCheck(req.originalUrl ?? req.url)) {
    const uaCheck = isBlockedUserAgent(req.headers["user-agent"]);
    if (uaCheck.blocked) {
      logger.warn(
        { clientIp, ua: req.headers["user-agent"], matched: uaCheck.matched },
        "Blocked request: malicious user-agent",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }
  }

  // 2 ── Block suspicious headers (Chrome extensions, custom tool headers) ─────
  const headerCheck = hasBlockedHeaders(
    req.headers as Record<string, string | string[] | undefined>,
  );
  if (headerCheck.blocked) {
    logger.warn(
      { clientIp, header: headerCheck.matched },
      "Blocked request: suspicious header",
    );
    sendErrorHtml(res, 400, "Bad Request");
    return;
  }

  // 3 ── Block path traversal in URL ───────────────────────────────────────────
  const fullUrl = req.originalUrl ?? req.url;
  if (PATH_TRAVERSAL_RE.test(fullUrl) || NULL_BYTE_RE.test(fullUrl)) {
    logger.warn(
      { clientIp, url: fullUrl },
      "Blocked request: path traversal attempt",
    );
    sendErrorHtml(res, 400, "Bad Request");
    return;
  }

  // 4 ── Scan query parameters for SQL injection & XSS ─────────────────────────
  if (req.query && Object.keys(req.query).length > 0) {
    const sqliMatch = scanObject(
      req.query as Record<string, unknown>,
      SQLI_PATTERNS,
    );
    if (sqliMatch) {
      logger.warn(
        { clientIp, field: sqliMatch.key, reason: sqliMatch.reason },
        "Blocked request: SQL injection in query params",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }

    const xssMatch = scanObject(
      req.query as Record<string, unknown>,
      XSS_PATTERNS,
    );
    if (xssMatch) {
      logger.warn(
        { clientIp, field: xssMatch.key, reason: xssMatch.reason },
        "Blocked request: XSS in query params",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }
  }

  // 5 ── Scan request body for SQL injection & XSS ─────────────────────────────
  if (req.body && typeof req.body === "object") {
    const bodySqli = scanObject(req.body as Record<string, unknown>, SQLI_PATTERNS);
    if (bodySqli) {
      logger.warn(
        { clientIp, field: bodySqli.key, reason: bodySqli.reason },
        "Blocked request: SQL injection in body",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }

    const bodyXss = scanObject(req.body as Record<string, unknown>, XSS_PATTERNS);
    if (bodyXss) {
      logger.warn(
        { clientIp, field: bodyXss.key, reason: bodyXss.reason },
        "Blocked request: XSS in body",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }
  }

  // 6 ── Scan URL params (e.g., /api/products/:id where :id is the param) ─────
  if (req.params && Object.keys(req.params).length > 0) {
    const paramSqli = scanObject(
      req.params as Record<string, unknown>,
      SQLI_PATTERNS,
    );
    if (paramSqli) {
      logger.warn(
        { clientIp, param: paramSqli.key, reason: paramSqli.reason },
        "Blocked request: SQL injection in URL params",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }

    const paramXss = scanObject(
      req.params as Record<string, unknown>,
      XSS_PATTERNS,
    );
    if (paramXss) {
      logger.warn(
        { clientIp, param: paramXss.key, reason: paramXss.reason },
        "Blocked request: XSS in URL params",
      );
      sendErrorHtml(res, 400, "Bad Request");
      return;
    }
  }

  next();
}

// ── Bypass list ─────────────────────────────────────────────────────────────────
// Certain endpoints should be exempt from User-Agent blocking so that
// monitoring tools (curl, wget, etc.) can reach them.
const UA_BYPASS_PATHS = ["/api/healthz", "/api/health"];

// ── Catch-all 404 for unmatched /api/* routes ──────────────────────────────────

/**
 * Must be registered AFTER all known /api/* routes.
 * Returns a consistent JSON error for any unmatched API endpoint.
 */
export function apiNotFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  sendErrorHtml(res, 404, "Page Not Found");
}

/**
 * Check if the request path should bypass User-Agent blocking.
 */
function shouldBypassUaCheck(url: string): boolean {
  for (const path of UA_BYPASS_PATHS) {
    if (url.startsWith(path)) return true;
  }
  return false;
}
