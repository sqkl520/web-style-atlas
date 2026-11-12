# Grant SeBatchLogonRight to the sandbox user, then re-verify the deny ACL at runtime.
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$repo = 'D:\Web\style'

$sid = (Get-LocalUser $user).SID.Value
Write-Host "sandbox SID: $sid"

$cfg = 'C:\tmp\secpol-grant.cfg'
$db  = 'C:\Windows\Security\Local.sdb'
secedit /export /cfg $cfg /areas USER_RIGHTS | Out-Null

$content = Get-Content $cfg
$new = @()
foreach ($line in $content) {
    if ($line -match '^SeBatchLogonRight\s*=') {
        if ($line -notmatch [regex]::Escape($sid)) {
            $new += ($line.TrimEnd() + ",*$sid")
            Write-Host "patched: $line -> +$sid"
        } else { $new += $line }
    } else { $new += $line }
}
$new | Set-Content -Path $cfg -Encoding Unicode

Write-Host 'applying security policy...'
secedit /configure /db $db /cfg $cfg /areas USER_RIGHTS 2>&1 | Select-Object -Last 3

Write-Host '=== re-export to confirm ==='
secedit /export /cfg $cfg /areas USER_RIGHTS | Out-Null
Select-String -Path $cfg -Pattern 'SeBatchLogonRight' | ForEach-Object { $_.Line }

Write-Host '=== apply deny and run probe ==='
$work = 'C:\tmp\blindbox-work'
New-Item -ItemType Directory -Path $work -Force | Out-Null
icacls $work /grant "${user}:(OI)(CI)(M)" | Out-Null
icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null
Remove-Item (Join-Path $work 'result.txt') -Force -ErrorAction SilentlyContinue

$taskName = 'BlindBoxProbe2'
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
schtasks /Create /TN $taskName /TR "powershell -NoProfile -ExecutionPolicy Bypass -File $work\probe.ps1" /SC ONCE /ST 23:59 /RU $user /RP 'BlindRun-2026-tmp!' /RL LIMITED /F | Out-Null
schtasks /Run /TN $taskName | Out-Null
Start-Sleep -Seconds 12
schtasks /Delete /TN $taskName /F 2>$null | Out-Null

$res = Join-Path $work 'result.txt'
if (Test-Path $res) { Get-Content $res } else { Write-Host 'STILL NO RESULT' }

Write-Host '=== cleanup ==='
icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host 'done'
