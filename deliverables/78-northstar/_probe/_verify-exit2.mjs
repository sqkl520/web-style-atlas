// 二分定位：哪一步引入了退出延迟？
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
const t0 = Date.now();
process.on('exit', () => console.log('总耗时: ' + (Date.now()-t0) + ' ms'));

const browser = await Browser.launch();
console.log('launch 完成: ' + (Date.now()-t0) + ' ms');

const t1 = Date.now();
await browser.close();
console.log('close 完成: ' + (Date.now()-t1) + ' ms');
console.log('→ 接下来看进程什么时候真正退出');
