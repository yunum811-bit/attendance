# คู่มือสมัคร AWS และสร้าง Lightsail อย่างละเอียด

## สำหรับระบบ Check In/Out — บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

---

## สิ่งที่ต้องเตรียม

- ✅ Email (แนะนำ email บริษัท)
- ✅ บัตรเครดิต หรือ เดบิต (Visa/Master) — AWS จะตัด $1 เพื่อยืนยัน แล้วคืนให้
- ✅ เบอร์โทรศัพท์ (รับ OTP)

---

## ส่วนที่ 1: สมัคร AWS Account

### ขั้นตอน 1.1: เปิดหน้าสมัคร

1. เปิด Browser → ไปที่ **https://aws.amazon.com**
2. กดปุ่ม **"Create an AWS Account"** (มุมขวาบน)

---

### ขั้นตอน 1.2: กรอกข้อมูล Account

| ช่อง | ใส่ |
|---|---|
| Email address | email บริษัท (เช่น admin@serialfactoring.co.th) |
| AWS account name | Serial Factoring |

กด **"Verify email address"** → ไปเช็ค email → ใส่รหัส OTP ที่ได้

---

### ขั้นตอน 1.3: ตั้ง Password

| ช่อง | ใส่ |
|---|---|
| Root user password | ตั้งรหัสผ่าน (อย่างน้อย 8 ตัว มีตัวเลข+ตัวพิมพ์ใหญ่) |
| Confirm password | ใส่รหัสผ่านอีกครั้ง |

กด **"Continue"**

---

### ขั้นตอน 1.4: เลือกประเภท Account

เลือก: **"Business - for your work, school, or organization"**

กรอกข้อมูล:

| ช่อง | ใส่ |
|---|---|
| Full name | ชื่อผู้ดูแล (เช่น Somchai Jaidi) |
| Company name | Serial Factoring (Thailand) Co., Ltd. |
| Phone number | +66 ตามด้วยเบอร์ (เช่น +66812345678) |
| Country/Region | Thailand |
| Address | ที่อยู่บริษัท (ภาษาอังกฤษ) |
| City | Bangkok |
| State/Province | Bangkok |
| Postal code | รหัสไปรษณีย์ |

ติ๊ก ☑️ ยอมรับ Terms → กด **"Continue"**

---

### ขั้นตอน 1.5: ใส่บัตรเครดิต/เดบิต

| ช่อง | ใส่ |
|---|---|
| Card number | เลขบัตร 16 หลัก |
| Expiration date | วันหมดอายุ |
| Cardholder's name | ชื่อบนบัตร |
| Billing address | ที่อยู่ตามบัตร |

กด **"Verify and Continue"**

> AWS จะตัดเงิน **$1 (ประมาณ 35 บาท)** เพื่อยืนยันบัตร แล้ว **คืนให้** ภายใน 3-5 วัน

---

### ขั้นตอน 1.6: ยืนยันตัวตน (OTP)

1. เลือก **"Text message (SMS)"**
2. ใส่เบอร์โทร → กด **"Send SMS"**
3. ใส่รหัส OTP ที่ได้ → กด **"Verify"**

---

### ขั้นตอน 1.7: เลือก Support Plan

เลือก: **"Basic support - Free"** (ฟรี)

กด **"Complete sign up"**

---

### ขั้นตอน 1.8: รอ Account Active

- ปกติ **ใช้เวลา 5-10 นาที** (บางกรณีอาจถึง 24 ชั่วโมง)
- จะได้ email แจ้งว่า "Your AWS account is ready"
- หลังจากนั้น Login ได้เลย

---

## ส่วนที่ 2: สร้าง Lightsail Instance

### ขั้นตอน 2.1: เข้า Lightsail

1. Login เข้า **https://lightsail.aws.amazon.com**
   - หรือ: AWS Console → ค้นหา "Lightsail" → กดเข้า
2. จะเห็นหน้า Lightsail Dashboard

---

### ขั้นตอน 2.2: สร้าง Instance

1. กดปุ่ม **"Create instance"** (สีส้ม)

---

### ขั้นตอน 2.3: เลือก Region

| ช่อง | เลือก |
|---|---|
| Instance location | **Asia Pacific (Singapore)** |
| Availability Zone | ap-southeast-1a (ค่าเริ่มต้น) |

> เลือก Singapore เพราะใกล้ไทยที่สุด → เว็บโหลดเร็ว

---

### ขั้นตอน 2.4: เลือก Platform + OS

| ช่อง | เลือก |
|---|---|
| Platform | **Linux/Unix** |
| Blueprint | **OS Only** |
| OS | **Ubuntu 22.04 LTS** |

> ❌ อย่าเลือก "Apps + OS" (เช่น WordPress, Node.js) — เราจะติดตั้งเอง

---

### ขั้นตอน 2.5: เลือก Plan (ราคา)

เลือก: **$3.50 USD/month**

