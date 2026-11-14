/* 判别值检验的共享实现。
 *
 * ═══ 为什么要有这个文件 ═══════════════════════════════════════════════
 *
 * 2026-11-14 一天之内，同一组逻辑在四个脚本里各写了一份，
 * 然后同一个 bug 犯了四次：
 *
 *   hitIn 的数值分支先做子串搜索 → '160PX'.includes('60PX') === true
 *
 * 更早还有一次：_discriminator-semantic 的 CASES 列表漏了 S21，
 * 于是它输出 64 而 check 输出 67 —— 而报告里写着「两边都输出 64/64，
 * 可互相验证」。**那句话从来没成立过。**
 *
 * 两份实现跑通不等于它们一致。规则相同也不等于输入相同。
 * 所以把「什么叫判别值」「什么算命中」这两件事收到一处，
 * 四份脚本都从这里 import。
 *
 * ═══ 这个模块的契约 ═══════════════════════════════════════════════════
 *
 * 只做纯计算，不碰文件系统、不读磁盘。调用方负责把文本读进来。
 * 这样它能被 --selftest 用内存数据直接测边界，不必依赖 _staged 里的真实文件。
 */

/* 从一份任务书里抽出所有「可测值」token。
 *   色值：#RRGGBB（统一大写，因为 CSS 里大小写不敏感）
 *   数值：Npx / Nvw / Nfr / Nmm / N%
 * 判据刻意窄：只认这五种单位。`N倍`、`N栏` 这类叙数不是可测值。
 *
 * ⚠️ `%` 后面不能再要求 `\b`：% 是非单词字符，与后面的空格之间没有词边界，
 * 于是 `12%` 会被整条正则漏掉。实测就漏了（22 案受影响）。
 * 改成「前面要求词边界（防 `a12px` 这种粘连），后面不再要求边界」。
 *
 * ⚠️ **必须跳过「最容易做成的错误样子」那一段。**
 * 38/38 份任务书都有这段，它的作用是告诉模型「不要做成什么」，
 * 里面出现的数字是**作者的设计说明**，不是施工目标：
 *   S15「主色石墨占 46%」        ← 描述作者自己的配色比例
 *   S32「饱和度必须停在 39%（42% 就进 AI 味窗口）」← 解释为什么不是 42%
 * 把它们当成判别值，会要求产物里出现 46%、42%，而模型正确地不会去写。
 * 实测这 2 个案因此各缺 2 个值，把命中率从 100% 拉到 94.7%。 */
export function tokensOf(txt) {
  const s = new Set();
  /* 截到「最容易做成的错误样子」之前。找不到就算了 —— 有些短任务书没有这段。 */
  const cut = txt.indexOf('最容易做成的错误样子');
  const body = cut > 0 ? txt.slice(0, cut) : txt;
  for (const m of body.matchAll(/#[0-9A-Fa-f]{6}/g)) s.add(m[0].toUpperCase());
  for (const m of body.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)/g)) s.add(m[0]);
  return s;
}

/* 判别值 = **只在这一份任务书里出现**的 token。
 *
 * `others` 必须是**其他所有**任务书的并集，不是"某一份"。
 * 遍历时漏掉任何一份，都会让判别值虚高（把别的案也有的值算成独有）。
 * 这个错误在 4 份实现里都不存在，但写在这里免得将来有人"优化"成抽样。 */
export function discriminatorsFor(id, allTokens) {
  const others = new Set();
  for (const [other, set] of Object.entries(allTokens)) {
    if (other === id) continue;
    for (const t of set) others.add(t);
  }
  return [...allTokens[id]].filter((t) => !others.has(t));
}

/* 某个判别值在产物里出现了吗？
 *
 * 三条边界，每一条都对应一个实测踩过的坑：
 *   ① 118px 不能被 1180px 命中 —— 左边界不能是数字或小数点
 *   ② 60px 不能被 160px 命中 —— 所以**不能**用 includes 做子串搜索。
 *      这一条是 2026-11-14 的自测用例抓到的，当时四份实现都错
 *   ③ 60vw 不能被当成 60px —— 单位必须与判别值自身一致，
 *      不能写成交替 (px|vw|fr|mm|%)
 *
 * 参数 `htmlUpper` 期望是已经 toUpperCase 的产物文本；
 * hex 判别值本身也是大写的，两边口径一致。 */
export function hitIn(htmlUpper, t) {
  if (t.startsWith('#')) return htmlUpper.includes(t);
  const num = t.replace(/[a-z%]+$/, '');
  const unit = t.slice(num.length);          // 'px' / 'vw' / 'fr' / 'mm' / '%'
  const re = new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}\\s*${unit}`, 'i');
  return re.test(htmlUpper);
}

/* 找某案的产物文件。
 *
 * 候选名按优先级：sandbox → judge → 裸案号。
 * ⚠️ 三份脚本原来各有一份，且**候选名单不一致**：
 *   crosscheck 查 3 个、semantic 查 3 个、report-numbers-audit 只查 2 个
 *   （缺 `${id}.html`）。当前 _staged 里没有裸案号文件，所以没出事，
 *   但那是个潜在分歧 —— 有人按 `S31.html` 存一份就会有的脚本看得到、有的看不到。
 *
 * 参数 `upper` 控制是否转大写：
 *   · 判别值命中判定要大写（与 hex 口径一致）
 *   · 语义位置检查要原样（它要匹配 CSS 声明里的大小写）
 * 这是**唯一**该允许的分歧，所以做成显式参数而不是两份实现。 */
export function findArtifact(STAGED, id, { exists, read, upper = true } = {}) {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`, `${id}.html`]) {
    const f = `${STAGED}/${n}`;
    if (exists(f)) {
      const txt = read(f);
      return upper ? txt.toUpperCase() : txt;
    }
  }
  return null;
}
