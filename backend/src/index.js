import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import managerRoutes from './routes/manager.js';
import adminRoutes from './routes/admin.js';



const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();
app.get('/', (req, res) => {
  res.send('Welcome to the UNIFLOW API!');
});
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'UP', service: 'CampusCare API' }));

app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {}),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UNIFLOW API listening on http://localhost:${PORT}`);
});
