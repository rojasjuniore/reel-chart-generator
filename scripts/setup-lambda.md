# AWS Lambda Setup for Remotion

## Prerequisites
- AWS Account with credentials configured
- Node.js 18+
- `@remotion/lambda` installed

## Step 1: Deploy Remotion Lambda

```bash
# Install Remotion CLI globally
npm install -g @remotion/cli @remotion/lambda

# Configure AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"

# Deploy Remotion Lambda (creates S3 bucket + Lambda function)
npx remotion lambda functions deploy
```

This will output:
- Function name: `remotion-render-4-0-XXX`
- Bucket name: `remotionlambda-XXXX`

## Step 2: Deploy Site to S3

```bash
# Bundle the composition and upload to S3
cd /path/to/reel-chart-generator
npx remotion lambda sites create src/remotion/index.tsx --site-name=reel-chart
```

This will output:
- Serve URL: `https://remotionlambda-XXXX.s3.us-east-1.amazonaws.com/sites/reel-chart/index.html`

## Step 3: Set Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
REMOTION_AWS_REGION=us-east-1
REMOTION_LAMBDA_FUNCTION_NAME=remotion-render-4-0-XXX
REMOTION_S3_BUCKET=remotionlambda-XXXX
REMOTION_SERVE_URL=https://remotionlambda-XXXX.s3.us-east-1.amazonaws.com/sites/reel-chart/index.html
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Step 4: Verify

```bash
# Test Lambda function
npx remotion lambda render \
  --function-name=remotion-render-4-0-XXX \
  --serve-url=https://remotionlambda-XXXX.s3.us-east-1.amazonaws.com/sites/reel-chart/index.html \
  --composition=ReelChart \
  --out=test.mp4
```

## Cost Estimate
- ~$0.02 per 15-second render (Lambda + S3)
- S3 storage: ~$0.023/GB/month
- First 1M Lambda requests/month: Free

## Troubleshooting

### "Function not found"
- Verify `REMOTION_LAMBDA_FUNCTION_NAME` matches deployed function
- Check AWS region matches

### "Access Denied"
- Verify AWS credentials have Lambda + S3 permissions
- IAM policy needed: `AmazonS3FullAccess`, `AWSLambda_FullAccess`

### "Composition not found"
- Verify `REMOTION_SERVE_URL` is correct
- Re-deploy site: `npx remotion lambda sites create`
