import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { getMAParams, calculateMovingAverage } from '../../lib/position';
import { getStrategyPeriod } from '../../lib/strategy';

const Stock = ({ candleData = [], historicalTrades = [], positionStats = null, loading = false, strategyName = '' }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const [animatingCandle, setAnimatingCandle] = useState(null);
  const svgRef = useRef(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  
  // Show only the most recent candles (last 60 candles for professional look)
  const MAX_CANDLES = 60;
  const displayedCandles = useMemo(() => {
    if (!candleData || candleData.length === 0) return [];
    return candleData.slice(-MAX_CANDLES);
  }, [candleData]);
  
  const [maPeriods, setMaPeriods] = useState([5, 10]);
  const [maValues, setMaValues] = useState({});
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [hoveredTrade, setHoveredTrade] = useState(null);
  const [tradingInterval, setTradingInterval] = useState('1'); // Default to 1 minute
  
  // Get MA colors from theme
  const maColors = colors.chart.maColors || [];

  // Extract trades from displayedCandles - handle edge cases
  const trades = useMemo(() => {
    if (displayedCandles.length === 0) return [];
    
    const tradeList = [];
    displayedCandles.forEach((candle, index) => {
      // Handle empty strings, whitespace, and normalize
      const tradePos = candle.trade_position?.trim().toUpperCase();
      if (tradePos === 'BUY' || tradePos === 'SELL') {
        tradeList.push({
          id: `trade-${index}-${candle.date}`,
          type: tradePos,
          index: index,
          price: candle.close,
          date: candle.date,
          candle: candle
        });
      }
    });
    
    return tradeList;
  }, [displayedCandles]);

  const minPrice = displayedCandles.length > 0 ? Math.min(...displayedCandles.map(d => d.low)) - 2 : 140;
  const maxPrice = displayedCandles.length > 0 ? Math.max(...displayedCandles.map(d => d.high)) + 2 : 200;
  const priceRange = maxPrice - minPrice;

  const chartHeight = 400;
  const padding = 40;
  
  // Calculate candle width dynamically
  const candleWidth = useMemo(() => {
    if (displayedCandles.length === 0) return 0;
    return 0.6;
  }, [displayedCandles.length]);
  
  // Chart width - dynamic, fills available space
  const chartWidth = useMemo(() => {
    if (displayedCandles.length === 0) return 100;
    const baseWidth = 600;
    const scaleFactor = Math.max(0.8, Math.min(1.5, displayedCandles.length / 60));
    return baseWidth * scaleFactor + padding * 2;
  }, [displayedCandles.length]);

  const getPriceY = (price) => {
    const normalized = (price - minPrice) / priceRange;
    return chartHeight - normalized * chartHeight + padding;
  };

  const getVolumeHeight = (volume) => {
    const maxVolume = displayedCandles.length > 0 ? Math.max(...displayedCandles.map(d => d.volume)) : 1000000;
    return (volume / maxVolume) * 60;
  };

  useEffect(() => {
    if (displayedCandles.length > 0) {
      setAnimatingCandle(displayedCandles.length - 1);
      const timer = setTimeout(() => setAnimatingCandle(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [displayedCandles]);

  // Measure SVG dimensions for accurate positioning
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const viewBox = svgRef.current.viewBox.baseVal;
        setSvgDimensions({ 
          width: rect.width, 
          height: rect.height,
          viewBoxWidth: viewBox.width,
          viewBoxHeight: viewBox.height
        });
      }
    };
    
    // Use requestAnimationFrame to ensure SVG is rendered
    const timeoutId = setTimeout(() => {
      updateDimensions();
    }, 0);
    
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [displayedCandles.length, chartWidth]);

  // Fetch MA parameters
  useEffect(() => {
    const fetchMAParams = async () => {
      if (strategyName) {
        const periods = await getMAParams(strategyName);
        setMaPeriods(periods);
      }
    };
    fetchMAParams();
  }, [strategyName]);

  // Fetch trading interval/period
  useEffect(() => {
    const fetchTradingInterval = async () => {
      if (strategyName) {
        const period = await getStrategyPeriod(strategyName);
        setTradingInterval(period);
      }
    };
    fetchTradingInterval();
  }, [strategyName]);

  // Calculate moving averages from FULL dataset, then slice for display
  useEffect(() => {
    if (candleData.length > 0 && maPeriods.length > 0) {
      const newMaValues = {};
      maPeriods.forEach(period => {
        // Calculate MA from full dataset (important: use full data for accurate MA)
        const fullMaValues = calculateMovingAverage(candleData, period);
        // Slice to match displayed candles (last MAX_CANDLES or all if less)
        const displayCount = Math.min(MAX_CANDLES, candleData.length);
        const startIndex = Math.max(0, candleData.length - displayCount);
        newMaValues[period] = fullMaValues.slice(startIndex);
      });
      setMaValues(newMaValues);
    }
  }, [candleData, maPeriods]);

  const currentPrice = displayedCandles.length > 0 ? displayedCandles[displayedCandles.length - 1].close : 0;
  const previousClose = displayedCandles.length > 1 ? displayedCandles[displayedCandles.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = previousClose !== 0 ? ((priceChange / previousClose) * 100).toFixed(2) : 0;
  const isPositive = priceChange >= 0;

  const highPrice = displayedCandles.length > 0 ? Math.max(...displayedCandles.map(d => d.high)) : 0;
  const lowPrice = displayedCandles.length > 0 ? Math.min(...displayedCandles.map(d => d.low)) : 0;
  const totalVolume = displayedCandles.length > 0 ? displayedCandles.reduce((sum, d) => sum + d.volume, 0) : 0;

  const formatNum = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  // Format currency with parentheses for negatives
  const formatCurrency = (num) => {
    const value = num || 0;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(value));
    
    return value < 0 ? `(${formatted})` : formatted;
  };

  // Format percentage with parentheses for negatives
  const formatPercent = (num) => {
    const value = parseFloat(num) || 0;
    const formatted = Math.abs(value).toFixed(2);
    return value < 0 ? `(${formatted}%)` : `${formatted}%`;
  };

  // Extract ticker from strategyName or use positionStats ticker
  const ticker = useMemo(() => {
    if (positionStats?.ticker) {
      return positionStats.ticker;
    }
    if (strategyName) {
      const parts = strategyName.split('_');
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart) && parts.length >= 3) {
          return parts[parts.length - 2];
        }
        return lastPart;
      }
    }
    return 'N/A';
  }, [strategyName, positionStats]);

  if (loading) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className="text-center">
          <p className={colors.textMuted}>Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (displayedCandles.length === 0) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className="text-center">
          <p className={colors.textMuted}>No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-3xl font-bold ${colors.text}`}>
              {ticker}
            </h2>
            <p className={`text-sm ${colors.textMuted} mt-1`}>
              {ticker !== 'N/A' ? `${ticker} Stock` : 'Stock'} | Last Update: Just now
            </p>
            <p className={`text-xs ${colors.textMuted} mt-2 italic`}>
              📊 This chart displays {tradingInterval}-minute price data. The model executes trading decisions every {tradingInterval} {parseInt(tradingInterval) === 1 ? 'minute' : 'minutes'}.
            </p>
          </div>
          <div className={`${isPositive ? colors.greenLight : colors.redLight} px-4 py-2 rounded-lg`}>
            <p className={`text-2xl font-bold ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
              ${currentPrice.toFixed(2)}
            </p>
            <p className={`text-sm ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
              {formatCurrency(priceChange)} ({formatPercent(priceChangePercent)})
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-6">
        <div className={`text-sm font-semibold ${colors.textMuted}`}>
          📊 Showing most recent {displayedCandles.length} candles ({tradingInterval}-minute {parseInt(tradingInterval) === 1 ? 'interval' : 'intervals'})
        </div>
      </div>

      {/* Candlestick Chart with Volume - Single unified chart */}
      <div className={`mb-8 ${colors.surface} rounded-xl p-6 border ${colors.border}`}>
        <div className="flex gap-4">
          {/* Y-axis labels and titles */}
          <div className="flex flex-col gap-0 flex-shrink-0">
            <div className="flex flex-col">
              <div className={`text-xs font-bold ${colors.text} mb-2`}>Price (USD)</div>
              <div className="flex flex-col justify-between" style={{ height: chartHeight + padding }}>
                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <div key={`price-label-${ratio}`} className={`text-xs ${colors.textMuted} text-right pr-2 w-16`}>
                    ${(minPrice + (maxPrice - minPrice) * ratio).toFixed(0)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <div className={`text-xs font-bold ${colors.text} mb-2`}>Volume</div>
              <div className="flex flex-col justify-between" style={{ height: '80px' }}>
                {displayedCandles.length > 0 && (() => {
                  const maxVolume = Math.max(...displayedCandles.map(d => d.volume));
                  const formatVol = (num) => {
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
                    return num.toFixed(0);
                  };
                  return [1, 0.5, 0].map((ratio) => (
                    <div key={`volume-label-${ratio}`} className={`text-xs ${colors.textMuted} text-right pr-2 w-16`}>
                      {formatVol(maxVolume * ratio)}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Main chart area */}
          <div className="flex-1 flex flex-col gap-2 min-w-0 relative">
            {/* MA Legend - Outside SVG for better positioning */}
            {maPeriods.length > 0 && (
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                <div className={`${colors.surface} border ${colors.border} rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm`}>
                  <div className={`text-xs font-semibold ${colors.text} mb-1.5`}>Moving Averages</div>
                  <div className="flex flex-col gap-1.5">
                    {maPeriods.map((period, periodIndex) => {
                      const maData = maValues[period];
                      if (!maData || maData.length === 0) return null;
                      
                      const lastValidIndex = maData.length - 1;
                      const lastValidValue = maData[lastValidIndex];
                      if (lastValidValue === null) return null;
                      
                      const color = maColors[periodIndex % maColors.length];
                      return (
                        <div key={`ma-legend-${period}`} className="flex items-center gap-2">
                          <svg width="32" height="4" className="flex-shrink-0">
                            <line
                              x1="0"
                              y1="2"
                              x2="32"
                              y2="2"
                              stroke={color}
                              strokeWidth="2"
                              strokeDasharray="4,2"
                            />
                          </svg>
                          <span className={`text-xs font-medium whitespace-nowrap`} style={{ color }}>
                            MA{period}
                          </span>
                          <span className={`text-xs ${colors.textMuted} whitespace-nowrap`}>
                            ${lastValidValue.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <svg
              ref={svgRef}
              width="100%"
              height={chartHeight + padding}
              viewBox={`0 0 ${chartWidth * 10} ${chartHeight + padding}`}
              preserveAspectRatio="none"
              style={{ display: 'block' }}
            >
              {/* Grid lines - Subtle professional styling */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - ratio * chartHeight + padding;
                return (
                  <line
                    key={`grid-${ratio}`}
                    x1={padding}
                    y1={y}
                    x2={padding + chartWidth * 10}
                    y2={y}
                    stroke={colors.chart.grid}
                    strokeWidth="0.5"
                    opacity="0.2"
                    strokeDasharray="2,2"
                  />
                );
              })}

              {/* Candlesticks - Professional styling */}
              {displayedCandles.map((candle, index) => {
                const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
                const xCenter = padding + (index + 0.5) * candleSpacing;
                const barWidth = Math.max(2, candleSpacing * 0.5);
                const bodyTop = Math.min(getPriceY(candle.open), getPriceY(candle.close));
                const bodyBottom = Math.max(getPriceY(candle.open), getPriceY(candle.close));
                const wickTop = getPriceY(candle.high);
                const wickBottom = getPriceY(candle.low);
                const isGreen = candle.close >= candle.open;
                const bodyColor = isGreen ? colors.chart.candleGreen : colors.chart.candleRed;
                const wickColor = isGreen ? colors.chart.candleGreen : colors.chart.candleRed;
                const isHovered = hoveredCandle?.index === index;
                const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

                return (
                  <g
                    key={`candle-${index}`}
                    className={animatingCandle === index ? 'animate-pulse' : ''}
                    opacity={animatingCandle === index ? 0.8 : isHovered ? 0.7 : 1}
                    onMouseEnter={() => {
                      setHoveredCandle({ index, x: xCenter, y: getPriceY(candle.close), candle });
                      setHoveredTrade(null);
                    }}
                    onMouseLeave={() => setHoveredCandle(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Wick */}
                    <line
                      x1={xCenter}
                      y1={wickTop}
                      x2={xCenter}
                      y2={wickBottom}
                      stroke={wickColor}
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      opacity="0.9"
                    />
                    {/* Body - filled for down candles, outlined for up candles (professional style) */}
                    {isGreen ? (
                      <rect
                        x={xCenter - barWidth / 2}
                        y={bodyTop}
                        width={barWidth}
                        height={bodyHeight}
                        fill={bodyColor}
                        stroke={bodyColor}
                        strokeWidth="0.5"
                        opacity="1"
                      />
                    ) : (
                      <rect
                        x={xCenter - barWidth / 2}
                        y={bodyTop}
                        width={barWidth}
                        height={bodyHeight}
                        fill="none"
                        stroke={bodyColor}
                        strokeWidth={isHovered ? "2" : "1.5"}
                        opacity="1"
                      />
                    )}
                  </g>
                );
              })}

              {/* Moving Average Lines - Professional styling */}
              {maPeriods.map((period, periodIndex) => {
                const maData = maValues[period];
                if (!maData || maData.length === 0) return null;
                
                const points = [];
                const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
                maData.forEach((maValue, index) => {
                  if (maValue !== null) {
                    const x = padding + (index + 0.5) * candleSpacing;
                    const y = getPriceY(maValue);
                    points.push(`${x},${y}`);
                  }
                });
                
                if (points.length > 1) {
                  const color = maColors[periodIndex % maColors.length];
                  return (
                    <polyline
                      key={`ma${period}-line`}
                      points={points.join(' ')}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      opacity="0.85"
                      strokeDasharray="5,3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }
                return null;
              })}

              {/* Simple BUY/SELL indicators - dots and arrows in SVG */}
              {trades.map((trade, tradeIndex) => {
                const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
                const xCenter = padding + (trade.index + 0.5) * candleSpacing;
                const candle = trade.candle || displayedCandles[trade.index];
                const y = getPriceY(trade.price);
                
                const isBuy = trade.type === 'BUY';
                const markerColor = isBuy ? colors.chart.entryLong : colors.chart.entryShort;
                
                // Arrow endpoint (where text will be) - match HTML text position
                const arrowEndY = isBuy ? getPriceY(candle.high) - 30 : getPriceY(candle.low) + 30;

                return (
                  <g key={`trade-${trade.id}`} style={{ pointerEvents: 'none' }}>
                    {/* Arrow pointing from text to candlestick price */}
                    <line
                      x1={xCenter}
                      y1={arrowEndY}
                      x2={xCenter}
                      y2={y}
                      stroke={markerColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    {/* Arrow head - points to the price dot */}
                    {isBuy ? (
                      // BUY: arrow goes down from text (above) to price (below)
                      <polygon
                        points={`${xCenter},${y - 8} ${xCenter - 5},${y} ${xCenter + 5},${y}`}
                        fill={markerColor}
                        opacity="0.7"
                      />
                    ) : (
                      // SELL: arrow goes up from text (below) to price (above)
                      <polygon
                        points={`${xCenter},${y + 8} ${xCenter - 5},${y} ${xCenter + 5},${y}`}
                        fill={markerColor}
                        opacity="0.7"
                      />
                    )}
                    {/* Simple dot on price */}
                    <circle
                      cx={xCenter}
                      cy={y}
                      r="4"
                      fill={markerColor}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}


              {/* X-axis line */}
              <line
                x1={padding}
                y1={chartHeight + padding}
                x2={padding + chartWidth * 10}
                y2={chartHeight + padding}
                stroke={colors.chart.grid}
                strokeWidth="1"
              />
              <line
                x1={padding}
                y1={padding}
                x2={padding}
                y2={chartHeight + padding}
                stroke={colors.chart.grid}
                strokeWidth="1"
              />
            </svg>

            {/* BUY/SELL text labels - HTML to avoid stretching */}
            {trades.map((trade) => {
              const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
              const xCenter = padding + (trade.index + 0.5) * candleSpacing;
              const candle = trade.candle || displayedCandles[trade.index];
              
              const isBuy = trade.type === 'BUY';
              const markerColor = isBuy ? colors.chart.entryLong : colors.chart.entryShort;
              
              // Y position - arrow end point (must match SVG arrow calculation)
              const arrowEndY = isBuy ? getPriceY(candle.high) - 50 : getPriceY(candle.low) + 50;
              
              // Calculate position using actual SVG dimensions
              const svgViewBoxWidth = svgDimensions.viewBoxWidth || chartWidth * 10;
              const svgViewBoxHeight = svgDimensions.viewBoxHeight || (chartHeight + padding);
              const actualSvgWidth = svgDimensions.width || svgViewBoxWidth;
              const actualSvgHeight = svgDimensions.height || svgViewBoxHeight;
              
              // Convert viewBox coordinates to actual pixel positions
              // With preserveAspectRatio="none", coordinates scale linearly
              const scaleX = actualSvgWidth / svgViewBoxWidth;
              const scaleY = actualSvgHeight / svgViewBoxHeight;
              
              // Get SVG's position relative to parent
              const svgRect = svgRef.current?.getBoundingClientRect();
              const parentRect = svgRef.current?.parentElement?.getBoundingClientRect();
              const svgOffsetX = svgRect && parentRect ? svgRect.left - parentRect.left : 0;
              const svgOffsetY = svgRect && parentRect ? svgRect.top - parentRect.top : 0;
              
              // Calculate absolute pixel position
              const xPixel = (xCenter * scaleX) + svgOffsetX;
              const yPixel = (arrowEndY * scaleY) + svgOffsetY;
              
              // Convert to percentage of parent container
              const parentWidth = parentRect?.width || actualSvgWidth;
              const parentHeight = parentRect?.height || actualSvgHeight;
              const xPercent = (xPixel / parentWidth) * 100;
              const yPercent = (yPixel / parentHeight) * 100;

              return (
                <div
                  key={`trade-label-${trade.id}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    color: markerColor,
                    fontSize: '20px',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  {trade.type}
                </div>
              );
            })}

            {/* Tooltip for hovered candle */}
            {hoveredCandle && (
              <div 
                className="absolute z-20 pointer-events-none"
                style={{
                  left: `${(hoveredCandle.x / (chartWidth * 10)) * 100}%`,
                  top: '0px',
                  transform: 'translate(-50%, 0)',
                }}
              >
                <div className={`${colors.surface} border ${colors.border} rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm`}>
                  <div className={`text-xs font-semibold ${colors.text} mb-1`}>
                    {new Date(hoveredCandle.candle.date).toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Open:</span>
                      <span className={`text-xs font-medium ${colors.text}`}>${hoveredCandle.candle.open.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>High:</span>
                      <span className={`text-xs font-medium ${colors.text}`}>${hoveredCandle.candle.high.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Low:</span>
                      <span className={`text-xs font-medium ${colors.text}`}>${hoveredCandle.candle.low.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Close:</span>
                      <span className={`text-xs font-medium ${colors.text}`}>${hoveredCandle.candle.close.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Volume:</span>
                      <span className={`text-xs font-medium ${colors.text}`}>{formatNum(hoveredCandle.candle.volume)}</span>
                    </div>
                    {hoveredCandle.candle.trade_position && (
                      <div className="flex justify-between gap-3 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className={`text-xs ${colors.textMuted}`}>Signal:</span>
                        <span 
                          className={`text-xs font-bold`}
                          style={{ 
                            color: hoveredCandle.candle.trade_position === 'BUY' 
                              ? colors.chart.entryLong 
                              : colors.chart.entryShort 
                          }}
                        >
                          {hoveredCandle.candle.trade_position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Separator line */}
            <div className={`h-px border-t ${colors.border}`} />

            {/* Volume Chart */}
            <svg
              width="100%"
              height="80"
              viewBox={`0 0 ${chartWidth * 10} 80`}
              preserveAspectRatio="none"
              style={{ display: 'block' }}
            >
              {displayedCandles.map((candle, index) => {
                const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
                const xCenter = padding + (index + 0.5) * candleSpacing;
                const barWidth = candleSpacing * 0.7;
                const maxVolume = Math.max(...displayedCandles.map(d => d.volume));
                const volumeHeight = (candle.volume / maxVolume) * 50;
                const volumeY = 50 - volumeHeight;
                const isGreen = candle.close >= candle.open;

                return (
                  <rect
                    key={`volume-${index}`}
                    x={xCenter - barWidth / 2}
                    y={volumeY}
                    width={barWidth}
                    height={volumeHeight}
                    fill={isGreen ? colors.chart.candleGreen : colors.chart.candleRed}
                    opacity="0.4"
                  />
                );
              })}
            </svg>

            {/* Time axis - Rotated labels */}
            <div className="flex flex-col gap-1 mt-2">
              <div className="relative" style={{ height: '60px', paddingLeft: padding, paddingRight: padding }}>
                {displayedCandles.length > 0 && (() => {
                  const containerWidth = chartWidth * 10 - padding * 2;
                  const minLabelWidth = 80;
                  const maxLabels = Math.floor(containerWidth / minLabelWidth);
                  const labelInterval = Math.max(1, Math.ceil(displayedCandles.length / Math.min(maxLabels, 12)));
                  
                  return displayedCandles.map((candle, index) => {
                    const showLabel = index % labelInterval === 0 || index === displayedCandles.length - 1;
                    if (!showLabel) return null;
                    
                    const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
                    const xPosition = padding + (index + 0.5) * candleSpacing;
                    const xPercent = (xPosition / (chartWidth * 10)) * 100;
                    
                    const dateObj = new Date(candle.date);
                    const formatted = dateObj.toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });
                    
                    return (
                      <span
                        key={`time-${index}`}
                        className={`text-xs ${colors.textMuted} absolute`}
                        style={{
                          left: `${xPercent}%`,
                          transform: 'translateX(-50%) rotate(-45deg)',
                          transformOrigin: 'center',
                          whiteSpace: 'nowrap',
                          paddingTop: '5px'
                        }}
                      >
                        {formatted}
                      </span>
                    );
                  });
                })()}
              </div>
              <div className={`text-xs font-bold ${colors.text} text-center`}>
                Time (CST)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Stats */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>High</p>
          <p className={`text-lg font-bold ${colors.text}`}>${highPrice.toFixed(2)}</p>
        </div>
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>Low</p>
          <p className={`text-lg font-bold ${colors.text}`}>${lowPrice.toFixed(2)}</p>
        </div>
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>Volume</p>
          <p className={`text-lg font-bold ${colors.text}`}>{formatNum(totalVolume)}</p>
        </div>
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>Change</p>
          <p className={`text-lg font-bold ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
            {formatPercent(priceChangePercent)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Stock;
