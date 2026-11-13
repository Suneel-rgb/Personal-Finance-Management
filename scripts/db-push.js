const { execSync } = require('child_process');

let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || '';

// Normalize postgres:// to postgresql:// if needed for Prisma
if (dbUrl.startsWith('postgres://')) {
  process.env.DATABASE_URL = dbUrl.replace('postgres://', 'postgresql://');
  dbUrl = process.env.DATABASE_URL;
}

const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

if (isPostgres) {
  console.log('[db-push] Detected PostgreSQL URL. Syncing database schema with prisma db push...');
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[db-push] Schema successfully pushed to PostgreSQL database.');
  } catch (err) {
    console.warn('[db-push] Warning: db push encountered an issue, continuing build:', err.message);
  }
} else {
  console.log('[db-push] Skipping remote db push for SQLite environment.');
}
