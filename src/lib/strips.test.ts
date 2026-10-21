import { describe, it, expect } from 'vitest';
import {
  price,
  basisAt,
  computeSingleTrade,
  computeYearlyRule,
} from './strips.js';

const TOLERANCE = 0.05;

function near(a: number, b: number, tol = TOLERANCE) {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
}

// Acceptance test values from CLAUDE_CODE_INSTRUCTIONS.md
// Buy 2018-11: yield 3.12%, term 10 years
// Sell/rebuy 2020-07: yield 0.62%, months elapsed = 20 => years = 20/12
// Ordinary rate 40.8%, Zero Rate capital rate = 0%

const Y_BUY = 0.0312;
const Y_MARKET_TRADE = 0.0062;
const TERM = 10;
const MONTHS_ELAPSED = 20;
const YEARS_ELAPSED = MONTHS_ELAPSED / 12;
const ORDINARY = 0.408;

describe('price formula', () => {
  it('purchase price at 3.12% 10 years', () => {
    near(price(Y_BUY, TERM), 73.37);
  });
  it('market price at 0.62% 8.333 years', () => {
    near(price(Y_MARKET_TRADE, TERM - YEARS_ELAPSED), 94.97);
  });
});

describe('basisAt', () => {
  it('basis at trade (1.667 years)', () => {
    near(basisAt(price(Y_BUY, TERM), Y_BUY, YEARS_ELAPSED, TERM), 77.26);
  });
  it('basis at maturity is 100', () => {
    expect(basisAt(price(Y_BUY, TERM), Y_BUY, TERM, TERM)).toBe(100);
  });
});

describe('Single trade — Zero Rate', () => {
  const purchasePrice = price(Y_BUY, TERM);
  const result = computeSingleTrade(
    purchasePrice, Y_BUY, YEARS_ELAPSED,
    price(Y_MARKET_TRADE, TERM - YEARS_ELAPSED), Y_MARKET_TRADE,
    TERM, ORDINARY, 0,
  );

  it('purchase price 73.37', () => { near(result.purchasePrice, 73.37); });
  it('basis at trade 77.26', () => { near(result.basisAtTrade, 77.26); });
  it('market price 94.97', () => { near(result.marketPrice, 94.97); });
  it('capital gain 17.71', () => { near(result.capitalGain, 17.71); });
  it('interest left 5.03', () => { near(result.interestLeft, 5.03); });
  it('nominal tax saved 7.23', () => { near(result.nominalTaxSaved, 7.23); });
  it('PV benefit 6.64', () => { near(result.pvBenefit, 6.64); });
  it('PV benefit % 9.05', () => { near(result.pvBenefitPct, 9.05); });
});

describe('Single trade — Long-term (23.8%)', () => {
  const purchasePrice = price(Y_BUY, TERM);
  const result = computeSingleTrade(
    purchasePrice, Y_BUY, YEARS_ELAPSED,
    price(Y_MARKET_TRADE, TERM - YEARS_ELAPSED), Y_MARKET_TRADE,
    TERM, ORDINARY, 0.238,
  );

  it('PV benefit ~2.43', () => { near(result.pvBenefit, 2.43); });
  it('PV benefit % ~3.31', () => { near(result.pvBenefitPct, 3.31); });
});

describe('Yearly rule — Zero Rate, buy 2018-11', () => {
  // Rates at anniversaries:
  // 2019-11: 1.81%, 2020-11: 0.87%
  // Beyond last data or no gain/loss: null
  const Y_2019_11 = 0.0181;
  const Y_2020_11 = 0.0087;
  // For 2021-11 onward we supply rates but gains/losses may not trigger;
  // use realistic rising-rate scenario: 2021-11 ~1.55%, 2022-11 ~4.67% etc.
  // (actual values from CSV — supply null for years beyond data)
  // For the test we supply rates that match the acceptance test behavior:
  // trades only at years 1 and 2.
  const ratesForYears: (number | null)[] = [
    Y_2019_11,  // year 1: Nov 2019
    Y_2020_11,  // year 2: Nov 2020
    0.0155,     // year 3: Nov 2021 (rising, no gain after 2nd trade)
    0.0467,     // year 4: Nov 2022
    0.0466,     // year 5: Nov 2023
    0.0433,     // year 6: Nov 2024
    0.0430,     // year 7: Nov 2025
    0.0468,     // year 8: Nov 2026
    null,       // year 9: Nov 2027 (not in data yet)
    null,       // year 10: maturity (no trade)
  ];

  const purchasePrice = price(Y_BUY, TERM);
  const result = computeYearlyRule(
    purchasePrice, Y_BUY, TERM, ratesForYears, ORDINARY, 0, 'gain',
  );

  it('trade at year 1 gain ~9.35', () => {
    const t = result.trades.find(t => t.year === 1);
    expect(t).toBeDefined();
    near(t!.gain, 9.35);
  });
  it('trade at year 2 gain ~6.71', () => {
    const t = result.trades.find(t => t.year === 2);
    expect(t).toBeDefined();
    near(t!.gain, 6.71);
  });
  it('benefit ~7.94% of price', () => {
    near(result.pvBenefitPct, 7.94);
  });
});
