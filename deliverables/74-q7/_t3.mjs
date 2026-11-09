import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const b = await Browser.launch({ width: 800, height: 400 });
for (const dsf of [1,2]) {
  const p = await b.newPage({ width: 800, height: 400, dsf });
  await p.goto('file:///D:/Web/style/deliverables/74-q7/_b.html' +
    '<div id=h1 style="border-top:0.5px solid #000;height:20px"></div>' +
    '<div id=h2 style="border-top:1px solid #000;height:20px"></div>' +
    '<div id=h3 style="border-top:2px solid #000;height:20px"></div></body>', { settleMs: 200 });
  const r = await p.eval(() => ['h1','h2','h3'].map(id => {
    const e = document.getElementById(id);
    return { id, rectH: e.getBoundingClientRect().height, bt: getComputedStyle(e).borderTopWidth, offsetTop: e.offsetTop };
  }));
  console.log('dsf', dsf, JSON.stringify(r));
  await p.close();
}
await b.close();
