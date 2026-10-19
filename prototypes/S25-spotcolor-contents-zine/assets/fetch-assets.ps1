$ErrorActionPreference='Continue'
$assets='D:\Web\style\prototypes\S25-spotcolor-contents-zine\assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$UA=@{ 'User-Agent'='S25-prototype-builder/1.0' }
$queries=@(
  @{n='plate1'; q='screen printing squeegee'},
  @{n='plate2'; q='bookbinding sewing thread'},
  @{n='plate3'; q='letterpress printing press'},
  @{n='plate4'; q='paper stack sheets'},
  @{n='plate5'; q='risograph print'}
)
$credits=@()
foreach($item in $queries){
  $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' + [uri]::EscapeDataString($item.q) + '&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|size&iiurlwidth=1100'
  $r=$null
  for($try=1; $try -le 3 -and -not $r; $try++){
    try { $r=Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 } catch { Write-Output ('  retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
  }
  if(-not $r){ Write-Output ('SEARCH FAIL ' + $item.n); continue }
  $pages=@($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })
  $cands=@()
  foreach($pg in $pages){
    $ii=$pg.imageinfo[0]
    if(($ii.url -split '\?')[0] -notmatch '\.(jpg|jpeg|png)$'){ continue }
    if($ii.width -lt 700){ continue }
    if($ii.thumburl -notmatch 'wikimedia\.org'){ continue }
    $cands += [pscustomobject]@{ title=$pg.title; thumb=$ii.thumburl; src=($ii.url -split '\?')[0]; w=$ii.width; h=$ii.height }
  }
  if(-not $cands.Count){ Write-Output ('NO PICK ' + $item.n); continue }
  $pick=$cands | Sort-Object -Property @{Expression={ -[Math]::Min($_.w,1400) }} | Select-Object -First 1
  $out=Join-Path $assets ($item.n + '.jpg')
  $ok=$false
  for($try=1; $try -le 3 -and -not $ok; $try++){
    try { Invoke-WebRequest -Uri $pick.thumb -OutFile $out -Headers $UA -TimeoutSec 90 -UseBasicParsing; $ok=$true } catch { Write-Output ('  dl retry ' + $try + ' ' + $item.n); Start-Sleep -Seconds 2 }
  }
  if(-not $ok){ Write-Output ('DL FAIL ' + $item.n); continue }
  $lic='unknown'; $artist=''
  $api2='https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' + [uri]::EscapeDataString($pick.title) + '&prop=imageinfo&iiprop=extmetadata'
  try { $r2=Invoke-RestMethod -Uri $api2 -Headers $UA -TimeoutSec 60
        $pg2=@($r2.query.pages.PSObject.Properties.Value)[0]
        $lic=$pg2.imageinfo[0].extmetadata.LicenseShortName.value
        $artist=($pg2.imageinfo[0].extmetadata.Artist.value -replace '<[^>]+>','')
  } catch { Write-Output ('LIC FAIL ' + $item.n) }
  Write-Output ('OK ' + $item.n + '  ' + (Get-Item $out).Length + 'B  ' + $pick.w + 'x' + $pick.h + '  ' + $lic + '  ' + $pick.title)
  $credits += [pscustomobject]@{ file=$item.n + '.jpg'; title=$pick.title; license=$lic; artist=($artist -replace '\s+',' ').Trim(); source=$pick.src }
}
$credits | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $assets 'credits.json') -Encoding UTF8
Write-Output '--- assets ---'
Get-ChildItem $assets -File | ForEach-Object { $_.Name + '  ' + $_.Length }