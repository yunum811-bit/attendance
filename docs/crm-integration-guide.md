# คู่มือเชื่อมต่อ API กับระบบ CRM

## ระบบ Check In/Out — บริษัท ซีเรียลแฟคตอริ่ง (ประเทศไทย) จำกัด

---

## 1. ข้อมูลการเชื่อมต่อ (ส่งให้ทีม CRM)

| รายการ | ค่า |
|---|---|
| **Base URL** | `https://checkin.serialfactoring.co.th/api/external` |
| **API Key** | `sf-crm-2026-a8f3k9x2m5p7` |
| **วิธีส่ง Key** | Header: `x-api-key: sf-crm-2026-a8f3k9x2m5p7` |
| **วิธีส่ง Key (ทางเลือก)** | Query: `?api_key=sf-crm-2026-a8f3k9x2m5p7` |
| **Format** | JSON |
| **Protocol** | HTTPS |
| **Method** | GET |

---

## 2. Endpoints ที่ให้ CRM ใช้

### 2.1 ดึงข้อมูลเข้า-ออกงาน

```
GET /api/external/attendance
```

**Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| api_key | ✅ (ถ้าไม่ส่งผ่าน Header) | sf-crm-2026-a8f3k9x2m5p7 | API Key |
| department_id | ไม่ | 2 | กรองตามแผนก |
| employee_id | ไม่ | 3 | กรองเฉพาะพนักงาน |
| start_date | ไม่ | 2026-05-01 | วันที่เริ่ม (yyyy-mm-dd) |
| end_date | ไม่ | 2026-05-31 | วันที่สิ้นสุด |

**ตัวอย่างเรียก:**
```
GET https://checkin.serialfactoring.co.th/api/external/attendance?api_key=sf-crm-2026-a8f3k9x2m5p7&department_id=2&start_date=2026-05-01&end_date=2026-05-31
```

**Response:**
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

### 2.2 ดึงข้อมูลการลา

```
GET /api/external/leave
```

**Parameters:**

| Parameter | ต้องมี | ตัวอย่าง | คำอธิบาย |
|---|---|---|---|
| api_key | ✅ (ถ้าไม่ส่งผ่าน Header) | sf-crm-2026-a8f3k9x2m5p7 | API Key |
| department_id | ไม่ | 2 | กรองตามแผนก |
| employee_id | ไม่ | 3 | กรองเฉพาะพนักงาน |
| start_date | ไม่ | 2026-05-01 | วันที่เริ่ม |
| end_date | ไม่ | 2026-05-31 | วันที่สิ้นสุด |
| status | ไม่ | approved | กรองตามสถานะ |

**ค่า status ที่ใช้ได้:**
- `pending` — รออนุมัติ
- `approved` — อนุมัติแล้ว
- `rejected` — ไม่อนุมัติ
- `revoked` — ยกเลิกการอนุมัติ

**ตัวอย่างเรียก (การลาที่อนุมัติแล้ว):**
```
GET https://checkin.serialfactoring.co.th/api/external/leave?api_key=sf-crm-2026-a8f3k9x2m5p7&status=approved&start_date=2026-01-01&end_date=2026-12-31
```

**Response:**
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

## 3. รหัสแผนก (Department ID)

| ID | ชื่อแผนก |
|---|---|
| 1 | ฝ่ายบริหาร |
| 2 | ฝ่ายไอที |
| 3 | ฝ่ายบัญชี |
| 4 | ฝ่ายการตลาด |
| 5 | ฝ่ายบุคคล |

> ดูแผนกทั้งหมด: `GET /api/departments` (ไม่ต้องใช้ API Key)

---

## 4. ตัวอย่างโค้ดสำหรับ CRM

### JavaScript/Node.js:

```javascript
const API_URL = 'https://checkin.serialfactoring.co.th/api/external';
const API_KEY = 'sf-crm-2026-a8f3k9x2m5p7';

// ดึงการลาที่อนุมัติแล้ว
async function getApprovedLeaves(departmentId, startDate, endDate) {
  const res = await fetch(
    `${API_URL}/leave?department_id=${departmentId}&status=approved&start_date=${startDate}&end_date=${endDate}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return await res.json();
}

// ดึงข้อมูลเข้างาน
async function getAttendance(departmentId, startDate, endDate) {
  const res = await fetch(
    `${API_URL}/attendance?department_id=${departmentId}&start_date=${startDate}&end_date=${endDate}`,
    { headers: { 'x-api-key': API_KEY } }
  );
  return await res.json();
}

