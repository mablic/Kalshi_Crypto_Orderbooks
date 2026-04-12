import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { getMAParams, calculateMovingAverage } from '../../lib/position';
import { getStrategyPeriod } from '../../lib/strategy';
import {
  parseOrderBookDepthRows,
  KALSHI_DEPTH_YES_KEY,
  KALSHI_DEPTH_NO_KEY,
  formatKalshiInstant,
  buildKalshiCandlesOrderBookCsv,
} from '../../lib/kalshi';
import { trackEvent, AnalyticsEvent } from '../../lib/analytics';
import { closePointsToSmoothPath } from '../../lib/smoothPath';

/** Sample standard deviation (n − 1), same as statistics.stdev. */
function sampleStdev(values) {
  if (!values || values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  let s = 0;
  for (const x of values) {
    const d = x - mean;
    s += d * d;
  }
  return Math.sqrt(s / (values.length - 1));
}

function humanizeOrderBookKey(key) {
  return String(key).replace(/_/g, ' ');
}

function formatDepthPrice(p) {
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

function formatDepthSize(n) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

/** USD string for strike / ref lines (matches floor label rules). */
function formatUsdLinePrice(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1) {
    return `$${n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }
  return `$${n.toFixed(5)}`;
}

/** USD for Kalshi legend / ±1σ callouts — always exactly 2 decimal places. */
function formatUsdTwoDecimals(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function DepthTable({ title, rows, colors, side }) {
  const tone =
    side === 'yes'
      ? {
          title: 'text-emerald-600 dark:text-emerald-400',
          cell: 'text-emerald-700 dark:text-emerald-300',
          head: 'text-emerald-800/90 dark:text-emerald-300/95',
          bar: 'bg-emerald-500',
          ring: 'ring-emerald-500/15',
        }
      : {
          title: 'text-rose-600 dark:text-rose-400',
          cell: 'text-rose-700 dark:text-rose-300',
          head: 'text-rose-800/90 dark:text-rose-300/95',
          bar: 'bg-rose-500',
          ring: 'ring-rose-500/15',
        };

  return (
    <div
      className={`rounded-xl border ${colors.border} overflow-hidden flex flex-col min-h-[200px] ${colors.surface} ring-1 ${tone.ring}`}
    >
      <div
        className={`px-4 py-3 border-b ${colors.border} ${colors.surfaceSecondary} flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-7 w-1 shrink-0 rounded-full ${tone.bar}`} aria-hidden />
          <span className={`text-sm font-bold tracking-tight ${tone.title}`}>{title}</span>
        </div>
        <span className={`text-xs font-medium tabular-nums ${colors.textMuted}`}>
          {rows.length} level{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="overflow-y-auto max-h-[min(400px,45vh)]">
        {rows.length === 0 ? (
          <p className={`p-6 text-sm text-center ${colors.textMuted}`}>No contracts at this side.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left border-b ${colors.border} ${colors.surfaceSecondary}`}>
                <th className={`py-2.5 pl-4 pr-2 text-[11px] font-bold uppercase tracking-wider ${tone.head}`}>
                  Price
                </th>
                <th
                  className={`py-2.5 pr-4 pl-2 text-[11px] font-bold uppercase tracking-wider ${tone.head} text-right`}
                >
                  Contracts
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${side}-${i}-${r.price}`}
                  className={`border-b ${colors.borderSecondary} last:border-0 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors`}
                >
                  <td className={`py-2.5 pl-4 font-mono text-sm font-semibold tabular-nums ${tone.cell}`}>
                    {formatDepthPrice(r.price)}
                  </td>
                  <td className={`py-2.5 pr-4 text-right font-mono text-sm font-semibold tabular-nums ${tone.cell}`}>
                    {formatDepthSize(r.size)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KalshiOrderBookPanel({ orderBook, colors, snapshotLabel = '' }) {
  const [filter, setFilter] = useState('');

  const entries = useMemo(() => {
    return orderBook && typeof orderBook === 'object' ? Object.entries(orderBook) : [];
  }, [orderBook]);

  const yesRows = useMemo(
    () => parseOrderBookDepthRows(orderBook?.[KALSHI_DEPTH_YES_KEY]),
    [orderBook]
  );
  const noRows = useMemo(
    () => parseOrderBookDepthRows(orderBook?.[KALSHI_DEPTH_NO_KEY]),
    [orderBook]
  );

  const otherEntries = useMemo(() => {
    return entries.filter(
      ([k]) => k !== KALSHI_DEPTH_YES_KEY && k !== KALSHI_DEPTH_NO_KEY
    );
  }, [entries]);

  const filteredOther = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return otherEntries;
    return otherEntries.filter(([k, v]) => {
      const blob =
        `${k} ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`.toLowerCase();
      return blob.includes(q);
    });
  }, [otherEntries, filter]);

  const snapshotDisplay = useMemo(() => {
    if (!snapshotLabel) return '';
    if (/^\d{4}-\d{2}-\d{2}T/.test(snapshotLabel.trim())) {
      return formatKalshiInstant(snapshotLabel.trim());
    }
    return snapshotLabel;
  }, [snapshotLabel]);

  const renderOtherValue = (v) => {
    if (v === null || v === undefined) {
      return <span className={`text-xs italic ${colors.textMuted}`}>—</span>;
    }
    if (typeof v === 'object') {
      return (
        <pre
          className={`text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-32 overflow-auto rounded-md px-2 py-1.5 bg-slate-900/[0.04] dark:bg-white/[0.06] ${colors.text} font-mono`}
        >
          {JSON.stringify(v, null, 2)}
        </pre>
      );
    }
    return <span className={`text-sm font-medium ${colors.text}`}>{String(v)}</span>;
  };

  const shell =
    `${colors.surface} border ${colors.border} rounded-2xl shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden mt-8`;

  if (entries.length === 0) {
    return (
      <div className={shell}>
        <div className="h-0.5 bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-600 dark:to-slate-500" />
        <div className="p-6 sm:p-8">
          <h3 className={`text-base font-semibold ${colors.text}`}>Order book</h3>
          <p className={`mt-2 text-sm ${colors.textMuted} max-w-md`}>
            No order-book fields on this snapshot. When the feed writes{' '}
            <code className="text-xs px-1 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80">
              order_book
            </code>{' '}
            on each snapshot, depth and quotes will show here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />
      <div className="p-5 sm:p-6 lg:p-8">
        <div className="mb-6 w-full">
          <h3 className={`text-lg font-semibold tracking-tight ${colors.text}`}>Order book</h3>
          <p className={`mt-1 text-sm leading-relaxed ${colors.textMuted} max-w-2xl`}>
            Depth for the snapshot selected on the chart (highlighted column) or in the snapshot bar
            above the price chart. Use prev/next or another time slot to change it.
          </p>
          {snapshotDisplay && (
            <p className={`mt-3 text-sm ${colors.textSecondary}`}>
              <span className={`font-medium ${colors.textMuted}`}>Snapshot · </span>
              {snapshotDisplay}
            </p>
          )}
          <div
            className={`mt-5 w-full rounded-xl border ${colors.border} overflow-hidden ${colors.surface} ring-1 ring-slate-900/5 dark:ring-white/10`}
            role="note"
            aria-label="Kalshi order book: bids only"
          >
            <div
              className={`flex items-center gap-2 px-4 py-2.5 sm:px-5 border-b ${colors.border} ${colors.surfaceSecondary}`}
            >
              <span className="h-6 w-1 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" aria-hidden />
              <p className={`text-[11px] font-bold uppercase tracking-wide ${colors.textMuted}`}>
                Bid side only (Kalshi order book API)
              </p>
            </div>
            <div className="px-4 py-3.5 sm:px-5 sm:py-4">
              <p className={`text-sm leading-relaxed ${colors.text}`}>
                These ladders show <span className="font-semibold">active bid orders</span> on the yes and no
                sides. The API does not return asks: in a binary market, a{' '}
                <span className="font-medium">yes bid</span> at price{' '}
                <span className="font-mono tabular-nums text-[13px]">X</span> is the same liquidity as a{' '}
                <span className="font-medium">no ask</span> at{' '}
                <span className="font-mono tabular-nums text-[13px]">1 − X</span> (e.g. a $0.07 yes bid
                matches a $0.93 no ask) with the same contract size. Levels are ordered from best to worst
                price.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 mb-8">
          <DepthTable title="Yes bids" side="yes" rows={yesRows} colors={colors} />
          <DepthTable title="No bids" side="no" rows={noRows} colors={colors} />
        </div>

        {otherEntries.length > 0 && (
          <div className={`rounded-xl border ${colors.border} overflow-hidden`}>
            <div
              className={`px-4 py-3 border-b ${colors.border} ${colors.surfaceSecondary} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}
            >
              <span className={`text-sm font-semibold ${colors.text}`}>Other snapshot fields</span>
              <label htmlFor="ob-filter" className="sr-only">
                Filter
              </label>
              <input
                id="ob-filter"
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                className={`
                  w-full sm:max-w-xs rounded-lg border ${colors.border} ${colors.surface} ${colors.text}
                  px-3 py-2 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                `}
              />
            </div>
            <ul className="divide-y divide-slate-200/80 dark:divide-slate-700/80 max-h-56 overflow-y-auto">
              {filteredOther.length === 0 ? (
                <li className={`p-4 text-sm ${colors.textMuted}`}>No matches.</li>
              ) : (
                filteredOther.map(([k, v]) => (
                  <li key={k} className="px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                    <div className={`text-[10px] font-bold uppercase tracking-wide ${colors.textMuted}`}>
                      {humanizeOrderBookKey(k)}
                    </div>
                    <div className="mt-1">{renderOtherValue(v)}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const Stock = ({
  candleData = [],
  positionStats = null,
  loading = false,
  strategyName = '',
  kalshiMode = false,
}) => {
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

  const chartTimeLocale = useMemo(
    () => ({
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(kalshiMode ? { timeZoneName: 'short' } : {}),
    }),
    [kalshiMode]
  );
  
  const [maPeriods, setMaPeriods] = useState([5, 10]);
  const [maValues, setMaValues] = useState({});
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [, setHoveredTrade] = useState(null);
  const [kalshiSelectedSnapId, setKalshiSelectedSnapId] = useState(null);
  const [tradingInterval, setTradingInterval] = useState('1'); // Default to 1 minute
  
  // Get MA colors from theme
  const maColors = colors.chart.maColors || [];

  // Extract trades from displayedCandles - handle edge cases
  const trades = useMemo(() => {
    if (kalshiMode) return [];
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
  }, [displayedCandles, kalshiMode]);

  const orderBookSourceCandle = useMemo(() => {
    if (!kalshiMode || displayedCandles.length === 0) return null;
    if (kalshiSelectedSnapId) {
      const found = displayedCandles.find((c) => c.snapId === kalshiSelectedSnapId);
      if (found) return found;
    }
    return displayedCandles[displayedCandles.length - 1];
  }, [kalshiMode, displayedCandles, kalshiSelectedSnapId]);

  const activeOrderBook = useMemo(() => {
    if (!kalshiMode) return null;
    const c = orderBookSourceCandle;
    if (c?.orderBook && typeof c.orderBook === 'object') return c.orderBook;
    return {};
  }, [kalshiMode, orderBookSourceCandle]);

  /** Index of the candle whose order book is shown (defaults to last when selection is null). */
  const kalshiStrikeNum = useMemo(() => {
    const v = positionStats?.kalshiFloorStrike;
    if (v == null) return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }, [positionStats?.kalshiFloorStrike]);

  /**
   * σ = sample stdev of **close** prices in the rolling last 15 minutes (from `candleData`).
   * Bands: last candle close ± σ — recomputes every time `candleData` updates.
   */
  const { volUpperNum, volLowerNum, volSigmaClose, volSigmaDebug } = useMemo(() => {
    const empty = {
      volUpperNum: null,
      volLowerNum: null,
      volSigmaClose: null,
      volSigmaDebug: null,
    };
    if (!kalshiMode || !candleData?.length) return empty;

    const now = Date.now();
    const cutoff = now - 15 * 60 * 1000;
    const closesInWindow = [];
    for (const row of candleData) {
      if (!row || typeof row.date !== 'string') continue;
      const t = Date.parse(row.date);
      if (Number.isNaN(t) || t < cutoff) continue;
      const c = row.close;
      if (typeof c === 'number' && Number.isFinite(c)) closesInWindow.push(c);
    }

    const debugBase = {
      closesInWindow: [...closesInWindow],
      cutoffMs: cutoff,
      nowMs: now,
      n: closesInWindow.length,
    };

    if (closesInWindow.length < 2) {
      return { ...empty, volSigmaDebug: { ...debugBase, note: 'need ≥2 closes in 15m window for σ' } };
    }

    const sigma = sampleStdev(closesInWindow);
    if (sigma == null || !Number.isFinite(sigma)) {
      return { ...empty, volSigmaDebug: { ...debugBase, note: 'sampleStdev invalid' } };
    }

    const anchor =
      displayedCandles.length > 0
        ? displayedCandles[displayedCandles.length - 1].close
        : candleData[candleData.length - 1]?.close;
    if (anchor == null || !Number.isFinite(anchor)) {
      return { ...empty, volSigmaDebug: { ...debugBase, sigma, note: 'anchor close invalid' } };
    }

    const mean = closesInWindow.reduce((a, b) => a + b, 0) / closesInWindow.length;

    return {
      volSigmaClose: sigma,
      volUpperNum: anchor + sigma,
      volLowerNum: anchor - sigma,
      volSigmaDebug: {
        ...debugBase,
        meanClose: mean,
        sigma,
        anchorClose: anchor,
        lower1sigma: anchor - sigma,
        upper1sigma: anchor + sigma,
      },
    };
  }, [kalshiMode, candleData, displayedCandles]);

  useEffect(() => {
    if (!import.meta.env.DEV || !kalshiMode || !volSigmaDebug) return;
    const d = volSigmaDebug;
    console.log(
      '[Kalshi σ] 15m window (UTC)',
      new Date(d.cutoffMs).toISOString(),
      '→',
      new Date(d.nowMs).toISOString(),
      'n=',
      d.n
    );
    console.log('[Kalshi σ] closes in window (last 15m):', d.closesInWindow);
    if (d.meanClose != null && Number.isFinite(d.sigma)) {
      console.log(
        '[Kalshi σ] mean(close)=',
        d.meanClose,
        'sample σ (n−1)=',
        d.sigma,
        '| anchor(last close)=',
        d.anchorClose,
        '| bands',
        d.lower1sigma,
        d.upper1sigma
      );
    } else if (d.note) {
      console.log('[Kalshi σ]', d.note, d.sigma != null ? { sigma: d.sigma } : '');
    }
  }, [kalshiMode, volSigmaDebug]);

  const { minPrice, priceRange } = useMemo(() => {
    if (displayedCandles.length === 0) {
      if (kalshiMode && kalshiStrikeNum != null) {
        const pad = Math.max(Math.abs(kalshiStrikeNum) * 0.012, 0.5);
        const mn = kalshiStrikeNum - pad;
        const mx = kalshiStrikeNum + pad;
        return { minPrice: mn, priceRange: Math.max(mx - mn, 1e-9) };
      }
      return { minPrice: 140, priceRange: 60 };
    }
    const lows = displayedCandles.map((d) => d.low);
    const highs = displayedCandles.map((d) => d.high);
    let lo = Math.min(...lows);
    let hi = Math.max(...highs);
    if (kalshiMode && kalshiStrikeNum != null) {
      lo = Math.min(lo, kalshiStrikeNum);
      hi = Math.max(hi, kalshiStrikeNum);
    }
    if (kalshiMode && volUpperNum != null && volLowerNum != null) {
      lo = Math.min(lo, volLowerNum);
      hi = Math.max(hi, volUpperNum);
    }
    const span = hi - lo;

    if (kalshiMode) {
      if (!Number.isFinite(span) || span <= 0) {
        const mid = kalshiStrikeNum ?? (hi || lo || 1);
        const pad = Math.max(Math.abs(mid) * 0.002, 0.01);
        const mn = mid - pad;
        const mx = mid + pad;
        return { minPrice: mn, priceRange: Math.max(mx - mn, 1e-9) };
      }
      const pad = Math.max(span * 0.06, span * 0.02, 1e-6);
      const mn = lo - pad;
      const mx = hi + pad;
      return { minPrice: mn, priceRange: Math.max(mx - mn, 1e-9) };
    }

    const mn = lo - 2;
    const mx = hi + 2;
    return { minPrice: mn, priceRange: Math.max(mx - mn, 1e-9) };
  }, [displayedCandles, kalshiMode, kalshiStrikeNum, volUpperNum, volLowerNum]);

  const formatYAxisPrice = (price) => {
    if (!kalshiMode) return `$${Math.round(price)}`;
    if (priceRange < 0.5) return `$${price.toFixed(5)}`;
    if (priceRange < 5) return `$${price.toFixed(3)}`;
    if (priceRange < 200) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(1)}`;
  };

  const chartHeight = 400;
  const padding = 40;
  
  // Calculate candle width dynamically
  // Chart width - dynamic, fills available space
  const chartWidth = useMemo(() => {
    if (displayedCandles.length === 0) return 100;
    const baseWidth = kalshiMode ? 1050 : 600;
    const scaleFactor = Math.max(0.85, Math.min(1.7, displayedCandles.length / 60));
    return baseWidth * scaleFactor + padding * 2;
  }, [displayedCandles.length, kalshiMode]);

  const getPriceY = (price) => {
    const normalized = (price - minPrice) / priceRange;
    return chartHeight - normalized * chartHeight + padding;
  };

  useEffect(() => {
    if (!kalshiMode) {
      setKalshiSelectedSnapId(null);
    }
  }, [kalshiMode]);

  useEffect(() => {
    if (!kalshiMode || displayedCandles.length === 0) return;
    setKalshiSelectedSnapId((prev) => {
      if (!prev) return null;
      const still = displayedCandles.some((c) => c.snapId === prev);
      return still ? prev : null;
    });
  }, [kalshiMode, displayedCandles]);

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
    if (kalshiMode) {
      setMaPeriods([]);
      setMaValues({});
      return;
    }
    const fetchMAParams = async () => {
      if (strategyName) {
        const periods = await getMAParams(strategyName);
        setMaPeriods(periods);
      }
    };
    fetchMAParams();
  }, [strategyName, kalshiMode]);

  // Fetch trading interval/period
  useEffect(() => {
    if (kalshiMode) {
      setTradingInterval('1');
      return;
    }
    const fetchTradingInterval = async () => {
      if (strategyName) {
        const period = await getStrategyPeriod(strategyName);
        setTradingInterval(period);
      }
    };
    fetchTradingInterval();
  }, [strategyName, kalshiMode]);

  // Calculate moving averages from FULL dataset, then slice for display
  useEffect(() => {
    if (kalshiMode) {
      setMaValues({});
      return;
    }
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
  }, [candleData, maPeriods, kalshiMode]);

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

  const handleDownloadKalshiCsv = useCallback(() => {
    if (!kalshiMode || !candleData?.length) return;
    trackEvent(AnalyticsEvent.KALSHI_CSV_DOWNLOAD, {
      ticker: String(ticker || ''),
      row_count: candleData.length,
    });
    const csv = `\uFEFF${buildKalshiCandlesOrderBookCsv(candleData)}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = String(ticker || 'kalshi').replace(/[^\w.-]+/g, '_');
    a.download = `${safe}_ohlc_orderbook.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [kalshiMode, candleData, ticker]);

  if (loading) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl`}>
        <div className="text-center">
          <p className={colors.textMuted}>Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (displayedCandles.length === 0) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl`}>
        <div className="text-center">
          <p className={colors.textMuted}>No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.surface} border ${colors.border} rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl`}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-3xl font-bold ${colors.text}`}>
              {ticker}
            </h2>
            <p className={`text-sm ${colors.textMuted} mt-1`}>
              {kalshiMode
                ? `${ticker} | Kalshi + CF Benchmarks`
                : `${ticker !== 'N/A' ? `${ticker} Stock` : 'Stock'} | Last Update: Just now`}
            </p>
            <p className={`text-xs ${colors.textMuted} mt-2 italic`}>
              {kalshiMode
                ? '📊 CF Benchmarks minute index OHLC from each Kalshi snapshot (one candle per capture).'
                : `📊 This chart displays ${tradingInterval}-minute price data. The model executes trading decisions every ${tradingInterval} ${parseInt(tradingInterval, 10) === 1 ? 'minute' : 'minutes'}.`}
            </p>
          </div>
          <div className={`${isPositive ? colors.greenLight : colors.redLight} px-4 py-2 rounded-lg`}>
            <p className={`text-2xl font-bold tabular-nums ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
              {formatUsdTwoDecimals(currentPrice)}
            </p>
            <p className={`text-sm ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
              {formatCurrency(priceChange)} ({formatPercent(priceChangePercent)})
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-6 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className={`text-sm font-semibold ${colors.textMuted}`}>
            📊 Showing most recent {displayedCandles.length} of {candleData.length} loaded candles (
            {tradingInterval}-minute {parseInt(tradingInterval, 10) === 1 ? 'interval' : 'intervals'})
          </div>
          {kalshiMode && candleData.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadKalshiCsv}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition ${colors.border} ${colors.surface} ${colors.text} hover:bg-slate-100/90 dark:hover:bg-slate-800/80`}
            >
              Download CSV
            </button>
          )}
        </div>
        {kalshiMode && (
          <p className={`text-xs ${colors.textSecondary} leading-relaxed max-w-3xl`}>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Order book:</span> click a
            candle (price or ticks row) to pick which snapshot’s book is shown below.{' '}
            <span className={colors.textMuted}>
              CSV includes all {candleData.length} loaded rows (OHLC + yes_book / no_book JSON per row).
            </span>
          </p>
        )}
        {kalshiMode && (kalshiStrikeNum != null || volSigmaClose != null) && (
          <div
            role="list"
            aria-label="Price reference lines"
            className={`flex flex-wrap items-start gap-x-5 gap-y-2 rounded-lg border px-3 py-2.5 ${colors.border} ${colors.surfaceSecondary}`}
          >
            {kalshiStrikeNum != null && (
              <div className="flex min-w-0 items-center gap-2" role="listitem">
                <span
                  className="inline-block w-9 shrink-0 border-t-2 border-dashed border-orange-600 dark:border-orange-400"
                  aria-hidden
                />
                <span className={`text-xs font-semibold tabular-nums ${colors.text}`}>
                  Floor strike {formatUsdTwoDecimals(kalshiStrikeNum)}
                </span>
              </div>
            )}
            {volSigmaClose != null && volUpperNum != null && volLowerNum != null && (
              <>
                <div className="flex min-w-0 items-center gap-2" role="listitem">
                  <span
                    className="inline-block w-9 shrink-0 border-t-2 border-dashed border-slate-500 dark:border-slate-400"
                    aria-hidden
                  />
                  <span className={`text-xs font-semibold tabular-nums ${colors.text}`}>
                    {`+1σ ${formatUsdTwoDecimals(volUpperNum)} · σ $${volSigmaClose.toFixed(2)} (15m stdev of closes)`}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2" role="listitem">
                  <span
                    className="inline-block w-9 shrink-0 border-t-2 border-dashed border-slate-500 dark:border-slate-400"
                    aria-hidden
                  />
                  <span className={`text-xs font-semibold tabular-nums ${colors.text}`}>
                    {`−1σ ${formatUsdTwoDecimals(volLowerNum)} · σ $${volSigmaClose.toFixed(2)} (15m stdev of closes)`}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Candlestick Chart with Volume - Single unified chart */}
      <div className={`mb-8 ${colors.surface} rounded-xl p-3 sm:p-4 lg:p-6 border ${colors.border}`}>
        <div className="flex gap-4">
          {/* Y-axis labels and titles */}
          <div className="flex flex-col gap-0 flex-shrink-0">
            <div className="flex flex-col">
              <div className={`text-xs font-bold ${colors.text} mb-2`}>Price (USD)</div>
              <div className="flex flex-col justify-between" style={{ height: chartHeight + padding }}>
                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <div key={`price-label-${ratio}`} className={`text-xs ${colors.textMuted} text-right pr-2 w-20`}>
                    {formatYAxisPrice(minPrice + priceRange * ratio)}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <div className={`text-xs font-bold ${colors.text} mb-2`}>
                {kalshiMode ? 'Ticks' : 'Volume'}
              </div>
              <div className="flex flex-col justify-between" style={{ height: '80px' }}>
                {displayedCandles.length > 0 && (() => {
                  const maxVolume = Math.max(...displayedCandles.map((d) => d.volume), 1);
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
                          <span className={`text-xs tabular-nums ${colors.textMuted} whitespace-nowrap`}>
                            {formatUsdTwoDecimals(lastValidValue)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="relative w-full" style={{ height: chartHeight + padding }}>
              <svg
                ref={svgRef}
                className="block h-full w-full"
                width="100%"
                height="100%"
                viewBox={`0 0 ${chartWidth * 10} ${chartHeight + padding}`}
                preserveAspectRatio="none"
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
                const isOrderBookBar =
                  kalshiMode &&
                  orderBookSourceCandle &&
                  candle.snapId === orderBookSourceCandle.snapId;
                const vbW = svgDimensions.viewBoxWidth || chartWidth * 10;
                const pxW = svgDimensions.width || 0;
                const minHitVb = pxW > 0 ? (40 * vbW) / pxW : 48;
                const slotHitW = Math.max(1, candleSpacing - 2);
                const hitW = Math.min(slotHitW, Math.max(minHitVb, candleSpacing * 0.88));
                const hitX = padding + index * candleSpacing + (candleSpacing - hitW) / 2;
                const plotTop = padding;
                const plotH = chartHeight;
                const axisY = chartHeight + padding;
                const peNone = kalshiMode ? 'none' : undefined;

                return (
                  <g
                    key={`candle-${index}`}
                    className={animatingCandle === index ? 'animate-pulse' : ''}
                    opacity={
                      animatingCandle === index ? 0.8 : kalshiMode ? 1 : isHovered ? 0.7 : 1
                    }
                    onMouseEnter={
                      kalshiMode
                        ? undefined
                        : () => {
                            setHoveredCandle({ index, x: xCenter, y: getPriceY(candle.close), candle });
                            setHoveredTrade(null);
                          }
                    }
                    onMouseLeave={kalshiMode ? undefined : () => setHoveredCandle(null)}
                    style={{ cursor: kalshiMode ? 'default' : 'pointer' }}
                  >
                    {kalshiMode && isOrderBookBar && (
                      <g pointerEvents="none">
                        <line
                          x1={xCenter}
                          y1={plotTop + 4}
                          x2={xCenter}
                          y2={axisY - 1}
                          stroke="#3b82f6"
                          strokeWidth={3}
                          strokeLinecap="round"
                          opacity={0.55}
                        />
                        <line
                          x1={xCenter}
                          y1={plotTop + 2}
                          x2={xCenter}
                          y2={plotTop + 10}
                          stroke="#2563eb"
                          strokeWidth={10}
                          strokeLinecap="round"
                          opacity={0.35}
                        />
                      </g>
                    )}
                    {/* Wick */}
                    <line
                      x1={xCenter}
                      y1={wickTop}
                      x2={xCenter}
                      y2={wickBottom}
                      stroke={wickColor}
                      strokeWidth={isHovered ? '2.5' : '1.5'}
                      opacity="0.9"
                      pointerEvents={peNone}
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
                        pointerEvents={peNone}
                      />
                    ) : (
                      <rect
                        x={xCenter - barWidth / 2}
                        y={bodyTop}
                        width={barWidth}
                        height={bodyHeight}
                        fill="none"
                        stroke={bodyColor}
                        strokeWidth={isHovered ? '2' : '1.5'}
                        opacity="1"
                        pointerEvents={peNone}
                      />
                    )}
                    {kalshiMode && (
                      <rect
                        x={hitX}
                        y={plotTop}
                        width={hitW}
                        height={plotH}
                        fill="transparent"
                        pointerEvents="all"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => {
                          setHoveredCandle({ index, x: xCenter, y: getPriceY(candle.close), candle });
                          setHoveredTrade(null);
                        }}
                        onMouseLeave={() => setHoveredCandle(null)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setKalshiSelectedSnapId(candle.snapId || null);
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Close-to-close smooth curve (Catmull–Rom → cubic Bézier through each close) */}
              {displayedCandles.length > 1 &&
                (() => {
                  const candleSpacing = (chartWidth * 10 - padding * 2) / displayedCandles.length;
                  const pts = displayedCandles.map((candle, index) => ({
                    x: padding + (index + 0.5) * candleSpacing,
                    y: getPriceY(candle.close),
                  }));
                  const d = closePointsToSmoothPath(pts);
                  if (!d) return null;
                  return (
                    <path
                      key="close-to-close-smooth"
                      d={d}
                      fill="none"
                      stroke={colors.chart.primary}
                      strokeWidth="2.25"
                      opacity="0.92"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  );
                })()}

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
              {trades.map((trade) => {
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

            {kalshiMode && kalshiStrikeNum != null && (() => {
              const yVb = getPriceY(kalshiStrikeNum);
              if (!Number.isFinite(yVb)) return null;
              const vbH = chartHeight + padding;
              const topPct = (yVb / vbH) * 100;
              return (
                <>
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-[5] border-t-2 border-dashed border-orange-600/90 dark:border-orange-400/90"
                    style={{ top: `${topPct}%` }}
                    aria-hidden
                  />
                  <div
                    className={`pointer-events-none absolute left-3 z-[6] max-w-[min(96vw,28rem)] rounded-md border px-2 py-1 text-xs font-semibold tabular-nums shadow-sm ${colors.surface} ${colors.border} ${colors.text}`}
                    style={{ top: `max(6px, calc(${topPct}% - 2.25rem))` }}
                  >
                    Floor strike {formatUsdTwoDecimals(kalshiStrikeNum)}
                  </div>
                </>
              );
            })()}

            {kalshiMode && volUpperNum != null && volSigmaClose != null && (() => {
              const yVb = getPriceY(volUpperNum);
              if (!Number.isFinite(yVb)) return null;
              const vbH = chartHeight + padding;
              const topPct = (yVb / vbH) * 100;
              return (
                <>
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-[4] border-t-2 border-dashed border-slate-500/90 dark:border-slate-400/90"
                    style={{ top: `${topPct}%` }}
                    aria-hidden
                  />
                  <div
                    className={`pointer-events-none absolute left-3 z-[6] max-w-[min(96vw,28rem)] rounded-md border px-2 py-1 text-xs font-semibold tabular-nums shadow-sm ${colors.surface} ${colors.border} ${colors.text}`}
                    style={{ top: `max(6px, calc(${topPct}% - 2.25rem))` }}
                  >
                    {`+1σ ${formatUsdTwoDecimals(volUpperNum)} · σ $${volSigmaClose.toFixed(2)} (15m stdev of closes)`}
                  </div>
                </>
              );
            })()}

            {kalshiMode && volLowerNum != null && volSigmaClose != null && (() => {
              const yVb = getPriceY(volLowerNum);
              if (!Number.isFinite(yVb)) return null;
              const vbH = chartHeight + padding;
              const topPct = (yVb / vbH) * 100;
              return (
                <>
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-[4] border-t-2 border-dashed border-slate-500/90 dark:border-slate-400/90"
                    style={{ top: `${topPct}%` }}
                    aria-hidden
                  />
                  <div
                    className={`pointer-events-none absolute left-3 z-[6] max-w-[min(96vw,28rem)] rounded-md border px-2 py-1 text-xs font-semibold tabular-nums shadow-sm ${colors.surface} ${colors.border} ${colors.text}`}
                    style={{ top: `max(6px, calc(${topPct}% - 2.25rem))` }}
                  >
                    {`−1σ ${formatUsdTwoDecimals(volLowerNum)} · σ $${volSigmaClose.toFixed(2)} (15m stdev of closes)`}
                  </div>
                </>
              );
            })()}

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
            </div>

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
                    {new Date(hoveredCandle.candle.date).toLocaleString('en-US', chartTimeLocale)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Open:</span>
                      <span className={`text-xs font-medium tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(hoveredCandle.candle.open)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>High:</span>
                      <span className={`text-xs font-medium tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(hoveredCandle.candle.high)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Low:</span>
                      <span className={`text-xs font-medium tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(hoveredCandle.candle.low)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>Close:</span>
                      <span className={`text-xs font-medium tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(hoveredCandle.candle.close)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className={`text-xs ${colors.textMuted}`}>
                        {kalshiMode ? 'Ticks:' : 'Volume:'}
                      </span>
                      <span className={`text-xs font-medium ${colors.text}`}>
                        {formatNum(hoveredCandle.candle.volume)}
                      </span>
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
                const maxVolume = Math.max(...displayedCandles.map((d) => d.volume), 1);
                const volumeHeight = (candle.volume / maxVolume) * 50;
                const volumeY = 50 - volumeHeight;
                const isGreen = candle.close >= candle.open;
                const vbWv = svgDimensions.viewBoxWidth || chartWidth * 10;
                const pxWv = svgDimensions.width || 0;
                const minHitVbv = pxWv > 0 ? (40 * vbWv) / pxWv : 48;
                const slotW = Math.max(1, candleSpacing - 2);
                const volHitW = Math.min(slotW, Math.max(minHitVbv, candleSpacing * 0.88));
                const volHitX = padding + index * candleSpacing + (candleSpacing - volHitW) / 2;

                return (
                  <g key={`volume-${index}`}>
                    <rect
                      x={xCenter - barWidth / 2}
                      y={volumeY}
                      width={barWidth}
                      height={volumeHeight}
                      fill={isGreen ? colors.chart.candleGreen : colors.chart.candleRed}
                      opacity="0.4"
                      pointerEvents={kalshiMode ? 'none' : undefined}
                    />
                    {kalshiMode && (
                      <rect
                        x={volHitX}
                        y={0}
                        width={volHitW}
                        height={80}
                        fill="transparent"
                        pointerEvents="all"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => {
                          setHoveredCandle({
                            index,
                            x: xCenter,
                            y: getPriceY(candle.close),
                            candle,
                          });
                          setHoveredTrade(null);
                        }}
                        onMouseLeave={() => setHoveredCandle(null)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setKalshiSelectedSnapId(candle.snapId || null);
                        }}
                      />
                    )}
                  </g>
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
                    const formatted = dateObj.toLocaleString('en-US', chartTimeLocale);
                    
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
                {kalshiMode ? 'Time (local)' : 'Time (CST)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Stats */}
      <div
        className={`mb-8 grid grid-cols-2 gap-4 ${
          kalshiMode && volSigmaClose != null ? 'md:grid-cols-5' : 'md:grid-cols-4'
        }`}
      >
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>High</p>
          <p className={`text-lg font-bold tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(highPrice)}</p>
        </div>
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>Low</p>
          <p className={`text-lg font-bold tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(lowPrice)}</p>
        </div>
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>
            {kalshiMode ? 'Tick count (sum)' : 'Volume'}
          </p>
          <p className={`text-lg font-bold ${colors.text}`}>{formatNum(totalVolume)}</p>
        </div>
        <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
          <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>Change</p>
          <p className={`text-lg font-bold ${isPositive ? `${colors.green600} ${colors.green400}` : `${colors.red600} ${colors.red400}`}`}>
            {formatPercent(priceChangePercent)}
          </p>
        </div>
        {kalshiMode && volSigmaClose != null && (
          <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
            <p className={`text-xs ${colors.textMuted} mb-1 font-medium`}>Volatility (15m)</p>
            <p className={`text-lg font-bold tabular-nums ${colors.text}`}>{formatUsdTwoDecimals(volSigmaClose)}</p>
          </div>
        )}
      </div>

      {kalshiMode && (
        <KalshiOrderBookPanel
          orderBook={activeOrderBook || {}}
          colors={colors}
          snapshotLabel={orderBookSourceCandle?.snapId || ''}
        />
      )}
    </div>
  );
};

export default Stock;
