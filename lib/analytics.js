import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { app } from './firebase';

/** GA4 / Firebase Analytics event names: lowercase snake_case, ≤40 chars, start with a letter. */
export const AnalyticsEvent = {
  PAGE_VIEW: 'page_view',
  KALSHI_SERIES_SELECTED: 'kalshi_series_selected',
  KALSHI_TICKER_SELECTED: 'kalshi_ticker_selected',
  KALSHI_TAB_CHANGED: 'kalshi_tab_changed',
  KALSHI_CSV_DOWNLOAD: 'kalshi_csv_download',
  THEME_CHANGED: 'theme_changed',
};

let analyticsReadyPromise = null;

function measurementConfigured() {
  return Boolean(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);
}

/**
 * Resolves to the Analytics instance or null (SSR, unsupported env, missing config, or error).
 */
function getAnalyticsInstance() {
  if (typeof window === 'undefined' || !measurementConfigured()) {
    return Promise.resolve(null);
  }
  if (!analyticsReadyPromise) {
    analyticsReadyPromise = (async () => {
      try {
        if (!(await isSupported())) return null;
        return getAnalytics(app);
      } catch (err) {
        console.warn('[analytics] init failed', err);
        return null;
      }
    })();
  }
  return analyticsReadyPromise;
}

/**
 * Warm up Analytics once the app is running in the browser.
 */
export function initAnalytics() {
  return getAnalyticsInstance();
}

/**
 * SPA screen / route changes (log in addition to automatic collection if enabled).
 * @param {string} pathname
 * @param {string} [pageTitle]
 */
export function trackPageView(pathname, pageTitle) {
  getAnalyticsInstance().then((analytics) => {
    if (!analytics) return;
    try {
      logEvent(analytics, AnalyticsEvent.PAGE_VIEW, {
        page_path: pathname,
        page_title: pageTitle || pathname,
        page_location: window.location.href,
      });
    } catch (err) {
      console.warn('[analytics] page_view', err);
    }
  });
}

/**
 * Custom event. Params should be flat strings/numbers where possible (GA4 limits).
 * @param {string} eventName
 * @param {Record<string, string | number | boolean | undefined>} [params]
 */
export function trackEvent(eventName, params = {}) {
  getAnalyticsInstance().then((analytics) => {
    if (!analytics) return;
    try {
      const cleaned = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );
      logEvent(analytics, eventName, cleaned);
    } catch (err) {
      console.warn('[analytics] logEvent', eventName, err);
    }
  });
}
