function C(n, k) { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }
function hyper(N, K, n, k) { // P(X = k)
  return C(K, k) * C(N - K, n - k) / C(N, n);
}
function pAtLeast(N, K, n, k) { let p = 0; for (let i = k; i <= Math.min(K, n); i++) p += hyper(N, K, n, i); return p; }

console.log('--- hard(9) vs degrades=yes(13) of 30, overlap 6');
console.log('P(X>=6) =', pAtLeast(30, 13, 9, 6).toFixed(4), ' P(X=6)=', hyper(30, 13, 9, 6).toFixed(4));
console.log('--- hard(9) vs threshold 高(7) of 30, overlap 5');
console.log('P(X>=5) =', pAtLeast(30, 7, 9, 5).toFixed(4));
console.log('--- hard(9) vs threshold 低(11), overlap 0');
console.log('P(X=0) =', hyper(30, 11, 9, 0).toFixed(4));
console.log('--- hard(9) vs threshold 中(12), overlap 4');
console.log('P(X>=4) =', pAtLeast(30, 12, 9, 4).toFixed(4));
const f = x => x.toFixed(4);
console.log('expected hard in 高', (9 * 7 / 30).toFixed(2), ' observed 5');
console.log('expected hard overlap degrades', (9 * 13 / 30).toFixed(2), ' observed 6');
console.log('expected hard in 低', (9 * 11 / 30).toFixed(2), ' observed 0');
