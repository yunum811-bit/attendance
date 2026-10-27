import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, uploadsDir } from '../database';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get all employees
router.get('/', (req: Request, res: Response) => {
  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, 
           e.department_id, e.role, e.avatar, e.start_date, e.is_active,
           d.name as department_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    ORDER BY e.is_active DESC, e.employee_code
  `);
  res.json(employees);
});

// Get employees by department
router.get('/department/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, 
           e.department_id, e.role, e.avatar, e.start_date, e.is_active,
           d.name as department_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE e.department_id = ? AND e.is_active = 1
    ORDER BY e.employee_code
  `, [Number(departmentId)]);
  res.json(employees);
});

// Create employee
router.post('/', (req: Request, res: Response) => {
  const { employee_code, first_name, last_name, email, department_id, role, start_date } = req.body;
  try {
    const { lastId } = execute(`
      INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employee_code, first_name, last_name, email || '', department_id, role || 'employee', start_date || '']);
    res.json({ id: lastId, message: 'เพิ่มพนักงานสำเร็จ' });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'รหัสพนักงานซ้ำ' });
    }
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Update employee
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { first_name, last_name, email, department_id, role, start_date } = req.body;
  execute(`
    UPDATE employees 
    SET first_name = ?, last_name = ?, email = ?, department_id = ?, role = ?, start_date = ?
    WHERE id = ?
  `, [first_name, last_name, email, department_id, role, start_date || '', Number(id)]);
  res.json({ message: 'อัปเดตข้อมูลพนักงานสำเร็จ' });
});

// Set password (Admin sets for employee)
router.put('/:id/set-password', (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
  }

  execute('UPDATE employees SET password = ? WHERE id = ?', [new_password, Number(id)]);
  res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จ' });
});

// Reset password (Admin resets to default "1234")
router.put('/:id/reset-password', (req: Request, res: Response) => {
  const { id } = req.params;

  execute('UPDATE employees SET password = ? WHERE id = ?', ['1234', Number(id)]);
  res.json({ message: 'รีเซ็ตรหัสผ่านเป็น 1234 สำเร็จ' });
});

// Change own password (Employee changes their own)
router.put('/:id/change-password', (req: Request, res: Response) => {
  const { id } = req.params;
  const { current_password, new_password } = req.body;

  if (!new_password || new_password.length < 4) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
  }

  // Verify current password
  const employee = queryOne('SELECT password FROM employees WHERE id = ?', [Number(id)]);
  if (!employee) {
    return res.status(404).json({ error: 'ไม่พบพนักงาน' });
  }

  if (employee.password !== current_password) {
    return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
  }

  execute('UPDATE employees SET password = ? WHERE id = ?', [new_password, Number(id)]);
  res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
});

// Upload avatar
router.put('/:id/avatar', (req: Request, res: Response) => {
  const { id } = req.params;
  const { avatar } = req.body;

  if (!avatar) {
    return res.status(400).json({ error: 'ไม่พบรูปภาพ' });
  }

  const avatarsDir = path.join(uploadsDir, 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  // Extract base64
  const matches = avatar.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง' });
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = matches[2];
  const filename = `avatar_${id}_${Date.now()}.${ext}`;
  const filePath = path.join(avatarsDir, filename);

  // Delete old avatar
  const old = queryOne('SELECT avatar FROM employees WHERE id = ?', [Number(id)]);
  if (old?.avatar) {
    const oldPath = path.join(uploadsDir, old.avatar.replace('/uploads/', ''));
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  const avatarUrl = `/uploads/avatars/${filename}`;

  execute('UPDATE employees SET avatar = ? WHERE id = ?', [avatarUrl, Number(id)]);

  res.json({ message: 'อัปโหลดรูปโปรไฟล์สำเร็จ', avatar: avatarUrl });
});

// Delete avatar
router.delete('/:id/avatar', (req: Request, res: Response) => {
  const { id } = req.params;

  const old = queryOne('SELECT avatar FROM employees WHERE id = ?', [Number(id)]);
  if (old?.avatar) {
    const oldPath = path.join(uploadsDir, old.avatar.replace('/uploads/', ''));
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  execute("UPDATE employees SET avatar = '' WHERE id = ?", [Number(id)]);
  res.json({ message: 'ลบรูปโปรไฟล์สำเร็จ' });
});

// Toggle active/inactive employee
router.put('/:id/toggle-active', (req: Request, res: Response) => {
  const { id } = req.params;
  const emp = queryOne('SELECT is_active, first_name, last_name FROM employees WHERE id = ?', [Number(id)]);
  if (!emp) return res.status(404).json({ error: 'ไม่พบพนักงาน' });

  const newStatus = emp.is_active ? 0 : 1;
  execute('UPDATE employees SET is_active = ? WHERE id = ?', [newStatus, Number(id)]);

  res.json({
    message: newStatus === 0
      ? `ปิดใช้งาน ${emp.first_name} ${emp.last_name} แล้ว`
      : `เปิดใช้งาน ${emp.first_name} ${emp.last_name} แล้ว`,
    is_active: newStatus,
  });
});

// Delete employee
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  // ตรวจว่ามีข้อมูลที่เกี่ยวข้องไหม
  const hasAttendance = queryOne('SELECT COUNT(*) as count FROM attendance WHERE employee_id = ?', [Number(id)]);
  const hasLeave = queryOne('SELECT COUNT(*) as count FROM leave_requests WHERE employee_id = ?', [Number(id)]);

  if ((hasAttendance && hasAttendance.count > 0) || (hasLeave && hasLeave.count > 0)) {
    return res.status(400).json({ error: 'ไม่สามารถลบได้ เพราะมีประวัติการเข้างาน/ลาอยู่ ให้เปลี่ยนสถานะแทน' });
  }

  execute('DELETE FROM employees WHERE id = ?', [Number(id)]);
  res.json({ message: 'ลบพนักงานสำเร็จ' });
});

export default router;
