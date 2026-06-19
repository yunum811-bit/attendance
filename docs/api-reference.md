# API Reference — ระบบ Check In/Out & ลา

## บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

---

## Base URL

```
https://checkin.serialfactoring.co.th/api
```

---

## สารบัญ

1. [Auth (เข้าสู่ระบบ)](#1-auth-เข้าสู่ระบบ)
2. [Attendance (เข้า-ออกงาน)](#2-attendance-เข้า-ออกงาน)
3. [Leave (การลา)](#3-leave-การลา)
4. [Leave Types (ประเภทการลา)](#4-leave-types-ประเภทการลา)
5. [Leave Quotas (โควต้าวันลา)](#5-leave-quotas-โควต้าวันลา)
6. [Forgot Check-In (ลืม Check In)](#6-forgot-check-in-ลืม-check-in)
7. [Employees (พนักงาน)](#7-employees-พนักงาน)
8. [Departments (แผนก)](#8-departments-แผนก)
9. [Reports (รายงาน)](#9-reports-รายงาน)
10. [Notifications (แจ้งเตือน)](#10-notifications-แจ้งเตือน)
11. [Announcements (ประกาศ)](#11-announcements-ประกาศ)
12. [Settings (ตั้งค่า)](#12-settings-ตั้งค่า)
13. [Holidays (วันหยุด)](#13-holidays-วันหยุด)
14. [External API (สำหรับ CRM)](#14-external-api-สำหรับ-crm)

---

## ข้อมูลทั่วไป

| หัวข้อ | รายละเอียด |
|---|---|
| Content-Type | `application/json` |
| รูปแบบวันที่ (API) | `yyyy-mm-dd` (เช่น 2026-05-15) |
| รูปแบบเวลา | `HH:mm:ss` (เช่น 08:30:00) |
| ขนาด request สูงสุด | 10 MB |
| Timezone | Asia/Bangkok (UTC+7) |

---

## 1. Auth (เข้าสู่ระบบ)

### POST /api/auth/login

เข้าสู่ระบบด้วยรหัสพนักงานและรหัสผ่าน

**Request Body:**
```json
{
  "employee_code": "EMP001",
  "password": "1234"
}
```

**Response 200:**
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

**Response 401:**
```json
{ "error": "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" }
```

**Roles ที่เป็นไปได้:**

| Role | คำอธิบาย |
|---|---|
| `employee` | พนักงานทั่วไป |
| `manager` | หัวหน้าแผนก |
| `md` | กรรมการผู้จัดการ |
| `admin` | ผู้ดูแลระบบ |
| `manager_admin` | หัวหน้าแผนก + Admin |

---

## 2. Attendance (เข้า-ออกงาน)

### POST /api/attendance/checkin

Check In ลงเวลาเข้างาน (ต้องถ่ายรูป + GPS)

**Request Body:**
```json
{
  "employee_id": 3,
  "photo": "data:image/jpeg;base64,...",
  "location": { "lat": 13.7563, "lng": 100.5018, "accuracy": 15 }
}
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| employee_id | ✅ | ID พนักงาน |
| photo | ✅ | รูปถ่าย base64 (PNG, JPEG, WEBP) |
| location | ❌ | พิกัด GPS (lat, lng, accuracy เป็นเมตร) |

**Response 200:**
```json
{
  "id": 1,
  "message": "Check In สำเร็จ",
  "time": "08:25:30",
  "photo": "/uploads/photos/3_2026-05-15_checkin_1778577496546.jpg"
}
```

**Response 400:**
```json
{ "error": "คุณได้ Check In วันนี้แล้ว" }
{ "error": "กรุณาถ่ายรูปก่อน Check In" }
```

---

### POST /api/attendance/checkout

Check Out ลงเวลาออกงาน (ไม่ต้องถ่ายรูป, GPS เท่านั้น)

**Request Body:**
```json
{
  "employee_id": 3,
  "photo": null,
  "location": { "lat": 13.7563, "lng": 100.5018, "accuracy": 12 }
}
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| employee_id | ✅ | ID พนักงาน |
| photo | ❌ | ถ่ายรูปหรือไม่ก็ได้ |
| location | ❌ | พิกัด GPS |

**Response 200:**
```json
{ "message": "Check Out สำเร็จ", "time": "17:35:00", "photo": "" }
```

**Response 400:**
```json
{ "error": "คุณยังไม่ได้ Check In วันนี้" }
{ "error": "คุณได้ Check Out วันนี้แล้ว" }
```

---

### GET /api/attendance/today/{employeeId}

สถานะ Check In/Out วันนี้ของพนักงาน

**Response 200:**
```json
{
  "id": 1,
  "employee_id": 3,
  "date": "2026-05-15",
  "check_in": "08:25:30",
  "check_out": "17:35:00",
  "photo_checkin": "/uploads/photos/3_2026-05-15_checkin_1778577496546.jpg",
  "photo_checkout": "",
  "location_checkin": "13.7563,100.5018,15",
  "location_checkout": "13.7565,100.5020,10",
  "status": "present",
  "note": ""
}
```

> ถ้ายังไม่ Check In วันนี้ จะได้ `null`

---

### GET /api/attendance/history/{employeeId}

ประวัติการเข้างานของพนักงาน

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| start_date | ❌ | 2026-05-01 | กรองตั้งแต่วันที่ |
| end_date | ❌ | 2026-05-31 | กรองถึงวันที่ |

**Response 200:** Array ของ attendance records

---

### GET /api/attendance/department/{departmentId}

ข้อมูล Check In/Out ของพนักงานทั้งแผนก (สำหรับ Manager)

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| date | ❌ | 2026-05-15 | วันที่ต้องการดู (default = วันนี้) |

**Response 200:**
```json
[
  {
    "id": 1,
    "employee_id": 3,
    "date": "2026-05-15",
    "check_in": "08:25:30",
    "check_out": "17:35:00",
    "first_name": "สมชาย",
    "last_name": "ใจดี",
    "employee_code": "EMP003"
  }
]
```

---

## 3. Leave (การลา)

### POST /api/leave/request

ส่งคำขอลา

**Request Body:**
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

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| employee_id | ✅ | ID พนักงาน |
| leave_type_id | ✅ | ID ประเภทการลา |
| start_date | ✅ | วันที่เริ่มลา |
| end_date | ✅ | วันที่สิ้นสุดลา |
| days | ✅ | จำนวนวันลา (รองรับทศนิยม เช่น 0.5) |
| reason | ❌ | เหตุผล |

**Response 200:**
```json
{ "id": 5, "message": "ส่งคำขอลาสำเร็จ (ส่งถึงหัวหน้าแผนก: สมหญิง)" }
```

> ระบบจะส่งแจ้งเตือนไปยังผู้อนุมัติอัตโนมัติ:
> - พนักงาน → หัวหน้าแผนก (ถ้ามี) หรือ Admin/MD (ถ้าไม่มีหัวหน้า)
> - หัวหน้าแผนก → MD/Admin

---

### GET /api/leave/my-requests/{employeeId}

คำขอลาทั้งหมดของพนักงาน

**Response 200:**
```json
[
  {
    "id": 1,
    "leave_type_id": 1,
    "leave_type_name": "ลาป่วย",
    "start_date": "2026-05-20",
    "end_date": "2026-05-21",
    "days": 2,
    "reason": "ไม่สบาย",
    "status": "approved",
    "approved_by": 2,
    "approved_at": "2026-05-19T10:30:00",
    "approver_name": "สมหญิง รักงาน",
    "reject_reason": null,
    "created_at": "2026-05-18T08:00:00"
  }
]
```

**สถานะที่เป็นไปได้:**

| Status | คำอธิบาย |
|---|---|
| `pending` | รออนุมัติ |
| `approved` | อนุมัติแล้ว |
| `rejected` | ไม่อนุมัติ |
| `revoked` | ยกเลิกการอนุมัติ (โดย Admin) |

---

### GET /api/leave/summary/{employeeId}

สรุปวันลาที่ใช้ไปของพนักงาน (ต่อปีปัจจุบัน) พร้อมโควต้าที่มีสิทธิ์

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "ลาป่วย",
    "default_max_days": 30,
    "max_days": 30,
    "used_days": 2
  },
  {
    "id": 2,
    "name": "ลากิจ",
    "default_max_days": 5,
    "max_days": 7,
    "used_days": 1
  }
]
```

> `max_days` = จำนวนวันสูงสุดที่ใช้ได้ (อาจเป็นค่า custom ต่อบุคคล)
> `used_days` = จำนวนวันที่ใช้ไปแล้ว (เฉพาะ approved)

---

### GET /api/leave/pending-for-manager/{departmentId}

คำขอลาจากพนักงานในแผนก ที่รออนุมัติ (สำหรับ Manager)

**Response 200:** Array ของ leave requests ที่มี status = `pending`

---

### GET /api/leave/pending-all-employees

คำขอลาจากพนักงานทุกแผนก ที่รออนุมัติ (สำหรับ Admin/MD)

**Response 200:** Array ของ leave requests พร้อม `department_name`

---

### GET /api/leave/pending-for-admin

คำขอลาจากหัวหน้าแผนก ที่รออนุมัติ (สำหรับ MD/Admin)

**Response 200:** Array ของ leave requests จาก role `manager` / `manager_admin`

---

### GET /api/leave/pending-no-manager

คำขอลาจากพนักงานที่ไม่มีหัวหน้าแผนก (สำหรับ Admin)

**Response 200:** Array ของ leave requests จากพนักงานในแผนกที่ไม่มี manager

---

### GET /api/leave/recent-approved

คำขอลาที่อนุมัติแล้ว (ล่าสุด 20 รายการ) — สำหรับ Admin ใช้ยกเลิกอนุมัติ

**Response 200:** Array ของ leave requests ที่ status = `approved`

---

### GET /api/leave/department/{departmentId}

คำขอลาทั้งหมดในแผนก

**Query Parameters:**

| Parameter | ต้องมี | คำอธิบาย |
|---|---|---|
| status | ❌ | กรองตาม status (pending/approved/rejected/revoked) |

---

### PUT /api/leave/approve/{id}

อนุมัติการลา

**Request Body:**
```json
{ "approved_by": 2 }
```

**สิทธิ์:**
- พนักงานขอลา → Manager / Admin อนุมัติได้
- หัวหน้าแผนกขอลา → MD / Admin อนุมัติได้

**Response 200:**
```json
{ "message": "อนุมัติการลาสำเร็จ" }
```

**Response 403:**
```json
{ "error": "เฉพาะหัวหน้าแผนกหรือ Admin เท่านั้นที่อนุมัติได้" }
```

---

### PUT /api/leave/reject/{id}

ปฏิเสธการลา

**Request Body:**
```json
{ "approved_by": 2, "reject_reason": "ช่วงนี้งานเยอะ" }
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| approved_by | ✅ | ID ผู้ปฏิเสธ |
| reject_reason | ✅ | เหตุผลที่ปฏิเสธ |

**Response 200:**
```json
{ "message": "ปฏิเสธการลาสำเร็จ" }
```

---

### PUT /api/leave/revoke/{id}

ยกเลิกการอนุมัติ (เฉพาะ Admin / manager_admin)

**Request Body:**
```json
{ "revoked_by": 1, "reason": "พนักงานขอยกเลิก" }
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| revoked_by | ✅ | ID ผู้ยกเลิก (ต้องเป็น admin/manager_admin) |
| reason | ❌ | เหตุผล (ถ้าไม่ใส่จะเป็น "ยกเลิกการอนุมัติโดย Admin") |

**Response 200:**
```json
{ "message": "ยกเลิกการอนุมัติสำเร็จ — แจ้งพนักงานแล้ว" }
```

**Response 403:**
```json
{ "error": "เฉพาะ Admin เท่านั้นที่ยกเลิกการอนุมัติได้" }
```

> เมื่อยกเลิก: status จะเปลี่ยนเป็น `revoked` และพนักงานจะได้รับแจ้งเตือนทันที

---

## 4. Leave Types (ประเภทการลา)

### GET /api/leave/types

ดึงประเภทการลาทั้งหมด

**Response 200:**
```json
[
  { "id": 1, "name": "ลาป่วย", "max_days": 30, "description": "ลาป่วยตามกฎหมาย" },
  { "id": 2, "name": "ลากิจ", "max_days": 5, "description": "" },
  { "id": 3, "name": "ลาพักร้อน", "max_days": 0, "description": "กำหนดรายบุคคล" }
]
```

> `max_days = 0` หมายถึง กำหนดรายบุคคลในหน้า Leave Quotas

---

### POST /api/leave/types

เพิ่มประเภทการลาใหม่ (Admin only)

**Request Body:**
```json
{
  "name": "ลาบวช",
  "max_days": 15,
  "description": "ลาบวชได้สูงสุด 15 วัน/ปี"
}
```

**Response 200:**
```json
{ "id": 5, "message": "เพิ่มประเภทการลาสำเร็จ" }
```

**Response 400:**
```json
{ "error": "ชื่อประเภทการลาซ้ำ" }
```

---

### PUT /api/leave/types/{id}

แก้ไขประเภทการลา (Admin only)

**Request Body:**
```json
{ "name": "ลาบวช", "max_days": 20, "description": "แก้ไขแล้ว" }
```

---

### DELETE /api/leave/types/{id}

ลบประเภทการลา (Admin only)

**Response 400:**
```json
{ "error": "ไม่สามารถลบได้ เพราะมีการใช้งานอยู่" }
```

> ลบได้เฉพาะประเภทที่ไม่มีพนักงานใช้

---

## 5. Leave Quotas (โควต้าวันลา)

### GET /api/leave-quotas/{employeeId}

ดูโควต้าวันลาของพนักงาน

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| year | ❌ | 2026 | ปีที่ต้องการดู (default = ปีปัจจุบัน) |

**Response 200:**
```json
[
  {
    "leave_type_id": 1,
    "leave_type_name": "ลาป่วย",
    "default_max_days": 30,
    "custom_max_days": null,
    "quota_id": null,
    "effective_max_days": 30
  },
  {
    "leave_type_id": 3,
    "leave_type_name": "ลาพักร้อน",
    "default_max_days": 0,
    "custom_max_days": 10,
    "quota_id": 5,
    "effective_max_days": 10
  }
]
```

> `custom_max_days = null` → ใช้ค่า default
> `effective_max_days` = ค่าที่ใช้จริง (custom หรือ default)

---

### GET /api/leave-quotas/all/overview

ดูโควต้าของพนักงานทุกคน (Admin only)

**Query Parameters:**

| Parameter | ต้องมี | คำอธิบาย |
|---|---|---|
| year | ❌ | ปีที่ต้องการดู (default = ปีปัจจุบัน) |

**Response 200:**
```json
[
  {
    "id": 1,
    "employee_code": "EMP001",
    "first_name": "สมชาย",
    "last_name": "ใจดี",
    "department_name": "ฝ่ายบริหาร",
    "quotas": [
      {
        "leave_type_id": 1,
        "leave_type_name": "ลาป่วย",
        "default_max_days": 30,
        "custom_max_days": null,
        "effective_max_days": 30
      }
    ]
  }
]
```

---

### POST /api/leave-quotas

กำหนดโควต้าวันลาเฉพาะบุคคล (Admin only)

**Request Body:**
```json
{
  "employee_id": 3,
  "leave_type_id": 3,
  "max_days": 10,
  "year": 2026
}
```

**Response 200:**
```json
{ "message": "บันทึกโควต้าวันลาสำเร็จ" }
```

---

### POST /api/leave-quotas/bulk

กำหนดโควต้าทั้งหมดของพนักงานคนเดียว (Admin only)

**Request Body:**
```json
{
  "employee_id": 3,
  "year": 2026,
  "quotas": [
    { "leave_type_id": 1, "max_days": 30 },
    { "leave_type_id": 2, "max_days": 7 },
    { "leave_type_id": 3, "max_days": null }
  ]
}
```

> `max_days = null` → ลบ custom quota กลับไปใช้ค่าเริ่มต้น

---

### DELETE /api/leave-quotas/{employeeId}/{leaveTypeId}

ลบโควต้าเฉพาะบุคคล (กลับไปใช้ค่า default)

**Query Parameters:**

| Parameter | ต้องมี | คำอธิบาย |
|---|---|---|
| year | ❌ | ปี (default = ปีปัจจุบัน) |

**Response 200:**
```json
{ "message": "ลบโควต้าเฉพาะบุคคลสำเร็จ (ใช้ค่าเริ่มต้น)" }
```

---

## 6. Forgot Check-In (ลืม Check In)

### POST /api/forgot-checkin

ส่งคำขอบันทึกเวลาย้อนหลัง

**Request Body:**
```json
{
  "employee_id": 3,
  "date": "2026-05-14",
  "check_in": "08:30",
  "check_out": "17:30",
  "reason": "ลืมกดเช็คอิน มือถือแบตหมด"
}
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| employee_id | ✅ | ID พนักงาน |
| date | ✅ | วันที่ลืม Check In |
| check_in | ✅ | เวลาเข้างานจริง |
| check_out | ❌ | เวลาออกงาน (ถ้ามี) |
| reason | ✅ | เหตุผล |

**Response 200:**
```json
{ "id": 1, "message": "ส่งคำขอบันทึกเวลาย้อนหลังสำเร็จ" }
```

> ระบบจะแจ้งเตือนหัวหน้าแผนก (หรือ Admin ถ้าไม่มีหัวหน้า)

---

### GET /api/forgot-checkin/my/{employeeId}

คำขอบันทึกเวลาย้อนหลังของพนักงาน

**Response 200:**
```json
[
  {
    "id": 1,
    "employee_id": 3,
    "date": "2026-05-14",
    "check_in": "08:30",
    "check_out": "17:30",
    "reason": "ลืมกดเช็คอิน",
    "status": "approved",
    "approved_by": 2,
    "approved_at": "2026-05-15T09:00:00",
    "approver_name": "สมหญิง รักงาน",
    "created_at": "2026-05-15T08:00:00"
  }
]
```

---

### GET /api/forgot-checkin/pending/{departmentId}

คำขอที่รออนุมัติในแผนก (สำหรับ Manager)

---

### GET /api/forgot-checkin/pending-all

คำขอที่รออนุมัติทั้งหมด (สำหรับ Admin/MD)

---

### PUT /api/forgot-checkin/approve/{id}

อนุมัติคำขอบันทึกเวลาย้อนหลัง

**Request Body:**
```json
{ "approved_by": 2 }
```

**Response 200:**
```json
{ "message": "อนุมัติสำเร็จ — บันทึกเวลาเข้าระบบแล้ว" }
```

> เมื่ออนุมัติ: ระบบจะ insert/update ลงตาราง attendance ให้อัตโนมัติ

---

### PUT /api/forgot-checkin/reject/{id}

ปฏิเสธคำขอบันทึกเวลาย้อนหลัง

**Request Body:**
```json
{ "approved_by": 2, "reason": "ข้อมูลไม่ครบ" }
```

**Response 200:**
```json
{ "message": "ปฏิเสธคำขอสำเร็จ" }
```

---

## 7. Employees (พนักงาน)

### GET /api/employees

พนักงานทั้งหมด (Admin only)

**Response 200:**
```json
[
  {
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
]
```

---

### GET /api/employees/department/{departmentId}

พนักงานตามแผนก

---

### POST /api/employees

เพิ่มพนักงานใหม่ (Admin only)

**Request Body:**
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

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| employee_code | ✅ | รหัสพนักงาน (ห้ามซ้ำ, แก้ไขไม่ได้ภายหลัง) |
| first_name | ✅ | ชื่อ |
| last_name | ✅ | นามสกุล |
| email | ❌ | อีเมล |
| department_id | ✅ | ID แผนก |
| role | ❌ | บทบาท (default = employee) |

**Response 200:**
```json
{ "id": 6, "message": "เพิ่มพนักงานสำเร็จ" }
```

**Response 400:**
```json
{ "error": "รหัสพนักงานซ้ำ" }
```

> พนักงานใหม่จะมีรหัสผ่านเริ่มต้นเป็น "1234"

---

### PUT /api/employees/{id}

แก้ไขข้อมูลพนักงาน (Admin only)

**Request Body:**
```json
{
  "first_name": "ชื่อใหม่",
  "last_name": "นามสกุลใหม่",
  "email": "new@company.com",
  "department_id": 3,
  "role": "manager"
}
```

> ไม่สามารถแก้ไข `employee_code` ได้

---

### DELETE /api/employees/{id}

ลบพนักงาน (Admin only)

**Response 200:**
```json
{ "message": "ลบพนักงานสำเร็จ" }
```

**Response 400:**
```json
{ "error": "ไม่สามารถลบได้ เพราะมีประวัติการเข้างาน/ลาอยู่ ให้เปลี่ยนสถานะแทน" }
```

> ลบได้เฉพาะพนักงานที่ไม่มีประวัติ Check In หรือการลา

---

### PUT /api/employees/{id}/set-password

ตั้งรหัสผ่านใหม่ให้พนักงาน (Admin only)

**Request Body:**
```json
{ "new_password": "newpass123" }
```

> รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร

---

### PUT /api/employees/{id}/reset-password

รีเซ็ตรหัสผ่านเป็น "1234" (Admin only)

**Response 200:**
```json
{ "message": "รีเซ็ตรหัสผ่านเป็น 1234 สำเร็จ" }
```

---

### PUT /api/employees/{id}/change-password

เปลี่ยนรหัสผ่าน (พนักงานเปลี่ยนเอง)

**Request Body:**
```json
{
  "current_password": "1234",
  "new_password": "myNewPass"
}
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| current_password | ✅ | รหัสผ่านปัจจุบัน |
| new_password | ✅ | รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร) |

**Response 400:**
```json
{ "error": "รหัสผ่านปัจจุบันไม่ถูกต้อง" }
```

---

### PUT /api/employees/{id}/avatar

อัปโหลดรูปโปรไฟล์

**Request Body:**
```json
{ "avatar": "data:image/jpeg;base64,..." }
```

> รองรับ PNG, JPEG, GIF, WEBP (สูงสุด 2 MB)

**Response 200:**
```json
{ "message": "อัปโหลดรูปโปรไฟล์สำเร็จ", "avatar": "/uploads/avatars/avatar_3_1778660875014.jpg" }
```

---

### DELETE /api/employees/{id}/avatar

ลบรูปโปรไฟล์

**Response 200:**
```json
{ "message": "ลบรูปโปรไฟล์สำเร็จ" }
```

---

## 8. Departments (แผนก)

### GET /api/departments

แผนกทั้งหมด (พร้อมจำนวนพนักงาน)

**Response 200:**
```json
[
  { "id": 1, "name": "ฝ่ายบริหาร", "employee_count": 3 },
  { "id": 2, "name": "ฝ่ายไอที", "employee_count": 5 }
]
```

---

### POST /api/departments

เพิ่มแผนกใหม่ (Admin only)

**Request Body:**
```json
{ "name": "ฝ่ายขาย" }
```

**Response 200:**
```json
{ "message": "เพิ่มแผนกสำเร็จ" }
```

**Response 400:**
```json
{ "error": "ชื่อแผนกซ้ำ" }
```

---

### PUT /api/departments/{id}

แก้ไขชื่อแผนก (Admin only)

**Request Body:**
```json
{ "name": "ฝ่ายขายและการตลาด" }
```

---

### DELETE /api/departments/{id}

ลบแผนก (Admin only)

**Response 400:**
```json
{ "error": "ไม่สามารถลบได้ เพราะมีพนักงานอยู่ในแผนก" }
```

> ลบได้เฉพาะแผนกที่ไม่มีพนักงาน

---

## 9. Reports (รายงาน)

### GET /api/reports/attendance

รายงานการเข้างาน — รองรับ Export CSV/XLSX

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| employee_id | ❌ | 3 | กรองเฉพาะพนักงาน |
| department_id | ❌ | 2 | กรองเฉพาะแผนก |
| start_date | ❌ | 2026-05-01 | วันที่เริ่ม |
| end_date | ❌ | 2026-05-31 | วันที่สิ้นสุด |
| format | ❌ | csv / xlsx | Export เป็นไฟล์ (ถ้าไม่ใส่ = JSON) |

**ตัวอย่าง:**
```
GET /api/reports/attendance?department_id=2&start_date=2026-05-01&end_date=2026-05-31
GET /api/reports/attendance?department_id=2&format=xlsx
```

**Response 200 (JSON):**
```json
[
  {
    "date": "2026-05-15",
    "check_in": "08:25:30",
    "check_out": "17:35:00",
    "status": "present",
    "note": "",
    "location_checkin": "13.7563,100.5018,15",
    "location_checkout": "13.7565,100.5020,10",
    "employee_code": "EMP003",
    "first_name": "สมศักดิ์",
    "last_name": "มั่นคง",
    "department_name": "ฝ่ายไอที"
  }
]
```

**Response (CSV/XLSX):** ดาวน์โหลดไฟล์ พร้อมคอลัมน์:
วันที่, รหัสพนักงาน, ชื่อ, นามสกุล, แผนก, เวลาเข้า, เวลาออก, สถานะ, ตำแหน่งเข้า, ตำแหน่งออก, หมายเหตุ

---

### GET /api/reports/leave

รายงานการลา — รองรับ Export CSV/XLSX

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| employee_id | ❌ | 3 | กรองเฉพาะพนักงาน |
| department_id | ❌ | 2 | กรองเฉพาะแผนก |
| start_date | ❌ | 2026-05-01 | วันที่เริ่ม |
| end_date | ❌ | 2026-05-31 | วันที่สิ้นสุด |
| status | ❌ | approved | กรองตามสถานะ (pending/approved/rejected/revoked) |
| format | ❌ | csv / xlsx | Export เป็นไฟล์ |

**Response 200 (JSON):**
```json
[
  {
    "start_date": "2026-05-20",
    "end_date": "2026-05-21",
    "days": 2,
    "reason": "ไม่สบาย",
    "status": "approved",
    "reject_reason": null,
    "leave_type_name": "ลาป่วย",
    "employee_code": "EMP003",
    "first_name": "สมศักดิ์",
    "last_name": "มั่นคง",
    "department_name": "ฝ่ายไอที",
    "approver_name": "สมหญิง รักงาน",
    "created_at": "2026-05-18T08:00:00"
  }
]
```

---

### GET /api/reports/summary

สรุปรายเดือน — จำนวนวันทำงาน/สาย/ลา ต่อพนักงาน

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| department_id | ❌ | 2 | กรองเฉพาะแผนก |
| employee_id | ❌ | 3 | กรองเฉพาะพนักงาน |
| month | ❌ | 05 | เดือน (01-12, default = เดือนปัจจุบัน) |
| year | ❌ | 2026 | ปี (default = ปีปัจจุบัน) |
| format | ❌ | csv / xlsx | Export เป็นไฟล์ |

**Response 200 (JSON):**
```json
[
  {
    "employee_code": "EMP003",
    "first_name": "สมศักดิ์",
    "last_name": "มั่นคง",
    "department_name": "ฝ่ายไอที",
    "present_days": 20,
    "late_days": 3,
    "leave_days": 2
  }
]
```

> `late_days` = วันที่ Check In หลัง 09:00 น.

---

## 10. Notifications (แจ้งเตือน)

### GET /api/notifications/{employeeId}

แจ้งเตือนของพนักงาน

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| limit | ❌ | 20 | จำนวนรายการ (default = 20) |

**Response 200:**
```json
[
  {
    "id": 1,
    "employee_id": 3,
    "type": "leave_approved",
    "title": "✅ การลาได้รับอนุมัติ",
    "message": "ลาป่วย 2 วัน (2026-05-20 ถึง 2026-05-21) อนุมัติโดย สมหญิง รักงาน",
    "link": "/leave",
    "is_read": 0,
    "created_at": "2026-05-19T10:30:00"
  }
]
```

**ประเภทแจ้งเตือน (type):**

| Type | คำอธิบาย |
|---|---|
| `leave_request` | มีคำขอลาใหม่รออนุมัติ |
| `leave_sent` | ส่งคำขอลาสำเร็จ |
| `leave_approved` | การลาได้รับอนุมัติ |
| `leave_rejected` | การลาไม่ได้รับอนุมัติ |
| `leave_revoked` | การลาถูกยกเลิก |
| `forgot_checkin` | มีคำขอบันทึกเวลาย้อนหลัง |
| `forgot_checkin_approved` | อนุมัติบันทึกเวลาย้อนหลัง |
| `forgot_checkin_rejected` | ปฏิเสธบันทึกเวลาย้อนหลัง |
| `announcement` | มีประกาศใหม่ |

---

### GET /api/notifications/{employeeId}/unread-count

จำนวนแจ้งเตือนที่ยังไม่อ่าน

**Response 200:**
```json
{ "count": 3 }
```

---

### PUT /api/notifications/{id}/read

อ่านแจ้งเตือน (mark as read)

---

### PUT /api/notifications/read-all/{employeeId}

อ่านทั้งหมด (mark all as read)

**Response 200:**
```json
{ "message": "อ่านทั้งหมดแล้ว" }
```

---

## 11. Announcements (ประกาศ)

### GET /api/announcements

ประกาศทั้งหมดที่ active

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "ประกาศปิดบริษัทวันสงกรานต์",
    "content": "บริษัทปิดทำการวันที่ 13-15 เม.ย. 2569",
    "attachment": "/uploads/announcements/announce_1778577017377.pdf",
    "attachment_name": "ประกาศสงกรานต์.pdf",
    "is_active": 1,
    "created_by": 1,
    "first_name": "สมชาย",
    "last_name": "ใจดี",
    "employee_code": "EMP001",
    "created_at": "2026-04-01T09:00:00"
  }
]
```

---

### POST /api/announcements

สร้างประกาศใหม่ (Admin only)

**Request Body:**
```json
{
  "title": "หัวข้อประกาศ",
  "content": "เนื้อหาประกาศ",
  "attachment": "data:application/pdf;base64,...",
  "attachment_name": "ไฟล์แนบ.pdf",
  "created_by": 1
}
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| title | ✅ | หัวข้อ |
| content | ✅ | เนื้อหา |
| attachment | ❌ | ไฟล์แนบ base64 (PDF, Word, Excel, รูปภาพ สูงสุด 5 MB) |
| attachment_name | ❌ | ชื่อไฟล์แนบ |
| created_by | ✅ | ID ผู้สร้าง |

**Response 200:**
```json
{ "id": 2, "message": "สร้างประกาศสำเร็จ" }
```

> เมื่อสร้างประกาศ: ระบบจะแจ้งเตือนพนักงานทุกคนอัตโนมัติ

---

### DELETE /api/announcements/{id}

ลบประกาศ (Admin only)

**Response 200:**
```json
{ "message": "ลบประกาศสำเร็จ" }
```

> ไฟล์แนบจะถูกลบจาก server ด้วย

---

## 12. Settings (ตั้งค่า)

### GET /api/settings

ตั้งค่าบริษัททั้งหมด

**Response 200:**
```json
{
  "company_name": "บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด",
  "company_logo": "/uploads/logo_1778661000041.png",
  "work_start": "08:30",
  "work_end": "17:30",
  "break_start": "12:00",
  "break_end": "13:00"
}
```

---

### PUT /api/settings/{key}

อัปเดตค่าตั้งค่า (Admin only)

**Request Body:**
```json
{ "value": "ค่าใหม่" }
```

**Keys ที่ใช้ได้:**

| Key | คำอธิบาย | ตัวอย่าง |
|---|---|---|
| `company_name` | ชื่อบริษัท | "บริษัท ตัวอย่าง จำกัด" |
| `work_start` | เวลาเริ่มงาน | "08:30" |
| `work_end` | เวลาเลิกงาน | "17:30" |
| `break_start` | เวลาเริ่มพัก | "12:00" |
| `break_end` | เวลาพักเสร็จ | "13:00" |

**Response 200:**
```json
{ "message": "บันทึกการตั้งค่าสำเร็จ" }
```

---

### POST /api/settings/logo

อัปโหลดโลโก้บริษัท (Admin only)

**Request Body:**
```json
{ "logo": "data:image/png;base64,..." }
```

> รองรับ PNG, JPEG, GIF, SVG (สูงสุด 2 MB)

**Response 200:**
```json
{ "message": "อัปโหลดโลโก้สำเร็จ", "logo_url": "/uploads/logo_1778661000041.png" }
```

---

### DELETE /api/settings/logo

ลบโลโก้บริษัท (Admin only)

**Response 200:**
```json
{ "message": "ลบโลโก้สำเร็จ" }
```

---

## 13. Holidays (วันหยุด)

### GET /api/holidays

วันหยุดที่ Admin เพิ่มเอง (custom holidays)

**Response 200:**
```json
[
  {
    "id": 1,
    "date": "2026-05-31",
    "name": "วันวิสาขบูชา",
    "created_by": 1
  }
]
```

> วันหยุดคงที่ (เช่น วันปีใหม่, สงกรานต์) จะถูก generate ฝั่ง client ไม่ได้เก็บใน API นี้

---

### POST /api/holidays

เพิ่มวันหยุด (Admin only)

**Request Body:**
```json
{
  "date": "2026-05-31",
  "name": "วันวิสาขบูชา",
  "created_by": 1
}
```

| Field | ต้องมี | คำอธิบาย |
|---|---|---|
| date | ✅ | วันที่ (yyyy-mm-dd) |
| name | ✅ | ชื่อวันหยุด |
| created_by | ✅ | ID ผู้เพิ่ม |

**Response 200:**
```json
{ "id": 3, "message": "เพิ่มวันหยุดสำเร็จ" }
```

**Response 400:**
```json
{ "error": "วันที่นี้มีวันหยุดอยู่แล้ว" }
```

---

### PUT /api/holidays/{id}

แก้ไขวันหยุด (Admin only)

**Request Body:**
```json
{ "date": "2026-06-01", "name": "วันชดเชยวิสาขบูชา" }
```

---

### DELETE /api/holidays/{id}

ลบวันหยุด (Admin only)

**Response 200:**
```json
{ "message": "ลบวันหยุดสำเร็จ" }
```

---

## 14. External API (สำหรับ CRM)

API สำหรับระบบภายนอก (เช่น CRM) เชื่อมต่อดึงข้อมูล ต้องใช้ API Key

### Authentication

ส่ง API Key ผ่าน **header เท่านั้น** (ไม่รับ query string เพื่อความปลอดภัย):

```
Header:  X-API-Key: <your-api-key>
```

> ⚠️ ห้ามส่ง API Key ผ่าน URL query parameter — เพื่อป้องกัน key หลุดใน server logs

**Response 401 (key ไม่ถูกต้อง / ไม่ได้ส่ง):**
```json
{ "error": "Missing X-API-Key header" }
{ "error": "Invalid API Key" }
```

**Response 429 (เรียก API บ่อยเกินไป):**
```json
{ "error": "Too many requests. Try again later." }
```

> Rate limit: 100 requests/นาที ต่อ IP

**Response 503 (ยังไม่ได้ตั้ง API_KEY บน server):**
```json
{ "error": "External API is disabled. Set API_KEY environment variable." }
```

---

### GET /api/external/attendance

ดึงข้อมูลการเข้างาน

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| employee_id | ❌ | 3 | กรองเฉพาะพนักงาน |
| department_id | ❌ | 2 | กรองเฉพาะแผนก |
| start_date | ❌ | 2026-05-01 | วันที่เริ่ม |
| end_date | ❌ | 2026-05-31 | วันที่สิ้นสุด |

**ตัวอย่าง:**
```
GET /api/external/attendance?department_id=2&start_date=2026-05-01&end_date=2026-05-31

Header: X-API-Key: <your-api-key>
```

**Response 200:**
```json
[
  {
    "date": "2026-05-15",
    "check_in": "08:25:30",
    "check_out": "17:35:00",
    "status": "present",
    "location_checkin": "13.7563,100.5018,15",
    "location_checkout": "13.7565,100.5020,10",
    "employee_code": "EMP003",
    "first_name": "สมศักดิ์",
    "last_name": "มั่นคง",
    "department_name": "ฝ่ายไอที"
  }
]
```

---

### GET /api/external/leave

ดึงข้อมูลการลา

**Query Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| employee_id | ❌ | 3 | กรองเฉพาะพนักงาน |
| department_id | ❌ | 2 | กรองเฉพาะแผนก |
| start_date | ❌ | 2026-01-01 | วันที่เริ่ม |
| end_date | ❌ | 2026-12-31 | วันที่สิ้นสุด |
| status | ❌ | approved | กรองตามสถานะ |

**ตัวอย่าง:**
```
GET /api/external/leave?department_id=2&status=approved&start_date=2026-01-01&end_date=2026-12-31

Header: X-API-Key: <your-api-key>
```

**Response 200:**
```json
[
  {
    "start_date": "2026-05-20",
    "end_date": "2026-05-21",
    "days": 2,
    "reason": "ไม่สบาย",
    "status": "approved",
    "leave_type_name": "ลาป่วย",
    "employee_code": "EMP003",
    "first_name": "สมศักดิ์",
    "last_name": "มั่นคง",
    "department_name": "ฝ่ายไอที"
  }
]
```

---

## ตัวอย่างการเชื่อมต่อจาก CRM

### ดึงการลาที่อนุมัติแล้ว แสดงใน Calendar:

```javascript
const API_KEY = process.env.ATTENDANCE_API_KEY; // เก็บใน env ห้าม hardcode
const BASE_URL = 'https://checkin.serialfactoring.co.th';

const response = await fetch(
  `${BASE_URL}/api/external/leave?department_id=2&status=approved&start_date=2026-01-01&end_date=2026-12-31`,
  { headers: { 'X-API-Key': API_KEY } }
);
const leaves = await response.json();

// แปลงเป็น calendar events
const events = leaves.map(leave => ({
  title: `${leave.first_name} ${leave.last_name} - ${leave.leave_type_name}`,
  start: leave.start_date,
  end: leave.end_date,
  allDay: true,
  color: '#f59e0b'
}));
```

### ดึงข้อมูลเข้างานวันนี้ ของแผนก:

```javascript
const today = new Date().toISOString().split('T')[0];

const response = await fetch(
  `${BASE_URL}/api/external/attendance?department_id=2&start_date=${today}&end_date=${today}`,
  { headers: { 'X-API-Key': API_KEY } }
);
const attendance = await response.json();

// ตรวจใครมาสาย
const lateEmployees = attendance.filter(a => a.check_in > '08:30:00');
```

### ดึงสรุปรายเดือน (ผ่าน Internal API):

```javascript
const response = await fetch(
  `${BASE_URL}/api/reports/summary?department_id=2&month=05&year=2026`
);
const summary = await response.json();

// แสดงสรุป
summary.forEach(emp => {
  console.log(`${emp.first_name}: มา ${emp.present_days} วัน, สาย ${emp.late_days} วัน, ลา ${emp.leave_days} วัน`);
});
```

---

## ลำดับการอนุมัติ (Approval Flow)

```
┌─────────────────────────────────────────────────────────┐
│  พนักงาน (employee) ขอลา                                │
│     ↓                                                   │
│  มีหัวหน้าแผนก (manager/manager_admin)?                 │
│     │                                                   │
│     ├── ใช่ → หัวหน้าแผนก อนุมัติ/ปฏิเสธ                │
│     │                                                   │
│     └── ไม่มี → Admin/MD อนุมัติ/ปฏิเสธ                 │
├─────────────────────────────────────────────────────────┤
│  หัวหน้าแผนก (manager) ขอลา → MD/Admin อนุมัติ/ปฏิเสธ   │
├─────────────────────────────────────────────────────────┤
│  Admin ยกเลิกอนุมัติ (revoke) → แจ้งพนักงานทันที         │
└─────────────────────────────────────────────────────────┘
```

---

## Error Responses

ทุก endpoint จะส่ง error ในรูปแบบเดียวกัน:

```json
{ "error": "ข้อความอธิบายปัญหา" }
```

| HTTP Status | ความหมาย |
|---|---|
| 200 | สำเร็จ |
| 400 | ข้อมูลไม่ถูกต้อง / ไม่ผ่านเงื่อนไข |
| 401 | ไม่ได้เข้าสู่ระบบ / API Key ไม่ถูกต้อง |
| 403 | ไม่มีสิทธิ์ (role ไม่ตรง) |
| 404 | ไม่พบข้อมูล |
| 500 | Server error |

---

## ขนาดไฟล์ที่รองรับ

| ประเภท | ขนาดสูงสุด | รูปแบบที่รองรับ |
|---|---|---|
| รูป Check In | ~50 KB (ย่ออัตโนมัติ) | JPEG, PNG, WEBP |
| รูปโปรไฟล์ | 2 MB | PNG, JPEG, GIF, WEBP |
| โลโก้บริษัท | 2 MB | PNG, JPEG, GIF, SVG |
| ไฟล์แนบประกาศ | 5 MB | PDF, Word, Excel, รูปภาพ |
| Request body | 10 MB | JSON |

---

## สรุป Endpoints ทั้งหมด

| Method | Endpoint | คำอธิบาย | สิทธิ์ |
|---|---|---|---|
| POST | /api/auth/login | เข้าสู่ระบบ | ทุกคน |
| POST | /api/attendance/checkin | Check In | ทุกคน |
| POST | /api/attendance/checkout | Check Out | ทุกคน |
| GET | /api/attendance/today/{id} | สถานะวันนี้ | ทุกคน |
| GET | /api/attendance/history/{id} | ประวัติเข้างาน | ทุกคน |
| GET | /api/attendance/department/{id} | เข้างานทั้งแผนก | Manager+ |
| POST | /api/leave/request | ขอลา | ทุกคน |
| GET | /api/leave/my-requests/{id} | คำขอลาของตัวเอง | ทุกคน |
| GET | /api/leave/summary/{id} | สรุปวันลา | ทุกคน |
| GET | /api/leave/pending-for-manager/{deptId} | รออนุมัติในแผนก | Manager |
| GET | /api/leave/pending-all-employees | รออนุมัติทุกแผนก | Admin/MD |
| GET | /api/leave/pending-for-admin | รออนุมัติจากหัวหน้า | Admin/MD |
| GET | /api/leave/pending-no-manager | รออนุมัติ (ไม่มีหัวหน้า) | Admin |
| GET | /api/leave/recent-approved | อนุมัติแล้ว (ยกเลิกได้) | Admin |
| GET | /api/leave/department/{deptId} | คำขอลาทั้งแผนก | Manager+ |
| PUT | /api/leave/approve/{id} | อนุมัติ | Manager/Admin |
| PUT | /api/leave/reject/{id} | ปฏิเสธ | Manager/Admin |
| PUT | /api/leave/revoke/{id} | ยกเลิกอนุมัติ | Admin |
| GET | /api/leave/types | ประเภทการลา | ทุกคน |
| POST | /api/leave/types | เพิ่มประเภท | Admin |
| PUT | /api/leave/types/{id} | แก้ไขประเภท | Admin |
| DELETE | /api/leave/types/{id} | ลบประเภท | Admin |
| GET | /api/leave-quotas/{empId} | โควต้าพนักงาน | Admin |
| GET | /api/leave-quotas/all/overview | โควต้าทุกคน | Admin |
| POST | /api/leave-quotas | ตั้งโควต้า | Admin |
| POST | /api/leave-quotas/bulk | ตั้งโควต้าหลายรายการ | Admin |
| DELETE | /api/leave-quotas/{empId}/{typeId} | ลบโควต้า custom | Admin |
| POST | /api/forgot-checkin | ขอบันทึกย้อนหลัง | ทุกคน |
| GET | /api/forgot-checkin/my/{id} | คำขอของตัวเอง | ทุกคน |
| GET | /api/forgot-checkin/pending/{deptId} | รออนุมัติในแผนก | Manager |
| GET | /api/forgot-checkin/pending-all | รออนุมัติทั้งหมด | Admin/MD |
| PUT | /api/forgot-checkin/approve/{id} | อนุมัติ | Manager/Admin |
| PUT | /api/forgot-checkin/reject/{id} | ปฏิเสธ | Manager/Admin |
| GET | /api/employees | พนักงานทั้งหมด | Admin |
| GET | /api/employees/department/{deptId} | พนักงานตามแผนก | Admin |
| POST | /api/employees | เพิ่มพนักงาน | Admin |
| PUT | /api/employees/{id} | แก้ไขพนักงาน | Admin |
| DELETE | /api/employees/{id} | ลบพนักงาน | Admin |
| PUT | /api/employees/{id}/set-password | ตั้งรหัสผ่าน | Admin |
| PUT | /api/employees/{id}/reset-password | Reset เป็น 1234 | Admin |
| PUT | /api/employees/{id}/change-password | เปลี่ยนรหัสผ่าน | ทุกคน (ตัวเอง) |
| PUT | /api/employees/{id}/avatar | อัปโหลดรูป | ทุกคน (ตัวเอง) |
| DELETE | /api/employees/{id}/avatar | ลบรูป | ทุกคน (ตัวเอง) |
| GET | /api/departments | แผนกทั้งหมด | ทุกคน |
| POST | /api/departments | เพิ่มแผนก | Admin |
| PUT | /api/departments/{id} | แก้ไขแผนก | Admin |
| DELETE | /api/departments/{id} | ลบแผนก | Admin |
| GET | /api/reports/attendance | รายงานเข้างาน | Admin/Manager |
| GET | /api/reports/leave | รายงานการลา | Admin/Manager |
| GET | /api/reports/summary | สรุปรายเดือน | Admin/Manager |
| GET | /api/notifications/{id} | แจ้งเตือน | ทุกคน (ตัวเอง) |
| GET | /api/notifications/{id}/unread-count | จำนวนยังไม่อ่าน | ทุกคน (ตัวเอง) |
| PUT | /api/notifications/{id}/read | อ่านแจ้งเตือน | ทุกคน (ตัวเอง) |
| PUT | /api/notifications/read-all/{id} | อ่านทั้งหมด | ทุกคน (ตัวเอง) |
| GET | /api/announcements | ประกาศทั้งหมด | ทุกคน |
| POST | /api/announcements | สร้างประกาศ | Admin |
| DELETE | /api/announcements/{id} | ลบประกาศ | Admin |
| GET | /api/settings | ตั้งค่าบริษัท | ทุกคน |
| PUT | /api/settings/{key} | อัปเดตตั้งค่า | Admin |
| POST | /api/settings/logo | อัปโหลดโลโก้ | Admin |
| DELETE | /api/settings/logo | ลบโลโก้ | Admin |
| GET | /api/holidays | วันหยุด custom | ทุกคน |
| POST | /api/holidays | เพิ่มวันหยุด | Admin |
| PUT | /api/holidays/{id} | แก้ไขวันหยุด | Admin |
| DELETE | /api/holidays/{id} | ลบวันหยุด | Admin |
| GET | /api/external/attendance | ข้อมูลเข้างาน (CRM) | API Key |
| GET | /api/external/leave | ข้อมูลการลา (CRM) | API Key |

---

*API Reference ปรับปรุงล่าสุด: มิถุนายน 2026*
