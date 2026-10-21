/**
 * Pure math functions for STRIPS Tax Trading Calculator.
 * All amounts per $100 face value. Semiannual compounding.
 */

/** Price of a zero-coupon bond given annual yield y (decimal) and years remaining n. */
export function price(y: number, n: number): number {
  return 100 / Math.pow(1 + y / 2, 2 * n);
}

/**
 * Tax basis at t years after purchase under constant-yield (OID) method.
 * Forced to exactly 100 if t >= term.
 */
export function basisAt(purchasePrice: number, yBuy: number, t: number, term: number): number {
  if (t >= term) return 100;
  return purchasePrice * Math.pow(1 + yBuy / 2, 2 * t);
}

/**
 * Annual OID in year k (1-indexed) for a segment.
 * segBasis: basis at start of segment (year 0 of segment).
 * segYield: yield at start of segment.
 * segTerm: total years in segment from trade to maturity.
 */
export function segmentOidAnnual(
  segBasis: number,
  segYield: number,
  k: number,
  segTerm: number,
): number {
  const start = k === 1
    ? segBasis
    : Math.min(segBasis * Math.pow(1 + segYield / 2, 2 * (k - 1)), 100);
  const end = k >= segTerm
    ? 100
    : Math.min(segBasis * Math.pow(1 + segYield / 2, 2 * k), 100);
  return end - start;
}

export interface SingleTradeResult {
  purchasePrice: number;
  yBuy: number;
  basisAtTrade: number;
  marketPrice: number;
  yMarket: number;
  capitalGain: number;
  interestLeft: number;
  nominalTaxSaved: number;
  pvBenefit: number;
  pvBenefitPct: number;
  yearsElapsed: number;
  yearsRemaining: number;
  term: number;
}

/**
 * Single-trade PV benefit (screen 1 method).
 * Compares old OID schedule (from basisAtTrade at yBuy) to new OID schedule
 * (from marketPrice at yMarket) over semiannual periods to maturity.
 * Discounts at yBuy*(1-ordinaryRate)/2 per semiannual period.
 */
export function computeSingleTrade(
  purchasePrice: number,
  yBuy: number,
  yearsElapsed: number,
  marketPrice: number,
  yMarket: number,
  term: number,
  ordinaryRate: number,
  capitalRate: number,
): SingleTradeResult {
  const yearsRemaining = term - yearsElapsed;
  const basisAtTrade = basisAt(purchasePrice, yBuy, yearsElapsed, term);
  const capitalGain = marketPrice - basisAtTrade;
  const interestLeft = 100 - marketPrice;
  const nominalTaxSaved = ordinaryRate * capitalGain;

  // Semiannual periods from trade to maturity
  const numPeriods = Math.round(yearsRemaining * 2);
  const discountRate = yBuy * (1 - ordinaryRate) / 2;

  let pvOidDiff = 0;
  for (let k = 1; k <= numPeriods; k++) {
    const oldPrev = k === 1
      ? basisAtTrade
      : Math.min(basisAtTrade * Math.pow(1 + yBuy / 2, k - 1), 100);
    const oldCurr = k === numPeriods
      ? 100
      : Math.min(basisAtTrade * Math.pow(1 + yBuy / 2, k), 100);
    const oldOID = oldCurr - oldPrev;

    const newPrev = k === 1
      ? marketPrice
      : Math.min(marketPrice * Math.pow(1 + yMarket / 2, k - 1), 100);
    const newCurr = k === numPeriods
      ? 100
      : Math.min(marketPrice * Math.pow(1 + yMarket / 2, k), 100);
    const newOID = newCurr - newPrev;

    const taxSaved = ordinaryRate * (oldOID - newOID);
    const discount = Math.pow(1 + discountRate, -k);
    pvOidDiff += taxSaved * discount;
  }

  const pvBenefit = pvOidDiff - capitalRate * capitalGain;
  const pvBenefitPct = (pvBenefit / purchasePrice) * 100;

  return {
    purchasePrice,
    yBuy,
    basisAtTrade,
    marketPrice,
    yMarket,
    capitalGain,
    interestLeft,
    nominalTaxSaved,
    pvBenefit,
    pvBenefitPct,
    yearsElapsed,
    yearsRemaining,
    term,
  };
}

export interface YearlyRuleTrade {
  year: number;
  gain: number;
  marketPrice: number;
  basisBeforeTrade: number;
}

export interface YearlyRuleResult {
  trades: YearlyRuleTrade[];
  pvBenefit: number;
  pvBenefitPct: number;
}

/**
 * Yearly-rule PV benefit (screen 2 method).
 * ratesForYears: array of length `term`, index k-1 is the yield at anniversary year k.
 *   null means data not available (treat as hold).
 * harvesting: 'gain' => trade if price > basis; 'loss' => trade if price < basis.
 * Discounts annual cash flows at yBuy*(1-ordinaryRate).
 */
export function computeYearlyRule(
  purchasePrice: number,
  yBuy: number,
  term: number,
  ratesForYears: (number | null)[],
  ordinaryRate: number,
  capitalRate: number,
  harvesting: 'gain' | 'loss',
): YearlyRuleResult {
  const annualDiscount = yBuy * (1 - ordinaryRate);

  // Buy-and-hold PV of taxes
  let pvHold = 0;
  for (let k = 1; k <= term; k++) {
    const oid = segmentOidAnnual(purchasePrice, yBuy, k, term);
    pvHold += (ordinaryRate * oid) / Math.pow(1 + annualDiscount, k);
  }

  // Trading scenario PV of taxes
  let pvTrades = 0;
  const trades: YearlyRuleTrade[] = [];

  let lastTradeYear = 0;
  let segBasis = purchasePrice;
  let segYield = yBuy;

  for (let k = 1; k <= term; k++) {
    const yearsInSeg = k - lastTradeYear;
    const segTerm = term - lastTradeYear;

    // OID under current segment schedule for this year
    const oid = segmentOidAnnual(segBasis, segYield, yearsInSeg, segTerm);
    let totalTax = ordinaryRate * oid;

    // Check if we trade at the end of year k (before k === term)
    if (k < term) {
      const marketYield = ratesForYears[k - 1];
      if (marketYield !== null) {
        const yearsToMaturity = term - k;
        const mktPrice = price(marketYield, yearsToMaturity);
        const currentBasis = k === lastTradeYear + segTerm
          ? 100
          : Math.min(segBasis * Math.pow(1 + segYield / 2, 2 * yearsInSeg), 100);
        const gain = mktPrice - currentBasis;
        const shouldTrade =
          (harvesting === 'gain' && gain > 0) ||
          (harvesting === 'loss' && gain < 0);

        if (shouldTrade) {
          const capitalGainTax = capitalRate * gain;
          totalTax += capitalGainTax;
          trades.push({ year: k, gain, marketPrice: mktPrice, basisBeforeTrade: currentBasis });
          lastTradeYear = k;
          segBasis = mktPrice;
          segYield = marketYield;
        }
      }
    }

    pvTrades += totalTax / Math.pow(1 + annualDiscount, k);
  }

  const pvBenefit = pvHold - pvTrades;
  const pvBenefitPct = (pvBenefit / purchasePrice) * 100;

  return { trades, pvBenefit, pvBenefitPct };
}

/** Conversion ratio: total capital gain from trades / original OID (100 - purchasePrice). */
export function conversionRatio(totalGain: number, purchasePrice: number): number {
  const originalOID = 100 - purchasePrice;
  if (originalOID <= 0) return 0;
  return totalGain / originalOID;
}
