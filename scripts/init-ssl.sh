#!/bin/bash
# Initialize SSL certificates using Let's Encrypt
# Run this once on first deployment

set -e

DOMAIN="eastvillageeverything.com"
EMAIL="your-email@example.com"  # Change this!

echo "=== East Village Everything SSL Setup ==="
echo ""
echo "This script will:"
echo "1. Start nginx with HTTP only"
echo "2. Request SSL certificates from Let's Encrypt"
echo "3. Restart nginx with HTTPS"
echo ""

# Check if email is set
if [ "$EMAIL" = "your-email@example.com" ]; then
    echo "Error: Please edit this script and set your email address"
    exit 1
fi

# Create a temporary nginx config for HTTP-only
cat > nginx/nginx-init.conf << 'EOF'
events {
    worker_connections 1024;
}
http {
    server {
        listen 80;
        server_name eastvillageeverything.com www.eastvillageeverything.com admin.eastvillageeverything.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'SSL setup in progress...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "Starting nginx with HTTP-only config..."
docker-compose -f docker-compose.prod.yml run -d --name nginx-init \
    -v $(pwd)/nginx/nginx-init.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -p 80:80 \
    nginx

echo "Requesting SSL certificates..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "admin.$DOMAIN"

echo "Stopping temporary nginx..."
docker stop nginx-init && docker rm nginx-init

echo "Cleaning up temporary config..."
rm nginx/nginx-init.conf

echo ""
echo "=== SSL Setup Complete ==="
echo ""
echo "Now start the full stack:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
