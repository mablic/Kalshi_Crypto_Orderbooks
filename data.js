// Mock stock data for demonstration
export const stockData = {
  symbol: "AAPL",
  name: "Apple Inc.",
  currentPrice: 175.43,
  change: 2.34,
  changePercent: 1.35,
  volume: 45234567,
  marketCap: 2750000000000,
  
  // Price history for the last 30 days
  priceHistory: [
    { date: "2024-01-01", price: 185.92, volume: 52345678 },
    { date: "2024-01-02", price: 186.86, volume: 48912345 },
    { date: "2024-01-03", price: 185.14, volume: 51234567 },
    { date: "2024-01-04", price: 185.92, volume: 45678901 },
    { date: "2024-01-05", price: 186.40, volume: 47890123 },
    { date: "2024-01-08", price: 185.14, volume: 51234567 },
    { date: "2024-01-09", price: 185.92, volume: 45678901 },
    { date: "2024-01-10", price: 186.40, volume: 47890123 },
    { date: "2024-01-11", price: 185.14, volume: 51234567 },
    { date: "2024-01-12", price: 185.92, volume: 45678901 },
    { date: "2024-01-16", price: 186.40, volume: 47890123 },
    { date: "2024-01-17", price: 185.14, volume: 51234567 },
    { date: "2024-01-18", price: 185.92, volume: 45678901 },
    { date: "2024-01-19", price: 186.40, volume: 47890123 },
    { date: "2024-01-22", price: 185.14, volume: 51234567 },
    { date: "2024-01-23", price: 185.92, volume: 45678901 },
    { date: "2024-01-24", price: 186.40, volume: 47890123 },
    { date: "2024-01-25", price: 185.14, volume: 51234567 },
    { date: "2024-01-26", price: 185.92, volume: 45678901 },
    { date: "2024-01-29", price: 186.40, volume: 47890123 },
    { date: "2024-01-30", price: 185.14, volume: 51234567 },
    { date: "2024-01-31", price: 185.92, volume: 45678901 },
    { date: "2024-02-01", price: 186.40, volume: 47890123 },
    { date: "2024-02-02", price: 185.14, volume: 51234567 },
    { date: "2024-02-05", price: 185.92, volume: 45678901 },
    { date: "2024-02-06", price: 186.40, volume: 47890123 },
    { date: "2024-02-07", price: 185.14, volume: 51234567 },
    { date: "2024-02-08", price: 185.92, volume: 45678901 },
    { date: "2024-02-09", price: 186.40, volume: 47890123 },
    { date: "2024-02-12", price: 175.43, volume: 45234567 }
  ],
  
  // Risk metrics
  riskMetrics: {
    beta: 1.23,
    volatility: 0.28,
    sharpeRatio: 1.45,
    maxDrawdown: -0.15,
    var95: -0.08,
    expectedReturn: 0.12,
    riskRating: "Medium", // Low, Medium, High
    riskScore: 6.5 // 1-10 scale
  },
  
  // Technical indicators
  technicalIndicators: {
    rsi: 58.3,
    macd: 1.23,
    sma20: 182.45,
    sma50: 178.92,
    sma200: 165.78,
    support: 170.00,
    resistance: 190.00
  },
  
  // News sentiment
  newsSentiment: {
    positive: 65,
    neutral: 25,
    negative: 10,
    overall: "Bullish"
  }
};

// Additional stocks for comparison
export const comparisonStocks = [
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    change: -1.23,
    changePercent: -0.32,
    riskScore: 5.8
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 142.56,
    change: 0.89,
    changePercent: 0.63,
    riskScore: 7.2
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.42,
    change: 5.67,
    changePercent: 2.34,
    riskScore: 8.9
  }
];
