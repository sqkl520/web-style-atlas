const h2 = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const L = (c) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => { const [x, y] = [L(h2(a)), L(h2(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// claims from prototypes/_specs/_CURRENT-VALUES.md §1  (scheme, fg, bg, claimed)
const claims = [
  ['S02', '#111111', '#0B0B0F', 5.80],
  ['S03', '#13928E', '#101A1C', 4.66],
  ['S04', '#96550F', '#F0E2C8', 4.56],
  ['S04', '#FFFFFF', '#96550F', 5.83],
  ['S05', '#4FA83D', '#0E100D', 9.74],
  ['S05', '#111111', '#4FA83D', 6.30],
  ['S06', '#85572A', '#ECDEC6', 4.66],
  ['S06', '#241A12', '#ECDEC6', 12.85],
  ['S07', '#33505C', '#E7E7E0', 6.92],
  ['S07', '#1C1A16', '#E7E7E0', 13.99],
  ['S08', '#111111', '#C46A1F', 4.88],
  ['S09', '#1F4E79', '#F5C842', 5.45],
  ['S09', '#151310', '#F5C842', 11.68],
  ['S10', '#D32029', '#F2EFE8', 4.56],
  ['S11', '#1B4A4A', '#DCDDD2', 7.21],
  ['S12', '#111111', '#B5D626', 11.34],
  ['S13', '#7B612C', '#F4E3BE', 4.62],
  ['S14', '#111111', '#E4572E', 5.13],
  ['S15', '#3A3F45', '#E7EBE9', 8.83],
  ['S16', '#C52C0F', '#F7EBCF', 4.74],
  ['S16', '#1A1A1A', '#F7EBCF', 14.70],
  ['S16', '#FFFFFF', '#C52C0F', 5.61],
  ['S17', '#5A2A50', '#E1D6BD', 7.73],
  ['S18', '#111111', '#2FA84F', 6.15],
  ['S19', '#4A5C3A', '#E4DECD', 5.42],
  ['S20', '#26485C', '#FAF3E1', 8.77],
  ['S21', '#924307', '#E4DCC9', 5.08],
  ['S22', '#565B49', '#DDDAD4', 5.04],
  ['S22', '#FFFFFF', '#565B49', 6.51],
  ['S23', '#A8206B', '#DCDCC8', 4.90],
  ['S24', '#FFFFFF', '#5D43AD', 7.22],
  ['S25', '#914A27', '#E8E4DE', 5.16],
  ['S25', '#FFFFFF', '#914A27', 6.54],
  ['S27', '#0E6258', '#E8D7B5', 5.10],
  ['S28', '#AF74BE', '#0B0D12', 5.61],
  ['S29', '#644F02', '#D9D3C4', 5.29],
  ['S29', '#FFFFFF', '#644F02', 6.94],
  ['S29', '#E4B400', '#D9D3C4', 1.50],
  ['S30', '#007B3F', '#EDEDED', 4.59],
  ['S30', '#FFFFFF', '#007B3F', 5.38],
  ['S30', '#00E676', '#EDEDED', 1.43],
];

// palette pairs that the pages actually declare but nobody claimed
const extras = [
  ['S01', '#C1121F', '#EFE7D7', 'primary on paper'],
  ['S01', '#6E6A5E', '#EFE7D7', 'lead grey note on paper'],
  ['S01', '#1A1614', '#C1121F', 'ink inherited on red wedge'],
  ['S01', '#EFE7D7', '#C1121F', 'paper on red'],
  ['S02', '#B8860B', '#0B0B0F', 'gold on card'],
  ['S02', '#B9B09A', '#0B0B0F', 'ivory-2 on card'],
  ['S03', '#B9A98C', '#101A1C', 'tape on void'],
  ['S06', '#85572A', '#241A12', 'brown on ink block'],
  ['S06', '#C9A87C', '#ECDEC6', 'stain on paper'],
  ['S08', '#C46A1F', '#120C08', 'amber on room'],
  ['S08', '#6B4A22', '#120C08', 'wall on room'],
  ['S09', '#8A4B24', '#F5C842', 'rust on yellow board'],
  ['S11', '#6E7A64', '#DCDDD2', 'note green on paper'],
  ['S11', '#221E19', '#1B4A4A', 'ink on copy block'],
  ['S12', '#F2E9D8', '#B5D626', 'face on lime'],
  ['S12', '#111111', '#1E2A2E', 'btn ink on room'],
  ['S13', '#D6CDB9', '#F4E3BE', 'shade on paper'],
  ['S14', '#8A3320', '#12181D', 'hot backlight on dark'],
  ['S14', '#D8D2C4', '#E4572E', 'aluminium on foil orange'],
  ['S15', '#7A7466', '#E7EBE9', 'pencil on trace'],
  ['S17', '#7A2E2E', '#E1D6BD', 'seal on paper'],
  ['S17', '#C9BFA6', '#E1D6BD', 'stub on paper'],
  ['S18', '#6E6350', '#0A0D0A', 'tag on bay'],
  ['S18', '#2FA84F', '#C8C4AE', 'phosphor on paper section'],
  ['S19', '#A79C82', '#E4DECD', 'faded on paper'],
  ['S19', '#7C7460', '#E4DECD', 'faded-2 on paper'],
  ['S20', '#55606B', '#FAF3E1', 'pencil on paper'],
  ['S21', '#6E6A5E', '#E4DCC9', 'fibre on paper'],
  ['S21', '#FFFFFF', '#E4DCC9', 'white on paper'],
  ['S23', '#B7A78C', '#DCDCC8', 'mortar-lit on plaster'],
  ['S23', '#E9A9C6', '#DCDCC8', 'carmine-lit on plaster'],
  ['S24', '#6E8B7A', '#E6EDF2', 'moss on paper'],
  ['S24', '#3C5F48', '#0A1116', 'moss-2 on ink'],
  ['S25', '#2E6B5E', '#E8E4DE', 'spot-b on paper'],
  ['S26', '#FFFFFF', '#485270', 'white on blue'],
  ['S26', '#C8341F', '#D3D1CA', 'red on paper'],
  ['S27', '#221C10', '#0E6258', 'ink on green'],
  ['S28', '#AF74BE', '#D8D4C6', 'plum on paper'],
  ['S29', '#5A6068', '#D9D3C4', 'gray on paper'],
  ['S29', '#E4B400', '#1A1A17', 'bright on ink'],
  ['S30', '#007B3F', '#141414', 'green on ink'],
];

const p = (s, n) => String(s).padEnd(n);
console.log('=== CLAIMED RATIOS (from _CURRENT-VALUES.md) — recomputed ===');
console.log(p('case', 6) + p('fg', 9) + p('bg', 9) + p('claimed', 9) + p('actual', 8) + 'delta');
let bad = 0;
for (const [s, fg, bg, claim] of claims) {
  const a = ratio(fg, bg);
  const d = (a - claim).toFixed(2);
  const flag = Math.abs(a - claim) > 0.05 ? '  <<< MISMATCH' : '';
  if (flag) bad++;
  console.log(p(s, 6) + p(fg, 9) + p(bg, 9) + p(claim.toFixed(2), 9) + p(a.toFixed(2), 8) + d + flag);
}
console.log('mismatches:', bad);

console.log('\n=== UNCLAIMED PALETTE PAIRS (declared in :root, page uses both) ===');
console.log(p('case', 6) + p('fg', 9) + p('bg', 9) + p('ratio', 8) + p('AA-text', 9) + 'role');
for (const [s, fg, bg, role] of extras) {
  const a = ratio(fg, bg);
  const need = 4.5;
  console.log(p(s, 6) + p(fg, 9) + p(bg, 9) + p(a.toFixed(2), 8) + p(a >= need ? 'PASS' : (a >= 3 ? 'large-only' : 'FAIL'), 9) + role);
}
