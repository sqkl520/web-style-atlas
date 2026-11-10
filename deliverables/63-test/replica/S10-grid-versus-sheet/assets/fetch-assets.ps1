# S10 (Grid Versus Sheet) -- real photographs from Wikimedia Commons.
# Field 6 of the scheme asks for photographs printed as a two-colour 150-line halftone
# (#17171A ink + #D32029 red, 45 degree screen, the two plates deliberately 1.5px out of
# register).  This script only fetches the raw originals and records the attribution;
# the halftone separations are baked by assets/bake-plates.py.
#
# NOTE: the Commons thumburl sometimes carries a ?utm_source= query string; downloading it
# verbatim fails, so the query string is stripped before the request.
$ErrorActionPreference='Continue'
$assets = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$UA = @{ 'User-Agent'='S10-grid-versus-sheet-prototype/1.0 (prototype asset fetch)' }

$queries = @(
  @{ n='port-01';  q='container terminal gantry crane' },
  @{ n='rail-02';  q='intermodal freight train container wagon' },
  @{ n='store-03'; q='warehouse pallet racking' },
  @{ n='road-04';  q='semi trailer truck highway freight' },
  @{ n='steel-05'; q='steel coil warehouse industry' },
  @{ n='ship-06';  q='container ship loading port crane' }
)

$credits = @()
foreach ($item in $queries) {
  $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' +
         [uri]::EscapeDataString($item.q) +
         '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1100'
  $r = $null
  for ($try = 1; $try -le 3 -and -not $r; $try++) {
    try { $r = Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 }
    catch { Write-Output ('  retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
  }
  if (-not $r) { Write-Output ('SEARCH FAIL ' + $item.n); continue }

  $pages = @($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })
  $cands = @()
  foreach ($pg in $pages) {
    $ii = $pg.imageinfo[0]
    if (($ii.url -split '\?')[0] -notmatch '\.(jpg|jpeg|png)$') { continue }
    if ($ii.width -lt 900) { continue }
    if ($ii.thumburl -notmatch 'wikimedia\.org') { continue }
    $thumb = ($ii.thumburl -split '\?')[0]
    if ($thumb -notmatch '\.(jpg|jpeg|png)$') { continue }
    $cands += [pscustomobject]@{ title=$pg.title; thumb=$thumb; src=($ii.url -split '\?')[0]; w=$ii.width; h=$ii.height }
  }
  if (-not $cands.Count) { Write-Output ('NO PICK ' + $item.n); continue }

  # prefer landscape frames in the 900-1600px band: enough real resolution, still small on disk
  $pick = $cands | Sort-Object -Property @{Expression={ [Math]::Abs(($_.w / $_.h) - 1.45) }}, @{Expression={ -[Math]::Min($_.w, 1400) }} | Select-Object -First 1
  $out = Join-Path $assets ($item.n + '-raw.jpg')
  $ok = $false
  for ($try = 1; $try -le 3 -and -not $ok; $try++) {
    try { Invoke-WebRequest -Uri $pick.thumb -OutFile $out -Headers $UA -TimeoutSec 90 -UseBasicParsing; $ok = $true }
    catch { Write-Output ('  dl retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
  }
  if (-not $ok) { Write-Output ('DL FAIL ' + $item.n); continue }

  $lic = 'unknown'; $artist = ''
  $api2 = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' +
          [uri]::EscapeDataString($pick.title) + '&prop=imageinfo&iiprop=extmetadata'
  try {
    $r2 = Invoke-RestMethod -Uri $api2 -Headers $UA -TimeoutSec 60
    $pg2 = @($r2.query.pages.PSObject.Properties.Value)[0]
    $lic = $pg2.imageinfo[0].extmetadata.LicenseShortName.value
    $artist = ($pg2.imageinfo[0].extmetadata.Artist.value -replace '<[^>]+>', '')
  } catch { Write-Output ('LIC FAIL ' + $item.n) }

  $page = 'https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString(($pick.title -replace ' ', '_'))
  Write-Output ('OK ' + $item.n + '  ' + (Get-Item $out).Length + 'B  ' + $pick.w + 'x' + $pick.h + '  ' + $lic + '  ' + $pick.title)
  $credits += [pscustomobject]@{
    file     = $item.n + '-raw.jpg'
    title    = $pick.title
    artist   = (($artist -replace '\s+', ' ').Trim())
    license  = $lic
    origin   = $pick.src
    page     = $page
    source   = 'Wikimedia Commons (action=query&generator=search, gsrnamespace=6, iiurlwidth=1100)'
    query    = $item.q
    pixels   = ($pick.w.ToString() + 'x' + $pick.h.ToString())
  }
}
$credits | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $assets 'credits.json') -Encoding UTF8
Write-Output '--- assets ---'
Get-ChildItem $assets -File | ForEach-Object { $_.Name + '  ' + $_.Length }
