import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme, themeConfig } from '../theme/theme';

const Nav = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const colors = themeConfig[theme];
  const location = useLocation();

  return (
    <nav className={`${colors.surface} shadow-lg border-b ${colors.border} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="flex-shrink-0">
              <img 
                src="/assets/icon.png" 
                alt="AI Trade Partner Logo" 
                className="w-10 h-10"
              />
            </div>
            <div className="hidden md:block">
              <h1 className={`text-xl font-bold ${colors.text}`}>Trade Partner</h1>
              <p className={`text-xs ${colors.textMuted}`}>Your Intelligent Trading Companion</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link
                to="/"
                className={`${location.pathname === '/' ? colors.text : colors.textSecondary} hover:${colors.accent} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${location.pathname === '/' ? 'border-b-2 border-blue-500' : ''}`}
              >
                Home
              </Link>
              <Link
                to="/about"
                className={`${location.pathname === '/about' ? colors.text : colors.textSecondary} hover:${colors.accent} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${location.pathname === '/about' ? 'border-b-2 border-blue-500' : ''}`}
              >
                About
              </Link>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className={`p-2 ${colors.textMuted} hover:${colors.text} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md transition-colors duration-200`}
              title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            >
              {isDark ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className={`inline-flex items-center justify-center p-2 rounded-md ${colors.textMuted} hover:${colors.text} hover:${colors.surfaceSecondary} focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 ${colors.surfaceSecondary}`}>
          <Link
            to="/"
            className={`${location.pathname === '/' ? colors.text : colors.textSecondary} hover:${colors.text} block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200`}
          >
            Home
          </Link>
          <Link
            to="/about"
            className={`${location.pathname === '/about' ? colors.text : colors.textSecondary} hover:${colors.text} block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200`}
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
