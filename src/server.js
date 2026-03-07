import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, writeFileSync, unlinkSync, globSync } from 'fs';
import { homedir } from 'os';

import { PID_PATH } from './paths.js';
import { hasPassword, setPassword, promptPassword, authMiddleware } from './auth.js';
import { getDocumentCount } from './db.js';
import { ingestDirectory } from './ingest.js';
import authRoutes from './routes/auth-routes.js';
import apiRoutes from './routes/api.js';

export async function start() {
  const port = parseInt(process.env.KB_PORT || '3838', 10);

  // 1. Password setup
  if (process.env.KB_PASSWORD && !hasPassword()) {
    setPassword(process.env.KB_PASSWORD);
    console.log('Password set from KB_PASSWORD env var');
  } else if (!hasPassword()) {
    await promptPassword();
  }

  // 2. Auto-ingest on first run
  if (getDocumentCount() === 0) {
    console.log('First run — auto-ingesting existing knowledge base...');
    const home = homedir();
    const dirs = [join(home, 'knowledgebase')];
    // Add Claude memory dirs
    try {
      const memoryDirs = globSync(join(home, '.claude/projects/*/memory'));
      dirs.push(...memoryDirs);
    } catch {}
    for (const dir of dirs) {
      if (existsSync(dir)) {
        console.log(`  Ingesting ${dir}...`);
        const result = await ingestDirectory(dir);
        console.log(`    ${result.ingested} ingested, ${result.skipped} skipped`);
      }
    }
  }

  // 3. Express setup
  const app = express();
  app.use(express.json());

  const __dirname = dirname(fileURLToPath(import.meta.url));
  app.use(express.static(join(__dirname, 'public')));

  app.use(authRoutes);
  app.use(apiRoutes);

  // Fallback to index.html for SPA
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  // 4. Start
  app.listen(port, () => {
    console.log(`Knowledge Base server running at http://localhost:${port}`);
    writeFileSync(PID_PATH, process.pid.toString());
  });

  // Cleanup on exit
  process.on('SIGTERM', () => {
    try { unlinkSync(PID_PATH); } catch {}
    process.exit(0);
  });
  process.on('SIGINT', () => {
    try { unlinkSync(PID_PATH); } catch {}
    process.exit(0);
  });
}
