[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string[]] $Path,

    [Parameter()]
    [string] $OutputDirectory = (Join-Path ([System.IO.Path]::GetTempPath()) "codex-safe-context")
)

$ErrorActionPreference = "Stop"

function Test-EnvironmentFile {
    param([string] $FilePath)
    $name = [System.IO.Path]::GetFileName($FilePath)
    return $name -match '^\.env(?:\..+)?$' -and $name -ne '.env.example'
}

function Get-SafeSource {
    param([string] $FilePath)

    if (-not (Test-EnvironmentFile -FilePath $FilePath)) {
        return $FilePath
    }

    $example = Join-Path (Split-Path -Parent $FilePath) '.env.example'
    if (-not (Test-Path -LiteralPath $example -PathType Leaf)) {
        throw "Blocked: '$FilePath' has no sibling '.env.example'. Refusing to prepare it for an LLM."
    }

    return $example
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

foreach ($inputPath in $Path) {
    $resolved = (Resolve-Path -LiteralPath $inputPath -ErrorAction Stop).Path
    $source = Get-SafeSource -FilePath $resolved
    $destination = Join-Path $OutputDirectory ([System.IO.Path]::GetFileName($resolved))

    Copy-Item -LiteralPath $source -Destination $destination -Force

    [PSCustomObject]@{
        RequestedPath = $resolved
        PreparedPath = (Resolve-Path -LiteralPath $destination).Path
        ReplacedByExample = ($source -ne $resolved)
    } | ConvertTo-Json -Compress
}
