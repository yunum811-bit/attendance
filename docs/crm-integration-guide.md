# คู่มือการเชื่อมต่อ API — ระบบ Attendance

## บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

**เอกสารฉบับนี้จัดทำสำหรับ:** ทีมพัฒนา CRM / ระบบภายนอกที่ต้องการดึงข้อมูลการเข้างานและการลา  
**วันที่ออกเอกสาร:** 19 มิถุนายน 2026  
**เวอร์ชัน:** 2.0  
**ผู้ดูแล API:** ฝ่ายไอที — บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

---

## 1. ข้อมูลการเชื่อมต่อ

| รายการ | ค่า |
|---|---|
| Base URL | `https://checkin.serialfactoring.co.th` |
| Protocol | HTTPS (TLS 1.2+) |
| Authentication | API Key ผ่าน Header |
| Header Name | `X-API-Key` |
| Content-Type | `application/json` |
| Rate Limit | 100 requests / นาที / IP |
| Timezone | Asia/Bangkok (UTC+7) |

---

## 2. API Key

```
36e51698ae0c14a855ba1d99d3976886f2bc9b4ad283529f3959da3784d1d688
```

> ⚠️ **ข้อควรปฏิบัติ:**
> - เก็บ API Key ไว้ใน environment variable หรือ secret manager เท่านั้น
> - ห้าม hardcode ลงในซอร์สโค้ดหรือ commit ลง repository
> - ห้ามส่ง key ผ่าน URL query parameter
> - หาก key รั่วไหล ให้แจ้งผู้ดูแลระบบเพื่อออก key ใหม่ทันที

---

## 3. วิธีเรียก API

ทุก request ต้องแนบ header `X-API-Key`:

```http
GET /api/external/attendance?start_date=2026-06-01&end_date=2026-06-30 HTTP/1.1
Host: checkin.serialfactoring.co.th
X-API-Key: 36e51698ae0c14a855ba1d99d3976886f2bc9b4ad283529f3959da3784d1d688
```

---

## 4. Endpoints

### 4.1 ดึงข้อมูลการเข้างาน

```
GET /api/external/attendance
```

**Parameters:**

| Parameter | ประเภท | จำเป็น | คำอธิบาย | ตัวอย่าง |
|---|---|---|---|---|
| department_id | integer | ไม่ | กรองตามแผนก | 2 |
| employee_id | integer | ไม่ | กรองตามพนักงาน | 5 |
| start_date | string | ไม่ | วันที่เริ่ม (yyyy-mm-dd) | 2026-06-01 |
| end_date | string | ไม่ | วันที่สิ้นสุด (yyyy-mm-dd) | 2026-06-30 |

**ตัวอย่าง cURL:**
```bash
curl -H "X-API-Key: 36e51698ae0c14a855ba1d99d3976886f2bc9b4ad283529f3959da3784d1d688" \
  "https://checkin.serialfactoring.co.th/api/external/attendance?department_id=2&start_date=2026-06-01&end_date=2026-06-30"
```

