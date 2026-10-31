# FalconStats frontend and repository audit

Audit date: 2026-10-31

## Repository and deployment

| Area | Finding |
| --- | --- |
| Frontend framework | Next.js App Router, React, TypeScript, Tailwind CSS v4. `next` resolves to 16.4.3; React and React DOM resolve to 19.2.x. |
| Backend present in repository | A separate NestJS application exists under `backend/`, with PostgreSQL, Redis, BullMQ, provider adapters, SQL migrations, and REST controllers. This audit did not add to or restructure it. |
| Local runtime | Node v26.13.0 and npm 11.20.0. Backend declares Node `>=22.12.0`. |
| Vercel runtime | Project framework is Next.js and its configured Node version is 26.x. The supplied build log identifies Vercel CLI 65.4.0 and Next.js 16.4.3. It does not state the Vercel-side npm version. |
| Package manager and locks | npm, inferred from `package-lock.json` at the root and `backend/package-lock.json`. No `pnpm-lock.yaml`, `yarn.lock`, `npm-shrinkwrap.json`, or `packageManager` field is present. `npm ci` succeeded in both package roots. |
| Root scripts | `dev`, `build` (`next build --webpack`), `start`, `lint`, `typecheck`, and `test`. The Webpack build script is the currently committed setting; the Vercel error persisted with it. |
| Backend scripts | Nest build/start scripts, SQL migration commands, tests, and TypeScript check scripts. |
| Vercel configuration | No tracked `vercel.json`. The Vercel project uses the Next.js framework preset; deployment runs from `/vercel/path0` (repository root) and executes `npm run build`. No static `public` output directory should be configured for this Next.js project. |
| Next configuration | `next.config.ts` enables `poweredByHeader: false` and React strict mode. |
| Environment variable names | `.env.local.example`: `FALCONSTATS_API_ORIGIN`, `FALCONSTATS_ADMIN_API_KEY`, `FALCONSTATS_ADMIN_UI_TOKEN`. `backend/.env.example`: `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `ADMIN_API_KEY`, `COINGECKO_DEMO_API_KEY`, `COINGECKO_MONTHLY_CALL_BUDGET`, `COINGECKO_MARKET_PAGE_SIZE`, `MARKET_INGEST_INTERVAL_SECONDS`, `GLOBAL_METRICS_REFRESH_SECONDS`, `PROVIDER_HTTP_TIMEOUT_MS`, `MARKET_QUOTE_CURRENCY`, `API_CACHE_TTL_SECONDS`, `DATA_STALE_AFTER_SECONDS`, `QUEUE_PREFIX`. No secret values are reproduced here. The Vercel project also exposed `VERCEL_FORCE_NO_BUILD_CACHE`; that troubleshooting setting was disabled after the cache-bypass check. |
| Assets and logo | The app shell draws its mark as inline SVG. No separate FalconStats logo image/SVG asset is tracked in the repository, so the supplied logo cannot be selected from this checkout. |

The root has a single production website and a separate backend source tree. The browser uses same-origin `/api/falconstats/*`; that Next.js route forwards to the server-only `FALCONSTATS_API_ORIGIN`. Provider credentials are not referenced by browser components. The backend is not deployed/configured as part of this audit, so Vercel production data flow remains unverified.

## Dependencies

Root production dependencies: `next`, `react`, `react-dom`, `lucide-react`, and `recharts`. Root development dependencies: Tailwind/PostCSS, ESLint/Next ESLint config, TypeScript, React/Node type definitions, and `tsx` for the existing tests.

The existing backend dependencies include NestJS, PostgreSQL `pg`, Redis `ioredis`, BullMQ, Swagger, validation packages, `lossless-json`, and PGlite/`tsx` for its checks. No dependency was added in this audit. The two npm lockfiles passed `npm ci`; npm reported 16 moderate advisories for the root installation and 2 moderate advisories for the backend installation. No `npm audit fix` was run.

## UTF-8 and Vercel build diagnosis

The supplied Vercel log is for commit `1128df6`. Its first meaningful compile failure is:

> `stream did not contain valid UTF-8`

The reported files were `src/components/data-ui.tsx`, `src/components/admin-page.tsx`, `src/components/app-shell.tsx`, and `src/components/asset-details-page.tsx`. Earlier Turbopack logs had reported the same class of source-read error. Switching the root build script to Webpack did not resolve it in the supplied log.

I ran the strict validator at [scripts/validate-utf8.ps1](../scripts/validate-utf8.ps1) against every tracked file. At this audit it reports no invalid UTF-8 and no BOMs. The previously affected source files also decode under a strict UTF-8 decoder locally. This establishes a mismatch between the checked-out source in this workspace and what the Vercel build process reports; it does **not** establish why Vercel sees invalid source bytes. The UI source was briefly changed to ASCII-only punctuation in a prior troubleshooting attempt, but that was not supported by the byte audit and did not establish a fix; the current local source has been restored to its original punctuation.

The same Vercel log reports two `package-lock.json` config parse messages, but dependency installation proceeds and says `up to date`. The first actionable error in the supplied log is the invalid UTF-8 source-read failure, not the final build-exit message. The npm `cache-dir` warning and install-script notices are warnings in that log; they are not shown as the terminating error.

The later deployments for commits `c7cdaa1` and `f512a82` also report `ERROR` in Vercel deployment metadata, with only the generic `npm run build exited with 1`. The connected build-event endpoint returned 404, so detailed logs for those deployments are not available in this session. The exact latest deployment cause is therefore **not established**. Please provide the detailed log for the latest failed deployment before attributing its failure to a new root cause.

### Environment comparison

| Check | Local | Vercel evidence |
| --- | --- | --- |
| Node | v26.13.0 | Project setting 26.x |
| npm | 11.20.0 | Version not present in supplied log |
| Next | 16.4.3 after lockfile install | 16.4.3 detected |
| Install | `npm ci` succeeds from root and backend lockfiles | Log says dependencies are up to date; exact install command is not shown |
| Build | `npm run build` succeeds locally with current Webpack script | Supplied `1128df6` build fails reading source; later `c7cdaa1` metadata is ERROR but detailed log unavailable |
| OS/case | Windows, case-insensitive filesystem | Linux build at `/vercel/path0`, case-sensitive |
| Root directory | Repository root | `/vercel/path0` |

`npm ci` completed successfully in both package roots after network access to the npm registry was enabled. The root lint, TypeScript check, and production build also passed after that clean install. A successful local build does not validate the Vercel deployment environment.

## Route and integration inventory

| Route | Current implementation and API connection |
| --- | --- |
| `/` | Overview. Requests global metrics and top market listings via the internal API. Current-dominance and current-market-cap charts are derived from those responses. |
| `/markets` | Searchable, sortable, paginated API-backed asset listings. |
| `/asset/[id]` | Asset profile, quote snapshot, exchange quote request, and 7-day price history request. |
| `/categories` | Route exists; explicit unsupported state because category endpoints/schema are absent. |
| `/exchanges` | Requests exchange summary plus Binance and Bybit market records. |
| `/derivatives` | Requests Bybit open interest and funding records. Liquidation data is labeled unsupported. |
| `/defi` | Additional route not in the Phase 1 list; requests DeFiLlama protocol and chain records. |
| `/research` | Explicit unsupported state; there is no internal news/research feed. |
| `/ai-insights` | Explicit unsupported state; no model/evidence endpoint. |
| `/screener` | Reuses the market-listing table with search and gainers/losers filters. No indicator engine. |
| `/signals` | Explicit unsupported state; no signal engine or history endpoint. |
| `/watchlist` | Browser-local asset IDs joined to the current asset API result. |
| `/portfolio` | Browser-local asset quantities and API-backed current-price valuation; no transaction history or cost basis. |
| `/alerts` | Browser-local threshold rules evaluated in the page against current returned snapshots; no background notifications. |
| `/settings` | Browser-local theme preferences and clear-local-data control. Quote currency is fixed to USD; data refresh is manual. |
| `/login` | Route exists, but states that authentication/session APIs are unsupported. |
| `/admin` | Provider status, protected usage request, session-token verification, refresh, and ingestion-queue action through the proxy. Multi-user roles are unsupported. |
| `/api/falconstats/[...path]` | Same-origin API proxy with explicit public GET and protected admin route allowlists. |

## Functionality audit highlights

- **Working interactions in the code:** sidebar route navigation; responsive menu open/close; search shortcut and search submit; market text search, gainers/losers filter, table sorting, pagination, and refresh; watchlist add/remove; portfolio add/edit/remove; alert create/remove; light/dark switch; clear local workspace data; overview chart selector; admin status refresh, protected usage fetch, and protected ingestion request.
- **Controls with honest limits:** the global search routes into market search; local watchlist/portfolio/alert data stays in this browser. Alerts do not notify while the page is closed. Login, category, news, AI, and signals routes explain why they are unavailable.
- **Data presentation:** overview composition is calculated from returned dominance, and the market-cap bar chart uses returned current listings. The individual asset line chart uses the returned stored history endpoint. No fixed sample market series were found in those production chart paths. Existing browser-local state and static labels are not market-price data.
- **Data states:** API resources expose loading, success, and error states; shared UI displays metadata/source time when present and has empty/unsupported states. Refresh is manual; no front-end polling/websocket status exists.
- **Responsive design:** sidebar collapses below 760 px; two-column cards become one column at 1120 px; metrics collapse to two columns and tables use horizontal overflow. A 420 px breakpoint adjusts type and topbar controls.
- **Potential control inconsistency:** global and page-level search are separate inputs; the global search hands its query to the markets page. Page-specific search is then locally controlled. The search control is not a provider-wide search service.
