// checked-spawn.mjs — spawnSync 的"必须查返回值"版本。
//
// 为什么要有它（deliverables/39-critique-toolchain-repro.md §2-B10、§6.4-2、§10-T0-8）：
//   `assign-assets.mjs` 原先直接 `spawnSync(PY, [...])` 把返回值丢掉 —— Python 生成纹理失败时
//   **完全静默**，脚本继续往下写 credits.json / CREDITS.md，于是署名表自称有纹理，而
//   `assets/` 里一张 texture 都没有。实测发生过（39 §T0-8）。
//   对照组的正确写法在同仓 `fetch-scheme-assets.mjs:252-253`（取回 r、判 r.status）；
//   这里比它更严一级：**error / 非零 status / 被信号杀死，三种情况一律抛错并带上 stderr 原文**。
//
// 用法：
//   import { spawnChecked } from './checked-spawn.mjs';
//   const { stdout, stderr } = spawnChecked(python, [script, jobFile], { label: 'make-textures.py S18' });
//
// 注意：默认把子进程的 stdout/stderr **收进管道**（不是 inherit），这样才能把原文写进错误信息。
// 成功时调用方自己决定要不要把 stdout 转给用户（assign-assets 会转写）。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} command  可执行文件（绝对路径或 PATH 上的名字）
 * @param {string[]} args   参数
 * @param {{label?: string, encoding?: string, cwd?: string, timeout?: number, env?: object}} [opts]
 * @returns {{status: number, stdout: string, stderr: string}}
 * @throws {Error} 启动失败 / 退出码非零 / 被信号杀死 —— message 里带 command、退出码与 stderr 原文
 */
export function spawnChecked(command, args, opts = {}) {
  const { label, encoding = 'utf8', ...rest } = opts;
  const tag = label || command;
  const r = spawnSync(command, args, { encoding, ...rest });
  const stdout = typeof r.stdout === 'string' ? r.stdout : (r.stdout ? r.stdout.toString('utf8') : '');
  const stderr = typeof r.stderr === 'string' ? r.stderr : (r.stderr ? r.stderr.toString('utf8') : '');
  const cmdline = command + ' ' + args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ');
  if (r.error) {
    // 启动就没成功（ENOENT：解释器路径不存在/拼错；EACCES：不可执行……）
    throw new Error(
      `[checked-spawn] ${tag} 启动失败：${r.error.code || ''} ${r.error.message}\n` +
      `  command: ${cmdline}\n` +
      `  解释器/程序路径存在吗？（这是 spawnSync 返回值检查，不再静默继续）`);
  }
  if (r.signal) {
    throw new Error(
      `[checked-spawn] ${tag} 被信号终止：signal=${r.signal} status=${r.status}\n` +
      `  command: ${cmdline}\n` +
      `  stderr 原文：\n${stderr.trim() || '(空)'}\n` +
      `  stdout 原文：\n${stdout.trim() || '(空)'}`);
  }
  if (r.status !== 0) {
    throw new Error(
      `[checked-spawn] ${tag} 退出码 ${r.status}（非零，视为失败）\n` +
      `  command: ${cmdline}\n` +
      `  stderr 原文：\n${stderr.trim() || '(空)'}\n` +
      `  stdout 原文：\n${stdout.trim() || '(空)'}`);
  }
  return { status: r.status, stdout, stderr };
}

/**
 * 退出码 0 不等于"产物存在"。make-textures.py 对未知生成器是 print 一行然后 continue，
 * 最后照样 `return 0`（它自己 L350-353），实测：job 里全部生成器名写错 ⇒ exit=0、目录里 0 个文件
 * （42-scratch/t5-job.json 复现）。所以查完返回值还要**点名磁盘上缺哪些文件**，
 * 否则"署名表自称有纹理而 assets/ 一张都没有"这个原缺陷会以新形态复活。
 *
 * @param {string} dir      期望文件所在目录
 * @param {string[]} files  期望存在的文件名
 * @param {{label?: string, detail?: string}} [opts] detail 通常放子进程的 stdout 原文
 * @throws {Error} 任何一个文件不存在
 */
export function assertFilesExist(dir, files, opts = {}) {
  const { label = 'spawn', detail = '' } = opts;
  const absent = files.filter((f) => !existsSync(join(dir, f)));
  if (!absent.length) return { ok: true, present: files.length, absent: [] };
  throw new Error(
    `[checked-spawn] ${label}：进程退出码 0，但 ${absent.length}/${files.length} 个期望产物不在 ${dir}：\n` +
    `  缺失: ${absent.join(', ')}\n` +
    (detail ? `  子进程输出原文：\n${detail.trim() || '(空)'}` : '  子进程没有任何输出。'));
}
