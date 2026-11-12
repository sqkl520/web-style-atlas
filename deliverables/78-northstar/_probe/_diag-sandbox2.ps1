# Verify the sandbox user can run the copied claude.exe, with repo access denied.
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$repo = 'D:\Web\style'
$bin  = 'C:\tmp\bb-bin'
$work = 'C:\tmp\diag2'

Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $work -Force | Out-Null
icacls $bin  /grant "${user}:(OI)(CI)(RX)" /T | Out-Null
icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null

$script = Join-Path $work 'diag.ps1'
$lines = @(
    '$out = @()'
    '$out += "WHOAMI:" + (whoami)'
    'try {'
    '  $v = & "C:\tmp\bb-bin\claude.exe" --version 2>&1'
    '  $out += "CLAUDE_VERSION:" + (($v | Out-String).Trim())'
    '} catch { $out += "CLAUDE_EXEC_FAIL:" + $_.Exception.Message }'
    'try {'
    '  $r = Get-Content "D:\Web\style\README.md" -TotalCount 1 -ErrorAction Stop'
    '  $out += "REPO_READ_LEAK:" + $r.Substring(0, 30)'
    '} catch { $out += "REPO_DENIED_OK" }'
    '$out | Set-Content "C:\tmp\diag2\result.txt"'
)
$lines -join "`r`n" | Set-Content -Path $script -Encoding ASCII
icacls $script /grant "${user}:(RX)" | Out-Null

# Apply the deny that this whole exercise is about.
icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null

$task = 'DiagBlindBox2'
schtasks /Delete /TN $task /F 2>$null | Out-Null
schtasks /Create /TN $task /TR "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $task | Out-Null
Start-Sleep -Seconds 15
schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== result (with deny applied) ==='
if (Test-Path 'C:\tmp\diag2\result.txt') { Get-Content 'C:\tmp\diag2\result.txt' }
else { Write-Host 'NO RESULT FILE' }

icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host '=== deny removed ==='
