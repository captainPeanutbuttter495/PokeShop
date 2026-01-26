# ===========================================
# Deploy Backend to AWS Lambda (Windows)
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
$requiredVars = @("DATABASE_URL", "AUTH0_DOMAIN", "AUTH0_AUDIENCE", "POKEMON_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "AWS_S3_BUCKET")
foreach ($var in $requiredVars) {
    if (-not [Environment]::GetEnvironmentVariable($var, "Process")) {
        Write-Error "$var is not set. Please set it in .env.production"
        exit 1
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Generating Prisma Client for Lambda..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Generate Prisma client
npx prisma generate

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Building Lambda Bundle..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Build the Lambda bundle with esbuild
node scripts/build-lambda.js

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Creating deployment package..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Remove old zip if exists
if (Test-Path "dist-lambda.zip") {
    Remove-Item "dist-lambda.zip" -Force
}

# Create zip file from dist-lambda directory
Compress-Archive -Path "dist-lambda\*" -DestinationPath "dist-lambda.zip" -Force

# Show zip size
$zipSize = (Get-Item "dist-lambda.zip").Length / 1MB
Write-Host "Package size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Magenta

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deploying to AWS Lambda..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Set stage (default to dev)
$stage = if ($env:STAGE) { $env:STAGE } else { "dev" }

# Deploy with serverless
npx serverless deploy --stage $stage

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "Database Migration Reminder" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "Run 'npx prisma migrate deploy' manually to apply migrations"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Backend Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
