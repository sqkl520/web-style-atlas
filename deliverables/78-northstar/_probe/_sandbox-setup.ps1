# Create a dedicated sandbox account with a known password, and verify that
# a Deny ACL on the repo path actually blocks it at runtime.
$ErrorActionPreference = 'Continue'

$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$repo = 'D:\Web\style'

Write-Host '=== 1. create or reset sandbox user ==='
$exists = Get-LocalUser -Name $user -ErrorAction SilentlyContinue
if ($exists) {
    Write-Host "user exists, resetting password"
    $sp = ConvertTo-SecureString $pass -AsPlainText -Force
    Set-LocalUser -Name $user -Password $sp
} else {
    $sp = ConvertTo-SecureString $pass -AsPlainText -Force
    New-LocalUser -Name $user -Password $sp -PasswordNeverExpires -Description 'Blind test sandbox' | Out-Null
    Write-Host "created"
}
# Remove from Users so it does not inherit read access to the repo.
try { Remove-LocalGroupMember -Group 'Users' -Member $user -ErrorAction Stop; Write-Host 'removed from Users' }
catch { Write-Host 'not in Users (or could not remove)' }

Write-Host '=== 2. probe script: try to read repo, and a control file ==='
$control = 'C:\tmp\blindbox-control.txt'
New-Item -ItemType Directory -Path 'C:\tmp' -Force | Out-Null
Set-Content -Path $control -Value 'CONTROL-OK'
$work = 'C:\tmp\blindbox-work'
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $work -Force | Out-Null
icacls $work /grant "${user}:(OI)(CI)(M)" | Out-Null

$probeScript = Join-Path $work 'probe.ps1'
@'
$out = @()
try { $c = Get-Content "D:\Web\style\README.md" -TotalCount 1 -ErrorAction Stop; $out += "READ_REPO_OK:$c" }
catch { $out += "READ_REPO_DENIED" }
try { $c = Get-Content "C:\tmp\blindbox-control.txt" -ErrorAction Stop; $out += "READ_CONTROL_OK:$c" }
catch { $out += "READ_CONTROL_DENIED" }
$out += "WHOAMI:$(whoami)"
$out | Set-Content "C:\tmp\blindbox-work\result.txt"
'@ | Set-Content -Path $probeScript -Encoding ASCII

Write-Host '=== 3. deny repo access to sandbox user ==='
icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null
Write-Host 'deny applied'

Write-Host '=== 4. run probe as sandbox user ==='
$taskName = 'BlindBoxProbe'
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell -NoProfile -ExecutionPolicy Bypass -File $probeScript"
schtasks /Create /TN $taskName /TR $action /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName | Out-Null
Start-Sleep -Seconds 10
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

$res = 'C:\tmp\blindbox-work\result.txt'
if (Test-Path $res) { Get-Content $res } else { Write-Host 'NO RESULT' }

Write-Host '=== 5. cleanup deny (keep user for reuse) ==='
icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host 'deny removed; user kept for later runs'
