$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox2'
$pass = 'BlindRun-2026-tmp!'
Write-Host ('resetting password for ' + $user)
net user $user $pass 2>&1 | Out-String | Write-Host
$t = 'TestBB2c'
schtasks /Delete /TN $t /F 2>$null | Out-Null
$out = schtasks /Create /TN $t /TR 'cmd /c echo hi' /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F 2>&1
Write-Host ('CREATE: ' + ($out -join ' '))
$r = schtasks /Run /TN $t 2>&1
Write-Host ('RUN: ' + ($r -join ' '))
Start-Sleep -Seconds 5
$q = schtasks /Query /TN $t /V /FO CSV 2>&1
Write-Host ('QUERY: ' + (($q -join ' ') -replace '\s+', ' '))
schtasks /Delete /TN $t /F 2>&1 | Out-Null
