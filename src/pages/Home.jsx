import React, { useState, useEffect, useMemo } from 'react';
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

  // Use realized_pnl directly from backend
  const totalRealizedPnL = positionStats?.realizedPnL || positionStats?.realizedPnl || 0;
  const accountBalance = (positionStats?.initialBalance || 100000) + totalRealizedPnL;
  const pnlChange = accountBalance - (positionStats?.initialBalance || 100000);

  // Helper function to format strategy name for display
  const formatStrategyName = (name) => {
    if (!name) return '';
    // Extract ticker if present (e.g., "LSTM_Strategy_A_AAPL" -> "LSTM Strategy A - AAPL")
    const parts = name.split('_');
    if (parts.length >= 3) {
      const ticker = parts[parts.length - 1];
      const strategy = parts.slice(0, -1).join(' ').replace(/([A-Z])/g, ' $1').trim();
      return `${strategy} - ${ticker}`;
    }
    return name.replace(/_/g, ' ').trim();
  };

  // Helper function to get short strategy name for tabs
  const getShortStrategyName = (name) => {
    if (!name) return '';
    const parts = name.split('_');
    if (parts.length >= 3) {
      // Return something like "LSTM - AAPL" or "MLP - TSLA"
      const ticker = parts[parts.length - 1];
      const strategyType = parts[0]; // LSTM or MLP
      return `${strategyType} - ${ticker}`;
    }
    return name.split('_')[0] || name;
  };

  return (
    <div className={`min-h-screen ${colors.background}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Strategy Tabs - Top Navigation */}
        {strategies.length > 0 && (
          <div className={`mb-8 ${colors.surface} border ${colors.border} rounded-2xl p-4 shadow-xl`}>
            <div className={`flex flex-wrap gap-2 border-b ${colors.border} pb-4 mb-4`}>
              <span className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wide self-center mr-2`}>
                Strategies:
              </span>
              {strategies.map((strategy) => (
                <button
                  key={strategy.name}
                  onClick={() => setSelectedStrategy(strategy.name)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                    selectedStrategy === strategy.name
                      ? `bg-blue-500 text-white shadow-md transform scale-105`
                      : `${colors.surfaceSecondary} ${colors.text} border ${colors.border} hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400`
                  }`}
                >
                  {getShortStrategyName(strategy.name)}
                </button>
              ))}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${colors.text} mb-1`}>
                {formatStrategyName(selectedStrategy)}
              </h2>
              <p className={`text-sm ${colors.textMuted}`}>
                {positionStats?.ticker || 'AAPL'} Trading Strategy | Real-time Performance
              </p>
            </div>
          </div>
        )}

        {/* Summary Section - Base Info */}
        <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl mb-8`}>

          {/* Key Metrics - 3 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Account Balance - Prominent */}
            <div className={`${pnlChange >= 0 ? colors.greenLight : colors.redLight} border ${pnlChange >= 0 ? colors.greenBorder : colors.redBorder} rounded-xl p-6`}>
              <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Account Balance</p>
              <p className={`text-4xl font-bold ${pnlChange >= 0 ? colors.green600 : colors.red600} ${pnlChange >= 0 ? colors.green400 : colors.red400} mb-2`}>
                {formatCurrency(accountBalance)}
              </p>
              <p className={`text-sm ${pnlChange >= 0 ? colors.green600 : colors.red600} ${pnlChange >= 0 ? colors.green400 : colors.red400}`}>
                {formatCurrency(pnlChange)}
              </p>
            </div>

            {/* Realized PnL - Total from all closed trades */}
            <div className={`${colors.surfaceSecondary} rounded-xl p-6 border ${colors.border}`}>
              <p className={`text-xs font-semibold ${colors.textMuted} uppercase tracking-wider mb-2`}>Realized PnL</p>
              <p className={`text-3xl font-bold ${totalRealizedPnL >= 0 ? colors.green600 : colors.red600} ${totalRealizedPnL >= 0 ? colors.green400 : colors.red400}`}>
                {formatCurrency(totalRealizedPnL)}
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

        {/* Content Tab Navigation */}
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
          <Overview 
            strategyName={selectedStrategy}
            historicalTrades={historicalTrades}
            positionStats={positionStats}
          />
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
