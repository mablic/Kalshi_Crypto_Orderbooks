import React, { useState, useEffect, useMemo } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { getStrategyDetails } from '../../lib/strategy';

const Overview = ({ strategyName = 'LSTM_Strategy_A', historicalTrades = [], positionStats = null }) => {
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
  }, [strategyName]);

  if (loading) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className={`text-center py-12 ${colors.textMuted}`}>
          Loading strategy details...
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
        {/* Performance Summary */}
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

        {/* Overview Section */}
        {strategy.overview && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Strategy Overview</h2>
            <p className={`${colors.textSecondary} leading-relaxed`}>
              {strategy.overview}
            </p>
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

