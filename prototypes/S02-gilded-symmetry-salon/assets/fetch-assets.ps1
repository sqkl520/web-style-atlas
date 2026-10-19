# S02 鎏金对称厅 — 真实照片抓取（Wikimedia Commons API）
# 照 S25-spotcolor-contents-zine/assets/fetch-assets.ps1 的做法：按关键词搜图、取 1400px 缩略图、记录署名。
# 与 S25 的两处差异（本案实测踩到的坑）：
#   1. Commons 现在返回的 thumburl 带 ?utm_source=... 查询串，Invoke-WebRequest 拿它下载会失败 → 去掉查询串；
#   2. 每个关键词取多个候选，逐个试下载，成功即停（单张图挂掉不该让一整类素材落空）。
# 产物：assets/_raw/<slug>.jpg ＋ assets/credits.json
$ErrorActionPreference='Continue'
$ProgressPreference='SilentlyContinue'
$assets='D:\Web\style\prototypes\S02-gilded-symmetry-salon\assets'
$raw=Join-Path $assets '_raw'
New-Item -ItemType Directory -Force -Path $raw | Out-Null
$UA=@{ 'User-Agent'='S02-gilded-symmetry-salon-prototype/1.0 (prototype asset fetch)' }
$queries=@(
  @{n='garnier-staircase'; q='Palais Garnier grand escalier staircase'},
  @{n='ruhlmann-marquetry'; q='Ruhlmann commode art deco furniture marquetry'},
  @{n='ormolu-gilt-bronze';  q='ormolu gilt bronze mantel clock'},
  @{n='silver-gilt-case';    q='silver gilt snuff box'},
  @{n='paris-1925-expo';     q='Exposition internationale des arts decoratifs 1925 Paris'},
  @{n='gold-tooled-cover';   q='gold tooled bookbinding cover'},
  @{n='deco-screen-panel';   q='art deco lacquer screen panel'}
)
$credits=@()
foreach($item in $queries){
  $api='https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' + [uri]::EscapeDataString($item.q) + '&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size&iiurlwidth=1400'
  $r=$null
  for($try=1; $try -le 3 -and -not $r; $try++){
    try { $r=Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 } catch { Start-Sleep -Seconds 2 }
  }
  if(-not $r){ Write-Output ('SEARCH FAIL ' + $item.n); continue }
  $pages=@($r.query.pages.PSObject.Properties.Value | Where-Object { $_.imageinfo })
  $cands=@()
  foreach($pg in $pages){
    $ii=$pg.imageinfo[0]
    if(($ii.url -split '\?')[0] -notmatch '\.(jpg|jpeg|png)$'){ continue }
    if($ii.width -lt 800){ continue }
    if(-not $ii.thumburl){ continue }
    $thumb=($ii.thumburl -split '\?')[0]
    if($thumb -notmatch 'wikimedia\.org'){ continue }
    $cands += [pscustomobject]@{ title=$pg.title; thumb=$thumb; src=($ii.url -split '\?')[0]; w=$ii.width; h=$ii.height }
  }
  if(-not $cands.Count){ Write-Output ('NO PICK ' + $item.n + ' (pages=' + $pages.Count + ')'); continue }
  # 优先取分辨率最接近 1400 的候选，逐个试下载
  $cands = $cands | Sort-Object -Property @{Expression={ [Math]::Abs([Math]::Min($_.w,1800)-1400) }}
  $out=Join-Path $raw ($item.n + '.jpg')
  $pick=$null
  foreach($c in $cands){
    if(Test-Path $out){ Remove-Item $out -Force }
    try {
      Invoke-WebRequest -Uri $c.thumb -OutFile $out -Headers $UA -TimeoutSec 120 -UseBasicParsing
      if((Get-Item $out).Length -gt 40000){ $pick=$c; break }
    } catch { }
  }
  if(-not $pick){ Write-Output ('DL FAIL ' + $item.n); continue }
  $lic='unknown'; $artist=''
  $api2='https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' + [uri]::EscapeDataString($pick.title) + '&prop=imageinfo&iiprop=extmetadata'
  try { $r2=Invoke-RestMethod -Uri $api2 -Headers $UA -TimeoutSec 60
        $pg2=@($r2.query.pages.PSObject.Properties.Value)[0]
        $lic=$pg2.imageinfo[0].extmetadata.LicenseShortName.value
        $artist=($pg2.imageinfo[0].extmetadata.Artist.value -replace '<[^>]+>','')
  } catch { }
  Write-Output ('OK ' + $item.n + '  ' + (Get-Item $out).Length + 'B  ' + $pick.w + 'x' + $pick.h + '  ' + $lic + '  ' + $pick.title)
  $credits += [pscustomobject]@{ file=('assets/' + $item.n + '.jpg'); title=$pick.title; license=$lic; artist=($artist -replace '\s+',' ').Trim(); source=$pick.src; query=$item.q }
}
$credits | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $assets 'credits.json') -Encoding UTF8
Write-Output '--- raw ---'
Get-ChildItem $raw -File | ForEach-Object { $_.Name + '  ' + $_.Length }
