<#
  OpenUberNotes.ps1
  Starts a small local web server for this folder and opens UberNotes in the
  default browser. UberNotes.bat calls this script.

  Serving over http://localhost is needed so the app's manifest and service
  worker behave normally; opening index.html directly still works as a
  fallback if the server cannot start.
#>

$ErrorActionPreference = 'Stop'

# The app files live in the same folder as this script.
$root = $PSScriptRoot

# Returns $true when a URL answers with the UberNotes page.
function Test-UberNotesAt {
  param([string]$Url)
  try {
    $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return ($res.StatusCode -eq 200 -and $res.Content -match 'UberNotes')
  } catch {
    return $false
  }
}

# Reuse a server that is already serving this app instead of starting another.
if (Test-UberNotesAt -Url 'http://localhost:8765/') {
  Start-Process 'http://localhost:8765/'
  exit 0
}

# File extensions the app uses, mapped to their content types.
$types = @{
  '.html'        = 'text/html; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.js'          = 'application/javascript; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.jpg'         = 'image/jpeg'
  '.jpeg'        = 'image/jpeg'
  '.ico'         = 'image/x-icon'
}

# Bind the first free port in this range, starting at 8765.
$listener = $null
$port = 8765
while ($port -le 8775 -and -not $listener) {
  $candidate = New-Object System.Net.HttpListener
  $candidate.Prefixes.Add("http://localhost:$port/")
  try {
    $candidate.Start()
    $listener = $candidate
  } catch {
    $port++
  }
}

# Fallback: no port could be bound, so open the file directly.
if (-not $listener) {
  Write-Host 'Could not start the local server. Opening index.html directly.'
  Start-Process (Join-Path $root 'index.html')
  exit 1
}

$url = "http://localhost:$port/"
Write-Host "UberNotes is running at $url"
Write-Host 'Close this window to stop the server.'

# Open the app in the default browser.
Start-Process $url

# Serve files until the window is closed.
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()

    # Map "/" to index.html and drop any query string.
    $path = $ctx.Request.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }

    # Resolve the request inside the app folder only.
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $path))
    $rootFull = [System.IO.Path]::GetFullPath($root)

    if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $ctx.Response.StatusCode = 403
    } elseif (Test-Path -LiteralPath $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $ctx.Response.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
      $ctx.Response.ContentLength64 = $bytes.Length
      # Always serve the current files so edits show up on refresh.
      $ctx.Response.Headers['Cache-Control'] = 'no-store'
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }

    $ctx.Response.OutputStream.Close()
  } catch {
    Write-Host $_.Exception.Message
  }
}
