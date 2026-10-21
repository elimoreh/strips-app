import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList, ResponsiveContainer,
} from 'recharts';
import type { SingleTradeResult } from '../lib/strips';

interface Props {
  result: SingleTradeResult | null;
  taxpayerType: 'zero' | 'longterm' | 'short';
}

export function Compare({ result, taxpayerType }: Props) {
  const yourValue = result ? +result.pvBenefitPct.toFixed(2) : null;

  const refBars = [
    { label: 'Sims: 20-yr zero', value: 1.06, color: '#888', cite: 'Strnad at 51 n.13' },
    { label: 'Strnad: 10-yr par, Zero Rate (40/40/30)', value: 3.80, color: '#888', cite: 'Strnad Table X, at 102' },
    { label: 'Real data avg 1953-2016', value: 3.95, color: '#2E6B4F', cite: 'Computed (approx)' },
    ...(yourValue !== null
      ? [{ label: 'Your trade', value: yourValue, color: '#D98E04', cite: 'Live result' }]
      : []),
    { label: 'Strnad: 12-yr zero, Zero Rate (50%)', value: 15.69, color: '#888', cite: 'Strnad Table IX, at 95' },
  ];

  const data = refBars.map(b => ({ ...b, displayValue: b.value }));

  return (
    <div>
      <h2 className="section-head">Compare to the Readings</h2>
      <p style={{ fontSize: '0.95rem', color: '#444', marginBottom: '1.25rem' }}>
        PV benefit as a percent of purchase price, from published models and real data.
        {taxpayerType !== 'zero' && ' Switch to Zero Rate on the Single Trade tab to match Strnad\'s model.'}
      </p>

      <ResponsiveContainer width="100%" height={Math.max(260, refBars.length * 62)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 80, bottom: 8, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e8e0" horizontal={false} />
          <XAxis type="number" unit="%" domain={[0, 18]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={210} />
          <Tooltip formatter={(v: unknown) => `${(v as number).toFixed(2)}%`} />
          <Bar dataKey="displayValue" name="Benefit %" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
            <LabelList dataKey="displayValue" position="right" formatter={(v: unknown) => `${(v as number).toFixed(2)}%`}
              style={{ fontSize: 11, fill: '#333' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="compare-note">
        <strong>Note:</strong> Strnad's model uses 50% tax rates and interest rates averaging 14%
        (at 56 n.21, 71), which make tax trading worth more than at today's rates.
      </p>

      <div className="brennan-box">
        <strong>Brennan &amp; Morgan conversion ratio</strong> (gain vs. loss harvesting gap):
        39.4% for 1953-2011; 49.0% since 1986 (Brennan &amp; Morgan at 3).
        The conversion ratio is the share of original OID that gets relabeled as capital gain through trades.
      </div>
    </div>
  );
}
