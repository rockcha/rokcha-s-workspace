# Use the workspace-local Node.js if present; otherwise use the system Node.js.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localNode = Get-ChildItem -Path (Join-Path $projectRoot '.tools/node-*-win-x64') -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($localNode) {
  $env:PATH = $localNode.FullName + ';' + $env:PATH
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'Node.js 22.12+ is required. Install Node.js LTS and reopen the terminal.'
}
Push-Location $projectRoot
try {
  & npm.cmd @args
  $npmExitCode = $LASTEXITCODE
} finally {
  Pop-Location
}
exit $npmExitCode
