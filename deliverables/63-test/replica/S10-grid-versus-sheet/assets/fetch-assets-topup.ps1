# S10 -- top-up fetch: the first pass lost two queries to a network hiccup, and the page
# carries six plates.  Same API path as fetch-assets.ps1; merges into credits.json.
$ErrorActionPreference='Continue'
$assets = 'D:\Web\style\prototypes\S10-grid-versus-sheet\assets'
$UA = @{ 'User-Agent'='S10-grid-versus-sheet-prototype/1.0 (prototype asset fetch)' }
$queries = @(
  @{ n='steel-05'; q='steel coils stacked storage' },
  @{ n='ship-06';  q='container ship berthed terminal' }
)
$credits = @(Get-Content (Join-Path $assets 'credits.json') -Raw | ConvertFrom-Json)
foreach ($item in $queries) {
  $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' +
         [uri]::EscapeDataString($item.q) +
         '&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1100'
  $r = $null
  for ($try = 1; $try -le 4 -and -not $r; $try++) {
    try { $r = Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 }
    catch { Write-Output ('  retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 3 }
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
  $pick = $cands | Sort-Object -Property @{Expression={ [Math]::Abs(($_.w / $_.h) - 1.45) }}, @{Expression={ -[Math]::Min($_.w, 1400) }} | Select-Object -First 1
  $out = Join-Path $assets ($item.n + '-raw.jpg')
  $ok = $false
  for ($try = 1; $try -le 4 -and -not $ok; $try++) {
    try { Invoke-WebRequest -Uri $pick.thumb -OutFile $out -Headers $UA -TimeoutSec 90 -UseBasicParsing; $ok = $true }
    catch { Write-Output ('  dl retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 3 }
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
    file=$item.n + '-raw.jpg'; title=$pick.title; artist=(($artist -replace '\s+',' ').Trim()); license=$lic
    origin=$pick.src; page=$page
    source='Wikimedia Commons (action=query&generator=search, gsrnamespace=6, iiurlwidth=1100)'
    query=$item.q; pixels=($pick.w.ToString() + 'x' + $pick.h.ToString())
  }
}
$credits | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $assets 'credits.json') -Encoding UTF8
Get-ChildItem $assets -File | ForEach-Object { $_.Name + '  ' + $_.Length }
