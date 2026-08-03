#!/bin/bash
# Backup script - สำรองข้อมูลบริษัท (database + uploads)
# ใช้: bash backup.sh

BACKUP_DIR="/var/www/attendance/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup database + uploads
tar -czf $BACKUP_FILE \
  /var/www/attendance/data/ \
  /var/www/attendance/public/uploads/ \
  2>/dev/null

# Keep only last 30 backups
ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +31 | xargs rm -f 2>/dev/null

echo "✅ Backup สำเร็จ: $BACKUP_FILE"
echo "   ขนาด: $(du -h $BACKUP_FILE | cut -f1)"