**Response (HTTP 200):**
```json
[
  {
    "date": "2026-06-19",
    "check_in": "08:27:41",
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

**คำอธิบาย Fields:**

| Field | คำอธิบาย |
|---|---|
| date | วันที่ (yyyy-mm-dd) |
| check_in | เวลาเข้างาน (HH:mm:ss) หรือ null |
| check_out | เวลาออกงาน (HH:mm:ss) หรือ null |
| status | สถานะ: `present` = มาทำงาน |
| location_checkin | พิกัด GPS เข้างาน (lat,lng,accuracy) |
| location_checkout | พิกัด GPS ออกงาน (lat,lng,accuracy) |
| employee_code | รหัสพนักงาน |
| first_name | ชื่อ |
| last_name | นามสกุล |
| department_name | ชื่อแผนก |

---

### 4.2 ดึงข้อมูลการลา

```
GET /api/external/leave
```

**Parameters:**

| Parameter | ประเภท | จำเป็น | คำอธิบาย | ตัวอย่าง |
|---|---|---|---|---|
| department_id | integer | ไม่ | กรองตามแผนก | 2 |
| employee_id | integer | ไม่ | กรองตามพนักงาน | 5 |
| start_date | string | ไม่ | วันที่เริ่มลา >= (yyyy-mm-dd) | 2026-01-01 |
| end_date | string | ไม่ | วันที่สิ้นสุดลา <= (yyyy-mm-dd) | 2026-12-31 |
| status | string | ไม่ | กรองตามสถานะ | approved |

**ค่า status ที่เป็นไปได้:**

| ค่า | ความหมาย |
|---|---|
| `pending` | รออนุมัติ |
| `approved` | อนุมัติแล้ว |
| `rejected` | ไม่อนุมัติ |
| `revoked` | ถูกยกเลิกการอนุมัติ |

**ตัวอย่าง cURL:**
```bash
curl -H "X-API-Key: 36e51698ae0c14a855ba1d99d3976886f2bc9b4ad283529f3959da3784d1d688" \
  "https://checkin.serialfactoring.co.th/api/external/leave?status=approved&start_date=2026-01-01&end_date=2026-12-31"
```

**Response (HTTP 200):**
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

**คำอธิบาย Fields:**

| Field | คำอธิบาย |
|---|---|
| start_date | วันที่เริ่มลา (yyyy-mm-dd) |
| end_date | วันที่สิ้นสุดลา (yyyy-mm-dd) |
| days | จำนวนวัน (รองรับทศนิยม เช่น 0.5 = ครึ่งวัน) |
| reason | เหตุผลการลา |
| status | สถานะ |
| leave_type_name | ประเภทการลา (เช่น ลาป่วย, ลากิจ, ลาพักร้อน) |
| employee_code | รหัสพนักงาน |
| first_name | ชื่อ |
| last_name | นามสกุล |
| department_name | ชื่อแผนก |

---

## 5. Error Responses

| HTTP Status | Response | สาเหตุ |
|---|---|---|
| 401 | `{"error": "Invalid API Key"}` | API Key ไม่ถูกต้องหรือไม่ได้ส่ง |
| 429 | `{"error": "Too many requests. Try again later."}` | เกิน rate limit (100 req/นาที) |
| 503 | `{"error": "External API is disabled."}` | Server ยังไม่ได้ตั้ง API Key |

---

## 6. ตัวอย่างโค้ด

### JavaScript (Node.js / Frontend)

```javascript
const API_KEY = process.env.ATTENDANCE_API_KEY;
const BASE_URL = 'https://checkin.serialfactoring.co.th';

