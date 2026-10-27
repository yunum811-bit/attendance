import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';

const router = Router();

// คำนวณวันพักร้อนตามอายุงาน (ปีที่ทำงาน)
function calcVacationDays(startDate: string, targetYear: number): number {
  if (!startDate) return 6; // default ปีแรก
  const start = new Date(startDate);
  const yearEnd = new Date(targetYear, 11, 31); // 31 ธ.ค. ของปีที่คำนวณ
  const yearsWorked = Math.floor((yearEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  if (yearsWorked >= 5) return 12;
  if (yearsWorked >= 4) return 9;
  if (yearsWorked >= 3) return 8;
  if (yearsWorked >= 2) return 7;
  if (yearsWorked >= 1) return 6;
  return 6; // ยังไม่ครบ 1 ปี ได้ 6 วัน
}

// โควต้าคงที่ทุกปีสำหรับประเภทอื่น (ชื่อ → จำนวนวัน)
const FIXED_QUOTAS: Record<string, number> = {
  'ลาป่วย': 30,
  'ลากิจ': 5,
  'ลาคลอด': 120,
  'ลาเพื่อฌาปนกิจ': 3,
};

// GET /api/leave-carryover/preview?year=2027
// แสดงตัวอย่างว่าถ้าโอนจะได้เท่าไหร่
router.get('/preview', (req: Request, res: Response) => {
  const targetYear = Number(req.query.year) || new Date().getFullYear();
  const prevYear = targetYear - 1;

  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, 
           e.start_date, d.name as department_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE e.is_active = 1
    ORDER BY e.employee_code
  `);

  const leaveTypes = queryAll('SELECT * FROM leave_types ORDER BY id');
  const vacationType = leaveTypes.find((lt: any) => lt.name === 'ลาพักร้อน');

  const result = employees.map((emp: any) => {
    const vacationDays = calcVacationDays(emp.start_date, targetYear);

    // ดูวันพักร้อนที่ใช้ไปในปีก่อน
    let carryoverDays = 0;
    if (vacationType) {
      const prevQuota = queryOne(`
        SELECT COALESCE(elq.max_days, lt.max_days) as max_days
        FROM leave_types lt
        LEFT JOIN employee_leave_quotas elq 
          ON lt.id = elq.leave_type_id AND elq.employee_id = ? AND elq.year = ?
        WHERE lt.id = ?
      `, [emp.id, prevYear, vacationType.id]);

      const usedDays = queryOne(`
        SELECT COALESCE(SUM(lr.days), 0) as used
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = ? AND lt.name = 'ลาพักร้อน'
          AND lr.status = 'approved'
          AND strftime('%Y', lr.start_date) = ?
      `, [emp.id, String(prevYear)]);

      const prevMaxDays = prevQuota?.max_days ?? (vacationType as any).max_days;
      const usedVacation = usedDays?.used ?? 0;
      const remaining = prevMaxDays - usedVacation;
      carryoverDays = Math.min(Math.max(remaining, 0), 3); // ไม่เกิน 3 วัน
    }

    const quotas = leaveTypes.map((lt: any) => {
      let newDays = FIXED_QUOTAS[lt.name] ?? lt.max_days;
      if (lt.name === 'ลาพักร้อน') {
        newDays = vacationDays + carryoverDays;
      }
      return {
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        new_days: newDays,
        carryover: lt.name === 'ลาพักร้อน' ? carryoverDays : 0,
      };
    });

    return {
      ...emp,
      vacation_days: vacationDays,
      carryover_days: carryoverDays,
      quotas,
    };
  });

  res.json(result);
});

// POST /api/leave-carryover/run
// รันโอนวันลาจริง สำหรับปีที่กำหนด
router.post('/run', (req: Request, res: Response) => {
  const { target_year, admin_id } = req.body;
  const targetYear = Number(target_year) || new Date().getFullYear();
  const prevYear = targetYear - 1;

  if (!admin_id) {
    return res.status(400).json({ error: 'กรุณาระบุ admin_id' });
  }

  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.start_date
    FROM employees e
    WHERE e.is_active = 1
  `);

  const leaveTypes = queryAll('SELECT * FROM leave_types ORDER BY id');
  const vacationType = leaveTypes.find((lt: any) => lt.name === 'ลาพักร้อน');

  let updated = 0;

  for (const emp of employees as any[]) {
    const vacationDays = calcVacationDays(emp.start_date, targetYear);

    // คำนวณ carryover จากปีก่อน
    let carryoverDays = 0;
    if (vacationType) {
      const prevQuota = queryOne(`
        SELECT COALESCE(elq.max_days, lt.max_days) as max_days
        FROM leave_types lt
        LEFT JOIN employee_leave_quotas elq 
          ON lt.id = elq.leave_type_id AND elq.employee_id = ? AND elq.year = ?
        WHERE lt.id = ?
      `, [emp.id, prevYear, (vacationType as any).id]);

      const usedDays = queryOne(`
        SELECT COALESCE(SUM(lr.days), 0) as used
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = ? AND lt.name = 'ลาพักร้อน'
          AND lr.status = 'approved'
          AND strftime('%Y', lr.start_date) = ?
      `, [emp.id, String(prevYear)]);

      const prevMaxDays = prevQuota?.max_days ?? (vacationType as any).max_days;
      const usedVacation = (usedDays as any)?.used ?? 0;
      const remaining = prevMaxDays - usedVacation;
      carryoverDays = Math.min(Math.max(remaining, 0), 3);
    }

    // บันทึกโควต้าทุกประเภทสำหรับปีใหม่
    for (const lt of leaveTypes as any[]) {
      let newDays = FIXED_QUOTAS[lt.name] ?? lt.max_days;
      if (lt.name === 'ลาพักร้อน') {
        newDays = vacationDays + carryoverDays;
      }

      const existing = queryOne(`
        SELECT id FROM employee_leave_quotas 
        WHERE employee_id = ? AND leave_type_id = ? AND year = ?
      `, [emp.id, lt.id, targetYear]);

      if (existing) {
        execute(
          'UPDATE employee_leave_quotas SET max_days = ? WHERE id = ?',
          [newDays, existing.id]
        );
      } else {
        execute(
          'INSERT INTO employee_leave_quotas (employee_id, leave_type_id, max_days, year) VALUES (?, ?, ?, ?)',
          [emp.id, lt.id, newDays, targetYear]
        );
      }
    }
    updated++;
  }

  res.json({
    message: `โอนวันลาปี ${targetYear} สำเร็จ อัปเดต ${updated} คน`,
    updated,
    target_year: targetYear,
  });
});

// GET /api/leave-carryover/vacation-days/:employeeId?year=2027
// ดูวันพักร้อนของพนักงานคนเดียว
router.get('/vacation-days/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const targetYear = Number(req.query.year) || new Date().getFullYear();

  const emp = queryOne('SELECT start_date FROM employees WHERE id = ?', [Number(employeeId)]);
  if (!emp) return res.status(404).json({ error: 'ไม่พบพนักงาน' });

  const days = calcVacationDays(emp.start_date, targetYear);
  res.json({ employee_id: employeeId, year: targetYear, vacation_days: days });
});

export default router;
