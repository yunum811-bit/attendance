# ระบบ Check In/Out & ลา (Attendance System)

ระบบบันทึกเวลาเข้า-ออกงาน และระบบลาพร้อมการอนุมัติตามแผนก

## ฟีเจอร์

- ✅ **Check In/Out** - บันทึกเวลาเข้า-ออกงานรายวัน พร้อมนาฬิกาแบบ real-time
- ✅ **ระบบลา** - ขอลาป่วย, ลากิจ, ลาพักร้อน, ลาคลอด
- ✅ **อนุมัติตามแผนก** - หัวหน้าแผนกอนุมัติ/ปฏิเสธการลาของพนักงานในแผนก
- ✅ **รายงาน** - รายงานการเข้างาน, รายงานการลา, สรุปรายเดือน
- ✅ **Export** - ส่งออกรายงานเป็น CSV / XLSX
- ✅ **จัดการพนักงาน** - เพิ่ม/แก้ไขข้อมูลพนักงาน (สำหรับ Admin)

## เทคโนโลยี

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (sql.js - ไม่ต้อง native build)
- **Export**: SheetJS (xlsx)

## วิธีใช้งาน

### ติดตั้ง

```bash
npm install
```

### รัน Development

เปิด 2 terminal:

```bash
# Terminal 1 - Backend Server (port 4000)
npm run dev:server

# Terminal 2 - Frontend Dev Server (port 3000)
npm run dev:client
```

เปิดเบราว์เซอร์ไปที่ http://localhost:3000

### ข้อมูลทดสอบ (Login)

| รหัสพนักงาน | รหัสผ่าน | บทบาท | แผนก |
|---|---|---|---|
| EMP001 | 1234 | Admin | ฝ่ายบริหาร |
| EMP002 | 1234 | Manager | ฝ่ายไอที |
| EMP003 | 1234 | Employee | ฝ่ายไอที |
| EMP004 | 1234 | Manager | ฝ่ายบัญชี |
| EMP005 | 1234 | Employee | ฝ่ายบัญชี |

### บทบาท (Roles)

- **Admin** - เข้าถึงทุกฟีเจอร์ รวมถึงจัดการพนักงานและอนุมัติการลา
- **Manager** - อนุมัติ/ปฏิเสธการลาของพนักงานในแผนก
- **Employee** - Check In/Out และขอลา

## โครงสร้างโปรเจค

```
src/
├── client/           # Frontend (React)
│   ├── components/   # Shared components
│   ├── pages/        # Page components
│   ├── App.tsx       # Main app with routing
│   └── main.tsx      # Entry point
└── server/           # Backend (Express)
    ├── routes/       # API routes
    ├── database.ts   # SQLite database setup
    └── index.ts      # Server entry point
```

## API Endpoints

### Auth
- `POST /api/auth/login` - เข้าสู่ระบบ

### Attendance
- `POST /api/attendance/checkin` - Check In
- `POST /api/attendance/checkout` - Check Out
- `GET /api/attendance/today/:employeeId` - สถานะวันนี้
- `GET /api/attendance/history/:employeeId` - ประวัติ

### Leave
- `GET /api/leave/types` - ประเภทการลา
- `POST /api/leave/request` - ขอลา
- `GET /api/leave/my-requests/:employeeId` - ประวัติการลา
- `GET /api/leave/pending/:departmentId` - คำขอรออนุมัติ
- `PUT /api/leave/approve/:id` - อนุมัติ
- `PUT /api/leave/reject/:id` - ปฏิเสธ

### Reports (รองรับ ?format=csv หรือ ?format=xlsx)
- `GET /api/reports/attendance` - รายงานการเข้างาน
- `GET /api/reports/leave` - รายงานการลา
- `GET /api/reports/summary` - สรุปรายเดือน
