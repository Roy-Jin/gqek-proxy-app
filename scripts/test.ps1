# Run the activity probe with a token from the environment only.
# Usage: $env:API_TOKEN="<jwt>"; .\scripts\test.ps1
if (-not $env:API_TOKEN) {
  Write-Error "API_TOKEN environment variable is required. Set it with: `$env:API_TOKEN=`"<jwt>`""
  exit 1
}
pnpm probe:activity
Remove-Item Env:API_TOKEN
