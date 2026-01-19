# PokeShop AWS Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  CloudFront │────▶│     S3      │
│             │     │    (CDN)    │     │  (Frontend) │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │ API Requests
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ API Gateway │────▶│   Lambda    │────▶│     RDS     │
│  (HTTP API) │     │  (Express)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
```

## Prerequisites

- AWS Account with Free Tier
- AWS CLI configured with admin user credentials
- Node.js 20.x installed
- Serverless Framework installed (`npm install -g serverless`)

---

## Step 1: Set Up RDS PostgreSQL (Free Tier)

### 1.1 Create a VPC (or use default)

For simplicity, you can use the default VPC. If you need a custom VPC:

1. Go to **VPC Console** → **Create VPC**
2. Choose **VPC and more**
3. Name: `pokeshop-vpc`
4. IPv4 CIDR: `10.0.0.0/16`
5. Create at least 2 Availability Zones with public and private subnets

### 1.2 Create Security Groups

**For RDS:**
1. Go to **EC2 Console** → **Security Groups** → **Create security group**
2. Name: `pokeshop-rds-sg`
3. VPC: Select your VPC
4. Inbound rules:
   - Type: PostgreSQL
   - Port: 5432
   - Source: Your Lambda security group (create this first) OR `10.0.0.0/16` for VPC

**For Lambda:**
1. Create another security group: `pokeshop-lambda-sg`
2. Outbound rules: Allow all (default)

### 1.3 Create RDS Instance

1. Go to **RDS Console** → **Create database**
2. Choose **Standard create**
3. Engine: **PostgreSQL**
4. Version: **PostgreSQL 15.x** (or latest)
5. Templates: **Free tier** ⚠️ Important!
6. Settings:
   - DB instance identifier: `pokeshop-db`
   - Master username: `pokeshop_admin`
   - Master password: (create a strong password, save it!)
7. Instance configuration:
   - DB instance class: `db.t3.micro` (Free Tier eligible)
8. Storage:
   - Storage type: General Purpose SSD (gp2)
   - Allocated storage: 20 GB
   - Disable storage autoscaling (to stay in Free Tier)
9. Connectivity:
   - VPC: Select your VPC
   - Subnet group: Create new or select existing
   - Public access: **No** (Lambda will connect via VPC)
   - Security group: Select `pokeshop-rds-sg`
   - Availability Zone: No preference
10. Database authentication: **Password authentication**
11. Additional configuration:
    - Initial database name: `pokeshop`
    - Disable automated backups (to save costs) or keep 7-day retention
    - Disable Performance Insights
    - Disable Enhanced monitoring
12. Click **Create database**

⏳ Wait for the database to be available (this can take several minutes)

### 1.4 Get RDS Endpoint

1. Click on your database in RDS Console
2. Copy the **Endpoint** (e.g., `pokeshop-db.xxxxxxx.us-east-1.rds.amazonaws.com`)
3. The port is `5432`

### 1.5 Configure DATABASE_URL

Your connection string format:
```
postgresql://pokeshop_admin:YOUR_PASSWORD@pokeshop-db.xxxxxxx.us-east-1.rds.amazonaws.com:5432/pokeshop?schema=public
```

---

## Step 2: Create S3 Bucket for Frontend

1. Go to **S3 Console** → **Create bucket**
2. Bucket name: `pokeshop-frontend-UNIQUE-ID` (must be globally unique)
3. Region: `us-east-1`
4. Uncheck **Block all public access**
5. Acknowledge the warning
6. Click **Create bucket**

### 2.1 Enable Static Website Hosting

1. Click on your bucket → **Properties**
2. Scroll to **Static website hosting** → **Edit**
3. Enable **Static website hosting**
4. Index document: `index.html`
5. Error document: `index.html`
6. Save

### 2.2 Add Bucket Policy

1. Go to **Permissions** → **Bucket policy** → **Edit**
2. Add:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

---

## Step 3: Create CloudFront Distribution

1. Go to **CloudFront Console** → **Create distribution**
2. Origin domain: Select your S3 bucket
3. Origin access: **Origin access control settings (recommended)**
4. Create new OAC → keep defaults → Create
5. Viewer protocol policy: **Redirect HTTP to HTTPS**
6. Allowed HTTP methods: **GET, HEAD**
7. Cache policy: **CachingOptimized**
8. Default root object: `index.html`
9. Price class: **Use only North America and Europe** (cheapest)
10. Click **Create distribution**

### 3.1 Update S3 Bucket Policy for OAC

CloudFront will show you a policy to add. Update your S3 bucket policy with it.

### 3.2 Create Custom Error Responses (for SPA routing)

1. Go to your distribution → **Error pages**
2. Create custom error response:
   - HTTP error code: `403`
   - Customize error response: Yes
   - Response page path: `/index.html`
   - HTTP response code: `200`
3. Create another for `404`

---

## Step 4: Configure Environment Variables

1. Copy `.env.production.template` to `.env.production`
2. Fill in all values:

```bash
# Backend (Lambda)
DATABASE_URL="postgresql://pokeshop_admin:YOUR_PASSWORD@your-rds-endpoint:5432/pokeshop?schema=public"
POKEMON_API_KEY=0c9996f1-bd78-483f-96f7-4edfa9c0c99b
AUTH0_DOMAIN=dev-4qzuqo344wk2tedt.us.auth0.com
AUTH0_AUDIENCE=https://dev-4qzuqo344wk2tedt.us.auth0.com/api/v2/
FRONTEND_URL=https://YOUR_CLOUDFRONT_ID.cloudfront.net

