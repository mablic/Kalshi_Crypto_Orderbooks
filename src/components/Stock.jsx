import React, { useMemo, useState, useEffect } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { getMAParams, calculateMovingAverage } from '../../lib/position';

const Stock = ({ candleData = [], historicalTrades = [], positionStats = null, loading = false, strategyName = '' }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const [animatingCandle, setAnimatingCandle] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [maPeriods, setMaPeriods] = useState([5, 10]);
  const [maValues, setMaValues] = useState({}); // { 5: [...], 10: [...], etc. }
  const [hoveredCandle, setHoveredCandle] = useState(null); // { index, x, y, candle, isVolume: boolean }
  const [hoveredTrade, setHoveredTrade] = useState(null); // { trade, type: 'entry' | 'exit', x, y }
  const chartContainerRef = React.useRef(null);
  
  // Get MA colors from theme
  const maColors = colors.chart.maColors || [];

  // Get trades from candleData
  const mockTrades = useMemo(() => {
    if (candleData.length === 0) return [];
    
    return candleData
      .map((candle, index) => ({
        id: index,
        type: candle.trade_position === 'BUY' ? 'LONG' : candle.trade_position === 'SELL' ? 'SHORT' : null,
        entryIndex: index,
        entryPrice: candle.open,
        exitIndex: null,
        exitPrice: candleData[candleData.length - 1].close,
        shares: 100,
        status: 'OPEN',
        pnl: (candleData[candleData.length - 1].close - candle.open) * 100,
        pnlPercent: (((candleData[candleData.length - 1].close - candle.open) / candle.open) * 100),
      }))
      .filter(t => t.type !== null);
  }, [candleData]);

  // Mock AI trading signals
  const aiSignals = [
    { type: 'BUY', confidence: 0.92, reason: 'Bullish divergence detected', time: '22:30' },
    { type: 'HOLD', confidence: 0.78, reason: 'Consolidation pattern forming', time: '22:00' },
  ];
  const minPrice = candleData.length > 0 ? Math.min(...candleData.map(d => d.low)) - 2 : 140;
  const maxPrice = candleData.length > 0 ? Math.max(...candleData.map(d => d.high)) + 2 : 200;
  const priceRange = maxPrice - minPrice;

  const chartHeight = 400;
  const chartWidth = 100;
  const candleWidth = candleData.length > 0 ? (chartWidth - 10) / candleData.length : 3;
  const padding = 10;

  const getPriceY = (price) => {
    const normalized = (price - minPrice) / priceRange;
    return chartHeight - normalized * chartHeight + padding;
  };

  const getVolumeHeight = (volume) => {
    const maxVolume = candleData.length > 0 ? Math.max(...candleData.map(d => d.volume)) : 1000000;
    return (volume / maxVolume) * 60;
  };

  useEffect(() => {
    if (candleData.length > 0) {
      setAnimatingCandle(candleData.length - 1);
      const timer = setTimeout(() => setAnimatingCandle(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [candleData]);

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

  // Calculate moving averages when candleData or maPeriods change
  useEffect(() => {
    if (candleData.length > 0 && maPeriods.length > 0) {
      const newMaValues = {};
      maPeriods.forEach(period => {
        newMaValues[period] = calculateMovingAverage(candleData, period);
      });
      setMaValues(newMaValues);
    }
  }, [candleData, maPeriods]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !chartContainerRef.current) return;
    const diff = e.clientX - dragStart;
    const container = chartContainerRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    let newPosition = scrollPosition - diff;
    newPosition = Math.max(0, Math.min(newPosition, maxScroll));
    container.scrollLeft = newPosition;
    setScrollPosition(newPosition);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, scrollPosition]);

  const currentPrice = candleData.length > 0 ? candleData[candleData.length - 1].close : 0;
  const previousClose = candleData.length > 1 ? candleData[candleData.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousClose;
  const priceChangePercent = previousClose !== 0 ? ((priceChange / previousClose) * 100).toFixed(2) : 0;
  const isPositive = priceChange >= 0;

  // Get high, low, and volume from candle data
  const highPrice = candleData.length > 0 ? Math.max(...candleData.map(d => d.high)) : 0;
  const lowPrice = candleData.length > 0 ? Math.min(...candleData.map(d => d.low)) : 0;
  const totalVolume = candleData.length > 0 ? candleData.reduce((sum, d) => sum + d.volume, 0) : 0;

  // Format number helper
  const formatNum = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  // Format currency
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  return (
    <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-3xl font-bold ${colors.text}`}>
              AAPL
            </h2>
            <p className={`text-sm ${colors.textMuted} mt-1`}>
              Apple Inc. | Last Update: Just now
            </p>
            <p className={`text-xs ${colors.textMuted} mt-2 italic`}>
              📊 This chart displays 15-minute price data. The model executes trading decisions every 15 minutes.
            </p>
          </div>
          <div className={`${isPositive ? colors.greenLight : colors.redLight} px-4 py-2 rounded-lg`}>
            <p className={`text-2xl font-bold ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
              ${currentPrice.toFixed(2)}
            </p>
            <p className={`text-sm ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent}%)
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {/* Chart Controls */}
          <div className="mb-6 flex items-center justify-between">
            <div className={`text-sm font-semibold ${colors.textMuted}`}>
              📊 Drag to pan • Scroll to zoom • Use controls below
            </div>
            <div className={`flex items-center gap-3 ${colors.surfaceSecondary} rounded-lg p-2`}>
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                className={`p-2 rounded transition ${colors.surface} border ${colors.border} hover:${colors.surfaceSecondary} ${colors.text}`}
                title="Zoom Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <div className={`text-sm font-bold ${colors.text} w-12 text-center`}>
                {(zoomLevel * 100).toFixed(0)}%
              </div>
              <button
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                className={`p-2 rounded transition ${colors.surface} border ${colors.border} hover:${colors.surfaceSecondary} ${colors.text}`}
                title="Zoom In"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
              <div className={`w-px h-6 ${colors.border}`} />
              <button
                onClick={() => setZoomLevel(1)}
                className={`px-3 py-2 rounded text-xs font-semibold transition ${colors.surface} border ${colors.border} hover:${colors.surfaceSecondary} ${colors.text}`}
                title="Reset View"
              >
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Candlestick Chart with Volume */}
          <div
            ref={chartContainerRef}
            className={`mb-8 ${colors.surface} rounded-xl p-6 border ${colors.border} overflow-x-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            style={{ userSelect: isDragging ? 'none' : 'auto' }}
          >
            {/* Price and Volume together */}
            <div className="flex gap-4">
              {/* Y-axis labels and titles */}
              <div className="flex flex-col gap-0">
                {/* Price section with label */}
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
                {/* Volume section with label */}
                <div className="flex flex-col">
                  <div className={`text-xs font-bold ${colors.text} mb-2`}>Volume</div>
                  <div className="flex flex-col justify-between" style={{ height: '80px' }}>
                    {candleData.length > 0 && (() => {
                      const maxVolume = Math.max(...candleData.map(d => d.volume));
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
              <div className="flex-1 flex flex-col gap-2">
                <svg
                  width={`${100 * zoomLevel}%`}
                  height={chartHeight + padding}
                  viewBox={`0 0 1200 ${chartHeight + padding}`}
                  className="min-w-max"
                  preserveAspectRatio="none"
                  style={{ minWidth: `${100 * zoomLevel}%` }}
                >
              {/* Vertical hover line indicator */}
              {hoveredCandle && (
                <line
                  x1={hoveredCandle.x}
                  y1={padding}
                  x2={hoveredCandle.x}
                  y2={chartHeight + padding}
                  stroke={colors.chart.primary}
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  opacity="0.6"
                  pointerEvents="none"
                />
              )}
              {hoveredTrade && (
                <line
                  x1={hoveredTrade.x}
                  y1={padding}
                  x2={hoveredTrade.x}
                  y2={chartHeight + padding}
                  stroke={hoveredTrade.type === 'entry' 
                    ? (hoveredTrade.trade.type === 'LONG' ? colors.chart.entryLong : colors.chart.entryShort)
                    : (hoveredTrade.trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss)}
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  opacity="0.6"
                  pointerEvents="none"
                />
              )}

              {/* Grid lines */}
              {candleData.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - ratio * chartHeight + padding;
                return (
                  <line
                    key={`grid-${ratio}`}
                    x1={padding}
                    y1={y}
                    x2={padding + chartWidth * 10}
                    y2={y}
                    stroke={colors.chart.grid}
                    strokeWidth="1"
                    opacity="0.15"
                  />
                );
              })}


              {/* Candlesticks */}
              {candleData.length > 0 && candleData.map((candle, index) => {
                const xCenter = padding + (index + 0.5) * candleWidth * 10;
                const bodyTop = Math.min(getPriceY(candle.open), getPriceY(candle.close));
                const bodyBottom = Math.max(getPriceY(candle.open), getPriceY(candle.close));
                const wickTop = getPriceY(candle.high);
                const wickBottom = getPriceY(candle.low);

                const isGreen = candle.close >= candle.open;
                const bodyColor = isGreen ? colors.chart.candleGreen : colors.chart.candleRed;
                const wickColor = isGreen ? colors.chart.candleGreen : colors.chart.candleRed;
                const isHovered = hoveredCandle?.index === index;
                const isTradeHovered = hoveredTrade && (
                  (hoveredTrade.trade.entryIndex === index) || 
                  (hoveredTrade.trade.exitIndex === index)
                );

                return (
                  <g
                    key={`candle-${index}`}
                    className={animatingCandle === index ? 'animate-pulse' : ''}
                    opacity={animatingCandle === index ? 0.8 : isHovered ? 0.7 : 1}
                    onMouseEnter={() => {
                      const xCenter = padding + (index + 0.5) * candleWidth * 10;
                      setHoveredCandle({
                        index,
                        x: xCenter,
                        y: getPriceY(candle.close),
                        candle
                      });
                      setHoveredTrade(null); // Clear trade hover when hovering candle
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
                      strokeWidth={isHovered || isTradeHovered ? "3" : "2"}
                      opacity={isHovered || isTradeHovered ? "1" : "0.8"}
                    />
                    {/* Body */}
                    <rect
                      x={xCenter - candleWidth * 10 * 0.35}
                      y={bodyTop}
                      width={candleWidth * 10 * 0.7}
                      height={Math.max(bodyBottom - bodyTop, 2)}
                      fill={bodyColor}
                      stroke={bodyColor}
                      strokeWidth={isHovered || isTradeHovered ? "2.5" : "1.5"}
                      opacity={isHovered || isTradeHovered ? "1" : "0.9"}
                    />
                  </g>
                );
              })}

              {/* Moving Average Lines - Render all MA lines dynamically */}
              {maPeriods.map((period, periodIndex) => {
                const maData = maValues[period];
                if (!maData || maData.length === 0) return null;
                
                const points = [];
                maData.forEach((maValue, index) => {
                  if (maValue !== null) {
                    const x = padding + (index + 0.5) * candleWidth * 10;
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
                      strokeWidth="2"
                      opacity="0.8"
                      strokeDasharray="4,2"
                    />
                  );
                }
                return null;
              })}

              {/* Trade Entry/Exit Markers */}
              {mockTrades.map((trade) => {
                const entryXCenter = padding + (trade.entryIndex + 0.5) * candleWidth * 10;
                const entryY = getPriceY(trade.entryPrice);
                const markerRadius = 8;
                const isEntryHovered = hoveredTrade?.trade.id === trade.id && hoveredTrade?.type === 'entry';
                const isExitHovered = hoveredTrade?.trade.id === trade.id && hoveredTrade?.type === 'exit';

                return (
                  <g key={`trade-${trade.id}`}>
                    {/* Entry marker - larger and more prominent */}
                    <g
                      onMouseEnter={() => {
                        setHoveredTrade({
                          trade,
                          type: 'entry',
                          x: entryXCenter,
                          y: entryY
                        });
                        setHoveredCandle(null); // Clear candle hover when hovering trade
                      }}
                      onMouseLeave={() => {
                        setHoveredTrade(null);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={entryXCenter}
                        cy={entryY}
                        r={isEntryHovered ? markerRadius + 4 : markerRadius + 2}
                        fill={trade.type === 'LONG' ? colors.chart.entryLong : colors.chart.entryShort}
                        opacity={isEntryHovered ? "0.5" : "0.3"}
                      />
                      <circle
                        cx={entryXCenter}
                        cy={entryY}
                        r={isEntryHovered ? markerRadius + 2 : markerRadius}
                        fill={trade.type === 'LONG' ? colors.chart.entryLong : colors.chart.entryShort}
                        stroke="white"
                        strokeWidth={isEntryHovered ? "4" : "3"}
                      />
                    
                    {/* Entry label with background box */}
                    {trade.type === 'LONG' ? (
                      <>
                        {/* BUY label background */}
                        <rect
                          x={entryXCenter - 32}
                          y={entryY - 35}
                          width="64"
                          height="24"
                          rx="6"
                          fill={colors.chart.entryLong}
                          opacity="0.98"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                        />
                        {/* BUY icon */}
                        <text
                          x={entryXCenter - 18}
                          y={entryY - 16}
                          textAnchor="middle"
                          className="text-sm font-bold"
                          fill="white"
                          fontSize="16"
                          fontWeight="bold"
                        >
                          ▲
                        </text>
                        {/* BUY text */}
                        <text
                          x={entryXCenter - 6}
                          y={entryY - 17}
                          textAnchor="start"
                          className="text-sm font-bold"
                          fill="white"
                          fontSize="13"
                          fontWeight="bold"
                        >
                          BUY
                        </text>
                        {/* Connector line */}
                        <line
                          x1={entryXCenter}
                          y1={entryY - 11}
                          x2={entryXCenter}
                          y2={entryY - markerRadius - 2}
                          stroke={colors.chart.entryLong}
                          strokeWidth="2"
                        />
                      </>
                    ) : (
                      <>
                        {/* SELL label background */}
                        <rect
                          x={entryXCenter - 30}
                          y={entryY + 11}
                          width="64"
                          height="24"
                          rx="6"
                          fill={colors.chart.entryShort}
                          opacity="0.98"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                        />
                        {/* SELL icon */}
                        <text
                          x={entryXCenter - 18}
                          y={entryY + 30}
                          textAnchor="middle"
                          className="text-sm font-bold"
                          fill="white"
                          fontSize="16"
                          fontWeight="bold"
                        >
                          ▼
                        </text>
                        {/* SELL text */}
                        <text
                          x={entryXCenter - 7}
                          y={entryY + 29}
                          textAnchor="start"
                          className="text-sm font-bold"
                          fill="white"
                          fontSize="13"
                          fontWeight="bold"
                        >
                          SELL
                        </text>
                        {/* Connector line */}
                        <line
                          x1={entryXCenter}
                          y1={entryY + 11}
                          x2={entryXCenter}
                          y2={entryY + markerRadius + 2}
                          stroke={colors.chart.entryShort}
                          strokeWidth="2"
                        />
                      </>
                    )}

                    {/* Exit marker */}
                    {trade.exitIndex !== null && (
                      <g
                        onMouseEnter={() => {
                          const exitXCenter = padding + (trade.exitIndex + 0.5) * candleWidth * 10;
                          setHoveredTrade({
                            trade,
                            type: 'exit',
                            x: exitXCenter,
                            y: getPriceY(trade.exitPrice)
                          });
                          setHoveredCandle(null); // Clear candle hover when hovering trade
                        }}
                        onMouseLeave={() => {
                          setHoveredTrade(null);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          cx={padding + (trade.exitIndex + 0.5) * candleWidth * 10}
                          cy={getPriceY(trade.exitPrice)}
                          r={isExitHovered ? markerRadius + 4 : markerRadius + 2}
                          fill={trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss}
                          opacity={isExitHovered ? "0.5" : "0.3"}
                        />
                        <circle
                          cx={padding + (trade.exitIndex + 0.5) * candleWidth * 10}
                          cy={getPriceY(trade.exitPrice)}
                          r={isExitHovered ? markerRadius + 2 : markerRadius}
                          fill={trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss}
                          stroke="white"
                          strokeWidth={isExitHovered ? "4" : "3"}
                        />
                        
                        {/* Exit label with background box - position based on profitability */}
                        {trade.pnl >= 0 ? (
                          <>
                            {/* Profit EXIT label background */}
                            <rect
                              x={padding + (trade.exitIndex + 0.5) * candleWidth * 10 - 32}
                              y={getPriceY(trade.exitPrice) - 35}
                              width="64"
                              height="24"
                              rx="6"
                              fill={colors.chart.exitProfit}
                              opacity="0.98"
                              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                            />
                            {/* Profit icon */}
                            <text
                              x={padding + (trade.exitIndex + 0.5) * candleWidth * 10 - 12}
                              y={getPriceY(trade.exitPrice) - 15}
                              textAnchor="middle"
                              className="text-sm font-bold"
                              fill="white"
                              fontSize="16"
                              fontWeight="bold"
                            >
                              ✓
                            </text>
                            {/* EXIT text */}
                            <text
                              x={padding + (trade.exitIndex + 0.5) * candleWidth * 10 + 2}
                              y={getPriceY(trade.exitPrice) - 14}
                              textAnchor="start"
                              className="text-sm font-bold"
                              fill="white"
                              fontSize="13"
                              fontWeight="bold"
                            >
                              EXIT
                            </text>
                            {/* Connector line */}
                            <line
                              x1={padding + (trade.exitIndex + 0.5) * candleWidth * 10}
                              y1={getPriceY(trade.exitPrice) - 11}
                              x2={padding + (trade.exitIndex + 0.5) * candleWidth * 10}
                              y2={getPriceY(trade.exitPrice) - markerRadius - 2}
                              stroke={colors.chart.exitProfit}
                              strokeWidth="2"
                            />
                          </>
                        ) : (
                          <>
                            {/* Loss EXIT label background */}
                            <rect
                              x={padding + (trade.exitIndex + 0.5) * candleWidth * 10 - 32}
                              y={getPriceY(trade.exitPrice) + 11}
                              width="64"
                              height="24"
                              rx="6"
                              fill={colors.chart.exitLoss}
                              opacity="0.98"
                              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                            />
                            {/* Loss icon */}
                            <text
                              x={padding + (trade.exitIndex + 0.5) * candleWidth * 10 - 12}
                              y={getPriceY(trade.exitPrice) + 30}
                              textAnchor="middle"
                              className="text-sm font-bold"
                              fill="white"
                              fontSize="16"
                              fontWeight="bold"
                            >
                              ✕
                            </text>
                            {/* EXIT text */}
                            <text
                              x={padding + (trade.exitIndex + 0.5) * candleWidth * 10 + 2}
                              y={getPriceY(trade.exitPrice) + 31}
                              textAnchor="start"
                              className="text-sm font-bold"
                              fill="white"
                              fontSize="13"
                              fontWeight="bold"
                            >
                              EXIT
                            </text>
                            {/* Connector line */}
                            <line
                              x1={padding + (trade.exitIndex + 0.5) * candleWidth * 10}
                              y1={getPriceY(trade.exitPrice) + 11}
                              x2={padding + (trade.exitIndex + 0.5) * candleWidth * 10}
                              y2={getPriceY(trade.exitPrice) + markerRadius + 2}
                              stroke={colors.chart.exitLoss}
                              strokeWidth="2"
                            />
                          </>
                        )}
                      </g>
                    )}
                    </g>
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

              {/* Y-axis line */}
              <line
                x1={padding}
                y1={padding}
                x2={padding}
                y2={chartHeight + padding}
                stroke={colors.chart.grid}
                strokeWidth="1"
              />

              {/* Tooltip for Candlestick */}
              {hoveredCandle && !hoveredTrade && (
                <g>
                  {hoveredCandle.isVolume ? (
                    // Volume tooltip - positioned just above the bottom of candlestick chart
                    <>
                      {/* Tooltip background - fixed at bottom of chart */}
                      <rect
                        x={Math.min(Math.max(hoveredCandle.x + 15, padding + 5), padding + chartWidth * 10 - 155)}
                        y={chartHeight + padding - 100}
                        width="150"
                        height="95"
                        rx="8"
                        fill={colors.svg.surface}
                        stroke={colors.svg.border}
                        strokeWidth="1.5"
                        opacity="0.98"
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
                      />
                      {/* Tooltip header */}
                      <rect
                        x={Math.min(Math.max(hoveredCandle.x + 15, padding + 5), padding + chartWidth * 10 - 155)}
                        y={chartHeight + padding - 100}
                        width="150"
                        height="20"
                        rx="8"
                        fill={colors.chart.primary}
                        opacity="0.15"
                      />
                      {/* Tooltip content */}
                      <text
                        x={Math.min(Math.max(hoveredCandle.x + 22, padding + 12), padding + chartWidth * 10 - 148)}
                        y={chartHeight + padding - 85}
                        fill={colors.svg.text}
                        fontSize="12"
                        fontWeight="bold"
                      >
                        OHLC Data
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x + 22, padding + 12), padding + chartWidth * 10 - 148)}
                        y={chartHeight + padding - 68}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Open: ${hoveredCandle.candle.open.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x + 22, padding + 12), padding + chartWidth * 10 - 148)}
                        y={chartHeight + padding - 55}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        High: ${hoveredCandle.candle.high.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x + 22, padding + 12), padding + chartWidth * 10 - 148)}
                        y={chartHeight + padding - 42}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Low: ${hoveredCandle.candle.low.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x + 22, padding + 12), padding + chartWidth * 10 - 148)}
                        y={chartHeight + padding - 29}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Close: ${hoveredCandle.candle.close.toFixed(2)}
                      </text>
                      {hoveredCandle.candle.volume && (
                        <text
                          x={Math.min(Math.max(hoveredCandle.x + 22, padding + 12), padding + chartWidth * 10 - 148)}
                          y={chartHeight + padding - 16}
                          fill={colors.svg.textMuted}
                          fontSize="10"
                        >
                          Volume: {formatNum(hoveredCandle.candle.volume)}
                        </text>
                      )}
                    </>
                  ) : (
                    // Candlestick tooltip - positioned above the candle
                    <>
                      {/* Tooltip background */}
                      <rect
                        x={Math.min(Math.max(hoveredCandle.x - 75, padding + 5), padding + chartWidth * 10 - 155)}
                        y={hoveredCandle.y - 100}
                        width="150"
                        height="95"
                        rx="8"
                        fill={colors.svg.surface}
                        stroke={colors.svg.border}
                        strokeWidth="1.5"
                        opacity="0.98"
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
                      />
                      {/* Tooltip header */}
                      <rect
                        x={Math.min(Math.max(hoveredCandle.x - 75, padding + 5), padding + chartWidth * 10 - 155)}
                        y={hoveredCandle.y - 100}
                        width="150"
                        height="20"
                        rx="8"
                        fill={colors.chart.primary}
                        opacity="0.15"
                      />
                      {/* Tooltip content */}
                      <text
                        x={Math.min(Math.max(hoveredCandle.x - 68, padding + 12), padding + chartWidth * 10 - 148)}
                        y={hoveredCandle.y - 85}
                        fill={colors.svg.text}
                        fontSize="12"
                        fontWeight="bold"
                      >
                        OHLC Data
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x - 68, padding + 12), padding + chartWidth * 10 - 148)}
                        y={hoveredCandle.y - 68}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Open: ${hoveredCandle.candle.open.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x - 68, padding + 12), padding + chartWidth * 10 - 148)}
                        y={hoveredCandle.y - 55}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        High: ${hoveredCandle.candle.high.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x - 68, padding + 12), padding + chartWidth * 10 - 148)}
                        y={hoveredCandle.y - 42}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Low: ${hoveredCandle.candle.low.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredCandle.x - 68, padding + 12), padding + chartWidth * 10 - 148)}
                        y={hoveredCandle.y - 29}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Close: ${hoveredCandle.candle.close.toFixed(2)}
                      </text>
                      {hoveredCandle.candle.volume && (
                        <text
                          x={Math.min(Math.max(hoveredCandle.x - 68, padding + 12), padding + chartWidth * 10 - 148)}
                          y={hoveredCandle.y - 16}
                          fill={colors.svg.textMuted}
                          fontSize="10"
                        >
                          Volume: {formatNum(hoveredCandle.candle.volume)}
                        </text>
                      )}
                    </>
                  )}
                </g>
              )}

              {/* Tooltip for Trade Markers */}
              {hoveredTrade && (
                <g>
                  {/* Tooltip background */}
                  <rect
                    x={Math.min(Math.max(hoveredTrade.x - 90, padding + 5), padding + chartWidth * 10 - 185)}
                    y={hoveredTrade.y - (hoveredTrade.type === 'entry' ? 120 : 120)}
                    width="180"
                    height={hoveredTrade.type === 'exit' ? "110" : "95"}
                    rx="8"
                    fill={colors.svg.surface}
                    stroke={hoveredTrade.type === 'entry' 
                      ? (hoveredTrade.trade.type === 'LONG' ? colors.chart.entryLong : colors.chart.entryShort)
                      : (hoveredTrade.trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss)}
                    strokeWidth="2"
                    opacity="0.98"
                    filter="drop-shadow(0 4px 12px rgba(0,0,0,0.25))"
                  />
                  {/* Tooltip header */}
                  <rect
                    x={Math.min(Math.max(hoveredTrade.x - 90, padding + 5), padding + chartWidth * 10 - 185)}
                    y={hoveredTrade.y - (hoveredTrade.type === 'entry' ? 120 : 120)}
                    width="180"
                    height="22"
                    rx="8"
                    fill={hoveredTrade.type === 'entry' 
                      ? (hoveredTrade.trade.type === 'LONG' ? colors.chart.entryLong : colors.chart.entryShort)
                      : (hoveredTrade.trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss)}
                    opacity="0.9"
                  />
                  {/* Tooltip content */}
                  <text
                    x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                    y={hoveredTrade.y - 103}
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {hoveredTrade.type === 'entry' 
                      ? `${hoveredTrade.trade.type === 'LONG' ? 'BUY' : 'SELL'} Entry`
                      : 'Trade Exit'}
                  </text>
                  {hoveredTrade.type === 'entry' ? (
                    <>
                      <text
                        x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                        y={hoveredTrade.y - 86}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Price: ${hoveredTrade.trade.entryPrice.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                        y={hoveredTrade.y - 73}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Shares: {hoveredTrade.trade.shares}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                        y={hoveredTrade.y - 60}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Status: {hoveredTrade.trade.status}
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                        y={hoveredTrade.y - 86}
                        fill={colors.svg.textMuted}
                        fontSize="10"
                      >
                        Exit Price: ${hoveredTrade.trade.exitPrice.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                        y={hoveredTrade.y - 73}
                        fill={hoveredTrade.trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss}
                        fontSize="11"
                        fontWeight="bold"
                      >
                        P&L: {hoveredTrade.trade.pnl >= 0 ? '+' : ''}${hoveredTrade.trade.pnl.toFixed(2)}
                      </text>
                      <text
                        x={Math.min(Math.max(hoveredTrade.x - 83, padding + 12), padding + chartWidth * 10 - 178)}
                        y={hoveredTrade.y - 60}
                        fill={hoveredTrade.trade.pnl >= 0 ? colors.chart.exitProfit : colors.chart.exitLoss}
                        fontSize="11"
                        fontWeight="bold"
                      >
                        P&L %: {hoveredTrade.trade.pnl >= 0 ? '+' : ''}{hoveredTrade.trade.pnlPercent.toFixed(2)}%
                      </text>
                    </>
                  )}
                </g>
              )}

              {/* MA Labels in top right corner */}
              {maPeriods.map((period, periodIndex) => {
                const maData = maValues[period];
                if (!maData || maData.length === 0) return null;
                
                const lastValidIndex = maData.length - 1;
                const lastValidValue = maData[lastValidIndex];
                if (lastValidValue === null) return null;
                
                const color = maColors[periodIndex % maColors.length];
                // Position labels all the way to the right edge of the viewBox
                const viewBoxWidth = 1200; // ViewBox width
                const labelWidth = 50; // Width of label
                const labelX = viewBoxWidth - 10; // Right edge with small margin
                const labelY = padding + 15 + (periodIndex * 18); // Stacked vertically with spacing
                
                return (
                  <g key={`ma-label-${period}`}>
                    {/* Line indicator */}
                    <line
                      x1={labelX - labelWidth + 5}
                      y1={labelY}
                      x2={labelX - labelWidth + 20}
                      y2={labelY}
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="4,2"
                    />
                    {/* Label text */}
                    <text
                      x={labelX - labelWidth + 25}
                      y={labelY + 4}
                      textAnchor="start"
                      fill={color}
                      fontSize="11"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      MA{period}
                    </text>
                  </g>
                );
              })}
                </svg>

                {/* Separator line between price and volume */}
                <div className={`h-px border-t ${colors.border}`} />

                {/* Volume Chart */}
                <svg
                  width={`${100 * zoomLevel}%`}
                  height="80"
                  viewBox={`0 0 1200 80`}
                  className="min-w-max"
                  preserveAspectRatio="none"
                  style={{ minWidth: `${100 * zoomLevel}%` }}
                >
                  {/* Volume grid lines */}
                  {[1, 0.5, 0].map((ratio) => (
                    <line
                      key={`vol-grid-${ratio}`}
                      x1={padding}
                      y1={50 - ratio * 50}
                      x2={padding + chartWidth * 10}
                      y2={50 - ratio * 50}
                      stroke={colors.chart.grid}
                      strokeWidth="1"
                      opacity="0.15"
                    />
                  ))}

                  {/* Volume bars */}
                  {candleData.length > 0 && candleData.map((candle, index) => {
                    const xCenter = padding + (index + 0.5) * candleWidth * 10;
                    const maxVolume = Math.max(...candleData.map(d => d.volume));
                    const volumeHeight = (candle.volume / maxVolume) * 50;
                    const volumeY = 50 - volumeHeight;

                    const isGreen = candle.close >= candle.open;
                    const isHovered = hoveredCandle?.index === index;

                    return (
                      <rect
                        key={`volume-${index}`}
                        x={xCenter - candleWidth * 10 * 0.4}
                        y={volumeY}
                        width={candleWidth * 10 * 0.8}
                        height={volumeHeight}
                        fill={isGreen ? colors.chart.candleGreen : colors.chart.candleRed}
                        opacity={isHovered ? "0.6" : "0.4"}
                        onMouseEnter={() => {
                          const xCenter = padding + (index + 0.5) * candleWidth * 10;
                          const maxVolume = Math.max(...candleData.map(d => d.volume));
                          const volumeHeight = (candle.volume / maxVolume) * 50;
                          const volumeY = 50 - volumeHeight;
                          setHoveredCandle({
                            index,
                            x: xCenter,
                            y: chartHeight + padding + volumeY + volumeHeight / 2, // Position at center of volume bar
                            candle,
                            isVolume: true
                          });
                          setHoveredTrade(null); // Clear trade hover when hovering volume
                        }}
                        onMouseLeave={() => setHoveredCandle(null)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}

                  {/* Volume Y-axis line */}
                  <line
                    x1={padding}
                    y1="0"
                    x2={padding}
                    y2="50"
                    stroke={colors.chart.grid}
                    strokeWidth="1"
                  />
                </svg>

                {/* Time axis section */}
                <div className="flex flex-col gap-1">
                  {/* Time labels below everything */}
                  <div className="flex justify-between text-xs" style={{ paddingLeft: padding, paddingRight: '1rem' }}>
                    {candleData.length > 0 && candleData.map((candle, index) => {
                      if (index % Math.ceil(candleData.length / 6) !== 0) return null;
                      // Format the date properly - already in local time
                      const dateObj = new Date(candle.date);
                      const formatted = dateObj.toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      });
                      return (
                        <span key={`time-${index}`} className={colors.textMuted}>
                          {formatted}
                        </span>
                      );
                    })}
                  </div>
                  {/* Time axis label */}
                  <div className={`text-xs font-bold ${colors.text} mt-2 text-center`}>
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
                {isPositive ? '+' : ''}{priceChangePercent}%
              </p>
            </div>
          </div>
    </div>
  );
};

export default Stock;
