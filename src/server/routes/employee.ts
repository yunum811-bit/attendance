import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, uploadsDir } from '../database';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get all employees
router.get('/', (req: Request, res: Response) => {
  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, 
           e.department_id, e.role, e.avatar, d.name as department_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    ORDER BY e.employee_code
  `);

  res.json(employees);
});

// Get employees by department
router.get('/department/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const employees = queryAll(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, 
           e.department_id, e.role, e.avatar, d.name as department_name
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE e.department_id = ?
    ORDER BY e.employee_code
  `, [Number(departmentId)]);

  res.json(employees);
});

// Create employee
router.post('/', (req: Request, res: Response) => {
  const { employee_code, first_name, last_name, email, department_id, role } = req.body;

  try {
    const { lastId } = execute(`
      INSERT INTO employees (employee_code, first_name, last_name, email, department_id, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [employee_code, first_name, last_name, email || '', department_id, role || 'employee']);

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
  const { first_name, last_name, email, department_id, role } = req.body;

  execute(`
    UPDATE employees 
    SET first_name = ?, last_name = ?, email = ?, department_id = ?, role = ?
    WHERE id = ?
  `, [first_name, last_name, email, department_id, role, Number(id)]);

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

export default router;
