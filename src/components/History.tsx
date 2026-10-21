import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { validPurchaseMonths, anniversaryRate } from '../lib/data';
import { price, computeYearlyRule } from '../lib/strips';

const ORDINARY = 0.408;
const TERM = 10;

interface BenefitRow {
  buyYear: number;
  buyMonth: number;
  benefit: number;
}

interface HistoryData {
  gain: BenefitRow[];
  loss: BenefitRow[];
}

function computeHistory(): HistoryData {
  const months = validPurchaseMonths(TERM);
  const gain: BenefitRow[] = [];
  const loss: BenefitRow[] = [];

  for (const row of months) {
    const yBuy = row.rate;
    const purchasePrice = price(yBuy, TERM);

    const ratesForYears: (number | null)[] = [];
    for (let k = 1; k <= TERM; k++) {
      ratesForYears.push(anniversaryRate(row.year, row.month, k));
    }

    const gResult = computeYearlyRule(purchasePrice, yBuy, TERM, ratesForYears, ORDINARY, 0, 'gain');
    const lResult = computeYearlyRule(purchasePrice, yBuy, TERM, ratesForYears, ORDINARY, ORDINARY, 'loss');

    gain.push({ buyYear: row.year, buyMonth: row.month, benefit: gResult.pvBenefitPct });
    loss.push({ buyYear: row.year, buyMonth: row.month, benefit: lResult.pvBenefitPct });
  }

  return { gain, loss };
}

function stats(rows: BenefitRow[]) {
  if (!rows.length) return null;
  const vals = rows.map(r => r.benefit).sort((a, b) => a - b);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const median = vals[Math.floor(vals.length / 2)];
  const p90 = vals[Math.floor(vals.length * 0.9)];
  const gt0 = vals.filter(v => v > 0).length / vals.length * 100;
  const gt1 = vals.filter(v => v > 1).length / vals.length * 100;
  const gt5 = vals.filter(v => v > 5).length / vals.length * 100;
  const gt10 = vals.filter(v => v > 10).length / vals.length * 100;
  const pre86 = rows.filter(r => r.buyYear < 1986).map(r => r.benefit);
  const post86 = rows.filter(r => r.buyYear >= 1986).map(r => r.benefit);
  const meanPre86 = pre86.length ? pre86.reduce((s, v) => s + v, 0) / pre86.length : 0;
  const meanPost86 = post86.length ? post86.reduce((s, v) => s + v, 0) / post86.length : 0;
  return { mean, median, p90, gt0, gt1, gt5, gt10, meanPre86, meanPost86, n: vals.length };
}

function buildHistogram(rows: BenefitRow[]) {
  const bins: { range: string; count: number; rangeMin: number }[] = [];
  for (let lo = -5; lo <= 30; lo += 1) {
    const count = rows.filter(r => r.benefit >= lo && r.benefit < lo + 1).length;
    bins.push({ range: `${lo}%`, count, rangeMin: lo });
  }
  return bins.filter(b => b.count > 0 || (b.rangeMin >= 0 && b.rangeMin <= 15));
}

function buildDecadeChart(gain: BenefitRow[], loss: BenefitRow[], pre86Only: boolean) {
  const decades = [1950, 1960, 1970, 1980, 1990, 2000, 2010];
  return decades.map(d => {
    const startYear = d;
    const endYear = d + 9;
    const filter = (rows: BenefitRow[]) => rows.filter(r => {
      const inDecade = r.buyYear >= startYear && r.buyYear <= endYear;
      if (pre86Only) return inDecade && r.buyYear < 1986;
      return inDecade && r.buyYear >= 1986;
    });
    const gRows = filter(gain);
    const lRows = filter(loss);
    const meanG = gRows.length ? gRows.reduce((s, r) => s + r.benefit, 0) / gRows.length : 0;
    const meanL = lRows.length ? lRows.reduce((s, r) => s + r.benefit, 0) / lRows.length : 0;
    return {
      decade: `${d}s`,
      'Gain harvesting (Zero Rate)': +meanG.toFixed(2),
      'Loss harvesting (Short Rate)': +meanL.toFixed(2),
      n: gRows.length,
    };
  }).filter(d => d.n > 0);
}

interface Props {
  buyYear: number;
  buyMonth: number;
  term: number;
  taxpayerType: string;
}

