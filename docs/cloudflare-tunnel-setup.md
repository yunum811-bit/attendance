# คู่มือติดตั้ง Cloudflare Tunnel อย่างละเอียด

## สำหรับระบบ Check In/Out — บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

---

## ภาพรวม

```
มือถือพนักงาน (ที่ไหนก็ได้)
        ↓ เปิด https://checkin.serialfactoring.co.th
        ↓
   Cloudflare (ฟรี, HTTPS อัตโนมัติ)
        ↓
   Cloudflare Tunnel (เชื่อมต่อปลอดภัย)
        ↓
   เครื่อง Server ในบริษัท (ไม่ต้องเปิด port)
```

---

## สิ่งที่ต้องเตรียม

- ✅ เครื่อง Server ในบริษัท (Windows) ที่รันระบบ Check In/Out อยู่แล้ว
- ✅ Internet ในบริษัท
- ✅ Email สำหรับสมัคร Cloudflare
- ✅ Domain: serialfactoring.co.th (ถ้าต้องการ URL ถาวร)

---

## ส่วนที่ 1: Quick Tunnel (ใช้งานได้ทันที ไม่ต้องมี domain)

### ขั้นตอน 1.1: ดาวน์โหลด cloudflared

1. เปิด Browser บนเครื่อง Server
2. ไปที่: **https://github.com/cloudflare/cloudflared/releases/latest**
3. เลื่อนหา **"Assets"** → ดาวน์โหลด **`cloudflared-windows-amd64.exe`**
4. สร้างโฟลเดอร์ `C:\cloudflared\`
5. ย้ายไฟล์ที่ดาวน์โหลดไปที่ `C:\cloudflared\`
6. เปลี่ยนชื่อเป็น **`cloudflared.exe`**

### ขั้นตอน 1.2: ตรวจสอบว่าระบบ Check In/Out ทำงานอยู่

เปิด PowerShell:
```powershell
cd C:\Attendance
npm start
```
รอจนเห็น `HTTP → http://localhost:4000`

### ขั้นตอน 1.3: เปิด Tunnel

เปิด PowerShell **อีกหน้าต่างหนึ่ง** (ไม่ปิดอันเดิม):
```powershell
C:\cloudflared\cloudflared.exe tunnel --url http://localhost:4000
```

### ขั้นตอน 1.4: ดู URL

จะแสดงข้อความประมาณนี้:
```
2026-05-15 INF +----------------------------+
2026-05-15 INF |  Your quick Tunnel has been created!
2026-05-15 INF |  https://bright-flower-abc123.trycloudflare.com
2026-05-15 INF +----------------------------+
```

### ขั้นตอน 1.5: ทดสอบ

เปิดมือถือ → เปิด Browser → พิมพ์ URL ที่ได้ เช่น:
```
https://bright-flower-abc123.trycloudflare.com
```

✅ ถ้าเห็นหน้า Login = สำเร็จ!
✅ GPS ทำงานได้ (เพราะเป็น HTTPS)
✅ ใช้ได้จากทุกที่ (บ้าน, ร้านกาแฟ, ต่างจังหวัด)

### ⚠️ ข้อจำกัดของ Quick Tunnel:
- URL จะเปลี่ยนทุกครั้งที่รัน cloudflared ใหม่
- ต้องแจ้ง URL ใหม่ให้พนักงานทุกครั้ง
- ถ้าต้องการ URL ถาวร → ทำส่วนที่ 2

---

## ส่วนที่ 2: Tunnel ถาวร + Domain (checkin.serialfactoring.co.th)

### ขั้นตอน 2.1: สมัคร Cloudflare

1. ไปที่ **https://dash.cloudflare.com/sign-up**
2. ใส่ Email + Password → กด Create Account
3. ยืนยัน Email (เช็ค inbox)

### ขั้นตอน 2.2: เพิ่ม Domain ใน Cloudflare

1. Login เข้า Cloudflare Dashboard
2. กด **"+ Add a site"**
3. พิมพ์ **`serialfactoring.co.th`** → กด Continue
4. เลือก Plan **"Free"** → กด Continue
5. Cloudflare จะแสดง Nameserver 2 ตัว เช่น:
   ```
   anna.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
6. **จดไว้** (ใช้ในขั้นตอนถัดไป)

### ขั้นตอน 2.3: เปลี่ยน Nameserver ที่ THNIC

1. Login เข้า **https://www.thnic.co.th** (ด้วย account เจ้าของ domain)
2. ไปที่จัดการ domain → **serialfactoring.co.th**
3. หาส่วน **"Nameserver"** หรือ **"DNS"**
4. เปลี่ยน Nameserver เป็น:
   ```
   anna.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
   (ใช้ค่าที่ Cloudflare ให้ในขั้นตอน 2.2)
5. บันทึก
6. **รอ 1-24 ชั่วโมง** ให้ DNS อัปเดต

### ขั้นตอน 2.4: ตรวจสอบว่า Cloudflare เชื่อมต่อแล้ว

