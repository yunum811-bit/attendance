import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';

const router = Router();

// Get leave quotas for an employee (with defaults from leave_types)
router.get('/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const year = Number(req.query.year) || new Date().getFullYear();

  const quotas = queryAll(`
    SELECT lt.id as leave_type_id, lt.name as leave_type_name, lt.max_days as default_max_days,
           elq.max_days as custom_max_days, elq.id as quota_id,
           COALESCE(elq.max_days, lt.max_days) as effective_max_days
    FROM leave_types lt
    LEFT JOIN employee_leave_quotas elq 
      ON lt.id = elq.leave_type_id 
      AND elq.employee_id = ? 
      AND elq.year = ?
    ORDER BY lt.id
  `, [Number(employeeId), year]);

  res.json(quotas);
});

// Get all employees with their quotas (for admin overview)
router.get('/all/overview', (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name as department_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    ORDER BY e.employee_code
  `);

  const leaveTypes = queryAll('SELECT * FROM leave_types ORDER BY id');

  const result = employees.map((emp: any) => {
    const quotas = leaveTypes.map((lt: any) => {
      const custom = queryOne(`
        SELECT max_days FROM employee_leave_quotas 
        WHERE employee_id = ? AND leave_type_id = ? AND year = ?
      `, [emp.id, lt.id, year]);

      return {
        leave_type_id: lt.id,
        leave_type_name: lt.name,
        default_max_days: lt.max_days,
        custom_max_days: custom?.max_days ?? null,
        effective_max_days: custom?.max_days ?? lt.max_days,
      };
    });

    return { ...emp, quotas };
  });

  res.json(result);
});

// Set leave quota for an employee
router.post('/', (req: Request, res: Response) => {
  const { employee_id, leave_type_id, max_days, year } = req.body;
  const targetYear = year || new Date().getFullYear();

  // Check if quota already exists
  const existing = queryOne(`
    SELECT id FROM employee_leave_quotas 
    WHERE employee_id = ? AND leave_type_id = ? AND year = ?
  `, [employee_id, leave_type_id, targetYear]);

  if (existing) {
    execute(`
      UPDATE employee_leave_quotas SET max_days = ? WHERE id = ?
    `, [max_days, existing.id]);
  } else {
    execute(`
      INSERT INTO employee_leave_quotas (employee_id, leave_type_id, max_days, year)
      VALUES (?, ?, ?, ?)
    `, [employee_id, leave_type_id, max_days, targetYear]);
  }

  res.json({ message: 'บันทึกโควต้าวันลาสำเร็จ' });
});

// Bulk set quotas for an employee
router.post('/bulk', (req: Request, res: Response) => {
  const { employee_id, quotas, year } = req.body;
  const targetYear = year || new Date().getFullYear();

  for (const quota of quotas) {
    const existing = queryOne(`
      SELECT id FROM employee_leave_quotas 
      WHERE employee_id = ? AND leave_type_id = ? AND year = ?
    `, [employee_id, quota.leave_type_id, targetYear]);

    if (quota.max_days === null || quota.max_days === undefined) {
      // Remove custom quota, revert to default
      if (existing) {
        execute('DELETE FROM employee_leave_quotas WHERE id = ?', [existing.id]);
      }
    } else if (existing) {
      execute('UPDATE employee_leave_quotas SET max_days = ? WHERE id = ?', [quota.max_days, existing.id]);
    } else {
      execute(`
        INSERT INTO employee_leave_quotas (employee_id, leave_type_id, max_days, year)
        VALUES (?, ?, ?, ?)
      `, [employee_id, quota.leave_type_id, quota.max_days, targetYear]);
    }
  }

  res.json({ message: 'บันทึกโควต้าวันลาทั้งหมดสำเร็จ' });
});

// Delete custom quota (revert to default)
router.delete('/:employeeId/:leaveTypeId', (req: Request, res: Response) => {
  const { employeeId, leaveTypeId } = req.params;
  const year = Number(req.query.year) || new Date().getFullYear();

  execute(`
    DELETE FROM employee_leave_quotas 
    WHERE employee_id = ? AND leave_type_id = ? AND year = ?
  `, [Number(employeeId), Number(leaveTypeId), year]);

  res.json({ message: 'ลบโควต้าเฉพาะบุคคลสำเร็จ (ใช้ค่าเริ่มต้น)' });
});

export default router;
