#!/bin/bash
# ===========================================
# Deploy Backend to AWS Lambda
# ===========================================

set -e

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
fi

# Check required variables
required_vars=("DATABASE_URL" "AUTH0_DOMAIN" "AUTH0_AUDIENCE" "POKEMON_API_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    echo "Please set it in .env.production"
    exit 1
  fi
done

echo "=========================================="
echo "Generating Prisma Client for Lambda..."
echo "=========================================="

# Generate Prisma client with the correct binary for Lambda (Amazon Linux 2)
npx prisma generate

echo "=========================================="
echo "Deploying to AWS Lambda..."
echo "=========================================="

# Deploy with serverless
npx serverless deploy --stage ${STAGE:-dev}

echo "=========================================="
echo "Running Database Migrations..."
echo "=========================================="

# Run migrations (you may want to do this manually for production)
echo "Note: Run 'npx prisma migrate deploy' manually if needed"

echo "=========================================="
echo "Backend Deployment Complete!"
echo "=========================================="
