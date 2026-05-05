# East Village Everything — Deployment Guide

> **Initial setup only.** Once the EC2 instance is provisioned and the GitHub Actions deploy workflow at `.github/workflows/deploy.yml` is green, **subsequent deploys happen automatically on every push to `main`**: GHA builds a Docker image, pushes to GHCR (`ghcr.io/<owner>/eve-app`), and triggers a remote deploy on the EC2 host via AWS SSM `send-command` (`docker compose pull && up`). The contents below cover one-time bootstrap of the EC2 host, DNS, and SSL.

## Prerequisites

- EC2 instance with Docker and Docker Compose installed
- DNS access for `eastvillageeverything.nyc` (the production domain wired into `apps/mobile/eas.json`)
- SSH access to EC2 instance for the initial bootstrap; ongoing deploys use AWS SSM, not SSH
- GitHub repository secrets: `EC2_INSTANCE_ID`, `GHCR_PAT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (used by the deploy workflow)

## EC2 Instance Setup

### 1. Install Docker

```bash
# Update system
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Docker
sudo yum install -y docker  # Amazon Linux
# or
sudo apt install -y docker.io  # Ubuntu

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

### 2. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Clone Repository

```bash
git clone https://github.com/gulati8/eastvillageeverything.git
cd eastvillageeverything
```

### 4. Configure Environment

```bash
# Copy example env file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

Required environment variables:
- `POSTGRES_PASSWORD`: Strong password for database
- `SESSION_SECRET`: Random 64-character string (generate with `openssl rand -hex 32`)

### 5. DNS Configuration

Add these DNS records pointing to your EC2 public IP:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_EC2_IP |
| A | www | YOUR_EC2_IP |
| A | admin | YOUR_EC2_IP |

Wait for DNS propagation (check with `dig eastvillageeverything.nyc`).

### 6. Initialize SSL Certificates

```bash
# Edit the script to add your email
nano scripts/init-ssl.sh

# Run SSL setup
./scripts/init-ssl.sh
```

### 7. Start the Application

```bash
# Load environment variables
set -a && source .env.production && set +a

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 8. Run Database Migrations

```bash
# Run migrations inside the app container
docker-compose -f docker-compose.prod.yml exec app npm run migrate
```

### 9. Migrate Data from Heroku

```bash
# Get Heroku Redis URL
heroku config:get REDIS_URL -a your-heroku-app-name

# Run migration script
docker-compose -f docker-compose.prod.yml exec -e HEROKU_REDIS_URL="redis://..." app npx tsx scripts/migrate-data.ts
```

## Verification

1. **Public Site**: https://www.eastvillageeverything.nyc
2. **Admin Site**: https://admin.eastvillageeverything.nyc
3. **Health Check**: https://www.eastvillageeverything.nyc/health
4. **API**: https://www.eastvillageeverything.nyc/api/tags

## Maintenance

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f app
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Database
```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U eve eve_production > backup.sql
```

### SSL Certificate Renewal
Certbot automatically renews certificates. To force renewal:
```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
docker-compose -f docker-compose.prod.yml restart nginx
```

## Rollback

If issues occur after deployment:

1. DNS can be pointed back to Heroku immediately
2. Keep Heroku app running for at least 1 week after cutover
3. Database backups allow data restoration

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Ensure .env.production is not committed to git
- [ ] Verify SSL certificate is valid
- [ ] Check security headers with securityheaders.com
- [ ] Enable EC2 security group to only allow ports 80, 443, 22
