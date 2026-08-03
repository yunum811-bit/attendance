# วิธี Deploy ระบบ Check In/Out ขึ้น AWS Lightsail

## สำหรับบริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด
## พนักงาน 25 คน — แพ็กเกจ $3.50/เดือน (~125 บาท)

---

## สิ่งที่ต้องเตรียม

- ✅ บัญชี AWS (สมัครที่ aws.amazon.com)
- ✅ บัตรเครดิต/เดบิตบริษัท
- ✅ Domain: serialfactoring.co.th (ถ้าต้องการ URL สวยๆ)

---

## ขั้นตอนที่ 1: สร้าง Lightsail Instance

1. ไปที่ **https://lightsail.aws.amazon.com**
2. กด **"Create instance"**
3. ตั้งค่า:
   - Region: **Singapore** (ap-southeast-1) ← ใกล้ไทยที่สุด
   - Platform: **Linux/Unix**
   - Blueprint: **OS Only** → **Ubuntu 22.04 LTS**
   - Instance plan: **$3.50/month** (512 MB RAM, 1 vCPU, 20 GB SSD)
   - Instance name: `attendance-server`
4. กด **"Create instance"**
5. รอ 1-2 นาที จนสถานะเป็น **Running**

---

## ขั้นตอนที่ 2: ตั้ง Static IP

1. ไปที่แท็บ **Networking**
2. กด **"Create static IP"**
3. Attach กับ instance `attendance-server`
4. **จด IP ไว้** เช่น `13.xxx.xxx.xxx`

---

## ขั้นตอนที่ 3: เปิด Port

1. คลิกที่ instance → แท็บ **Networking**
2. ใน Firewall section กด **"+ Add rule"**
3. เพิ่ม:
   - Application: **Custom** / Port: **4000** / Protocol: TCP
   - Application: **HTTPS** / Port: **443** / Protocol: TCP
4. กด Save

---

## ขั้นตอนที่ 4: SSH เข้า Server

1. คลิกที่ instance → กดปุ่ม **"Connect using SSH"** (เปิด terminal ใน browser)

หรือใช้ PowerShell บนเครื่องตัวเอง:
```bash
ssh -i LightsailDefaultKey.pem ubuntu@13.xxx.xxx.xxx
```
(ดาวน์โหลด key จาก Account → SSH Keys)

---

## ขั้นตอนที่ 5: ติดตั้ง Software

Copy ทั้งหมดนี้วางใน terminal ทีเดียว:

```bash
# อัปเดตระบบ
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git

# ติดตั้ง PM2
sudo npm install -g pm2

# ตรวจสอบ
node -v
npm -v
```

---

## ขั้นตอนที่ 6: Upload โค้ด

### วิธี A: ใช้ Git (แนะนำ)
```bash
cd /var/www
sudo git clone https://github.com/yunum811-bit/attendance.git
cd attendance
sudo chown -R ubuntu:ubuntu /var/www/attendance
```

### วิธี B: ใช้ SCP (จากเครื่องตัวเอง)
```powershell
# รันบนเครื่อง Windows ตัวเอง
scp -i LightsailDefaultKey.pem -r C:\Attendance ubuntu@13.xxx.xxx.xxx:/var/www/attendance
```

---

## ขั้นตอนที่ 7: ติดตั้ง + Build

```bash
cd /var/www/attendance
npm install
npm run build

# สร้างโฟลเดอร์ข้อมูล
mkdir -p data
mkdir -p public/uploads/photos
mkdir -p public/uploads/avatars
mkdir -p public/uploads/announcements
```

---

## ขั้นตอนที่ 8: ทดสอบ

```bash
npx tsx src/server/index.ts
```

เห็น `HTTP → http://localhost:4000` = สำเร็จ กด `Ctrl+C` หยุด

---

## ขั้นตอนที่ 9: รันด้วย PM2 (ทำงานตลอด)

```bash
cd /var/www/attendance
pm2 start "npx tsx src/server/index.ts" --name attendance
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

ตรวจสอบ:
```bash
pm2 status
```

---

## ขั้นตอนที่ 10: ตั้งค่า Nginx + SSL

### 10.1: สร้าง Nginx config

```bash
sudo nano /etc/nginx/sites-available/attendance
```

วางเนื้อหานี้ (เปลี่ยน domain):

```nginx
server {
    listen 80;
    server_name checkin.serialfactoring.co.th;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

บันทึก: `Ctrl+O` → `Enter` → `Ctrl+X`

### 10.2: เปิดใช้งาน

```bash
sudo ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 10.3: ชี้ DNS

ไปที่ THNIC (หรือ Cloudflare) → เพิ่ม A Record:
```
Type: A
Name: checkin
Value: 13.xxx.xxx.xxx (Static IP ของ Lightsail)
```

รอ 5-30 นาที

### 10.4: ติดตั้ง SSL (HTTPS ฟรี)

```bash
sudo certbot --nginx -d checkin.serialfactoring.co.th
```

ใส่ email → ตอบ Y → เสร็จ!

---

## ขั้นตอนที่ 11: ทดสอบ

เปิดมือถือ:
```
https://checkin.serialfactoring.co.th
```

✅ เห็นหน้า Login = สำเร็จ!
✅ GPS ทำงาน (เพราะ HTTPS)
✅ ใช้ได้จากทุกที่

---

## สรุปคำสั่งทั้งหมด (Copy ทีเดียว)

```bash
# ติดตั้ง
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2

# Clone + Build
cd /var/www
sudo git clone https://github.com/yunum811-bit/attendance.git
cd attendance
sudo chown -R ubuntu:ubuntu /var/www/attendance
npm install
npm run build
mkdir -p data public/uploads/photos public/uploads/avatars public/uploads/announcements

# PM2
pm2 start "npx tsx src/server/index.ts" --name attendance
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Nginx
sudo tee /etc/nginx/sites-available/attendance > /dev/null << 'EOF'
server {
    listen 80;
    server_name checkin.serialfactoring.co.th;
    client_max_body_size 10M;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# SSL (หลังชี้ DNS แล้ว)
sudo certbot --nginx -d checkin.serialfactoring.co.th
```

---

## อัปเดตในอนาคต

```bash
cd /var/www/attendance
git pull
npm install
npm run build
pm2 restart attendance
```

---

## คำสั่งที่ใช้บ่อย

| ทำอะไร | คำสั่ง |
|---|---|
| ดูสถานะ | `pm2 status` |
| ดู log | `pm2 logs attendance` |
| รีสตาร์ท | `pm2 restart attendance` |
| หยุด | `pm2 stop attendance` |
| ดู disk | `df -h` |
| ดู RAM | `free -m` |

---

## ค่าใช้จ่าย

| รายการ | ราคา |
|---|---|
| Lightsail $3.50/เดือน | ~125 บาท |
| Static IP | ฟรี (ถ้า attach กับ instance) |
| SSL (Let's Encrypt) | ฟรี |
| Domain | มีอยู่แล้ว |
| **รวม** | **~125 บาท/เดือน** |

---

## Backup

```bash
# สำรองข้อมูล
cd /var/www/attendance
tar -czf ~/backup_$(date +%Y%m%d).tar.gz data/ public/uploads/
```

แนะนำ: ตั้ง cron job backup ทุกวัน:
```bash
crontab -e
# เพิ่มบรรทัดนี้:
0 2 * * * cd /var/www/attendance && tar -czf /home/ubuntu/backups/backup_$(date +\%Y\%m\%d).tar.gz data/ public/uploads/
```

---

*คู่มือนี้ปรับปรุงล่าสุด: พฤษภาคม 2026*
