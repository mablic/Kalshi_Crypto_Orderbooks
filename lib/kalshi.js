import { db } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  documentId,
} from 'firebase/firestore';

export const KALSHI_COLLECTION = 'kalshi';
export const KALSHI_SNAPSHOTS_SUBCOLLECTION = 'snapshots';

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
 * Firestore may store nested structures as JSON strings (see Kalshi feed writer).
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function parseOrderBookLeaves(raw) {
  if (!raw || typeof raw !== 'object') return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (
        (t.startsWith('{') && t.endsWith('}')) ||
        (t.startsWith('[') && t.endsWith(']'))
      ) {
        try {
          out[k] = JSON.parse(t);
          continue;
        } catch {
          /* keep string */
        }
      }
    }
    out[k] = v;
  }
  return out;
}

/**
 * Snapshot document time as ISO string (prefer Firestore fields, else doc id).
 * @param {{ id: string } & Record<string, unknown>} snap
 */
export function snapshotTimeIso(snap) {
  const ca = snap.captured_at;
  if (ca && typeof ca.toDate === 'function') {
    try {
      return ca.toDate().toISOString();
    } catch {
      /* fall through */
    }
  }
  if (typeof snap.captured_at_unix_ms === 'number') {
    return new Date(snap.captured_at_unix_ms).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snap.id)) {
    const d = new Date(snap.id);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * @returns {Promise<Array<{ docId: string, ticker: string, seriesTicker: string | null, data: Record<string, unknown> }>>}
 */
export async function listKalshiMarkets() {
  const snap = await getDocs(collection(db, KALSHI_COLLECTION));
  const rows = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    rows.push({
      docId: d.id,
      ticker: typeof data.ticker === 'string' ? data.ticker : d.id,
      seriesTicker:
        typeof data.series_ticker === 'string' ? data.series_ticker : null,
      data,
    });
  });
  rows.sort((a, b) => (a.ticker || '').localeCompare(b.ticker || ''));
  return rows;
}

/**
 * @param {string} marketDocId
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getKalshiMarketDoc(marketDocId) {
  const ref = doc(db, KALSHI_COLLECTION, marketDocId);
  const s = await getDoc(ref);
  if (!s.exists()) return null;
  return s.data() || {};
}

/**
 * @param {string} marketDocId
 * @param {number} maxSnapshots
 * @returns {Promise<Array<{ id: string } & Record<string, unknown>>>}
 */
