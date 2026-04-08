import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './theme/theme';
import { ToastProvider } from './toast/Toast';
import Nav from './nav/Nav';
import Footer from './nav/Footer';
import Home from './pages/Home';
import About from './pages/About';
import { initAnalytics, trackPageView } from '../lib/analytics';
import './style.css';

function AppContent() {
  const location = useLocation();
  const isCallback = location.pathname === '/auth/callback';

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (isCallback) return;
    const path = `${location.pathname}${location.search || ''}`;
    trackPageView(path, typeof document !== 'undefined' ? document.title : path);
  }, [location.pathname, location.search, isCallback]);

  return (
    <div className="App flex flex-col min-h-screen">
      {!isCallback && <Nav />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      {!isCallback && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;