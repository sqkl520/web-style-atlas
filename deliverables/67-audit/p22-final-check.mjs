// p22-final-check.mjs — 报告里 §1.2 的 rail 逐项 + 合计是否闭合（以 HEAD 的 data-p17 为准重算）。
const items = [212.4, 51.2, 176.2, 51.2, 101.1, 37, 51.2, 51.2, 148, 51.2, 51.2, 115.7];
const gaps = [22, 22, 22, 22, 26, 16, 22, 22, 22, 22, 22];
const pad = 12 + 12, border = 2;
const sumItems = items.reduce((a, b) => a + b, 0);
const sumGaps = gaps.reduce((a, b) => a + b, 0);
console.log('items', sumItems.toFixed(1), 'gaps', sumGaps, 'pad', pad, 'border', border);
console.log('内容自然高 =', (sumItems + sumGaps + pad + border).toFixed(1), '（实测 scrollHeight 1384）');
console.log('可见高 =', 337.6, ' 内容被截 =', (sumItems + sumGaps + pad + border - 337.6).toFixed(1));
