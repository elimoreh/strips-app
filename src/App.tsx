import { useState, useMemo } from 'react';
import './index.css';
import { SingleTrade } from './components/SingleTrade';
import { History } from './components/History';
import { Compare } from './components/Compare';
import { Learn } from './components/Learn';
import { getRate } from './lib/data';
import { price, computeSingleTrade } from './lib/strips';
import type { SingleTradeResult } from './lib/strips';

type Tab = 'single' | 'history' | 'compare' | 'learn';

const CAPITAL_RATES = { zero: 0, longterm: 0.238, short: 0.408 };
const ORDINARY_DEFAULT = 0.408;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('single');
  const [buyYear, setBuyYear] = useState(2018);
  const [buyMonth, setBuyMonth] = useState(11);
  const [term, setTerm] = useState(10);
  const [sellYear, setSellYear] = useState(2020);
  const [sellMonth, setSellMonth] = useState(7);
  const [taxpayerType, setTaxpayerType] = useState<keyof typeof CAPITAL_RATES>('zero');
  const [ordinaryRate, setOrdinaryRate] = useState(ORDINARY_DEFAULT);

  const singleTradeResult: SingleTradeResult | null = useMemo(() => {
    const yBuy = getRate(buyYear, buyMonth);
    if (!yBuy) return null;
    const purchasePrice = price(yBuy, term);
    const monthsElapsed = (sellYear - buyYear) * 12 + (sellMonth - buyMonth);
    if (monthsElapsed <= 0 || monthsElapsed >= term * 12) return null;
    const yearsElapsed = monthsElapsed / 12;
    const yMarket = getRate(sellYear, sellMonth);
    if (!yMarket) return null;
    const yearsRemaining = term - yearsElapsed;
    const mktPrice = price(yMarket, yearsRemaining);
    return computeSingleTrade(
      purchasePrice, yBuy, yearsElapsed, mktPrice, yMarket,
      term, ordinaryRate, CAPITAL_RATES[taxpayerType],
    );
  }, [buyYear, buyMonth, term, sellYear, sellMonth, taxpayerType, ordinaryRate]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'single', label: 'Single Trade' },
    { key: 'history', label: 'History' },
    { key: 'compare', label: 'Compare' },
    { key: 'learn', label: 'Learn' },
  ];

  return (
    <div>
      <header className="app-header">
        <h1 className="app-title">STRIPS Tax Trading Calculator</h1>
        <nav>
          <ul className="tabs">
            {tabs.map(t => (
              <li key={t.key}>
                <button
                  className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="app-content">
        {activeTab === 'single' && (
          <SingleTrade
            buyYear={buyYear} setBuyYear={setBuyYear}
            buyMonth={buyMonth} setBuyMonth={setBuyMonth}
            term={term} setTerm={setTerm}
            sellYear={sellYear} setSellYear={setSellYear}
            sellMonth={sellMonth} setSellMonth={setSellMonth}
            taxpayerType={taxpayerType} setTaxpayerType={setTaxpayerType}
            ordinaryRate={ordinaryRate} setOrdinaryRate={setOrdinaryRate}
            result={singleTradeResult}
          />
        )}
        {activeTab === 'history' && (
          <History
            buyYear={buyYear} buyMonth={buyMonth}
            term={term} taxpayerType={taxpayerType}
          />
        )}
        {activeTab === 'compare' && (
          <Compare result={singleTradeResult} taxpayerType={taxpayerType} />
        )}
        {activeTab === 'learn' && <Learn />}

        <footer className="footer">
          Data: Fed H.15 10-yr yields (monthly). Flat-curve proxy, annual trading, no transaction costs. For teaching, not tax advice.
        </footer>
      </main>
    </div>
  );
}
