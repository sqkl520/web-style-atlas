# Prove the Deny ACL actually blocks the sandbox user at runtime -- both READ and WRITE.
#
# Measured 2026-11-14: a Deny ACE for (RX) alone leaves WRITE_REPO_OK. The repo stays
# writable through the inherited Authenticated Users:(M), so an agent that cannot read
# the answers can still drop files next to them -- and "write into the repo" is exactly
# the channel that leaks answers between cases. This script is the regression test for
# that hole; it must print WRITE_REPO_DENIED.
#
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File _deny-verify.ps1
# It applies the deny ACE, runs a probe as ClaudeBlindBox via a scheduled task, prints
# four lines, then removes the deny ACE.
$ErrorActionPreference = 'Continue'
$user = 'ClaudeBlindBox'
$pass = 'BlindRun-2026-tmp!'
$repo = 'D:\Web\style'
$probe = 'C:\tmp\bb\deny-probe.ps1'
$result = 'C:\tmp\bb\deny-probe-result.txt'
$ps = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'

New-Item -ItemType Directory -Path 'C:\tmp\bb' -Force | Out-Null
Remove-Item $result -Force -ErrorAction SilentlyContinue

# The probe records all four measurements. READ_CONTROL_OK is the control: without it a
# denial could just mean "the sandbox account cannot start at all", which is not
# isolation, it is a broken environment.
$body = @'
$out = @()
try { $null = Get-Content 'D:\Web\style\README.md' -ErrorAction Stop; $out += 'READ_REPO_OK' } catch { $out += 'READ_REPO_DENIED' }
try { $null = Get-ChildItem 'D:\Web\style' -ErrorAction Stop; $out += 'LIST_REPO_OK' } catch { $out += 'LIST_REPO_DENIED' }
try { Set-Content 'D:\Web\style\_denywrite_test.txt' 'x' -ErrorAction Stop; $out += 'WRITE_REPO_OK' } catch { $out += 'WRITE_REPO_DENIED' }
try { $null = Get-Content 'C:\tmp\bb\allowed-control.txt' -ErrorAction Stop; $out += 'READ_CONTROL_OK' } catch { $out += 'READ_CONTROL_DENIED' }
$out += 'WHOAMI:' + (whoami)
$out | Set-Content 'C:\tmp\bb\deny-probe-result.txt' -Encoding ASCII
'@
Set-Content -Path $probe -Value $body -Encoding ASCII
Set-Content 'C:\tmp\bb\allowed-control.txt' -Value 'CONTROL-VISIBLE' -Encoding ASCII
icacls 'C:\tmp\bb' /grant "${user}:(OI)(CI)(M)" | Out-Null

# Both ACEs. (RX) alone is not isolation -- see the header.
icacls $repo /deny "${user}:(OI)(CI)(RX)" 2>$null | Out-Null
icacls $repo /deny "${user}:(OI)(CI)(W)"  2>$null | Out-Null

schtasks /Delete /TN 'DenyVerify' /F 2>$null | Out-Null
$tr = '"' + $ps + '" -NoProfile -ExecutionPolicy Bypass -File "' + $probe + '"'
schtasks /Create /TN 'DenyVerify' /TR $tr /SC ONCE /ST 23:59 /RU $user /RP $pass /RL LIMITED /F 2>&1 | Out-Null

# NOTE: 'powershell.exe' as a bare name fails here with 0x80070002 (ERROR_FILE_NOT_FOUND)
# because the scheduled task runs without the caller's PATH. The full path is required.
schtasks /Run /TN 'DenyVerify' 2>&1 | Out-Null
$deadline = (Get-Date).AddSeconds(40)
while ((Get-Date) -lt $deadline) {
  if (Test-Path $result) { break }
  Start-Sleep -Milliseconds 500
}
Start-Sleep -Seconds 1

$info = Get-ScheduledTaskInfo -TaskName 'DenyVerify' -ErrorAction SilentlyContinue
if ($info) { Write-Host ('LastTaskResult=' + $info.LastTaskResult + '  (0 = ran; 2147942402 = file not found)') }
schtasks /Delete /TN 'DenyVerify' /F 2>$null | Out-Null
icacls $repo /remove:d $user 2>$null | Out-Null

if (Test-Path $result) {
  Get-Content $result
  Write-Host ''
  Write-Host 'PASS = READ_REPO_DENIED + LIST_REPO_DENIED + WRITE_REPO_DENIED + READ_CONTROL_OK'
} else {
  Write-Host 'NO_RESULT_FILE -- the probe never ran; do not read this as "isolated"'
}
