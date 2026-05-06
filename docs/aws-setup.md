# AWS setup for image uploads (prod)

The dev environment uses the local FS storage backend (`STORAGE_BACKEND=local`).
Before flipping prod to `s3`, run the steps below from a shell with AWS CLI v2
authenticated to the EVE AWS account.

> **Why not just use the root user?** Root credentials should never end up
> in the app's environment. This doc creates a scoped IAM user with
> least-privilege access to the upload bucket only.

## 1. Create the IAM user

```bash
aws iam create-user --user-name eve-app-uploads
```

## 2. Attach an inline policy with least-privilege bucket access

Create `eve-app-uploads-policy.json` locally:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowObjectWriteAndDeleteUnderPublicPrefix",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::eastvillageeverything-uploads/public/*"
    },
    {
      "Sid": "AllowBucketLocationLookup",
      "Effect": "Allow",
      "Action": "s3:GetBucketLocation",
      "Resource": "arn:aws:s3:::eastvillageeverything-uploads"
    }
  ]
}
```

```bash
aws iam put-user-policy \
  --user-name eve-app-uploads \
  --policy-name eve-uploads-rw \
  --policy-document file://eve-app-uploads-policy.json
```

## 3. Generate access keys for the app

```bash
aws iam create-access-key --user-name eve-app-uploads
```

Capture `AccessKeyId` and `SecretAccessKey`. Store in the prod environment's
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` env vars (or attach to the
EC2 instance role if running on EC2 — preferred over static keys).

## 4. Open public read on the `public/` prefix

By default the bucket created in Phase B has all public-access blocks ON.
For images to be reachable directly from the mobile app, relax `BlockPublicPolicy`
and `RestrictPublicBuckets`, then attach a bucket policy that allows public
GetObject ONLY on the `public/` prefix.

```bash
aws s3api put-public-access-block \
  --bucket eastvillageeverything-uploads \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
  }'
```

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnPublicPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::eastvillageeverything-uploads/public/*"
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket eastvillageeverything-uploads \
  --policy file://bucket-policy.json
```

## 5. Set CORS so the admin browser can upload directly (only required if you migrate to presigned PUTs later)

Phase B uses server-proxied uploads so CORS is not strictly needed today.
Skip unless you adopt direct browser → S3 uploads.

## 6. Set the prod env vars

In the production environment (or `.env.production`):

```
STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=eastvillageeverything-uploads
STORAGE_S3_REGION=us-east-1
STORAGE_S3_PREFIX=public
STORAGE_S3_URL_PATTERN=https://eastvillageeverything-uploads.s3.us-east-1.amazonaws.com/{key}
AWS_ACCESS_KEY_ID=<from step 3>
AWS_SECRET_ACCESS_KEY=<from step 3>
```

If running on EC2 with an instance role, omit the access key envs — the SDK
picks up role credentials automatically.

## 7. Test from prod

After deploy, log in as admin on prod and upload a test image. Confirm:
- The upload returns a 200 with a `url` like `https://eastvillageeverything-uploads.s3.us-east-1.amazonaws.com/public/tag/<uuid>.<ext>`.
- That URL is fetchable in an unauthenticated browser tab (public read working).
- The URL persists across server restarts.

## 8. Optional hardening (not Phase B scope)

- CloudFront in front of the bucket with Origin Access Control — improves
  cache, gives a shorter/branded URL, allows blocking direct S3 access.
- Image resizing / optimization at upload time — sharp + multiple variants.
- Antivirus scan via Lambda S3 trigger.
