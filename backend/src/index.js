import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';



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

// Centralised error handler middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UNIFLOW API listening on http://localhost:${PORT}`);
});
