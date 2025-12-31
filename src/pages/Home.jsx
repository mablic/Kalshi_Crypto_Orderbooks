import React, { useState, useEffect } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import Stock from '../components/Stock';
import History from '../components/History';
import Overview from '../components/Overview';
import { getCandleData, getHistoricalTrades, getPositionStats, getAllStrategies } from '../../lib/position';

const Home = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const [candleData, setCandleData] = useState([]);
  const [historicalTrades, setHistoricalTrades] = useState([]);
  const [positionStats, setPositionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState('LSTM_Strategy_A_AAPL');

  // Fetch all strategies on mount
  useEffect(() => {
    const loadStrategies = async () => {
      const allStrategies = await getAllStrategies();
      setStrategies(allStrategies);
      if (allStrategies.length > 0 && !allStrategies.find(s => s.name === selectedStrategy)) {
        setSelectedStrategy(allStrategies[0].name);
      }
    };
    loadStrategies();
  }, []);

  // Fetch position data for selected strategy
  useEffect(() => {
    let isInitialLoad = true;
    
    const loadPositionData = async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        const candles = await getCandleData(selectedStrategy);
        const trades = await getHistoricalTrades(selectedStrategy);
        const stats = await getPositionStats(selectedStrategy);
        
        setCandleData(candles);
        setHistoricalTrades(trades);
        setPositionStats(stats);
      } catch (error) {
        console.error('Error loading position data:', error);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };
    
    if (selectedStrategy) {
      // Initial load with loading state
      loadPositionData(true);
      isInitialLoad = false;
      
      // Set up polling to refresh data every 1 minute (without showing loading spinner)
      const intervalId = setInterval(() => {
        loadPositionData(false);
      }, 60000); // 60 seconds (1 minute)
      
      // Cleanup interval on unmount or strategy change
      return () => clearInterval(intervalId);
    }
  }, [selectedStrategy]);

  // Format currency
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  const accountBalance = (positionStats?.initialBalance || 100000) + (positionStats?.realizedPnL || 0);
  const pnlChange = accountBalance - (positionStats?.initialBalance || 100000);

  return (
    <div className={`min-h-screen ${colors.background}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Summary Section - Base Info */}
        <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl mb-8`}>
          {/* Header with Strategy Selector */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className={`text-3xl font-bold ${colors.text}`}>
                {selectedStrategy}
              </h2>
              <p className={`text-sm ${colors.textMuted} mt-2`}>
                {positionStats?.ticker || 'AAPL'} Trading Strategy | Real-time Performance
              </p>
            </div>
            
            {/* Strategy Selector Dropdown */}
            {strategies.length > 0 && (
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wide`}>Select Strategy</label>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className={`px-4 py-2 rounded-lg text-sm border ${colors.border} ${colors.surface} ${colors.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  {strategies.map((strategy) => (
                    <option key={strategy.name} value={strategy.name}>
                      {strategy.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Key Metrics - 3 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Account Balance - Prominent */}
            <div className={`${pnlChange >= 0 ? colors.greenLight : colors.redLight} border ${pnlChange >= 0 ? colors.greenBorder : colors.redBorder} rounded-xl p-6`}>
              <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Account Balance</p>
              <p className={`text-4xl font-bold ${pnlChange >= 0 ? colors.green600 : colors.red600} ${pnlChange >= 0 ? colors.green400 : colors.red400} mb-2`}>
                {formatCurrency(accountBalance)}
              </p>
              <p className={`text-sm ${pnlChange >= 0 ? colors.green600 : colors.red600} ${pnlChange >= 0 ? colors.green400 : colors.red400}`}>
                {pnlChange >= 0 ? '+' : ''}{formatCurrency(pnlChange)}
              </p>
            </div>

            {/* Realized PnL */}
            <div className={`${colors.surfaceSecondary} rounded-xl p-6 border ${colors.border}`}>
              <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Realized PnL</p>
              <p className={`text-3xl font-bold ${(positionStats?.realizedPnL || 0) >= 0 ? colors.green600 : colors.red600} ${(positionStats?.realizedPnL || 0) >= 0 ? colors.green400 : colors.red400}`}>
                {formatCurrency(positionStats?.realizedPnL || 0)}
              </p>
            </div>

            {/* Running PnL */}
            <div className={`${colors.surfaceSecondary} rounded-xl p-6 border ${colors.border}`}>
              <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Running PnL</p>
              <p className={`text-3xl font-bold ${(positionStats?.runningPnL || 0) >= 0 ? colors.green600 : colors.red600} ${(positionStats?.runningPnL || 0) >= 0 ? colors.green400 : colors.red400}`}>
                {formatCurrency(positionStats?.runningPnL || 0)}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Initial Balance</p>
              <p className={`text-lg font-bold ${colors.text}`}>
                {formatCurrency(positionStats?.initialBalance || 100000)}
              </p>
            </div>
            <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Trade Size</p>
              <p className={`text-lg font-bold ${colors.text}`}>
                {positionStats?.tradeSize || 1} shares
              </p>
            </div>
            <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Current Position</p>
              <p className={`text-lg font-bold ${colors.text}`}>
                {positionStats?.currentPosition || '—'}
              </p>
            </div>
            <div className={`${colors.surfaceSecondary} rounded-lg p-4`}>
              <p className={`text-xs ${colors.textMuted} mb-2 font-medium`}>Ticker</p>
              <p className={`text-lg font-bold ${colors.text}`}>
                {positionStats?.ticker || 'AAPL'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`mb-8 flex gap-4 border-b ${colors.border}`}>
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'chart'
                ? `border-b-2 border-blue-500 text-blue-600 dark:text-blue-400`
                : `${colors.textMuted} hover:${colors.text}`
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Chart
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'history'
                ? `border-b-2 border-blue-500 text-blue-600 dark:text-blue-400`
                : `${colors.textMuted} hover:${colors.text}`
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Trade History
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'overview'
                ? `border-b-2 border-blue-500 text-blue-600 dark:text-blue-400`
                : `${colors.textMuted} hover:${colors.text}`
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Overview
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <Overview strategyName={selectedStrategy} />
        )}

        {/* Chart Tab */}
        {activeTab === 'chart' && (
          <Stock 
            candleData={candleData}
            historicalTrades={historicalTrades}
            positionStats={positionStats}
            loading={loading}
            strategyName={selectedStrategy}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <History 
            historicalTrades={historicalTrades}
            initialBalance={positionStats?.initialBalance || 100000}
            loading={loading}
            positionStats={positionStats}
            candleData={candleData}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
