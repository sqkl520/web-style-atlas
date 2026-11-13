# Real isolation runner: run claude as ClaudeBlindBox with the repo path denied by NTFS ACL.
# Usage: powershell -File _blindbox-run.ps1 -TaskDir C:\tmp\bb\S31 -OutFile C:\tmp\bb\S31\out.html
#
# Why not rely on --permission-mode: the red team proved that switching it to
# bypassPermissions lets the agent read any file. That is a permission prompt, not
# isolation. This uses an NTFS Deny ACE, enforced by the kernel; model requests don't
# change it.
param(
    [Parameter(Mandatory=$true)][string]$TaskDir,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [int]$TimeoutSec = 3600
)

$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$repo = 'D:\Web\style'
$sbHome = 'C:\tmp\bb-home'

Write-Host '[1/7] preparing sandbox HOME'
if (-not (Test-Path "$sbHome\.claude")) { New-Item -ItemType Directory -Path "$sbHome\.claude" -Force | Out-Null }
Copy-Item 'C:\Users\Administrator\.claude\settings.json' "$sbHome\.claude\settings.json" -Force
Copy-Item 'C:\Users\Administrator\.claude.json' "$sbHome\.claude.json" -Force
# Wipe per-project transcripts before every run.
# Claude Code writes a full .jsonl transcript per session under
#   <HOME>\.claude\projects\C--tmp-bb-<id>\
# so after a few runs that tree holds the COMPLETE conversation of every earlier case,
# including their answers. The agent can `Read` them (it already probes for MEMORY.md).
# That is a real leak even though the repo itself is ACL-denied.
$projRoot = Join-Path $sbHome '.claude\projects'
if (Test-Path $projRoot) { Remove-Item $projRoot -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $projRoot -Force | Out-Null
icacls $sbHome /grant "${user}:(OI)(CI)(M)" /T | Out-Null
icacls $TaskDir /grant "${user}:(OI)(CI)(M)" /T | Out-Null
# claude.exe must live where the sandbox user can read it; Administrator's .local\bin
# is not readable by it (measured PATH_TEST:False).
icacls 'C:\tmp\bb-bin' /grant "${user}:(OI)(CI)(RX)" /T | Out-Null

Write-Host '[2/7] copying runner template'
$runner = Join-Path $TaskDir '_run.ps1'
Copy-Item 'C:\tmp\runner-template.ps1' $runner -Force
icacls $runner /grant "${user}:(RX)" | Out-Null

Write-Host '[3/7] denying repo access'
icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null

Write-Host '[4/7] launching scheduled task'
$taskName = 'BlindBox_' + ([guid]::NewGuid().ToString('N').Substring(0,6))
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" `"$sbHome`" `"$TaskDir`""
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName 2>&1 | Out-Null
# Remember when we launched, so the liveness check only counts claude.exe processes that
# belong to THIS run and not some unrelated session on the machine.
$script:startedAt = (Get-Date).AddSeconds(-5)

Write-Host "[5/7] waiting up to ${TimeoutSec}s"
# Survival must be judged on the process we actually care about -- claude.exe -- not on
# how quiet stream.jsonl is, and not on the scheduled task's wrapper. Measured failures:
#   · stream.jsonl can sit unchanged for minutes while the agent is still thinking
#     (S99: frozen at 13KB, then produced 43,892 more thinking tokens)
#   · the scheduled task's powershell.exe wrapper exits before claude.exe does
#     (one run reported "exited" at 900s while claude.exe kept working for hours)
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$stream = Join-Path $TaskDir 'stream.jsonl'
$outHtml = Join-Path $TaskDir 'out.html'
$lastSize = -1
$idle = 0
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    $cur = 0
    if (Test-Path $stream) { $cur = (Get-Item $stream).Length }
    if ($cur -eq $lastSize) { $idle++ } else { $idle = 0 }
    $lastSize = $cur

    # Is the real worker still alive? Match on the sandbox account so we never kill or
    # wait on an unrelated claude.exe from another session.
    $alive = @(Get-Process claude -ErrorAction SilentlyContinue |
               Where-Object { $_.StartTime -gt $script:startedAt }).Count
    $hasOut = Test-Path $outHtml
    if (-not $alive) {
        Write-Host ("  worker gone (stream=" + $cur + "B out=" + $hasOut + ")")
        break
    }
    if ($hasOut -and $idle -ge 6) { Write-Host 'settled (has out.html, stream quiet)'; break }
    Write-Host ("  stream=" + $cur + "B out=" + $hasOut + " alive=" + $alive + " idle=" + $idle)
}
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

Write-Host '[6/7] collect'
# The output filename is not necessarily out.html -- the model wrote index.html in one run.
# Only looking for out.html reported a successful run as NO_OUT_HTML; keep this fallback.
$cand = @('out.html', 'index.html') | ForEach-Object { Join-Path $TaskDir $_ } | Where-Object { Test-Path $_ }
if (-not $cand) {
    $cand = @(Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue |
              Sort-Object Length -Descending | Select-Object -First 1 -ExpandProperty FullName)
}
if ($cand) {
    $src = $cand[0]
    Copy-Item $src $OutFile -Force
    Write-Host ('OUT_OK src=' + (Split-Path $src -Leaf) + ' bytes=' + (Get-Item $OutFile).Length)
} else {
    Write-Host 'NO_HTML_FOUND'
}

Write-Host '[7/7] removing deny'
icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host 'deny removed'
