import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Strategy data - can be fetched from Firebase or use local data
const STRATEGY_DATA = {
  LSTM_Strategy_A: {
    title: "Multi-Model LSTM Ensemble with Monte Carlo Optimization",
    shortDescription: "Three LSTM models with majority voting for robust trading signals",
    overview: "This strategy employs an ensemble of three Long Short-Term Memory (LSTM) neural networks to predict short-term directional price movements in a given stock. The core objective is to generate a binary signal: BUY if the model forecasts a price increase, or SELL (or hold/exit) otherwise. The final trading decision is made through a majority voting mechanism across the independently trained models.",
    modelArchitecture: {
      description: "Each LSTM model is built with the following PyTorch-inspired structure utilizing recurrent neural networks to capture temporal dependencies.",
      components: [
        {
          name: "LSTM Layer",
          details: "nn.LSTM(input_size, hidden_size, batch_first=True) - Captures temporal dependencies in multivariate time series"
        },
        {
          name: "Fully Connected Output",
          details: "nn.Linear(hidden_size, 1) - Maps hidden state to prediction"
        },
        {
          name: "Sigmoid Activation",
          details: "Outputs probability between 0 and 1 for price increase prediction"
        },
        {
          name: "Input Features",
          details: "Moving Averages (MA ratios), Trading Volume (normalized), Recent Win/Loss Profile"
        }
      ]
    },
    ensembleVoting: "A trade is executed only when at least two out of the three models agree on a BUY signal. This conservative, consensus-based approach aims to filter out false positives and enhance signal reliability.",
    modelSelection: {
      steps: [
        {
          name: "Candidate Generation",
          description: "Numerous model instances are trained with variations in hyperparameters (lookback period, hidden layer size, feature combinations)"
        },
        {
          name: "Performance Screening",
          description: "All candidates are tested on historical data. Top 3 selected based on highest risk-adjusted returns (Sharpe Ratio)"
        },
        {
          name: "Robustness Validation",
          description: "Shortlisted models undergo Monte Carlo simulations with thousands of market paths to evaluate stability"
        }
      ]
    },
    tradingFlow: [
      {
        name: "Data Streaming",
        description: "Real-time or daily input features (MA, Volume, Win/Loss) are fed into the three selected LSTM models"
      },
      {
        name: "Independent Signal Generation",
        description: "Each model outputs its own BUY/SELL prediction independently"
      },
      {
        name: "Majority Vote",
        description: "If ≥2 models signal BUY, a long position is initiated/held. Otherwise, close position or adopt short/neutral stance"
      },
      {
        name: "Continuous Monitoring",
        description: "Models are periodically retrained and ensemble performance is re-evaluated to adapt to market regimes"
      }
    ],
    advantages: [
      {
        title: "Reduced Overfitting",
        description: "The ensemble method and Monte Carlo validation mitigate the risk of curve-fitting"
      },
      {
        title: "Dynamic Adaptation",
        description: "LSTMs capture complex, non-linear temporal dependencies in market data"
      },
      {
        title: "Risk-Managed Decision Making",
        description: "Majority-vote rule and focus on low-std models prioritize capital preservation"
      },
      {
        title: "Data-Driven Model Choice",
        description: "Objective selection via simulation avoids subjective bias in model picking"
      }
    ]
  }
};

/**
 * Insert strategy data into Firestore
 * @param {string} documentName - Document name in Firestore (e.g., 'LSTM_Strategy_A_AAPL')
 * @param {Object} strategyData - Strategy data object to insert
 * @returns {Promise<boolean>} Success status
 */
export const insertStrategyData = async (documentName = 'LSTM_Strategy_A_AAPL', strategyData = null) => {
  try {
    // Use provided data or default to LSTM_Strategy_A data
    const dataToInsert = strategyData || STRATEGY_DATA.LSTM_Strategy_A;
    
    const docRef = doc(db, 'strategies', documentName);
    await setDoc(docRef, dataToInsert);
    
    console.log(`✅ Successfully inserted strategy data: ${documentName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error inserting strategy data (${documentName}):`, error);
    return false;
  }
};

/**
 * Get strategy details from Firestore (backend)
 * @param {string} strategyName - Strategy name (e.g., 'LSTM_Strategy_A_AAPL')
 * @returns {Promise<Object|null>} Strategy information from Firebase
 */
export const getStrategyDetails = async (strategyName) => {
  try {
    // Fetch from Firebase backend
    const docRef = doc(db, 'strategies', strategyName);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // If not found in Firebase, return null (don't fall back to local data)
    console.warn(`⚠️ Strategy '${strategyName}' not found in Firebase`);
    return null;
  } catch (error) {
    console.error('❌ Error fetching strategy details from Firebase:', error);
    return null;
  }
};

