import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
const b = await Browser.launch({ width: 400, height: 200 });
const p = await b.newPage({ width: 400, height: 200, dsf: 4 });
await p.goto('data:text/html,<body style="margin:0;background:white"><div style="height:20px"></div><div id=a style="border-top:0.5px solid black;height:20px"></div><div style="height:20px"></div><div id=b style="border-top:1px solid black;height:20px"></div><div style="height:20px"></div><div id=c style="border-top:2px solid black;height:20px"></div></body>', { settleMs: 200 });
const data = await p.screenshot({ format: 'png' });
writeFileSync('shots/_borders.png', Buffer.from(data,'base64'));
console.log('saved');
await b.close();