- กลับไปที่ Cloudflare Dashboard
- ดูที่ domain → สถานะจะเปลี่ยนเป็น **"Active"** (เครื่องหมายถูกสีเขียว)
- ถ้ายังเป็น "Pending" → รอต่อ (ปกติ 1-6 ชั่วโมง)

### ขั้นตอน 2.5: สร้าง Tunnel ถาวร

เปิด PowerShell บนเครื่อง Server:

**Login:**
```powershell
C:\cloudflared\cloudflared.exe tunnel login
```
- จะเปิด Browser อัตโนมัติ
- เลือก domain **serialfactoring.co.th**
- กด **"Authorize"**
- เห็นข้อความ "You have successfully logged in" = สำเร็จ

**สร้าง Tunnel:**
```powershell
C:\cloudflared\cloudflared.exe tunnel create checkin
```
- จะแสดง Tunnel ID เช่น: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **จดไว้**

### ขั้นตอน 2.6: สร้างไฟล์ Config

เปิด Notepad → วางเนื้อหานี้:

```yaml
tunnel: a1b2c3d4-e5f6-7890-abcd-ef1234567890
credentials-file: C:\Users\<ชื่อผู้ใช้>\.cloudflared\a1b2c3d4-e5f6-7890-abcd-ef1234567890.json

ingress:
  - hostname: checkin.serialfactoring.co.th
    service: http://localhost:4000
  - service: http_status:404
```

> **เปลี่ยน:**
> - `a1b2c3d4-...` เป็น Tunnel ID จริง
> - `<ชื่อผู้ใช้>` เป็นชื่อ user Windows

บันทึกเป็น: `C:\Users\<ชื่อผู้ใช้>\.cloudflared\config.yml`

### ขั้นตอน 2.7: ตั้ง DNS

```powershell
C:\cloudflared\cloudflared.exe tunnel route dns checkin checkin.serialfactoring.co.th
```

### ขั้นตอน 2.8: ทดสอบ Tunnel

```powershell
C:\cloudflared\cloudflared.exe tunnel run checkin
```

เปิดมือถือ → ไปที่:
```
https://checkin.serialfactoring.co.th
```

✅ เห็นหน้า Login = สำเร็จ!

### ขั้นตอน 2.9: ติดตั้งเป็น Windows Service (รันอัตโนมัติ)

```powershell
C:\cloudflared\cloudflared.exe service install
```

หลังจากนี้ เปิดเครื่องมา Tunnel จะทำงานอัตโนมัติ ไม่ต้องรันเอง

---

## ส่วนที่ 3: ตั้งให้ทุกอย่างรันอัตโนมัติ

### 3.1: ระบบ Check In/Out (PM2)

```powershell
npm install -g pm2 pm2-windows-startup
cd C:\Attendance
pm2 start "npx tsx src/server/index.ts" --name attendance
pm2 save
pm2-windows-startup install
```

### 3.2: Cloudflare Tunnel (Windows Service)

ทำไปแล้วในขั้นตอน 2.9

### 3.3: ทดสอบ

1. **Restart เครื่อง**
2. รอ 1-2 นาที
3. เปิดมือถือ → `https://checkin.serialfactoring.co.th`
4. ✅ ถ้าใช้งานได้ = ตั้งค่าสมบูรณ์!

---

## สรุปสิ่งที่ต้องทำ

| ลำดับ | ทำอะไร | ใช้เวลา |
|---|---|---|
| 1 | ดาวน์โหลด cloudflared.exe | 2 นาที |
| 2 | ทดสอบ Quick Tunnel | 3 นาที |
| 3 | สมัคร Cloudflare + เพิ่ม domain | 5 นาที |
| 4 | เปลี่ยน Nameserver ที่ THNIC | 5 นาที + รอ 1-24 ชม. |
| 5 | สร้าง Tunnel ถาวร + config | 10 นาที |
| 6 | ติดตั้ง Service อัตโนมัติ | 5 นาที |

**รวม:** ~30 นาที (ไม่รวมเวลารอ DNS)

---

## ปัญหาที่อาจเจอ

| ปัญหา | วิธีแก้ |
|---|---|
| cloudflared: command not found | ใช้ path เต็ม: `C:\cloudflared\cloudflared.exe` |
| Tunnel login เปิด browser ไม่ได้ | Copy URL จาก terminal ไปเปิดเอง |
| DNS ยังไม่ active | รอ 1-24 ชั่วโมงหลังเปลี่ยน Nameserver |
| เว็บเปิดไม่ได้ | ตรวจว่า `npm start` ทำงานอยู่ + Tunnel ทำงานอยู่ |
| ไม่มี password THNIC | ดูคู่มือ "ถ้าไม่มี username password ของ THNIC" |

---

## ค่าใช้จ่าย

| รายการ | ราคา |
|---|---|
| Cloudflare account | **ฟรี** |
| Cloudflare Tunnel | **ฟรี** |
| HTTPS/SSL | **ฟรี** (Cloudflare จัดการให้) |
| Domain serialfactoring.co.th | มีอยู่แล้ว (ต่ออายุปกติ) |
| **รวม** | **0 บาท/เดือน** |

---

*คู่มือนี้ปรับปรุงล่าสุด: พฤษภาคม 2026*
