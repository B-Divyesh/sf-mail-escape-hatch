$ErrorActionPreference = "Stop"
$repo = "B-Divyesh/sf-mail-escape-hatch"
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
$asset = $release.assets | Where-Object { $_.name -match '\.msi$' } | Select-Object -First 1
if (-not $asset) { throw "A Windows installer is not published yet." }
$folder = Join-Path $env:TEMP ("mail-escape-hatch-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $folder | Out-Null
$installer = Join-Path $folder $asset.name
Invoke-WebRequest $asset.browser_download_url -OutFile $installer
$sums = Join-Path $folder "SHA256SUMS"
Invoke-WebRequest "https://github.com/$repo/releases/download/$($release.tag_name)/SHA256SUMS" -OutFile $sums
$expected = ((Get-Content $sums | Select-String ([regex]::Escape($asset.name))).Line -split '\s+')[0]
$actual = (Get-FileHash $installer -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $expected.ToLower()) { throw "The installer checksum did not match." }
Start-Process msiexec.exe -ArgumentList "/i `"$installer`"" -Wait
Write-Host "Installed Mail Escape Hatch after checking its SHA-256 hash."
