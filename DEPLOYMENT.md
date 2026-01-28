# East Village Everything - Deployment Guide

## Prerequisites

- EC2 instance with Docker and Docker Compose installed
- DNS access for eastvillageeverything.com
- SSH access to EC2 instance

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

Wait for DNS propagation (check with `dig eastvillageeverything.com`).

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

1. **Public Site**: https://www.eastvillageeverything.com
2. **Admin Site**: https://admin.eastvillageeverything.com
3. **Health Check**: https://www.eastvillageeverything.com/health
4. **API**: https://www.eastvillageeverything.com/api/tags

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