export function History({ buyYear, buyMonth }: Props) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [pre86, setPre86] = useState(false);

  // Defer heavy computation so the tab renders its shell immediately
  useEffect(() => {
    const id = setTimeout(() => {
      const result = computeHistory();
      setData(result);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const gainStats = data ? stats(data.gain) : null;
  const lossStats = data ? stats(data.loss) : null;

  const gainHist = data ? buildHistogram(data.gain) : [];
  const decadeData = data ? buildDecadeChart(data.gain, data.loss, pre86) : [];

  // Find user's example percentile
  const userBenefit = data
    ? data.gain.find(r => r.buyYear === buyYear && r.buyMonth === buyMonth)?.benefit
    : null;
  const userPctile = data && userBenefit !== undefined
    ? (data.gain.filter(r => r.benefit <= userBenefit!).length / data.gain.length * 100).toFixed(0)
    : null;

  return (
    <div>
      <h2 className="section-head">History Explorer</h2>
      <p style={{ fontSize: '0.95rem', color: '#555', marginBottom: '1rem' }}>
        Zero Rate gain harvesting and Short Rate loss harvesting run for every purchase month
        from April 1953 through August 2016 (761 months) with a 10-year term.
        Ordinary rate: 40.8%. The benefit is the PV of tax saved divided by purchase price.
      </p>

      {!data && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#777', fontSize: '1.05rem' }}>
          <span style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.5rem' }}>&#8987;</span>
          Computing 761 purchase scenarios...
        </div>
      )}

      {data && gainStats && lossStats && (
        <>
          <h3 className="section-head">Zero Rate Gain Harvesting</h3>
          <div className="hist-stats-grid">
            <div className="hist-stat"><div className="hs-label">Months analyzed</div><div className="hs-value">{gainStats.n}</div></div>
            <div className="hist-stat"><div className="hs-label">Mean benefit</div><div className="hs-value amber">{gainStats.mean.toFixed(2)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Median benefit</div><div className="hs-value">{gainStats.median.toFixed(2)}%</div></div>
            <div className="hist-stat"><div className="hs-label">90th percentile</div><div className="hs-value">{gainStats.p90.toFixed(2)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Months with any benefit</div><div className="hs-value">{gainStats.gt0.toFixed(1)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Benefit over 1%</div><div className="hs-value">{gainStats.gt1.toFixed(1)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Benefit over 5%</div><div className="hs-value">{gainStats.gt5.toFixed(1)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Benefit over 10%</div><div className="hs-value">{gainStats.gt10.toFixed(1)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Mean pre-1986</div><div className="hs-value">{gainStats.meanPre86.toFixed(2)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Mean 1986+</div><div className="hs-value">{gainStats.meanPost86.toFixed(2)}%</div></div>
            {userPctile && <div className="hist-stat"><div className="hs-label">Your example percentile</div><div className="hs-value amber">{userPctile}th</div></div>}
          </div>

          <h3 className="section-head">Distribution of Benefit % (Gain Harvesting)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={gainHist} margin={{ top: 8, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e0" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={1} angle={-45} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Months', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => `${v as number} months`} />
              {userBenefit !== undefined && (
                <ReferenceLine x={`${Math.floor(userBenefit!)}%`}
                  stroke="#D98E04" strokeDasharray="4 4"
                  label={{ value: 'Your example', position: 'top', fontSize: 10, fill: '#D98E04' }} />
              )}
              <Bar dataKey="count" fill="#2E6B4F" name="Months" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <h3 className="section-head" style={{ marginTop: '1.5rem' }}>
            Average Benefit by Decade
            <span style={{ marginLeft: '1.25rem' }}>
              <label className="toggle-row" style={{ display: 'inline-flex', fontWeight: 400, fontSize: '0.85rem' }}>
                <input type="checkbox" checked={pre86} onChange={e => setPre86(e.target.checked)} />
                Pre-1986 only (hide 1986+)
              </label>
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={decadeData} margin={{ top: 8, right: 20, bottom: 8, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e0" />
              <XAxis dataKey="decade" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: unknown) => `${(v as number).toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="Gain harvesting (Zero Rate)" fill="#2E6B4F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Loss harvesting (Short Rate)" fill="#B23A2E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <h3 className="section-head">Short Rate Loss Harvesting</h3>
          <div className="hist-stats-grid">
            <div className="hist-stat"><div className="hs-label">Mean benefit</div><div className="hs-value">{lossStats.mean.toFixed(2)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Benefit over 1%</div><div className="hs-value">{lossStats.gt1.toFixed(1)}%</div></div>
            <div className="hist-stat"><div className="hs-label">Benefit over 5%</div><div className="hs-value">{lossStats.gt5.toFixed(1)}%</div></div>
          </div>
          <p style={{ fontSize: '0.83rem', color: '#666', marginTop: '0.5rem' }}>
            Loss harvesting only delays tax -- the benefit is smaller because a capital loss at Short Rate
            (40.8%) offers no rate advantage over ordinary income. Any benefit comes from the time value of
            deferring the tax.
          </p>
        </>
      )}
    </div>
  );
}
