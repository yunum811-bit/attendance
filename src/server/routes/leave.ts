import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';
import { createNotification } from './notification';

const router = Router();

// Get leave types
router.get('/types', (req: Request, res: Response) => {
  const types = queryAll('SELECT * FROM leave_types');
  res.json(types);
});

// Create leave request
router.post('/request', (req: Request, res: Response) => {
  const { employee_id, leave_type_id, start_date, end_date, days, reason } = req.body;

  const { lastId } = execute(`
    INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [employee_id, leave_type_id, start_date, end_date, days, reason || '']);

  // Get requester info
  const requester = queryOne('SELECT * FROM employees WHERE id = ?', [employee_id]);
  const leaveType = queryOne('SELECT name FROM leave_types WHERE id = ?', [leave_type_id]);

  if (requester && leaveType) {
    const requesterName = `${requester.first_name} ${requester.last_name}`;
    const msg = `${requesterName} ขอ${leaveType.name} ${days} วัน (${start_date} ถึง ${end_date})`;

    if (requester.role === 'employee') {
      // ตรวจว่าแผนกนี้มีหัวหน้าแผนก (manager/manager_admin) หรือไม่
      // ไม่นับ admin เพราะ admin ไม่ได้เป็นหัวหน้าแผนกโดยตำแหน่ง
      const managers = queryAll(
        "SELECT id FROM employees WHERE department_id = ? AND role IN ('manager','manager_admin') AND id != ?",
        [requester.department_id, employee_id]
      );

      if (managers.length > 0) {
        // มีหัวหน้าแผนก → แจ้งหัวหน้าแผนก
        managers.forEach((m: any) => {
          createNotification(m.id, 'leave_request', 'คำขอลาใหม่', msg, '/approval');
        });
      } else {
        // ไม่มีหัวหน้าแผนก → แจ้ง Admin/MD ทุกคน
        const admins = queryAll("SELECT id FROM employees WHERE role IN ('admin','manager_admin','md')");
        admins.forEach((a: any) => {
          createNotification(a.id, 'leave_request', 'คำขอลาใหม่ (ไม่มีหัวหน้าแผนก)', msg, '/approval');
        });
      }
    } else if (requester.role === 'manager' || requester.role === 'manager_admin') {
      // Notify admins
      const admins = queryAll("SELECT id FROM employees WHERE role IN ('admin','manager_admin','md') AND id != ?", [employee_id]);
      admins.forEach((a: any) => {
        createNotification(a.id, 'leave_request', 'คำขอลาจากหัวหน้าแผนก', msg, '/approval');
      });
    }
  }

  res.json({ id: lastId, message: 'ส่งคำขอลาสำเร็จ' });
});

// Get leave requests for an employee
router.get('/my-requests/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const requests = queryAll(`
    SELECT lr.*, lt.name as leave_type_name,
           CASE WHEN lr.approved_by IS NOT NULL 
             THEN e2.first_name || ' ' || e2.last_name 
             ELSE NULL 
           END as approver_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN employees e2 ON lr.approved_by = e2.id
    WHERE lr.employee_id = ?
    ORDER BY lr.created_at DESC
  `, [Number(employeeId)]);

  res.json(requests);
});

// Get pending leave requests for a MANAGER to approve
// Manager sees pending requests from employees in their department
router.get('/pending-for-manager/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const requests = queryAll(`
    SELECT lr.*, lt.name as leave_type_name,
           e.first_name, e.last_name, e.employee_code, e.role as requester_role
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    WHERE e.department_id = ? AND lr.status = 'pending' AND e.role = 'employee'
    ORDER BY lr.created_at ASC
  `, [Number(departmentId)]);

  res.json(requests);
});

// Get ALL pending employee leave requests (for Admin/MD)
// Shows all employees regardless of department
router.get('/pending-all-employees', (req: Request, res: Response) => {
  const requests = queryAll(`
    SELECT lr.*, lt.name as leave_type_name,
           e.first_name, e.last_name, e.employee_code, e.role as requester_role,
           d.name as department_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE lr.status = 'pending' AND e.role = 'employee'
    ORDER BY lr.created_at ASC
  `);

  res.json(requests);
});

// Get pending leave requests for ADMIN to approve
// Admin sees: 1) requests from managers only (no-manager employees go to employee section)
router.get('/pending-for-admin', (req: Request, res: Response) => {
  // Requests from managers/manager_admin only
  const requests = queryAll(`
    SELECT lr.*, lt.name as leave_type_name,
           e.first_name, e.last_name, e.employee_code, e.role as requester_role,
           d.name as department_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE lr.status = 'pending' AND e.role IN ('manager','manager_admin')
    ORDER BY lr.created_at ASC
  `);

  res.json(requests);
});

// Get pending leave requests from employees without a manager (for Admin)
router.get('/pending-no-manager', (req: Request, res: Response) => {
  const requests = queryAll(`
    SELECT lr.*, lt.name as leave_type_name,
           e.first_name, e.last_name, e.employee_code, e.role as requester_role,
           d.name as department_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE lr.status = 'pending' 
      AND e.role = 'employee'
      AND NOT EXISTS (
        SELECT 1 FROM employees m 
        WHERE m.department_id = e.department_id 
        AND m.role IN ('manager','manager_admin')
      )
    ORDER BY lr.created_at ASC
  `);

  res.json(requests);
});

// Legacy endpoint - get pending for department (used by old code)
router.get('/pending/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const requests = queryAll(`
    SELECT lr.*, lt.name as leave_type_name,
           e.first_name, e.last_name, e.employee_code, e.role as requester_role
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    WHERE e.department_id = ? AND lr.status = 'pending' AND e.role = 'employee'
    ORDER BY lr.created_at ASC
  `, [Number(departmentId)]);

  res.json(requests);
});

// Get all leave requests for a department
router.get('/department/:departmentId', (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { status } = req.query;

  let query = `
    SELECT lr.*, lt.name as leave_type_name,
           e.first_name, e.last_name, e.employee_code,
           CASE WHEN lr.approved_by IS NOT NULL 
             THEN e2.first_name || ' ' || e2.last_name 
             ELSE NULL 
           END as approver_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN employees e2 ON lr.approved_by = e2.id
    WHERE e.department_id = ?
  `;
  const params: any[] = [Number(departmentId)];

  if (status) {
    query += ' AND lr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY lr.created_at DESC';

  const requests = queryAll(query, params);
  res.json(requests);
});

// Approve leave request
router.put('/approve/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  // Verify the approver has the right role
  const approver = queryOne('SELECT role FROM employees WHERE id = ?', [approved_by]);
  const leaveRequest = queryOne(`
    SELECT lr.*, e.role as requester_role 
    FROM leave_requests lr 
    JOIN employees e ON lr.employee_id = e.id 
    WHERE lr.id = ?
  `, [Number(id)]);

  if (!approver || !leaveRequest) {
    return res.status(404).json({ error: 'ไม่พบข้อมูล' });
  }

  // Validate approval hierarchy
  if (leaveRequest.requester_role === 'employee' && !['manager','admin','manager_admin'].includes(approver.role)) {
    return res.status(403).json({ error: 'เฉพาะหัวหน้าแผนกหรือ Admin เท่านั้นที่อนุมัติได้' });
  }
  if ((leaveRequest.requester_role === 'manager' || leaveRequest.requester_role === 'manager_admin') && !['admin','manager_admin','md'].includes(approver.role)) {
    return res.status(403).json({ error: 'เฉพาะ Admin เท่านั้นที่อนุมัติการลาของหัวหน้าแผนกได้' });
  }

  execute(`
    UPDATE leave_requests 
    SET status = 'approved', approved_by = ?, approved_at = datetime('now')
    WHERE id = ?
  `, [approved_by, Number(id)]);

  // Notify the requester
  const approverInfo = queryOne('SELECT first_name, last_name FROM employees WHERE id = ?', [approved_by]);
  const leaveInfo = queryOne(`
    SELECT lt.name as leave_type_name, lr.start_date, lr.end_date, lr.days
    FROM leave_requests lr JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.id = ?
  `, [Number(id)]);

  if (approverInfo && leaveInfo) {
    const approverName = `${approverInfo.first_name} ${approverInfo.last_name}`;
    createNotification(
      leaveRequest.employee_id,
      'leave_approved',
      '✅ การลาได้รับอนุมัติ',
      `${leaveInfo.leave_type_name} ${leaveInfo.days} วัน (${leaveInfo.start_date} ถึง ${leaveInfo.end_date}) อนุมัติโดย ${approverName}`,
      '/leave'
    );
  }

  res.json({ message: 'อนุมัติการลาสำเร็จ' });
});

// Reject leave request
router.put('/reject/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved_by, reject_reason } = req.body;

  // Verify the approver has the right role
  const approver = queryOne('SELECT role FROM employees WHERE id = ?', [approved_by]);
  const leaveRequest = queryOne(`
    SELECT lr.*, e.role as requester_role 
    FROM leave_requests lr 
    JOIN employees e ON lr.employee_id = e.id 
    WHERE lr.id = ?
  `, [Number(id)]);

  if (!approver || !leaveRequest) {
    return res.status(404).json({ error: 'ไม่พบข้อมูล' });
  }

  if (leaveRequest.requester_role === 'employee' && !['manager','admin','manager_admin'].includes(approver.role)) {
    return res.status(403).json({ error: 'เฉพาะหัวหน้าแผนกหรือ Admin เท่านั้นที่ปฏิเสธได้' });
  }
  if ((leaveRequest.requester_role === 'manager' || leaveRequest.requester_role === 'manager_admin') && !['admin','manager_admin','md'].includes(approver.role)) {
    return res.status(403).json({ error: 'เฉพาะ Admin เท่านั้นที่ปฏิเสธการลาของหัวหน้าแผนกได้' });
  }

  execute(`
    UPDATE leave_requests 
    SET status = 'rejected', approved_by = ?, approved_at = datetime('now'), reject_reason = ?
    WHERE id = ?
  `, [approved_by, reject_reason, Number(id)]);

  // Notify the requester
  const approverInfo2 = queryOne('SELECT first_name, last_name FROM employees WHERE id = ?', [approved_by]);
  const leaveInfo2 = queryOne(`
    SELECT lt.name as leave_type_name, lr.start_date, lr.end_date, lr.days
    FROM leave_requests lr JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.id = ?
  `, [Number(id)]);

  if (approverInfo2 && leaveInfo2) {
    const approverName = `${approverInfo2.first_name} ${approverInfo2.last_name}`;
    const reasonText = reject_reason ? ` เหตุผล: ${reject_reason}` : '';
    createNotification(
      leaveRequest.employee_id,
      'leave_rejected',
      '❌ การลาไม่ได้รับอนุมัติ',
      `${leaveInfo2.leave_type_name} ${leaveInfo2.days} วัน (${leaveInfo2.start_date} ถึง ${leaveInfo2.end_date}) ปฏิเสธโดย ${approverName}${reasonText}`,
      '/leave'
    );
  }

  res.json({ message: 'ปฏิเสธการลาสำเร็จ' });
});

// Get leave summary for an employee (used days per type, respects custom quotas)
router.get('/summary/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const year = new Date().getFullYear();

  const summary = queryAll(`
    SELECT lt.id, lt.name, lt.max_days as default_max_days,
           COALESCE(elq.max_days, lt.max_days) as max_days,
           COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END), 0) as used_days
    FROM leave_types lt
    LEFT JOIN employee_leave_quotas elq 
      ON lt.id = elq.leave_type_id 
      AND elq.employee_id = ? 
      AND elq.year = ?
    LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id 
      AND lr.employee_id = ? 
      AND lr.start_date LIKE ?
      AND lr.status = 'approved'
    GROUP BY lt.id
  `, [Number(employeeId), year, Number(employeeId), `${year}%`]);

  res.json(summary);
});

export default router;


