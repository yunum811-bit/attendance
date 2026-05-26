import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';
import { createNotification } from './notification';

const router = Router();

// Create forgot check-in request
router.post('/', (req: Request, res: Response) => {
  const { employee_id, date, check_in, check_out, reason } = req.body;

  if (!date || !check_in || !reason) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ (วันที่, เวลาเข้า, เหตุผล)' });
  }

  const { lastId } = execute(`
    INSERT INTO forgot_checkin (employee_id, date, check_in, check_out, reason)
    VALUES (?, ?, ?, ?, ?)
  `, [employee_id, date, check_in, check_out || '', reason]);

  // Notify manager
  const requester = queryOne('SELECT * FROM employees WHERE id = ?', [employee_id]);
  if (requester) {
    const requesterName = `${requester.first_name} ${requester.last_name}`;
    const msg = `${requesterName} ขอบันทึกเวลาย้อนหลัง วันที่ ${date} (${check_in}${check_out ? ' - ' + check_out : ''})`;

    const managers = queryAll(
      "SELECT id FROM employees WHERE department_id = ? AND role IN ('manager','manager_admin') AND id != ?",
      [requester.department_id, employee_id]
    );

    if (managers.length > 0) {
      managers.forEach((m: any) => {
        createNotification(m.id, 'forgot_checkin', 'ลืม Check In — รอการอนุมัติ', msg, '/approval');
      });
    } else {
      // No manager → notify admin
      const admins = queryAll("SELECT id FROM employees WHERE role IN ('admin','manager_admin','md')");
      admins.forEach((a: any) => {
        createNotification(a.id, 'forgot_checkin', 'ลืม Check In — รอการอนุมัติ', msg, '/approval');
      });
    }
  }

  res.json({ id: lastId, message: 'ส่งคำขอบันทึกเวลาย้อนหลังสำเร็จ' });
});

// Get my forgot check-in requests
router.get('/my/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const requests = queryAll(`
    SELECT fc.*, 
           CASE WHEN fc.approved_by IS NOT NULL THEN e2.first_name || ' ' || e2.last_name ELSE NULL END as approver_name
    FROM forgot_checkin fc
    LEFT JOIN employees e2 ON fc.approved_by = e2.id
    WHERE fc.employee_id = ?
    ORDER BY fc.created_at DESC
  `, [Number(employeeId)]);
  res.json(requests);
});

// Get pending forgot check-in (for manager)
router.get('/pending/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const requests = queryAll(`
    SELECT fc.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
    FROM forgot_checkin fc
    JOIN employees e ON fc.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE e.department_id = ? AND fc.status = 'pending'
    ORDER BY fc.created_at ASC
  `, [Number(departmentId)]);
  res.json(requests);
});

// Get all pending (for admin)
router.get('/pending-all', (req: Request, res: Response) => {
  const requests = queryAll(`
    SELECT fc.*, e.first_name, e.last_name, e.employee_code, d.name as department_name
    FROM forgot_checkin fc
    JOIN employees e ON fc.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE fc.status = 'pending'
    ORDER BY fc.created_at ASC
  `);
  res.json(requests);
});

// Approve forgot check-in → insert into attendance
router.put('/approve/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  const request = queryOne('SELECT * FROM forgot_checkin WHERE id = ?', [Number(id)]);
  if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });

  // Check if attendance already exists for that date
  const existing = queryOne(
    'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
    [request.employee_id, request.date]
  );

  if (existing) {
    // Update existing
    execute('UPDATE attendance SET check_in = ?, check_out = ? WHERE id = ?',
      [request.check_in, request.check_out || null, existing.id]);
  } else {
    // Insert new
    execute(
      'INSERT INTO attendance (employee_id, date, check_in, check_out, status, note) VALUES (?, ?, ?, ?, ?, ?)',
      [request.employee_id, request.date, request.check_in, request.check_out || null, 'present', 'ลืม Check In (อนุมัติย้อนหลัง)']
    );
  }

  // Update status
  execute('UPDATE forgot_checkin SET status = ?, approved_by = ?, approved_at = datetime(?) WHERE id = ?',
    ['approved', approved_by, 'now', Number(id)]);

  // Notify employee
  const approver = queryOne('SELECT first_name, last_name FROM employees WHERE id = ?', [approved_by]);
  if (approver) {
    createNotification(
      request.employee_id, 'forgot_checkin_approved',
      '✅ อนุมัติบันทึกเวลาย้อนหลัง',
      `วันที่ ${request.date} (${request.check_in}${request.check_out ? ' - ' + request.check_out : ''}) อนุมัติโดย ${approver.first_name} ${approver.last_name}`,
      '/checkinout'
    );
  }

  res.json({ message: 'อนุมัติสำเร็จ — บันทึกเวลาเข้าระบบแล้ว' });
});

// Reject
router.put('/reject/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_by, reason } = req.body;

  const request = queryOne('SELECT * FROM forgot_checkin WHERE id = ?', [Number(id)]);
  if (!request) return res.status(404).json({ error: 'ไม่พบคำขอ' });

  execute('UPDATE forgot_checkin SET status = ?, approved_by = ?, approved_at = datetime(?) WHERE id = ?',
    ['rejected', approved_by, 'now', Number(id)]);

  const approver = queryOne('SELECT first_name, last_name FROM employees WHERE id = ?', [approved_by]);
  if (approver) {
    createNotification(
      request.employee_id, 'forgot_checkin_rejected',
      '❌ ไม่อนุมัติบันทึกเวลาย้อนหลัง',
      `วันที่ ${request.date} ปฏิเสธโดย ${approver.first_name} ${approver.last_name}${reason ? ' เหตุผล: ' + reason : ''}`,
      '/checkinout'
    );
  }

  res.json({ message: 'ปฏิเสธคำขอสำเร็จ' });
});

export default router;
