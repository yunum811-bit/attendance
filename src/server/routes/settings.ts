import { Router, Request, Response } from 'express';
import { queryAll, queryOne, execute, uploadsDir } from '../database';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get all company settings
router.get('/', (req: Request, res: Response) => {
  const settings = queryAll('SELECT key, value FROM company_settings');
  const result: Record<string, string> = {};
  settings.forEach((s: any) => {
    result[s.key] = s.value;
  });

  // Ensure defaults exist
  if (!result.company_name) result.company_name = 'บริษัท ตัวอย่าง จำกัด';
  if (!result.company_logo) result.company_logo = '';

  res.json(result);
});

// Update a setting
router.put('/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  const existing = queryOne('SELECT id FROM company_settings WHERE key = ?', [key]);
  if (existing) {
    execute('UPDATE company_settings SET value = ? WHERE key = ?', [value, key]);
  } else {
    execute('INSERT INTO company_settings (key, value) VALUES (?, ?)', [key, value]);
  }

  res.json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
});

// Upload logo
router.post('/logo', (req: Request, res: Response) => {
  // Handle base64 upload
  const { logo } = req.body;

  if (!logo) {
    return res.status(400).json({ error: 'ไม่พบไฟล์โลโก้' });
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Extract base64 data
  const matches = logo.match(/^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง (รองรับ PNG, JPG, GIF, SVG)' });
  }

  const ext = matches[1] === 'svg+xml' ? 'svg' : matches[1];
  const data = matches[2];
  const filename = `logo_${Date.now()}.${ext}`;
  const filePath = path.join(uploadsDir, filename);

  // Save file
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

  // Save path to database
  const logoUrl = `/uploads/${filename}`;
  const existing = queryOne("SELECT id FROM company_settings WHERE key = 'company_logo'");
  if (existing) {
    // Delete old logo file
    const oldLogo = queryOne("SELECT value FROM company_settings WHERE key = 'company_logo'");
    if (oldLogo?.value) {
      const oldPath = path.join(uploadsDir, oldLogo.value.replace('/uploads/', ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    execute("UPDATE company_settings SET value = ? WHERE key = 'company_logo'", [logoUrl]);
  } else {
    execute("INSERT INTO company_settings (key, value) VALUES ('company_logo', ?)", [logoUrl]);
  }

  res.json({ message: 'อัปโหลดโลโก้สำเร็จ', logo_url: logoUrl });
});

// Delete logo
router.delete('/logo', (req: Request, res: Response) => {
  const existing = queryOne("SELECT value FROM company_settings WHERE key = 'company_logo'");
  if (existing?.value) {
    const filePath = path.join(uploadsDir, existing.value.replace('/uploads/', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  execute("UPDATE company_settings SET value = '' WHERE key = 'company_logo'");
  res.json({ message: 'ลบโลโก้สำเร็จ' });
});

export default router;
