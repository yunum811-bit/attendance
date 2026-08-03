import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute } from '../database';

const router = Router();

// Get notifications for an employee
router.get('/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { limit } = req.query;
  const maxItems = Number(limit) || 20;

  const notifications = queryAll(`
    SELECT * FROM notifications 
    WHERE employee_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `, [Number(employeeId), maxItems]);

  res.json(notifications);
});

// Get unread count
router.get('/:employeeId/unread-count', (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const result = queryOne(
    'SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0',
    [Number(employeeId)]
  );

  res.json({ count: result?.count || 0 });
});

// Mark one as read
router.put('/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [Number(id)]);
  res.json({ message: 'ok' });
});

// Mark all as read for an employee
router.put('/read-all/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  execute('UPDATE notifications SET is_read = 1 WHERE employee_id = ? AND is_read = 0', [Number(employeeId)]);
  res.json({ message: 'อ่านทั้งหมดแล้ว' });
});

export default router;

// Helper function to create a notification (used by other routes)
export function createNotification(employeeId: number, type: string, title: string, message: string, link?: string) {
  execute(
    'INSERT INTO notifications (employee_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
    [employeeId, type, title, message, link || '']
  );
}
