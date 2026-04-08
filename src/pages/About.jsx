import React from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { layoutPageShellClass } from '../theme/layout';

const About = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <div className={`min-h-screen ${colors.background}`}>
      <div className={`${layoutPageShellClass} py-12 md:py-16`}>
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold ${colors.text} mb-6 tracking-tight`}>
            Crypto Orderbooks
          </h1>
          <p className={`text-xl ${colors.textMuted} max-w-3xl mx-auto leading-relaxed`}>
            Snapshot history for Kalshi fifteen-minute crypto markets: minute index prices and full order-book
            ladders, with CSV export for backtesting and research.
          </p>
        </div>

        <div className={`${colors.surface} border ${colors.border} rounded-xl p-8 md:p-10 mb-12`}>
          <div className="flex items-center mb-6">
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mr-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold ${colors.text}`}>What this site does</h2>
          </div>
          <div className="space-y-4">
            <p className={`${colors.textMuted} leading-relaxed text-lg`}>
              Crypto Orderbooks connects to a datastore (Firestore) populated by a Kalshi-focused feed. Each snapshot
              records a point in time for a selected market: <strong className={colors.text}>open, high, low,
              close</strong> from the CF Benchmarks minute index when available, plus the serialized{' '}
              <strong className={colors.text}>order book</strong> (yes and no sides in dollars with contract
              sizes).
            </p>
            <p className={`${colors.textMuted} leading-relaxed`}>
              On the home view you can pick a series and ticker, read contract rules and strike context, inspect
              candles and depth side-by-side, and use <strong className={colors.text}>Download CSV</strong> to
              pull the loaded window of rows into a spreadsheet-friendly file. That file is meant for offline
              analysis, simulation, and backtesting—not for live execution on this site.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`${colors.surface} border ${colors.border} rounded-xl p-6 text-center`}>
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>Timed snapshots</h3>
            <p className={`text-sm ${colors.textMuted}`}>
              Recurring captures aligned with the feed so you can replay how prices and books evolved through a
              fifteen-minute window.
            </p>
          </div>
          <div className={`${colors.surface} border ${colors.border} rounded-xl p-6 text-center`}>
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h10M4 18h14"
                />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>Order-book depth</h3>
            <p className={`text-sm ${colors.textMuted}`}>
              Yes and no ladders (price in dollars, resting size) preserved per snapshot for ladder-level
              studies.
            </p>
          </div>
          <div className={`${colors.surface} border ${colors.border} rounded-xl p-6 text-center`}>
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>CSV for backtesting</h3>
            <p className={`text-sm ${colors.textMuted}`}>
              Export OHLC plus expanding yes/no columns so you can load the same history into notebooks,
              databases, or simulators.
            </p>
          </div>
        </div>

        <div className={`${colors.surface} border ${colors.border} rounded-xl p-8`}>
          <div className="flex items-start space-x-4">
            <div className="text-amber-500 flex-shrink-0 mt-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>Disclaimer</h3>
              <p className={`${colors.textMuted} leading-relaxed mb-3`}>
                Crypto Orderbooks does not execute trades and does not provide financial or investment advice. Data may
                be incomplete, delayed, or incorrect depending on sources and storage. Prediction markets carry
                risk; any modeling or backtesting you perform is your own responsibility.
              </p>
              <p className={`${colors.textMuted} leading-relaxed`}>
                Always verify critical fields against Kalshi and CF Benchmarks documentation. Consult qualified
                professionals before committing capital.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
