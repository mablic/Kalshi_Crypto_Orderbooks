import React from 'react';
import { useTheme, themeConfig } from '../../../theme/theme';

const Terms = ({ isOpen, onClose, onAgree }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  if (!isOpen) return null;

  const handleAgree = () => {
    onAgree();
    onClose();
  };

  return (
    <>
      {/* Blur Background */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
            <h2 className={`text-2xl font-bold ${colors.text}`}>
              Terms of Service
            </h2>
            <button
              onClick={onClose}
              className={`p-2 ${colors.textMuted} hover:${colors.text} rounded-lg hover:${colors.surfaceSecondary} transition-colors`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-6 md:p-8">
            <div className="space-y-6">
              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Service Description
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  Your AI Trade Partner provides AI-powered portfolio analysis and insights. The service 
                  helps you understand your portfolio through daily analysis, risk assessments, and 
                  market insights. This service is designed to assist you in making informed decisions, 
                  not to provide investment advice.
                </p>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Not Investment Advice
                </h3>
                <div className={`${colors.surfaceSecondary} border ${colors.border} rounded-lg p-4`}>
                  <p className={`${colors.textMuted} leading-relaxed`}>
                    <strong className={colors.text}>The insights and recommendations provided are for informational purposes only 
                    and do not constitute financial, investment, or trading advice.</strong> All trading 
                    decisions are made at your own discretion and risk.
                  </p>
                </div>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  No Responsibility for Losses
                </h3>
                <div className={`${colors.surfaceSecondary} border ${colors.border} rounded-lg p-4`}>
                  <p className={`${colors.textMuted} leading-relaxed`}>
                    <strong className={colors.text}>Your AI Trade Partner does not take any responsibility for trading losses.</strong> 
                    All investment decisions and their outcomes are solely your responsibility. Past performance 
                    and AI-generated insights do not guarantee future results. Trading involves substantial risk 
                    of loss and is not suitable for all investors.
                  </p>
                </div>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  AI Limitations
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  While our AI system uses advanced algorithms and market data, it cannot predict market 
                  movements with certainty. Market conditions are volatile and unpredictable. Always conduct 
                  your own research and consult with qualified financial advisors before making significant 
                  investment decisions.
                </p>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Your Responsibility
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  You are solely responsible for all trading decisions, including the decision to follow 
                  or ignore any recommendations provided by the AI. You should never invest more than you 
                  can afford to lose and should always maintain a diversified portfolio appropriate for 
                  your risk tolerance.
                </p>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Service Availability
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  We strive to provide continuous service availability but do not guarantee uninterrupted 
                  access. The service may be temporarily unavailable due to maintenance, updates, or 
                  unforeseen circumstances.
                </p>
              </section>
            </div>
          </div>

          {/* Footer with Agree Button */}
          <div className={`flex items-center justify-end gap-4 p-6 border-t ${colors.border}`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 border ${colors.border} ${colors.text} font-medium rounded-lg hover:${colors.surfaceSecondary} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleAgree}
              className={`px-6 py-2 ${colors.accentBg} text-white font-medium rounded-lg hover:shadow-md transition-all duration-200`}
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terms;