# Frontend (build-time)
VITE_API_URL=https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=pokeshop-frontend-YOUR_UNIQUE_ID
CLOUDFRONT_DISTRIBUTION_ID=EXXXXXXXXXX
```

---

## Step 5: Configure Lambda VPC Access

For Lambda to connect to RDS in a private subnet:

### 5.1 Update serverless.yml

Uncomment the VPC configuration in `serverless.yml`:

```yaml
functions:
  api:
    handler: server/lambda.handler
    vpc:
      securityGroupIds:
        - sg-xxxxxxxxx  # pokeshop-lambda-sg
      subnetIds:
        - subnet-xxxxxxxxx  # Private subnet 1
        - subnet-xxxxxxxxx  # Private subnet 2
```

### 5.2 Create VPC Endpoint for Lambda (Optional but recommended)

This allows Lambda to call AWS services without going through the internet:
1. VPC Console → Endpoints → Create endpoint
2. Service: `com.amazonaws.us-east-1.lambda`
3. VPC: Your VPC
4. Subnets: Private subnets

---

## Step 6: Deploy

### 6.1 Install Dependencies

```bash
npm install
```

### 6.2 Deploy Backend

```bash
# Windows PowerShell
npm run deploy:backend

# Or manually
npx prisma generate
npx serverless deploy --stage dev
```

**After deployment**, Serverless will output your API Gateway URL. Update:
- `VITE_API_URL` in `.env.production`
- `FRONTEND_URL` in Lambda environment (if not using placeholder)

### 6.3 Run Database Migrations

```bash
npx prisma migrate deploy
```

### 6.4 Deploy Frontend

```bash
npm run deploy:frontend
```

---

## Step 7: Update Auth0 Configuration

1. Go to Auth0 Dashboard → Applications → Your App
2. Add to **Allowed Callback URLs**:
   ```
   https://YOUR_CLOUDFRONT_ID.cloudfront.net/callback
   ```
3. Add to **Allowed Logout URLs**:
   ```
   https://YOUR_CLOUDFRONT_ID.cloudfront.net
   ```
4. Add to **Allowed Web Origins**:
   ```
   https://YOUR_CLOUDFRONT_ID.cloudfront.net
   ```

---

## Free Tier Limits Summary

| Service | Free Tier (12 months) | PokeShop Typical Usage |
|---------|----------------------|------------------------|
| **Lambda** | 1M requests/month, 400,000 GB-sec | Well under limit |
| **API Gateway** | 1M API calls/month | Well under limit |
| **S3** | 5GB storage, 20K GET, 2K PUT | ~50MB, few hundred requests |
| **CloudFront** | 1TB transfer, 10M requests | Well under limit |
| **RDS** | 750 hours db.t3.micro | 1 instance = 720 hrs/month ✓ |

---

## Troubleshooting

### Lambda Can't Connect to RDS
- Ensure Lambda security group allows outbound to RDS security group on port 5432
- Ensure RDS security group allows inbound from Lambda security group
- Verify VPC subnets have route to RDS

### CORS Errors
- Check `FRONTEND_URL` environment variable in Lambda
- Ensure CloudFront URL matches exactly

### Prisma Migration Fails
- Ensure DATABASE_URL is correct
- Check RDS security group allows your IP (temporarily) for local migrations

### Cold Start Latency
- First request after idle may take 2-5 seconds
- Consider Provisioned Concurrency for production (not free)

---

## Cost Optimization Tips

1. **Stay in Free Tier**: Use db.t3.micro for RDS, keep storage at 20GB
2. **Delete when not using**: Stop/delete RDS if not actively developing
3. **Use CloudFront**: Reduces S3 requests and data transfer costs
4. **Set budget alerts**: Get notified before charges occur
