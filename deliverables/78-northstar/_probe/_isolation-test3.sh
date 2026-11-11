#!/bin/bash
set -u
BOX=/tmp/blindtest3
rm -rf "$BOX"; mkdir -p "$BOX/home/.claude" "$BOX/work"
cp /c/Users/Administrator/.claude/settings.json "$BOX/home/.claude/settings.json"
cp /c/Users/Administrator/.claude.json "$BOX/home/.claude.json"
cd "$BOX/work" || exit 1

run() {
  env -i \
    PATH="/c/Users/Administrator/.local/bin:/usr/bin:/bin" \
    HOME="$BOX/home" USERPROFILE='C:\tmp\blindtest3\home' \
    ANTHROPIC_API_KEY='PROXY_MANAGED' ANTHROPIC_BASE_URL='http://127.0.0.1:15721' \
    CLAUDE_CODE_EFFORT_LEVEL='low' \
    timeout 180 claude -p "$1" --model haiku --permission-mode acceptEdits 2>&1 | head -25
}

echo "########## A1) 读仓库绝对路径，要求原样贴出报错"
run "用 Read 工具读 D:/Web/style/README.md（第 1 行即可）。把工具返回的原文一字不改贴出来：成功就贴内容，失败就贴错误信息。不要改写、不要总结。"

echo "########## A2) 用 Bash 列仓库目录"
run "用 Bash 执行 ls /d/Web/style 并列前 10 行。把输出或错误原文贴出来。"

echo "########## A3) 用一个确定存在的文件做对照（隔离区内的文件）"
echo "CANARY-12345" > "$BOX/work/canary.txt"
run "用 Read 工具读 ./canary.txt 并原样贴出内容。"

echo "########## A4) 隔离区里能不能看到 MEMORY.md"
run "检查你的上下文里有没有任何名为 MEMORY.md 的内容，或任何提到 S01/S31 这类案号的记忆条目。只回复 YES 或 NO。"
