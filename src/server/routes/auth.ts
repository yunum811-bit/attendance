import { Router, Request, Response } from 'express';
import { queryOne } from '../database';

const router = Router();

// Login
router.post('/login', (req: Request, res: Response) => {
  const { employee_code, password } = req.body;

  const employee = queryOne(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email,
           e.department_id, e.role, e.avatar, d.name as department_name
    FROM employees e 
    JOIN departments d ON e.department_id = d.id 
    WHERE e.employee_code = ? AND e.password = ? AND e.is_active = 1
  `, [employee_code, password]);

  if (!employee) {
    // เช็คว่าพนักงานถูกปิดใช้งานหรือรหัสผิด
    const inactive = queryOne(
      `SELECT id FROM employees WHERE employee_code = ? AND is_active = 0`,
      [employee_code]
    );
    if (inactive) {
      return res.status(401).json({ error: 'บัญชีนี้ถูกปิดใช้งานแล้ว กรุณาติดต่อผู้ดูแลระบบ' });
    }
    return res.status(401).json({ error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' });
  }

  res.json({ employee });
});

export default router;
