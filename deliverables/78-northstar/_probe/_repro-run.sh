#!/bin/bash
# 可复现性测试：同一份提示词、同一份配置，再跑一次。
# 判据不是「产出相同」（生成任务不该逐字相同），而是「硬约束是否同样命中」。
set -u
BOX=/tmp/repro
rm -rf "$BOX"; mkdir -p "$BOX/home/.claude" "$BOX/work"
cp /c/Users/Administrator/.claude/settings.json "$BOX/home/.claude/settings.json"
cp /c/Users/Administrator/.claude.json "$BOX/home/.claude.json"
cp /d/Web/style/deliverables/78-northstar/_probe/_feasibility-prompt-S31.txt "$BOX/work/task.txt"
cd "$BOX/work" || exit 1

echo "===== 第二轮开始 $(date +%T) ====="
START=$(date +%s)
env -i \
  PATH="/c/Users/Administrator/.local/bin:/usr/bin:/bin" \
  HOME="$BOX/home" USERPROFILE='C:\tmp\repro\home' \
  ANTHROPIC_API_KEY='PROXY_MANAGED' ANTHROPIC_BASE_URL='http://127.0.0.1:15721' \
  CLAUDE_CODE_EFFORT_LEVEL='max' \
  timeout 1500 claude -p "请读当前目录下的 task.txt，按里面的要求完成工作。只输出必要的最少文字。" \
  --model opus --permission-mode acceptEdits 2>&1 | tail -8
echo "---- EXIT:${PIPESTATUS[0]}  耗时 $(( $(date +%s) - START ))s"

if [ -f "$BOX/work/out.html" ]; then
  cp "$BOX/work/out.html" /tmp/repro-S31-run2.html
  echo "===== 产物 $(wc -c < /tmp/repro-S31-run2.html) 字节 / $(wc -l < /tmp/repro-S31-run2.html) 行 ====="
  echo "----- 配色 -----"
  grep -o '#[0-9A-Fa-f]\{6\}' /tmp/repro-S31-run2.html | tr 'a-f' 'A-F' | sort -u | tr '\n' ' '
  echo
  echo "----- 圆角/阴影 -----"
  grep -c 'border-radius' /tmp/repro-S31-run2.html
  grep -c 'box-shadow' /tmp/repro-S31-run2.html
  echo "----- 机制句关键值 -----"
  grep -c 'MAJOR' /tmp/repro-S31-run2.html
  grep -n 'MAJOR\s*=\|MINOR\s*=\|104px\|60px' /tmp/repro-S31-run2.html | head -6
else
  echo "!!!! 第二轮没有 out.html"
fi
