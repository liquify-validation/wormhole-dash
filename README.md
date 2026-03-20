# Wormhole Guardian Dashboard

Real-time monitoring dashboard for the Wormhole cross-chain network, guardians, governor, and on-chain activity.

![Dashboard Screenshot](screenshot.png)

## ✨ Features

### Overview Tab
- Network scorecards (TVL, volume, messages)
- Chain health overview with clickable panels
- Guardian set info and version distribution
- Guardian-chain matrix and lag monitor
- Network latency and feature adoption tracking

### Network Tab
- Wormholescan scorecards (24h / 7d / 30d metrics)
- Message throughput chart (hourly)
- Live transaction feed
- Cross-chain value flow visualization

### Guardians Tab
- Search and filter guardians by name, address, or version
- Toggle between card and table views
- Guardian-chain matrix and lag monitor
- CSV export of guardian data

### Chains Tab
- Chain overview with clickable detail panels
- Chain detail table with per-guardian breakdown

### Governor Tab
- Rate limit status per chain (notional limits, remaining capacity)
- Enqueued VAAs awaiting release
- Token registry with chain filters

### Performance Tab
- Counter rates and signing activity
- Live performance charts over time

### General
- Bookmarkable tabs via URL hash (`#guardians`, `#governor`, etc.)
- Responsive design for all screen sizes
- Dark theme
- Auto-refresh with configurable intervals
- Multiple network endpoint support (mainnet + testnet)

## 🛠 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18+, TypeScript, Vite 5, Tailwind CSS 3, Recharts, Lucide React, Axios |
| **Backend** | Python 3.8+, FastAPI, uvicorn, httpx, WebSocket |

## 🚀 Getting Started

### Direct Mode (no backend needed)

Each browser tab polls Wormhole APIs directly. Simplest setup for a single viewer.

```bash
npm install
npx vite
```

Open http://localhost:5173.

### Backend Mode (recommended for multiple viewers)

A Python backend polls APIs once, caches results, and pushes updates to all connected clients via WebSocket.

**1. Start the backend:**

```bash
cd backend
pip install -r requirements.txt
py -3.9 -m uvicorn main:app --host 0.0.0.0 --port 8080
```

**2. Start the frontend:**

```bash
npx vite --mode backend
```

The `--mode backend` flag loads `.env.backend`, which sets `VITE_USE_BACKEND=true`.

## 🏗 Architecture

### Direct Mode
Browser polls Wormhole guardian and Wormholescan APIs directly every 10-30 seconds. Simple, zero infrastructure.

### Backend Mode
```
Browser  <──WebSocket──>  FastAPI Backend  ──HTTP──>  Wormhole APIs
                          (polls & caches)
```
- Python FastAPI server polls all endpoints on a schedule (heartbeats every 10s, governor/wormholescan every 30s)
- Caches results in memory
- Broadcasts updates to all connected WebSocket clients every 5 seconds
- REST endpoints available as fallback (`GET /api/data/{endpoint_key}`)

### Auto-Fallback
When running in backend mode, if the WebSocket connection is unavailable the frontend automatically falls back to direct mode.

## 📡 Data Sources

| API Group | Endpoints |
|-----------|-----------|
| **Guardian Heartbeats** | `GET /v1/heartbeats` (guardian nodes) or `GET /guardian-heartbeats` (cloud functions) |
| **Guardian Set** | `GET /v1/guardianset/current` |
| **Governor** | `GET /v1/governor/available_notional_by_chain`, `GET /v1/governor/enqueued_vaas`, `GET /v1/governor/token_list` |
| **Wormholescan** | `GET /api/v1/scorecards`, `GET /api/v1/last-txs`, `GET /api/v1/transactions`, `GET /api/v1/x-chain-activity` |

Endpoints are sourced from multiple providers: Cloud Functions, xLabs, MCF, and ChainLayer (mainnet + testnet).

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_USE_BACKEND` | `false` | Enable backend/WebSocket mode |
| `VITE_WS_URL` | `ws://localhost:8080/ws` | WebSocket URL for backend mode |
| `VITE_API_URL` | `http://localhost:8080` | REST API URL for backend mode |

These are set automatically when using `--mode backend` via `.env.backend`.

## 📁 Project Structure

```
wormhole-dashboard/
├── backend/
│   ├── main.py              # FastAPI app, WebSocket handler, REST endpoints
│   ├── poller.py            # Background API polling and caching
│   ├── config.py            # Endpoint definitions and polling intervals
│   └── requirements.txt
├── src/
│   ├── App.tsx              # Root component, tab routing, data source selection
│   ├── components/          # 24 UI components (cards, charts, tables, etc.)
│   ├── hooks/               # Data-fetching hooks (heartbeats, governor, etc.)
│   ├── utils/               # API client functions
│   └── types/               # TypeScript type definitions
├── .env.backend             # Environment overrides for backend mode
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 📄 License

MIT
