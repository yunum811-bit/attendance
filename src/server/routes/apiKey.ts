import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { queryAll, queryOne, execute } from '../database';

const router = Router();

// Helper: hash key ด้วย SHA-256
function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Helper: timing-safe compare
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return crypto.timingSafeEqual(bufA, bufB);
}

// สร้าง API Key ใหม่
// POST /api/admin/api-keys
router.post('/', (req: Request, res: Response) => {
  const { name, permissions = 'read', created_by } = req.body;

  if (!name || !created_by) {
    return res.status(400).json({ error: 'name และ created_by จำเป็นต้องระบุ' });
  }

  if (!['read', 'read_write'].includes(permissions)) {
    return res.status(400).json({ error: 'permissions ต้องเป็น read หรือ read_write' });
  }

  // สร้าง key รูปแบบ: atd_<32 random hex chars>
  const rawKey = `atd_${crypto.randomBytes(24).toString('hex')}`;
  const prefix = rawKey.substring(0, 10); // เก็บ prefix สำหรับแสดงใน UI
  const keyHash = hashKey(rawKey);

  const { lastId } = execute(
    `INSERT INTO api_keys (name, key_hash, key_prefix, permissions, is_active, created_by)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [name, keyHash, prefix, permissions, created_by]
  );

  const created = queryOne('SELECT * FROM api_keys WHERE id = ?', [lastId]);

  // คืน raw key แค่ครั้งเดียวตอนสร้าง หลังจากนี้จะไม่สามารถดูได้อีก
  res.status(201).json({
    ...created,
    key: rawKey, // แสดงแค่ครั้งแรกเท่านั้น
    message: 'เก็บ API Key นี้ไว้ให้ดี จะไม่สามารถดูได้อีก'
  });
});

// ดูรายการ API Keys ทั้งหมด (ไม่แสดง key จริง)
// GET /api/admin/api-keys
router.get('/', (req: Request, res: Response) => {
  const keys = queryAll(`
    SELECT ak.id, ak.name, ak.key_prefix, ak.permissions, ak.is_active,
           ak.last_used_at, ak.created_at,
           e.first_name || ' ' || e.last_name as created_by_name
    FROM api_keys ak
    JOIN employees e ON ak.created_by = e.id
    ORDER BY ak.created_at DESC
  `);
  res.json(keys);
});

// เปิด/ปิด API Key
// PATCH /api/admin/api-keys/:id/toggle
router.patch('/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const key = queryOne('SELECT * FROM api_keys WHERE id = ?', [Number(id)]);

  if (!key) {
    return res.status(404).json({ error: 'ไม่พบ API Key' });
  }

  execute('UPDATE api_keys SET is_active = ? WHERE id = ?', [
    key.is_active ? 0 : 1,
    Number(id)
  ]);

  res.json({ message: key.is_active ? 'ปิดใช้งานแล้ว' : 'เปิดใช้งานแล้ว' });
});

// ลบ API Key
// DELETE /api/admin/api-keys/:id
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const key = queryOne('SELECT * FROM api_keys WHERE id = ?', [Number(id)]);

  if (!key) {
    return res.status(404).json({ error: 'ไม่พบ API Key' });
  }

  execute('DELETE FROM api_keys WHERE id = ?', [Number(id)]);
  res.json({ message: 'ลบ API Key แล้ว' });
});

// Export helper สำหรับใช้ใน middleware
export function verifyApiKey(rawKey: string): { valid: boolean; keyData?: any } {
  if (!rawKey) return { valid: false };

  const keyHash = hashKey(rawKey);
  const keyData = queryOne(
    'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1',
    [keyHash]
  );

  if (!keyData) return { valid: false };

  // อัปเดต last_used_at
  execute('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [keyData.id]);

  return { valid: true, keyData };
}

export default router;
