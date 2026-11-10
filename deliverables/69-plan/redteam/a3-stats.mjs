// A3 (corrected): exact binomial inference.
// If x=n (all pass), the exact one-sided 95% lower bound on the true pass rate is
//   p_lo = 1 - alpha^(1/n)  = 1 - 0.05^(1/n)
// because P(all n pass | p) = p^n >= alpha  <=>  p >= alpha^(1/n).
// This is the Clopper-Pearson lower limit when x=n.
const alpha = 0.05;

// x = n (all pass): P(all n pass | p) = p^n >= alpha  <=>  p >= alpha^(1/n).
// This is the exact one-sided 95% Clopper-Pearson LOWER limit, and it is SMALL for small n.
const lowerAll = (n) => Math.pow(alpha, 1 / n);

// General exact lower bound (Clopper-Pearson) via the Beta quantile identity:
// p_lo satisfies P(X >= x | n, p_lo) = alpha. Solve by bisection on the SURVIVAL function.
function logFact(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
const logChoose = (n, k) => logFact(n) - logFact(k) - logFact(n - k);
const pmf = (k, n, p) => (p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0)
  : Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p)));
function survival(x, n, p) { let s = 0; for (let k = x; k <= n; k++) s += pmf(k, n, p); return s; }
function cpLower(x, n) {
  if (x === 0) return 0;
  if (x === n) return Math.pow(alpha, 1 / n); // closed form (exact one-sided lower limit)
  // survival(x,n,p) is INCREASING in p. Find p where it equals alpha: below that it is < alpha.
  let lo = 0, hi = 1;
  for (let i = 0; i < 300; i++) {
    const m = (lo + hi) / 2;
    if (survival(x, n, m) >= alpha) hi = m; else lo = m;
  }
  return (lo + hi) / 2;
}

const table = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30].map((n) => ({ n, allPassLower95: +lowerAll(n).toFixed(4) }));
const mixed = [[3, 3], [3, 2], [5, 5], [5, 4], [10, 10], [10, 9], [30, 30], [30, 29], [30, 27], [30, 25], [30, 24]]
  .map(([n, x]) => ({ n, x, lower95: +cpLower(x, n).toFixed(4), point: +(x / n).toFixed(3) }));

// How many all-pass runs are needed to claim >=90% with 95% confidence?
const nFor90 = Math.ceil(Math.log(alpha) / Math.log(0.90));
const nFor95 = Math.ceil(Math.log(alpha) / Math.log(0.95));
const nFor99 = Math.ceil(Math.log(alpha) / Math.log(0.99));

// Predictive, given 3/3 pass, under uniform prior on p:
//   posterior Beta(4,1); P(next passes) = 4/5; E[# of remaining 27 that pass] = 27*0.8
const pred = {
  posteriorAfter33: 'Beta(4,1)', pNextPass: 0.8,
  expectedPassOfRemaining27: +(27 * 0.8).toFixed(1),
  expectedTotalOf30: +(3 + 27 * 0.8).toFixed(1),
  pAll30PassGiven33: +(Math.pow(0.8, 27)).toExponential(3),
  // 95% posterior interval for p after 3/3 (Beta(4,1)): quantiles
};

// Beta(4,1) quantiles: CDF = p^4, so q = alpha^(1/4)
pred.pLower95After33 = +Math.pow(0.025, 1 / 4).toFixed(4);
pred.pUpper95After33 = +Math.pow(0.975, 1 / 4).toFixed(4);

const out = {
  formula: 'x=n: lower95 = 0.05^(1/n) (exact one-sided Clopper-Pearson lower limit); general: bisection on the binomial survival function',
  allPassTable: table,
  mixedTable: mixed,
  allPassRunsNeeded: { for90pct: nFor90, for95pct: nFor95, for99pct: nFor99 },
  predictiveGiven3of3: pred,
  // what a 3-of-30 sample can rule out: 3/3 passing rules out p<=? at 95%
  threeOfThreeRulesOut: +Math.pow(alpha, 1 / 3).toFixed(4),
};
console.log(JSON.stringify(out, null, 1));


