# คู่มือ Deploy — Remote เข้า Lightsail, Commit & Push, Deploy

## บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

---

## ข้อมูล Server

| รายการ | ค่า |
|---|---|
| Cloud | AWS Lightsail (Singapore) |
| IP | 18.139.53.104 |
| User | ubuntu |
| SSH Key | `LightsailDefaultKey-ap-southeast-1.pem` |
| App Path | `/var/www/attendance` |
| Process Manager | PM2 |
| Domain | https://checkin.serialfactoring.co.th |

---

## 1. Remote เข้า Lightsail (SSH)

### จากเครื่อง Windows (PowerShell):

```powershell
ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104
```

> ถ้า key อยู่ path อื่น ให้เปลี่ยน path ตามจริง

### เข้าแล้วจะเห็น:

```
ubuntu@ip-172-26-0-143:~$
```

### ไปที่โฟลเดอร์ระบบ:

```bash
cd /var/www/attendance
```

---

## 2. Commit & Push (จากเครื่อง Windows)

### 2.1 ดูไฟล์ที่เปลี่ยนแปลง:

```powershell
cd C:\Attendance
git status
```

### 2.2 เพิ่มไฟล์ทั้งหมด:

```powershell
git add -A
```

### 2.3 Commit พร้อมข้อความ:

```powershell
git commit -m "คำอธิบายสิ่งที่แก้ไข"
```

**ตัวอย่าง:**
```powershell
git commit -m "fix: แก้ไขกล้อง Check In เริ่มที่กล้องหลัง"
git commit -m "feat: เพิ่มระบบประกาศ"
git commit -m "docs: อัปเดตคู่มือ API"
```

### 2.4 Push ขึ้น GitHub:

```powershell
git push
```

> ถ้าถามรหัสผ่าน ให้ใช้ Personal Access Token ของ GitHub

---

## 3. Deploy ขึ้น Lightsail

### วิธี A: รันทีละคำสั่ง (แนะนำสำหรับมือใหม่)

**SSH เข้า server ก่อน:**
```powershell
ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104
```

**แล้วรันทีละบรรทัด:**
```bash
cd /var/www/attendance
git pull
npm install
npm run build
pm2 restart attendance
```

**ตรวจสอบ:**
```bash
pm2 logs attendance --lines 5 --nostream
```

ถ้าเห็น `HTTP → http://localhost:4000` = สำเร็จ ✅

---

### วิธี B: รันจากเครื่อง Windows โดยตรง (ไม่ต้อง SSH เข้าไปเอง)

Copy คำสั่งนี้วางใน PowerShell ทีเดียว:

```powershell
ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104 "cd /var/www/attendance && git stash && git pull && npm install && npm run build && pm2 restart attendance"
```

---

### วิธี C: ถ้า git pull มีปัญหา (conflict)

```bash
cd /var/www/attendance
git stash          # เก็บ local changes ชั่วคราว
git pull           # ดึงโค้ดใหม่
npm install        # ติดตั้ง dependencies
npm run build      # build frontend
pm2 restart attendance
```

---

## 4. คำสั่งที่ใช้บ่อย

### ดูสถานะ Server:

| ทำอะไร | คำสั่ง |
|---|---|
| ดูสถานะ PM2 | `pm2 status` |
| ดู log (realtime) | `pm2 logs attendance` |
| ดู log (5 บรรทัดล่าสุด) | `pm2 logs attendance --lines 5 --nostream` |
| ดู error log | `pm2 logs attendance --err --lines 10` |
| restart | `pm2 restart attendance` |
| stop | `pm2 stop attendance` |
| start | `pm2 start attendance` |
| ดู disk | `df -h` |
| ดู RAM | `free -m` |
| ดู CPU | `top` (กด q เพื่อออก) |

### ดูข้อมูล Git:

| ทำอะไร | คำสั่ง |
|---|---|
| commit ล่าสุด | `git log --oneline -1` |
| commit 5 อันล่าสุด | `git log --oneline -5` |
| ดูไฟล์ที่เปลี่ยน | `git status` |
| ดู diff | `git diff` |

---

## 5. ขั้นตอนรวม (Full Workflow)

```
┌─────────────────────────────────────────────────────────┐
│  เครื่อง Windows (พัฒนา)                                 │
│                                                         │
│  1. แก้ไขโค้ด                                            │
│  2. git add -A                                          │
│  3. git commit -m "คำอธิบาย"                             │
│  4. git push                                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  GitHub (ตัวกลาง)                                        │
│                                                         │
│  • เก็บโค้ดล่าสุด                                        │
│  • Server จะ pull จากที่นี่                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  AWS Lightsail (Production)                             │
│                                                         │
│  5. git pull                                            │
│  6. npm install                                         │
│  7. npm run build                                       │
│  8. pm2 restart attendance                              │
│                                                         │
│  ✅ เว็บอัปเดตทันที!                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 6. แก้ปัญหาที่พบบ่อย

### Server ล่ม / เว็บเปิดไม่ได้:

```bash
ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104
pm2 status
pm2 logs attendance --lines 20
pm2 restart attendance
```

### git pull error — "local changes would be overwritten":

```bash
git stash
git pull
```

### npm install error — disk เต็ม:

```bash
df -h
# ถ้า disk เต็ม:
pm2 flush              # ลบ log เก่า
sudo apt autoremove    # ลบ package ที่ไม่ใช้
```

### เว็บขึ้นแต่แสดงหน้าเก่า (cache):

- มือถือ: กด refresh หรือปิด-เปิดแอปใหม่
- PC: กด `Ctrl+Shift+R` (Hard Refresh)

### PM2 ไม่ทำงานหลัง reboot server:

```bash
pm2 resurrect
# ถ้าไม่ได้:
cd /var/www/attendance
pm2 start "npx tsx src/server/index.ts" --name attendance
pm2 save
```

---

## 7. Backup ข้อมูล

### ดาวน์โหลดข้อมูลจาก server มาเครื่อง Windows:

```powershell
# ดาวน์โหลด database
scp -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104:/var/www/attendance/data/attendance.db C:\Attendance\backup\

# ดาวน์โหลดรูปภาพ
scp -r -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104:/var/www/attendance/public/uploads/ C:\Attendance\backup\uploads\
```

### Backup บน server:

```bash
cd /var/www/attendance
mkdir -p ~/backups
tar -czf ~/backups/backup_$(date +%Y%m%d).tar.gz data/ public/uploads/
```

---

## 8. สรุปคำสั่ง Quick Reference

### Deploy ด่วน (copy วางทีเดียว):

```powershell
cd C:\Attendance; git add -A; git commit -m "update"; git push; ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104 "cd /var/www/attendance && git stash && git pull && npm install && npm run build && pm2 restart attendance"
```

### ดู log ด่วน:

```powershell
ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104 "pm2 logs attendance --lines 10 --nostream"
```

### เช็คสถานะด่วน:

```powershell
ssh -i $HOME\Downloads\LightsailDefaultKey-ap-southeast-1.pem ubuntu@18.139.53.104 "pm2 status"
```

---

*คู่มือนี้ปรับปรุงล่าสุด: 19 มิถุนายน 2026*
