param(
    [string]$Destination = (Split-Path -Parent $PSScriptRoot),
    [switch]$IncludeIndex
)

$ErrorActionPreference = 'Stop'
$baseUrl = 'https://www.korbdo.co.kr/map/Edania2/'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Net.Http

function Save-TextFile {
    param([string]$RelativePath, [string]$Url)

    $target = Join-Path $Destination $RelativePath
    $directory = Split-Path -Parent $target
    if ($directory) {
        [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    }

    $response = Invoke-WebRequest -UseBasicParsing $Url
    [System.IO.File]::WriteAllText($target, $response.Content, $utf8NoBom)
}

function Download-BinaryFiles {
    param([string[]]$RelativePaths)

    $client = New-Object System.Net.Http.HttpClient
    $client.Timeout = [TimeSpan]::FromMinutes(5)
    $client.DefaultRequestHeaders.UserAgent.ParseAdd('Mozilla/5.0')
    $client.DefaultRequestHeaders.Referrer = [Uri]$baseUrl
    try {
        $index = 0
        foreach ($relativePath in $RelativePaths) {
            $index++
            $target = Join-Path $Destination $relativePath
            $directory = Split-Path -Parent $target
            [System.IO.Directory]::CreateDirectory($directory) | Out-Null

            if (-not (Test-Path -LiteralPath $target)) {
                $encodedSegments = @(($relativePath -split '/') | ForEach-Object { [Uri]::EscapeDataString($_) })
                $url = $baseUrl + [string]::Join('/', $encodedSegments)
                $bytes = $null
                $savedDirectly = $false
                for ($attempt = 1; $attempt -le 5; $attempt++) {
                    try {
                        $bytes = $client.GetByteArrayAsync($url).GetAwaiter().GetResult()
                        break
                    }
                    catch {
                        if ($attempt -eq 5) {
                            Invoke-WebRequest -UseBasicParsing $url -OutFile $target
                            $savedDirectly = $true
                            break
                        }
                        Start-Sleep -Milliseconds (500 * $attempt)
                    }
                }
                if (-not $savedDirectly) {
                    [System.IO.File]::WriteAllBytes($target, $bytes)
                }
            }

            if (($index % 50) -eq 0 -or $index -eq $RelativePaths.Count) {
                Write-Progress -Activity 'Downloading Edania map assets' -Status "$index / $($RelativePaths.Count)" -PercentComplete (($index / $RelativePaths.Count) * 100)
            }
        }
    }
    finally {
        $client.Dispose()
        Write-Progress -Activity 'Downloading Edania map assets' -Completed
    }
}

$sourceIndex = (Invoke-WebRequest -UseBasicParsing ($baseUrl + 'index.html')).Content
function Get-SourceAssetUrl {
    param([string]$RelativePath)

    $pattern = '<script[^>]+src=["'']([^"'']*' + [regex]::Escape($RelativePath) + '[^"'']*)["'']'
    $match = [regex]::Match($sourceIndex, $pattern)
    if (-not $match.Success) {
        throw "Source index does not reference $RelativePath"
    }
    return ([Uri]::new([Uri]$baseUrl, $match.Groups[1].Value)).AbsoluteUri
}

if ($IncludeIndex) {
    Save-TextFile 'index.html' ($baseUrl + 'index.html')
}
Save-TextFile 'data/tiles.js' (Get-SourceAssetUrl 'data/tiles.js')
Save-TextFile 'data/markers.js' (Get-SourceAssetUrl 'data/markers.js')
Save-TextFile 'data/images.js' (Get-SourceAssetUrl 'data/images.js')
Save-TextFile 'data/videos.js' (Get-SourceAssetUrl 'data/videos.js')

$tilesText = [System.IO.File]::ReadAllText((Join-Path $Destination 'data/tiles.js')) -replace '^window\.TILES=', '' -replace ';\s*$', ''
$imagesText = [System.IO.File]::ReadAllText((Join-Path $Destination 'data/images.js')) -replace '^window\.IMAGES=', '' -replace ';\s*$', ''
$tiles = $tilesText | ConvertFrom-Json
$images = $imagesText | ConvertFrom-Json

$assets = New-Object System.Collections.Generic.List[string]
$assets.Add('img/00890085.webp')
foreach ($level in $tiles.PSObject.Properties) {
    foreach ($tile in $level.Value) {
        $assets.Add("img/tiles/L$($level.Name)/$tile.webp")
    }
}
foreach ($group in $images.PSObject.Properties) {
    foreach ($image in $group.Value) {
        $assets.Add([string]$image)
    }
}

$uniqueAssets = @($assets | Sort-Object -Unique)
Download-BinaryFiles $uniqueAssets

$totalBytes = (Get-ChildItem -LiteralPath (Join-Path $Destination 'img') -File -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Output "Downloaded $($uniqueAssets.Count) assets ($([Math]::Round($totalBytes / 1MB, 1)) MiB)."
