$ErrorActionPreference = 'Stop'
$appFolderName = 'UberNotes-main'
$indexFileName = 'index.html'
$foundPath = $null

if ((Split-Path -Leaf $PSScriptRoot) -ieq $appFolderName) {
    $localIndex = Join-Path $PSScriptRoot $indexFileName
    if (Test-Path -LiteralPath $localIndex -PathType Leaf) {
        $foundPath = $localIndex
    }
}

if (-not $foundPath) {
    Write-Host "Searching local fixed drives for $appFolderName\$indexFileName ..."
    $scanErrors = @()
    $drives = [System.IO.DriveInfo]::GetDrives() |
        Where-Object { $_.DriveType -eq [System.IO.DriveType]::Fixed -and $_.IsReady }

    foreach ($drive in $drives) {
        $folders = Get-ChildItem -LiteralPath $drive.RootDirectory.FullName `
            -Directory -Filter $appFolderName -Recurse -Force `
            -ErrorAction SilentlyContinue -ErrorVariable +scanErrors

        foreach ($folder in $folders) {
            $candidate = Join-Path $folder.FullName $indexFileName
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $foundPath = $candidate
                break
            }
        }

        if ($foundPath) {
            break
        }
    }
}

if (-not $foundPath) {
    Write-Host "Could not find $appFolderName\$indexFileName on the local fixed drives."
    if ($scanErrors.Count -gt 0) {
        Write-Host 'Some folders could not be searched because Windows denied access.'
    }
    exit 1
}

$browserPath = $null
$browserExecutableNames = @('msedge.exe', 'chrome.exe', 'firefox.exe', 'brave.exe', 'opera.exe', 'vivaldi.exe')
$httpAssociationPath = 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice'

try {
    $browserProgId = (Get-ItemProperty -LiteralPath $httpAssociationPath -Name ProgId).ProgId
    $browserCommandPath = "Registry::HKEY_CLASSES_ROOT\$browserProgId\shell\open\command"
    $browserCommand = (Get-Item -LiteralPath $browserCommandPath).GetValue('')
    $browserMatch = [regex]::Match(
        $browserCommand,
        '^\s*(?:"(?<exe>[^"]+\.exe)"|(?<exe>.+?\.exe))(?=\s|$)',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    if ($browserMatch.Success) {
        $candidateBrowser = $browserMatch.Groups['exe'].Value
        $browserName = Split-Path -Leaf $candidateBrowser
        $isKnownBrowser = $browserName -in $browserExecutableNames -or
            ($browserName -ieq 'launcher.exe' -and $candidateBrowser -match '\\Opera\\')
        if ($isKnownBrowser -and (Test-Path -LiteralPath $candidateBrowser -PathType Leaf)) {
            $browserPath = $candidateBrowser
        }
    }
} catch {
    Write-Host "Could not read the default browser for web links; checking common browser locations. $($_.Exception.Message)"
}

if (-not $browserPath) {
    $browserCandidates = @(
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:ProgramFiles 'Mozilla Firefox\firefox.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Mozilla Firefox\firefox.exe'),
        (Join-Path $env:ProgramFiles 'BraveSoftware\Brave-Browser\Application\brave.exe'),
        (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\Application\brave.exe'),
        (Join-Path $env:ProgramFiles 'Vivaldi\Application\vivaldi.exe'),
        (Join-Path $env:LOCALAPPDATA 'Vivaldi\Application\vivaldi.exe'),
        (Join-Path $env:ProgramFiles 'Opera\launcher.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Opera\launcher.exe')
    )
    $browserPath = $browserCandidates |
        Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } |
        Select-Object -First 1
}

if (-not $browserPath) {
    Write-Error 'Could not find an installed browser. Install a browser or set a default browser for web links.'
    exit 1
}

$fileUri = ([System.Uri]$foundPath).AbsoluteUri
Write-Host "Opening $fileUri in $browserPath"
try {
    Start-Process -FilePath $browserPath -ArgumentList ('"{0}"' -f $fileUri)
} catch {
    Write-Error "Could not open the app in the browser: $($_.Exception.Message)"
    exit 1
}
