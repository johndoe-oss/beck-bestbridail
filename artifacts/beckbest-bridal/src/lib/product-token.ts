/**
 * Product slug utilities — encode numeric product IDs into human-readable,
 * non-sequential URL tokens. The ID is embedded using a shuffled base-62
 * alphabet so raw integers don't appear in URLs.
 *
 * This is a symmetric codec: encode ↔ decode. It requires no server round-trip.
 */

const BASE = "mK7Rq3ZdP9JnBvXpGs1CwLfT6eYuAj0IhkOiN5DtHyF4WlVb8MEocU2QaSrz";

function encodeId(id: number): string {
  if (id <= 0) return BASE[0];
  let n = id;
  let out = "";
  while (n > 0) {
    out = BASE[n % 62] + out;
    n = Math.floor(n / 62);
  }
  return out;
}

function decodeId(token: string): number {
  let n = 0;
  for (const ch of token) {
    const idx = BASE.indexOf(ch);
    if (idx === -1) return 0;
    n = n * 62 + idx;
  }
  return n;
}

function toSlugPart(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/**
 * Encode a product into a URL-safe slug.
 * Example: productSlug(42, "Ivory Lace Ball Gown") → "ivory-lace-ball-gown-Gm"
 */
export function productSlug(id: number, name: string): string {
  return `${toSlugPart(name)}-${encodeId(id)}`;
}

/**
 * Decode a product slug back to its numeric ID.
 * Returns 0 on invalid input.
 */
export function productIdFromSlug(slug: string): number {
  const lastDash = slug.lastIndexOf("-");
  if (lastDash === -1) return 0;
  const token = slug.slice(lastDash + 1);
  return decodeId(token);
}
