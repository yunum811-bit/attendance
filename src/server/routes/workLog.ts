import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';

const router = Router();

const VALID_STATUSES = ['completed', 'in_progress', 'waiting', 'cannot_do'];

// GET /api/work-logs?employee_id=&date=&start_date=&end_date=&department_id=
router.get('/', (req: Request, res: Response) => {
  const { employee_id, date, start_date, end_date, department_id } = req.query;

  let sql = `
    SELECT wl.*, 
           e.first_name || ' ' || e.last_name as employee_name,
           e.employee_code,
           d.name as department_name,
           ab.first_name || ' ' || ab.last_name as acknowledged_by_name
    FROM work_logs wl
    JOIN employees e ON wl.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN employees ab ON wl.acknowledged_by = ab.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (employee_id) {
    sql += ' AND wl.employee_id = ?';
    params.push(Number(employee_id));
  }
  if (date) {
    sql += ' AND wl.date = ?';
    params.push(date);
  }
  if (start_date) {
    sql += ' AND wl.date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND wl.date <= ?';
    params.push(end_date);
  }
  if (department_id) {
    sql += ' AND e.department_id = ?';
    params.push(Number(department_id));
  }

  sql += ' ORDER BY wl.date DESC, wl.start_time ASC';

  const logs = queryAll(sql, params);
  res.json(logs);
});

// GET /api/work-logs/:id
router.get('/:id', (req: Request, res: Response) => {
  const log = queryOne(`
    SELECT wl.*,
           e.first_name || ' ' || e.last_name as employee_name,
           e.employee_code,
           d.name as department_name,
           ab.first_name || ' ' || ab.last_name as acknowledged_by_name
    FROM work_logs wl
    JOIN employees e ON wl.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN employees ab ON wl.acknowledged_by = ab.id
    WHERE wl.id = ?
  `, [Number(req.params.id)]);

  if (!log) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
  res.json(log);
});

// POST /api/work-logs — บันทึกงานใหม่
router.post('/', (req: Request, res: Response) => {
  const { employee_id, date, start_time, end_time, description, status } = req.body;

  if (!employee_id || !date || !start_time || !end_time || !description) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
  }

  const { lastId } = execute(
    `INSERT INTO work_logs (employee_id, date, start_time, end_time, description, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [employee_id, date, start_time, end_time, description, status || 'completed']
  );

  const created = queryOne(`
    SELECT wl.*,
           e.first_name || ' ' || e.last_name as employee_name,
           d.name as department_name
    FROM work_logs wl
    JOIN employees e ON wl.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE wl.id = ?
  `, [lastId]);

  res.status(201).json(created);
});

// PUT /api/work-logs/:id — แก้ไขรายการ
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, start_time, end_time, description, status, employee_id } = req.body;

  const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [Number(id)]);
  if (!log) return res.status(404).json({ error: 'ไม่พบข้อมูล' });

  // ถ้ารับทราบแล้วพนักงานแก้ไขไม่ได้
  if (log.acknowledged_by && log.employee_id === Number(employee_id)) {
    return res.status(403).json({ error: 'ไม่สามารถแก้ไขได้ เนื่องจากผู้บังคับบัญชารับทราบแล้ว' });
  }

  execute(
    `UPDATE work_logs SET date=?, start_time=?, end_time=?, description=?, status=? WHERE id=?`,
    [date, start_time, end_time, description, status, Number(id)]
  );

  res.json({ message: 'แก้ไขสำเร็จ' });
});

// DELETE /api/work-logs/:id — ลบรายการ
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { employee_id } = req.body;

  const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [Number(id)]);
  if (!log) return res.status(404).json({ error: 'ไม่พบข้อมูล' });

  if (log.acknowledged_by && log.employee_id === Number(employee_id)) {
    return res.status(403).json({ error: 'ไม่สามารถลบได้ เนื่องจากผู้บังคับบัญชารับทราบแล้ว' });
  }

  execute('DELETE FROM work_logs WHERE id = ?', [Number(id)]);
  res.json({ message: 'ลบสำเร็จ' });
});

