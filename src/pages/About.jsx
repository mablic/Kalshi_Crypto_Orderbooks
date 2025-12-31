import React from 'react';
import { useTheme, themeConfig } from '../theme/theme';

const About = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <div className={`min-h-screen ${colors.background}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-5xl font-bold ${colors.text} mb-6 tracking-tight`}>
            AI Auto Trading Platform
          </h1>
          <p className={`text-xl ${colors.textMuted} max-w-3xl mx-auto leading-relaxed`}>
            Automated trading powered by advanced AI and machine learning algorithms. 
            Execute trades automatically based on intelligent market analysis.
          </p>
        </div>

        {/* Main Content */}
        <div className={`${colors.surface} border ${colors.border} rounded-xl p-8 md:p-10 mb-12`}>
          <div className="flex items-center mb-6">
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mr-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold ${colors.text}`}>
              What We Do
            </h2>
          </div>
          <div className="space-y-4">
            <p className={`${colors.textMuted} leading-relaxed text-lg`}>
              Our AI auto trading platform uses advanced machine learning models, including LSTM neural networks, 
              to analyze market data and execute trades automatically. The system continuously monitors market 
              conditions, identifies trading opportunities, and executes buy/sell signals based on sophisticated 
              ensemble voting mechanisms.
            </p>
            <p className={`${colors.textMuted} leading-relaxed`}>
              The platform employs multiple AI models that work together through majority voting to ensure 
              reliable and robust trading decisions. Each model is trained on historical data and optimized 
              using Monte Carlo simulations to maximize performance while managing risk.
            </p>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`${colors.surface} border ${colors.border} rounded-xl p-6 text-center`}>
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>AI-Powered</h3>
            <p className={`text-sm ${colors.textMuted}`}>
              Advanced LSTM neural networks and ensemble models for intelligent trading decisions
            </p>
          </div>
          <div className={`${colors.surface} border ${colors.border} rounded-xl p-6 text-center`}>
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>24/7 Trading</h3>
            <p className={`text-sm ${colors.textMuted}`}>
              Continuous market monitoring and automatic trade execution around the clock
            </p>
          </div>
          <div className={`${colors.surface} border ${colors.border} rounded-xl p-6 text-center`}>
            <div className={`${colors.accentBg} text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>Risk Managed</h3>
            <p className={`text-sm ${colors.textMuted}`}>
              Built-in risk management with ensemble voting and Monte Carlo optimization
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={`${colors.surface} border ${colors.border} rounded-xl p-8`}>
          <div className="flex items-start space-x-4">
            <div className="text-amber-500 flex-shrink-0 mt-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                Important Disclaimer
              </h3>
              <p className={`${colors.textMuted} leading-relaxed mb-3`}>
                This platform is for informational and educational purposes only. Automated trading involves 
                substantial risk of loss and is not suitable for all investors. Past performance does not 
                guarantee future results. You may lose money trading securities.
              </p>
              <p className={`${colors.textMuted} leading-relaxed`}>
                We do not provide financial, investment, or trading advice. All trading decisions and their 
                outcomes are solely your responsibility. Always conduct your own research and consult with 
                qualified financial advisors before making investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

