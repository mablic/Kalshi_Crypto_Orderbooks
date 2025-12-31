import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme configuration
export const themeConfig = {
  light: {
    background: 'bg-slate-50',
    surface: 'bg-white',
    surfaceSecondary: 'bg-slate-100',
    border: 'border-slate-200',
    borderSecondary: 'border-slate-100',
    text: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-500',
    accent: 'text-blue-600',
    accentBg: 'bg-blue-600',
    accentText: 'text-white',
    blueBorderAccent: 'border-blue-600',
    success: 'text-emerald-600',
    successBg: 'bg-emerald-100',
    warning: 'text-amber-600',
    warningBg: 'bg-amber-100',
    danger: 'text-red-600',
    dangerBg: 'bg-red-100',
    green500: 'bg-green-500',
    green600: 'text-green-600',
    green400: 'dark:text-green-400',
    green700: 'text-green-700',
    green300: 'dark:text-green-300',
    greenLight: 'bg-green-500/5',
    greenBorder: 'border-green-500/30',
    greenBadge: 'bg-green-500/20',
    red500: 'bg-red-500',
    red600: 'text-red-600',
    red400: 'dark:text-red-400',
    red700: 'text-red-700',
    red300: 'dark:text-red-300',
    redLight: 'bg-red-500/5',
    redBorder: 'border-red-500/30',
    redBadge: 'bg-red-500/20',
    blue500: 'bg-blue-500',
    blue600: 'text-blue-600',
    blue400: 'dark:text-blue-400',
    blue700: 'text-blue-700',
    blue300: 'dark:text-blue-300',
    blueLight: 'bg-blue-500/5',
    blueBorder: 'border-blue-500/30',
    blueBadge: 'bg-blue-500/20',
    orange500: 'bg-orange-500',
    orange600: 'text-orange-600',
    orange400: 'dark:text-orange-400',
    orange700: 'text-orange-700',
    orange300: 'dark:text-orange-300',
    orangeLight: 'bg-orange-500/5',
    orangeBorder: 'border-orange-500/30',
    orangeBadge: 'bg-orange-500/20',
    chart: {
      primary: '#3b82f6',
      background: 'rgba(59, 130, 246, 0.05)',
      grid: 'rgba(148, 163, 184, 0.1)',
      text: '#64748b',
      candleGreen: '#10b981',
      candleRed: '#ef4444',
      entryLong: '#3b82f6',
      entryShort: '#f97316',
      exitProfit: '#10b981',
      exitLoss: '#ef4444',
      maColors: [
        '#2563eb', // bright blue
        '#dc2626', // bright red
        '#16a34a', // bright green
        '#ca8a04', // bright yellow/amber
        '#9333ea', // bright purple
        '#ea580c', // bright orange
      ]
    },
    svg: {
      surface: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b'
    }
  },
  dark: {
    background: 'bg-slate-950',
    surface: 'bg-slate-900',
    surfaceSecondary: 'bg-slate-800',
    border: 'border-slate-800',
    borderSecondary: 'border-slate-700',
    text: 'text-white',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-600',
    accentText: 'text-white',
    blueBorderAccent: 'border-blue-400',
    success: 'text-emerald-400',
    successBg: 'bg-emerald-500/10',
    warning: 'text-amber-400',
    warningBg: 'bg-amber-500/10',
    danger: 'text-rose-400',
    dangerBg: 'bg-rose-500/10',
    green500: 'bg-green-500',
    green600: 'text-green-600',
    green400: 'dark:text-green-400',
    green700: 'text-green-700',
    green300: 'dark:text-green-300',
    greenLight: 'bg-green-500/5',
    greenBorder: 'border-green-500/30',
    greenBadge: 'bg-green-500/20',
    red500: 'bg-red-500',
    red600: 'text-red-600',
    red400: 'dark:text-red-400',
    red700: 'text-red-700',
    red300: 'dark:text-red-300',
    redLight: 'bg-red-500/5',
    redBorder: 'border-red-500/30',
    redBadge: 'bg-red-500/20',
    blue500: 'bg-blue-500',
    blue600: 'text-blue-600',
    blue400: 'dark:text-blue-400',
    blue700: 'text-blue-700',
    blue300: 'dark:text-blue-300',
    blueLight: 'bg-blue-500/5',
    blueBorder: 'border-blue-500/30',
    blueBadge: 'bg-blue-500/20',
    orange500: 'bg-orange-500',
    orange600: 'text-orange-600',
    orange400: 'dark:text-orange-400',
    orange700: 'text-orange-700',
    orange300: 'dark:text-orange-300',
    orangeLight: 'bg-orange-500/5',
    orangeBorder: 'border-orange-500/30',
    orangeBadge: 'bg-orange-500/20',
    chart: {
      primary: '#2563eb',
      background: 'rgba(37, 99, 235, 0.2)',
      grid: 'rgba(148, 163, 184, 0.1)',
      text: '#94a3b8',
      candleGreen: '#10b981',
      candleRed: '#ef4444',
      entryLong: '#3b82f6',
      entryShort: '#f97316',
      exitProfit: '#10b981',
      exitLoss: '#ef4444',
      maColors: [
        '#3b82f6', // blue
        '#ef4444', // red
        '#10b981', // green
        '#f59e0b', // amber
        '#8b5cf6', // purple
        '#f97316', // orange
      ]
    },
    svg: {
      surface: '#1e293b',
      border: '#334155',
      text: '#f1f5f9',
      textMuted: '#94a3b8'
    }
  }
};
