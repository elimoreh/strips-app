import csvRaw from '../data/us10y.csv?raw';

export interface RateRow {
  year: number;
  month: number; // 1-12
  rate: number;  // decimal, e.g. 0.0312 for 3.12%
}

function parseCSV(raw: string): RateRow[] {
  const lines = raw.trim().split('\n');
  const rows: RateRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [dateStr, rateStr] = lines[i].split(',');
    if (!dateStr || !rateStr) continue;
    const [yearStr, monthStr] = dateStr.trim().split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const rate = parseFloat(rateStr.trim()) / 100;
    if (!isNaN(year) && !isNaN(month) && !isNaN(rate)) {
      rows.push({ year, month, rate });
    }
  }
  return rows;
}

export const ALL_RATES: RateRow[] = parseCSV(csvRaw);

// Map "YYYY-MM" -> rate (decimal)
const rateMap = new Map<string, number>();
for (const row of ALL_RATES) {
  rateMap.set(`${row.year}-${String(row.month).padStart(2, '0')}`, row.rate);
}

export function getRate(year: number, month: number): number | null {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return rateMap.get(key) ?? null;
}

/** Add n months to a (year, month) pair. */
export function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + n;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** Months elapsed between two (year,month) pairs (can be negative). */
export function monthsBetween(
  y1: number, m1: number,
  y2: number, m2: number,
): number {
  return (y2 - y1) * 12 + (m2 - m1);
}

/** All valid purchase months where a full `term`-year term fits within the data. */
export function validPurchaseMonths(term: number): RateRow[] {
  const last = ALL_RATES[ALL_RATES.length - 1];
  return ALL_RATES.filter(row => {
    const mat = addMonths(row.year, row.month, term * 12);
    const matKey = `${mat.year}-${String(mat.month).padStart(2, '0')}`;
    return rateMap.has(matKey);
  }).filter(row => {
    // also need anniversary months in data
    const lastMonth = last.year * 12 + (last.month - 1);
    const matMonth = row.year * 12 + (row.month - 1) + term * 12;
    return matMonth <= lastMonth;
  });
}

/** Format a year/month as "YYYY-MM" */
export function formatYM(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Get rate for anniversary year k from a purchase (year, month) with given term. */
export function anniversaryRate(
  buyYear: number,
  buyMonth: number,
  k: number,
): number | null {
  const ann = addMonths(buyYear, buyMonth, k * 12);
  return getRate(ann.year, ann.month);
}
