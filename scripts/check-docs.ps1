[CmdletBinding()]
param(
    [int] $MaxLines = 320
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$prepareScript = Join-Path $PSScriptRoot 'prepare-file-for-llm.ps1'
$failures = [Collections.Generic.List[string]]::new()
$documents = [Collections.Generic.List[object]]::new()
$indexedPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$localLinkCount = 0
$externalFileCount = 0

# List only maintained Markdown. Never enumerate or inspect environment files.
Push-Location $repoRoot
try {
    $paths = @(rg --files --hidden -g '*.md' -g '!.git/**' -g '!**/node_modules/**' -g '!**/dist/**' -g '!**/.env' -g '!**/.env.*')
    if ($LASTEXITCODE -ne 0) { throw 'Unable to enumerate Markdown files with rg.' }

    foreach ($relativePath in $paths) {
        $originalPath = [IO.Path]::GetFullPath((Join-Path $repoRoot $relativePath))
        $prepared = & $prepareScript -Path $originalPath | ConvertFrom-Json
        $lines = @(Get-Content -LiteralPath $prepared.PreparedPath)
        if ($lines.Count -gt $MaxLines) {
            $failures.Add("${relativePath}: $($lines.Count) lines exceeds $MaxLines")
        }
        $documents.Add([PSCustomObject]@{ Path = $originalPath; Relative = $relativePath; Lines = $lines.Count })

        # Ignore fenced examples; inspect inline Markdown links, including angle-wrapped paths.
        $inFence = $false
        foreach ($line in $lines) {
            if ($line -match '^\s*(```|~~~)') { $inFence = -not $inFence; continue }
            if ($inFence) { continue }
            foreach ($match in [regex]::Matches($line, '\[[^\]]*\]\((?:<([^>]+)>|([^\)]+))\)')) {
                $target = if ($match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Groups[2].Value }
                $target = $target.Trim()
                if ($target -match '^(https?://|mailto:|app://|codex://|#)') { continue }
                $fileTarget = [Uri]::UnescapeDataString(($target -split '#', 2)[0])
                $leaf = [IO.Path]::GetFileName($fileTarget)
                if ($leaf -match '^\.env(?:\..+)?$') {
                    $failures.Add("${relativePath}: environment-file links are not allowed")
                    continue
                }
                $resolved = if ([IO.Path]::IsPathRooted($fileTarget)) {
                    [IO.Path]::GetFullPath($fileTarget)
                } else {
                    [IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $originalPath) $fileTarget))
                }
                if (-not (Test-Path -LiteralPath $resolved)) {
                    $failures.Add("${relativePath}: missing link target $target")
                }
                if ($resolved.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                    $localLinkCount++
                } else {
                    $externalFileCount++
                }
                if ($relativePath -eq 'docs\PLAN_INDEX.md') { [void]$indexedPaths.Add($resolved) }
            }
        }
    }

    foreach ($document in $documents) {
        if (-not $indexedPaths.Contains($document.Path)) {
            $failures.Add("$($document.Relative): not linked from docs/PLAN_INDEX.md")
        }
    }

    $largest = $documents | Sort-Object Lines -Descending | Select-Object -First 5 Relative, Lines
    $largest | Format-Table -AutoSize
    Write-Output "Checked $($documents.Count) Markdown files, $localLinkCount repository links and $externalFileCount external local-file links."
    Write-Output 'HTTP URLs and heading anchors are not validated by this local check.'
    if ($failures.Count -gt 0) {
        $failures | ForEach-Object { Write-Output "FAIL: $_" }
        throw "Documentation validation failed: $($failures.Count) issue(s)."
    }
    Write-Output "PASS: every Markdown file is indexed, file targets exist, and documents are at most $MaxLines lines."
} finally {
    Pop-Location
}
