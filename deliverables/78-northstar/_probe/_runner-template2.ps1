# ============================================================================
#  ⚠️  这是历史版本，不是当前模板。
#
#  当前模板：_runner-template-literal.ps1（由 _make-runner.ps1 复制到
#            C:\tmp\runner-template.ps1，_blindbox-run.ps1 用它）
#
#  这份 _runner-template2.ps1 只被 _blindbox-run5.ps1 引用，那是探索期的旧驱动。
#  两者在「传参」这个关键点上已经等价（都用 Quote-Arg 拼单一命令行，都不走数组），
#  差别只在：这份多了 agent.pid 落盘、注释是中文简版。
#
#  保留原因：_blindbox-run5.ps1 还能跑，删了它会静默失效。
#  不要用它做新工作 —— 改传参时只改 literal 那一份，改完跑 _argprobe.ps1 验。
# ============================================================================
$ProgressPreference = "SilentlyContinue"
$ErrorActionPreference = "Continue"
$home_ = $args[0]
$work_ = $args[1]
$log = Join-Path $work_ "stream.jsonl"
$errLog = Join-Path $work_ "stderr.txt"
$pidFile = Join-Path $work_ "agent.pid"
"START " + (Get-Date -Format o) | Set-Content -Path $log -Encoding utf8
$env:PATH = "C:\tmp\bb-bin;" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
$env:HOME = $home_
$env:USERPROFILE = $home_
$env:ANTHROPIC_API_KEY = "PROXY_MANAGED"
$env:ANTHROPIC_BASE_URL = "http://127.0.0.1:15721"
$env:CLAUDE_CODE_EFFORT_LEVEL = "medium"
$env:TEMP = $work_
$env:TMP = $work_
Set-Location $work_
$msg = "Read task.txt in this directory, then write the finished page to out.html with the Write tool. Do not over-analyze: read the task once, then write out.html in a single Write call. It must be a complete standalone HTML file. Reply with one short sentence afterwards."

# ⚠️ 绝不能写 @("-p", $msg, ...) —— 见 _runner-template-literal.ps1 的注释：
# 数组形式会被 PowerShell 用空格拆开，claude 只收到第一个词。
#
# 也不能简单拼 '-p "' + $msg + '"'：那样 prompt 里的双引号会被静默删掉。
# 实测发 ALPHA"BETA"GAMMA，模型收到 ALPHABETAGAMMA。
# 而 38/38 个生产 task.txt 都含 <img src="images/占位-N.jpg"> 这种双引号 ——
# 一旦把 task.txt 塞进 -p 就会静默改字。
#
# Quote-Arg 实现 Windows 的 CommandLineToArgvW 官方转义规则：
#   反斜杠只在其后跟引号、或在参数末尾时才需要加倍；引号本身用 \" 转义。
# 这里当前只传元指令（不含引号），但用 Quote-Arg 让这段代码对未来的调用安全。
function Quote-Arg([string]$a) {
    if ($a -eq '') { return '""' }
    if ($a -notmatch '[ \t"]') { return $a }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    $backslashes = 0
    foreach ($ch in $a.ToCharArray()) {
        if ($ch -eq '\') { $backslashes++; continue }
        if ($ch -eq '"') {
            [void]$sb.Append('\' * ($backslashes * 2 + 1))
            [void]$sb.Append('"')
            $backslashes = 0
            continue
        }
        if ($backslashes -gt 0) { [void]$sb.Append('\' * $backslashes); $backslashes = 0 }
        [void]$sb.Append($ch)
    }
    if ($backslashes -gt 0) { [void]$sb.Append('\' * ($backslashes * 2)) }
    [void]$sb.Append('"')
    return $sb.ToString()
}

# Build ONE already-escaped command line instead of an array.
$argParts = @('-p', (Quote-Arg $msg), '--model', 'opus', '--permission-mode', 'acceptEdits',
              '--output-format', 'stream-json', '--verbose')
$argLine = $argParts -join ' '
Add-Content -Path $log -Value ('LAUNCHING argLine=' + $argLine) -Encoding utf8
# The PID goes to its own file, NOT to stderr.txt: stderr.txt is the redirect target
# that Start-Process holds open, so Add-Content to it fails and the marker never lands
# (that is why v1/v2 could not tell whether the agent was alive).
$p = Start-Process -FilePath "C:\tmp\bb-bin\claude.exe" -ArgumentList $argLine -WorkingDirectory $work_ -RedirectStandardOutput $log -RedirectStandardError $errLog -NoNewWindow -PassThru
Set-Content -Path $pidFile -Value $p.Id -Encoding ascii
$p.WaitForExit()
Add-Content -Path $pidFile -Value ("EXITED " + $p.ExitCode + " " + (Get-Date -Format o)) -Encoding ascii
