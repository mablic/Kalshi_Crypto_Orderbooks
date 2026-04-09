import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { layoutPageShellClass } from '../theme/layout';
import Stock from '../components/Stock';
import History from '../components/History';
import Overview from '../components/Overview';
import { KalshiSelectMenu } from '../components/KalshiSelectMenu';
import {
  listKalshiMarkets,
  getKalshiMarketDoc,
  getKalshiSnapshots,
  snapshotsToCandleSeries,
  getKalshiMarketHeroFields,
  buildKalshiContractHeadline,
  formatKalshiLocalDateTime,
  formatKalshiLocalDateTimeCompact,
  getKalshiExpirationRaw,
  formatStrikeTypeForUi,
} from '../../lib/kalshi';
import { trackEvent, AnalyticsEvent } from '../../lib/analytics';

const TAB_ITEMS = [
  { id: 'chart', label: 'Chart & depth' },
  { id: 'history', label: 'Snapshots' },
  { id: 'overview', label: 'Rest of info' },
];

function sortSeriesKeyList(keys) {
  return [...keys].sort((a, b) => {
    if (a === '' && b !== '') return 1;
    if (b === '' && a !== '') return -1;
    return a.localeCompare(b);
  });
}

const Home = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  const [markets, setMarkets] = useState([]);
  /** `null` until first market list is applied; then series ticker or "" if missing on doc. */
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [marketDoc, setMarketDoc] = useState(null);
  const [rawSnapshots, setRawSnapshots] = useState([]);
  const [candleData, setCandleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');

  const selectedTickerLabel = useMemo(() => {
    const m = markets.find((x) => x.docId === selectedDocId);
    return m?.ticker || selectedDocId || 'Kalshi';
  }, [markets, selectedDocId]);

  const seriesKeys = useMemo(() => {
    const u = new Set(markets.map((m) => m.seriesTicker ?? ''));
    return sortSeriesKeyList([...u]);
  }, [markets]);

  const seriesOptions = useMemo(
    () =>
      seriesKeys.map((sk) => ({
        value: sk,
        label: sk === '' ? 'No series ticker' : sk,
      })),
    [seriesKeys]
  );

  const marketsInSelectedSeries = useMemo(() => {
    if (selectedSeriesKey === null) return [];
    return markets.filter((m) => (m.seriesTicker ?? '') === selectedSeriesKey);
  }, [markets, selectedSeriesKey]);

  const tickerOptions = useMemo(
    () =>
      marketsInSelectedSeries.map((m) => {
        const expLocal = formatKalshiLocalDateTimeCompact(getKalshiExpirationRaw(m.data));
        return {
          value: m.docId,
          label: expLocal ? `${expLocal}: ${m.ticker}` : m.ticker,
        };
      }),
    [marketsInSelectedSeries]
  );

  const heroFields = useMemo(() => getKalshiMarketHeroFields(marketDoc), [marketDoc]);

  const contractHeadline = useMemo(
    () => buildKalshiContractHeadline(marketDoc, heroFields),
    [marketDoc, heroFields]
  );

  const expirationLocalLabel = useMemo(() => {
    const raw = getKalshiExpirationRaw(marketDoc);
    return formatKalshiLocalDateTime(raw);
  }, [marketDoc]);

  const strikeTypeLabel = useMemo(
    () => formatStrikeTypeForUi(heroFields.strikeType, heroFields.rulesPrimary, heroFields.rulesSecondary),
    [heroFields.strikeType, heroFields.rulesPrimary, heroFields.rulesSecondary]
  );

  const floorStrikeDisplay = useMemo(() => {
    const n = heroFields.floorStrike;
    if (n == null || !Number.isFinite(n)) return '';
    const abs = Math.abs(n);
    const opts =
      abs >= 1
        ? { minimumFractionDigits: 2, maximumFractionDigits: 4 }
        : { minimumFractionDigits: 4, maximumFractionDigits: 6 };
    return `$${n.toLocaleString('en-US', opts)}`;
  }, [heroFields.floorStrike]);

  const volumeFpDisplay = useMemo(() => {
    const n = heroFields.volumeFp;
    if (n == null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
  }, [heroFields.volumeFp]);

  const loadMarkets = useCallback(async () => {
    try {
      const list = await listKalshiMarkets();
      setMarkets(list);
      if (list.length === 0) {
        setSelectedSeriesKey(null);
        setSelectedDocId('');
        return;
      }
      const codes = sortSeriesKeyList([...new Set(list.map((m) => m.seriesTicker ?? ''))]);
      setSelectedSeriesKey((prev) => {
        if (prev != null && codes.includes(prev)) return prev;
        if (codes.includes('KXBNB15M')) return 'KXBNB15M';
        return codes[0] ?? '';
      });
    } catch (e) {
      console.error('Error loading Kalshi markets:', e);
      setMarkets([]);
      setSelectedSeriesKey(null);
      setSelectedDocId('');
    }
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    if (markets.length === 0 || selectedSeriesKey === null) return;
    const list = markets.filter((m) => (m.seriesTicker ?? '') === selectedSeriesKey);
    setSelectedDocId((prev) => {
      if (list.some((x) => x.docId === prev)) return prev;
      return list[0]?.docId ?? '';
    });
  }, [markets, selectedSeriesKey]);

  useEffect(() => {
    if (!selectedDocId) {
      setMarketDoc(null);
      setRawSnapshots([]);
      setCandleData([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async (showSpinner) => {
      try {
        if (showSpinner) setLoading(true);
        const [docData, snaps] = await Promise.all([
          getKalshiMarketDoc(selectedDocId),
          getKalshiSnapshots(selectedDocId, 200),
        ]);
        if (cancelled) return;
        setMarketDoc(docData);
        setRawSnapshots(snaps);
        setCandleData(snapshotsToCandleSeries(snaps));
      } catch (e) {
        console.error('Error loading Kalshi ticker data:', e);
        if (!cancelled) {
          setMarketDoc(null);
          setRawSnapshots([]);
          setCandleData([]);
        }
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };

    load(true);
    const intervalId = setInterval(() => load(false), 60000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedDocId]);

  useEffect(() => {
    if (selectedSeriesKey === null) return;
    trackEvent(AnalyticsEvent.KALSHI_SERIES_SELECTED, {
      series_key: String(selectedSeriesKey),
    });
  }, [selectedSeriesKey]);

  useEffect(() => {
    if (!selectedDocId) return;
    trackEvent(AnalyticsEvent.KALSHI_TICKER_SELECTED, { doc_id: selectedDocId });
  }, [selectedDocId]);

  useEffect(() => {
    trackEvent(AnalyticsEvent.KALSHI_TAB_CHANGED, { tab_id: activeTab });
  }, [activeTab]);

  const shellCard =
    `${colors.surface} border ${colors.border} rounded-2xl shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10`;

  const seriesValue = selectedSeriesKey === null ? '' : selectedSeriesKey;

  return (
    <div className={`min-h-screen ${colors.background}`}>
      <div className={`${layoutPageShellClass} py-8 lg:py-10`}>
        <section className={`${shellCard} overflow-hidden mb-6 lg:mb-8`}>
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" aria-hidden />
          <div className="p-6 sm:p-8 lg:p-10 space-y-8 lg:space-y-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                  Selected market
                </p>
                <p className={`text-sm font-semibold ${colors.textMuted}`}>{selectedTickerLabel}</p>
                {contractHeadline ? (
                  <h1
                    className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ${colors.text} break-words leading-snug`}
                  >
                    {contractHeadline}
                  </h1>
                ) : (
                  <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight ${colors.text} break-words`}>
                    {heroFields.title?.trim() || selectedTickerLabel}
                  </h1>
                )}
              </div>
              <div
                className={`flex shrink-0 items-center gap-2 self-start rounded-full border px-4 py-2 text-xs font-semibold ${colors.border} ${colors.surfaceSecondary} ${colors.textMuted}`}
              >
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live · 60s refresh
                {loading && <span className="ml-1 text-[10px] font-medium opacity-80">(updating)</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:gap-8">
              <KalshiSelectMenu
                id="kalshi-series"
                label="Series"
                value={seriesValue}
                options={seriesOptions}
                onChange={setSelectedSeriesKey}
                disabled={markets.length === 0}
                emptyMessage="No markets in Firestore"
                colors={colors}
              />
              <KalshiSelectMenu
                id="kalshi-ticker"
                label="Market ticker"
                value={selectedDocId}
                options={tickerOptions}
                onChange={setSelectedDocId}
                disabled={markets.length === 0 || marketsInSelectedSeries.length === 0}
                emptyMessage="No tickers in this series"
                colors={colors}
              />
            </div>

            {markets.length === 0 && !loading && (
              <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
                Run the Kalshi data feed so documents appear under the{' '}
                <code className="rounded-md bg-slate-200/90 px-1.5 py-0.5 text-xs dark:bg-slate-700/90">
                  kalshi
                </code>{' '}
                collection.
              </p>
            )}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
              <div className="flex w-full shrink-0 lg:w-[min(100%,20rem)]">
                <div
                  className={`flex h-full min-h-0 w-full flex-col rounded-xl border-2 ${colors.border} ${colors.surface} px-5 py-4 shadow-sm divide-y ${colors.border}`}
                >
                  <div className="pb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.14em] ${colors.textMuted}`}
                    >
                      Floor strike
                    </span>
                    <span
                      className={`mt-1.5 block text-lg font-bold tabular-nums tracking-tight ${colors.text}`}
                    >
                      {floorStrikeDisplay ? (
                        floorStrikeDisplay
                      ) : (
                        <span className={colors.textMuted}>—</span>
                      )}
                    </span>
                  </div>
                  <div className="py-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.14em] ${colors.textMuted}`}
                    >
                      Expires (your time)
                    </span>
                    <span className={`mt-1.5 block text-sm font-semibold leading-snug ${colors.text}`}>
                      {expirationLocalLabel ? (
                        expirationLocalLabel
                      ) : (
                        <span className={colors.textMuted}>—</span>
                      )}
                    </span>
                  </div>
                  <div className="py-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.14em] ${colors.textMuted}`}
                    >
                      Strike type
                    </span>
                    <span className={`mt-1.5 block text-sm font-semibold ${colors.text}`}>
                      {strikeTypeLabel ? (
                        strikeTypeLabel
                      ) : (
                        <span className={colors.textMuted}>—</span>
                      )}
                    </span>
                  </div>
                  <div className="pt-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.14em] ${colors.textMuted}`}
                    >
                      Volume (FP)
                    </span>
                    <span
                      className={`mt-1.5 block text-lg font-bold tabular-nums tracking-tight ${colors.text}`}
                    >
                      {volumeFpDisplay}
                    </span>
                  </div>
                  {heroFields.expirationValue ? (
                    <div className="pt-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${colors.textMuted}`}
                      >
                        Expiration value
                      </span>
                      <span
                        className={`mt-1.5 block text-base font-semibold tabular-nums ${colors.text}`}
                      >
                        <span className={`mr-0.5 text-sm ${colors.textMuted}`}>$</span>
                        {heroFields.expirationValue.replace(/^\$/, '')}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border ${colors.border} ${colors.surface} shadow-sm`}
              >
                <div
                  className={`shrink-0 border-b ${colors.border} px-5 py-3.5 sm:px-6 ${colors.surfaceSecondary}`}
                >
                  <h2 className={`text-xs font-bold uppercase tracking-[0.12em] ${colors.textMuted}`}>
                    Market rules
                  </h2>
                  <p className={`mt-0.5 text-xs ${colors.textMuted}`}>
                    How this contract resolves and which price index applies.
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <div className="space-y-5">
                    <section>
                      <h3
                        className={`mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400`}
                      >
                        Resolution
                      </h3>
                      <p className={`text-sm leading-relaxed sm:text-[15px] ${colors.text}`}>
                        {heroFields.rulesPrimary || (
                          <span className={colors.textMuted}>No resolution rule on this market document.</span>
                        )}
                      </p>
                    </section>
                    <div className={`h-px w-full ${colors.border}`} aria-hidden />
                    <section>
                      <h3
                        className={`mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400`}
                      >
                        Price data & final value
                      </h3>
                      <p className={`text-sm leading-relaxed sm:text-[15px] ${colors.text}`}>
                        {heroFields.rulesSecondary || (
                          <span className={colors.textMuted}>
                            No price-method notes on this market document.
                          </span>
                        )}
                      </p>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <nav
          className={`mb-6 lg:mb-8 flex flex-wrap p-1 rounded-xl border ${colors.border} ${colors.surfaceSecondary} w-fit gap-0.5`}
          aria-label="View"
        >
          {TAB_ITEMS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                  ${
                    active
                      ? `${colors.surface} text-blue-600 dark:text-blue-400 shadow-sm border ${colors.border}`
                      : `${colors.textMuted} hover:text-slate-800 dark:hover:text-slate-200`
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="pb-12">
          {activeTab === 'overview' && (
            <Overview
              kalshiMode
              kalshiMarket={marketDoc}
              kalshiTickerLabel={selectedTickerLabel}
              kalshiSnapshotCount={rawSnapshots.length}
            />
          )}

          {activeTab === 'chart' && (
            <Stock
              kalshiMode
              candleData={candleData}
              positionStats={{
                ticker: selectedTickerLabel,
                snapshotCount: rawSnapshots.length,
                kalshiFloorStrike: heroFields.floorStrike,
              }}
              loading={loading}
              strategyName=""
            />
          )}

          {activeTab === 'history' && (
            <History kalshiMode kalshiSnapshots={rawSnapshots} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
