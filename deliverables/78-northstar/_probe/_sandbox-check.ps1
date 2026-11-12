# 真隔离可行性验证
# 目标：证明「以另一个本地用户身份跑 claude」在本机可行，且该用户读不到 D:\Web\style
$ErrorActionPreference = 'Continue'

$repo = 'D:\Web\style'
$sandboxUser = 'CodexSandboxOffline'

Write-Host "=== 1. 当前 ACL（管理员视角）==="
(Get-Acl $repo).Access | Where-Object { $_.IdentityReference -match 'Codex|Everyone|Users' } |
    Select-Object IdentityReference, FileSystemRights, AccessControlType | Format-Table -AutoSize

Write-Host "=== 2. 沙箱用户能否访问仓库（加 ACL 前）==="
$test = icacls $repo /findsid $sandboxUser 2>&1
Write-Host $test

Write-Host "=== 3. 沙箱用户账户状态 ==="
Get-LocalUser -Name $sandboxUser | Select-Object Name, Enabled, LastLogon | Format-List

Write-Host "=== 4. 是否在 Users 组（继承访问权的来源）==="
Get-LocalGroupMember -Group 'Users' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'Codex' } | Select-Object Name, ObjectClass | Format-Table -AutoSize