// ดึงข้อมูลเข้างานวันนี้
async function getTodayAttendance(departmentId) {
  const today = new Date().toISOString().split('T')[0];
  
  const response = await fetch(
    `${BASE_URL}/api/external/attendance?department_id=${departmentId}&start_date=${today}&end_date=${today}`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

// ดึงการลาที่อนุมัติแล้วทั้งปี
async function getApprovedLeaves(year) {
  const response = await fetch(
    `${BASE_URL}/api/external/leave?status=approved&start_date=${year}-01-01&end_date=${year}-12-31`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}
```

### Python

```python
import requests
import os

API_KEY = os.environ['ATTENDANCE_API_KEY']
BASE_URL = 'https://checkin.serialfactoring.co.th'
HEADERS = {'X-API-Key': API_KEY}

# ดึงข้อมูลเข้างาน
def get_attendance(start_date, end_date, department_id=None):
    params = {'start_date': start_date, 'end_date': end_date}
    if department_id:
        params['department_id'] = department_id
    
    response = requests.get(
        f'{BASE_URL}/api/external/attendance',
        headers=HEADERS,
        params=params
    )
    response.raise_for_status()
    return response.json()

# ดึงการลาที่อนุมัติแล้ว
def get_approved_leaves(start_date, end_date):
    response = requests.get(
        f'{BASE_URL}/api/external/leave',
        headers=HEADERS,
        params={
            'status': 'approved',
            'start_date': start_date,
            'end_date': end_date
        }
    )
    response.raise_for_status()
    return response.json()
```

### C# (.NET)

```csharp
using System.Net.Http;
using System.Net.Http.Headers;

var client = new HttpClient();
client.BaseAddress = new Uri("https://checkin.serialfactoring.co.th");
client.DefaultRequestHeaders.Add("X-API-Key", Environment.GetEnvironmentVariable("ATTENDANCE_API_KEY"));

// ดึงข้อมูลเข้างาน
var response = await client.GetAsync("/api/external/attendance?start_date=2026-06-01&end_date=2026-06-30");
var json = await response.Content.ReadAsStringAsync();
```

---

## 7. Use Cases สำหรับ CRM

### 7.1 แสดงปฏิทินการลาในหน้า CRM

```javascript
// ดึงการลาที่อนุมัติ แปลงเป็น calendar events
const leaves = await getApprovedLeaves(2026);

const calendarEvents = leaves.map(leave => ({
  title: `${leave.first_name} ${leave.last_name} - ${leave.leave_type_name}`,
  start: leave.start_date,
  end: leave.end_date,
  allDay: true,
  color: leave.leave_type_name === 'ลาป่วย' ? '#ef4444' : '#f59e0b'
}));
```

### 7.2 ตรวจสอบพนักงานที่มาสาย

```javascript
const attendance = await getTodayAttendance();

const lateEmployees = attendance.filter(a => a.check_in > '08:30:00');
const notCheckedIn = /* เทียบกับรายชื่อพนักงานทั้งหมด */;

console.log(`มาสาย: ${lateEmployees.length} คน`);
```

### 7.3 สรุปสถิติรายเดือน

```javascript
const monthData = await fetch(
  `${BASE_URL}/api/external/attendance?department_id=2&start_date=2026-06-01&end_date=2026-06-30`,
  { headers: { 'X-API-Key': API_KEY } }
).then(r => r.json());

// นับจำนวนวันทำงานต่อคน
const summary = {};
monthData.forEach(record => {
  const name = `${record.first_name} ${record.last_name}`;
  if (!summary[name]) summary[name] = { present: 0, late: 0 };
  summary[name].present++;
  if (record.check_in > '08:30:00') summary[name].late++;
});
```

---

## 8. ข้อจำกัดและหมายเหตุ

| หัวข้อ | รายละเอียด |
|---|---|
| Rate Limit | 100 requests/นาที/IP — ถ้าเกินจะได้ 429 |
| ข้อมูลที่ดึงได้ | เฉพาะข้อมูลเข้างานและการลา (read-only) |
| การเขียนข้อมูล | ไม่รองรับ — ต้องทำผ่านหน้า Web เท่านั้น |
| รูปแบบวันที่ | `yyyy-mm-dd` (เช่น 2026-06-19) |
| รูปแบบเวลา | `HH:mm:ss` (เช่น 08:30:00) |
| Timezone | Asia/Bangkok — เวลาที่ return เป็นเวลาไทย |
| Pagination | ไม่มี — ส่งข้อมูลทั้งหมดตาม filter |
| ข้อมูลรูปภาพ | ไม่รวมอยู่ใน External API |

---

## 9. การติดต่อ

หากมีปัญหาในการเชื่อมต่อหรือต้องการ:
- ขอ API Key ใหม่ (กรณี key รั่วไหล)
- เพิ่ม endpoint / field ใหม่
- เพิ่ม rate limit

กรุณาติดต่อ:  
**ฝ่ายไอที — บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด**

---

*เอกสารฉบับนี้เป็นความลับ ห้ามเผยแพร่ภายนอกโดยไม่ได้รับอนุญาต*
