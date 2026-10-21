# Exora — Crypto Trading Platform

Modern crypto trading studio with high-frequency analytics, portfolio management, liquid-glass UI, and secure authentication (Google OAuth & Email OTP verification).

## Features
- **Real-Time Crypto Market**: Live price feeds, order books, and depth charts.
- **Liquid-Glass UI**: Dark aesthetic built with Tailwind CSS and Motion.
- **Authentication**:
  - Google One Tap / OAuth 2.0
  - Secure Email OTP verification (Gmail SMTP / Resend)
  - Demo password & recovery flows
- **Portfolio & Trading Engine**: Instant buy/sell simulation, asset distribution, balance tracking.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open `http://localhost:3000` to view the application.

### Build
```bash
npm run build
```


## Trading backend (Phase 1)

The server is now authoritative for accounts, orders, margin and P/L — the browser no longer simulates a broker.

| Area | What it does |
| --- | --- |
| `server/tradingEngine.ts` | market / limit / stop orders, partial close, SL/TP, modify, cancel, tier spreads + commission, margin call, stop-out, negative-balance protection, swaps (3× Wed), market hours |
| `server/marketData.ts` | price feed (`simulated`, `binance`, `twelvedata`), 1-minute candle store (SQLite), tier quotes |
| `server/auth.ts` | scrypt passwords, HS256 JWT, RBAC, rate limiting |
| `server/brokerApi.ts` | `/api/v1` REST: auth, accounts, wallet (deposit/withdraw requests), trading, admin |
| `server/tradingViewUdf.ts` + `public/datafeeds/exora-datafeed.js` | TradingView Charting Library datafeed on the broker's own prices |
| `server/tradingWs.ts` | `/ws/trading?token=` per-account quotes, orders, P/L, margin alerts |
| `src/lib/serverSync.ts` | mirrors server state into the existing UI store and routes UI actions to the API |

```bash
npm install
npm test            # engine + API tests (node:test)
npm run dev         # http://localhost:3000   (set MARKET_HOURS=off to trade on weekends in dev)
npm run build && npm start
```

Configuration is documented in `.env.example` (`JWT_SECRET`, `ADMIN_EMAIL/ADMIN_PASSWORD`, `MARKET_FEED`, `DB_PATH` …).

### Not production-ready yet
* **Prices** — `simulated` is a random walk. Crypto/gold can use Binance (`MARKET_FEED=binance`, XAU is proxied by PAXG); forex needs a licensed provider or LP/FIX bridge.
* **Money in/out** — deposits/withdrawals are requests approved by an admin; no Payme/Click/Humo/USDT gateway is integrated.
* **KYC / phone & email verification** — OTP checks in the UI are still client-side; admin portal and KYC screens still use the local demo store.
* **Compliance** — a real brokerage needs a licence, segregated client funds and a regulated liquidity provider/B-book risk policy.
* The Charting Library under `public/charting_library` is proprietary to TradingView; make sure your licence covers its use.

## Deploy
Docker image (`Dockerfile`) or Render Blueprint (`render.yaml`). Required env: `JWT_SECRET`, `ADMIN_PASSWORD`; mount a persistent volume at `/data` (SQLite). Health check: `/api/health`.
