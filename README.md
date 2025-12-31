# QuantModel Web

A modern, real-time trading dashboard built with React and Vite that visualizes AI-powered trading strategies, displays live market data, and tracks trading performance.

## 🚀 Overview

QuantModelWeb is a production-ready React application that provides:

- **Real-time Trading Dashboard**: Live stock charts with candlestick visualization
- **Trade History**: Complete record of all trades with P&L tracking
- **Strategy Overview**: Detailed strategy information and performance metrics
- **Interactive Charts**: Zoom, pan, and hover interactions for detailed analysis
- **Dark/Light Mode**: Full theme support with seamless switching
- **Firebase Integration**: Real-time data synchronization with backend
- **Responsive Design**: Optimized for desktop and mobile devices

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Components](#components)
- [Firebase Integration](#firebase-integration)
- [Theme System](#theme-system)
- [Configuration](#configuration)

## ✨ Features

### 📊 Stock Chart Component

- **Candlestick Visualization**: OHLC data with volume bars
- **Moving Averages**: 6 dynamic MA lines (MA5, MA6, MA7, MA10, MA12, MA20)
- **Trade Markers**: Visual indicators for BUY/SELL entries and exits
- **Interactive Tooltips**: Hover to see detailed OHLC and trade information
- **Zoom & Pan**: Full chart navigation controls
- **Real-time Updates**: Auto-refreshes every 1 minute

### 📈 Trade History

- **Open Positions**: Display current open trades with running P&L
- **Closed Trades**: Complete history of all completed trades
- **Cumulative P&L Chart**: Visual progression of trading performance
- **Statistics Dashboard**: Win rate, average win/loss, profit factor
- **Trade Table**: Detailed trade information with entry/exit data

### 🎯 Strategy Overview

- **Strategy Details**: Model architecture and configuration
- **Performance Metrics**: Real-time P&L and position statistics
- **Key Indicators**: Account balance, realized P&L, running P&L

### 🎨 User Experience

- **Dark/Light Mode**: System-aware theme switching
- **Responsive Layout**: Mobile-first design
- **Smooth Animations**: Polished UI interactions
- **Error Handling**: Graceful error states and loading indicators

## 🏗️ Architecture

```
QuantModelWeb/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Stock.jsx        # Main candlestick chart component
│   │   ├── History.jsx      # Trade history and statistics
│   │   └── Overview.jsx     # Strategy overview
│   ├── pages/               # Page components
│   │   ├── Home.jsx         # Main dashboard
│   │   └── About.jsx        # About page
│   ├── nav/                 # Navigation components
│   │   ├── Nav.jsx          # Top navigation bar
│   │   └── Footer.jsx       # Footer component
│   ├── theme/               # Theme system
│   │   └── theme.jsx        # Theme configuration and provider
│   ├── lib/                 # Firebase and utility functions
│   │   ├── firebase.js      # Firebase initialization
│   │   ├── position.js      # Position data fetching
│   │   └── strategy.js      # Strategy data fetching
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Entry point
├── public/                  # Static assets
├── firebase.json            # Firebase Hosting config
├── .firebaserc              # Firebase project config
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies and scripts
```

### Data Flow

```
┌─────────────────┐
│  Firebase       │  (Firestore + Storage)
│  Backend        │
└────────┬────────┘
         │
         │ Real-time updates
         ▼
┌─────────────────┐
│  React App      │
│  - Home.jsx     │  (Fetches data every 1 min)
│  - Components   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UI Components   │
│  - Stock Chart  │
│  - History      │
│  - Overview     │
└─────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ recommended
- **npm** or **yarn**: Package manager
- **Firebase CLI**: For deployment (optional)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd QuantModelWeb
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=autotrader-5998a
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Start development server**:

   ```bash
   npm run dev
   ```

5. **Open in browser**:
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## 💻 Development

### Available Scripts

- **`npm run dev`**: Start development server with hot reload
- **`npm run build`**: Build for production (outputs to `dist/`)
- **`npm run preview`**: Preview production build locally
- **`npm run lint`**: Run ESLint to check code quality
- **`npm run deploy`**: Build and deploy to Firebase Hosting
- **`npm run deploy:hosting`**: Deploy only (requires existing build)

### Development Workflow

1. **Make changes** to components in `src/`
2. **Hot reload** automatically updates the browser
3. **Test** in both light and dark modes
4. **Build** before deploying: `npm run build`
5. **Deploy** to Firebase: `npm run deploy`

### Code Structure

- **Components**: Reusable UI components in `src/components/`
- **Pages**: Full page components in `src/pages/`
- **Lib**: Utility functions and Firebase integration in `src/lib/`
- **Theme**: Theme configuration in `src/theme/`

## 🚢 Deployment

### Firebase Hosting Setup

1. **Install Firebase CLI** (if not already installed):

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:

   ```bash
   firebase login
   ```

3. **Verify project**:
   ```bash
   firebase use
   ```
   Should show: `autotrader-5998a`

### Deploy to Production

**Option 1: Build and Deploy (Recommended)**

```bash
npm run deploy
```

**Option 2: Deploy Only**

```bash
npm run build
npm run deploy:hosting
```

**Option 3: Manual Deployment**

```bash
npm run build
firebase deploy --only hosting
```

### Custom Domain Setup

See Firebase Console for custom domain configuration:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow DNS configuration steps
4. Wait for SSL certificate provisioning (24-48 hours)

## 📁 Project Structure

### Key Directories

**`src/components/`**:

- `Stock.jsx`: Main candlestick chart with MA lines and trade markers
- `History.jsx`: Trade history table and statistics
- `Overview.jsx`: Strategy overview and details

**`src/pages/`**:

- `Home.jsx`: Main dashboard with tabs (Chart, History, Overview)
- `About.jsx`: About page with feature highlights

**`src/lib/`**:

- `firebase.js`: Firebase SDK initialization
- `position.js`: Functions to fetch position data, candles, trades
- `strategy.js`: Functions to fetch strategy details

**`src/theme/`**:

- `theme.jsx`: Theme provider and configuration (light/dark)

## 🧩 Components

### Stock Component

**Features**:

- Candlestick chart with volume bars
- 6 moving average lines (configurable periods)
- Trade entry/exit markers
- Interactive hover tooltips
- Zoom and pan controls
- Real-time data updates

**Props**:

```jsx
<Stock
  candleData={candleData} // Array of OHLC data
  historicalTrades={historicalTrades} // Trade history
  positionStats={positionStats} // Position statistics
  loading={loading} // Loading state
  strategyName={strategyName} // Strategy identifier
/>
```

### History Component

**Features**:

- Open positions display
- Closed trades table
- Cumulative P&L chart
- Trading statistics cards
- Profit/loss calculations

**Props**:

```jsx
<History
  historicalTrades={historicalTrades} // Trade history array
  initialBalance={initialBalance} // Starting balance
  loading={loading} // Loading state
  positionStats={positionStats} // Current position data
  candleData={candleData} // Current price data
/>
```

### Overview Component

**Features**:

- Strategy details and description
- Model architecture information
- Performance metrics
- Configuration parameters

**Props**:

```jsx
<Overview strategyName={strategyName} />
```

## 🔥 Firebase Integration

### Firestore Collections

**`positions/{strategy_name}`**:

- Real-time position data
- Candlestick data (15-minute intervals)
- Trade history
- Position statistics

**`strategies/{strategy_name}`**:

- Strategy configuration
- Model parameters
- Performance metrics

### Data Fetching

The app uses Firebase Firestore to fetch:

- **Candle Data**: `getCandleData(strategyName)`
- **Trade History**: `getHistoricalTrades(strategyName)`
- **Position Stats**: `getPositionStats(strategyName)`
- **Strategy Details**: `getStrategyDetails(strategyName)`

### Real-time Updates

- Data refreshes automatically every **1 minute**
- Uses React `useEffect` with `setInterval`
- Background updates don't show loading spinner
- Initial load shows loading state

## 🎨 Theme System

### Theme Configuration

The app uses a centralized theme system (`src/theme/theme.jsx`):

- **Light Mode**: Clean, bright interface
- **Dark Mode**: Dark background with high contrast
- **System Preference**: Automatically detects user preference
- **Persistent**: Saves theme choice to localStorage

### Theme Colors

All colors are defined in `themeConfig`:

- Surface colors (backgrounds)
- Text colors (primary, secondary, muted)
- Accent colors (blue, green, red, orange)
- Chart colors (candles, MA lines, trade markers)
- SVG colors (for tooltips and charts)

### Usage

```jsx
import { useTheme, themeConfig } from "../theme/theme";

const MyComponent = () => {
  const { theme, toggleTheme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <div className={colors.surface}>
      <p className={colors.text}>Hello</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file with Firebase configuration:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=autotrader-5998a
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### Firebase Configuration

**`firebase.json`**:

- Public directory: `dist`
- SPA routing: All routes redirect to `index.html`
- Cache headers: Optimized for static assets

**`.firebaserc`**:

- Project: `autotrader-5998a`

### Vite Configuration

**`vite.config.js`**:

- React plugin
- Tailwind CSS plugin
- Fast HMR (Hot Module Replacement)

## 📦 Dependencies

### Core Dependencies

- **React 19**: UI framework
- **React Router DOM**: Client-side routing
- **Firebase**: Backend integration
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Chart visualization (via react-chartjs-2)

### Development Dependencies

- **Vite**: Build tool and dev server
- **ESLint**: Code linting
- **TypeScript types**: Type definitions

## 🎯 Key Features Explained

### Real-time Data Polling

The app automatically refreshes data every 1 minute:

```jsx
useEffect(() => {
  const intervalId = setInterval(() => {
    loadPositionData(false); // Background refresh
  }, 60000); // 60 seconds

  return () => clearInterval(intervalId);
}, [selectedStrategy]);
```

### Moving Average Calculation

MA periods are dynamically fetched from Firebase:

- Extracts periods from `params1`, `params2`, `params3`
- Calculates MA values for each period
- Renders as colored lines on chart

### Trade Pairing Logic

History component pairs BUY/SELL trades:

- Identifies unpaired trades as open positions
- Calculates running P&L for open positions
- Displays closed trades with realized P&L

## 🐛 Troubleshooting

### Build Errors

**Issue**: Build fails with module not found

- **Solution**: Run `npm install` to ensure all dependencies are installed

**Issue**: Environment variables not working

- **Solution**: Ensure `.env` file exists and variables start with `VITE_`

### Deployment Issues

**Issue**: Firebase deployment fails

- **Solution**: Verify Firebase login: `firebase login`
- **Solution**: Check project: `firebase use`

**Issue**: Routing doesn't work after deployment

- **Solution**: Verify `firebase.json` has rewrite rule for SPA routing

### Runtime Issues

**Issue**: Data not loading

- **Solution**: Check Firebase configuration in `.env`
- **Solution**: Verify Firestore security rules allow read access
- **Solution**: Check browser console for errors

**Issue**: Theme not persisting

- **Solution**: Check localStorage is enabled in browser
- **Solution**: Verify theme provider wraps entire app

## 🔐 Security

- Environment variables for sensitive Firebase keys
- Firebase security rules restrict write access
- Client-side only reads from Firestore
- No API keys exposed in client code

## 📝 License

Private project - All rights reserved

---

**Last Updated**: December 2025  
**Version**: 0.0.1  
**Status**: Production
