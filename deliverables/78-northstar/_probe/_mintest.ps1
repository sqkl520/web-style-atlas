# Minimal test: can a scheduled task running as ClaudeBlindBox write a file?
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$work = 'C:\tmp\mintest'

if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null
Write-Host ("work created: " + (Test-Path $work))

$script = Join-Path $work 'r.ps1'
Set-Content -Path $script -Value 'whoami | Set-Content C:\tmp\mintest\who.txt' -Encoding ASCII
Write-Host ("script created: " + (Test-Path $script))

# Grant the sandbox user rights on the work dir and the file.
& icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null
& icacls $script /grant "${user}:(RX)" | Out-Null
Write-Host 'acl granted'

$task = 'MinTest'
& schtasks /Delete /TN $task /F 2>$null | Out-Null
$tr = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`""
Write-Host "creating: $tr"
$createOut = & schtasks /Create /TN $task /TR $tr /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F 2>&1
Write-Host ("create said: " + ($createOut -join ' | '))

$runOut = & schtasks /Run /TN $task 2>&1
Write-Host ("run said: " + ($runOut -join ' | '))
Start-Sleep -Seconds 10

$q = & schtasks /Query /TN $task /FO LIST /V 2>&1
Write-Host '=== task status ==='
Write-Host (($q | Select-String 'Status|Last Result|Last Run Time|Task To Run') -join "`n")

& schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== output ==='
$who = Join-Path $work 'who.txt'
if (Test-Path $who) { Write-Host ("WHO: " + (Get-Content $who)) } else { Write-Host 'NO WHO FILE' }
