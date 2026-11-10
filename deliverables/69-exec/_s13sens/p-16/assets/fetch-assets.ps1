# 方案 13 素材抓取：Wikimedia Commons 真照片（文书档案存放 / 击凸钢印 / 纸与书页）。
# 照抄 S25 的写法（action=query&prop=imageinfo），三处按已踩过的坑处理：
#   1) thumburl 带 ?utm_source=... 查询串，必须先剥掉再下载，否则落盘的是错误页；
#   2) [uri]::EscapeDataString 的实参必须自己加括号，否则 PS 把第二个 -replace 当第二个重载实参；
#   3) artist/license/origin/page 一并落盘成 assets/credits.fetch.json（本次抓取记录），
#      再由 _write-credits.mjs 与既有 credits.json 合并、并按页面真实引用生成 assets/CREDITS.md。不手抄。
$ErrorActionPreference = 'Continue'
$assets = 'D:\Web\style\prototypes\S13-blind-debossed-dispatch\assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$UA = @{ 'User-Agent' = 'S13-prototype-builder/1.0 (prototype study)' }

# 题材：文书档案、钢印/盲压印、公文纸与书页。标题取自检索结果并逐个核对过尺寸。
$picks = @(
  @{ n = 'src-shelving';   title = 'File:Boxes of documents on repository shelving at The National Archives.jpg'; q = 'archive boxes stack' },
  @{ n = 'src-embossstamp'; title = 'File:Stamp, embossing (AM 1965.78.13-5).jpg'; q = 'embossing stamp tool' },
  @{ n = 'src-washi';      title = 'File:IseWashidrop.jpg'; q = 'japanese paper washi sheet' },
  @{ n = 'src-paraguay';   title = 'File:Nouvelles des missions du Paraguay -Twy16 - IMG 2752.jpg'; q = 'letterpress blind emboss' },
  @{ n = 'src-storagebw';  title = 'File:Photograph of Storage Boxes, Used in National Archives Stack Area - DPLA - b2200ed66f97530c2610fe2621cadad4.jpg'; q = 'archive storage boxes' }
)

function Clean([string]$s) {
  if (-not $s) { return '' }
  $t = $s -replace '<[^>]+>', ' '
  $t = $t -replace '\s*date QS:[^,]*(,[^,]*)*$', ''
  $t = $t -replace 'date QS:\S+', ''
  $t = ($t -replace '\s+', ' ').Trim()
  if ($t -eq 'not researched') { $t = '' }
  return $t
}

$new = @()
foreach ($p in $picks) {
  $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=' + [uri]::EscapeDataString($p.title) + '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1400'
  $r = $null
  for ($try = 1; $try -le 3 -and -not $r; $try++) {
    try { $r = Invoke-RestMethod -Uri $api -Headers $UA -TimeoutSec 60 } catch { Write-Output ('  meta retry ' + $try + ' ' + $p.n); Start-Sleep -Seconds 2 }
  }
  if (-not $r) { Write-Output ('META FAIL ' + $p.n); continue }
  $pg = @($r.query.pages.PSObject.Properties.Value)[0]
  if (-not $pg.imageinfo) { Write-Output ('NO IMAGEINFO ' + $p.n); continue }
  $ii = $pg.imageinfo[0]
  $src = ($ii.url -split '\?')[0]
  $thumb = if ($ii.thumburl) { ($ii.thumburl -split '\?')[0] } else { $src }
  if ($thumb -notmatch 'wikimedia\.org') { Write-Output ('BAD THUMB ' + $p.n); continue }
  $out = Join-Path $assets ($p.n + '.jpg')
  $ok = $false
  for ($try = 1; $try -le 3 -and -not $ok; $try++) {
    try { Invoke-WebRequest -Uri $thumb -OutFile $out -Headers $UA -TimeoutSec 120 -UseBasicParsing; $ok = $true } catch { Write-Output ('  dl retry ' + $try + ' ' + $p.n); Start-Sleep -Seconds 2 }
  }
  if (-not $ok) { Write-Output ('DL FAIL ' + $p.n); continue }
  $bytes = (Get-Item $out).Length
  if ($bytes -lt 20000) { Write-Output ('TOO SMALL ' + $p.n + ' ' + $bytes); Remove-Item $out; continue }
  $m = $ii.extmetadata
  $artist = Clean $m.Artist.value
  $lic = Clean $m.LicenseShortName.value
  $licUrl = Clean $m.LicenseUrl.value
  $date = Clean $m.DateTimeOriginal.value
  if (-not $date) { $date = Clean $m.DateTime.value }
  $bare = $pg.title -replace '^File:', ''
  $page = 'https://commons.wikimedia.org/wiki/File:' + ((($bare -replace ' ', '_')) -replace '"', '%22')
  $credit = '"' + $bare + '"' + $(if ($artist) { ' by ' + $artist } else { '' }) + $(if ($date) { ', ' + $date } else { '' }) + ', ' + $lic + ', via Wikimedia Commons'
  Write-Output ('OK ' + $p.n + '  ' + $bytes + 'B  ' + $ii.width + 'x' + $ii.height + '  ' + $lic + '  ' + $bare)
  $new += [pscustomobject]@{
    file = 'assets/' + $p.n + '.jpg'; media = 'image'; ref = ('commons:' + $bare);
    title = $bare; creator = $artist; creatorUrl = $null; date = $date;
    license = $lic; licenseCode = 'commons'; licenseUrl = $licUrl;
    creditRequired = -not ($lic -match 'Public domain|CC0|CC0 1.0');
    page = $page; via = 'Wikimedia Commons'; image = $src; width = $ii.width; height = $ii.height; bytes = $bytes;
    credit = $credit; notes = @(); query = $p.q; saved = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  }
}

$fetch = Join-Path $assets 'credits.fetch.json'
$new | ConvertTo-Json -Depth 6 | Set-Content -Path $fetch -Encoding UTF8
Write-Output ('--- credits.fetch.json: ' + $new.Count + ' 条 ---')
Get-ChildItem $assets -File | ForEach-Object { $_.Name + '  ' + $_.Length }