// แปลงเป็น Calendar Events
async function getCalendarEvents(departmentId, month, year) {
  const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
  const endDate = `${year}-${String(month).padStart(2,'0')}-31`;

  const [attendance, leaves] = await Promise.all([
    getAttendance(departmentId, startDate, endDate),
    getApprovedLeaves(departmentId, startDate, endDate),
  ]);

  const events = [];

  // เพิ่ม attendance events
  attendance.forEach(item => {
    events.push({
      title: `${item.first_name} ${item.last_name} (${item.check_in} - ${item.check_out || '?'})`,
      date: item.date,
      type: 'attendance',
      color: item.check_in > '08:30:00' ? 'red' : 'green',
    });
  });

  // เพิ่ม leave events
  leaves.forEach(item => {
    events.push({
      title: `${item.first_name} - ${item.leave_type_name} (${item.days} วัน)`,
      start: item.start_date,
      end: item.end_date,
      type: 'leave',
      color: 'orange',
    });
  });

  return events;
}
```

### Python:

```python
import requests

API_URL = 'https://checkin.serialfactoring.co.th/api/external'
API_KEY = 'sf-crm-2026-a8f3k9x2m5p7'

headers = {'x-api-key': API_KEY}

# ดึงการลา
def get_leaves(department_id, start_date, end_date, status='approved'):
    params = {
        'department_id': department_id,
        'start_date': start_date,
        'end_date': end_date,
        'status': status
    }
    response = requests.get(f'{API_URL}/leave', headers=headers, params=params)
    return response.json()

# ดึงการเข้างาน
def get_attendance(department_id, start_date, end_date):
    params = {
        'department_id': department_id,
        'start_date': start_date,
        'end_date': end_date
    }
    response = requests.get(f'{API_URL}/attendance', headers=headers, params=params)
    return response.json()

# ตัวอย่าง
leaves = get_leaves(2, '2026-05-01', '2026-05-31')
for leave in leaves:
    print(f"{leave['first_name']} - {leave['leave_type_name']} ({leave['start_date']} ถึง {leave['end_date']})")
```

### cURL (ทดสอบ):

```bash
curl -H "x-api-key: sf-crm-2026-a8f3k9x2m5p7" \
  "https://checkin.serialfactoring.co.th/api/external/leave?status=approved&department_id=2"
```

---

## 5. Error Responses

| HTTP Status | ความหมาย | Response |
|---|---|---|
| 200 | สำเร็จ | `[{...}, {...}]` |
| 401 | API Key ผิดหรือไม่มี | `{"error": "Invalid API Key"}` |
| 500 | Server error | `{"error": "..."}` |

---

## 6. สิ่งที่ฝั่งเราเตรียมไว้แล้ว

| รายการ | สถานะ |
|---|---|
| ✅ API Endpoint พร้อมใช้ | `/api/external/attendance` + `/api/external/leave` |
| ✅ API Key | `sf-crm-2026-a8f3k9x2m5p7` |
| ✅ HTTPS (SSL) | ปลอดภัย |
| ✅ CORS เปิด | CRM เรียกจาก domain อื่นได้ |
| ✅ กรองตามแผนก/พนักงาน/วันที่/สถานะ | ครบ |
| ✅ Response เป็น JSON | พร้อมใช้ |

---

## 7. สิ่งที่ต้องแจ้งทีม CRM

ส่งข้อมูลนี้ให้ทีม CRM:

```
=== API สำหรับเชื่อมต่อ CRM ===

Base URL: https://checkin.serialfactoring.co.th/api/external
API Key: sf-crm-2026-a8f3k9x2m5p7
ส่ง Key ผ่าน Header: x-api-key

Endpoints:
- GET /attendance — ข้อมูลเข้า-ออกงาน
- GET /leave — ข้อมูลการลา

Parameters: department_id, employee_id, start_date, end_date, status

ทดสอบ (เปิด Browser):
https://checkin.serialfactoring.co.th/api/external/leave?api_key=sf-crm-2026-a8f3k9x2m5p7&status=approved

เอกสารเต็ม: [แนบไฟล์นี้]
```

---

## 8. สิ่งที่ต้องถาม CRM กลับ

1. ต้องการข้อมูลของแผนกไหน? (หรือทุกแผนก)
2. ดึงข้อมูลบ่อยแค่ไหน? (real-time / ทุกชั่วโมง / วันละครั้ง)
3. ต้องการ field เพิ่มเติมไหม?
4. CRM ใช้ภาษาอะไร? (JavaScript/Python/PHP/อื่นๆ)
5. ต้องการ Webhook ไหม? (ส่งข้อมูลไป CRM ทันทีเมื่อมีเหตุการณ์)

---

## 9. การเปลี่ยน API Key

SSH เข้า Lightsail:
```bash
pm2 delete attendance
cd /var/www/attendance
API_KEY="key-ใหม่-ที่ต้องการ" pm2 start "npx tsx src/server/index.ts" --name attendance
pm2 save
```

---

## 10. ความปลอดภัย

| มาตรการ | สถานะ |
|---|---|
| HTTPS | ✅ ข้อมูลเข้ารหัส |
| API Key | ✅ ต้องมี key ถึงเข้าถึงได้ |
| ไม่มีข้อมูลรหัสผ่าน | ✅ API ไม่ส่งรหัสผ่านออกไป |
| กรองตามแผนก | ✅ ดึงเฉพาะที่ต้องการ |

---

*คู่มือนี้ปรับปรุงล่าสุด: พฤษภาคม 2026*
