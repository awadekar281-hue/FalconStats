# FalconStats core design specification

Status: document the existing core design for review; no redesign or new UI system introduced.

## Design system

- **Default appearance:** white/light. Dark display is optional and selected in Settings.
- **Brand tokens:** navy `#102B55`, cyan `#00AFC8`, orange `#E89A27`. Positive/negative financial values use separate green/red status colors.
- **Typography:** Inter-first system sans-serif stack. No remote font dependency is loaded.
- **Brand mark:** inline SVG mark and text wordmark in the sidebar. No standalone logo file is present in the repository.
- **Shell:** fixed desktop sidebar, sticky header with breadcrumb, global search, alert and sign-in links, centered content area, and footer with data-source attribution.
- **Shared components:** `PageHeading`, `DataState`, `UnsupportedPanel`, `MetricsCards`, `MarketCharts`, `AssetTable`, `SearchToolbar`, `SnapshotTable`, reusable metric/card/table styles, and `useApi`.
- **Data display rule:** render values only from the internal API. Show source/freshness/error/empty/unsupported context; do not fill gaps with demo prices or fabricated charts.
- **Navigation:** Overview, Markets, Categories, Exchanges, DeFi, Derivatives; Research & news, AI insights, Screener, Signals; Watchlist, Portfolio, Alerts; Settings and Admin. Header adds direct Alerts and Sign in actions.
- **Responsive behavior:** sidebar drawer with backdrop on mobile; cards stack at tablet width; tables scroll horizontally; search and page controls wrap or compact at phone widths.

## Page design inventory

| Page | Layout and shared shell | Tables and charts | Filters and actions | States and responsive behavior |
| --- | --- | --- | --- | --- |
| Market overview | Page heading and Explore markets action; metric cards; two-column chart/snapshot region; market leaders table. | Dominance donut from current global response; current market-cap bars from returned listings; leaders table. No time-series chart on overview. | Dominance/Asset cap selector; table sorting, pagination and refresh; links to Markets/asset details. | Shared API state and skeletons; empty chart explanation where data is absent. Cards stack, metrics collapse, table scrolls. |
| Markets | Heading with refresh; section header and toolbar above full-width asset table. | Columns: watchlist, rank, asset, price, 24h change, market cap, 24h volume, update time. | API search; All/Gainers/Losers; sortable rank/price/change/market cap; 50-row pagination; row star; refresh. | Loading skeletons, API error, no-match empty row, source time. Horizontal table overflow; toolbar wraps. |
| Individual coin | Heading with asset name/rank/provider identity; metrics; snapshot and exchange cards; history card. | Current price, cap, volume, change; quote/source/platform/contract fields; exchange quotes; 7-day global-reference price line. Supply and technical-indicator panels are not currently displayed. | Back to markets; add/remove from browser watchlist; refresh asset; history is requested for 7 days. | Asset loading/error/not-found states; history loading/error/unavailable; cards stack and chart height reduces on mobile. |
| Categories / sectors | Heading and `UnsupportedPanel`. | No category table/chart. | No category filters/actions. | Explains missing category API/schema; inherited sidebar/header and mobile shell. |
| Exchanges | Heading, provider metadata state, exchange summary metric cards, latest-pairs table. | Pair columns: exchange, symbol, market type, price, quote asset, 24h volume/change, source time. | Refresh all exchange resources. No pair filters/sort/pagination currently. | Shared API error/empty rows; grid stacks; table scrolls. |
| Derivatives | Heading and data state; two summary table cards; liquidation card. | Open interest columns: symbol, amount, unit, source time. Funding: symbol, rate, next funding time, source time. Liquidations explicitly unsupported/no captured events. | Refresh OI, funding, and liquidation resources. No timeframe or symbol filters. | Error/loading state for provider data; explicit unsupported liquidation text; tables scroll. |
| Research and news | Heading and unsupported panel. | No article table, source feed, or research chart. | None. | Explains no internal news/research feed; shell remains usable on mobile. |
| AI insights | Heading and unsupported panel. | No insight cards, citations, or chart. | None. | Explains missing model/evidence API; no generated text or figures. |
| Screener | Same listing page/table layout as Markets with screener title. | Same market columns; no technical-indicator chart. | Search, gainers/losers, table sorting, pagination, refresh. | Same API loading/error/empty states as Markets; responsive table overflow. |
| Trading signals | Heading and unsupported panel. | No signal table or chart. | None. | Explains no deterministic signal endpoint/history; no fabricated buy/sell badges. |
| Watchlist | Heading and saved-assets table; warning banner when saved IDs are absent from current API page. | Same asset table columns for matched stored records. | Star in Markets/details; remove unavailable IDs; sorting and row navigation. | Empty list, API loading/error, unavailable-saved-ID state. Browser-local IDs; table scrolls. |
| Portfolio | Heading, API state, summary card, position table. | Current price and position value per asset; total only if all positions/prices are available. No performance chart or transaction ledger. | Select asset, enter quantity, add; edit quantity; remove. | Missing price/asset warning; unavailable total rather than zero; table scrolls and controls wrap. |
| Alerts | Heading, API state, create-rule form and threshold table. | Asset, condition, threshold, latest snapshot, threshold-met state. No alert history chart. | Select asset, above/below, threshold, create/remove. | Empty state; missing price labelled; client-side threshold evaluation only; controls stack on narrow screens. |
| Settings | Heading and preference card with stacked settings rows. | No data table/chart. | Light/dark toggle; Clear local data. USD/manual refresh are labels, not configurable controls. | Preferences stored in browser; responsive rows stack vertically. |
| Admin | Heading/status refresh; two cards for provider status and protected operations; usage JSON card when authorized. | Provider name/status/latest success; usage response is JSON, not a market chart. | Refresh status, enter session token, verify, queue ingestion, end session. | Loading, provider unavailable, auth/operation error, success message. Cards and forms wrap on mobile. |
| Login | Heading, unsupported sign-in panel, return-home link. | None. | Return to overview. | Explicitly says there is no identity/session backend. |

## Interaction conventions

1. Use the existing shell, cards, page headings, table, state banner, and button styles before adding a new page pattern.
2. Keep source and timestamp adjacent to market values when returned by the API.
3. Use loading skeletons only during requests; render explicit unavailable/unsupported explanations when a service or field does not exist.
4. Preserve desktop table density and use horizontal overflow on small screens instead of hiding key financial columns silently.
5. Keep browser-only workspace state visibly browser-local until account persistence is designed and reviewed.