// PATCH /api/work-logs/:id/acknowledge — ผู้บังคับบัญชารับทราบ
router.patch('/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const { acknowledged_by } = req.body;

  if (!acknowledged_by) {
    return res.status(400).json({ error: 'กรุณาระบุผู้รับทราบ' });
  }

  const log = queryOne('SELECT * FROM work_logs WHERE id = ?', [Number(id)]);
  if (!log) return res.status(404).json({ error: 'ไม่พบข้อมูล' });

  execute(
    `UPDATE work_logs SET acknowledged_by=?, acknowledged_at=CURRENT_TIMESTAMP WHERE id=?`,
    [acknowledged_by, Number(id)]
  );

  res.json({ message: 'รับทราบแล้ว' });
});

// PATCH /api/work-logs/acknowledge-bulk — รับทราบหลายรายการพร้อมกัน
router.patch('/acknowledge-bulk', (req: Request, res: Response) => {
  const { ids, acknowledged_by } = req.body;

  if (!ids?.length || !acknowledged_by) {
    return res.status(400).json({ error: 'กรุณาระบุรายการและผู้รับทราบ' });
  }

  ids.forEach((id: number) => {
    execute(
      `UPDATE work_logs SET acknowledged_by=?, acknowledged_at=CURRENT_TIMESTAMP WHERE id=?`,
      [acknowledged_by, id]
    );
  });

  res.json({ message: `รับทราบ ${ids.length} รายการแล้ว` });
});

// GET /api/work-logs/export/excel?start_date=&end_date=&department_id=&employee_id=
router.get('/export/excel', (req: Request, res: Response) => {
  const { start_date, end_date, department_id, employee_id } = req.query;

  let sql = `
    SELECT wl.date, wl.start_time, wl.end_time, wl.description, wl.status,
           e.first_name || ' ' || e.last_name as employee_name,
           d.name as department_name,
           ab.first_name || ' ' || ab.last_name as acknowledged_by_name,
           wl.acknowledged_at
    FROM work_logs wl
    JOIN employees e ON wl.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    LEFT JOIN employees ab ON wl.acknowledged_by = ab.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (employee_id) { sql += ' AND wl.employee_id = ?'; params.push(Number(employee_id)); }
  if (start_date)  { sql += ' AND wl.date >= ?'; params.push(start_date); }
  if (end_date)    { sql += ' AND wl.date <= ?'; params.push(end_date); }
  if (department_id) { sql += ' AND e.department_id = ?'; params.push(Number(department_id)); }

  sql += ' ORDER BY wl.date ASC, e.first_name ASC, wl.start_time ASC';

  const logs = queryAll(sql, params);

  const statusLabel: Record<string, string> = {
    completed:   'ดำเนินการเสร็จสิ้นทั้งหมด',
    in_progress: 'อยู่ระหว่างดำเนินการ',
    waiting:     'รอข้อมูล/การดำเนินการจากหน่วยงานอื่น',
    cannot_do:   'ไม่สามารถดำเนินการได้',
  };

  // สร้าง CSV (UTF-8 BOM สำหรับ Excel ภาษาไทย)
  const BOM = '\uFEFF';
  const header = 'ชื่อ-สกุล,ฝ่าย,วันที่,รายละเอียดงาน,เวลาเริ่มปฏิบัติงาน,เวลาสิ้นสุดการปฏิบัติงาน,สถานะงาน,ผู้บังคับบัญชารับทราบ,วันที่รับทราบ';
  const rows = logs.map(l => [
    `"${l.employee_name}"`,
    `"${l.department_name}"`,
    `"${l.date}"`,
    `"${(l.description || '').replace(/"/g, '""')}"`,
    `"${l.start_time}"`,
    `"${l.end_time}"`,
    `"${statusLabel[l.status] || l.status}"`,
    `"${l.acknowledged_by_name || '-'}"`,
    `"${l.acknowledged_at || '-'}"`,
  ].join(','));

  const csv = BOM + [header, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="work_log_${start_date || 'all'}_${end_date || 'all'}.csv"`);
  res.send(csv);
});

export default router;
