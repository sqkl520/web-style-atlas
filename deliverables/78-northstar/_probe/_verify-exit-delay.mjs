// 决定性实验：那 16 秒延迟是这个库造成的，还是 Node 在 Windows 上的通性？
// 判据：不碰 cdp.mjs，只起一个无子进程的脚本，看它退出要多久。
console.log('开始');
const t = Date.now();
process.on('exit', () => console.log('纯 node 脚本退出耗时: ' + (Date.now()-t) + ' ms'));
