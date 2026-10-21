import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, BarChart, Bar, ResponsiveContainer,
} from 'recharts';
import { getRate, addMonths, monthsBetween, ALL_RATES } from '../lib/data';
import { price, basisAt } from '../lib/strips';
import type { SingleTradeResult } from '../lib/strips';

const TAXPAYER_LABELS: Record<string, string> = {
  zero: 'Zero Rate (0% cap gain)',
  longterm: 'Long-term (23.8%)',
  short: 'Short Rate (40.8%)',
};

interface Props {
  buyYear: number; setBuyYear: (v: number) => void;
  buyMonth: number; setBuyMonth: (v: number) => void;
  term: number; setTerm: (v: number) => void;
  sellYear: number; setSellYear: (v: number) => void;
  sellMonth: number; setSellMonth: (v: number) => void;
  taxpayerType: 'zero' | 'longterm' | 'short';
  setTaxpayerType: (v: 'zero' | 'longterm' | 'short') => void;
  ordinaryRate: number; setOrdinaryRate: (v: number) => void;
  result: SingleTradeResult | null;
}

function fmt2(n: number) { return n.toFixed(2); }
function fmtPct(n: number) { return `${n.toFixed(2)}%`; }
function fmtDollar(n: number) { return `$${n.toFixed(2)}`; }

