#!/bin/bash
# ===========================================
# Deploy Frontend to S3 + CloudFront
# ===========================================

set -e

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$S3_BUCKET_NAME" ]; then
  echo "Error: S3_BUCKET_NAME is not set"
  echo "Please set it in .env.production or as an environment variable"
  exit 1
fi

echo "=========================================="
echo "Building React Frontend..."
echo "=========================================="

# Build the frontend
npm run build

echo "=========================================="
echo "Deploying to S3: $S3_BUCKET_NAME"
echo "=========================================="

# Sync build output to S3
aws s3 sync dist/ s3://$S3_BUCKET_NAME --delete

# Set cache headers for assets (long cache for hashed files)
aws s3 cp s3://$S3_BUCKET_NAME s3://$S3_BUCKET_NAME \
  --exclude "*" \
  --include "*.js" \
  --include "*.css" \
  --include "*.woff2" \
  --include "*.woff" \
  --metadata-directive REPLACE \
  --cache-control "public, max-age=31536000, immutable" \
  --recursive

# Set no-cache for index.html (always fetch latest)
aws s3 cp dist/index.html s3://$S3_BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

echo "=========================================="
echo "Invalidating CloudFront Cache..."
echo "=========================================="

# Invalidate CloudFront (if distribution ID is set)
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*"
  echo "CloudFront invalidation created"
else
  echo "CLOUDFRONT_DISTRIBUTION_ID not set, skipping invalidation"
  echo "Set it in .env.production to enable automatic cache invalidation"
fi

echo "=========================================="
echo "Frontend Deployment Complete!"
echo "=========================================="
echo "S3 URL: http://$S3_BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
if [ -n "$FRONTEND_URL" ]; then
  echo "CloudFront URL: $FRONTEND_URL"
fi
