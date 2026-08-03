#!/bin/bash
# Deploy script สำหรับ Hostatom Cloud Server
# ใช้ครั้งแรก: bash deploy.sh setup
# ใช้อัปเดต: bash deploy.sh update

set -e

APP_DIR="/var/www/attendance"

case "$1" in
  setup)
    echo "=== ติดตั้งระบบครั้งแรก ==="

    # Update system
    apt update && apt upgrade -y

    # Install Node.js 20
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs nginx certbot python3-certbot-nginx git

    # Install PM2
    npm install -g pm2

    # Create app directory
    mkdir -p $APP_DIR
    cd $APP_DIR

    # Clone project (เปลี่ยน URL เป็นของคุณ)
    echo "กรุณา clone project มาที่ $APP_DIR"
    echo "ตัวอย่าง: git clone https://github.com/your-user/attendance.git ."

    echo ""
    echo "=== หลัง clone แล้ว รัน: bash deploy.sh install ==="
    ;;

  install)
    echo "=== ติดตั้ง dependencies และ build ==="
    cd $APP_DIR

    # Install dependencies
    npm install

    # Build frontend
    npm run build

    # Create data directory
    mkdir -p data
    mkdir -p public/uploads/photos

    # Start with PM2
    pm2 start ecosystem.config.cjs
    pm2 save
    pm2 startup

    echo ""
    echo "=== เสร็จแล้ว! ระบบรันที่ port 4000 ==="
    echo "ขั้นตอนถัดไป: ตั้งค่า Nginx + SSL"
    echo "รัน: bash deploy.sh nginx yourdomain.com"
    ;;

  nginx)
    DOMAIN=$2
    if [ -z "$DOMAIN" ]; then
      echo "กรุณาระบุ domain: bash deploy.sh nginx yourdomain.com"
      exit 1
    fi

    echo "=== ตั้งค่า Nginx สำหรับ $DOMAIN ==="

    # Create Nginx config
    cat > /etc/nginx/sites-available/attendance << EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx

    echo ""
    echo "=== Nginx ตั้งค่าเสร็จ ==="
    echo "ชี้ DNS ของ $DOMAIN มาที่ IP นี้ก่อน แล้วรัน:"
    echo "bash deploy.sh ssl $DOMAIN"
    ;;

  ssl)
    DOMAIN=$2
    if [ -z "$DOMAIN" ]; then
      echo "กรุณาระบุ domain: bash deploy.sh ssl yourdomain.com"
      exit 1
    fi

    echo "=== ติดตั้ง SSL สำหรับ $DOMAIN ==="
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

    echo ""
    echo "=== SSL ติดตั้งเสร็จ! ==="
    echo "เปิดเว็บ: https://$DOMAIN"
    ;;

  update)
    echo "=== อัปเดตระบบ ==="
    cd $APP_DIR

    # Pull latest code
    git pull

    # Install dependencies
    npm install

    # Rebuild frontend
    npm run build

    # Restart app
    pm2 restart attendance

    echo "=== อัปเดตเสร็จ! ==="
    ;;

  *)
    echo "การใช้งาน:"
    echo "  bash deploy.sh setup    - ติดตั้งครั้งแรก"
    echo "  bash deploy.sh install  - ติดตั้ง app หลัง clone"
    echo "  bash deploy.sh nginx domain.com - ตั้งค่า Nginx"
    echo "  bash deploy.sh ssl domain.com   - ติดตั้ง SSL"
    echo "  bash deploy.sh update   - อัปเดตโค้ดใหม่"
    ;;
esac
