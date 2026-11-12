# Verify whether an explicit Deny ACL actually blocks a user.
# Uses a throwaway test tree, does not touch the real repo.
$ErrorActionPreference = 'Continue'
$testRoot = 'C:\tmp\acl-test'
$inner = Join-Path $testRoot 'secret'
Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $inner -Force | Out-Null
Set-Content -Path (Join-Path $inner 'answer.txt') -Value 'TOP-SECRET-CONTENT'

$sandboxUser = 'CodexSandboxOffline'

Write-Host '=== 1. ACL before deny ==='
icacls $testRoot

Write-Host '=== 2. apply deny ==='
icacls $testRoot /deny "${sandboxUser}:(OI)(CI)(RX)"

Write-Host '=== 3. ACL after deny ==='
icacls $testRoot

Write-Host '=== 4. deny entries present? ==='
$acl = Get-Acl $testRoot
$deny = @($acl.Access | Where-Object { $_.AccessControlType -eq 'Deny' })
Write-Host ("deny count: " + $deny.Count)
foreach ($d in $deny) { Write-Host ("  " + $d.IdentityReference + " -> " + $d.FileSystemRights) }

Write-Host '=== 5. cleanup ==='
icacls $testRoot /remove:d $sandboxUser
Remove-Item $testRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'done'