export async function getKalshiSnapshots(marketDocId, maxSnapshots = 180) {
  const coll = collection(
    db,
    KALSHI_COLLECTION,
    marketDocId,
    KALSHI_SNAPSHOTS_SUBCOLLECTION
  );
  const q = query(
    coll,
    orderBy(documentId(), 'desc'),
    limit(Math.max(1, maxSnapshots))
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((d) => {
    rows.push({ id: d.id, ...d.data() });
  });
  return rows.reverse();
}

/**
 * Build candle rows for Stock chart (compatible with existing OHLC + volume fields).
 * @param {Array<{ id: string } & Record<string, unknown>>} snapshots
 */
export function snapshotsToCandleSeries(snapshots) {
  if (!Array.isArray(snapshots)) return [];

  return snapshots
    .map((s) => {
      const cf =
        s.cf_index_minute && typeof s.cf_index_minute === 'object'
          ? s.cf_index_minute
          : {};
      const o = toNumber(cf.open);
      const h = toNumber(cf.high);
      const l = toNumber(cf.low);
      const c = toNumber(cf.close);
      if (o === null && h === null && l === null && c === null) return null;

      const close = c ?? o ?? 0;
      const open = o ?? close;
      const high = h ?? Math.max(open, close);
      const low = l ?? Math.min(open, close);
      const tickCount = toNumber(cf.tick_count) ?? 0;
      const dateIso = snapshotTimeIso(s);
      const obRaw =
        s.order_book && typeof s.order_book === 'object' ? s.order_book : {};
      const orderBook = parseOrderBookLeaves(obRaw);

      return {
        date: dateIso,
        dateKey: s.id,
        open,
        high,
        low,
        close,
        volume: Math.max(0, tickCount),
        snapId: s.id,
        trade_position: '',
        orderBook,
        cf_index_minute: cf,
      };
    })
    .filter(Boolean);
}

/** Eastern Time display (handles DST). */
const EST_DISPLAY = {
  timeZone: 'America/New_York',
  dateStyle: 'medium',
  timeStyle: 'short',
};

/**
 * @param {unknown} value Firestore Timestamp, Date, or ISO string
 */
export function formatKalshiInstant(value) {
  if (value == null || value === '') return '';
  let d;
  if (value && typeof value.toDate === 'function') {
    try {
      d = value.toDate();
    } catch {
      return String(value);
    }
  } else if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string') {
    d = new Date(value);
  } else {
    return String(value);
  }
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.toLocaleString('en-US', EST_DISPLAY)} ET`;
}

export function humanizeKalshiFieldKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function formatKalshiMarketFieldValue(key, value) {
  if (value === null || value === undefined) return '—';
  if (value && typeof value.toDate === 'function') {
    return formatKalshiInstant(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value.trim())) {
    return formatKalshiInstant(value.trim());
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * @param {unknown} value Firestore Timestamp, Date, ISO string, or unix ms
 * @returns {number | null}
 */
export function kalshiTimeToMs(value) {
  if (value == null || value === '') return null;
  if (value && typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    } catch {
      return null;
    }
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string') {
    const t = Date.parse(value.trim());
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/**
 * Contract is tradable until close: active if close_time is strictly in the future.
 * @param {Record<string, unknown> | null | undefined} marketDoc
 * @returns {'Active' | 'Inactive' | null} null if close_time missing / unparsable
 */
export function getKalshiActivityFromCloseTime(marketDoc) {
  if (!marketDoc || typeof marketDoc !== 'object') return null;
  const closeMs = kalshiTimeToMs(marketDoc.close_time);
  if (closeMs == null) return null;
  return Date.now() < closeMs ? 'Active' : 'Inactive';
}

/** Prefer explicit expected expiration; fall back to close_time / end_time. */
export function getKalshiExpirationRaw(marketDoc) {
  if (!marketDoc || typeof marketDoc !== 'object') return null;
  return (
    marketDoc.expected_expiration_time ??
    marketDoc.close_time ??
    marketDoc.end_time ??
    null
  );
}

/**
 * User's local timezone (browser). Pass Firestore Timestamp, Date, ISO string, or unix.
 */
export function formatKalshiLocalDateTime(value) {
  if (value == null || value === '') return '';
  const ms = kalshiTimeToMs(value);
  if (ms == null) return '';
  try {
    return new Date(ms).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return '';
  }
}

/**
 * Mirror QuantModelKalshi save_to_firebase inference when API omits strike_type.
 */
export function inferStrikeTypeFromRules(rulesPrimary, rulesSecondary) {
  const text = `${String(rulesPrimary || '')} ${String(rulesSecondary || '')}`.toLowerCase();
  if (text.includes('at least') || text.includes('greater than or equal') || text.includes('≥')) {
    return 'greater_or_equal';
  }
  if (
    text.includes('at most') ||
    text.includes('no more than') ||
    text.includes('less than or equal') ||
    text.includes('≤')
  ) {
    return 'less_or_equal';
  }
  if (text.includes('greater than') || text.includes('more than')) return 'greater';
  if (text.includes('less than')) return 'less';
  if (text.includes('between')) return 'between';
  return '';
}

/**
 * @param {string} strikeType
 * @returns {{ phrase: string, short: string }}
 */
export function strikeTypeToDirectionPhrase(strikeType) {
  const s = String(strikeType || '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  if (['greater_or_equal'].includes(s)) {
    return { phrase: 'at or above', short: 'above' };
  }
  if (['greater'].includes(s)) {
    return { phrase: 'above', short: 'above' };
  }
  if (['less_or_equal'].includes(s)) {
    return { phrase: 'at or below', short: 'below' };
  }
  if (['less'].includes(s)) {
    return { phrase: 'below', short: 'below' };
  }
  if (s === 'between') {
    return { phrase: 'between the stated bounds', short: 'between' };
  }
  return { phrase: 'relative to', short: 'vs' };
}

function formatStrikeMoney(n) {
  if (n == null || !Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

/**
 * One-line contract summary: price vs floor strike before local expiration.
 * @param {Record<string, unknown> | null | undefined} marketDoc
 * @param {{ floorStrike: number | null, strikeType: string, rulesPrimary?: string, rulesSecondary?: string, title?: string }} heroFields
 */
export function buildKalshiContractHeadline(marketDoc, heroFields) {
  const expRaw = getKalshiExpirationRaw(marketDoc);
  const localExp = formatKalshiLocalDateTime(expRaw);
  const strikeTypeRaw =
    (heroFields.strikeType && String(heroFields.strikeType).trim()) ||
    inferStrikeTypeFromRules(heroFields.rulesPrimary, heroFields.rulesSecondary);
  const { phrase } = strikeTypeToDirectionPhrase(strikeTypeRaw);
  const fs = heroFields.floorStrike;
  if (fs != null && Number.isFinite(fs) && localExp) {
    return `Will the price be ${phrase} $${formatStrikeMoney(fs)} before ${localExp}?`;
  }
  if (fs != null && Number.isFinite(fs)) {
    return `Will the price be ${phrase} $${formatStrikeMoney(fs)} at settlement?`;
  }
  if (localExp) {
    return `Contract settles after ${localExp}. Open rules for strike details.`;
  }
  const t = heroFields.title?.trim();
  return t || '';
}

/** Human-readable strike direction for the stats panel. */
export function formatStrikeTypeForUi(strikeType, rulesPrimary, rulesSecondary) {
  const raw = String(strikeType || '').trim();
  const resolved = raw || inferStrikeTypeFromRules(rulesPrimary, rulesSecondary);
  if (!resolved) return '';
  const { phrase } = strikeTypeToDirectionPhrase(resolved);
  if (!phrase) return '';
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** First N fields that exist, in this priority order (summary strip on Home). */
export const KALSHI_TOP_SUMMARY_PRIORITY = [
  'title',
  'status',
  'close_time',
  'series_ticker',
  'ticker',
  'event_ticker',
];

const TOP_COUNT = 4;

/**
 * @param {Record<string, unknown> | null | undefined} marketDoc
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export function pickKalshiTopSummaryFields(marketDoc) {
  if (!marketDoc || typeof marketDoc !== 'object') return [];
  const out = [];
  for (const k of KALSHI_TOP_SUMMARY_PRIORITY) {
    const v = marketDoc[k];
    if (k === 'status') {
      const fromClose = getKalshiActivityFromCloseTime(marketDoc);
      if (fromClose != null) {
        out.push({
          key: k,
          label: humanizeKalshiFieldKey(k),
          value: fromClose,
        });
        if (out.length >= TOP_COUNT) break;
        continue;
      }
    }
    if (v !== undefined && v !== null && v !== '') {
      out.push({
        key: k,
        label: humanizeKalshiFieldKey(k),
        value: formatKalshiMarketFieldValue(k, v),
      });
      if (out.length >= TOP_COUNT) break;
    }
  }
  return out;
}

/**
 * All document fields except the top summary strip and `snapshots`.
 * @param {Record<string, unknown> | null | undefined} marketDoc
 */
export function getKalshiRestFieldRows(marketDoc) {
  const topKeys = new Set(pickKalshiTopSummaryFields(marketDoc).map((r) => r.key));
  if (!marketDoc || typeof marketDoc !== 'object') return [];
  return Object.entries(marketDoc)
    .filter(([k, v]) => k !== 'snapshots' && !topKeys.has(k) && v !== undefined)
    .map(([k, v]) => ({
      key: k,
      label: humanizeKalshiFieldKey(k),
      value: formatKalshiMarketFieldValue(k, v),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Kalshi `order_book` keys that are [[price, size], ...] ladders. */
export const KALSHI_DEPTH_YES_KEY = 'yes_dollars';
export const KALSHI_DEPTH_NO_KEY = 'no_dollars';

/**
 * @param {unknown} raw JSON array or stringified array from Firestore
 * @returns {Array<{ price: number, size: number }>}
 */
export function parseOrderBookDepthRows(raw) {
  let arr = raw;
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const rows = [];
  for (const row of arr) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const price = toNumber(row[0]);
    const size = toNumber(row[1]);
    if (price === null || size === null) continue;
    rows.push({ price, size });
  }
  rows.sort((a, b) => a.price - b.price);
  return rows;
}

function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const s =
    typeof value === 'number' && Number.isFinite(value) ? String(value) : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * One row per snapshot: date, OHLC, then yes/no ladders as paired columns
 * (yes_1_price_dollars, yes_1_contracts, …, no_1_price_dollars, no_1_contracts, …).
 * Depth is the max across all rows so columns align.
 *
 * @param {Array<{ date: string, open: number, high: number, low: number, close: number, orderBook?: Record<string, unknown> }>} candles
 * @returns {string} CSV (no BOM; caller may prepend \uFEFF for Excel)
 */
export function buildKalshiCandlesOrderBookCsv(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return '';

  const parsed = candles.map((c) => {
    const ob = c.orderBook && typeof c.orderBook === 'object' ? c.orderBook : {};
    const yesRows = parseOrderBookDepthRows(ob[KALSHI_DEPTH_YES_KEY]);
    const noRows = parseOrderBookDepthRows(ob[KALSHI_DEPTH_NO_KEY]);
    return { c, yesRows, noRows };
  });

  let maxYes = 0;
  let maxNo = 0;
  for (const p of parsed) {
    maxYes = Math.max(maxYes, p.yesRows.length);
    maxNo = Math.max(maxNo, p.noRows.length);
  }

  const header = ['date', 'open', 'high', 'low', 'close'];
  for (let i = 1; i <= maxYes; i++) {
    header.push(`yes_${i}_price_dollars`, `yes_${i}_contracts`);
  }
  for (let i = 1; i <= maxNo; i++) {
    header.push(`no_${i}_price_dollars`, `no_${i}_contracts`);
  }

  const lines = [header.map(escapeCsvField).join(',')];

  for (const { c, yesRows, noRows } of parsed) {
    const cells = [
      escapeCsvField(c.date),
      escapeCsvField(c.open),
      escapeCsvField(c.high),
      escapeCsvField(c.low),
      escapeCsvField(c.close),
    ];
    for (let i = 0; i < maxYes; i++) {
      const r = yesRows[i];
      cells.push(escapeCsvField(r ? r.price : ''), escapeCsvField(r ? r.size : ''));
    }
    for (let i = 0; i < maxNo; i++) {
      const r = noRows[i];
      cells.push(escapeCsvField(r ? r.price : ''), escapeCsvField(r ? r.size : ''));
    }
    lines.push(cells.join(','));
  }

  return lines.join('\r\n');
}

export const kalshiOverviewCopy = {
  title: 'Kalshi crypto 15m markets',
  shortDescription:
    'Live snapshots from the Kalshi feed: CF Benchmarks minute index OHLC and order book state per capture.',
  overview:
    'Each Firestore document under `kalshi` is one Kalshi market ticker. The `snapshots` subcollection stores one row per minute (document id = UTC timestamp). Charts use `cf_index_minute` open/high/low/close; the table below the chart reflects `order_book` for the selected or latest snapshot.',
};

/**
 * Fields for the Home hero (rules + settlement reference).
 * @param {Record<string, unknown> | null | undefined} marketDoc
 */
export function getKalshiMarketHeroFields(marketDoc) {
  if (!marketDoc || typeof marketDoc !== 'object') {
    return {
      title: '',
      rulesPrimary: '',
      rulesSecondary: '',
      expirationValue: '',
      floorStrike: null,
      capStrike: null,
      strikeType: '',
      volumeFp: null,
    };
  }
  const pick = (keys) => {
    for (const k of keys) {
      const v = marketDoc[k];
      if (v == null || v === '') continue;
      if (typeof v === 'string') return v.trim();
      return String(v).trim();
    }
    return '';
  };
  return {
    title: pick(['title', 'ticker']),
    rulesPrimary: pick(['rules_primary', 'rulesPrimary']),
    rulesSecondary: pick(['rules_secondary', 'rulesSecondary']),
    expirationValue: pick(['expiration_value', 'expirationValue']),
    floorStrike: toNumber(marketDoc.floor_strike ?? marketDoc.floorStrike),
    capStrike: toNumber(marketDoc.cap_strike ?? marketDoc.capStrike),
    strikeType: pick(['strike_type', 'strikeType']),
    volumeFp: toNumber(marketDoc.volume_fp ?? marketDoc.volumeFp),
  };
}
