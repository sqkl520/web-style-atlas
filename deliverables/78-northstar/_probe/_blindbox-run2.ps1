# Isolation runner v2 -- fixes the product-collection criterion of v1.
#
# Why a separate file instead of editing _blindbox-run.ps1: that one is the runner
# already used for S31 and cited in 15-real-isolation.md; editing it would make
# "how S31 was actually run" unreproducible. So v1 stays as-is.
#
# Why v2 exists (measured, not theoretical -- S99 run #1 hit it):
#   v1 decides "no output" when stream.jsonl stops growing for 15 polls (300 s).
#   In run #1 the model entered a long reasoning stretch at 23:45 and the stream
#   sat frozen at 13016 bytes for five minutes. v1 printed 'settled (idle, no out.html)'
#   and 'NO_HTML_FOUND', then REMOVED THE DENY ACE -- while claude.exe was still
#   running and the stream later grew to 2.7 MB / 43,892 estimated thinking tokens.
#   That is two failures at once: a false negative, and isolation released early.
#   Run #1 is therefore discarded.
#
# v2 decides on process life, not file quiet:
#   the scheduled task starts a powershell.exe whose command line contains
#   -File <TaskDir>\_run.ps1. It disappears => the run is over. It is still there
#   => the model is still working, however quiet the file looks.
#   NOTE: stderr.txt is NOT usable -- the template writes 'PID:' via Add-Content to
#   a file Start-Process holds via -RedirectStandardError, so it stays 0 bytes
#   (measured in run #1). Both self-reported markers never land.
#   Timeout is still honoured: on timeout we collect whatever exists (timeout != failure),
#   but we never stop early just because the file went quiet.
param(
    [Parameter(Mandatory=$true)][string]$TaskDir,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [int]$TimeoutSec = 2400
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
icacls $sbHome /grant "${user}:(OI)(CI)(M)" /T | Out-Null
icacls $TaskDir /grant "${user}:(OI)(CI)(M)" /T | Out-Null
icacls 'C:\tmp\bb-bin' /grant "${user}:(OI)(CI)(RX)" /T | Out-Null

Write-Host '[2/7] copying runner template'
$runner = Join-Path $TaskDir '_run.ps1'
Copy-Item 'C:\tmp\runner-template.ps1' $runner -Force
icacls $runner /grant "${user}:(RX)" | Out-Null

# Clear leftovers from any previous attempt so the process criterion cannot be
# satisfied by a stale run.
$stream = Join-Path $TaskDir 'stream.jsonl'
$errFile = Join-Path $TaskDir 'stderr.txt'
Remove-Item $stream, $errFile -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host '[3/7] denying repo access'
icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null

Write-Host '[4/7] launching scheduled task'
$taskName = 'BlindBox_' + ([guid]::NewGuid().ToString('N').Substring(0,6))
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" `"$sbHome`" `"$TaskDir`""
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName 2>&1 | Out-Null
$launchedAt = Get-Date

Write-Host "[5/7] waiting up to ${TimeoutSec}s for the _run.ps1 process to exit"
$runnerPattern = [regex]::Escape($runner)
$sawRunner = $false
$goneTicks = 0
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 20
    $cur = 0
    if (Test-Path $stream) { $cur = (Get-Item $stream).Length }
    $runnerAlive = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match $runnerPattern }).Count -gt 0
    if ($runnerAlive) { $sawRunner = $true; $goneTicks = 0 }
    elseif ($sawRunner) { $goneTicks++ }
    $exited = ($sawRunner -and -not $runnerAlive -and $goneTicks -ge 2)
    Write-Host ("  runner=" + $runnerAlive + " saw=" + $sawRunner + " stream=" + $cur + "B exited=" + $exited)
    if ($exited) { Write-Host 'runner exited'; break }
}
if (-not $sawRunner) { Write-Host 'WARN: never observed the _run.ps1 process; collecting whatever exists' }
$elapsed = [int]((Get-Date) - $launchedAt).TotalSeconds
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

Write-Host '[6/7] collect'
$cand = @('out.html', 'index.html') | ForEach-Object { Join-Path $TaskDir $_ } | Where-Object { Test-Path $_ }
if (-not $cand) {
    $cand = @(Get-ChildItem -Path $TaskDir -Filter '*.html' -File -ErrorAction SilentlyContinue |
              Sort-Object Length -Descending | Select-Object -First 1 -ExpandProperty FullName)
}
$found = $false
if ($cand) {
    $src = $cand[0]
    Copy-Item $src $OutFile -Force
    Write-Host ('OUT_OK src=' + (Split-Path $src -Leaf) + ' bytes=' + (Get-Item $OutFile).Length + ' elapsed=' + $elapsed + 's')
    $found = $true
} else {
    Write-Host ('NO_HTML_FOUND elapsed=' + $elapsed + 's')
}

Write-Host '[7/7] removing deny'
icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host ('deny removed; elapsed=' + $elapsed + 's; out=' + $found)
