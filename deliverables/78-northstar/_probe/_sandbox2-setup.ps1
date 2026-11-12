# Create a second sandbox account so two blind runs can coexist without fighting
# over the same Deny ACE (the deny is per-account, so one account = one run at a time).
$ErrorActionPreference = 'Continue'

$user = 'ClaudeBlindBox2'
$pass = 'BlindRun-2026-tmp2!'
$repo = 'D:\Web\style'

Write-Host '=== 1. create user ==='
$exists = Get-LocalUser -Name $user -ErrorAction SilentlyContinue
if ($exists) {
    Write-Host 'exists, resetting password'
    Set-LocalUser -Name $user -Password (ConvertTo-SecureString $pass -AsPlainText -Force)
} else {
    New-LocalUser -Name $user -Password (ConvertTo-SecureString $pass -AsPlainText -Force) `
        -PasswordNeverExpires -Description 'Blind test sandbox 2' | Out-Null
    Write-Host 'created'
}

Write-Host '=== 2. grant SeBatchLogonRight ==='
$sid = (Get-LocalUser $user).SID.Value
Write-Host "sid: $sid"
$cfg = 'C:\tmp\secpol-grant2.cfg'
$db = 'C:\Windows\Security\Local.sdb'
secedit /export /cfg $cfg /areas USER_RIGHTS | Out-Null
$content = Get-Content $cfg
$new = @()
foreach ($line in $content) {
    if ($line -match '^SeBatchLogonRight\s*=') {
        if ($line -notmatch [regex]::Escape($sid)) { $new += ($line.TrimEnd() + ",*$sid") }
        else { $new += $line }
    } else { $new += $line }
}
$new | Set-Content -Path $cfg -Encoding Unicode
secedit /configure /db $db /cfg $cfg /areas USER_RIGHTS 2>&1 | Select-Object -Last 1
secedit /export /cfg $cfg /areas USER_RIGHTS | Out-Null
Write-Host ((Select-String -Path $cfg -Pattern 'SeBatchLogonRight').Line)

Write-Host '=== 3. verify it can read a control file but not the repo ==='
$work = 'C:\tmp\bb2-verify'
if (Test-Path $work) { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $work -Force | Out-Null
Set-Content -Path (Join-Path $work 'control.txt') -Value 'CONTROL2-OK'
& icacls $work /grant "${user}:(OI)(CI)(M)" /T | Out-Null
& icacls 'C:\tmp\bb-bin' /grant "${user}:(OI)(CI)(RX)" /T | Out-Null

$script = Join-Path $work 'v.ps1'
$body = @'
$o = @()
try { $c = Get-Content 'D:\Web\style\README.md' -TotalCount 1 -ErrorAction Stop; $o += 'REPO_LEAK:' + $c.Substring(0,20) }
catch { $o += 'REPO_DENIED_OK' }
try { $c = Get-Content 'C:\tmp\bb2-verify\control.txt' -ErrorAction Stop; $o += 'CONTROL_OK:' + $c }
catch { $o += 'CONTROL_FAIL' }
$o += 'WHO:' + (whoami)
$o | Set-Content 'C:\tmp\bb2-verify\result.txt'
'@
Set-Content -Path $script -Value $body -Encoding ASCII
& icacls $script /grant "${user}:(RX)" | Out-Null
& icacls $repo /deny "${user}:(OI)(CI)(RX)" | Out-Null

$task = 'BB2Verify'
& schtasks /Delete /TN $task /F 2>$null | Out-Null
& schtasks /Create /TN $task /TR "powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`"" /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F 2>&1 | Out-Null
& schtasks /Run /TN $task 2>&1 | Out-Null
Start-Sleep -Seconds 12
& schtasks /Delete /TN $task /F 2>$null | Out-Null

Write-Host '=== result ==='
$r = Join-Path $work 'result.txt'
if (Test-Path $r) { Get-Content $r } else { Write-Host 'NO RESULT' }

& icacls $repo /remove:d $user 2>$null | Out-Null
Write-Host '=== deny removed, account kept ==='
