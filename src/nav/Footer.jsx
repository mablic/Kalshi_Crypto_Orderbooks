import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme, themeConfig } from '../theme/theme';

const Footer = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <footer className={`${colors.surface} border-t ${colors.border} mt-auto`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-10 h-10 ${colors.accentBg} rounded-lg flex items-center justify-center`}>
                <span className={`${colors.accentText} font-bold text-lg`}>Q</span>
              </div>
              <div>
                <h3 className={`text-lg font-bold ${colors.text}`}>Auto Trading</h3>
                <p className={`text-xs ${colors.textMuted}`}>Automated Trading Platform</p>
              </div>
            </div>
            <p className={`${colors.textMuted} text-sm leading-relaxed max-w-md`}>
              Automated trading powered by advanced AI and machine learning algorithms. 
              Execute trades automatically based on intelligent market analysis.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={`text-sm font-semibold ${colors.text} mb-4 uppercase tracking-wider`}>
              Navigation
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className={`text-sm ${colors.textMuted} hover:${colors.text} transition-colors duration-200`}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className={`text-sm ${colors.textMuted} hover:${colors.text} transition-colors duration-200`}
                >
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Section */}
        <div className={`pt-8 border-t ${colors.border} mb-6`}>
          <div className="flex items-start space-x-3">
            <svg className={`w-5 h-5 ${colors.accent} mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
                <span className={`font-semibold ${colors.text}`}>Please Note:</span> This is not investment advice. 
                We're here to help you better understand your portfolio through AI-powered analysis and insights. 
                Your AI Trade Partner does not take responsibility for trading losses.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`pt-6 border-t ${colors.border}`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className={`text-sm ${colors.textMuted}`}>
                © {new Date().getFullYear()} AI Auto Trading. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