export function SingleTrade({
  buyYear, setBuyYear, buyMonth, setBuyMonth,
  term, setTerm, sellYear, setSellYear, sellMonth, setSellMonth,
  taxpayerType, setTaxpayerType, ordinaryRate, setOrdinaryRate,
  result,
}: Props) {
  const [showNewBasis, setShowNewBasis] = useState(false);

  // Build monthly chart data from purchase to maturity (or last data)
  const chartData = useMemo(() => {
    const yBuy = getRate(buyYear, buyMonth);
    if (!yBuy) return [];
    const purchasePrice = price(yBuy, term);
    const mat = addMonths(buyYear, buyMonth, term * 12);
    const lastRow = ALL_RATES[ALL_RATES.length - 1];
    const endYear = Math.min(mat.year, lastRow.year);
    const endMonth = mat.year < lastRow.year ? mat.month
      : mat.year === lastRow.year ? Math.min(mat.month, lastRow.month)
      : lastRow.month;

    const tradeMonthsElapsed = result
      ? (sellYear - buyYear) * 12 + (sellMonth - buyMonth)
      : -1;

    const rows = [];
    let m = { year: buyYear, month: buyMonth };
    while (m.year < endYear || (m.year === endYear && m.month <= endMonth)) {
      const elapsed = monthsBetween(buyYear, buyMonth, m.year, m.month) / 12;
      const remaining = term - elapsed;
      const basisVal = basisAt(purchasePrice, yBuy, elapsed, term);
      const mktRate = getRate(m.year, m.month);
      const mktPrice = (mktRate && remaining > 0) ? price(mktRate, remaining) : null;
      const label = `${m.year}-${String(m.month).padStart(2, '0')}`;

      let newBasisVal: number | null = null;
      if (showNewBasis && result && elapsed >= tradeMonthsElapsed / 12) {
        const yearsAfterTrade = elapsed - tradeMonthsElapsed / 12;
        const segTerm = term - tradeMonthsElapsed / 12;
        newBasisVal = basisAt(result.marketPrice, result.yMarket, yearsAfterTrade, segTerm);
      }

      rows.push({ label, elapsed, basis: +basisVal.toFixed(3), price: mktPrice ? +mktPrice.toFixed(3) : null, newBasis: newBasisVal ? +newBasisVal.toFixed(3) : null });
      m = addMonths(m.year, m.month, 1);
    }
    return rows;
  }, [buyYear, buyMonth, term, sellYear, sellMonth, result, showNewBasis]);

  const tradeLabel = `${sellYear}-${String(sellMonth).padStart(2, '0')}`;
  const buyLabel = `${buyYear}-${String(buyMonth).padStart(2, '0')}`;

  function handleBuyChange(val: string) {
    const [y, m] = val.split('-').map(Number);
    if (y && m) { setBuyYear(y); setBuyMonth(m); }
  }
  function handleSellChange(val: string) {
    const [y, m] = val.split('-').map(Number);
    if (y && m) { setSellYear(y); setSellMonth(m); }
  }

  // Sentence
  const sentence = useMemo(() => {
    if (!result) return null;
    const { yBuy, yMarket, capitalGain, pvBenefitPct, pvBenefit } = result;
    const pctRelabeled = (capitalGain / (100 - result.basisAtTrade) * 100).toFixed(0);
    if (result.capitalGain > 0) {
      return `Rates fell from ${(yBuy * 100).toFixed(2)}% to ${(yMarket * 100).toFixed(2)}%, so ${pctRelabeled}% of the interest you still owed tax on became capital gain, saving ${fmtDollar(pvBenefit)} (${fmtPct(pvBenefitPct)} of price) in present value.`;
    } else {
      return `Rates rose from ${(yBuy * 100).toFixed(2)}% to ${(yMarket * 100).toFixed(2)}%, creating a capital loss of ${fmtDollar(Math.abs(result.capitalGain))}. The wash sale rule (Section 1091) requires waiting 31 days before rebuying. A loss only delays tax -- it does not permanently reduce it.`;
    }
  }, [result]);

  // Stacked bar chart data for bucket breakdown
  const bucketData = result ? [
    { name: 'Buy and hold', interest: +(100 - result.basisAtTrade).toFixed(2), gain: 0 },
    { name: 'After the trade', interest: +result.interestLeft.toFixed(2), gain: +result.capitalGain.toFixed(2) },
  ] : [];

  return (
    <div>
      <h2 className="section-head">Single Trade</h2>

      <div className="inputs-row">
        <div className="input-group">
          <label>Buy month</label>
          <input type="month" value={`${buyYear}-${String(buyMonth).padStart(2, '0')}`}
            min="1953-04" max="2026-08"
            onChange={e => handleBuyChange(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Term (years)</label>
          <input type="number" value={term} min={5} max={30} step={1}
            onChange={e => setTerm(Math.max(5, Math.min(30, +e.target.value)))} />
        </div>
        <div className="input-group">
          <label>Sell and rebuy month</label>
          <input type="month" value={`${sellYear}-${String(sellMonth).padStart(2, '0')}`}
            min="1953-04" max="2026-08"
            onChange={e => handleSellChange(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Taxpayer type</label>
          <select value={taxpayerType} onChange={e => setTaxpayerType(e.target.value as 'zero' | 'longterm' | 'short')}>
            {Object.entries(TAXPAYER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label>Ordinary rate (%)</label>
          <input type="number" value={+(ordinaryRate * 100).toFixed(1)} min={0} max={60} step={0.1}
            onChange={e => setOrdinaryRate(+e.target.value / 100)} />
        </div>
      </div>

      {!result && (
        <div className="info-box warn">
          No data found for these dates, or sell month is not after buy month and before maturity.
        </div>
      )}

      {result && (
        <>
          <h3 className="section-head">Price vs. Tax Basis</h3>
          <label className="toggle-row">
            <input type="checkbox" checked={showNewBasis} onChange={e => setShowNewBasis(e.target.checked)} />
            Show the new basis path after the trade
          </label>
          {showNewBasis && (
            <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>
              Your basis path is fixed the day you buy. Only a sale and rebuy starts a new one.
            </p>
          )}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 8, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }}
                tickFormatter={v => v.slice(0, 7)}
                interval={Math.floor(chartData.length / 8)} />
              <YAxis domain={[60, 105]} tick={{ fontSize: 11 }} unit="$" />
              <Tooltip formatter={(v: unknown) => `$${(v as number).toFixed(2)}`} />
              <Legend />
              <ReferenceLine x={tradeLabel} stroke="#D98E04" strokeDasharray="4 4"
                label={{ value: 'Trade', position: 'top', fontSize: 11, fill: '#D98E04' }} />
              <Line type="monotone" dataKey="price" stroke="#2E6B4F" strokeWidth={2}
                dot={false} name="Market price" connectNulls />
              <Line type="monotone" dataKey="basis" stroke="#B23A2E" strokeWidth={2}
                dot={false} name="Tax basis" strokeDasharray="5 3" />
              {showNewBasis && (
                <Line type="monotone" dataKey="newBasis" stroke="#D98E04" strokeWidth={2}
                  dot={false} name="New basis (after trade)" connectNulls />
              )}
            </LineChart>
          </ResponsiveContainer>

          <h3 className="section-head">What Happens to Your Remaining Income</h3>
          <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '0.5rem' }}>
            Before the trade, all of {fmtDollar(100 - result.basisAtTrade)} is ordinary interest income.
            The trade splits it into capital gain (amber) plus interest left (red).
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={bucketData} layout="vertical" margin={{ top: 5, right: 80, left: 20, bottom: 5 }}>
              <XAxis type="number" domain={[0, Math.ceil(100 - result.basisAtTrade) + 2]} tick={{ fontSize: 11 }} unit="$" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
              <Tooltip formatter={(v: unknown) => `$${(v as number).toFixed(2)}`} />
              <Bar dataKey="interest" stackId="a" fill="#B23A2E" name="Interest (OID)" />
              <Bar dataKey="gain" stackId="a" fill="#D98E04" name="Capital gain" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.83rem', color: '#555', textAlign: 'center' }}>
            {fmtDollar(result.capitalGain)} gain + {fmtDollar(result.interestLeft)} interest = {fmtDollar(100 - result.basisAtTrade)} total remaining income
          </p>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Purchase price</div>
              <div className="stat-value">{fmt2(result.purchasePrice)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Capital gain relabeled</div>
              <div className="stat-value amber">{fmt2(result.capitalGain)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Nominal tax saved</div>
              <div className="stat-value">{fmt2(result.nominalTaxSaved)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">PV benefit ($)</div>
              <div className="stat-value green">{fmt2(result.pvBenefit)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">PV benefit (% of price)</div>
              <div className="stat-value green">{fmtPct(result.pvBenefitPct)}</div>
            </div>
          </div>

          {sentence && (
            <div className="plain-sentence">{sentence}</div>
          )}

          {result.capitalGain < 0 && (
            <div className="info-box loss">
              This trade creates a capital loss. The wash sale rule (Section 1091) means you must wait 31 days before rebuying if you want to claim the loss. Unlike gain harvesting, a loss only moves the tax to a later year -- it does not eliminate it.
            </div>
          )}

          <div className="assumptions">
            <strong>Assumptions:</strong> 10-year Treasury yield used as STRIPS yield for all remaining maturities (flat-curve proxy). Buy date: {buyLabel}, Sell date: {tradeLabel}.
            Rate at purchase: {((result.yBuy) * 100).toFixed(2)}%, rate at trade: {((result.yMarket) * 100).toFixed(2)}%.
            Ordinary rate: {(ordinaryRate * 100).toFixed(1)}%. No transaction costs.
          </div>
        </>
      )}
    </div>
  );
}
