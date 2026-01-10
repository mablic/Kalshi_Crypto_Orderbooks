import React, { useMemo, useState } from 'react';
import { useTheme, themeConfig } from '../theme/theme';

const History = ({ historicalTrades = [], initialBalance = 100000, loading = false, positionStats = null, candleData = [] }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 20;


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
          // Calculate PnL manually to verify
          const entryPrice = parseFloat(entry.price) || 0;
          const exitPrice = parseFloat(exit.price) || 0;
          const tradeSize = positionStats?.tradeSize || 100;
          const calculatedPnL = (exitPrice - entryPrice) * tradeSize;
          const backendPnL = exit.realized_pnl || exit.realizedPnl || 0;
          
        pairs.push({
          entryDate: entry.date,
          entryPrice: entryPrice,
          exitDate: exit.date,
          exitPrice: exitPrice,
            type: 'LONG',
          // Use calculated PnL if backend PnL seems wrong, otherwise use backend
          pnl: Math.abs(calculatedPnL - backendPnL) > 10 ? calculatedPnL : backendPnL,
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
  }, [historicalTrades, positionStats]);

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

  // Combine all trades (open and closed) into a single sorted list
  const allTrades = useMemo(() => {
    const combined = [];
    
    // Add closed trades with CLOSED status
    if (pairedTrades && Array.isArray(pairedTrades)) {
      pairedTrades.forEach((trade) => {
        combined.push({
          ...trade,
          status: 'CLOSED',
        });
      });
    }
    
    // Add open positions with OPEN status
    if (openPositions && Array.isArray(openPositions)) {
      openPositions.forEach((trade) => {
        combined.push({
          ...trade,
          status: 'OPEN',
        });
      });
    }
    
    // Sort by entry date (most recent first)
    combined.sort((a, b) => {
      const dateA = new Date(a.entryDate).getTime();
      const dateB = new Date(b.entryDate).getTime();
      return dateB - dateA; // Most recent first
    });
    
    return combined;
  }, [pairedTrades, openPositions]);

  // Pagination calculations
  const totalPages = Math.ceil(allTrades.length / tradesPerPage);
  const startIndex = (currentPage - 1) * tradesPerPage;
  const endIndex = startIndex + tradesPerPage;
  const paginatedTrades = allTrades.slice(startIndex, endIndex);

  // Reset to page 1 when trades change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [allTrades.length]);

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

  // Format percentage with parentheses for negatives
  const formatPercent = (num) => {
    const value = parseFloat(num) || 0;
    const formatted = Math.abs(value).toFixed(2);
    return value < 0 ? `(${formatted}%)` : `${formatted}%`;
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
                // Add 15% buffer above max and below min for better visualization
                const buffer = Math.max(Math.abs(maxPnL - minPnL) * 0.15, 100);
                const adjustedMin = minPnL - buffer;
                const adjustedMax = maxPnL + buffer;
                const range = adjustedMax - adjustedMin || 1;
                return [1, 0.75, 0.5, 0.25, 0].map((ratio) => {
                  const value = adjustedMin + ratio * range;
                  const absValue = Math.abs(value);
                  const formatted = absValue.toLocaleString('en-US', { maximumFractionDigits: 0 });
                  return (
                    <span key={`y-label-${ratio}`} className={colors.textMuted}>
                      {value < 0 ? `($${formatted})` : `$${formatted}`}
                    </span>
                  );
                });
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
                  // Add 15% buffer above max and below min for better visualization
                  const buffer = Math.max(Math.abs(maxPnL - minPnL) * 0.15, 100);
                  const adjustedMin = minPnL - buffer;
                  const adjustedMax = maxPnL + buffer;
                  const range = adjustedMax - adjustedMin || 1;
                  const zeroY = 260 - ((0 - adjustedMin) / range) * 260;
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
                      // Add 15% buffer above max and below min for better visualization
                      const buffer = Math.max(Math.abs(maxPnL - minPnL) * 0.15, 100);
                      const adjustedMin = minPnL - buffer;
                      const adjustedMax = maxPnL + buffer;
                      const range = adjustedMax - adjustedMin || 1;
                      const divisor = cumulativePnLProgression.length - 1 || 1;
                      const x = (idx / divisor) * 1000;
                      const y = 260 - ((point.cumulativePnL - adjustedMin) / range) * 260;
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
                  // Add 15% buffer above max and below min for better visualization
                  const buffer = Math.max(Math.abs(maxPnL - minPnL) * 0.15, 100);
                  const adjustedMin = minPnL - buffer;
                  const adjustedMax = maxPnL + buffer;
                  const range = adjustedMax - adjustedMin || 1;
                  const divisor = cumulativePnLProgression.length - 1 || 1;
                  const x = (idx / divisor) * 1000;
                  const y = 260 - ((point.cumulativePnL - adjustedMin) / range) * 260;

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
          <p className={`text-sm sm:text-base font-bold break-words leading-tight ${
            parseFloat(statistics.totalPnL) >= 0
              ? `${colors.green600} ${colors.green400}`
              : `${colors.red600} ${colors.red400}`
          }`}>
            {formatCurrency(statistics.totalPnL)}
          </p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        {allTrades.length === 0 ? (
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
              {paginatedTrades.map((trade, index) => {
                const isProfit = trade.pnl > 0;
                const isOpen = trade.status === 'OPEN';
                const exitPrice = isOpen ? trade.currentPrice : trade.exitPrice;
                const returnPercent = trade.entryPrice
                  ? (((exitPrice - trade.entryPrice) / trade.entryPrice) * 100).toFixed(2)
                  : 0;
                // Calculate the actual trade number (accounting for pagination)
                const tradeNumber = allTrades.length - (startIndex + index);

                return (
                  <tr
                    key={`trade-${startIndex + index}`}
                    className={`border-b ${colors.border} hover:${colors.surfaceSecondary} transition ${
                      isOpen ? colors.blueLight : ''
                    }`}
                  >
                    <td className={`py-3 px-4 font-medium ${colors.text}`}>
                      #{tradeNumber}
                    </td>
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
                      {isOpen ? (
                        <span className={colors.textMuted}>—</span>
                      ) : (
                        new Date(trade.exitDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        })
                      )}
                    </td>
                    <td className={`py-3 px-4 ${colors.text}`}>
                      ${parseFloat(exitPrice).toFixed(2)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        isProfit
                          ? `${colors.green600} ${colors.green400}`
                          : `${colors.red600} ${colors.red400}`
                      }`}
                    >
                      {formatCurrency(trade.pnl)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        parseFloat(returnPercent) >= 0
                          ? `${colors.green600} ${colors.green400}`
                          : `${colors.red600} ${colors.red400}`
                      }`}
                    >
                      {formatPercent(returnPercent)}
                    </td>
                    <td className={`py-3 px-4 text-center`}>
                      {isOpen ? (
                        <span
                          className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold ${colors.blueBadge} ${colors.blue600} ${colors.blue300}`}
                        >
                          OPEN
                        </span>
                      ) : (
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isProfit
                            ? `${colors.greenBadge} ${colors.green600} ${colors.green400}`
                            : `${colors.redBadge} ${colors.red600} ${colors.red400}`
                        }`}
                      >
                        {isProfit ? '✓' : '✕'}
                      </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {allTrades.length > tradesPerPage && (
        <div className={`mt-6 flex items-center justify-between ${colors.surfaceSecondary} rounded-lg p-4 border ${colors.border}`}>
          <div className={`text-sm ${colors.textMuted}`}>
            Showing {startIndex + 1} to {Math.min(endIndex, allTrades.length)} of {allTrades.length} trades
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentPage === 1
                  ? `${colors.surfaceSecondary} ${colors.textMuted} cursor-not-allowed opacity-50`
                  : `${colors.surface} ${colors.text} border ${colors.border} hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400`
              }`}
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                      currentPage === pageNum
                        ? `bg-blue-500 text-white shadow-md`
                        : `${colors.surface} ${colors.text} border ${colors.border} hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400`
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentPage === totalPages
                  ? `${colors.surfaceSecondary} ${colors.textMuted} cursor-not-allowed opacity-50`
                  : `${colors.surface} ${colors.text} border ${colors.border} hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400`
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

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

