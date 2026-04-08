# Crypto Orderbooks (QuantModelWeb)

A small React (Vite) app that reads **Kalshi 15-minute crypto** snapshots from **Firestore**, shows OHLC + order-book context on charts, and lets users **download CSV** for backtesting. Not a trading terminal—data viewing and export only.

## What it uses

- **Firestore** — `kalshi` collection (markets) and `snapshots` subcollection (fed by your Kalshi pipeline).
- **Firebase Hosting** — production build from `dist/` (see `firebase.json`).
- **Firebase Analytics** (optional) — if `VITE_FIREBASE_MEASUREMENT_ID` is set.

## Run locally

```bash
cd QuantModelWeb
npm install
# add .env with VITE_* Firebase keys (see below)
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Environment (`.env`)

All keys must be prefixed with `VITE_` so Vite exposes them to the client:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional, for Analytics)

## Scripts

| Command            | Purpose                          |
| ------------------ | -------------------------------- |
| `npm run dev`      | Dev server                       |
| `npm run build`    | Production build → `dist/`       |
| `npm run preview`  | Serve `dist/` locally            |
| `npm run lint`     | ESLint                           |
| `npm run deploy`   | `build` + `firebase deploy --only hosting` |

Deploy from **this folder** so `firebase.json` and `.firebaserc` apply. Default project in `.firebaserc` is **`autotrader-5998a`**; live URL is typically `https://autotrader-5998a.web.app` unless you use a custom domain.

## Deploy checklist

1. `firebase login` and `firebase use` (correct project).
2. `npm run deploy` (must produce `dist/` with hosting config pointing at `dist`).

## Layout (short)

- `src/pages/Home.jsx` — market pickers, rules strip, tabs (chart / snapshots / overview).
- `src/components/Stock.jsx` — Kalshi chart, CSV download.
- `lib/kalshi.js` — Firestore reads, candle series, CSV builder.
- `lib/firebase.js` — app + Firestore.
- `lib/analytics.js` — Analytics helpers.

---

Private project.
