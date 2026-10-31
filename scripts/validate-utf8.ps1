#!/usr/bin/env pwsh
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$paths = @(& git -C $repoRoot ls-files)
if ($LASTEXITCODE -ne 0) { throw 'git ls-files failed; run this script inside a Git checkout.' }

$strictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)
$invalid = [System.Collections.Generic.List[string]]::new()
$bomFiles = [System.Collections.Generic.List[string]]::new()
$missing = [System.Collections.Generic.List[string]]::new()

foreach ($relativePath in $paths) {
    $fullPath = Join-Path $repoRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        $missing.Add($relativePath)
        continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $bom = if ($bytes.Length -ge 4 -and $bytes[0] -eq 0 -and $bytes[1] -eq 0 -and $bytes[2] -eq 0xFE -and $bytes[3] -eq 0xFF) { 'UTF-32 BE' }
        elseif ($bytes.Length -ge 4 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE -and $bytes[2] -eq 0 -and $bytes[3] -eq 0) { 'UTF-32 LE' }
        elseif ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { 'UTF-8' }
        elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) { 'UTF-16 BE' }
        elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { 'UTF-16 LE' }
        else { $null }
    if ($bom) { $bomFiles.Add("${relativePath}: $bom BOM") }

    try {
        $null = $strictUtf8.GetString($bytes)
    } catch [System.Text.DecoderFallbackException] {
        $invalid.Add("${relativePath}: invalid UTF-8 at byte offset $($_.Exception.Index)")
    }
}

if ($bomFiles.Count) { $bomFiles | ForEach-Object { Write-Output "BOM: $_" } }
else { Write-Output 'BOM: none in tracked files' }
if ($missing.Count) { $missing | ForEach-Object { Write-Output "Missing tracked file: $_" } }
if ($invalid.Count) {
    $invalid | ForEach-Object { Write-Error $_ }
    exit 1
}
if ($missing.Count) { exit 1 }
Write-Output "Strict UTF-8: $($paths.Count) tracked files valid"
