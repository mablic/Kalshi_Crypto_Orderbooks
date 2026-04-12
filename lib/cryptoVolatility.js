import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export const CRYPTO_COLLECTION = 'crypto';

/**
 * @param {string} seriesTicker
 * @param {number} capturedAtMs
 */
export function cryptoDailyDocId(seriesTicker, capturedAtMs) {
  const d = new Date(capturedAtMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const dayStr = `${y}-${m}-${day}`;
  return `${String(seriesTicker).replace(/\//g, '_')}_${dayStr}`;
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function toNumber(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} bar
 * @returns {number | null}
 */
export function cryptoBarTimeMs(bar) {
  if (!bar || typeof bar !== 'object') return null;
  if (typeof bar.captured_at_unix_ms === 'number' && Number.isFinite(bar.captured_at_unix_ms)) {
    return bar.captured_at_unix_ms;
  }
  if (typeof bar.datetime === 'string') {
    const t = Date.parse(bar.datetime);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/**
 * @param {number[]} xs
 * @returns {number | null}
 */
function sampleStdev(xs) {
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  let s = 0;
  for (const x of xs) {
    const d = x - mean;
    s += d * d;
  }
  return Math.sqrt(s / (xs.length - 1));
}

/**
 * @param {string} seriesTicker
 * @param {number} fromMs
 * @param {number} toMs
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function getCryptoBarsInWindow(seriesTicker, fromMs, toMs) {
  if (!seriesTicker || typeof seriesTicker !== 'string') return [];

  const docIds = new Set([
    cryptoDailyDocId(seriesTicker, fromMs),
    cryptoDailyDocId(seriesTicker, toMs),
  ]);

  const merged = [];
  for (const id of docIds) {
    const snap = await getDoc(doc(db, CRYPTO_COLLECTION, id));
    if (!snap.exists()) continue;
    const data = snap.data() || {};
    const bars = Array.isArray(data.bars) ? data.bars : [];
    merged.push(...bars.filter((b) => b && typeof b === 'object'));
  }

  const windowed = merged.filter((b) => {
    const ms = cryptoBarTimeMs(b);
    return ms != null && ms >= fromMs && ms <= toMs;
  });
  const byMs = new Map();
  for (const b of windowed) {
    const ms = cryptoBarTimeMs(b);
    if (ms != null) byMs.set(ms, b);
  }
  return [...byMs.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

/**
 * Same semantics as `minute_volatility_last_n_minutes` in QuantModelBackend/lib/crypto_volatility.py.
 *
 * @param {string} seriesTicker
 * @param {{ minutes?: number, nowMs?: number }} [opts]
 * @returns {Promise<{
 *   sigmaClose: number | null,
 *   lastClose: number | null,
 *   upper1sigma: number | null,
 *   lower1sigma: number | null,
 *   barCount: number,
 *   closeCount: number,
 *   fromMs: number | null,
 *   toMs: number | null,
 * }>}
 */
export async function fetchCryptoMinuteVolatility(seriesTicker, opts = {}) {
  const minutes = opts.minutes ?? 15;
  const nowMs = opts.nowMs ?? Date.now();
  const fromMs = nowMs - Math.max(1, minutes) * 60 * 1000;

  const empty = {
    sigmaClose: null,
    lastClose: null,
    upper1sigma: null,
    lower1sigma: null,
    barCount: 0,
    closeCount: 0,
    fromMs,
    toMs: nowMs,
  };

  if (!seriesTicker || typeof seriesTicker !== 'string' || !seriesTicker.trim()) {
    return empty;
  }

  const bars = await getCryptoBarsInWindow(seriesTicker.trim(), fromMs, nowMs);
  empty.barCount = bars.length;

  const closes = [];
  for (const b of bars) {
    const c = toNumber(b.close);
    if (c != null) closes.push(c);
  }

  if (closes.length < 2) {
    if (closes.length === 1) empty.lastClose = closes[0];
    return empty;
  }

  const lastClose = closes[closes.length - 1];
  empty.lastClose = lastClose;
  empty.closeCount = closes.length;

  const sigma = sampleStdev(closes);
  if (sigma == null || lastClose == null) return empty;

  empty.sigmaClose = sigma;
  empty.upper1sigma = lastClose + sigma;
  empty.lower1sigma = lastClose - sigma;
  return empty;
}
