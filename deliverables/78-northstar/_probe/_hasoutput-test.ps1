# Verify the new hasOutput assertion actually catches a copy failure.
# Simulates the three "reported success after a failure" shapes.
$ErrorActionPreference = 'Continue'

Write-Host '=== case 1: destination cannot be written (target dir does not exist) ==='
$src = 'C:\tmp\hop\src.html'
$dst = 'C:\tmp\hop-nonexistent-dir\out.html'
New-Item -ItemType Directory -Path 'C:\tmp\hop' -Force | Out-Null
Set-Content -Path $src -Value '<html>ok</html>' -Encoding UTF8

Copy-Item -LiteralPath $src -Destination $dst -Force -ErrorAction SilentlyContinue
$hasOutput = $false
if ((Test-Path -LiteralPath $dst) -and (Get-Item -LiteralPath $dst).Length -gt 0) {
    $hasOutput = $true
    Write-Host '  OUT_OK  <- WRONG, should not happen'
} else {
    Write-Host '  COPY_FAILED  <- correct'
}
Write-Host ("  hasOutput = " + $hasOutput)

Write-Host ''
Write-Host '=== case 2: destination is an empty file ==='
$dst2 = 'C:\tmp\hop\empty.html'
[System.IO.File]::WriteAllText($dst2, '')
$hasOutput2 = $false
if ((Test-Path -LiteralPath $dst2) -and (Get-Item -LiteralPath $dst2).Length -gt 0) {
    $hasOutput2 = $true
    Write-Host '  OUT_OK  <- WRONG'
} else {
    Write-Host '  COPY_FAILED (empty)  <- correct'
}
Write-Host ("  hasOutput = " + $hasOutput2)

Write-Host ''
Write-Host '=== case 3: scalar indexing bug (the old code path) ==='
$one = 'C:\tmp\hop\src.html'
Write-Host ('  scalar  $one[0]      = ' + $one[0] + '   <- old bug: first character')
Write-Host ('  array   @($one)[0]   = ' + @($one)[0] + '   <- fixed')
$badSrc = $one[0]
Copy-Item -LiteralPath $badSrc -Destination 'C:\tmp\hop\copy3.html' -Force -ErrorAction SilentlyContinue
if (Test-Path 'C:\tmp\hop\copy3.html') { Write-Host '  OUT_OK  <- WRONG' } else { Write-Host '  COPY_FAILED  <- correct (bad src path rejected)' }

Write-Host ''
Write-Host '=== case 4: happy path still works ==='
$dst4 = 'C:\tmp\hop\good.html'
Copy-Item -LiteralPath $src -Destination $dst4 -Force -ErrorAction SilentlyContinue
if ((Test-Path -LiteralPath $dst4) -and (Get-Item -LiteralPath $dst4).Length -gt 0) {
    Write-Host '  OUT_OK  <- correct'
} else {
    Write-Host '  COPY_FAILED  <- WRONG, happy path broke'
}

Remove-Item 'C:\tmp\hop' -Recurse -Force -ErrorAction SilentlyContinue
