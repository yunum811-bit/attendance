# คู่มือกู้คืนข้อมูล (Restore Guide)
## ระบบ Check In/Out — AWS Lightsail

---

## ข้อมูลที่อยู่ใน Backup

ไฟล์ `backup_YYYYMMDD.tar.gz` มีข้อมูลครบ 2 ส่วน:

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `data/attendance.db` | ฐานข้อมูลทั้งหมด (พนักงาน, เช็คอิน, ลา, ประกาศ ฯลฯ) |
| `public/uploads/photos/` | รูปถ่ายการเช็คอิน/ออก |
| `public/uploads/avatars/` | รูปโปรไฟล์พนักงาน |
| `public/uploads/announcements/` | ไฟล์แนบประกาศ |

---

## กรณีที่ต้องกู้คืน

- **กรณี A**: ข้อมูลหายบางส่วน (ไฟล์ DB เสีย)
- **กรณี B**: Server พัง ต้องติดตั้งใหม่ทั้งหมด
- **กรณี C**: ย้าย Server ไปเครื่องใหม่

---

## วิธีกู้คืน

### ขั้นตอนที่ 1: Upload ไฟล์ Backup ขึ้น Server

เปิด **PowerShell บนเครื่อง Windows** รัน:

```powershell
scp -i "D:\web\LightsailDefaultKey.pem" "C:\Users\Admin\Desktop\backup_20260821.tar.gz" ubuntu@18.139.53.104:~/
```

> เปลี่ยนชื่อไฟล์ backup ให้ตรงกับที่มีอยู่จริง

---

### ขั้นตอนที่ 2: SSH เข้า Server

```powershell
ssh -i "D:\web\LightsailDefaultKey.pem" ubuntu@18.139.53.104
```

---

### ขั้นตอนที่ 3: หยุด App ก่อนกู้คืน

```bash
pm2 stop attendance
```

---

### ขั้นตอนที่ 4: สำรองข้อมูลปัจจุบันไว้ก่อน (ป้องกันผิดพลาด)

```bash
cp /var/www/attendance/data/attendance.db /var/www/attendance/data/attendance.db.old
```

---

### ขั้นตอนที่ 5: แตกไฟล์ Backup

```bash
cd /var/www/attendance
tar -xzf ~/backup_20260821.tar.gz
```

> คำสั่งนี้จะ overwrite ไฟล์ปัจจุบันด้วยข้อมูลจาก backup ทันที

---

### ขั้นตอนที่ 6: ตรวจสอบไฟล์

```bash
ls -lh data/attendance.db
ls -lh public/uploads/
```

ควรเห็นไฟล์ที่มีวันที่ตรงกับ backup

---

### ขั้นตอนที่ 7: เริ่ม App ใหม่

```bash
pm2 start attendance
pm2 status
```

ต้องเห็นสถานะ **online** ✅

---

### ขั้นตอนที่ 8: ทดสอบ

เปิดเบราว์เซอร์ไปที่ URL ของระบบ แล้วตรวจสอบว่าข้อมูลกลับมาครบ

---

## กรณี B: Server พังต้องติดตั้งใหม่

ถ้าต้องสร้าง Lightsail instance ใหม่ทั้งหมด:

1. ติดตั้ง Server ใหม่ตามคู่มือ `deploy-lightsail.md`
2. หลัง deploy เสร็จแล้ว ทำขั้นตอนที่ 1-8 ด้านบนได้เลย

---

## ลบ Backup เก่าบน Server (ไม่บังคับ)

หลังกู้คืนสำเร็จแล้ว ลบไฟล์ที่ไม่จำเป็น:

```bash
rm ~/backup_20260821.tar.gz
rm /var/www/attendance/data/attendance.db.old
```

---

## สรุปคำสั่งทั้งหมด (Copy ทีเดียว)

**รันบน PowerShell (เครื่อง Windows):**
```powershell
scp -i "D:\web\LightsailDefaultKey.pem" "C:\Users\Admin\Desktop\backup_20260821.tar.gz" ubuntu@18.139.53.104:~/
ssh -i "D:\web\LightsailDefaultKey.pem" ubuntu@18.139.53.104
```

**รันบน Server (หลัง SSH เข้าแล้ว):**
```bash
pm2 stop attendance
cp /var/www/attendance/data/attendance.db /var/www/attendance/data/attendance.db.old
cd /var/www/attendance
tar -xzf ~/backup_20260821.tar.gz
pm2 start attendance
pm2 status
```

---

*คู่มือนี้ใช้สำหรับ backup ที่สร้างด้วย `backup.sh` หรือคำสั่ง `tar -czf`*
*อัปเดตล่าสุด: สิงหาคม 2026*
