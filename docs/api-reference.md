# API Reference — ระบบ Check In/Out & ลา

## Base URL

```
https://checkin.serialfactoring.co.th/api
```

---

## สารบัญ

1. [Auth (เข้าสู่ระบบ)](#1-auth)
2. [Attendance (เข้า-ออกงาน)](#2-attendance)
3. [Leave (การลา)](#3-leave)
4. [Employees (พนักงาน)](#4-employees)
5. [Departments (แผนก)](#5-departments)
6. [Reports (รายงาน)](#6-reports)
7. [Notifications (แจ้งเตือน)](#7-notifications)
8. [Announcements (ประกาศ)](#8-announcements)
9. [Settings (ตั้งค่า)](#9-settings)
10. [Holidays (วันหยุด)](#10-holidays)

---

## 1. Auth

### POST /api/auth/login

เข้าสู่ระบบ

**Body:**
```json
{
  "employee_code": "EMP001",
  "password": "1234"
}
```

**Response:**
```json
{
  "employee": {
    "id": 1,
    "employee_code": "EMP001",
    "first_name": "สมชาย",
    "last_name": "ใจดี",
    "email": "somchai@company.com",
    "department_id": 1,
    "role": "admin",
    "avatar": "/uploads/avatars/avatar_1.jpg",
    "department_name": "ฝ่ายบริหาร"
  }
}
```

---

## 2. Attendance

### POST /api/attendance/checkin

Check In (บังคับถ่ายรูป + GPS)

**Body:**
```json
{
  "employee_id": 3,
  "photo": "data:image/jpeg;base64,...",
  "location": { "lat": 13.7563, "lng": 100.5018, "accuracy": 15 }
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Check In สำเร็จ",
  "time": "08:25:30"
}
```

---

### POST /api/attendance/checkout

Check Out (ไม่ต้องถ่ายรูป, GPS เท่านั้น)

**Body:**
```json
{
  "employee_id": 3,
  "photo": null,
  "location": { "lat": 13.7563, "lng": 100.5018, "accuracy": 12 }
}
```

---

### GET /api/attendance/today/{employeeId}

สถานะ Check In/Out วันนี้

**Response:**
```json
{
  "id": 1,
  "employee_id": 3,
  "date": "2026-05-15",
  "check_in": "08:25:30",
  "check_out": "17:35:00",
  "photo_checkin": "/uploads/photos/3_2026-05-15_checkin.jpg",
  "location_checkin": "13.7563,100.5018,15",
  "location_checkout": "13.7565,100.5020,10",
  "status": "present"
}
```

---

### GET /api/attendance/history/{employeeId}?start_date=&end_date=

ประวัติการเข้างาน

**Parameters:**
| Parameter | ต้องมี | ตัวอย่าง |
|---|---|---|
| start_date | ไม่ | 2026-05-01 |
| end_date | ไม่ | 2026-05-31 |

---

## 3. Leave

### GET /api/leave/types

ประเภทการลาทั้งหมด

**Response:**
```json
[
  { "id": 1, "name": "ลาป่วย", "max_days": 30, "description": "" },
  { "id": 2, "name": "ลากิจ", "max_days": 5, "description": "" }
]
```

---

### POST /api/leave/request

ส่งคำขอลา

**Body:**
```json
{
  "employee_id": 3,
  "leave_type_id": 1,
  "start_date": "2026-05-20",
  "end_date": "2026-05-21",
  "days": 2,
  "reason": "ไม่สบาย"
}
```

---

### GET /api/leave/my-requests/{employeeId}

คำขอลาของพนักงาน

**Response:**
```json
[
  {
    "id": 1,
    "leave_type_name": "ลาป่วย",
    "start_date": "2026-05-20",
    "end_date": "2026-05-21",
    "days": 2,
    "reason": "ไม่สบาย",
    "status": "approved",
    "approver_name": "สมหญิง รักงาน"
  }
]
```

---

### GET /api/leave/summary/{employeeId}

สรุปวันลาที่ใช้ไป (ต่อปี)

---

### PUT /api/leave/approve/{id}

อนุมัติการลา

**Body:** `{ "approved_by": 2 }`

---

### PUT /api/leave/reject/{id}

ปฏิเสธการลา

**Body:** `{ "approved_by": 2, "reject_reason": "เหตุผล" }`

---

### PUT /api/leave/revoke/{id}

ยกเลิกการอนุมัติ (Admin only)

**Body:** `{ "revoked_by": 1, "reason": "เหตุผล" }`

---

### GET /api/leave/pending-for-manager/{departmentId}

คำขอลาที่รออนุมัติ (สำหรับ Manager)

---

### GET /api/leave/pending-for-admin

คำขอลาจากหัวหน้าแผนก (สำหรับ Admin/MD)

---

### GET /api/leave/pending-all-employees

คำขอลาจากพนักงานทุกแผนก (สำหรับ Admin)

---

## 4. Employees

### GET /api/employees

พนักงานทั้งหมด

---

### GET /api/employees/department/{departmentId}

พนักงานตามแผนก

---

### POST /api/employees

เพิ่มพนักงาน

**Body:**
```json
{
  "employee_code": "EMP006",
  "first_name": "ชื่อ",
  "last_name": "นามสกุล",
  "email": "email@company.com",
  "department_id": 2,
  "role": "employee"
}
```

---

### PUT /api/employees/{id}

แก้ไขข้อมูลพนักงาน

---

### DELETE /api/employees/{id}

ลบพนักงาน (เฉพาะที่ไม่มีประวัติ)

---

### PUT /api/employees/{id}/set-password

ตั้งรหัสผ่านใหม่

**Body:** `{ "new_password": "newpass" }`

---

### PUT /api/employees/{id}/reset-password

รีเซ็ตรหัสผ่านเป็น "1234"

---

### PUT /api/employees/{id}/change-password

เปลี่ยนรหัสผ่าน (พนักงานเปลี่ยนเอง)

**Body:** `{ "current_password": "old", "new_password": "new" }`

---

### PUT /api/employees/{id}/avatar

อัปโหลดรูปโปรไฟล์

**Body:** `{ "avatar": "data:image/jpeg;base64,..." }`

---

## 5. Departments

### GET /api/departments

แผนกทั้งหมด (พร้อมจำนวนพนักงาน)

---

### POST /api/departments

เพิ่มแผนก

**Body:** `{ "name": "ฝ่ายขาย" }`

---

### PUT /api/departments/{id}

แก้ไขชื่อแผนก

---

### DELETE /api/departments/{id}

ลบแผนก (เฉพาะที่ไม่มีพนักงาน)

---

## 6. Reports

### GET /api/reports/attendance

รายงานการเข้างาน

**Parameters:**
| Parameter | ตัวอย่าง | คำอธิบาย |
|---|---|---|
| employee_id | 3 | กรองเฉพาะพนักงาน |
| department_id | 2 | กรองเฉพาะแผนก |
| start_date | 2026-05-01 | วันที่เริ่ม |
| end_date | 2026-05-31 | วันที่สิ้นสุด |
| format | csv / xlsx | Export ไฟล์ |

**ตัวอย่าง:**
```
GET /api/reports/attendance?department_id=2&start_date=2026-05-01&end_date=2026-05-31
GET /api/reports/attendance?department_id=2&format=xlsx
```

---

### GET /api/reports/leave

รายงานการลา

**Parameters:**
| Parameter | ตัวอย่าง |
|---|---|
| employee_id | 3 |
| department_id | 2 |
| start_date | 2026-05-01 |
| end_date | 2026-05-31 |
| status | pending / approved / rejected / revoked |
| format | csv / xlsx |

**ตัวอย่างสำหรับ CRM — ดึงการลาที่อนุมัติแล้วของแผนก:**
```
GET /api/reports/leave?department_id=2&status=approved&start_date=2026-01-01&end_date=2026-12-31
```

**Response:**
```json
[
  {
    "employee_code": "EMP003",
    "first_name": "สมศักดิ์",
    "last_name": "มั่นคง",
    "department_name": "ฝ่ายไอที",
    "leave_type_name": "ลาป่วย",
    "start_date": "2026-05-20",
    "end_date": "2026-05-21",
    "days": 2,
    "reason": "ไม่สบาย",
    "status": "approved",
    "approver_name": "สมหญิง รักงาน"
  }
]
```

---

### GET /api/reports/summary

สรุปรายเดือน

**Parameters:**
| Parameter | ตัวอย่าง |
|---|---|
| department_id | 2 |
| employee_id | 3 |
| month | 05 |
| year | 2026 |
| format | csv / xlsx |

---

## 7. Notifications

### GET /api/notifications/{employeeId}?limit=10

แจ้งเตือนของพนักงาน

---

### GET /api/notifications/{employeeId}/unread-count

จำนวนแจ้งเตือนที่ยังไม่อ่าน

**Response:** `{ "count": 3 }`

---

### PUT /api/notifications/{id}/read

Mark as read

---

### PUT /api/notifications/read-all/{employeeId}

Mark all as read

---

## 8. Announcements

### GET /api/announcements

ประกาศทั้งหมด

---

### POST /api/announcements

สร้างประกาศ (Admin)

**Body:**
```json
{
  "title": "หัวข้อ",
  "content": "เนื้อหา",
  "attachment": "data:application/pdf;base64,...",
  "attachment_name": "ไฟล์แนบ.pdf",
  "created_by": 1
}
```

---

### DELETE /api/announcements/{id}

ลบประกาศ

---

## 9. Settings

### GET /api/settings

ตั้งค่าทั้งหมด

**Response:**
```json
{
  "company_name": "บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด",
  "company_logo": "/uploads/logo.png",
  "work_start": "08:30",
  "work_end": "17:30",
  "break_start": "12:00",
  "break_end": "13:00"
}
```

---

### PUT /api/settings/{key}

อัปเดตค่า

**Body:** `{ "value": "ค่าใหม่" }`

---

### POST /api/settings/logo

อัปโหลดโลโก้

**Body:** `{ "logo": "data:image/png;base64,..." }`

---

## 10. Holidays

### GET /api/holidays

วันหยุดที่ Admin เพิ่มเอง (custom)

---

### POST /api/holidays

เพิ่มวันหยุด

**Body:**
```json
{
  "date": "2026-05-31",
  "name": "วันวิสาขบูชา",
  "created_by": 1
}
```

---

### PUT /api/holidays/{id}

แก้ไขวันหยุด

---

### DELETE /api/holidays/{id}

ลบวันหยุด

---

## ตัวอย่างการเชื่อมกับ CRM

### ดึงการลาที่อนุมัติแล้ว แสดงใน Calendar:

```javascript
const response = await fetch(
  'https://checkin.serialfactoring.co.th/api/reports/leave?department_id=2&status=approved&start_date=2026-01-01&end_date=2026-12-31'
);
const leaves = await response.json();

// แปลงเป็น calendar events
const events = leaves.map(leave => ({
  title: `${leave.first_name} ${leave.last_name} - ${leave.leave_type_name}`,
  start: leave.start_date,
  end: leave.end_date,
  allDay: true,
  color: '#f59e0b' // สีส้ม
}));
```

### ดึงข้อมูลการเข้างานวันนี้:

```javascript
const response = await fetch(
  'https://checkin.serialfactoring.co.th/api/reports/attendance?department_id=2&start_date=2026-05-15&end_date=2026-05-15'
);
const attendance = await response.json();
```

---

## หมายเหตุ

- ทุก API ส่ง/รับข้อมูลเป็น **JSON**
- วันที่ใช้รูปแบบ **yyyy-mm-dd** (เช่น 2026-05-15)
- เวลาใช้รูปแบบ **HH:mm:ss** (เช่น 08:30:00)
- ขนาดไฟล์สูงสุด: **10 MB** ต่อ request

---

*API Reference ปรับปรุงล่าสุด: พฤษภาคม 2026*
