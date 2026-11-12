# Why does claude.exe hang under the sandbox account? Test TEMP writability.
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$work = 'C:\tmp\envdiag'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null
& icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null

$script = Join-Path $work 'r.ps1'
$body = @'
$out = @()
$out += "WHOAMI:" + (whoami)
$out += "TEMP=" + $env:TEMP
$out += "LOCALAPPDATA=" + $env:LOCALAPPDATA
try { $t = Join-Path $env:TEMP ("t-" + [guid]::NewGuid().ToString('N') + ".txt"); 'x' | Set-Content $t -ErrorAction Stop; $out += "TEMP_WRITE:OK"; Remove-Item $t -Force } catch { $out += "TEMP_WRITE:FAIL " + $_.Exception.Message }
try { $p = Join-Path 'C:\tmp\envdiag' 'w.txt'; 'x' | Set-Content $p -ErrorAction Stop; $out += "WORK_WRITE:OK" } catch { $out += "WORK_WRITE:FAIL" }
# Try running claude with a short timeout and capture stderr.
$out += "=== claude attempt ==="
try {
    $job = Start-Job -ScriptBlock {
        $env:PATH = "C:\tmp\bb-bin;C:\Windows\System32;C:\Windows"
        $env:HOME = "C:\tmp\bb-home"
        $env:USERPROFILE = "C:\tmp\bb-home"
        $env:ANTHROPIC_API_KEY = "PROXY_MANAGED"
        $env:ANTHROPIC_BASE_URL = "http://127.0.0.1:15721"
        & "C:\tmp\bb-bin\claude.exe" --version 2>&1
    }
    $done = Wait-Job $job -Timeout 60
    if ($done) { $out += "JOB_OUT:" + ((Receive-Job $job) -join ' ') } else { $out += "JOB_TIMEOUT_60s"; Stop-Job $job }
    Remove-Job $job -Force
} catch { $out += "JOB_ERR:" + $_.Exception.Message }
$out | Set-Content 'C:\tmp\envdiag\result.txt'
'@
Set-Content -Path $script -Value $body -Encoding UTF8
& icacls $script /grant "${user}:(RX)" | Out-Null

$task = 'EnvDiag'
& schtasks /Delete /TN $task /F 2>$null | Out-Null
& schtasks /Create /TN $task /TR "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F 2>&1 | Out-Null
& schtasks /Run /TN $task 2>&1 | Out-Null
Start-Sleep -Seconds 75
& schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== result ==='
$res = Join-Path $work 'result.txt'
if (Test-Path $res) { Get-Content $res } else { Write-Host 'NO RESULT' }
