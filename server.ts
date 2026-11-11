import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getAllUsers } from './src/db/users.ts';
import { getStoredAppData, saveStoredAppData } from './src/db/store.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Healthcheck endpoint
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    database: 'Cloud SQL PostgreSQL',
    auth: 'Firebase Auth',
    timestamp: new Date().toISOString(),
  });
});

// Synchronize authenticated user with Cloud SQL
app.post('/api/auth/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.uid || !user.email) {
      return res.status(400).json({ error: 'Invalid user payload' });
    }

    const dbUser = await getOrCreateUser(
      user.uid,
      user.email,
      user.name || (user as any).displayName || ''
    );
    res.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error('Failed to sync user:', error);
    res.status(500).json({ error: error.message || 'Error synchronizing user' });
  }
});

// Fetch stored app state from Cloud SQL
app.get('/api/data', optionalAuth, async (_req: AuthRequest, res) => {
  try {
    const stored = await getStoredAppData();
    if (!stored || !stored.data) {
      return res.json({ data: null, message: 'No remote state yet' });
    }
    res.json({
      data: stored.data,
      version: stored.version,
      updatedAt: stored.updatedAt,
    });
  } catch (error: any) {
    console.error('Failed to fetch data from Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Database fetch failed' });
  }
});

// Save app state to Cloud SQL
app.post('/api/data', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { appData } = req.body;
    if (!appData) {
      return res.status(400).json({ error: 'Missing appData payload' });
    }

    const userEmail = req.user?.email || 'operador@tatao.cu';
    await saveStoredAppData(appData, userEmail);

    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Failed to save data to Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Database save failed' });
  }
});

// Vite dev server integration vs Production static serving
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
