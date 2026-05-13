import { Router, Request, Response } from 'express';
import { queryAll, execute } from '../database';

const router = Router();

// Get all departments
router.get('/', (req: Request, res: Response) => {
  const departments = queryAll(`
    SELECT d.*, COUNT(e.id) as employee_count
    FROM departments d
    LEFT JOIN employees e ON d.id = e.department_id
    GROUP BY d.id
    ORDER BY d.name
  `);

  res.json(departments);
});

// Create department
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;

  try {
    const { lastId } = execute('INSERT INTO departments (name) VALUES (?)', [name]);
    res.json({ id: lastId, message: 'เพิ่มแผนกสำเร็จ' });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'ชื่อแผนกซ้ำ' });
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
