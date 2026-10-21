export function Learn() {
  const cards = [
    {
      title: 'Two tax buckets',
      body: 'Interest income is taxed at up to 40.8% (37% rate plus 3.8% net investment income tax). Long-term capital gains are taxed at 23.8% or even 0% if you have banked capital losses. The STRIPS trick moves income from the high bucket to the low one.',
      cite: 'I.R.C. sections 1(h), 1211(b), 1411; Strnad at 72 and n.49',
    },
    {
      title: 'What is OID',
      body: 'The gap between what you paid and $100 is interest. You report a slice every year: slice = (basis times yield) minus coupons. A STRIPS has no coupons, so all return is OID. The rule exists to stop deferral of tax until maturity.',
      cite: 'I.R.C. section 1272; Strnad at 48, 62 n.32, 65 Table II',
    },
    {
      title: 'What is a STRIPS',
      body: 'A STRIPS is a Treasury note cut into one zero-coupon piece per payment. All return is OID. Section 1286 treats each buyer as holding a new issue at their price. Strnad models zero-coupon bonds generally, not STRIPS by name.',
      cite: 'I.R.C. section 1286; Strnad at 95, 98 n.78',
    },
    {
      title: 'Why rates move prices',
      body: 'Price = $100 divided by (1 + rate) to the power of years. When rates go up, prices go down. When rates fall, prices rise. A 10-year STRIPS bought at 3% costs about $74. The same bond at 0.6% is worth about $94.',
      cite: 'Strnad at 51-52',
    },
    {
      title: 'The basis is preordained',
      body: 'Your tax basis is fixed at purchase and grows at a constant rate. It tracks the value the bond would have "in a world with constant interest rates" (Strnad at 65). The market price does not follow it; prices "deviate a great deal" (at 52).',
      cite: 'Strnad at 52, 65',
    },
    {
      title: 'The trick',
      body: 'Rates fall: take the gain and future OID accruals are cut off (Strnad at 76). Rates rise: take the loss and "the loss comes earlier" (at 77). Gain harvesting permanently relabels income. Loss harvesting only delays it.',
      cite: 'Strnad at 76-77; Brennan and Morgan at 3',
    },
    {
      title: 'Wash sales',
      body: 'Section 1091 blocks losses if you rebuy within 30 days. But gain traders "do not have to worry about section 1091" (Strnad at 55 n.20). You can sell at a gain and rebuy the same day with no restriction.',
      cite: 'I.R.C. section 1091; Strnad at 55 n.20',
    },
    {
      title: 'What fixes would work',
      body: 'Small fixes fail; reform "would have to be more drastic" (Strnad at 115). Options include mark-to-market taxation, Auerbach\'s retrospective tax, or Brennan and Morgan\'s short-term interest rate proposal.',
      cite: 'Strnad at 115; Brennan and Morgan at 12-13',
    },
  ];

  return (
    <div>
      <h2 className="section-head">Learn the Basics</h2>
      <p style={{ fontSize: '0.95rem', color: '#555', marginBottom: '1.25rem' }}>
        Eight short cards covering everything a law student needs to follow the model.
      </p>
      <div className="learn-grid">
        {cards.map((c, i) => (
          <div className="learn-card" key={i}>
            <h3>{i + 1}. {c.title}</h3>
            <p>{c.body}</p>
            <p className="cite">{c.cite}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
