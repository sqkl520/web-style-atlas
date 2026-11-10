import fs from 'node:fs'; import path from 'node:path';
const ROOT='D:/Web/style/prototypes';
const dirs=fs.readdirSync(ROOT).filter(d=>/^S\d\d-/.test(d)).sort();
for(const d of dirs){
  const p=path.join(ROOT,d);
  const html=fs.readFileSync(path.join(p,'index.html'),'utf8');
  const files=fs.readdirSync(p).filter(f=>fs.statSync(path.join(p,f)).isFile());
  const js=files.filter(f=>/\.js$/i.test(f));
  const scripts=[...html.matchAll(/<script\b[^>]*>/gi)].map(m=>m[0]);
  const srcs=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map(m=>m[1]);
  const inline=scripts.filter(s=>!/\bsrc=/.test(s)).length;
  console.log(`${d} | files=[${files.filter(f=>!/^(index\.html|style\.css)$/.test(f)).join(',')}] | inlineJS=${inline} | srcJS=[${srcs.join(',')}] | jsFiles=[${js.join(',')}]`);
}
