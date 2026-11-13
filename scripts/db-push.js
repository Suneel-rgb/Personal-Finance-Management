const { execSync } = require('child_process');

let dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  '';

dbUrl = dbUrl.trim().replace(/^["']|["']$/g, '');

if (dbUrl.startsWith('postgres://')) {
  dbUrl = dbUrl.replace('postgres://', 'postgresql://');
  process.env.DATABASE_URL = dbUrl;
}

const isPostgres = dbUrl.startsWith('postgresql://');

if (isPostgres) {
  console.log('[db-push] Detected PostgreSQL URL. Syncing database schema with prisma db push...');
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    console.log('[db-push] Schema successfully pushed to PostgreSQL database.');
  } catch (err) {
    console.warn('[db-push] Warning: db push encountered an issue, continuing build:', err.message);
  }
} else {
  console.log('[db-push] Skipping remote db push for SQLite environment.');
}
