import { Router, Request, Response } from 'express';
import { queryAll } from '../database';
import * as XLSX from 'xlsx';

const router = Router();

// Attendance report
router.get('/attendance', (req: Request, res: Response) => {
  const { department_id, employee_id, start_date, end_date, format } = req.query;

  let query = `
    SELECT a.date, a.check_in, a.check_out, a.status, a.note,
           a.location_checkin, a.location_checkout,
           e.employee_code, e.first_name, e.last_name,
           d.name as department_name
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (employee_id) {
    query += ' AND a.employee_id = ?';
    params.push(Number(employee_id));
  }
  if (department_id) {
    query += ' AND e.department_id = ?';
    params.push(Number(department_id));
  }
  if (start_date) {
    query += ' AND a.date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND a.date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY a.date DESC, e.employee_code';

  const records = queryAll(query, params);

  if (format === 'csv' || format === 'xlsx') {
    const data = records.map((r: any) => ({
      'วันที่': r.date,
      'รหัสพนักงาน': r.employee_code,
      'ชื่อ': r.first_name,
      'นามสกุล': r.last_name,
      'แผนก': r.department_name,
      'เวลาเข้า': r.check_in || '-',
      'เวลาออก': r.check_out || '-',
      'สถานะ': r.status === 'present' ? 'มาทำงาน' : r.status,
      'ตำแหน่งเข้า': r.location_checkin || '-',
      'ตำแหน่งออก': r.location_checkout || '-',
      'หมายเหตุ': r.note || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายงานการเข้างาน');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
      res.send('\uFEFF' + csv);
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
      res.send(Buffer.from(buffer));
    }
  } else {
    res.json(records);
  }
});

// Leave report
router.get('/leave', (req: Request, res: Response) => {
  const { department_id, employee_id, start_date, end_date, status, format } = req.query;

  let query = `
    SELECT lr.start_date, lr.end_date, lr.days, lr.reason, lr.status, lr.created_at,
           lr.reject_reason,
           lt.name as leave_type_name,
           e.employee_code, e.first_name, e.last_name,
           d.name as department_name,
           CASE WHEN lr.approved_by IS NOT NULL 
             THEN e2.first_name || ' ' || e2.last_name 
             ELSE NULL 
           END as approver_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN employees e2 ON lr.approved_by = e2.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (employee_id) {
    query += ' AND lr.employee_id = ?';
    params.push(Number(employee_id));
  }
  if (department_id) {
    query += ' AND e.department_id = ?';
    params.push(Number(department_id));
  }
  if (start_date) {
    query += ' AND lr.start_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND lr.end_date <= ?';
    params.push(end_date);
  }
  if (status) {
    query += ' AND lr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY lr.created_at DESC';

  const records = queryAll(query, params);

  if (format === 'csv' || format === 'xlsx') {
    const statusMap: Record<string, string> = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ',
    };

    const data = records.map((r: any) => ({
      'รหัสพนักงาน': r.employee_code,
      'ชื่อ': r.first_name,
      'นามสกุล': r.last_name,
      'แผนก': r.department_name,
      'ประเภทการลา': r.leave_type_name,
      'วันที่เริ่ม': r.start_date,
      'วันที่สิ้นสุด': r.end_date,
      'จำนวนวัน': r.days,
      'เหตุผล': r.reason || '',
      'สถานะ': statusMap[r.status] || r.status,
      'ผู้อนุมัติ': r.approver_name || '-',
      'เหตุผลที่ปฏิเสธ': r.reject_reason || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายงานการลา');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=leave_report.csv');
      res.send('\uFEFF' + csv);
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=leave_report.xlsx');
      res.send(Buffer.from(buffer));
    }
  } else {
    res.json(records);
  }
});

// Summary report - attendance stats per employee
router.get('/summary', (req: Request, res: Response) => {
  const { department_id, employee_id, month, year, format } = req.query;
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const datePrefix = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  let query = `
    SELECT e.employee_code, e.first_name, e.last_name,
           d.name as department_name,
           COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
           COUNT(CASE WHEN a.check_in > '09:00:00' THEN 1 END) as late_days,
           (SELECT COALESCE(SUM(lr.days), 0) FROM leave_requests lr 
            WHERE lr.employee_id = e.id AND lr.status = 'approved' 
            AND lr.start_date LIKE ?) as leave_days
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN attendance a ON e.id = a.employee_id AND a.date LIKE ?
    WHERE 1=1
  `;
  const params: any[] = [datePrefix + '%', datePrefix + '%'];

  if (employee_id) {
    query += ' AND e.id = ?';
    params.push(Number(employee_id));
  }
  if (department_id) {
    query += ' AND e.department_id = ?';
    params.push(Number(department_id));
  }

  query += ' GROUP BY e.id ORDER BY e.employee_code';

  const records = queryAll(query, params);

  if (format === 'csv' || format === 'xlsx') {
    const data = records.map((r: any) => ({
      'รหัสพนักงาน': r.employee_code,
      'ชื่อ': r.first_name,
      'นามสกุล': r.last_name,
      'แผนก': r.department_name,
      'วันที่มาทำงาน': r.present_days,
      'วันที่มาสาย': r.late_days,
      'วันลา': r.leave_days,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'สรุปรายเดือน');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=summary_report.csv');
      res.send('\uFEFF' + csv);
    } else {
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=summary_report.xlsx');
      res.send(Buffer.from(buffer));
    }
  } else {
    res.json(records);
  }
});

export default router;
