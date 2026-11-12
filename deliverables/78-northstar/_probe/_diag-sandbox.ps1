# Diagnose why the sandbox task produces no stream.jsonl.
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$work = 'C:\tmp\diag'
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $work -Force | Out-Null
icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null

$script = Join-Path $work 'diag.ps1'
$lines = @(
    '$out = @()'
    '$out += "WHOAMI:" + (whoami)'
    '$out += "PATH_TEST:" + (Test-Path "C:\Users\Administrator\.local\bin\claude.exe")'
    'try {'
    '  $v = & "C:\Users\Administrator\.local\bin\claude.exe" --version 2>&1'
    '  $out += "CLAUDE_VERSION:" + ($v -join " ")'
    '} catch { $out += "CLAUDE_EXEC_FAIL:" + $_.Exception.Message }'
    'try {'
    '  $r = Get-Content "D:\Web\style\README.md" -TotalCount 1 -ErrorAction Stop'
    '  $out += "REPO_READ:" + $r'
    '} catch { $out += "REPO_DENIED_OK" }'
    '$out | Set-Content "C:\tmp\diag\result.txt"'
)
$lines -join "`r`n" | Set-Content -Path $script -Encoding ASCII
icacls $script /grant "${user}:(RX)" | Out-Null

$task = 'DiagBlindBox'
schtasks /Delete /TN $task /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`""
Write-Host "creating task: $action"
schtasks /Create /TN $task /TR $action /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F
schtasks /Run /TN $task
Start-Sleep -Seconds 10
schtasks /Query /TN $task /FO LIST /V 2>&1 | Select-String 'Status|Last Result|Last Run'
schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== result ==='
if (Test-Path 'C:\tmp\diag\result.txt') { Get-Content 'C:\tmp\diag\result.txt' }
else { Write-Host 'NO RESULT FILE' }
