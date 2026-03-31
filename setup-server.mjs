import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3456;

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`  Abra manualmente: ${url}`);
  });
}

function extractProjectRef(supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
  return match ? match[1] : null;
}

// ─── Supabase SQL execution via Management API ──────────────────────────────

async function executeSQL(projectRef, accessToken, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }

  return await res.json().catch(() => ({}));
}

// ─── Get combined SQL for all migrations ────────────────────────────────────

function getCombinedSQL() {
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) return '';

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files
    .map((f) => {
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
      return `-- Migration: ${f}\n${sql}`;
    })
    .join('\n\n');
}

// ─── API Handlers ───────────────────────────────────────────────────────────

async function handleTestConnection(req, res) {
  try {
    const { url: supabaseUrl, anonKey, serviceRoleKey } = await readBody(req);
    const results = { url: false, anonKey: false, serviceRoleKey: false };

    // Test URL + anon key
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
      });
      results.url = true;
      results.anonKey = r.ok || r.status === 200 || r.status === 404;
    } catch {
      results.url = false;
      results.anonKey = false;
    }

    // Test service role key
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` },
      });
      results.serviceRoleKey = r.ok || r.status === 200 || r.status === 404;
    } catch {
      results.serviceRoleKey = false;
    }

    json(res, { success: true, results });
  } catch (err) {
    json(res, { success: false, error: err.message }, 400);
  }
}

async function handleRunMigrations(req, res) {
  try {
    const { url: supabaseUrl, accessToken } = await readBody(req);
    const projectRef = extractProjectRef(supabaseUrl);

    if (!projectRef) {
      json(res, { success: false, error: 'Could not extract project ref from URL' }, 400);
      return;
    }

    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      json(res, { success: true, migrations: [], message: 'No migrations directory found' });
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const results = [];

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const name = file.replace(/^\d+_/, '').replace('.sql', '').replace(/_/g, ' ');
      try {
        await executeSQL(projectRef, accessToken, sql);
        results.push({ file, name, success: true });
      } catch (err) {
        results.push({ file, name, success: false, error: err.message });
      }
    }

    const allOk = results.every((r) => r.success);
    json(res, { success: allOk, migrations: results });
  } catch (err) {
    json(res, { success: false, error: err.message }, 500);
  }
}

async function handleGetSQL(_req, res) {
  const sql = getCombinedSQL();
  json(res, { sql });
}

async function handleVerifyTables(req, res) {
  try {
    const { url: supabaseUrl, serviceRoleKey } = await readBody(req);

    const expectedTables = [
      'profiles', 'contacts', 'pipelines', 'pipeline_stages',
      'deals', 'activities', 'tags', 'contact_tags',
      'ai_conversations', 'email_templates', 'automations', 'dashboard_widgets',
    ];

    const results = [];

    for (const table of expectedTables) {
      try {
        const r = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count&limit=0`, {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Prefer': 'count=exact',
          },
        });
        results.push({ table, exists: r.ok });
      } catch {
        results.push({ table, exists: false });
      }
    }

    const allExist = results.every((r) => r.exists);
    json(res, { success: allExist, tables: results });
  } catch (err) {
    json(res, { success: false, error: err.message }, 400);
  }
}

async function handleSaveConfig(req, res) {
  try {
    const { url: supabaseUrl, anonKey } = await readBody(req);

    const envContent = [
      `VITE_SUPABASE_URL=${supabaseUrl}`,
      `VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
      '',
    ].join('\n');

    fs.writeFileSync(path.join(__dirname, '.env'), envContent, 'utf-8');
    json(res, { success: true });
  } catch (err) {
    json(res, { success: false, error: err.message }, 500);
  }
}

async function handleFinish(_req, res) {
  json(res, { success: true, message: 'Starting CRM...' });

  setTimeout(() => {
    console.log('\n  Iniciando o CRM...\n');

    // Spawn with pipe to detect the real port Vite picks
    const child = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let opened = false;

    child.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);

      // Detect the actual port from Vite output (e.g. "Local: http://localhost:8083/")
      if (!opened) {
        const match = output.match(/Local:\s+(https?:\/\/localhost:\d+)/);
        if (match) {
          opened = true;
          openBrowser(match[1]);
          // Give browser time to open, then exit setup server
          setTimeout(() => {
            console.log('\n  Setup finalizado! O CRM esta rodando.\n');
            child.stdio[1]?.destroy();
            child.stdio[2]?.destroy();
            child.unref();
            server.close();
            process.exit(0);
          }, 2000);
        }
      }
    });

    child.stderr.on('data', (data) => process.stderr.write(data));

    // Fallback: if Vite doesn't print URL in 15s, try default port
    setTimeout(() => {
      if (!opened) {
        opened = true;
        openBrowser('http://localhost:8080');
        child.stdio[1]?.destroy();
        child.stdio[2]?.destroy();
        child.unref();
        server.close();
        process.exit(0);
      }
    }, 15000);
  }, 500);
}

// ─── Server ─────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API routes
  if (req.method === 'POST') {
    switch (req.url) {
      case '/api/test-connection': return handleTestConnection(req, res);
      case '/api/run-migrations': return handleRunMigrations(req, res);
      case '/api/verify-tables': return handleVerifyTables(req, res);
      case '/api/save-config': return handleSaveConfig(req, res);
      case '/api/finish': return handleFinish(req, res);
    }
  }

  // GET endpoints
  if (req.method === 'GET') {
    if (req.url === '/api/migrations') {
      const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        json(res, { migrations: [] });
        return;
      }
      const files = fs.readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map((f) => ({
          file: f,
          name: f.replace(/^\d+_/, '').replace('.sql', '').replace(/_/g, ' '),
        }));
      json(res, { migrations: files });
      return;
    }

    if (req.url === '/api/get-sql') {
      return handleGetSQL(req, res);
    }
  }

  // Serve setup-wizard.html for everything else
  const wizardPath = path.join(__dirname, 'setup-wizard.html');
  if (fs.existsSync(wizardPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(wizardPath, 'utf-8'));
  } else {
    res.writeHead(404);
    res.end('setup-wizard.html not found');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║                                          ║');
  console.log('  ║   CRM AI First - Setup Wizard            ║');
  console.log('  ║                                          ║');
  console.log(`  ║   http://localhost:${PORT}                 ║`);
  console.log('  ║                                          ║');
  console.log('  ║   Abrindo no navegador...                ║');
  console.log('  ║                                          ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  openBrowser(`http://localhost:${PORT}`);
});
