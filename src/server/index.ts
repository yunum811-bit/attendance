import dotenv from 'dotenv';
import path from 'path';
// โหลด .env จาก root ของ project (ไม่ขึ้นกับ cwd)
dotenv.config({ path: path.join(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { initDatabase } from './database';
import attendanceRoutes from './routes/attendance';
import leaveRoutes from './routes/leave';
import employeeRoutes from './routes/employee';
import departmentRoutes from './routes/department';
import reportRoutes from './routes/report';
import authRoutes from './routes/auth';
import leaveQuotaRoutes from './routes/leaveQuota';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notification';
import announcementRoutes from './routes/announcement';
import holidayRoutes from './routes/holiday';
import forgotCheckinRoutes from './routes/forgotCheckin';

const app = express();
const PORT = parseInt(process.env.PORT || '4000');
const HTTPS_PORT = 4443;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
const uploadsPath = process.env.UPLOADS_DIR || path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leave-quotas', leaveQuotaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/forgot-checkin', forgotCheckinRoutes);

// External API with API Key (สำหรับ CRM)
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn('⚠️  API_KEY ไม่ได้ตั้งค่า — External API (/api/external) จะถูกปิดใช้งาน');
  console.warn('   ตั้งค่า: API_KEY=<your-secret-key> (แนะนำ 32+ ตัวอักษร)');
}

// Rate limiting สำหรับ External API
const externalRateLimit: Record<string, { count: number; resetAt: number }> = {};
const RATE_LIMIT_MAX = 100; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

app.use('/api/external', (req, res, next) => {
  // ถ้าไม่ได้ตั้ง API_KEY → ปิด External API
  if (!API_KEY) {
    return res.status(503).json({ error: 'External API is disabled. Set API_KEY environment variable.' });
  }

  // บังคับใช้ header เท่านั้น (ไม่รับ query string เพื่อป้องกัน key หลุดใน logs)
  const key = req.headers['x-api-key'] as string;
  if (!key) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  // Timing-safe comparison ป้องกัน timing attack
  if (key.length !== API_KEY.length || !timingSafeEqual(key, API_KEY)) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  // Rate limiting by IP
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = externalRateLimit[clientIp];

  if (!entry || now > entry.resetAt) {
    externalRateLimit[clientIp] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
  } else {
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
  }

  next();
});

// Timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  const crypto = require('crypto');
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return crypto.timingSafeEqual(bufA, bufB);
}

// External: ดึงข้อมูลเข้างาน
app.get('/api/external/attendance', (req, res) => {
  const { queryAll } = require('./database');
  const { department_id, employee_id, start_date, end_date } = req.query;

  let query = `
    SELECT a.date, a.check_in, a.check_out, a.status, a.location_checkin, a.location_checkout,
           e.employee_code, e.first_name, e.last_name,
           d.name as department_name
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (employee_id) { query += ' AND a.employee_id = ?'; params.push(Number(employee_id)); }
  if (department_id) { query += ' AND e.department_id = ?'; params.push(Number(department_id)); }
  if (start_date) { query += ' AND a.date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND a.date <= ?'; params.push(end_date); }
  query += ' ORDER BY a.date DESC, e.employee_code';

  res.json(queryAll(query, params));
});

// External: ดึงข้อมูลการลา
app.get('/api/external/leave', (req, res) => {
  const { queryAll } = require('./database');
  const { department_id, employee_id, start_date, end_date, status } = req.query;

  let query = `
    SELECT lr.start_date, lr.end_date, lr.days, lr.reason, lr.status,
           lt.name as leave_type_name,
           e.employee_code, e.first_name, e.last_name,
           d.name as department_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (employee_id) { query += ' AND lr.employee_id = ?'; params.push(Number(employee_id)); }
  if (department_id) { query += ' AND e.department_id = ?'; params.push(Number(department_id)); }
  if (start_date) { query += ' AND lr.start_date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND lr.end_date <= ?'; params.push(end_date); }
  if (status) { query += ' AND lr.status = ?'; params.push(status); }
  query += ' ORDER BY lr.start_date DESC';

  res.json(queryAll(query, params));
});

// Serve static files (built frontend)
const distPath = path.join(__dirname, '../../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Initialize database then start server
async function start() {
  await initDatabase();

  // HTTP server
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP  → http://localhost:${PORT}`);
  });

  // HTTPS server (for mobile GPS support)
  const certDir = path.join(__dirname, '../../certs');
  const keyPath = path.join(certDir, 'key.pem');
  const certPath = path.join(certDir, 'cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const key = fs.readFileSync(keyPath, 'utf8');
      const cert = fs.readFileSync(certPath, 'utf8');

      https.createServer({ key, cert }, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS → https://localhost:${HTTPS_PORT}`);
        console.log('');
        console.log('📱 สำหรับมือถือ (GPS) ให้เปิด:');
        console.log(`   https://<IP-ของเครื่องนี้>:${HTTPS_PORT}`);
        console.log('   เบราว์เซอร์จะแจ้งเตือน → กด Advanced → Proceed');
      });
    } catch (err) {
      console.log('⚠️  HTTPS cert อ่านไม่ได้:', (err as Error).message);
    }
  } else {
    console.log('');
    console.log('⚠️  ไม่พบ SSL certificate (certs/key.pem, certs/cert.pem)');
    console.log('   GPS บนมือถือต้องใช้ HTTPS');
    console.log('   ดูวิธีสร้างใน README.md');
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
