import express from 'express';
import cors from 'cors';
import path from 'path';
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

const app = express();
const PORT = 4000;
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
const uploadsPath = path.join(__dirname, '../../public/uploads');
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
