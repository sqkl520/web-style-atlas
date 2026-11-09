import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const b = await Browser.launch({ width: 800, height: 400 });
for (const dsf of [1,2,3]) {
  const p = await b.newPage({ width: 800, height: 400, dsf });
  await p.goto('data:text/html,<body style="margin:0"><div id=a style="border-left:0.5px solid black;height:20px"></div><div id=b style="border-left:0.5px solid black;height:20px;background:red"></div></body>', { settleMs: 200 });
  const r = await p.eval(() => {
    const a = document.getElementById('a');
    return { computed: getComputedStyle(a).borderLeftWidth, dpr: window.devicePixelRatio, rect: a.getBoundingClientRect().width };
  });
  console.log('dsf', dsf, JSON.stringify(r));
  await p.close();
}
await b.close();
