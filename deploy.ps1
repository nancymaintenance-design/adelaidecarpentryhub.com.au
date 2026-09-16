# Ellis Services Group — Deploy to GitHub Pages
# Usage: .\deploy.ps1
#
# Prerequisites:
#   1. Create a new repo on GitHub.com (e.g. ellisservicesgroup/ellisservicesgroup.github.io
#      or any public repo name — GitHub Pages will serve from the /docs folder)
#   2. Copy the repo URL (HTTPS or SSH)
#   3. Run this script and paste the URL when asked
#
# After first run, subsequent runs just build + commit + push.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== Ellis Services Group — Deploy to GitHub Pages ===" -ForegroundColor Cyan

# ── Step 1: Build to /docs ────────────────────────────────────────────────
Write-Host "`n[1/3] Building site to /docs ..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    & node "$repoRoot\build.mjs" --docs 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    Write-Host "Build complete." -ForegroundColor Green
} finally {
    Pop-Location
}

# ── Step 2: Git add /docs (working from repo root) ────────────────────────
Write-Host "`n[2/3] Committing build output ..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    # Ensure git repo exists at root
    $isRepo = Test-Path ".git"
    if (-not $isRepo) {
        Write-Host "Initialising git repo at root ..." -ForegroundColor Yellow
        git init
        git config user.email "deploy@ellisservicesgroup.com.au"
        git config user.name "Ellis Deploy"
    }

    # Stage only the built output in /docs
    git add docs/
    $status = git status --porcelain
    if ($status) {
        git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        Write-Host "Changes committed." -ForegroundColor Green
    } else {
        Write-Host "No changes to commit." -ForegroundColor Gray
    }
} finally {
    Pop-Location
}

# ── Step 3: Push to GitHub ─────────────────────────────────────────────────
Write-Host "`n[3/3] Pushing to GitHub ..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    $remoteUrl = $null

    # Try existing remotes
    try {
        $remoteUrl = git remote get-url origin 2>$null
    } catch {}

    if (-not $remoteUrl) {
        Write-Host "`nNo remote found. Paste your GitHub repo URL below." -ForegroundColor Cyan
        Write-Host "(e.g. https://github.com/YOUR-USERNAME/YOUR-REPO.git)" -ForegroundColor Gray
        $inputUrl = Read-Host "GitHub repo URL"
        if ($inputUrl -match "https://github\.com/[^/]+/[^/]+(?:\.git)?") {
            $remoteUrl = $inputUrl.TrimEnd('.git')
            if (-not $remoteUrl.EndsWith('.git')) { $remoteUrl = $remoteUrl + '.git' }
            git remote add origin $remoteUrl
        } elseif ($inputUrl -match "git@github\.com:[^/]+/[^/]+\.git") {
            $remoteUrl = $inputUrl
            git remote add origin $remoteUrl
        } else {
            Write-Host "Invalid URL. Add remote manually:" -ForegroundColor Red
            Write-Host "  git remote add origin YOUR_URL" -ForegroundColor Gray
            return
        }
        Write-Host "Remote added: $remoteUrl" -ForegroundColor Green
    } else {
        Write-Host "Remote already set: $remoteUrl" -ForegroundColor Gray
    }

    $hasCommits = git rev-parse HEAD 2>$null
    if ($hasCommits) {
        Write-Host "Pushing to origin main ..." -ForegroundColor Yellow
        git branch -M main
        git push -u origin main --force
        Write-Host "`nDeployed! Enable GitHub Pages:" -ForegroundColor Green
        $displayUrl = $remoteUrl -replace '.*github\.com/', '' -replace '\.git', ''
        Write-Host "  Settings → Pages → Source: Deploy from a branch" -ForegroundColor White
        Write-Host "  Branch: main, Folder: / (root)" -ForegroundColor White
        Write-Host "  Your site will be: https://$displayUrl" -ForegroundColor White
    } else {
        Write-Host "No commits yet — push manually after adding remote:" -ForegroundColor Yellow
        Write-Host "  git push -u origin main --force" -ForegroundColor Gray
    }
} finally {
    Pop-Location
}

Write-Host "`nDone.`n" -ForegroundColor Cyan
