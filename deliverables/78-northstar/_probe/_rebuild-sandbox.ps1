# Rebuilds the sandbox infrastructure after C:\tmp was wiped by the OS.
# Accounts and the repo survive; everything under C:\tmp is gone.
$ErrorActionPreference = 'Continue'

$user = 'ClaudeBlindBox'
$repo = 'D:\Web\style'

Write-Host '=== 1. recreate C:\tmp tree ==='
foreach ($d in @('C:\tmp', 'C:\tmp\bb-bin', 'C:\tmp\bb-home\.claude')) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
    Write-Host ("  " + $d + " -> " + (Test-Path $d))
}

Write-Host '=== 2. copy claude.exe to a sandbox-readable location ==='
$src = 'C:\Users\Administrator\.local\bin\claude.exe'
$dst = 'C:\tmp\bb-bin\claude.exe'
if (Test-Path $src) {
    Copy-Item $src $dst -Force
    Write-Host ("  copied, " + [math]::Round((Get-Item $dst).Length / 1MB) + " MB")
} else {
    Write-Host "  !! source missing: $src"
    exit 1
}

Write-Host '=== 3. restore credentials into sandbox HOME ==='
Copy-Item 'C:\Users\Administrator\.claude\settings.json' 'C:\tmp\bb-home\.claude\settings.json' -Force
Copy-Item 'C:\Users\Administrator\.claude.json' 'C:\tmp\bb-home\.claude.json' -Force
Write-Host ("  settings.json: " + (Test-Path 'C:\tmp\bb-home\.claude\settings.json'))
Write-Host ("  .claude.json : " + (Test-Path 'C:\tmp\bb-home\.claude.json'))

Write-Host '=== 4. grant sandbox user access ==='
& icacls 'C:\tmp\bb-bin' /grant "${user}:(OI)(CI)(RX)" /T | Out-Null
& icacls 'C:\tmp\bb-home' /grant "${user}:(OI)(CI)(M)" /T | Out-Null
Write-Host '  acls granted'

Write-Host '=== 5. verify sandbox user can run claude ==='
$work = 'C:\tmp\bb-verify'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null
& icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null

$probe = Join-Path $work 'v.ps1'
@'
$o = @()
$o += "WHOAMI:" + (whoami)
try { $v = & "C:\tmp\bb-bin\claude.exe" --version 2>&1; $o += "VERSION:" + (($v | Out-String).Trim()) }
catch { $o += "EXE_FAIL:" + $_.Exception.Message }
try { $null = Get-Content "D:\Web\style\README.md" -TotalCount 1 -ErrorAction Stop; $o += "REPO_LEAK" }
catch { $o += "REPO_DENIED_OK" }
$o | Set-Content "C:\tmp\bb-verify\result.txt"
'@ | Set-Content $probe -Encoding ASCII
& icacls $probe /grant "${user}:(RX)" | Out-Null

& icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null

$task = 'BBRebuild'
& schtasks /Delete /TN $task /F 2>$null | Out-Null
$pw = 'BlindRun-2026-tmp!'
& schtasks /Create /TN $task /TR "powershell -NoProfile -ExecutionPolicy Bypass -File `"$probe`"" /SC ONCE /ST 23:59 /RU $user /RP $pw /RL LIMITED /F 2>&1 | Out-Null
& schtasks /Run /TN $task 2>&1 | Out-Null
Start-Sleep -Seconds 20
& schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== result ==='
$r = Join-Path $work 'result.txt'
if (Test-Path $r) { Get-Content $r } else { Write-Host '  NO RESULT' }

& icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host '=== deny removed ==='
