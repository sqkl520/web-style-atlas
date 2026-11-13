# Copies the literal runner template into C:\tmp so the sandbox task can execute it.
#
# Why a separate literal file instead of an array of strings joined at runtime:
# the template needs nested quoting (a double-quoted argument embedded in a
# single-quoted PowerShell string). Building that through `@( '...' )` arrays caused
# the $quotedMsg line to be silently dropped on generation, producing a template that
# referenced an undefined variable. A literal file has no escaping layers to get wrong.
$ErrorActionPreference = 'Continue'

$src = Join-Path $PSScriptRoot '_runner-template-literal.ps1'
$dst = 'C:\tmp\runner-template.ps1'

if (-not (Test-Path $src)) { Write-Host ("missing source: " + $src); exit 1 }
Copy-Item $src $dst -Force
Write-Host ('runner template written from literal: ' + $dst)
Write-Host ('  bytes: ' + (Get-Item $dst).Length)
