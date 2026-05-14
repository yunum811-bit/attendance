import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, uploadsDir } from '../database';
import path from 'path';
import fs from 'fs';

const router = Router();
const announcementsDir = path.join(uploadsDir, 'announcements');

// Get all active announcements
router.get('/', (req: Request, res: Response) => {
  const announcements = queryAll(`
    SELECT a.*, e.first_name, e.last_name, e.employee_code
    FROM announcements a
    JOIN employees e ON a.created_by = e.id
    WHERE a.is_active = 1
    ORDER BY a.created_at DESC
  `);
  res.json(announcements);
});

// Create announcement (Admin/MD only)
router.post('/', (req: Request, res: Response) => {
  const { title, content, attachment, attachment_name, created_by } = req.body;

  let attachmentUrl = '';
  let savedFileName = '';

  if (attachment) {
    if (!fs.existsSync(announcementsDir)) {
      fs.mkdirSync(announcementsDir, { recursive: true });
    }

    // Handle base64 file
    const matches = attachment.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const data = matches[2];
      const ext = mimeType.split('/')[1]?.replace('x-', '') || 'bin';
      const filename = `announce_${Date.now()}.${ext}`;
      const filePath = path.join(announcementsDir, filename);
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      attachmentUrl = `/uploads/announcements/${filename}`;
      savedFileName = attachment_name || filename;
    }
  }

  const { lastId } = execute(`
    INSERT INTO announcements (title, content, attachment, attachment_name, created_by)
    VALUES (?, ?, ?, ?, ?)
  `, [title, content, attachmentUrl, savedFileName, created_by]);

  res.json({ id: lastId, message: 'สร้างประกาศสำเร็จ' });
});

// Delete announcement
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  // Delete attachment file
  const announcement = queryOne('SELECT attachment FROM announcements WHERE id = ?', [Number(id)]);
  if (announcement?.attachment) {
    const filePath = path.join(uploadsDir, announcement.attachment.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  execute('DELETE FROM announcements WHERE id = ?', [Number(id)]);
  res.json({ message: 'ลบประกาศสำเร็จ' });
});

export default router;
