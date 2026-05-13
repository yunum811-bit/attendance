import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';
import path from 'path';
import fs from 'fs';

const router = Router();

const photosDir = path.join(__dirname, '../../../public/uploads/photos');

function savePhoto(base64Data: string, employeeId: number, type: 'checkin' | 'checkout'): string {
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const matches = base64Data.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!matches) {
    throw new Error('รูปแบบรูปภาพไม่ถูกต้อง');
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = matches[2];
  const today = new Date().toISOString().split('T')[0];
  const filename = `${employeeId}_${today}_${type}_${Date.now()}.${ext}`;
  const filePath = path.join(photosDir, filename);

  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  return `/uploads/photos/${filename}`;
}

// Check In
router.post('/checkin', (req: Request, res: Response) => {
  const { employee_id, photo, location } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('th-TH', { hour12: false });

  // Require photo
  if (!photo) {
    return res.status(400).json({ error: 'กรุณาถ่ายรูปก่อน Check In' });
  }

  const existing = queryOne(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employee_id, today]
  );

  if (existing) {
    return res.status(400).json({ error: 'คุณได้ Check In วันนี้แล้ว' });
  }

  // Save photo
  let photoUrl = '';
  try {
    photoUrl = savePhoto(photo, employee_id, 'checkin');
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'ไม่สามารถบันทึกรูปภาพได้' });
  }

  const locationStr = location ? `${location.lat},${location.lng},${location.accuracy || 0}` : '';

  const { lastId } = execute(
    'INSERT INTO attendance (employee_id, date, check_in, photo_checkin, location_checkin, status) VALUES (?, ?, ?, ?, ?, ?)',
    [employee_id, today, now, photoUrl, locationStr, 'present']
  );

  res.json({ id: lastId, message: 'Check In สำเร็จ', time: now, photo: photoUrl });
});

// Check Out
router.post('/checkout', (req: Request, res: Response) => {
  const { employee_id, photo, location } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('th-TH', { hour12: false });

  // Require photo
  if (!photo) {
    return res.status(400).json({ error: 'กรุณาถ่ายรูปก่อน Check Out' });
  }

  const existing = queryOne(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employee_id, today]
  );

  if (!existing) {
    return res.status(400).json({ error: 'คุณยังไม่ได้ Check In วันนี้' });
  }

  if (existing.check_out) {
    return res.status(400).json({ error: 'คุณได้ Check Out วันนี้แล้ว' });
  }

  // Save photo
  let photoUrl = '';
  try {
    photoUrl = savePhoto(photo, employee_id, 'checkout');
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'ไม่สามารถบันทึกรูปภาพได้' });
  }

  const locationStr = location ? `${location.lat},${location.lng},${location.accuracy || 0}` : '';

  execute('UPDATE attendance SET check_out = ?, photo_checkout = ?, location_checkout = ? WHERE id = ?', [now, photoUrl, locationStr, existing.id]);

  res.json({ message: 'Check Out สำเร็จ', time: now, photo: photoUrl });
});

// Get today's attendance for an employee
router.get('/today/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const record = queryOne(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [Number(employeeId), today]
  );

  res.json(record || null);
});

// Get attendance history
router.get('/history/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { start_date, end_date } = req.query;

  let query = 'SELECT * FROM attendance WHERE employee_id = ?';
  const params: any[] = [Number(employeeId)];

  if (start_date) {
    query += ' AND date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY date DESC';

  const records = queryAll(query, params);
  res.json(records);
});

// Get all attendance for a department (for managers)
router.get('/department/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const records = queryAll(`
    SELECT a.*, e.first_name, e.last_name, e.employee_code
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE e.department_id = ? AND a.date = ?
    ORDER BY a.check_in
  `, [Number(departmentId), targetDate]);

  res.json(records);
});

export default router;
