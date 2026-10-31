# FalconStats

FalconStats market-intelligence website and API. The Next.js App Router frontend is in `src/`; it reads market data through a same-origin proxy to the NestJS API in `backend/`. It shows stored provider data with its freshness metadata and does not use the old static page's illustrative sample values.

## Run locally

1. Start PostgreSQL and Redis using `docker compose -f backend/docker-compose.yml up -d`.
2. Configure the backend: copy `backend/.env.example` to `backend/.env`, set a random 32-character-or-longer `ADMIN_API_KEY`, then run `npm install` in `backend`, `npm run migrate`, and `npm run start:dev` there.
3. Configure the web app: copy `.env.local.example` to `.env.local`. For protected admin operations, set `FALCONSTATS_ADMIN_API_KEY` to the same backend key and set a separate random 32-character-or-longer `FALCONSTATS_ADMIN_UI_TOKEN`.
4. Run `npm install` and `npm run dev` at the project root, then visit `http://localhost:3000`.

The web proxy defaults to `http://127.0.0.1:3001`; deployments should set `FALCONSTATS_API_ORIGIN` to a private/reachable backend origin. Keep admin secrets server-side and do not add `NEXT_PUBLIC_` prefixes.

Market history, category directories, exchange details, derivatives, news, AI insights, signals, and account login require backend capabilities not yet implemented. Their routes explain the gap instead of showing fake live data. Watchlists, portfolio quantities, alert rules, and display preferences are local to this browser; they use current assets and prices from the API where available.

See [`backend/README.md`](backend/README.md) for data services and [`backend/docs/api.md`](backend/docs/api.md) for endpoint contracts.
