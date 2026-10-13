[CmdletBinding(SupportsShouldProcess)]
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'backend/prisma/schema.prisma')) -or
    -not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend/package.json'))) {
    throw 'Run this script only from the LAB Resource Manager repository.'
}
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'project-cleanup.targets.json') -Raw | ConvertFrom-Json
if ($manifest.schemaVersion -ne 1) { throw 'Unsupported cleanup manifest.' }

function Get-CheckedFiles([string]$path) {
    $item = Get-Item -LiteralPath $path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing to traverse a link or junction: $path"
    }
    if (-not $item.PSIsContainer) { return $item }
    foreach ($child in Get-ChildItem -LiteralPath $path -Force) {
        Get-CheckedFiles -path $child.FullName
    }
}

$targets = @()
foreach ($relative in $manifest.targets) {
    if ([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|[\\/])\.\.([\\/]|$)') {
        throw "Invalid relative target: $relative"
    }
    $candidate = [IO.Path]::GetFullPath((Join-Path $projectRoot $relative))
    if (-not $candidate.StartsWith($projectRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Target leaves the project: $candidate"
    }
    if ($relative -match '^(\.git([/\\]|$)|backend[/\\]prisma|\.env|frontend[/\\]node_modules|backend[/\\]node_modules|docs[/\\]instructor)') {
        throw "Protected project data: $candidate"
    }
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    $resolved = (Resolve-Path -LiteralPath $candidate).Path
    if ($resolved -ne $candidate) { throw "Unexpected resolved path: $candidate" }
    $expectedHash = $manifest.fileHashes.PSObject.Properties[$relative]
    if ($expectedHash -and (Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash -ne $expectedHash.Value) {
        throw "File changed since the cleanup review; preserve and inspect it: $relative"
    }
    $files = @(Get-CheckedFiles -path $resolved)
    $targets += [pscustomobject]@{
        Path = $resolved
        Files = $files.Count
        Bytes = [long](($files | Measure-Object -Property Length -Sum).Sum)
    }
}

$fileCount = ($targets | Measure-Object -Property Files -Sum).Sum
$byteCount = ($targets | Measure-Object -Property Bytes -Sum).Sum
Write-Output "Project: $projectRoot"
Write-Output "Candidates: $($targets.Count) paths, $fileCount files, $([math]::Round($byteCount / 1GB, 3)) GiB"
if (-not $Apply) {
    $targets | Format-Table Path, Files, Bytes -AutoSize
    Write-Output 'Preview only. Add -Apply to remove these project-local targets.'
    return
}

# All targets are checked before the first deletion. Docker and databases are not touched.
foreach ($target in $targets) {
    if ($PSCmdlet.ShouldProcess($target.Path, 'Remove obsolete LAB output or retired source')) {
        Remove-Item -LiteralPath $target.Path -Recurse -Force -ErrorAction Stop
    }
}
Write-Output 'Cleanup completed. No files outside this checkout were targeted.'
