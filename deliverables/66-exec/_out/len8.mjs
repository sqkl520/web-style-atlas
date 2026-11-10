const L=(n,s)=>console.log(n.padEnd(6)+String(s.length).padStart(4)+'  '+s);
const a="（上面说的刻意留空除外，那几处照旧空着）";
const b="（点名的那几处刻意留空除外）";
const c="（上面说的刻意留空照旧空着）";
const d="（点名的那几处照旧空着）";
L('a',a);L('b',b);L('c',c);L('d',d);
console.log('save yes='+(a.length-b.length)+'  save no='+(c.length-d.length));
