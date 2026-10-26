// 极简静态服务：给 CDP 复验提供 http:// 源（端口 9560，见任务约束）。
// 为什么不直接用 file://：prompts.js/data.js 都是相对路径加载，http 下行为与线上一致，
// 且截图/字体请求不会因 file:// 的 CORS 策略产生噪声。端口固定 9560 便于复用/排查。
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = "D:/Web/style";
const PORT = Number(process.argv[2] || 9560);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon",
};

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    /* 坑：一开始把 "/" 直接映射成 /prototypes/_selection/index.html（200 而不是跳转）。
       index.html 里 data.js / prompts.js 都是**相对路径**，浏览器按 URL 的目录部分解析，
       于是请求打到 /data.js → 404，页面白渲染成 0 行、window.SCHEMES 为 undefined。
       必须 302 到真实目录，相对路径才落在 /prototypes/_selection/ 下。 */
    if (p === "/") {
      res.writeHead(302, { location: "/prototypes/_selection/index.html" }).end();
      return;
    }
    if (p.endsWith("/")) p += "index.html";
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(normalize(ROOT))) { res.writeHead(403).end("no"); return; }
    const buf = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("404");
  }
}).listen(PORT, "127.0.0.1", () => console.log("serving on http://127.0.0.1:" + PORT));
