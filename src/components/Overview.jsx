import React, { useState, useEffect, useMemo } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { getStrategyDetails } from '../../lib/strategy';
import { kalshiOverviewCopy, getKalshiRestFieldRows } from '../../lib/kalshi';

const Overview = ({
  strategyName = 'LSTM_Strategy_A',
  historicalTrades = [],
  positionStats = null,
  kalshiMode = false,
  kalshiMarket = null,
  kalshiTickerLabel = '',
  kalshiSnapshotCount = 0,
}) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calculate total realized PnL from all closed trades (same as History.jsx)
  const totalRealizedPnL = useMemo(() => {
    if (!historicalTrades || historicalTrades.length === 0) return 0;
    
    // Pair trades (BUY followed by SELL = 1 complete trade)
    const pairs = [];
    let i = 0;
    
    while (i < historicalTrades.length) {
      const entry = historicalTrades[i];
      
      if (!entry || !entry.date || !entry.price) {
        i++;
        continue;
      }
      
      // Check if this is a BUY entry
      if (entry.trade_position === 'BUY') {
        // Look for the next SELL entry
        const exit = historicalTrades[i + 1];
        
        if (exit && exit.trade_position === 'SELL' && exit.date && exit.price) {
          // Found a complete pair
          // Calculate PnL manually to verify
          const entryPrice = parseFloat(entry.price) || 0;
          const exitPrice = parseFloat(exit.price) || 0;
          const tradeSize = positionStats?.tradeSize || 100;
          const calculatedPnL = (exitPrice - entryPrice) * tradeSize;
          const backendPnL = exit.realized_pnl || exit.realizedPnl || 0;
          
          // Use calculated PnL if backend PnL seems wrong, otherwise use backend
          pairs.push({
            pnl: Math.abs(calculatedPnL - backendPnL) > 10 ? calculatedPnL : backendPnL
          });
          i += 2; // Skip both entry and exit
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    
    // Sum all PnL from closed trades
    return pairs.reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [historicalTrades, positionStats]);

  // Format currency with parentheses for negatives
  const formatCurrency = (num) => {
    const value = num || 0;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    
    return value < 0 ? `(${formatted})` : formatted;
  };

  useEffect(() => {
    if (kalshiMode) {
      setStrategy({
        title: kalshiOverviewCopy.title,
        shortDescription: kalshiOverviewCopy.shortDescription,
        overview: kalshiOverviewCopy.overview,
        modelArchitecture: null,
        ensembleVoting: null,
        modelSelection: null,
        tradingFlow: null,
        advantages: null,
      });
      setLoading(false);
      return;
    }

    const loadStrategy = async () => {
      try {
        setLoading(true);
        const data = await getStrategyDetails(strategyName);
        setStrategy(data);
      } catch (error) {
        console.error('Error loading strategy:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStrategy();
  }, [strategyName, kalshiMode]);

  const kalshiRestRows = useMemo(
    () => (kalshiMode ? getKalshiRestFieldRows(kalshiMarket) : []),
    [kalshiMode, kalshiMarket]
  );

  if (loading) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className={`text-center py-12 ${colors.textMuted}`}>
          {kalshiMode ? 'Loading…' : 'Loading strategy details...'}
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className={`text-center py-12 ${colors.textMuted}`}>
          Strategy details not found
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-xl`}>
      {/* Header */}
      <div className={`${colors.accentBg} rounded-t-2xl p-8`}>
        <h1 className={`text-3xl font-bold mb-3 ${colors.accentText}`}>{strategy.title || strategyName}</h1>
        <p className={`text-lg ${colors.accentText} opacity-90`}>{strategy.shortDescription || 'Advanced Trading Strategy'}</p>
      </div>

      <div className="p-8">
        {/* Performance Summary — trading strategies only */}
        {!kalshiMode && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Performance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${colors.surfaceSecondary} rounded-lg p-6 border ${colors.border}`}>
                <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Total Realized PnL</p>
                <p className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? colors.green600 : colors.red600} ${totalRealizedPnL >= 0 ? colors.green400 : colors.red400}`}>
                  {formatCurrency(totalRealizedPnL)}
                </p>
              </div>
              <div className={`${colors.surfaceSecondary} rounded-lg p-6 border ${colors.border}`}>
                <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Running PnL</p>
                <p className={`text-2xl font-bold ${(positionStats?.runningPnL || 0) >= 0 ? colors.green600 : colors.red600} ${(positionStats?.runningPnL || 0) >= 0 ? colors.green400 : colors.red400}`}>
                  {formatCurrency(positionStats?.runningPnL || 0)}
                </p>
              </div>
              <div className={`${colors.surfaceSecondary} rounded-lg p-6 border ${colors.border}`}>
                <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Account Balance</p>
                <p className={`text-2xl font-bold ${colors.text}`}>
                  {formatCurrency((positionStats?.initialBalance || 100000) + totalRealizedPnL)}
                </p>
              </div>
            </div>
          </section>
        )}

        {kalshiMode && (
          <section className="mb-10">
            <h2 className={`text-xl font-bold ${colors.text} mb-4`}>Feed status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${colors.surfaceSecondary} rounded-xl p-6 border ${colors.border}`}>
                <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>
                  Selected market
                </p>
                <p className={`text-lg font-bold ${colors.text} break-all`}>
                  {kalshiTickerLabel || '—'}
                </p>
              </div>
              <div className={`${colors.surfaceSecondary} rounded-xl p-6 border ${colors.border}`}>
                <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>
                  Snapshots loaded
                </p>
                <p className={`text-2xl font-bold ${colors.text}`}>{kalshiSnapshotCount}</p>
              </div>
              <div className={`${colors.surfaceSecondary} rounded-xl p-6 border ${colors.border}`}>
                <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>
                  Series
                </p>
                <p className={`text-lg font-bold ${colors.text}`}>
                  {kalshiMarket && typeof kalshiMarket.series_ticker === 'string'
                    ? kalshiMarket.series_ticker
                    : '—'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Overview Section */}
        {strategy.overview && (
          <section className="mb-10">
            <h2 className={`text-xl font-bold ${colors.text} mb-4`}>
              {kalshiMode ? 'About this feed' : 'Strategy Overview'}
            </h2>
            <p className={`${colors.textSecondary} leading-relaxed`}>
              {strategy.overview}
            </p>
          </section>
        )}

        {kalshiMode && kalshiRestRows.length > 0 && (
          <section className="mb-10">
            <h2 className={`text-xl font-bold ${colors.text} mb-2`}>Rest of market fields</h2>
            <p className={`text-sm ${colors.textMuted} mb-4 max-w-3xl`}>
              Everything from Firestore except the four summary tiles on the home card. Times are
              shown in Eastern Time (ET).
            </p>
            <div
              className={`rounded-xl border ${colors.border} max-h-[min(560px,60vh)] overflow-y-auto ${colors.surfaceSecondary}`}
            >
              <table className="w-full text-sm">
                <thead className={`sticky top-0 z-10 ${colors.surface} border-b ${colors.border}`}>
                  <tr>
                    <th
                      className={`text-left py-3 px-4 font-semibold ${colors.textMuted} text-xs uppercase tracking-wider`}
                    >
                      Field
                    </th>
                    <th
                      className={`text-left py-3 px-4 font-semibold ${colors.textMuted} text-xs uppercase tracking-wider`}
                    >
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kalshiRestRows.map((row) => (
                    <tr
                      key={row.key}
                      className={`border-b ${colors.border} last:border-0 hover:bg-slate-100/60 dark:hover:bg-slate-800/40`}
                    >
                      <td className={`py-2.5 px-4 font-medium ${colors.text} align-top w-[40%]`}>
                        {row.label}
                      </td>
                      <td className={`py-2.5 px-4 ${colors.text} align-top break-words`}>
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Model Architecture Section */}
        {strategy.modelArchitecture && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Model Architecture</h2>
            <div className={`${colors.surfaceSecondary} rounded-lg p-6 mb-4 border ${colors.border}`}>
              <p className={`${colors.textSecondary} leading-relaxed mb-4`}>
                {strategy.modelArchitecture.description}
              </p>
              {strategy.modelArchitecture.components && (
                <div className="space-y-3">
                  {strategy.modelArchitecture.components.map((component, idx) => (
                    <div key={idx} className={`border-l-4 pl-4 py-2 ${colors.blueBorderAccent}`}>
                      <h4 className={`font-semibold ${colors.text}`}>{component.name}</h4>
                      <p className={`text-sm ${colors.textMuted}`}>{component.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Ensemble Voting Section */}
        {strategy.ensembleVoting && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Ensemble Voting Logic</h2>
            <div className={`${colors.surfaceSecondary} rounded-lg p-6 border ${colors.border}`}>
              <p className={`${colors.textSecondary} leading-relaxed`}>
                {strategy.ensembleVoting}
              </p>
            </div>
          </section>
        )}

        {/* Model Selection Section */}
        {strategy.modelSelection && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Model Selection & Optimization</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {strategy.modelSelection.steps && strategy.modelSelection.steps.map((step, idx) => (
                <div key={idx} className={`${colors.surfaceSecondary} rounded-lg p-4 border ${colors.border}`}>
                  <div className={`text-2xl font-bold ${colors.accent} mb-2`}>{idx + 1}</div>
                  <h4 className={`font-semibold ${colors.text} mb-2`}>{step.name}</h4>
                  <p className={`text-sm ${colors.textMuted}`}>{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trading Execution Flow */}
        {strategy.tradingFlow && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Trading Execution Flow</h2>
            <div className="space-y-3">
              {strategy.tradingFlow.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colors.accentText} font-bold text-sm ${colors.accentBg}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-grow">
                    <h4 className={`font-semibold ${colors.text}`}>{step.name}</h4>
                    <p className={`text-sm ${colors.textMuted}`}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Advantages */}
        {strategy.advantages && (
          <section>
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Key Advantages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategy.advantages.map((advantage, idx) => (
                <div key={idx} className={`${colors.surfaceSecondary} rounded-lg p-4 border-l-4 ${colors.blueBorderAccent} border ${colors.border}`}>
                  <h4 className={`font-semibold ${colors.text} mb-2`}>{advantage.title}</h4>
                  <p className={`text-sm ${colors.textMuted}`}>{advantage.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Overview;

