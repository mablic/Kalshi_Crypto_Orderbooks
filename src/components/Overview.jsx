import React, { useState, useEffect } from 'react';
import { useTheme, themeConfig } from '../theme/theme';
import { getStrategyDetails } from '../../lib/strategy';

const Overview = ({ strategyName = 'LSTM_Strategy_A' }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStrategy = async () => {
      try {
        setLoading(true);
        const data = await getStrategyDetails(strategyName);
        setStrategy(data);
      } catch (error) {
        console.error('Error loading strategy:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStrategy();
  }, [strategyName]);

  if (loading) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className={`text-center py-12 ${colors.textMuted}`}>
          Loading strategy details...
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className={`${colors.surface} border ${colors.border} rounded-2xl p-8 shadow-xl`}>
        <div className={`text-center py-12 ${colors.textMuted}`}>
          Strategy details not found
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-xl`}>
      {/* Header */}
      <div className={`${colors.accentBg} rounded-t-2xl p-8`}>
        <h1 className={`text-3xl font-bold mb-3 ${colors.accentText}`}>{strategy.title || strategyName}</h1>
        <p className={`text-lg ${colors.accentText} opacity-90`}>{strategy.shortDescription || 'Advanced Trading Strategy'}</p>
      </div>

      <div className="p-8">
        {/* Overview Section */}
        {strategy.overview && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Strategy Overview</h2>
            <p className={`${colors.textSecondary} leading-relaxed`}>
              {strategy.overview}
            </p>
          </section>
        )}

        {/* Model Architecture Section */}
        {strategy.modelArchitecture && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Model Architecture</h2>
            <div className={`${colors.surfaceSecondary} rounded-lg p-6 mb-4 border ${colors.border}`}>
              <p className={`${colors.textSecondary} leading-relaxed mb-4`}>
                {strategy.modelArchitecture.description}
              </p>
              {strategy.modelArchitecture.components && (
                <div className="space-y-3">
                  {strategy.modelArchitecture.components.map((component, idx) => (
                    <div key={idx} className={`border-l-4 pl-4 py-2 ${colors.blueBorderAccent}`}>
                      <h4 className={`font-semibold ${colors.text}`}>{component.name}</h4>
                      <p className={`text-sm ${colors.textMuted}`}>{component.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Ensemble Voting Section */}
        {strategy.ensembleVoting && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Ensemble Voting Logic</h2>
            <div className={`${colors.surfaceSecondary} rounded-lg p-6 border ${colors.border}`}>
              <p className={`${colors.textSecondary} leading-relaxed`}>
                {strategy.ensembleVoting}
              </p>
            </div>
          </section>
        )}

        {/* Model Selection Section */}
        {strategy.modelSelection && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Model Selection & Optimization</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {strategy.modelSelection.steps && strategy.modelSelection.steps.map((step, idx) => (
                <div key={idx} className={`${colors.surfaceSecondary} rounded-lg p-4 border ${colors.border}`}>
                  <div className={`text-2xl font-bold ${colors.accent} mb-2`}>{idx + 1}</div>
                  <h4 className={`font-semibold ${colors.text} mb-2`}>{step.name}</h4>
                  <p className={`text-sm ${colors.textMuted}`}>{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trading Execution Flow */}
        {strategy.tradingFlow && (
          <section className="mb-10">
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Trading Execution Flow</h2>
            <div className="space-y-3">
              {strategy.tradingFlow.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colors.accentText} font-bold text-sm ${colors.accentBg}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-grow">
                    <h4 className={`font-semibold ${colors.text}`}>{step.name}</h4>
                    <p className={`text-sm ${colors.textMuted}`}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Advantages */}
        {strategy.advantages && (
          <section>
            <h2 className={`text-2xl font-bold ${colors.text} mb-4`}>Key Advantages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategy.advantages.map((advantage, idx) => (
                <div key={idx} className={`${colors.surfaceSecondary} rounded-lg p-4 border-l-4 ${colors.blueBorderAccent} border ${colors.border}`}>
                  <h4 className={`font-semibold ${colors.text} mb-2`}>{advantage.title}</h4>
                  <p className={`text-sm ${colors.textMuted}`}>{advantage.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Overview;