| Spec | ค่า |
|---|---|
| RAM | 512 MB |
| CPU | 1 vCPU |
| SSD | 20 GB |
| Transfer | 1 TB |

> เพียงพอสำหรับ 25 คน ใช้ได้ 40+ ปี

---

### ขั้นตอน 2.6: ตั้งชื่อ Instance

| ช่อง | ใส่ |
|---|---|
| Instance name | `attendance-server` |

---

### ขั้นตอน 2.7: สร้าง!

กดปุ่ม **"Create instance"**

รอ 1-2 นาที จนสถานะเป็น **"Running"** (จุดสีเขียว) ✅

---

## ส่วนที่ 3: ตั้ง Static IP

**ทำไมต้องมี:** ถ้าไม่ตั้ง IP จะเปลี่ยนทุกครั้งที่ restart server

1. ไปที่แท็บ **"Networking"** (เมนูบน)
2. กด **"Create static IP"**
3. ตั้งค่า:
   - Attach to: `attendance-server`
   - Static IP name: `attendance-ip`
4. กด **"Create"**
5. **จด IP ที่ได้** เช่น `13.212.xxx.xxx`

> Static IP ฟรี ตราบใดที่ attach กับ instance ที่ Running

---

## ส่วนที่ 4: เปิด Firewall (Port)

1. คลิกที่ instance **attendance-server**
2. ไปที่แท็บ **"Networking"**
3. เลื่อนลงหา **"IPv4 Firewall"**
4. กด **"+ Add rule"** เพิ่มทีละตัว:

| Application | Protocol | Port |
|---|---|---|
| Custom | TCP | **4000** |
| HTTPS | TCP | **443** |

5. กด **"Create"** ทั้ง 2 rule

---

## ส่วนที่ 5: SSH เข้า Server

### วิธี A: ผ่าน Browser (ง่ายสุด)
1. คลิกที่ instance
2. กดปุ่ม **"Connect using SSH"** (ไอคอน terminal สีส้ม)
3. จะเปิด terminal ใน browser → พร้อมใช้งาน

### วิธี B: ผ่าน PowerShell (เครื่องตัวเอง)
1. ไปที่ **Account** → **SSH Keys** → ดาวน์โหลด Default Key
2. เปิด PowerShell:
```powershell
ssh -i Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@13.212.xxx.xxx
```

---

## ส่วนที่ 6: ติดตั้งระบบ

หลัง SSH เข้าแล้ว copy คำสั่งทั้งหมดนี้วาง:

```bash
# อัปเดต + ติดตั้ง
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2

# Clone โค้ด
cd /var/www
sudo git clone https://github.com/yunum811-bit/attendance.git
cd attendance
sudo chown -R ubuntu:ubuntu /var/www/attendance

# ติดตั้ง + Build
npm install
npm run build
mkdir -p data public/uploads/photos public/uploads/avatars public/uploads/announcements

# รัน PM2
pm2 start "npx tsx src/server/index.ts" --name attendance
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## ส่วนที่ 7: ทดสอบ

เปิด Browser บนเครื่องตัวเอง:
```
http://13.212.xxx.xxx:4000
```

✅ เห็นหน้า Login = สำเร็จ!

---

## ส่วนที่ 8: ตั้ง Domain + SSL

(ทำหลังจากชี้ DNS ที่ inet/THNIC แล้ว)

```bash
# ตั้ง Nginx
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

## ส่วนที่ 9: ขอใบกำกับภาษี (ถ้าต้องการ)

1. Login เข้า **https://console.aws.amazon.com**
2. ไปที่ **Billing** → **Tax Settings**
3. กด **"Add a tax registration"**
4. ใส่:
   - Country: **Thailand**
   - Tax registration number: **เลขประจำตัวผู้เสียภาษี 13 หลัก**
   - Legal name: บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด
   - Address: ที่อยู่บริษัท
5. กด **"Add"**

หลังจากนี้ AWS จะออก Tax Invoice ให้ทุกเดือน (ดาวน์โหลดที่ Billing → Invoices)

---

## สรุปค่าใช้จ่าย

| รายการ | ราคา/เดือน |
|---|---|
| Lightsail Instance $3.50 | ~125 บาท |
| Static IP | ฟรี |
| SSL (Let's Encrypt) | ฟรี |
| Data Transfer 1TB | ฟรี (ใช้แค่ 2-5 GB) |
| **รวม** | **~125 บาท/เดือน** |

---

## Timeline ทั้งหมด

| ขั้นตอน | เวลา |
|---|---|
| สมัคร AWS | 10 นาที |
| รอ Account Active | 5-10 นาที |
| สร้าง Instance + Static IP + Firewall | 5 นาที |
| SSH + ติดตั้งระบบ | 10 นาที |
| ตั้ง Domain + SSL | 5 นาที (+ รอ DNS) |
| **รวม** | **~35-40 นาที** |

---

*คู่มือนี้ปรับปรุงล่าสุด: พฤษภาคม 2026*
