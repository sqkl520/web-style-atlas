# Syntax gate: every runner script must PARSE. A script that fails to parse fails at
# runtime with a message that looks like a logic bug, so parse first, always.
$files = @(
    'D:\Web\style\deliverables\78-northstar\_probe\_blindbox-run.ps1',
    'D:\Web\style\deliverables\78-northstar\_probe\_blindbox-verdict.ps1',
    'D:\Web\style\deliverables\78-northstar\_probe\_blindbox-verdict-test.ps1',
    'D:\Web\style\deliverables\78-northstar\_probe\_blindbox-verdict-regress.ps1',
    'D:\Web\style\deliverables\78-northstar\_probe\_blindbox-batch.ps1'
)
$bad = 0
foreach ($f in $files) {
    if (-not (Test-Path $f)) { Write-Host ("MISSING  " + $f); $bad++; continue }
    $errs = $null
    $tokens = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$tokens, [ref]$errs)
    if ($errs -and $errs.Count -gt 0) {
        Write-Host ("PARSE_FAIL  " + (Split-Path $f -Leaf) + "  (" + $errs.Count + " errors)")
        foreach ($e in $errs) { Write-Host ("    line " + $e.Extent.StartLineNumber + ": " + $e.Message) }
        $bad++
    } else {
        Write-Host ("PARSE_OK    " + (Split-Path $f -Leaf) + "  (" + $tokens.Count + " tokens)")
    }
}
if ($bad -eq 0) { Write-Host 'ALL_PARSE_OK' } else { Write-Host ('PARSE_ERRORS=' + $bad); exit 1 }
