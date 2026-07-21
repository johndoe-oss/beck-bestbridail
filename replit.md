# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `npm run dev` — run the API server, storefront, and design sandbox together
- `npm run dev:api` — run just the API server (port 5000)
- `npm run typecheck` — full typecheck across all apps and libs
- `npm run build` — typecheck + build all apps
- `npm run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `npm run db:push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- Single root `package.json` (npm), Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- Single-package layout: `artifacts/*` (apps) and `lib/*` (shared source, imported via aliases — see README) all install from the one root `package.json`
