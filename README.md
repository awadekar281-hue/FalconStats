# FalconStats

Responsive V1 market intelligence dashboard based on the FalconStats phased technical plan.

The backend API and ingestion engine are in [`backend/`](backend/README.md). The dashboard still uses clearly labeled illustrative content; the backend does not silently replace it or serve the test fixtures.

## Current state

This is a static, client-side V1 interface. All displayed market values, charts, sector metrics, and news headlines are illustrative sample content. There is no live market data provider or backend connected. The site labels this clearly in the interface.

Implemented interactions include asset search, gainers/losers filtering, local browser watchlist persistence, responsive navigation, chart range selection, and sample asset feedback.

## Run locally

Open `index.html` in a browser, or serve the folder with any static web server. No build step or package installation is required.

## Deploy

The project can be deployed as a static site. A live provider requires a backend ingestion/API layer and licensed provider credentials; do not put provider secrets in browser code.

## Planned next

1. Select a licensed data provider and confirm display, caching, attribution, and history rights.
2. Add a normalized backend API and durable asset registry.
3. Replace demo content with timestamped provider data and explicit stale/missing states.
4. Add authenticated accounts and synced watchlists after API and identity setup.
5. Expand into V2 derivatives, alerts, portfolio, and grounded AI features as defined in the technical plan.
