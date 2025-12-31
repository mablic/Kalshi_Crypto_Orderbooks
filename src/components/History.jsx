import React, { useMemo } from 'react';
import { useTheme, themeConfig } from '../theme/theme';

const History = ({ historicalTrades = [], initialBalance = 100000, loading = false, positionStats = null, candleData = [] }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  // Pair trades (BUY followed by SELL = 1 complete trade)
  // Also identify unpaired trades as open positions
  const { pairedTrades, unpairedTrades } = useMemo(() => {
    if (!historicalTrades || !Array.isArray(historicalTrades) || historicalTrades.length === 0) {
      return { pairedTrades: [], unpairedTrades: [] };
    }
    
    const pairs = [];
    const unpaired = [];
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
          pairs.push({
            entryDate: entry.date,
            entryPrice: entry.price,
            exitDate: exit.date,
            exitPrice: exit.price,
            type: 'LONG',
            pnl: exit.realized_pnl || 0,
            status: 'CLOSED',
          });
          i += 2; // Skip both entry and exit
        } else {
          // Unpaired BUY - this is an open position
          unpaired.push({
            entryDate: entry.date,
            entryPrice: entry.price,
            entryTrade: entry,
            type: 'LONG',
          });
          i++;
        }
      } else if (entry.trade_position === 'SELL') {
        // Check if this is an unpaired SELL (shouldn't happen normally, but handle it)
        const prevEntry = historicalTrades[i - 1];
        if (!prevEntry || prevEntry.trade_position !== 'BUY') {
          unpaired.push({
            entryDate: entry.date,
            entryPrice: entry.price,
            entryTrade: entry,
            type: 'SHORT',
          });
        }
        i++;
      } else {
        i++;
      }
    }
    
    return { pairedTrades: pairs, unpairedTrades: unpaired };
  }, [historicalTrades]);

  // Get open positions from unpaired trades and current position stats
  const openPositions = useMemo(() => {
    const openTrades = [];
    
    // First, check if we have unpaired trades from history_trades
    if (unpairedTrades && unpairedTrades.length > 0) {
      const currentPrice = candleData && candleData.length > 0 
        ? candleData[candleData.length - 1]?.close 
        : null;
      const tradeSize = positionStats?.tradeSize || 100;
      
      unpairedTrades.forEach((unpaired) => {
        if (currentPrice && currentPrice > 0) {
          const pnl = unpaired.type === 'LONG' 
            ? (currentPrice - unpaired.entryPrice) * tradeSize
            : (unpaired.entryPrice - currentPrice) * tradeSize;
          
          openTrades.push({
            entryDate: unpaired.entryDate,
            entryPrice: unpaired.entryPrice,
            exitDate: null,
            exitPrice: currentPrice,
            type: unpaired.type,
            pnl: pnl,
            status: 'OPEN',
            currentPrice: currentPrice,
          });
        } else {
          // Fallback: use positionStats running_pnl if available
          const pnl = positionStats?.runningPnL || 0;
          openTrades.push({
            entryDate: unpaired.entryDate,
            entryPrice: unpaired.entryPrice,
            exitDate: null,
            exitPrice: unpaired.entryPrice, // Use entry price as fallback
            type: unpaired.type,
            pnl: pnl,
            status: 'OPEN',
            currentPrice: unpaired.entryPrice,
          });
        }
      });
    }
    
    // Also check positionStats for current position (backup method)
    if (openTrades.length === 0 && positionStats && candleData && Array.isArray(candleData) && candleData.length > 0) {
      const currentPosition = positionStats.currentPosition || 0;
      if (currentPosition !== 0) {
        const currentPrice = candleData[candleData.length - 1]?.close || 0;
        if (currentPrice > 0) {
          const tradeSize = positionStats.tradeSize || 100;
          
          // Find the most recent entry trade (BUY or SELL) that matches currentPosition
          for (let i = candleData.length - 1; i >= 0; i--) {
            const candle = candleData[i];
            if (!candle || !candle.date || !candle.close) continue;
            
            if (candle.trade_position === 'BUY' && currentPosition > 0) {
              const entryPrice = candle.close;
              const pnl = (currentPrice - entryPrice) * tradeSize;
              
              openTrades.push({
                entryDate: candle.date,
                entryPrice: entryPrice,
                exitDate: null,
                exitPrice: currentPrice,
                type: 'LONG',
                pnl: pnl,
                status: 'OPEN',
                currentPrice: currentPrice,
              });
              break;
            } else if (candle.trade_position === 'SELL' && currentPosition < 0) {
              const entryPrice = candle.close;
              const pnl = (entryPrice - currentPrice) * tradeSize;
              
              openTrades.push({
                entryDate: candle.date,
                entryPrice: entryPrice,
                exitDate: null,
                exitPrice: currentPrice,
                type: 'SHORT',
                pnl: pnl,
                status: 'OPEN',
                currentPrice: currentPrice,
              });
              break;
            }
          }
        }
      }
    }
    
    return openTrades;
  }, [unpairedTrades, positionStats, candleData]);

  // Calculate cumulative PnL progression
  const cumulativePnLProgression = useMemo(() => {
    try {
      const progression = [{ tradeNum: 0, cumulativePnL: 0, exitDate: new Date().toISOString() }];
      let runningPnL = 0;
      
      if (pairedTrades && Array.isArray(pairedTrades)) {
        pairedTrades.forEach((trade, index) => {
          if (trade && typeof trade.pnl === 'number') {
            runningPnL += trade.pnl;
            progression.push({
              tradeNum: index + 1,
              cumulativePnL: runningPnL,
              exitDate: trade.exitDate || new Date().toISOString(),
            });
          }
        });
      }
      
      return progression;
    } catch (error) {
      console.error('Error calculating cumulative PnL progression:', error);
      return [{ tradeNum: 0, cumulativePnL: 0, exitDate: new Date().toISOString() }];
    }
  }, [pairedTrades]);

  // Calculate trading statistics
  const statistics = useMemo(() => {
    if (!pairedTrades || pairedTrades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
      };
    }

    const totalTrades = pairedTrades.length;
    const winningTrades = pairedTrades.filter(t => t.pnl > 0).length;
    const losingTrades = pairedTrades.filter(t => t.pnl < 0).length;
    const totalPnL = pairedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;

    const winningPnLs = pairedTrades
      .filter(t => t.pnl > 0)
      .map(t => t.pnl);
    const losingPnLs = pairedTrades
      .filter(t => t.pnl < 0)
      .map(t => t.pnl);

    const avgWin = winningPnLs.length > 0
      ? (winningPnLs.reduce((sum, pnl) => sum + pnl, 0) / winningPnLs.length).toFixed(2)
      : 0;
    const avgLoss = losingPnLs.length > 0
      ? (losingPnLs.reduce((sum, pnl) => sum + pnl, 0) / losingPnLs.length).toFixed(2)
      : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      totalPnL: parseFloat(totalPnL).toFixed(2),
      winRate,
      avgWin,
      avgLoss,
    };
  }, [pairedTrades]);

  // Format currency
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  if (loading) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className={`text-center py-12 ${colors.textMuted}`}>
          Loading trade history...
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
      {/* Header */}
      <div className="mb-8">
        <h2 className={`text-3xl font-bold ${colors.text}`}>
          Trade History
        </h2>
        <p className={`text-sm ${colors.textMuted} mt-1`}>
          Complete record of all trading activity
        </p>
      </div>

      {/* Cumulative PnL Chart */}
      {pairedTrades.length > 0 && (
        <div className={`mb-8 ${colors.surfaceSecondary} rounded-xl p-4 pl-0 border ${colors.border}`}>
          <h3 className={`text-lg font-bold ${colors.text} mb-6 pl-8`}>Cumulative PnL</h3>

          <div className="flex gap-0">
            {/* Y-axis container */}
            <div className="w-16 flex flex-col justify-between pt-2 pb-12 text-xs text-right pr-2 pl-8">
              {(() => {
                const minPnL = Math.min(0, ...cumulativePnLProgression.map(p => p.cumulativePnL));
                const maxPnL = Math.max(...cumulativePnLProgression.map(p => p.cumulativePnL));
                const range = maxPnL - minPnL || 1;
                return [1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <span key={`y-label-${ratio}`} className={colors.textMuted}>
                    ${(minPnL + ratio * range).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                ));
              })()}
            </div>

            {/* Chart container */}
            <div className="flex-1">
              <svg viewBox="0 0 1000 280" className="w-full" style={{ height: '280px' }} preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = 260 - ratio * 260;
                  return (
                    <line
                      key={`grid-${ratio}`}
                      x1="0"
                      y1={y}
                      x2="1000"
                      y2={y}
                      stroke={colors.chart?.grid || '#e2e8f0'}
                      strokeWidth="1"
                      opacity="0.15"
                    />
                  );
                })}

                {/* Zero line */}
                {(() => {
                  const minPnL = Math.min(0, ...cumulativePnLProgression.map(p => p.cumulativePnL));
                  const maxPnL = Math.max(...cumulativePnLProgression.map(p => p.cumulativePnL));
                  const range = maxPnL - minPnL || 1;
                  const zeroY = 260 - ((0 - minPnL) / range) * 260;
                  return (
                    <line
                      x1="0"
                      y1={zeroY}
                      x2="1000"
                      y2={zeroY}
                      stroke="#64748b"
                      strokeWidth="1.5"
                      opacity="0.5"
                      strokeDasharray="5,5"
                    />
                  );
                })()}

                {/* Cumulative PnL line */}
                {cumulativePnLProgression.length > 1 && (
                  <polyline
                    points={cumulativePnLProgression.map((point, idx) => {
                      const minPnL = Math.min(0, ...cumulativePnLProgression.map(p => p.cumulativePnL));
                      const maxPnL = Math.max(...cumulativePnLProgression.map(p => p.cumulativePnL));
                      const range = maxPnL - minPnL || 1;
                      const divisor = cumulativePnLProgression.length - 1 || 1;
                      const x = (idx / divisor) * 1000;
                      const y = 260 - ((point.cumulativePnL - minPnL) / range) * 260;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={cumulativePnLProgression[cumulativePnLProgression.length - 1]?.cumulativePnL >= 0 ? '#10b981' : '#ef4444'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data point dots */}
                {cumulativePnLProgression.length > 0 && cumulativePnLProgression.map((point, idx) => {
                  const minPnL = Math.min(0, ...cumulativePnLProgression.map(p => p.cumulativePnL));
                  const maxPnL = Math.max(...cumulativePnLProgression.map(p => p.cumulativePnL));
                  const range = maxPnL - minPnL || 1;
                  const divisor = cumulativePnLProgression.length - 1 || 1;
                  const x = (idx / divisor) * 1000;
                  const y = 260 - ((point.cumulativePnL - minPnL) / range) * 260;

                  return (
                    <circle
                      key={`point-${idx}`}
                      cx={x}
                      cy={y}
                      r="5"
                      fill={point.cumulativePnL >= 0 ? '#10b981' : '#ef4444'}
                      opacity="0.9"
                      stroke="white"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* X-axis */}
                <line x1="0" y1="260" x2="1000" y2="260" stroke={colors.chart?.grid || '#e2e8f0'} strokeWidth="1.5" />
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between text-xs mt-3 px-2">
                {cumulativePnLProgression.map((point, idx) => {
                  if (idx % Math.ceil(cumulativePnLProgression.length / 6) !== 0 && idx !== cumulativePnLProgression.length - 1) return null;
                  
                  let dateStr = 'Start';
                  if (point.tradeNum > 0) {
                    const date = new Date(point.exitDate);
                    dateStr = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  }
                  
                  return (
                    <span key={`label-${idx}`} className={colors.textMuted}>
                      {dateStr}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Total Trades</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{statistics.totalTrades}</p>
        </div>
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Wins</p>
          <p className={`text-2xl font-bold ${colors.green600} ${colors.green400}`}>
            {statistics.winningTrades}
          </p>
        </div>
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Losses</p>
          <p className={`text-2xl font-bold ${colors.red600} ${colors.red400}`}>
            {statistics.losingTrades}
          </p>
        </div>
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Win Rate</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{statistics.winRate}%</p>
        </div>
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Avg Win</p>
          <p className={`text-lg font-bold ${colors.green600} ${colors.green400}`}>
            {formatCurrency(statistics.avgWin)}
          </p>
        </div>
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Avg Loss</p>
          <p className={`text-lg font-bold ${colors.red600} ${colors.red400}`}>
            {formatCurrency(statistics.avgLoss)}
          </p>
        </div>
        <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Total PnL</p>
          <p className={`text-2xl font-bold ${
            parseFloat(statistics.totalPnL) >= 0
              ? `${colors.green600} ${colors.green400}`
              : `${colors.red600} ${colors.red400}`
          }`}>
            {parseFloat(statistics.totalPnL) >= 0 ? '+' : ''}{formatCurrency(statistics.totalPnL)}
          </p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        {pairedTrades.length === 0 && openPositions.length === 0 ? (
          <div className={`text-center py-12 ${colors.textMuted}`}>
            No trades yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${colors.border}`}>
                <th className={`text-left py-3 px-4 font-semibold ${colors.textMuted}`}>Trade #</th>
                <th className={`text-left py-3 px-4 font-semibold ${colors.textMuted}`}>Type</th>
                <th className={`text-left py-3 px-4 font-semibold ${colors.textMuted}`}>Entry Date</th>
                <th className={`text-left py-3 px-4 font-semibold ${colors.textMuted}`}>Entry Price</th>
                <th className={`text-left py-3 px-4 font-semibold ${colors.textMuted}`}>Exit Date</th>
                <th className={`text-left py-3 px-4 font-semibold ${colors.textMuted}`}>Exit/Current Price</th>
                <th className={`text-right py-3 px-4 font-semibold ${colors.textMuted}`}>PnL</th>
                <th className={`text-right py-3 px-4 font-semibold ${colors.textMuted}`}>Return %</th>
                <th className={`text-center py-3 px-4 font-semibold ${colors.textMuted}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Open Positions First */}
              {openPositions.map((trade, index) => {
                const isProfit = trade.pnl > 0;
                const returnPercent = trade.entryPrice
                  ? (((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100).toFixed(2)
                  : 0;

                return (
                  <tr
                    key={`open-${index}`}
                    className={`border-b ${colors.border} hover:${colors.surfaceSecondary} transition ${colors.blueLight}`}
                  >
                    <td className={`py-3 px-4 font-medium ${colors.text}`}>OPEN #{index + 1}</td>
                    <td className={`py-3 px-4`}>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          trade.type === 'LONG'
                            ? `${colors.blueBadge} ${colors.blue700} ${colors.blue300}`
                            : `${colors.orangeBadge} ${colors.orange700} ${colors.orange300}`
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      {new Date(trade.entryDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      ${parseFloat(trade.entryPrice).toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 ${colors.textMuted}`}>
                      —
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      ${parseFloat(trade.currentPrice).toFixed(2)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        isProfit
                          ? `${colors.green600} ${colors.green400}`
                          : `${colors.red600} ${colors.red400}`
                      }`}
                    >
                      {isProfit ? '+' : ''}{formatCurrency(trade.pnl)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        parseFloat(returnPercent) >= 0
                          ? `${colors.green600} ${colors.green400}`
                          : `${colors.red600} ${colors.red400}`
                      }`}
                    >
                      {parseFloat(returnPercent) >= 0 ? '+' : ''}{returnPercent}%
                    </td>
                    <td className={`py-3 px-4 text-center`}>
                      <span
                        className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold ${colors.blueBadge} ${colors.blue600} ${colors.blue300}`}
                      >
                        OPEN
                      </span>
                    </td>
                  </tr>
                );
              })}
              
              {/* Closed Trades */}
              {pairedTrades.map((trade, index) => {
                const isProfit = trade.pnl > 0;
                const returnPercent = trade.entryPrice
                  ? (((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100).toFixed(2)
                  : 0;

                return (
                  <tr
                    key={`trade-${index}`}
                    className={`border-b ${colors.border} hover:${colors.surfaceSecondary} transition`}
                  >
                    <td className={`py-3 px-4 font-medium ${colors.text}`}>#{index + 1}</td>
                    <td className={`py-3 px-4`}>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          trade.type === 'LONG'
                            ? `${colors.blueBadge} ${colors.blue700} ${colors.blue300}`
                            : `${colors.orangeBadge} ${colors.orange700} ${colors.orange300}`
                        }`}
                      >
                        {trade.type}
                      </span>
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      {new Date(trade.entryDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      ${parseFloat(trade.entryPrice).toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      {new Date(trade.exitDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      ${parseFloat(trade.exitPrice).toFixed(2)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        isProfit
                          ? `${colors.green600} ${colors.green400}`
                          : `${colors.red600} ${colors.red400}`
                      }`}
                    >
                      {isProfit ? '+' : ''}{formatCurrency(trade.pnl)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        parseFloat(returnPercent) >= 0
                          ? `${colors.green600} ${colors.green400}`
                          : `${colors.red600} ${colors.red400}`
                      }`}
                    >
                      {parseFloat(returnPercent) >= 0 ? '+' : ''}{returnPercent}%
                    </td>
                    <td className={`py-3 px-4 text-center`}>
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isProfit
                            ? `${colors.greenBadge} ${colors.green600} ${colors.green400}`
                            : `${colors.redBadge} ${colors.red600} ${colors.red400}`
                        }`}
                      >
                        {isProfit ? '✓' : '✕'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      {pairedTrades.length > 0 && (
        <div className={`mt-8 pt-6 border-t ${colors.border}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Profit Factor</p>
              <p className={`text-2xl font-bold ${colors.text}`}>
                {statistics.losingTrades === 0
                  ? '∞ (Perfect)'
                  : (Math.abs(parseFloat(statistics.avgWin)) / Math.abs(parseFloat(statistics.avgLoss))).toFixed(2)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Largest Win</p>
              <p className={`text-2xl font-bold ${colors.green600} ${colors.green400}`}>
                {formatCurrency(
                  pairedTrades.filter(t => t.pnl > 0).length > 0
                    ? Math.max(...pairedTrades.filter(t => t.pnl > 0).map(t => t.pnl))
                    : 0
                )}
              </p>
            </div>
            <div>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Largest Loss</p>
              <p className={`text-2xl font-bold ${colors.red600} ${colors.red400}`}>
                {formatCurrency(
                  pairedTrades.filter(t => t.pnl < 0).length > 0
                    ? Math.min(...pairedTrades.filter(t => t.pnl < 0).map(t => t.pnl))
                    : 0
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;

