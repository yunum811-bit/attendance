import { Router, Request, Response } from 'express';
import { queryAll, execute } from '../database';

const router = Router();

// Get all custom holidays
router.get('/', (req: Request, res: Response) => {
  const holidays = queryAll('SELECT * FROM custom_holidays ORDER BY date');
  res.json(holidays);
});

// Add custom holiday (Admin)
router.post('/', (req: Request, res: Response) => {
  const { date, name, created_by } = req.body;
  if (!date || !name) {
    return res.status(400).json({ error: 'กรุณาระบุวันที่และชื่อวันหยุด' });
  }
  try {
    const { lastId } = execute(
      'INSERT INTO custom_holidays (date, name, created_by) VALUES (?, ?, ?)',
      [date, name, created_by]
    );
    res.json({ id: lastId, message: 'เพิ่มวันหยุดสำเร็จ' });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'วันที่นี้มีวันหยุดอยู่แล้ว' });
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Update custom holiday
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, name } = req.body;
  execute('UPDATE custom_holidays SET date = ?, name = ? WHERE id = ?', [date, name, Number(id)]);
  res.json({ message: 'แก้ไขวันหยุดสำเร็จ' });
});

// Delete custom holiday
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  execute('DELETE FROM custom_holidays WHERE id = ?', [Number(id)]);
  res.json({ message: 'ลบวันหยุดสำเร็จ' });
});

export default router;
