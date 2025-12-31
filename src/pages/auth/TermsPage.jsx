import React from 'react';
import { useTheme, themeConfig } from '../../theme/theme';

const TermsPage = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <div className={`min-h-screen ${colors.background} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-4xl mx-auto">
        <div className={`${colors.surface} border ${colors.border} rounded-xl p-8 md:p-12`}>
          <h1 className={`text-3xl font-bold ${colors.text} mb-6`}>
            Terms of Service
          </h1>
          
          <div className="space-y-6">
            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Service Description
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                Your AI Trade Partner provides AI-powered portfolio analysis and insights. The service 
                helps you understand your portfolio through daily analysis, risk assessments, and 
                market insights. This service is designed to assist you in making informed decisions, 
                not to provide investment advice.
              </p>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Not Investment Advice
              </h2>
              <div className={`${colors.surfaceSecondary} border ${colors.border} rounded-lg p-4`}>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  <strong className={colors.text}>The insights and recommendations provided are for informational purposes only 
                  and do not constitute financial, investment, or trading advice.</strong> All trading 
                  decisions are made at your own discretion and risk.
                </p>
              </div>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                No Responsibility for Losses
              </h2>
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
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                AI Limitations
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                While our AI system uses advanced algorithms and market data, it cannot predict market 
                movements with certainty. Market conditions are volatile and unpredictable. Always conduct 
                your own research and consult with qualified financial advisors before making significant 
                investment decisions.
              </p>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Your Responsibility
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                You are solely responsible for all trading decisions, including the decision to follow 
                or ignore any recommendations provided by the AI. You should never invest more than you 
                can afford to lose and should always maintain a diversified portfolio appropriate for 
                your risk tolerance.
              </p>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Service Availability
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                We strive to provide continuous service availability but do not guarantee uninterrupted 
                access. The service may be temporarily unavailable due to maintenance, updates, or 
                unforeseen circumstances.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;

