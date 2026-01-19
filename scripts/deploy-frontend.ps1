# ===========================================
# Deploy Frontend to S3 + CloudFront (Windows)
# ===========================================

$ErrorActionPreference = "Stop"

# Load environment variables from .env.production
if (Test-Path ".env.production") {
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Check required variables
if (-not $env:S3_BUCKET_NAME) {
    Write-Error "S3_BUCKET_NAME is not set. Please set it in .env.production"
    exit 1
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Building React Frontend..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Build the frontend with production mode (loads .env.production)
Write-Host "VITE_API_URL = $env:VITE_API_URL" -ForegroundColor Magenta
npx vite build --mode production

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying to S3: $env:S3_BUCKET_NAME" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Delete existing files first
aws s3 rm "s3://$env:S3_BUCKET_NAME" --recursive

# Upload HTML files with correct content type
Write-Host "Uploading HTML files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.html" `
    --content-type "text/html" `
    --cache-control "no-cache, no-store, must-revalidate"

# Upload JavaScript files with correct content type
Write-Host "Uploading JavaScript files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.js" `
    --content-type "application/javascript" `
    --cache-control "public, max-age=31536000, immutable"

# Upload CSS files with correct content type
Write-Host "Uploading CSS files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.css" `
    --content-type "text/css" `
    --cache-control "public, max-age=31536000, immutable"

# Upload SVG files
Write-Host "Uploading SVG files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.svg" `
    --content-type "image/svg+xml" `
    --cache-control "public, max-age=31536000, immutable"

# Upload PNG files
Write-Host "Uploading PNG files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.png" `
    --content-type "image/png" `
    --cache-control "public, max-age=31536000, immutable"

# Upload ICO files
Write-Host "Uploading ICO files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.ico" `
    --content-type "image/x-icon" `
    --cache-control "public, max-age=31536000, immutable"

# Upload JSON files (like manifest.json)
Write-Host "Uploading JSON files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.json" `
    --content-type "application/json" `
    --cache-control "public, max-age=86400"

# Upload font files
Write-Host "Uploading font files..." -ForegroundColor Yellow
aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.woff" `
    --content-type "font/woff" `
    --cache-control "public, max-age=31536000, immutable"

aws s3 cp dist/ "s3://$env:S3_BUCKET_NAME" `
    --recursive `
    --exclude "*" `
    --include "*.woff2" `
    --content-type "font/woff2" `
    --cache-control "public, max-age=31536000, immutable"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Invalidating CloudFront Cache..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($env:CLOUDFRONT_DISTRIBUTION_ID) {
    aws cloudfront create-invalidation `
        --distribution-id $env:CLOUDFRONT_DISTRIBUTION_ID `
        --paths "/*"
    Write-Host "CloudFront invalidation created" -ForegroundColor Green
} else {
    Write-Host "CLOUDFRONT_DISTRIBUTION_ID not set, skipping invalidation" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Frontend Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "S3 URL: http://$env:S3_BUCKET_NAME.s3-website-$env:AWS_REGION.amazonaws.com"
if ($env:FRONTEND_URL) {
    Write-Host "CloudFront URL: $env:FRONTEND_URL"
}
