import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Get strategy collection data
 * @param {string} strategyName - Strategy name (e.g., 'LSTM_Strategy_A_AAPL')
 * @returns {Promise<Object>} Strategy data with positions
 */
export const getStrategyData = async (strategyName) => {
  try {
    const docRef = doc(db, 'positions', strategyName);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log(`⚠️ Strategy ${strategyName} not found`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching strategy data:', error);
    return null;
  }
};

/**
 * Get all candlestick data for a strategy
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Array>} Array of candlestick data
 */
export const getCandleData = async (strategyName) => {
  try {
    const strategyData = await getStrategyData(strategyName);
    
    if (!strategyData || !strategyData.data) {
      return [];
    }
    
    // Convert object to array and sort by date
    const candleArray = Object.entries(strategyData.data).map(([dateKey, candle]) => ({
      ...candle,
      dateKey: dateKey,
    }));
    
    // Sort by date
    candleArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return candleArray;
  } catch (error) {
    console.error('❌ Error fetching candle data:', error);
    return [];
  }
};

/**
 * Get active trades for a strategy
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Array>} Array of active trades
 */
export const getActiveTrades = async (strategyName) => {
  try {
    const candleData = await getCandleData(strategyName);
    const currentPrice = candleData.length > 0 ? candleData[candleData.length - 1].close : 0;
    
    // Filter candles with active positions (open trade_position)
    const activeTrades = candleData
      .filter(candle => candle.trade_position === 'BUY' || candle.trade_position === 'SELL')
      .map((candle, idx) => ({
        id: idx + 1,
        type: candle.trade_position === 'BUY' ? 'BUY' : 'SELL',
        entryPrice: candle.close,
        entryDate: candle.date,
        currentPrice: currentPrice,
        pnl: (currentPrice - candle.close) * 100, // Assuming 100 shares
        pnlPercent: ((currentPrice - candle.close) / candle.close * 100).toFixed(2),
        shares: 100,
      }));
    
    return activeTrades;
  } catch (error) {
    console.error('❌ Error fetching active trades:', error);
    return [];
  }
};

/**
 * Get historical/closed trades for a strategy
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Array>} Array of closed trades
 */
export const getHistoricalTrades = async (strategyName) => {
  try {
    const strategyData = await getStrategyData(strategyName);
    
    if (!strategyData || !strategyData.history_trades) {
      return [];
    }
    
    // Convert history_trades object to array and sort by date
    const trades = Object.values(strategyData.history_trades || {})
      .map((trade, idx) => ({
        id: idx,
        date: trade.date,
        type: trade.trade_position === 'BUY' ? 'LONG' : 'SHORT',
        trade_position: trade.trade_position,
        price: trade.price,
        realized_pnl: trade.realized_pnl,
        realizedPnl: trade.realized_pnl,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return trades;
  } catch (error) {
    console.error('❌ Error fetching historical trades:', error);
    return [];
  }
};

/**
 * Get all strategies from positions collection
 * @returns {Promise<Array>} Array of strategy documents with metadata
 */
export const getAllStrategies = async () => {
  try {
    const strategiesCollection = collection(db, 'positions');
    const querySnapshot = await getDocs(strategiesCollection);
    
    const strategies = [];
    querySnapshot.forEach((doc) => {
      strategies.push({
        name: doc.id,
        ticker: doc.data().ticker,
        currentPosition: doc.data().current_position,
        realizedPnL: doc.data().realized_pnl,
        initialBalance: doc.data().initial_balance,
      });
    });
    
    return strategies;
  } catch (error) {
    console.error('❌ Error fetching all strategies:', error);
    return [];
  }
};

/**
 * Get moving average parameters from strategy data
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Array>} Array of MA periods [5, 6, 7, 10, 12, 20] from params1, params2, params3
 */
export const getMAParams = async (strategyName) => {
  try {
    const strategyData = await getStrategyData(strategyName);
    
    if (!strategyData || !strategyData.params) {
      return [5, 10]; // Default values
    }
    
    // Params can be stored as params1, params2, params3 (strings)
    const params = strategyData.params;
    const maPeriods = [];
    
    // Extract first two numbers from each param (params1, params2, params3)
    if (typeof params === 'object' && params !== null) {
      // Process params1: "10,20,10" -> [10, 20]
      if (params.params1 && typeof params.params1 === 'string') {
        const values = params.params1.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        if (values.length >= 2) {
          maPeriods.push(values[0], values[1]);
        }
      }
      
      // Process params2: "5,7,10" -> [5, 7]
      if (params.params2 && typeof params.params2 === 'string') {
        const values = params.params2.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        if (values.length >= 2) {
          maPeriods.push(values[0], values[1]);
        }
      }
      
      // Process params3: "6,12,10" -> [6, 12]
      if (params.params3 && typeof params.params3 === 'string') {
        const values = params.params3.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        if (values.length >= 2) {
          maPeriods.push(values[0], values[1]);
        }
      }
    }
    
    // Remove duplicates and sort
    const uniquePeriods = [...new Set(maPeriods)].sort((a, b) => a - b);
    
    return uniquePeriods.length > 0 ? uniquePeriods : [5, 10]; // Default if none found
  } catch (error) {
    console.error('❌ Error fetching MA params:', error);
    return [5, 10]; // Default values
  }
};

/**
 * Calculate moving averages for candle data
 * @param {Array} candleData - Array of candle data
 * @param {number} period - Moving average period
 * @returns {Array} Array of moving average values
 */
export const calculateMovingAverage = (candleData, period) => {
  if (candleData.length === 0) return [];
  
  const ma = [];
  for (let i = 0; i < candleData.length; i++) {
    if (i < period - 1) {
      ma.push(null); // Not enough data points
    } else {
      const sum = candleData.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
};

/**
 * Get position stats (current position, pnl, etc.)
 * @param {string} strategyName - Strategy name
 * @returns {Promise<Object>} Position stats
 */
export const getPositionStats = async (strategyName) => {
  try {
    const strategyData = await getStrategyData(strategyName);
    
    if (!strategyData) {
      return {
        ticker: 'N/A',
        currentPosition: null,
        runningPnL: 0,
        realizedPnL: 0,
        startDate: null,
        endDate: null,
      };
    }
    
    return {
      ticker: strategyData.ticker || 'N/A',
      currentPosition: strategyData.current_position || 0,
      runningPnL: parseFloat(strategyData.running_pnl) || 0,
      realizedPnL: parseFloat(strategyData.realized_pnl) || 0,
      initialBalance: parseFloat(strategyData.initial_balance) || 100000,
      tradeSize: parseFloat(strategyData.trade_size) || 100,
      startDate: strategyData.start_date,
      endDate: strategyData.end_date,
    };
  } catch (error) {
    console.error('❌ Error fetching position stats:', error);
    return null;
  }
};
